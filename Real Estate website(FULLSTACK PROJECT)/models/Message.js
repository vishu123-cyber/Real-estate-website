const { Schema, model } = require('mongoose');
const messageSchema = new Schema({
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    message: { type: String, required: true, trim: true, maxlength: 5000 },
    propertyId: { type: Schema.Types.ObjectId, ref: 'Property' },
    timestamp: { type: Date, default: Date.now }
});
module.exports = model('Message', messageSchema);
