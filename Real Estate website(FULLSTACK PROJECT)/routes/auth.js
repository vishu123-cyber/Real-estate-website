const { Router } = require('express');
const { randomInt } = require('crypto');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { httpError, stringValue, emailValue } = require('../middleware/validation');
const router = Router();
function passwordValue(value, signup = false) {
    if (typeof value !== 'string' || !value || (signup && value.length < 8) || Buffer.byteLength(value) > 72) {
        throw httpError(400, signup ? 'Password must contain at least 8 characters and at most 72 bytes' : 'Enter a valid password');
    }
    return value;
}
function session(user) {
    const token = jwt.sign({ userId: user._id.toString(), role: user.role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
    return { token, username: user.username, role: user.role, agentIdString: user.agentIdString };
}
router.post('/signup', async (req, res) => {
    const body = req.body || {};
    const username = stringValue(body.username, 'Username', { required: true, min: 3, max: 50 });
    const email = emailValue(body.email);
    const password = passwordValue(body.password, true);
    const role = body.role === undefined ? 'user' : body.role;
    if (!['user', 'agent'].includes(role)) throw httpError(400, 'Role must be user or agent');
    const name = stringValue(body.name, 'Name', { required: role === 'agent', max: 100 });
    const phone = stringValue(body.phone, 'Phone', { required: role === 'agent', max: 30 });
    if (phone && !/^[+\d\s().-]{7,30}$/.test(phone)) throw httpError(400, 'Enter a valid phone number');
    let licenseNumber;
    let agentIdString;
    if (role === 'agent') {
        licenseNumber = stringValue(body.licenseNumber, 'License number', { required: true, min: 10, max: 30 });
        if (!/^[a-z\d\-/\s]{10,30}$/i.test(licenseNumber)) throw httpError(400, 'License number may contain letters, numbers, spaces, hyphens, or slashes');
        // Use a large random range so agent identifiers do not run out.
        for (let attempt = 0; attempt < 10; attempt++) {
            const candidate = 'AGT' + randomInt(10000000, 100000000);
            if (!(await User.exists({ agentIdString: candidate }))) { agentIdString = candidate; break; }
        }
        if (!agentIdString) throw httpError(503, 'Please try registering again');
    }
    if (await User.exists({ $or: [{ email }, { username }] })) throw httpError(409, 'Username or email already exists');
    const user = await User.create({ username, email, password, role, name, phone, licenseNumber, agentIdString, status: role === 'agent' ? 'pending' : 'approved' });
    if (role === 'agent') return res.status(201).json({ success: true, message: 'Registration successful. Your account is pending admin approval.', isPending: true });
    res.status(201).json(session(user));
});
router.post('/login', async (req, res) => {
    const body = req.body || {};
    const email = emailValue(body.email);
    const password = passwordValue(body.password);
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await bcrypt.compare(password, user.password))) throw httpError(401, 'Invalid credentials');
    if (user.role === 'agent' && user.status !== 'approved') throw httpError(403, user.status === 'rejected' ? 'Your account has been rejected by the admin.' : 'Your account is pending admin approval.');
    res.json(session(user));
});
module.exports = router;
