const { Router } = require('express');
const Property = require('../models/Property');
const Message = require('../models/Message');
const { authenticate, requireRoles } = require('../middleware/auth');
const router = Router();
router.use(authenticate, requireRoles('agent', 'admin'));
router.get('/properties', async (req, res) => {
    const query = req.user.role === 'admin' ? {} : { agentId: req.user.userId };
    res.json(await Property.find(query).sort({ _id: -1 }));
});
router.get('/messages', async (req, res) => {
    const propertyQuery = req.user.role === 'admin' ? {} : { agentId: req.user.userId };
    const properties = await Property.find(propertyQuery).select('_id');
    const messages = await Message.find({ propertyId: { $in: properties.map(property => property._id) } }).populate('propertyId', 'title').sort({ timestamp: -1 });
    res.json(messages);
});
module.exports = router;
