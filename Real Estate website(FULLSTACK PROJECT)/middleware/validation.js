const mongoose = require('mongoose');
function httpError(status, message) { return Object.assign(new Error(message), { status }); }
function validateId(id, label = 'ID') {
    if (typeof id !== 'string' || !/^[a-f\d]{24}$/i.test(id) || !mongoose.isValidObjectId(id)) throw httpError(400, 'Invalid ' + label);
    return id;
}
function stringValue(value, label, { required = false, min = 0, max = 500 } = {}) {
    if (value === undefined || value === null) {
        if (required) throw httpError(400, label + ' is required');
        return undefined;
    }
    if (typeof value !== 'string') throw httpError(400, label + ' must be text');
    const result = value.trim();
    if ((required && !result) || result.length < min || result.length > max) throw httpError(400, label + ' must be ' + Math.max(required ? 1 : 0, min) + '-' + max + ' characters');
    return result;
}
function emailValue(value) {
    const email = stringValue(value, 'Email', { required: true, max: 254 }).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw httpError(400, 'Enter a valid email address');
    return email;
}
module.exports = { httpError, validateId, stringValue, emailValue };
