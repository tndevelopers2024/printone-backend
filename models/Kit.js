const mongoose = require('mongoose');

const kitSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: String,
    image: String,
    items: [String],
    category: { type: String, default: 'Onboarding' }
});

module.exports = mongoose.model('Kit', kitSchema);
