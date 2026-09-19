const { Router } = require('express');
const { timingSafeEqual } = require('crypto');
const jwt = require('jsonwebtoken');
const Message = require('../models/Message');
const User = require('../models/User');
const Property = require('../models/Property');
const config = require('../config');
const { authenticate, requireRoles } = require('../middleware/auth');
const { httpError, validateId } = require('../middleware/validation');
const router = Router();
function sameSecret(value, expected) {
    if (typeof value !== 'string' || typeof expected !== 'string') return false;
    const supplied = Buffer.from(value);
    const configured = Buffer.from(expected);
    return supplied.length === configured.length && timingSafeEqual(supplied, configured);
}
router.post('/login', (req, res) => {
    const { username, password } = req.body || {};
    if (!sameSecret(username, config.adminUsername) || !sameSecret(password, config.adminPassword)) return res.status(401).json({ success: false, message: 'Invalid credentials', error: 'Invalid credentials' });
    const token = jwt.sign({ userId: 'admin', role: 'admin' }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
    res.json({ token, success: true });
});
router.use(authenticate, requireRoles('admin'));
router.get('/messages', async (req, res) => { res.json(await Message.find().sort({ timestamp: -1 })); });
router.delete('/messages/:id', async (req, res) => {
    validateId(req.params.id, 'message ID');
    if (!(await Message.findByIdAndDelete(req.params.id))) throw httpError(404, 'Message not found');
    res.json({ success: true, message: 'Message deleted' });
});
router.get('/agents', async (req, res) => {
    const agents = await User.find({ role: 'agent' });
    const counts = await Property.aggregate([{ $match: { agentId: { $in: agents.map(agent => agent._id) } } }, { $group: { _id: '$agentId', count: { $sum: 1 } } }]);
    const countByAgent = new Map(counts.map(entry => [entry._id.toString(), entry.count]));
    res.json(agents.map(agent => ({ ...agent.toObject(), propertyCount: countByAgent.get(agent.id) || 0 })));
});
router.get('/pending-agents', async (req, res) => { res.json(await User.find({ role: 'agent', status: 'pending' })); });
for (const [action, status] of [['approve', 'approved'], ['reject', 'rejected']]) {
    router.put('/' + action + '-agent/:id', async (req, res) => {
        validateId(req.params.id, 'agent ID');
        const agent = await User.findOneAndUpdate(
            { _id: req.params.id, role: 'agent' },
            { $set: { status } },
            { returnDocument: 'after', runValidators: true }
        );
        if (!agent) throw httpError(404, 'Agent not found');
        res.json({ success: true, message: 'Agent ' + status + ' successfully', agent });
    });
}
module.exports = router;
