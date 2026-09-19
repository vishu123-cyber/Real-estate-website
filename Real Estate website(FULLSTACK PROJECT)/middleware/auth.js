const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config');
const { httpError, validateId } = require('./validation');

async function authenticate(req, res, next) {
    const authorization = req.headers.authorization;
    const match = typeof authorization === 'string' && /^Bearer\s+(\S+)$/i.exec(authorization);
    if (!match) return next(httpError(401, 'Please sign in to continue'));
    let payload;
    try {
        payload = jwt.verify(match[1], config.jwtSecret, { algorithms: ['HS256'] });
        if (!payload || typeof payload !== 'object' || !['user', 'agent', 'admin'].includes(payload.role)) throw new Error('Invalid token payload');
        if (payload.role === 'admin') {
            if (payload.userId !== 'admin') throw new Error('Invalid administrator');
        } else { validateId(payload.userId, 'account ID'); }
    } catch {
        return next(httpError(401, 'Your session is invalid or expired. Please sign in again'));
    }
    try {
        if (payload.role !== 'admin') {
            const account = await User.findById(payload.userId);
            if (!account || account.role !== payload.role) return next(httpError(401, 'Please sign in again'));
            if (account.role === 'agent' && account.status !== 'approved') return next(httpError(403, 'Your agent account is not approved'));
            req.account = account;
        }
        req.user = payload;
        next();
    } catch (error) { next(error); }
}
function requireRoles(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) return next(httpError(403, 'You do not have access to this action'));
        next();
    };
}
module.exports = { authenticate, requireRoles };
