const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    dob: { type: String, required: false }, 
    company: { type: String, default: 'Tiger Analytics' },
    doorNo: { type: String },
    street: { type: String },
    address: { type: String },
    city: { type: String },
    pincode: { type: String }
});

module.exports = mongoose.model('Employee', employeeSchema);
