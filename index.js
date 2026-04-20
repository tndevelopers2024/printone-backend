const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const Employee = require('./models/Employee');
const Kit = require('./models/Kit');
const Order = require('./models/Order');

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
    const employeeId = (req.body.employeeId || '').trim();
    const dob = (req.body.dob || '').trim();
    
    console.log('🔍 Verification Attempt:', { name, employeeId, dob });
    try {
        const employee = await Employee.findOne({ 
            name: new RegExp(`^${name}$`, 'i'), 
            employeeId: new RegExp(`^${employeeId}$`, 'i'),
            dob 
        });
        
        if (employee) {
            res.json({ success: true, employee });
        } else {
            res.status(404).json({ success: false, message: 'Employee not found or details mismatch' });
        }
    } catch (err) {
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
        const newOrder = new Order(req.body);
        await newOrder.save();
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
        const updatedOrder = await Order.findByIdAndUpdate(
            req.params.id,
            { status: req.body.status },
            { new: true }
        );
        res.json({ success: true, order: updatedOrder });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Update failed' });
    }
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('✅ MongoDB Connected');
    })
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
