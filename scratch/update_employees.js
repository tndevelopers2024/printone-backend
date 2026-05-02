const mongoose = require('mongoose');
require('dotenv').config();
const Employee = require('../models/Employee');

const addresses = [
    { doorNo: 'No. 12', street: 'Banyan Road', address: 'Near Tech Park', city: 'Chennai', pincode: '600096' },
    { doorNo: 'Flat 405', street: 'Maple Avenue', address: 'Elite Residencies', city: 'Bangalore', pincode: '560001' },
    { doorNo: 'No. 88', street: 'Palm Street', address: 'Green Valley', city: 'Hyderabad', pincode: '500001' },
    { doorNo: '101A', street: 'Skyline Drive', address: 'Metro heights', city: 'Pune', pincode: '411001' },
    { doorNo: 'No. 23', street: 'Orchid Way', address: 'Orchid Meadows', city: 'Chennai', pincode: '600100' }
];

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const employees = await Employee.find({});
        console.log(`Updating ${employees.length} employees...`);

        for (let i = 0; i < employees.length; i++) {
            const addr = addresses[i % addresses.length];
            await Employee.findByIdAndUpdate(employees[i]._id, { $set: addr });
        }

        console.log('Upserting Madhavan...');
        const madhavanAddr = { doorNo: 'No. 45', street: 'Lotus Street', address: 'Lotus Apartments, Velachery', city: 'Chennai', pincode: '600042' };
        await Employee.findOneAndUpdate(
            { email: 'madhavangl20@gmail.com' },
            { 
                name: 'Madhavan', 
                email: 'madhavangl20@gmail.com', 
                ...madhavanAddr, 
                company: 'Tiger Analytics' 
            },
            { upsert: true, new: true }
        );

        console.log('Successfully updated database.');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

run();
