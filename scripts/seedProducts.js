const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });
const Kit = require('../models/Kit');

const products = [
    {
        title: "Message Inserts",
        description: "Official welcome letter from the Tiger Analytics leadership team with orientation guidelines.",
        image: "/images/image.png",
        category: "Standard",
        items: ["Welcome Card", "Tiger Sticker Pack"]
    },
    {
        title: "Lanyard with Dual Card Holder",
        description: "Premium branded lanyard with a transparent dual-side ID card holder.",
        image: "/images/image2.png",
        category: "Standard",
        items: ["Lanyard", "Dual Card Holder"]
    },
    {
        title: "Eco Sticky Note Pad with Ball Pen",
        description: "Sustainable cork-finish notebook with recycled paper notes and a matching eco-pen.",
        image: "/images/image3.png",
        category: "Standard",
        items: ["Eco Notebook", "Recycled Pen"]
    },
    {
        title: "Tiger Branded Polo T-Shirt",
        description: "Premium cotton polo t-shirt with official Tiger Analytics embroidery.",
        image: "/images/image4.png",
        category: "Standard",
        items: ["Cotton Polo"]
    },
    {
        title: "Stainless Steel Sipper Bottle",
        description: "Vacuum-insulated sipper bottle with built-in filter for all-day hydration.",
        image: "/images/image5.png",
        category: "Choice_A",
        items: ["Sipper Bottle", "Internal Filter"]
    },
    {
        title: "Customized Desk Mat",
        description: "Extra-large microfiber desk mat with high-density printing and anti-slip base.",
        image: "/images/image6.png",
        category: "Choice_A",
        items: ["Custom Mat", "Anti-slip base"]
    },
    {
        title: "Portable Laptop Stand",
        description: "Lightweight, foldable aluminum laptop stand with adjustable height.",
        image: "/images/image7.png",
        category: "Choice_A",
        items: ["Laptop Stand", "Carry Pouch"]
    },
    {
        title: "Emmi Backpack",
        description: "Dual-tone heavy duty backpack with padded laptop compartment and rain cover.",
        image: "/images/image8.png",
        category: "Choice_B",
        items: ["Backpack", "Rain Cover"]
    },
    {
        title: "Premium Messenger Leather Bag",
        description: "Executive leather messenger bag with magnetic clasp and organized storage.",
        image: "/images/image9.png",
        category: "Choice_B",
        items: ["Leather Bag", "Shoulder Strap"]
    }
];

async function seed() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        
        console.log('Clearing existing kits...');
        await Kit.deleteMany({});
        
        console.log('Inserting new products...');
        await Kit.insertMany(products);
        
        console.log('✅ Seeding complete!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding failed:', err);
        process.exit(1);
    }
}

seed();
