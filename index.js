const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const Employee = require('./models/Employee');
const Kit = require('./models/Kit');
const Order = require('./models/Order');
const Otp = require('./models/Otp');
const Inventory = require('./models/Inventory');
const {
    sendOrderConfirmation,
    sendStatusUpdateEmail,
    sendDispatchEmail,
    sendDeliveryConfirmationRequestEmail,
    sendNonReceiptNotificationToAdmin,
    sendOtpEmail
} = require('./utils/emailService');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/', (req, res) => {
    res.json({ message: 'Printone Onboarding API' });
});

// 0. Employees Endpoint (for Admin Directory)
app.get('/api/employees', async (req, res) => {
    try {
        const employees = await Employee.find().sort({ name: 1 });
        res.json(employees);
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// 0. Unified Admin Login (SuperAdmin & Tiger Analytics)
app.post('/api/admin/login', (req, res) => {
    const { email, password } = req.body;

    if (email === 'superadmin@printone.com' && password === 'printone@2026') {
        res.json({ success: true, user: { email, role: 'superadmin' } });
    } else if (email === 'tiger@printone.com' && password === 'tiger@2026') {
        res.json({ success: true, user: { email, role: 'viewer' } });
    } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
});

// Kits Endpoint
app.get('/api/kits', async (req, res) => {
    try {
        const kits = await Kit.find().sort({ order: 1 });
        res.json(kits);
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Inventory Endpoints
app.get('/api/inventory', async (req, res) => {
    try {
        let inventory = await Inventory.find().sort({ itemName: 1 });

        // Auto-seed fixed products if inventory is empty
        if (inventory.length === 0) {
            const fixedItems = [
                { itemName: 'Message Inserts', quantity: 0 },
                { itemName: 'Lanyard with Dual Card Holder', quantity: 0 },
                { itemName: 'Eco Sticky Note Pad with Ball Pen', quantity: 0 },
                { itemName: 'Tiger Branded Polo T-Shirt', quantity: 0, hasSizes: true, sizes: { S: 0, M: 0, L: 0, XL: 0, XXL: 0 } },
                { itemName: 'Stainless Steel Sipper Bottle', quantity: 0 },
                { itemName: 'Customized Desk Mat', quantity: 0 },
                { itemName: 'Portable Laptop Stand', quantity: 0 },
                { itemName: 'Emmi Backpack', quantity: 0 },
                { itemName: 'Premium Messenger Leather Bag', quantity: 0 }
            ];
            await Inventory.insertMany(fixedItems);
            inventory = await Inventory.find().sort({ itemName: 1 });
        }

        res.json(inventory);
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.patch('/api/inventory/:id', async (req, res) => {
    try {
        const { quantity, sizes } = req.body;
        const updateData = {};
        if (quantity !== undefined) updateData.quantity = quantity;
        if (sizes !== undefined) updateData.sizes = sizes;

        const item = await Inventory.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { new: true }
        );
        if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
        res.json({ success: true, item });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Address Parser Helper
const parseAddress = (addrStr) => {
    if (!addrStr) return { doorNo: '', street: '', address: '', city: '', pincode: '' };

    // Normalize: remove double-pipe separators (Darwinbox artifact)
    let normalized = addrStr.replace(/\|\|/g, ',').replace(/,+/g, ',').trim();

    // Extract pincode (6-digit number)
    const pinMatch = normalized.match(/\b\d{6}\b/);
    const pincode = pinMatch ? pinMatch[0] : '';

    // Remove pincode + trailing country/state/city boilerplate after the 3rd-to-last comma
    // Strip known suffixes: "City, State, India, 123456" or "  City,  State,  India, 123456"
    let cleanStr = normalized
        .replace(/\b\d{6}\b/, '')           // remove pincode
        .replace(/,?\s*India\s*/gi, '')      // remove country
        .replace(/^,+|,+$/g, '')            // trim leading/trailing commas
        .replace(/\s{2,}/g, ' ')            // collapse spaces
        .trim();

    const parts = cleanStr.split(',').map(p => p.trim()).filter(Boolean);

    const knownStates = [
        'haryana', 'karnataka', 'tamil nadu', 'telangana', 'maharashtra',
        'delhi', 'uttar pradesh', 'andhra pradesh', 'rajasthan', 'gujarat',
        'kerala', 'odisha', 'west bengal', 'bihar', 'pondicherry', 'puducherry',
        'goa', 'assam', 'punjab', 'himachal pradesh', 'uttarakhand', 'jharkhand',
        'chhattisgarh', 'tripura', 'meghalaya', 'manipur', 'nagaland', 'sikkim',
        'arunachal pradesh', 'mizoram'
    ];

    // Filter out state names from parts
    const filteredParts = parts.filter(p => !knownStates.includes(p.toLowerCase()));

    let doorNo = filteredParts[0] || '';
    let city = filteredParts[filteredParts.length - 1] || '';
    let street = filteredParts.slice(1, -1).join(', ');

    // If only 2 parts, street = second part, city = last
    if (filteredParts.length === 2) {
        street = '';
        city = filteredParts[1];
    }

    return {
        doorNo,
        street,
        address: addrStr,
        city,
        pincode
    };
};

// Helper to look up employee in Darwinbox or fallback to local MongoDB
const getEmployeeRecord = async (email) => {
    try {
        // --- 1. Check Mock JSON file first (for local testing) ---
        const fs = require('fs');
        const path = require('path');
        const mockPath = path.join(__dirname, '../api_response.json');
        if (fs.existsSync(mockPath)) {
            const mockData = JSON.parse(fs.readFileSync(mockPath, 'utf8'));
            if (mockData && mockData.employee_data) {
                const mockEmp = mockData.employee_data.find(emp =>
                    emp.company_email_id && emp.company_email_id.toLowerCase().trim() === email.toLowerCase().trim()
                );
                if (mockEmp) {
                    console.log('Found employee in mock api_response.json:', email);
                    return { source: 'darwinbox', data: mockEmp };
                }
            }
        }

        // --- 2. Call real Darwinbox API ---
        const darwinUrl = process.env.DARWINBOX_API_URL;
        const apiKey = process.env.DARWINBOX_API_KEY;
        const datasetKey = process.env.DARWINBOX_DATASET_KEY;
        const userId = process.env.DARWINBOX_USER_ID;
        const password = process.env.DARWINBOX_PASSWORD;

        console.log('Calling Darwinbox Employee API for email:', email);
        const authHeader = 'Basic ' + Buffer.from(`${userId}:${password}`).toString('base64');

        const dbResponse = await fetch(darwinUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader
            },
            body: JSON.stringify({
                api_key: apiKey,
                datasetKey: datasetKey,
                email_ids: [email]
            })
        });

        if (dbResponse.ok) {
            const dbData = await dbResponse.json();
            if (dbData.status === 1 && dbData.employee_data && dbData.employee_data.length > 0) {
                const dbEmployee = dbData.employee_data.find(emp =>
                    emp.company_email_id && emp.company_email_id.toLowerCase().trim() === email.toLowerCase().trim()
                );
                if (dbEmployee) return { source: 'darwinbox', data: dbEmployee };
            }
        }
    } catch (err) {
        console.error('Darwinbox API search error:', err);
    }

    // Fallback to local DB
    const localEmployee = await Employee.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });
    if (localEmployee) {
        return { source: 'local', data: localEmployee };
    }

    return null;
};

// 1. Send OTP Endpoint
app.post('/api/send-otp', async (req, res) => {
    const email = (req.body.email || '').trim().toLowerCase();

    try {
        const employeeRecord = await getEmployeeRecord(email);
        if (!employeeRecord) {
            return res.status(404).json({ success: false, message: 'Employee not found. Please check your email.' });
        }

        // ── Employee Type Check ──
        // Only "Full Time" employees are eligible to place orders
        if (employeeRecord.source === 'darwinbox') {
            const employeeType = (employeeRecord.data.employee_type || '').trim();
            if (employeeType && employeeType.toLowerCase() !== 'full time') {
                return res.status(403).json({
                    success: false,
                    message: 'This portal is only available for Full Time employees. Please contact HR if you have any questions.'
                });
            }
        }

        const rawDate = employeeRecord.source === 'darwinbox'
            ? employeeRecord.data.date_of_joining
            : employeeRecord.data.joiningDate;

        const parseJoiningDate = (str) => {
            if (!str) return null;
            // Format: "29-Oct-2025" (Darwinbox)
            const dbMatch = str.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
            if (dbMatch) return new Date(`${dbMatch[2]} ${dbMatch[1]} ${dbMatch[3]}`);
            // Format: "DD-MM-YYYY"
            const dmyMatch = str.match(/^(\d{2})-(\d{2})-(\d{4})$/);
            if (dmyMatch) return new Date(`${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`);
            // ISO / any other format
            return new Date(str);
        };

        const joiningDate = parseJoiningDate(rawDate);
        if (!joiningDate || isNaN(joiningDate)) {
            return res.status(400).json({ success: false, message: 'Could not verify your joining date. Please contact HR.' });
        }

        // Set cutoff date to May 1, 2026 (After April 2026)
        const cutoffDate = new Date('2026-05-01');
        cutoffDate.setHours(0, 0, 0, 0);

        // Joining date must be >= cutoffDate
        const joiningMidnight = new Date(joiningDate);
        joiningMidnight.setHours(0, 0, 0, 0);

        if (joiningMidnight < cutoffDate) {
            return res.status(403).json({
                success: false,
                message: 'This portal is only available for newly joined employees. Please contact HR if you think this is a mistake.'
            });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        await Otp.findOneAndUpdate(
            { email },
            { otp, createdAt: new Date() },
            { upsert: true, new: true }
        );

        await sendOtpEmail(email, otp);
        res.json({ success: true, message: 'OTP sent' });
    } catch (err) {
        console.error('OTP Error:', err);
        res.status(500).json({ success: false, message: 'Error sending OTP: ' + (err.message || err.toString()) });
    }
});


// 2. Verify OTP Endpoint
app.post('/api/verify-otp', async (req, res) => {
    const email = (req.body.email || '').trim().toLowerCase();
    const otp = (req.body.otp || '').trim();

    try {
        const otpRecord = await Otp.findOne({ email });
        if (!otpRecord) {
            return res.status(400).json({ success: false, message: 'OTP expired or not requested. Please try again.' });
        }
        if (otpRecord.otp !== otp) {
            return res.status(400).json({ success: false, message: 'Invalid OTP. Please check and try again.' });
        }

        // OTP valid — delete it so it can't be reused
        await Otp.deleteOne({ email });

        // Look up employee details
        const employeeRecord = await getEmployeeRecord(email);
        if (!employeeRecord) {
            return res.status(404).json({ success: false, message: 'Employee not found.' });
        }

        let employee;
        if (employeeRecord.source === 'darwinbox') {
            const d = employeeRecord.data;
            // Darwinbox uses current_address and full_name
            const addrStr = d.current_address || d.present_address || d.permanent_address || '';
            const parsed = parseAddress(addrStr);
            employee = {
                name: d.full_name || `${d.first_name || ''} ${d.last_name || ''}`.trim(),
                email: d.company_email_id,
                employeeId: d.employee_id,
                department: d.department || '',
                designation: d.designation || '',
                joiningDate: d.date_of_joining,
                phone: d.primary_mobile_number || '',
                address: addrStr,
                ...parsed
            };
        } else {
            const d = employeeRecord.data;
            employee = {
                name: d.name,
                email: d.email,
                employeeId: d.employeeId,
                department: d.department,
                designation: d.designation,
                joiningDate: d.joiningDate,
                address: d.address || '',
                doorNo: d.doorNo || '',
                street: d.street || '',
                city: d.city || '',
                pincode: d.pincode || ''
            };
        }

        // Check for existing order
        const existingOrder = await Order.findOne({
            'employeeDetails.email': { $regex: new RegExp(`^${email}$`, 'i') }
        });

        res.json({ success: true, employee, hasOrder: !!existingOrder, order: existingOrder || null });
    } catch (err) {
        console.error('Verify OTP Error:', err);
        res.status(500).json({ success: false, message: 'Server error during verification.' });
    }
});

// 3. Create Order Endpoint
app.post('/api/orders', async (req, res) => {
    try {
        const orderData = req.body;

        // Check if order already exists for this email
        const existingOrder = await Order.findOne({
            'employeeDetails.email': { $regex: new RegExp(`^${orderData.employeeDetails.email}$`, 'i') }
        });

        if (existingOrder) {
            return res.status(400).json({ success: false, message: 'An order has already been placed for this employee.' });
        }

        const newOrder = new Order({
            ...orderData,
            status: 'Processing',
            statusHistory: [{ status: 'Processing', updatedAt: new Date() }]
        });

        await newOrder.save();

        // Deduct inventory
        if (orderData.items && orderData.items.length > 0) {
            const mapTitleToInventory = (title) => {
                const t = title.toLowerCase();
                if (t.includes('polo t-shirt')) return 'Tiger Branded Polo T-Shirt';
                if (t.includes('sipper bottle')) return 'Stainless Steel Sipper Bottle';
                if (t.includes('messenger leather bag')) return 'Premium Messenger Leather Bag';
                if (t.includes('lanyard')) return 'Lanyard with Dual Card Holder';
                if (t.includes('sticky note')) return 'Eco Sticky Note Pad with Ball Pen';
                if (t.includes('message insert')) return 'Message Inserts';
                if (t.includes('desk mat')) return 'Customized Desk Mat';
                if (t.includes('laptop stand')) return 'Portable Laptop Stand';
                if (t.includes('backpack')) return 'Emmi Backpack';
                return title;
            };

            for (const kit of orderData.items) {
                const searchName = mapTitleToInventory(kit.title);
                // Find matching inventory item by name
                const invItem = await Inventory.findOne({ itemName: { $regex: new RegExp(`^${searchName}$`, 'i') } });
                if (invItem) {
                    if (invItem.hasSizes && kit.selectedSize) {
                        if (invItem.sizes && invItem.sizes[kit.selectedSize] !== undefined) {
                            invItem.sizes[kit.selectedSize] = Math.max(0, invItem.sizes[kit.selectedSize] - 1);
                            invItem.markModified('sizes');
                            await invItem.save();
                        }
                    } else if (!invItem.hasSizes) {
                        invItem.quantity = Math.max(0, invItem.quantity - 1);
                        await invItem.save();
                    }
                }
            }
        }

        // Send order confirmation email
        sendOrderConfirmation(newOrder).catch(err => console.error('Order email failed:', err));

        res.status(201).json({ success: true, order: newOrder });
    } catch (err) {
        console.error('Create Order Error:', err);
        res.status(500).json({ success: false, message: 'Server error creating order.' });
    }
});

// 4. Get All Orders Endpoint (for Admin Dashboard)
app.get('/api/orders', async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 });
        res.json(orders);
    } catch (err) {
        console.error('Fetch Orders Error:', err);
        res.status(500).json({ success: false, message: 'Server error fetching orders.' });
    }
});

app.patch('/api/orders/:id', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

        if (req.body.status) {
            order.status = req.body.status;
            order.statusHistory.push({ status: req.body.status, updatedAt: new Date() });
        }

        if (req.body.isDelivered !== undefined) {
            order.isDelivered = req.body.isDelivered;
            if (req.body.isDelivered) {
                // Only push if not already marked as delivered in history
                const alreadyDelivered = order.statusHistory.some(h => h.status === 'Delivered');
                if (!alreadyDelivered) {
                    order.statusHistory.push({ status: 'Delivered', updatedAt: new Date() });
                }
            } else {
                // If set to false, remove Delivered from history to allow re-marking
                order.statusHistory = order.statusHistory.filter(h => h.status !== 'Delivered');
            }
        }

        if (req.body.trackingLink) {
            order.trackingLink = req.body.trackingLink;
        }

        await order.save();

        if (req.body.status === 'Processing') {
            sendStatusUpdateEmail(order).catch(err => console.error('Status email failed:', err));
        } else if (req.body.status === 'Dispatched') {
            sendDispatchEmail(order).catch(err => console.error('Dispatch email failed:', err));
        }

        res.json({ success: true, order });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Update failed' });
    }
});

// 6. Orders Endpoint - Track
app.get('/api/orders/track', async (req, res) => {
    try {
        const name = req.query.name;
        const order = await Order.findOne({
            'employeeDetails.name': { $regex: new RegExp(`^${name}$`, 'i') }
        });
        if (order) {
            res.json({ success: true, order });
        } else {
            res.status(404).json({ success: false, message: 'Order not found' });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// 7. Public Confirmation Endpoint (No login required)
app.get('/api/orders/public-confirm/:id/:action', async (req, res) => {
    const { id, action } = req.params;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    try {
        const order = await Order.findById(id);
        if (!order) {
            return res.redirect(`${frontendUrl}/confirmation-result?status=not-found`);
        }

        if (action === 'yes') {
            order.status = 'Dispatched';
            order.isDelivered = true;
            order.statusHistory.push({ status: 'Delivered', updatedAt: new Date() });
            await order.save();
            return res.redirect(`${frontendUrl}/confirmation-result?status=success&id=${id}`);
        } else if (action === 'no') {
            order.nonReceiptReported = true;
            await order.save();
            sendNonReceiptNotificationToAdmin(order).catch(err => console.error('Admin alert failed:', err));
            return res.redirect(`${frontendUrl}/confirmation-result?status=reported&id=${id}`);
        }

        res.redirect(`${frontendUrl}/confirmation-result?status=error`);
    } catch (err) {
        console.error('Public confirm error:', err);
        res.redirect(`${frontendUrl}/confirmation-result?status=error`);
    }
});

// Background Task: 7-Day Follow-up
const startFollowUpJob = () => {
    // For testing: Run every 20 seconds (20000 ms)
    setInterval(async () => {
        console.log('⏰ Running delivery follow-up check...');
        // For testing: Look for orders dispatched in the last minute (not 7 days)
        const checkTime = new Date();
        // checkTime.setDate(checkTime.getDate() - 7); // Normal logic

        try {
            const orders = await Order.find({
                status: 'Dispatched',
                isDelivered: false,
                deliveryConfirmationSent: false
            });

            console.log(`Found ${orders.length} orders for follow-up`);

            for (const order of orders) {
                await sendDeliveryConfirmationRequestEmail(order);
                order.deliveryConfirmationSent = true;
                await order.save();
            }
        } catch (err) {
            console.error('Follow-up job failed:', err);
        }
    }, 7 * 24 * 60 * 60 * 1000); // Check every 7 days
};

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('✅ MongoDB Connected');
    })
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    startFollowUpJob();
});
