const { Schema, model } = require('mongoose');
const appointmentSchema = new Schema({
    propertyId: { type: Schema.Types.ObjectId, ref: 'Property', required: true },
    buyerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    requestedAt: { type: Date, required: true },
    status: { type: String, enum: ['requested', 'confirmed', 'rescheduled', 'cancelled'], default: 'requested' },
    note: { type: String, trim: true, maxlength: 1000, default: '' },
    createdAt: { type: Date, default: Date.now }
});
module.exports = model('Appointment', appointmentSchema);
