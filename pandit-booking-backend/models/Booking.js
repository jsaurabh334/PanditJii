const mongoose = require("mongoose");

const BookingSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    pandit: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, required: true },
    amount: { type: Number, required: true },
    surgeMultiplier: { type: Number, default: 1 },
    status: { type: String, enum: ["pending", "confirmed", "completed", "canceled"], default: "pending" },
}, { timestamps: true });

module.exports = mongoose.model("Booking", BookingSchema);
