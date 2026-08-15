const { Router } = require("express");
const router = Router();
const User = require("../models/User");
const jwt = require("jsonwebtoken");

const JWT_SECRET = "supersecretkey";

// Middleware to authenticate user
const auth = async (req, res, next) => {
    try {
        const token = req.headers.authorization.replace("Bearer ", "");
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = await User.findById(decoded.userId);
        if (!req.user) throw new Error();
        next();
    } catch (error) {
        res.status(401).json({ error: "Please authenticate." });
    }
};

// Get Favorites
router.get("/", auth, async (req, res) => {
    try {
        await req.user.populate("favorites");
        res.json(req.user.favorites);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add to Favorites
router.post("/:id", auth, async (req, res) => {
    try {
        const propertyId = req.params.id;
        if (!req.user.favorites.includes(propertyId)) {
            req.user.favorites.push(propertyId);
            await req.user.save();
        }
        res.json(req.user.favorites);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Remove from Favorites
router.delete("/:id", auth, async (req, res) => {
    try {
        const propertyId = req.params.id;
        req.user.favorites = req.user.favorites.filter(id => id.toString() !== propertyId);
        await req.user.save();
        res.json(req.user.favorites);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
