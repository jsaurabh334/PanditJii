const express = require("express");
const Wallet = require("../models/Wallet");
const { authMiddleware, roleMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

// ✅ Get Wallet Balance
router.get("/", authMiddleware, async (req, res) => {
    try {
        let wallet = await Wallet.findOneAndUpdate(
            { user: req.user.id },
            { $setOnInsert: { balance: 0, transactions: [] } },
            { new: true, upsert: true }
        );

        res.json(wallet);
    } catch (error) {
        console.error("Error fetching wallet balance:", error.message);
        res.status(500).json({ error: "Error fetching wallet balance" });
    }
});

// ✅ Deposit Funds to Wallet
router.post("/deposit", authMiddleware, async (req, res) => {
    try {
        const { amount, reference } = req.body;
        if (!amount || amount <= 0) return res.status(400).json({ error: "Invalid deposit amount" });

        let wallet = await Wallet.findOneAndUpdate(
            { user: req.user.id },
            { $inc: { balance: amount }, $push: { transactions: { type: "deposit", amount, reference } } },
            { new: true, upsert: true }
        );

        res.json({ message: "Funds added successfully", balance: wallet.balance });
    } catch (error) {
        console.error("Error adding funds:", error.message);
        res.status(500).json({ error: "Error adding funds" });
    }
});

// ✅ Withdraw Funds (Only Pandit & Vendor)
router.post("/withdraw", authMiddleware, roleMiddleware(["pandit", "vendor"]), async (req, res) => {
    try {
        const { amount } = req.body;
        if (!amount || amount <= 0) return res.status(400).json({ error: "Invalid withdrawal amount" });

        let wallet = await Wallet.findOne({ user: req.user.id });
        if (!wallet || wallet.balance < amount) return res.status(400).json({ error: "Insufficient Balance" });

        wallet.balance -= amount;
        wallet.transactions.push({ type: "withdrawal", amount });
        await wallet.save();

        res.json({ message: "Withdrawal Successful", balance: wallet.balance });
    } catch (error) {
        console.error("Error processing withdrawal:", error.message);
        res.status(500).json({ error: "Error processing withdrawal" });
    }
});

// ✅ Process Booking Payment
router.post("/pay", authMiddleware, async (req, res) => {
    try {
        const { amount, bookingId } = req.body;
        if (!amount || amount <= 0) return res.status(400).json({ error: "Invalid payment amount" });

        let wallet = await Wallet.findOne({ user: req.user.id });
        if (!wallet || wallet.balance < amount) return res.status(400).json({ error: "Insufficient Balance" });

        wallet.balance -= amount;
        wallet.transactions.push({ type: "booking_payment", amount, reference: bookingId });
        await wallet.save();

        res.json({ message: "Payment Successful", balance: wallet.balance });
    } catch (error) {
        console.error("Error processing payment:", error.message);
        res.status(500).json({ error: "Error processing payment" });
    }
});

module.exports = router;
