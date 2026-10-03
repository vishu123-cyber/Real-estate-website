const { Router } = require('express');
const Property = require('../models/Property');
const { authenticate, requireRoles } = require('../middleware/auth');
const { validateId, httpError, stringValue } = require('../middleware/validation');
const router = Router();
router.use(authenticate, requireRoles('user'));
function queryFor(filters) {
    const query = { $or: [{ status: 'available' }, { status: { $exists: false } }] };
    if (filters.location) query.location = { $regex: filters.location.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    if (filters.type) query.type = filters.type;
    if (filters.minPrice || filters.maxPrice) {
        query.price = {};
        if (filters.minPrice) query.price.$gte = filters.minPrice;
        if (filters.maxPrice) query.price.$lte = filters.maxPrice;
    }
    if (filters.minBeds) query.beds = { $gte: filters.minBeds };
    if (filters.amenity) query.amenities = filters.amenity;
    return query;
}
router.get('/', async (req, res) => {
    const searches = await Promise.all(req.account.savedSearches.map(async search => ({
        ...search.toObject(),
        matches: await Property.find({ ...queryFor(search.filters), createdAt: { $gt: search.lastSeenAt } }).limit(20).select('title location price image')
    })));
    res.json(searches);
});
router.post('/', async (req, res) => {
    if (req.account.savedSearches.length >= 20) throw httpError(400, 'You can save up to 20 searches');
    const input = req.body?.filters || {};
    const filters = {};
    if (input.location) filters.location = stringValue(input.location, 'Location', { max: 200 });
    if (input.type) {
        if (!['House', 'Apartment', 'Villa', 'Condo'].includes(input.type)) throw httpError(400, 'Invalid property type');
        filters.type = input.type;
    }
    if (input.amenity) {
        if (!['Parking', 'Garden', 'Balcony', 'Pool', 'Gym', 'Security'].includes(input.amenity)) throw httpError(400, 'Invalid amenity');
        filters.amenity = input.amenity;
    }
    for (const key of ['minPrice', 'maxPrice', 'minBeds']) if (input[key] !== undefined && input[key] !== '') {
        const number = Number(input[key]);
        if (!Number.isFinite(number) || number < 0 || (key === 'minBeds' && (!Number.isInteger(number) || number > 100))) throw httpError(400, 'Invalid ' + key);
        filters[key] = number;
    }
    req.account.savedSearches.push({ name: stringValue(req.body?.name, 'Search name', { required: true, max: 80 }), filters });
    await req.account.save();
    res.status(201).json(req.account.savedSearches.at(-1));
});
router.patch('/:id/seen', async (req, res) => {
    validateId(req.params.id, 'search ID');
    const search = req.account.savedSearches.id(req.params.id);
    if (!search) throw httpError(404, 'Saved search not found');
    search.lastSeenAt = new Date();
    await req.account.save();
    res.json(search);
});
router.delete('/:id', async (req, res) => {
    validateId(req.params.id, 'search ID');
    const search = req.account.savedSearches.id(req.params.id);
    if (!search) throw httpError(404, 'Saved search not found');
    search.deleteOne();
    await req.account.save();
    res.json({ message: 'Saved search deleted' });
});
module.exports = router;
