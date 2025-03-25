const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Booking = require("../models/Booking");
const Wallet = require("../models/Wallet");
const Product = require("../models/Product");
const Coupon = require("../models/Coupon"); // New Feature
const { authMiddleware, roleMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

// ✅ Get Admin Dashboard
router.get("/dashboard", authMiddleware, roleMiddleware(["admin"]), async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalBookings = await Booking.countDocuments();
        const totalVendors = await User.countDocuments({ role: "vendor" });
        const totalPandits = await User.countDocuments({ role: "pandit" });

        res.json({
            message: "Welcome to Admin Dashboard",
            stats: { totalUsers, totalBookings, totalVendors, totalPandits }
        });
    } catch (error) {
        console.error("Error fetching admin dashboard:", error.message);
        res.status(500).json({ error: "Error fetching admin dashboard" });
    }
});

// ✅ Get All Users
router.get("/users", authMiddleware, roleMiddleware(["admin"]), async (req, res) => {
    try {
        const users = await User.find().select("-password");
        res.json(users);
    } catch (error) {
        console.error("Error fetching users:", error.message);
        res.status(500).json({ error: "Error fetching users" });
    }
});

// ✅ Suspend or Enable a User Account
router.put("/users/toggle-status/:id", authMiddleware, roleMiddleware(["admin"]), async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ error: "User not found" });

        user.isSuspended = !user.isSuspended;
        await user.save();

        res.json({ message: `User account ${user.isSuspended ? "disabled" : "enabled"}` });
    } catch (error) {
        console.error("Error toggling user status:", error.message);
        res.status(500).json({ error: "Error updating user status" });
    }
});

// ✅ Update User Role (Make Vendor or Pandit)
router.put("/users/update-role/:id", authMiddleware, roleMiddleware(["admin"]), async (req, res) => {
    try {
        const { role } = req.body;
        if (!["user", "vendor", "pandit", "admin"].includes(role)) return res.status(400).json({ error: "Invalid role" });

        const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
        if (!user) return res.status(404).json({ error: "User not found" });

        res.json({ message: "User role updated successfully", user });
    } catch (error) {
        console.error("Error updating user role:", error.message);
        res.status(500).json({ error: "Error updating user role" });
    }
});

// ✅ Approve or Reject Pandit/Vendor Applications
router.put("/users/approve/:id", authMiddleware, roleMiddleware(["admin"]), async (req, res) => {
    try {
        const { status } = req.body;
        if (!["approved", "rejected"].includes(status)) return res.status(400).json({ error: "Invalid status" });

        const user = await User.findByIdAndUpdate(req.params.id, { isApproved: status === "approved" }, { new: true });
        if (!user) return res.status(404).json({ error: "User not found" });

        res.json({ message: `User application ${status}`, user });
    } catch (error) {
        console.error("Error approving/rejecting application:", error.message);
        res.status(500).json({ error: "Error updating application status" });
    }
});

// ✅ Get All Bookings
router.get("/bookings", authMiddleware, roleMiddleware(["admin"]), async (req, res) => {
    try {
        const bookings = await Booking.find().populate("user pandit", "name email phone");
        res.json(bookings);
    } catch (error) {
        console.error("Error fetching bookings:", error.message);
        res.status(500).json({ error: "Error fetching bookings" });
    }
});

// ✅ Cancel Any Booking
router.delete("/bookings/:id", authMiddleware, roleMiddleware(["admin"]), async (req, res) => {
    try {
        const booking = await Booking.findByIdAndDelete(req.params.id);
        if (!booking) return res.status(404).json({ error: "Booking not found" });

        res.json({ message: "Booking canceled successfully" });
    } catch (error) {
        console.error("Error canceling booking:", error.message);
        res.status(500).json({ error: "Error canceling booking" });
    }
});

// ✅ View Wallet Summary
router.get("/wallet-summary", authMiddleware, roleMiddleware(["admin"]), async (req, res) => {
    try {
        const totalBalance = await Wallet.aggregate([{ $group: { _id: null, total: { $sum: "$balance" } } }]);
        res.json({ totalBalance: totalBalance[0]?.total || 0 });
    } catch (error) {
        console.error("Error fetching wallet summary:", error.message);
        res.status(500).json({ error: "Error fetching wallet summary" });
    }
});

// ✅ Delete Any Product
router.delete("/products/:id", authMiddleware, roleMiddleware(["admin"]), async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);
        if (!product) return res.status(404).json({ error: "Product not found" });

        res.json({ message: "Product deleted successfully" });
    } catch (error) {
        console.error("Error deleting product:", error.message);
        res.status(500).json({ error: "Error deleting product" });
    }
});

// ✅ Delete a User
router.delete("/users/:id", authMiddleware, roleMiddleware(["admin"]), async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).json({ error: "User not found" });

        res.json({ message: "User deleted successfully" });
    } catch (error) {
        console.error("Error deleting user:", error.message);
        res.status(500).json({ error: "Error deleting user" });
    }
});

// ✅ Create Discount Coupon
router.post("/coupons", authMiddleware, roleMiddleware(["admin"]), async (req, res) => {
    try {
        const { code, discount, expiresAt } = req.body;
        if (!code || !discount || !expiresAt) return res.status(400).json({ error: "Missing required fields" });

        const coupon = new Coupon({ code, discount, expiresAt });
        await coupon.save();

        res.json({ message: "Coupon created successfully", coupon });
    } catch (error) {
        console.error("Error creating coupon:", error.message);
        res.status(500).json({ error: "Error creating coupon" });
    }
});

module.exports = router;
