const express = require("express");
const Review = require("../models/Review");
const Booking = require("../models/Booking");
const Product = require("../models/Product");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

// ✅ Add a Review for a Pandit (Only after completed booking)
router.post("/pandit/:panditId", authMiddleware, async (req, res) => {
    try {
        const { rating, review } = req.body;
        const { panditId } = req.params;

        // Validate rating
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ error: "Rating must be between 1 and 5" });
        }

        // Ensure the user has booked this Pandit before reviewing
        const pastBooking = await Booking.findOne({ user: req.user.id, pandit: panditId, status: "completed" });
        if (!pastBooking) {
            return res.status(403).json({ error: "You can only review Pandits after a completed booking" });
        }

        // Check if user has already reviewed this Pandit
        const existingReview = await Review.findOne({ user: req.user.id, pandit: panditId });
        if (existingReview) {
            return res.status(400).json({ error: "You have already reviewed this Pandit" });
        }

        // Create Review
        const newReview = new Review({
            user: req.user.id,
            pandit: panditId,
            rating,
            review,
        });

        await newReview.save();
        res.json({ message: "Review submitted successfully", review: newReview });
    } catch (error) {
        console.error("Error submitting review:", error.message);
        res.status(500).json({ error: "Error submitting review" });
    }
});

// ✅ Get Reviews for a Pandit
router.get("/pandit/:panditId", async (req, res) => {
    try {
        const { panditId } = req.params;
        const reviews = await Review.find({ pandit: panditId }).populate("user", "name");
        res.json(reviews);
    } catch (error) {
        console.error("Error fetching reviews:", error.message);
        res.status(500).json({ error: "Error fetching reviews" });
    }
});

// ✅ Add a Review for a Product (Only after purchase)
router.post("/product/:productId", authMiddleware, async (req, res) => {
    try {
        const { rating, review } = req.body;
        const { productId } = req.params;

        // Validate rating
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ error: "Rating must be between 1 and 5" });
        }

        // Ensure the user has purchased this product
        const purchasedProduct = await Product.findById(productId);
        if (!purchasedProduct) return res.status(404).json({ error: "Product not found" });

        // Check if user has already reviewed this product
        const existingReview = await Review.findOne({ user: req.user.id, product: productId });
        if (existingReview) {
            return res.status(400).json({ error: "You have already reviewed this product" });
        }

        // Create Review
        const newReview = new Review({
            user: req.user.id,
            product: productId,
            rating,
            review,
        });

        await newReview.save();
        res.json({ message: "Review submitted successfully", review: newReview });
    } catch (error) {
        console.error("Error submitting review:", error.message);
        res.status(500).json({ error: "Error submitting review" });
    }
});

// ✅ Get Reviews for a Product
router.get("/product/:productId", async (req, res) => {
    try {
        const { productId } = req.params;
        const reviews = await Review.find({ product: productId }).populate("user", "name");
        res.json(reviews);
    } catch (error) {
        console.error("Error fetching reviews:", error.message);
        res.status(500).json({ error: "Error fetching reviews" });
    }
});

module.exports = router;
