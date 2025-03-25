const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
require("dotenv").config();

const router = express.Router();

// ✅ Register a User (User, Pandit, Admin, Vendor)
router.post("/register", async (req, res) => {
    try {
        const { name, email, phone, password, role } = req.body;

        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ error: "User already exists" });

        const hashedPassword = await bcrypt.hash(password, 10);
        user = new User({ name, email, phone, password: hashedPassword, role });
        await user.save();

        res.json({ message: "User Registered Successfully!" });
    } catch (error) {
        res.status(500).json({ error: "Error Registering User" });
    }
});

// ✅ Login (User, Pandit, Admin, Vendor)
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: "Invalid credentials" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1h" });

        res.json({ token, role: user.role });
    } catch (error) {
        res.status(500).json({ error: "Error Logging In" });
    }
});

module.exports = router;
