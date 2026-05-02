const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    employeeDetails: {
        name: { type: String, required: true },
        email: { type: String, required: true },
        phone: { type: String, required: true }
    },
    shippingAddress: {
        doorNo: String,
        street: String,
        address: { type: String, required: true },
        city: { type: String, required: true },
        pincode: { type: String, required: true }
    },
    items: [{
        kitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Kit' },
        title: String,
        selectedSize: String
    }],
    status: { type: String, default: 'Pending' },
    statusHistory: [{
        status: String,
        updatedAt: { type: Date, default: Date.now }
    }],
    isDelivered: { type: Boolean, default: false },
    trackingLink: { type: String },
    deliveryConfirmationSent: { type: Boolean, default: false },
    nonReceiptReported: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', orderSchema);
