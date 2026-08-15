const { Router } = require("express");
const router = Router();
//use to acces the database collections
const Message = require("../models/Message");
const User = require("../models/User");
const Property = require("../models/Property");


const jwt = require("jsonwebtoken");
const JWT_SECRET = "supersecretkey";

// Hardcoded credentials for demo purposes
const ADMIN_USER = "admin";
const ADMIN_PASS = "admin123";

// Admin Login
router.post("/login", (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USER && password === ADMIN_PASS) {
        // Sign real JWT
        const token = jwt.sign({ userId: 'admin', role: 'admin' }, JWT_SECRET);
        res.json({ token, success: true });
    } else {
        res.status(401).json({ success: false, message: "Invalid credentials" });
    }
});

// Middleware to check token
const checkAuth = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role === 'admin') {
            req.user = decoded;
            next();
        } else {
            res.status(403).json({ message: "Admin access required" });
        }
    } catch (err) {
        res.status(401).json({ message: "Invalid token" });
    }
};

router.get("/messages", checkAuth, async (req, res) => {
    try {
        const messages = await Message.find().sort({ timestamp: -1 });
        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete("/messages/:id", checkAuth, async (req, res) => {
    try {
        await Message.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Message deleted" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get("/agents", checkAuth, async (req, res) => {
    try {
        const agents = await User.find({ role: 'agent' }).select('-password');
        
        const agentsWithCounts = await Promise.all(agents.map(async (agent) => {
            const count = await Property.countDocuments({ agentId: agent._id });
            return {
                ...agent._doc,
                propertyCount: count
            };
        }));
        
        res.json(agentsWithCounts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get("/pending-agents", checkAuth, async (req, res) => {
    try {
        const pendingAgents = await User.find({ role: 'agent', status: 'pending' }).select('-password');
        res.json(pendingAgents);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put("/approve-agent/:id", checkAuth, async (req, res) => {
    try {
        const agent = await User.findByIdAndUpdate(req.params.id, { status: 'approved' }, { new: true });
        if (!agent) return res.status(404).json({ message: "Agent not found" });
        res.json({ success: true, message: "Agent approved successfully", agent });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put("/reject-agent/:id", checkAuth, async (req, res) => {
    try {
        const agent = await User.findByIdAndUpdate(req.params.id, { status: 'rejected' }, { new: true });
        if (!agent) return res.status(404).json({ message: "Agent not found" });
        res.json({ success: true, message: "Agent rejected successfully", agent });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
