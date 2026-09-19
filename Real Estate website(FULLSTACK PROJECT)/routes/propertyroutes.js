const { Router } = require('express');
const Property = require('../models/Property');
const Message = require('../models/Message');
const User = require('../models/User');
const upload = require('../middleware/upload');
const { authenticate, requireRoles } = require('../middleware/auth');
const { validateId, httpError, stringValue, emailValue } = require('../middleware/validation');
const router = Router();
const propertyTypes = ['House', 'Apartment', 'Villa', 'Condo'];

function numberValue(value, label, { min = 0, max = 1e15, integer = false } = {}) {
    if (!['string', 'number'].includes(typeof value) || (typeof value === 'string' && !value.trim())) throw httpError(400, label + ' must be a number');
    const number = Number(value);
    if (!Number.isFinite(number) || number < min || number > max || (integer && !Number.isInteger(number))) throw httpError(400, label + ' must be between ' + min + ' and ' + max + (integer ? ' (whole numbers only)' : ''));
    return number;
}
function imageValue(value) {
    const image = stringValue(value, 'Image URL', { max: 2048 });
    if (!image) return image;
    if (/^\/uploads\/[a-z\d._-]+$/i.test(image)) return image;
    try {
        const url = new URL(image);
        if (['http:', 'https:'].includes(url.protocol) && !url.username && !url.password) return url.href;
    } catch {}
    throw httpError(400, 'Image must be a valid HTTP(S) URL or an uploaded image');
}
function propertyValues(body, creating) {
    const values = {};
    for (const [field, max] of [['title', 200], ['location', 200], ['description', 10000], ['agentContact', 200]]) {
        if (creating || Object.hasOwn(body, field)) {
            const value = stringValue(body[field], field, { required: ['title', 'location'].includes(field), max });
            if (value !== undefined) values[field] = value;
        }
    }
    if (creating || Object.hasOwn(body, 'type')) {
        if (!propertyTypes.includes(body.type)) throw httpError(400, 'Choose House, Apartment, Villa, or Condo');
        values.type = body.type;
    }
    if (creating || Object.hasOwn(body, 'price')) values.price = numberValue(body.price, 'Price', { min: 1 });
    for (const field of ['beds', 'baths']) {
        if (Object.hasOwn(body, field) && body[field] !== '') values[field] = numberValue(body[field], field, { max: 100, integer: true });
    }
    if (Object.hasOwn(body, 'image')) {
        values.image = imageValue(body.image);
        values.images = values.image ? [values.image] : [];
    }
    if (Object.hasOwn(body, 'coordinates')) {
        let coordinates = body.coordinates;
        if (typeof coordinates === 'string') {
            try { coordinates = JSON.parse(coordinates); } catch { throw httpError(400, 'Coordinates must be valid JSON'); }
        }
        if (!coordinates || typeof coordinates !== 'object' || Array.isArray(coordinates)) throw httpError(400, 'Coordinates must contain lat and lng');
        values.coordinates = {
            lat: numberValue(coordinates.lat, 'Latitude', { min: -90, max: 90 }),
            lng: numberValue(coordinates.lng, 'Longitude', { min: -180, max: 180 })
        };
    }
    return values;
}
function receiveImages(req, res) {
    return new Promise((resolve, reject) => upload(req, res, error => error ? reject(error) : resolve()));
}
async function ownedProperty(req, res, next) {
    try {
        validateId(req.params.id, 'property ID');
        const property = await Property.findById(req.params.id);
        if (!property) throw httpError(404, 'Property not found');
        if (req.user.role !== 'admin' && (!property.agentId || property.agentId.toString() !== req.user.userId)) throw httpError(403, 'You can only change your own properties');
        req.property = property;
        next();
    } catch (error) { next(error); }
}
const manageProperties = [authenticate, requireRoles('agent', 'admin')];

router.get('/', async (req, res) => {
    const query = {};
    if (req.query.location !== undefined && req.query.location !== '') {
        const location = stringValue(req.query.location, 'Location', { max: 200 });
        query.location = { $regex: location.replace(/[.*+?^$\{\}()|[\]\\]/g, '\\$&'), $options: 'i' };
    }
    if (req.query.type !== undefined && req.query.type !== '') {
        if (!propertyTypes.includes(req.query.type)) throw httpError(400, 'Choose a valid property type');
        query.type = req.query.type;
    }
    if (req.query.maxPrice !== undefined && req.query.maxPrice !== '') query.price = { $lte: numberValue(req.query.maxPrice, 'Maximum price') };
    res.json(await Property.find(query).populate('agentId', 'name email phone agentIdString').sort({ _id: -1 }));
});

router.post('/messages', async (req, res) => {
    const body = req.body || {};
    const data = {
        name: stringValue(body.name, 'Name', { required: true, max: 100 }),
        email: emailValue(body.email),
        message: stringValue(body.message, 'Message', { required: true, max: 5000 })
    };
    if (body.propertyId !== undefined && body.propertyId !== null && body.propertyId !== '') {
        data.propertyId = validateId(body.propertyId, 'property ID');
        if (!(await Property.exists({ _id: data.propertyId }))) throw httpError(404, 'Property not found');
    }
    await Message.create(data);
    res.status(201).json({ message: 'Message sent successfully' });
});

router.get('/:id', async (req, res) => {
    validateId(req.params.id, 'property ID');
    const property = await Property.findById(req.params.id).populate('agentId', 'name email phone agentIdString');
    if (!property) throw httpError(404, 'Property not found');
    res.json(property);
});

router.post('/', ...manageProperties, async (req, res, next) => {
    try {
        await receiveImages(req, res);
        const data = propertyValues(req.body || {}, true);
        if (req.files?.length) {
            data.images = req.files.map(file => '/uploads/' + file.filename);
            data.image = data.images[0];
        }
        if (req.user.role === 'agent') data.agentId = req.user.userId;
        const property = await Property.create(data);
        res.status(201).json(property);
    } catch (error) {
        await upload.cleanup(req.files);
        next(error);
    }
});

router.put('/:id', ...manageProperties, ownedProperty, async (req, res, next) => {
    try {
        await receiveImages(req, res);
        const updates = propertyValues(req.body || {}, false);
        if (req.files?.length) {
            updates.images = req.files.map(file => '/uploads/' + file.filename);
            updates.image = updates.images[0];
        }
        Object.assign(req.property, updates);
        await req.property.save();
        res.json(req.property);
    } catch (error) {
        await upload.cleanup(req.files);
        next(error);
    }
});

router.delete('/:id', ...manageProperties, ownedProperty, async (req, res) => {
    await req.property.deleteOne();
    await User.updateMany({ favorites: req.property._id }, { $pull: { favorites: req.property._id } });
    res.json({ message: 'Property deleted' });
});
module.exports = router;
