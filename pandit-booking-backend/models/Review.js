const mongoose = require("mongoose");

const ReviewSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    pandit: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Optional for Pandit reviews
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" }, // Optional for Product reviews
    rating: { type: Number, min: 1, max: 5, required: true },
    review: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model("Review", ReviewSchema);
