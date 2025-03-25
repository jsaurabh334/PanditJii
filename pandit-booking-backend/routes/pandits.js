const express = require("express");
const Booking = require("../models/Booking");
const Wallet = require("../models/Wallet");
const User = require("../models/User");
const { authMiddleware, roleMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

// ✅ Pandit Dashboard (Total Earnings & Bookings)
router.get("/dashboard", authMiddleware, roleMiddleware(["pandit"]), async (req, res) => {
    try {
        const [wallet, totalBookings] = await Promise.all([
            Wallet.findOne({ user: req.user.id }).select("balance"),
            Booking.countDocuments({ pandit: req.user.id })
        ]);

        res.json({
            message: "Welcome to Pandit Dashboard",
            totalBookings,
            totalEarnings: wallet?.balance || 0
        });
    } catch (error) {
        console.error("Error fetching dashboard data:", error.message);
        res.status(500).json({ error: "Error fetching dashboard data" });
    }
});

// ✅ Get Pandit's Own Bookings
router.get("/bookings", authMiddleware, roleMiddleware(["pandit"]), async (req, res) => {
    try {
        const bookings = await Booking.find({ pandit: req.user.id }).populate("user", "name email phone");
        res.json(bookings);
    } catch (error) {
        console.error("Error fetching pandit bookings:", error.message);
        res.status(500).json({ error: "Error fetching bookings" });
    }
});

// ✅ Get Pandit's Wallet Balance
router.get("/wallet", authMiddleware, roleMiddleware(["pandit"]), async (req, res) => {
    try {
        let wallet = await Wallet.findOne({ user: req.user.id }) || new Wallet({ user: req.user.id, balance: 0 });
        await wallet.save();

        res.json({ balance: wallet.balance, transactions: wallet.transactions });
    } catch (error) {
        console.error("Error fetching wallet details:", error.message);
        res.status(500).json({ error: "Error fetching wallet details" });
    }
});

// ✅ Pandit Updates Availability
router.post("/availability", authMiddleware, roleMiddleware(["pandit"]), async (req, res) => {
    try {
        const { availableDates } = req.body;
        if (!availableDates || !Array.isArray(availableDates)) {
            return res.status(400).json({ error: "Invalid availability data" });
        }

        const pandit = await User.findByIdAndUpdate(req.user.id, { availableDates }, { new: true });
        if (!pandit) return res.status(404).json({ error: "Pandit not found" });

        res.json({ message: "Availability updated successfully", availableDates: pandit.availableDates });
    } catch (error) {
        console.error("Error updating availability:", error.message);
        res.status(500).json({ error: "Error updating availability" });
    }
});

// ✅ Pandit Withdraws Earnings
router.post("/withdraw", authMiddleware, roleMiddleware(["pandit"]), async (req, res) => {
    try {
        const { amount } = req.body;
        if (!amount || amount <= 0) return res.status(400).json({ error: "Invalid withdrawal amount" });

        let wallet = await Wallet.findOne({ user: req.user.id });
        if (!wallet || wallet.balance < amount) return res.status(400).json({ error: "Insufficient balance" });

        wallet.balance -= amount;
        wallet.transactions.push({ type: "withdrawal", amount: -amount });
        await wallet.save();

        res.json({ message: `₹${amount} withdrawn successfully`, balance: wallet.balance });
    } catch (error) {
        console.error("Error processing withdrawal:", error.message);
        res.status(500).json({ error: "Error processing withdrawal" });
    }
});

// ✅ Pandit Marks a Booking as Completed
router.post("/complete/:bookingId", authMiddleware, roleMiddleware(["pandit"]), async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.bookingId);
        if (!booking) return res.status(404).json({ error: "Booking not found" });

        if (String(booking.pandit) !== req.user.id) return res.status(403).json({ error: "Unauthorized" });

        booking.status = "completed";
        await booking.save();

        // ✅ Credit Pandit's Wallet
        let wallet = await Wallet.findOneAndUpdate(
            { user: req.user.id },
            { $inc: { balance: booking.amount } },
            { new: true, upsert: true }
        );

        wallet.transactions.push({ type: "earning", amount: booking.amount });
        await wallet.save();

        res.json({ message: "Booking marked as completed!", balance: wallet.balance });
    } catch (error) {
        console.error("Error completing booking:", error.message);
        res.status(500).json({ error: "Error completing booking" });
    }
});

module.exports = router;
