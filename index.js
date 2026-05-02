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

// 1. Verification Endpoint
app.post('/api/verify', async (req, res) => {
    const name = (req.body.name || '').trim();
    const email = (req.body.email || '').trim();
    
    console.log('🔍 Verification Attempt:', { name, email });
    
    try {
        // Use a more robust query with collation for case-insensitive matching if possible, 
        // or just ensure the regex is clean.
        const employee = await Employee.findOne({ 
            name: { $regex: new RegExp(`^${name}$`, 'i') },
            email: { $regex: new RegExp(`^${email}$`, 'i') }
        });
        
        if (employee) {
            console.log('✅ Employee Verified:', employee.name);
            // Form email might differ, use exact name matching
            const existingOrder = await Order.findOne({ 'employeeDetails.name': { $regex: new RegExp(`^${employee.name}$`, 'i') } });
            console.log('📦 Existing Order Check:', existingOrder ? 'FOUND' : 'NOT FOUND', existingOrder ? existingOrder._id : '');
            
            if (existingOrder) {
                res.json({ success: true, employee, hasOrder: true, order: existingOrder });
            } else {
                res.json({ success: true, employee, hasOrder: false });
            }
        } else {
            console.log('❌ Verification Failed: No match found for', { name, email });
            res.status(404).json({ success: false, message: 'Employee not found or details mismatch' });
        }
    } catch (err) {
        console.error('❌ Server Error during verification:', err);
        res.status(500).json({ success: false, message: 'Server error' });
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
