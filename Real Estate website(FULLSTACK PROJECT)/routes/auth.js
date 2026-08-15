const { Router } = require("express");
const router = Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = "supersecretkey";  // In production, use environment variable

router.post("/signup", async (req, res) => {
    try {
        const { username, email, password, role, name, phone, licenseNumber } = req.body;

        // Auto-generate AGTXXXX format ID if role is agent with guaranteed randomness
        // Generate ID and validate license for agents
        let agentIdString;
        if (role === 'agent') {
            // Validate licenseNumber: alphanumeric, dash, slash, and up to 30 chars
            if (licenseNumber) req.body.licenseNumber = licenseNumber.trim();
            const licenseRegex = /^[a-zA-Z0-9\-\/\s]{10,30}$/;
            if (!req.body.licenseNumber || !licenseRegex.test(req.body.licenseNumber)) {
                return res.status(400).json({ error: "Invalid License Number. It should be 10-30 characters long and can contain letters, numbers, spaces, hyphens, or slashes." });
            }

            let isUnique = false;
            while (!isUnique) {
                const randomNum = Math.floor(1000 + Math.random() * 9000);
                const potentialId = `AGT${randomNum}`;
                const existing = await User.findOne({ agentIdString: potentialId });
                if (!existing) {
                    agentIdString = potentialId;
                    isUnique = true;
                }
            }
        }

        const user = new User({
            username,
            email,
            password,
            role: role || 'user',
            name,
            phone,
            licenseNumber: req.body.licenseNumber || licenseNumber,
            agentIdString,
            status: role === 'agent' ? 'pending' : 'approved'
        });
        await user.save();

        if (role === 'agent') {
            return res.status(201).json({ 
                success: true, 
                message: "Registration successful. Your account is pending admin approval.",
                isPending: true
            });
        }

        const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET);
        res.status(201).json({ token, username: user.username, role: user.role, agentIdString: user.agentIdString });
    } catch (error) {
        console.error("Signup Error:", error);
        if (error.code === 11000) {
            return res.status(400).json({ error: "Username or Email already exists" });
        }
        res.status(400).json({ error: error.message || "An error occurred during registration." });
    }
});

router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        if (user.role === 'agent' && user.status !== 'approved') {
            if (user.status === 'pending') {
                return res.status(401).json({ error: "Your account is pending admin approval." });
            } else if (user.status === 'rejected') {
                return res.status(401).json({ error: "Your account has been rejected by the admin." });
            }
        }

        const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET);
        res.json({ token, username: user.username, role: user.role, agentIdString: user.agentIdString });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
