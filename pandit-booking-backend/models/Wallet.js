const mongoose = require("mongoose");

const WalletSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    balance: { type: Number, default: 0 },
    transactions: [{
        type: { type: String, enum: ["deposit", "withdrawal", "booking_payment", "refund"], required: true },
        amount: { type: Number, required: true },
        reference: { type: String }, // ✅ Can store transaction ID or booking ID
        date: { type: Date, default: Date.now }
    }]
}, { timestamps: true });

module.exports = mongoose.model("Wallet", WalletSchema);
