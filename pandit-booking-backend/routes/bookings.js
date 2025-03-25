const express = require("express");
const Booking = require("../models/Booking");
const Wallet = require("../models/Wallet");
const Coupon = require("../models/Coupon"); // ✅ Import Coupon Model
const { sendEmail, sendSMS, sendWhatsApp } = require("../utils/notifications");
const { getSurgeMultiplier } = require("../utils/dynamicPricing");
const { authMiddleware, roleMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

// ✅ Get All Bookings (Admin Only)
router.get("/", authMiddleware, roleMiddleware(["admin"]), async (req, res) => {
    try {
        const bookings = await Booking.find().populate("user pandit", "name email phone");
        res.json(bookings);
    } catch (error) {
        console.error("Error fetching bookings:", error.message);
        res.status(500).json({ error: "Error fetching bookings" });
    }
});

// ✅ Get User's Bookings
router.get("/user", authMiddleware, async (req, res) => {
    try {
        const bookings = await Booking.find({ user: req.user.id }).populate("pandit", "name email");
        res.json(bookings);
    } catch (error) {
        console.error("Error fetching user bookings:", error.message);
        res.status(500).json({ error: "Error fetching your bookings" });
    }
});

// ✅ Create a Booking (Dynamic Pricing, Coupons & Payment Deduction)
router.post("/", authMiddleware, async (req, res) => {
    try {
        const { pandit, date, baseAmount, couponCode } = req.body;
        let discountAmount = 0;

        // ✅ Validate & Apply Coupon (If Provided)
        if (couponCode) {
            const coupon = await Coupon.findOne({ code: couponCode.toUpperCase() });
            if (!coupon) return res.status(400).json({ error: "Invalid coupon code" });
            if (new Date() > new Date(coupon.expiresAt)) return res.status(400).json({ error: "Coupon expired" });
            if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
                return res.status(400).json({ error: "Coupon usage limit reached" });
            }

            // ✅ Calculate Discount
            if (coupon.discountType === "fixed") {
                discountAmount = coupon.discountValue;
            } else if (coupon.discountType === "percentage") {
                discountAmount = (baseAmount * coupon.discountValue) / 100;
            }

            // ✅ Update Coupon Usage
            coupon.usageCount += 1;
            await coupon.save();
        }

        // ✅ Calculate Surge Pricing
        const surgeMultiplier = getSurgeMultiplier(date);
        if (!surgeMultiplier || surgeMultiplier <= 0) return res.status(400).json({ error: "Invalid surge multiplier calculation" });

        const totalAmount = baseAmount * surgeMultiplier;
        const finalAmount = Math.max(totalAmount - discountAmount, 0);

        // ✅ Check Wallet Balance
        let wallet = await Wallet.findOne({ user: req.user.id });
        if (!wallet || wallet.balance < finalAmount) return res.status(400).json({ error: "Insufficient Wallet Balance" });

        // ✅ Deduct Amount from Wallet
        wallet.balance -= finalAmount;
        wallet.transactions.push({ type: "booking_payment", amount: finalAmount });
        await wallet.save();

        // ✅ Create Booking
        const booking = new Booking({ user: req.user.id, pandit, date, amount: finalAmount, surgeMultiplier, couponApplied: couponCode || null, discount: discountAmount });
        await booking.save();

        // ✅ Send Notifications
        try {
            await sendEmail(req.user.email, "Puja Booking Confirmed", `Your puja booking on ${date} is confirmed.`);
        } catch (err) {
            console.error("Notification Error:", err.message);
        }

        res.json({ message: "Booking Confirmed!", booking, discountApplied: discountAmount, finalPrice: finalAmount, walletBalance: wallet.balance });
    } catch (error) {
        console.error("Error creating booking:", error.message);
        res.status(500).json({ error: "Error creating booking" });
    }
});

// ✅ Complete a Booking (Pandit Marks as Completed)
router.post("/complete/:id", authMiddleware, roleMiddleware(["pandit"]), async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) return res.status(404).json({ error: "Booking not found" });

        if (!booking.pandit || String(booking.pandit) !== req.user.id) {
            return res.status(403).json({ error: "Unauthorized" });
        }

        booking.status = "completed";
        await booking.save();

        let wallet = await Wallet.findOne({ user: booking.pandit });
        if (!wallet) wallet = new Wallet({ user: booking.pandit, balance: 0 });

        wallet.balance += booking.amount;
        wallet.transactions.push({ type: "earning", amount: booking.amount });
        await wallet.save();

        res.json({ message: "Booking marked as completed!", balance: wallet.balance });
    } catch (error) {
        console.error("Error completing booking:", error.message);
        res.status(500).json({ error: "Error completing booking" });
    }
});

// ✅ Cancel a Booking (User Only) & Refund Processing
router.post("/cancel/:id", authMiddleware, async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) return res.status(404).json({ error: "Booking not found" });

        if (String(booking.user) !== req.user.id && req.user.role !== "admin") {
            return res.status(403).json({ error: "Unauthorized" });
        }

        if (booking.status !== "pending") return res.status(400).json({ error: "Only pending bookings can be canceled" });

        // ✅ Refund amount back to user wallet
        let wallet = await Wallet.findOne({ user: booking.user });
        if (!wallet) wallet = new Wallet({ user: booking.user, balance: 0 });

        wallet.balance += booking.amount;
        wallet.transactions.push({ type: "refund", amount: booking.amount });
        await wallet.save();

        booking.status = "canceled";
        await booking.save();

        try {
            await sendEmail(req.user.email, "Booking Cancelled", `Your booking on ${booking.date} has been canceled.`);
        } catch (err) {
            console.error("Notification Error:", err.message);
        }

        res.json({ message: "Booking canceled and refund processed!", balance: wallet.balance });
    } catch (error) {
        console.error("Error canceling booking:", error.message);
        res.status(500).json({ error: "Error canceling booking" });
    }
});

// ✅ Admin: Update Booking Status
router.put("/update/:id", authMiddleware, roleMiddleware(["admin"]), async (req, res) => {
    try {
        const validStatuses = ["pending", "confirmed", "completed", "canceled"];
        if (!validStatuses.includes(req.body.status)) return res.status(400).json({ error: "Invalid booking status" });

        const booking = await Booking.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
        if (!booking) return res.status(404).json({ error: "Booking not found" });

        res.json({ message: "Booking status updated successfully", booking });
    } catch (error) {
        console.error("Error updating booking status:", error.message);
        res.status(500).json({ error: "Error updating booking status" });
    }
});

module.exports = router;
