const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: { type: String, required: true, enum: ["Puja Items", "Idols", "Flowers", "Clothing", "Accessories", "Miscellaneous"] },
    price: { type: Number, required: true },
    discount: { type: Number, default: 0 }, // Discount Percentage (e.g., 10 for 10% off)
    stock: { type: Number, required: true, min: 0 }, // Available stock quantity
    images: [{ type: String, required: true }], // Array of image URLs (Cloudinary or local storage)
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Vendor ID reference
    isAvailable: { type: Boolean, default: true },
    ratings: { type: Number, default: 0, min: 0, max: 5 },
    reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: "Review" }], // Product reviews
}, { timestamps: true });

module.exports = mongoose.model("Product", ProductSchema);
