const mongoose = require('mongoose');
require('dotenv').config();
const Employee = require('./models/Employee');

const check = async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    const employees = await Employee.find();
    console.log('Current Employees in DB:');
    employees.forEach(emp => {
        console.log(`- Name: "${emp.name}", Email: "${emp.email}", DOB: "${emp.dob}"`);
    });
    process.exit(0);
};

check();
