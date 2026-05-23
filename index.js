const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const Employee = require('./models/Employee');
const Kit = require('./models/Kit');
const Order = require('./models/Order');
const { 
    sendOrderConfirmation, 
    sendStatusUpdateEmail, 
    sendDispatchEmail, 
    sendDeliveryConfirmationRequestEmail, 
    sendNonReceiptNotificationToAdmin 
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

// Address Parser Helper
const parseAddress = (addrStr) => {
    if (!addrStr) return { doorNo: '', street: '', address: '', city: '', pincode: '' };
    
    // Match pincode (6-digit number)
    const pinMatch = addrStr.match(/\b\d{6}\b/);
    const pincode = pinMatch ? pinMatch[0] : '';
    
    // Clean string by removing pincode
    let cleanStr = addrStr.replace(/\b\d{6}\b/, '').trim();
    // Remove trailing/leading commas or spaces
    cleanStr = cleanStr.replace(/^,+|,+$/g, '').trim();
    
    const parts = cleanStr.split(',').map(p => p.trim()).filter(Boolean);
    
    let doorNo = '';
    let city = '';
    let street = '';
    
    if (parts.length > 0) {
        doorNo = parts[0];
    }
    
    const countries = ['india', 'us', 'usa', 'united states'];
    const states = ['haryana', 'karnataka', 'tamil nadu', 'telangana', 'maharashtra', 'delhi', 'up', 'uttar pradesh', 'andhra pradesh'];
    
    let countryIndex = -1;
    let stateIndex = -1;
    
    for (let i = parts.length - 1; i >= 0; i--) {
        const lower = parts[i].toLowerCase();
        if (countries.includes(lower) && countryIndex === -1) {
            countryIndex = i;
        } else if (states.includes(lower) && stateIndex === -1) {
            stateIndex = i;
        }
    }
    
    if (stateIndex > 0) {
        city = parts[stateIndex - 1];
    } else if (countryIndex > 1) {
        city = parts[countryIndex - 2];
    } else if (parts.length > 1) {
        city = parts[parts.length - 1];
    }
    
    let streetParts = [];
    const startIndex = 1;
    const endIndex = parts.indexOf(city) !== -1 ? parts.indexOf(city) : parts.length - 1;
    
    for (let i = startIndex; i < endIndex; i++) {
        streetParts.push(parts[i]);
    }
    
    street = streetParts.join(', ');
    
    if (!street && parts.length > 2) {
        street = parts[1];
    }
    
    return {
        doorNo,
        street: street || parts.slice(1, -1).join(', ') || '',
        address: addrStr,
        city: city || parts[parts.length - 1] || '',
        pincode
    };
};

// 1. Verification Endpoint
app.post('/api/verify', async (req, res) => {
    const name = (req.body.name || '').trim();
    const email = (req.body.email || '').trim();
    
    console.log('🔍 Verification Attempt:', { name, email });
    
    if (!name || !email) {
        return res.status(400).json({ success: false, message: 'Name and email are required' });
    }
    
    try {
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
        
        if (!dbResponse.ok) {
            console.error('Darwinbox API returned status:', dbResponse.status);
            throw new Error(`Darwinbox API returned status ${dbResponse.status}`);
        }
        
        const dbData = await dbResponse.json();
        
        if (dbData.status === 1 && dbData.employee_data && dbData.employee_data.length > 0) {
            // Find the specific employee in the array matching the input email (case-insensitive)
            const dbEmployee = dbData.employee_data.find(emp => 
                emp.company_email_id && emp.company_email_id.toLowerCase().trim() === email.toLowerCase().trim()
            );
            
            if (dbEmployee) {
                // Compare entered name with Darwinbox full_name
                const normalizedInputName = name.toLowerCase().replace(/\s+/g, ' ');
                const normalizedDBName = dbEmployee.full_name.toLowerCase().replace(/\s+/g, ' ');
                
                if (normalizedInputName === normalizedDBName) {
                    console.log('✅ Employee Verified with Darwinbox:', dbEmployee.full_name);
                    
                    const parsedAddress = parseAddress(dbEmployee.current_address);
                    
                    // Upsert to local MongoDB
                    const employee = await Employee.findOneAndUpdate(
                        { email: email.toLowerCase() },
                        {
                            name: dbEmployee.full_name,
                            email: email.toLowerCase(),
                            dob: dbEmployee.date_of_birth || '',
                            company: 'Tiger Analytics',
                            doorNo: parsedAddress.doorNo,
                            street: parsedAddress.street,
                            address: parsedAddress.address,
                            city: parsedAddress.city,
                            pincode: parsedAddress.pincode,
                            phone: dbEmployee.primary_mobile_number || ''
                        },
                        { upsert: true, new: true }
                    );
                    
                    // Check if an order already exists for this employee
                    const existingOrder = await Order.findOne({
                        $or: [
                            { 'employeeDetails.email': { $regex: new RegExp(`^${email}$`, 'i') } },
                            { 'employeeDetails.name': { $regex: new RegExp(`^${employee.name}$`, 'i') } }
                        ]
                    });
                    
                    console.log('📦 Existing Order Check:', existingOrder ? 'FOUND' : 'NOT FOUND');
                    
                    return res.json({
                        success: true,
                        employee,
                        hasOrder: !!existingOrder,
                        order: existingOrder
                    });
                } else {
                    console.log(`❌ Name Mismatch: Entered "${name}" but Darwinbox has "${dbEmployee.full_name}"`);
                    return res.status(400).json({
                        success: false,
                        message: `Name verification failed. Please enter your name exactly as registered (e.g., "${dbEmployee.full_name}").`
                    });
                }
            } else {
                console.log('❌ Verification Failed: No matching email found in employee list for:', email);
                return res.status(404).json({
                    success: false,
                    message: 'No employee record found for this email address. Please verify your email.'
                });
            }
        } else {
            console.log('❌ Verification Failed: No employee data returned from Darwinbox');
            return res.status(404).json({
                success: false,
                message: 'No employee record found for this email address. Please verify your email.'
            });
        }
    } catch (err) {
        console.error('❌ Server Error during verification, falling back to local DB:', err);
        try {
            const employee = await Employee.findOne({ 
                name: { $regex: new RegExp(`^${name}$`, 'i') },
                email: { $regex: new RegExp(`^${email}$`, 'i') }
            });
            
            if (employee) {
                console.log('✅ Verified from Local DB Fallback:', employee.name);
                const existingOrder = await Order.findOne({ 'employeeDetails.email': { $regex: new RegExp(`^${email}$`, 'i') } });
                return res.json({ success: true, employee, hasOrder: !!existingOrder, order: existingOrder });
            }
        } catch (fallbackErr) {
            console.error('Local fallback failed too:', fallbackErr);
        }
        res.status(500).json({ success: false, message: 'Server communication error. Please try again.' });
    }
});

// 2. Kits Endpoint
app.get('/api/kits', async (req, res) => {
    try {
        const kits = await Kit.find();
        res.json(kits);
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// 3. Orders Endpoint - Create
app.post('/api/orders', async (req, res) => {
    try {
        const orderData = {
            ...req.body,
            statusHistory: [{ status: 'Pending', updatedAt: new Date() }]
        };
        const newOrder = new Order(orderData);
        await newOrder.save();
        
        // Trigger Email Notification (Non-blocking)
        sendOrderConfirmation(newOrder).catch(err => console.error('Email trigger failed:', err));
        
        res.json({ success: true, order: newOrder });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to place order' });
    }
});

// 4. Orders Endpoint - List (for Dashboard)
app.get('/api/orders', async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// 5. Orders Endpoint - Update Status
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
