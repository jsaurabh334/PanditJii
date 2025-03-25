const express = require("express");
const Coupon = require("../models/Coupon");
const { authMiddleware, roleMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

// ✅ Create a New Coupon (Admin Only)
router.post("/", authMiddleware, roleMiddleware(["admin"]), async (req, res) => {
    try {
        const { code, discountType, discountValue, expiresAt, usageLimit } = req.body;

        if (!code || !discountType || !discountValue || !expiresAt) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const coupon = new Coupon({
            code: code.toUpperCase(),
            discountType,
            discountValue,
            expiresAt,
            usageLimit: usageLimit || 1
        });

        await coupon.save();
        res.json({ message: "Coupon created successfully", coupon });
    } catch (error) {
        console.error("Error creating coupon:", error.message);
        res.status(500).json({ error: "Error creating coupon" });
    }
});

// ✅ Get All Coupons (Public)
router.get("/", async (req, res) => {
    try {
        const coupons = await Coupon.find();
        res.json(coupons);
    } catch (error) {
        console.error("Error fetching coupons:", error.message);
        res.status(500).json({ error: "Error fetching coupons" });
    }
});

// ✅ Validate a Coupon (User Only)
router.get("/validate/:code", authMiddleware, async (req, res) => {
    try {
        const coupon = await Coupon.findOne({ code: req.params.code.toUpperCase() });

        if (!coupon) return res.status(404).json({ error: "Coupon not found" });
        if (new Date() > new Date(coupon.expiresAt)) return res.status(400).json({ error: "Coupon expired" });
        if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
            return res.status(400).json({ error: "Coupon usage limit reached" });
        }

        res.json({ message: "Coupon is valid", discountType: coupon.discountType, discountValue: coupon.discountValue });
    } catch (error) {
        console.error("Error validating coupon:", error.message);
        res.status(500).json({ error: "Error validating coupon" });
    }
});

// ✅ Apply a Coupon (User Only)
router.post("/apply/:code", authMiddleware, async (req, res) => {
    try {
        const { totalAmount } = req.body;
        const coupon = await Coupon.findOne({ code: req.params.code.toUpperCase() });

        if (!coupon) return res.status(404).json({ error: "Coupon not found" });
        if (new Date() > new Date(coupon.expiresAt)) return res.status(400).json({ error: "Coupon expired" });
        if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
            return res.status(400).json({ error: "Coupon usage limit reached" });
        }

        let discountAmount = 0;
        if (coupon.discountType === "fixed") {
            discountAmount = coupon.discountValue;
        } else if (coupon.discountType === "percentage") {
            discountAmount = (totalAmount * coupon.discountValue) / 100;
        }

        const finalAmount = Math.max(totalAmount - discountAmount, 0);
        coupon.usageCount += 1;
        await coupon.save();

        res.json({ message: "Coupon applied successfully", discountAmount, finalAmount });
    } catch (error) {
        console.error("Error applying coupon:", error.message);
        res.status(500).json({ error: "Error applying coupon" });
    }
});

// ✅ Delete a Coupon (Admin Only)
router.delete("/:id", authMiddleware, roleMiddleware(["admin"]), async (req, res) => {
    try {
        const coupon = await Coupon.findByIdAndDelete(req.params.id);
        if (!coupon) return res.status(404).json({ error: "Coupon not found" });

        res.json({ message: "Coupon deleted successfully" });
    } catch (error) {
        console.error("Error deleting coupon:", error.message);
        res.status(500).json({ error: "Error deleting coupon" });
    }
});

module.exports = router;
