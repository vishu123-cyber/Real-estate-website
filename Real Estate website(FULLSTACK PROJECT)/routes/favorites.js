const { Router } = require('express');
const User = require('../models/User');
const Property = require('../models/Property');
const { authenticate, requireRoles } = require('../middleware/auth');
const { validateId, httpError } = require('../middleware/validation');
const router = Router();
router.use(authenticate, requireRoles('user', 'agent'));
router.get('/', async (req, res) => {
    await req.account.populate('favorites');
    res.json(req.account.favorites.filter(Boolean));
});
router.post('/:id', async (req, res) => {
    const propertyId = validateId(req.params.id, 'property ID');
    if (!(await Property.exists({ _id: propertyId }))) throw httpError(404, 'Property not found');
    const user = await User.findByIdAndUpdate(req.user.userId, { $addToSet: { favorites: propertyId } }, { returnDocument: 'after' });
    if (!user) throw httpError(401, 'Please sign in again');
    res.json(user.favorites);
});
router.delete('/:id', async (req, res) => {
    const propertyId = validateId(req.params.id, 'property ID');
    const user = await User.findByIdAndUpdate(req.user.userId, { $pull: { favorites: propertyId } }, { returnDocument: 'after' });
    if (!user) throw httpError(401, 'Please sign in again');
    res.json(user.favorites);
});
module.exports = router;
