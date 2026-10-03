const { Router } = require('express');
const Appointment = require('../models/Appointment');
const Property = require('../models/Property');
const { authenticate, requireRoles } = require('../middleware/auth');
const { validateId, httpError, stringValue } = require('../middleware/validation');
const router = Router();
router.use(authenticate);
router.get('/', async (req, res) => {
    let query;
    if (req.user.role === 'user') query = { buyerId: req.user.userId };
    else if (req.user.role === 'admin') query = {};
    else {
        const properties = await Property.find({ agentId: req.user.userId }).select('_id');
        query = { propertyId: { $in: properties.map(item => item._id) } };
    }
    res.json(await Appointment.find(query).populate('propertyId', 'title location agentId').populate('buyerId', 'name email phone').sort({ createdAt: -1 }));
});
router.post('/', requireRoles('user'), async (req, res) => {
    const propertyId = validateId(req.body?.propertyId, 'property ID');
    const property = await Property.findById(propertyId);
    if (!property || property.status === 'sold' || property.status === 'rented') throw httpError(400, 'This property is unavailable for viewings');
    const requestedAt = new Date(req.body?.requestedAt);
    if (!Number.isFinite(requestedAt.getTime()) || requestedAt <= new Date()) throw httpError(400, 'Choose a future date and time');
    const appointment = await Appointment.create({ propertyId, buyerId: req.user.userId, requestedAt, note: stringValue(req.body?.note, 'Note', { max: 1000 }) || '' });
    res.status(201).json(appointment);
});
router.patch('/:id', async (req, res) => {
    validateId(req.params.id, 'appointment ID');
    const appointment = await Appointment.findById(req.params.id).populate('propertyId', 'agentId');
    if (!appointment) throw httpError(404, 'Appointment not found');
    const buyer = req.user.role === 'user' && String(appointment.buyerId) === req.user.userId;
    const manager = req.user.role === 'admin' || (req.user.role === 'agent' && String(appointment.propertyId?.agentId) === req.user.userId);
    if (!buyer && !manager) throw httpError(403, 'You cannot change this appointment');
    const status = req.body?.status;
    if (buyer ? status !== 'cancelled' : !['confirmed', 'rescheduled', 'cancelled'].includes(status)) throw httpError(400, 'Choose a valid appointment status');
    if (appointment.status === 'cancelled') throw httpError(400, 'Cancelled appointments cannot be changed');
    if (status === 'rescheduled') {
        const requestedAt = new Date(req.body?.requestedAt);
        if (!Number.isFinite(requestedAt.getTime()) || requestedAt <= new Date()) throw httpError(400, 'Choose a future date and time');
        appointment.requestedAt = requestedAt;
    }
    appointment.status = status;
    await appointment.save();
    res.json(appointment);
});
module.exports = router;
