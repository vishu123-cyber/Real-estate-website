const { Router } = require('express');
const Property = require('../models/Property');
const Message = require('../models/Message');
const { authenticate, requireRoles } = require('../middleware/auth');
const { validateId, httpError, stringValue } = require('../middleware/validation');
const router = Router();
router.use(authenticate, requireRoles('agent', 'admin'));
router.get('/properties', async (req, res) => {
    const query = req.user.role === 'admin' ? {} : { agentId: req.user.userId };
    res.json(await Property.find(query).sort({ _id: -1 }));
});
router.get('/messages', requireRoles('agent'), async (req, res) => {
    const propertyQuery = { agentId: req.user.userId };
    const properties = await Property.find(propertyQuery).select('_id');
    const messages = await Message.find({ propertyId: { $in: properties.map(property => property._id) } }).populate('propertyId', 'title').sort({ timestamp: -1 });
    res.json(messages);
});
router.patch('/messages/:id', requireRoles('agent'), async (req, res) => {
    validateId(req.params.id, 'inquiry ID');
    const message = await Message.findById(req.params.id);
    if (!message) throw httpError(404, 'Inquiry not found');
    const property = await Property.findById(message.propertyId);
    if (req.user.role !== 'admin' && String(property?.agentId) !== req.user.userId) throw httpError(403, 'You cannot update this inquiry');
    if (req.body?.status !== undefined) {
        if (!['new', 'contacted', 'closed'].includes(req.body.status)) throw httpError(400, 'Invalid inquiry status');
        message.status = req.body.status;
    }
    if (req.body?.agentNotes !== undefined) message.agentNotes = stringValue(req.body.agentNotes, 'Agent notes', { max: 2000 }) || '';
    await message.save();
    res.json(message);
});
module.exports = router;
