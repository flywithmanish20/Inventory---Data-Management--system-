const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();

app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));

const Product = require("./models /Product");

// Create Product
app.post("/products", async (req, res) => {
    try {
        const product = await Product.create(req.body);
        res.status(201).json(product);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Get All Products
app.get("/products", async (req, res) => {
    const products = await Product.find();
    res.json(products);
});

// Get Single Product
app.get("/products/:id", async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: "Not found" });
        res.json(product);
    } catch (err) {
        res.status(400).json({ error: "Invalid ID" });
    }
});

// Update Product
app.put("/products/:id", async (req, res) => {
    try {
        const product = await Product.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!product) return res.status(404).json({ message: "Not found" });
        res.json(product);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Delete Product
app.delete("/products/:id", async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);
        if (!product) return res.status(404).json({ message: "Not found" });
        res.json({ message: "Product deleted" });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});


app.get("/products/search", async (req, res) => {
    try {
        const { category, sort, page = 1, limit = 5 } = req.query;

        const filter = category ? { category } : {};

        const products = await Product.find(filter)
            .sort(sort ? { price: sort === "desc" ? -1 : 1 } : {})
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit));

        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});



app.get("/products/low-stock", async (req, res) => {
    const products = await Product.find({
        quantity: { $lt: 10 }
    });

    res.json(products);
});


app.get("/products/summary", async (req, res) => {
    const result = await Product.aggregate([
        {
            $group: {
                _id: "$category",
                totalProducts: { $sum: 1 },
                totalStock: { $sum: "$quantity" }
            }
        }
    ]);

    res.json(result);
});

app.patch("/products/:id/stock", async (req, res) => {
    try {
        const { amount, operation } = req.body;

        if (!Number.isInteger(amount) || amount <= 0 ||
            !["restock", "sale"].includes(operation)) {
            return res.status(400).json({ message: "Invalid input" });
        }

        const change = operation === "restock" ? amount : -amount;

        const product = await Product.findOneAndUpdate(
            {
                _id: req.params.id,
                ...(operation === "sale"
                    ? { quantity: { $gte: amount } }
                    : {})
            },
            { $inc: { quantity: change } },
            { new: true }
        );

        if (!product) {
            return res.status(400).json({
                message: "Product not found or insufficient stock"
            });
        }

        res.json(product);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
})

app.listen(3000, () => {
    console.log("Server running on port 3000");
});