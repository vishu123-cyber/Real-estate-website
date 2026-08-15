const { Router } = require("express");
const router = Router();
const Property = require("../models/Property");
const Message = require("../models/Message");
const jwt = require("jsonwebtoken");

const JWT_SECRET = "supersecretkey";

// Middleware to verify Agent
const authenticateAgent = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Access denied" });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role !== 'agent' && decoded.role !== 'admin') {
            return res.status(403).json({ error: "Agent access required" });
        }
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ error: "Invalid token" });
    }
};

// Get Agent's Properties
router.get("/properties", authenticateAgent, async (req, res) => {
    try {
        const properties = await Property.find({ agentId: req.user.userId });
        res.json(properties);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get Messages for Agent's Properties
router.get("/messages", authenticateAgent, async (req, res) => {
    try {
        // Find all properties owned by this agent
        const properties = await Property.find({ agentId: req.user.userId }).select('_id');
        const propertyIds = properties.map(p => p._id);

        // Find messages for these properties
        const messages = await Message.find({ propertyId: { $in: propertyIds } }).populate('propertyId', 'title');
        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
