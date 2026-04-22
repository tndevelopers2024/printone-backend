const mongoose = require('mongoose');
require('dotenv').config();

const Employee = require('./models/Employee');
const Kit = require('./models/Kit');

const employees = [
    { name: 'John Doe', email: 'john.doe@tiger.com', dob: '1990-01-01', company: 'Tiger Analytics' },
    { name: 'Jane Smith', email: 'jane.smith@tiger.com', dob: '1992-05-15', company: 'Tiger Analytics' },
    { name: 'Alex Johnson', email: 'alex.j@tiger.com', dob: '1988-11-20', company: 'Tiger Analytics' },
    { name: 'Emily Watson', email: 'emily.w@tiger.com', dob: '1995-03-10', company: 'Tiger Analytics' }
];

const kits = [
    // Standard Essentials (Locked)
    { 
        title: 'Message Inserts', 
        category: 'Standard',
        order: 1,
        image: '/images/image.png',
        items: ['Welcome Note', 'Company Values', 'Contact Information']
    },
    { 
        title: 'Lanyard with dual card holder', 
        category: 'Standard',
        order: 2,
        image: '/images/image2.png',
        items: ['Premium Lanyard', 'Dual Card Holder', 'Tiger Branding']
    },
    { 
        title: 'Eco Sticky Note Pad with Ball Pen', 
        category: 'Standard',
        order: 3,
        image: '/images/image3.png',
        items: ['Recycled Paper', 'Eco-friendly Pen', 'Multiple Sizes']
    },
    { 
        title: 'Jack and Jones Plain Polo T-shirt', 
        category: 'Standard',
        order: 4,
        image: '/images/image4.png',
        items: ['100% Cotton', 'Classic Fit', 'Embroidered Logo']
    },

    // Professional Upgrade (Choice A)
    { 
        title: 'Stainless Steel Sipper Bottle with Filter', 
        category: 'Choice_A',
        order: 5,
        image: '/images/image5.png',
        items: ['Double Wall', 'Built-in Filter', 'BPA Free']
    },
    { 
        title: 'Customized Desk Mat', 
        category: 'Choice_A',
        order: 6,
        image: '/images/image6.png',
        items: ['Large Surface', 'Non-slip Base', 'Custom Design']
    },
    { 
        title: 'Portable Laptop Stand', 
        category: 'Choice_A',
        order: 7,
        image: '/images/image7.png',
        items: ['Adjustable Height', 'Foldable Design', 'Aluminum Alloy']
    },

    // Premium Carry (Choice B)
    { 
        title: 'Emmi Backpack', 
        category: 'Choice_B',
        order: 8,
        image: '/images/image8.png',
        items: ['Water Resistant', 'Laptop Compartment', 'Ergonomic Straps']
    },
    { 
        title: 'Laptop Messenger Leather Bag', 
        category: 'Choice_B',
        order: 9,
        image: '/images/image9.png',
        items: ['Genuine Leather', 'Premium Lining', 'Secure Buckles']
    }
];

const seed = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        console.log('Cleaning existing data...');
        try {
            await mongoose.connection.db.dropCollection('employees');
            console.log('🗑️ Dropped employees collection');
        } catch (e) {
            console.log('ℹ️ Employees collection not found, skipping drop');
        }
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
