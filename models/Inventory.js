const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
    itemName: { type: String, required: true, unique: true },
    quantity: { type: Number, default: 0 },
    sizes: {
        S: { type: Number, default: 0 },
        M: { type: Number, default: 0 },
        L: { type: Number, default: 0 },
        XL: { type: Number, default: 0 },
        XXL: { type: Number, default: 0 }
    },
    hasSizes: { type: Boolean, default: false }
});

module.exports = mongoose.model('Inventory', inventorySchema);
