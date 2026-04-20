const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
    name: { type: String, required: true },
    employeeId: { type: String, required: true, unique: true },
    dob: { type: String, required: true }, 
    company: { type: String, default: 'Tiger Analytics' }
});

module.exports = mongoose.model('Employee', employeeSchema);
