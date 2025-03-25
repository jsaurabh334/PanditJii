const express = require("express");
const User = require("../models/User");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

// ✅ Get User Profile (Authenticated Users)
router.get("/profile", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password");
        if (!user) return res.status(404).json({ error: "User not found" });

        res.json(user);
    } catch (error) {
        console.error("Error fetching user profile:", error.message);
        res.status(500).json({ error: "Error fetching user profile" });
    }
});

// ✅ Update Profile (Name, Phone)
router.put("/profile", authMiddleware, async (req, res) => {
    try {
        const { name, phone } = req.body;

        if (!name && !phone) {
            return res.status(400).json({ error: "At least one field (name or phone) must be provided" });
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            { $set: { name, phone } },
            { new: true }
        ).select("-password");

        res.json({ message: "Profile updated successfully", user: updatedUser });
    } catch (error) {
        console.error("Error updating profile:", error.message);
        res.status(500).json({ error: "Error updating profile" });
    }
});

// ✅ Change Password
router.put("/change-password", authMiddleware, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: "Both current and new passwords are required" });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: "New password must be at least 6 characters long" });
        }

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ error: "User not found" });

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) return res.status(400).json({ error: "Current password is incorrect" });

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        res.json({ message: "Password updated successfully" });
    } catch (error) {
        console.error("Error changing password:", error.message);
        res.status(500).json({ error: "Error changing password" });
    }
});

module.exports = router;
