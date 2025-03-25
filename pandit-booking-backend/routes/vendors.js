const express = require("express");
const User = require("../models/User");
const { authMiddleware, roleMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

// ✅ Get All Vendors
router.get("/", async (req, res) => {
    try {
        const vendors = await User.find({ role: "vendor" }).select("-password");
        res.json(vendors);
    } catch (error) {
        console.error("Error fetching vendors:", error.message);
        res.status(500).json({ error: "Error fetching vendors" });
    }
});

// ✅ Vendor Profile Update
router.put("/profile", authMiddleware, roleMiddleware(["vendor"]), async (req, res) => {
    try {
        const { name, phone } = req.body;

        if (!name && !phone) {
            return res.status(400).json({ error: "At least one field (name or phone) must be provided" });
        }

        const updatedVendor = await User.findByIdAndUpdate(
            req.user.id,
            { $set: { name, phone } },
            { new: true }
        ).select("-password");

        res.json({ message: "Profile updated successfully", user: updatedVendor });
    } catch (error) {
        console.error("Error updating vendor profile:", error.message);
        res.status(500).json({ error: "Error updating vendor profile" });
    }
});

module.exports = router;
