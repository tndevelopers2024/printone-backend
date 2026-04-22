const mongoose = require('mongoose');

const kitSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: String,
    image: String,
    items: [String],
    category: { type: String, default: 'Onboarding' },
    order: { type: Number, default: 0 }
});

module.exports = mongoose.model('Kit', kitSchema);
