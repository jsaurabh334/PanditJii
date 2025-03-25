const mongoose = require("mongoose");

const CouponSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    discountType: { type: String, enum: ["fixed", "percentage"], required: true },
    discountValue: { type: Number, required: true }, // Either fixed amount or percentage
    expiresAt: { type: Date, required: true },
    usageLimit: { type: Number, default: 1 }, // Optional: Max times a coupon can be used
    usageCount: { type: Number, default: 0 }, // Tracks how many times it's been used
}, { timestamps: true });

module.exports = mongoose.model("Coupon", CouponSchema);
