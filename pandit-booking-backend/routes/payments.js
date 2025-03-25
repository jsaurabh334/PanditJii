const express = require("express");
const crypto = require("crypto");
const Stripe = require("stripe");
const Razorpay = require("razorpay");
const Wallet = require("../models/Wallet");
const { authMiddleware } = require("../middleware/authMiddleware");
require("dotenv").config();

const router = express.Router();

// ✅ Stripe Setup
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ✅ Razorpay Setup
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// 📌 Deposit Money to Wallet (Stripe)
router.post("/stripe/deposit", authMiddleware, async (req, res) => {
    try {
        const { amount } = req.body;
        if (!amount || amount <= 0) return res.status(400).json({ error: "Invalid deposit amount" });

        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount * 100, // Convert to paisa
            currency: "inr",
            payment_method_types: ["card"],
        });

        res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error) {
        console.error("Stripe Payment Error:", error.message);
        res.status(500).json({ error: "Error processing Stripe payment" });
    }
});

// 📌 Verify Stripe Payment & Add to Wallet
router.post("/stripe/verify", authMiddleware, async (req, res) => {
    try {
        const { amount } = req.body;
        if (!amount || amount <= 0) return res.status(400).json({ error: "Invalid amount" });

        let wallet = await Wallet.findOneAndUpdate(
            { user: req.user.id },
            { $setOnInsert: { balance: 0 } },
            { new: true, upsert: true }
        );

        wallet.balance += amount;
        wallet.transactions.push({ type: "deposit", amount });
        await wallet.save();

        res.json({ message: "Wallet balance updated!", balance: wallet.balance });
    } catch (error) {
        console.error("Stripe Verification Error:", error.message);
        res.status(500).json({ error: "Error verifying Stripe payment" });
    }
});

// 📌 Deposit Money to Wallet (Razorpay)
router.post("/razorpay/deposit", authMiddleware, async (req, res) => {
    try {
        const { amount } = req.body;
        if (!amount || amount <= 0) return res.status(400).json({ error: "Invalid deposit amount" });

        const options = {
            amount: amount * 100, // Convert to paisa
            currency: "INR",
            receipt: `rcpt_${req.user.id}`,
            payment_capture: 1, // Auto-capture payment
        };

        const order = await razorpay.orders.create(options);
        res.json({ orderId: order.id, amount: order.amount, currency: order.currency });
    } catch (error) {
        console.error("Razorpay Payment Error:", error.message);
        res.status(500).json({ error: "Error processing Razorpay payment" });
    }
});

// 📌 Verify Razorpay Payment & Add to Wallet
router.post("/razorpay/verify", authMiddleware, async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !amount) {
            return res.status(400).json({ error: "Invalid Razorpay verification request" });
        }

        // ✅ Step 1: Generate Expected Signature
        const generatedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest("hex");

        // ✅ Step 2: Compare Signatures
        if (generatedSignature !== razorpay_signature) {
            return res.status(400).json({ error: "Payment verification failed" });
        }

        // ✅ Step 3: Update Wallet
        let wallet = await Wallet.findOneAndUpdate(
            { user: req.user.id },
            { $setOnInsert: { balance: 0 } },
            { new: true, upsert: true }
        );

        wallet.balance += amount;
        wallet.transactions.push({ type: "deposit", amount });
        await wallet.save();

        res.json({ message: "Wallet balance updated!", balance: wallet.balance });
    } catch (error) {
        console.error("Razorpay Verification Error:", error.message);
        res.status(500).json({ error: "Error verifying Razorpay payment" });
    }
});

module.exports = router;
