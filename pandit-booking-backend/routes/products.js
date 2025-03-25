const express = require("express");
const Product = require("../models/Product");
const { authMiddleware, roleMiddleware } = require("../middleware/authMiddleware");
const upload = require("../utils/upload");

const router = express.Router();

// ✅ Get All Products
router.get("/", async (req, res) => {
    try {
        const products = await Product.find().populate("vendor", "name email");
        res.json(products);
    } catch (error) {
        console.error("Error fetching products:", error.message);
        res.status(500).json({ error: "Error fetching products" });
    }
});

// ✅ Get Product by ID
router.get("/:id", async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).populate("vendor", "name email");
        if (!product) return res.status(404).json({ error: "Product not found" });
        res.json(product);
    } catch (error) {
        console.error("Error fetching product:", error.message);
        res.status(500).json({ error: "Error fetching product" });
    }
});

// ✅ Add New Product (Vendor Only)
router.post("/", authMiddleware, roleMiddleware(["vendor"]), upload.array("images", 5), async (req, res) => {
    try {
        const { name, description, category, price, stock } = req.body;

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: "At least one image is required" });
        }

        const imageUrls = req.files.map(file => file.path);

        const product = new Product({ 
            name, 
            description, 
            category, 
            price, 
            stock, 
            images: imageUrls, 
            vendor: req.user.id 
        });

        await product.save();
        res.json({ message: "Product added successfully", product });
    } catch (error) {
        console.error("Error adding product:", error.message);
        res.status(500).json({ error: "Error adding product" });
    }
});

// ✅ Update Product (Vendor Only)
router.put("/:id", authMiddleware, roleMiddleware(["vendor"]), async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ error: "Product not found" });

        if (product.vendor.toString() !== req.user.id) {
            return res.status(403).json({ error: "Unauthorized" });
        }

        const updatedProduct = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ message: "Product updated successfully", updatedProduct });
    } catch (error) {
        console.error("Error updating product:", error.message);
        res.status(500).json({ error: "Error updating product" });
    }
});

// ✅ Delete Product (Vendor Only)
router.delete("/:id", authMiddleware, roleMiddleware(["vendor"]), async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ error: "Product not found" });

        if (product.vendor.toString() !== req.user.id) {
            return res.status(403).json({ error: "Unauthorized" });
        }

        await Product.deleteOne({ _id: req.params.id });
        res.json({ message: "Product deleted successfully" });
    } catch (error) {
        console.error("Error deleting product:", error.message);
        res.status(500).json({ error: "Error deleting product" });
    }
});

module.exports = router;
