const mongoose = require('mongoose');
require('dotenv').config();

const Employee = require('./models/Employee');
const Kit = require('./models/Kit');

const employees = [
    { name: 'John Doe', employeeId: 'TA101', dob: '1990-01-01', company: 'Tiger Analytics' },
    { name: 'Jane Smith', employeeId: 'TA102', dob: '1992-05-15', company: 'Tiger Analytics' },
    { name: 'Alex Johnson', employeeId: 'TA103', dob: '1988-11-20', company: 'Tiger Analytics' },
    { name: 'Emily Watson', employeeId: 'TA104', dob: '1995-03-10', company: 'Tiger Analytics' }
];

const kits = [
    { 
        title: 'Executive Welcome Pack', 
        description: 'Luxury essentials for our leadership team.', 
        items: ['Hardbound Notebook', 'Cross Desktop Pen', 'Premium Leather Folder', 'Stainless Steel Bottle'],
        image: 'https://images.unsplash.com/photo-1544391496-1ca7c97493c3?q=80&w=400&h=300&auto=format&fit=crop'
    },
    { 
        title: 'Elite Developer Suite', 
        description: 'High-performance gear for our technical architects.', 
        items: ['Mechanical Keyboard', 'Ergonomic Vertical Mouse', 'Noise-Cancelling Headphones', 'Laptop Stand'],
        image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?q=80&w=400&h=300&auto=format&fit=crop'
    },
    { 
        title: 'Modern Nomad Kit', 
        description: 'Everything you need for a flexible, hybrid workspace.', 
        items: ['Tech Organizer Bag', 'PD Fast Charger', 'Convertible Laptop Sleeve', 'Matte Finish Mug'],
        image: 'https://images.unsplash.com/photo-1544391496-1ca7c97493c3?q=80&w=400&h=300&auto=format&fit=crop'
    },
    { 
        title: 'Vitality Wellness Box', 
        description: 'Fuel your workday with focus and hydration.', 
        items: ['Insulated Flask', 'Healthy Snack Selection', 'Desk Succulent', 'Microfiber Screen Cleaner'],
        image: 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?q=80&w=400&h=300&auto=format&fit=crop'
    }
];

const seed = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        console.log('Cleaning existing data...');
        await Employee.deleteMany({});
        await Kit.deleteMany({});

        console.log('Seeding employees...');
        await Employee.create(employees);

        console.log('Seeding kits...');
        await Kit.create(kits);

        console.log('✨ Database Seeded Successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding Error:', err);
        process.exit(1);
    }
};

seed();
