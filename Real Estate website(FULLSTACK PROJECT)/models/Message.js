const { Schema, model } = require('mongoose');
const messageSchema = new Schema({
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    message: { type: String, required: true, trim: true, maxlength: 5000 },
    propertyId: { type: Schema.Types.ObjectId, ref: 'Property' },
    status: { type: String, enum: ['new', 'contacted', 'closed'], default: 'new' },
    agentNotes: { type: String, trim: true, maxlength: 2000, default: '' },
    timestamp: { type: Date, default: Date.now }
});
module.exports = model('Message', messageSchema);
