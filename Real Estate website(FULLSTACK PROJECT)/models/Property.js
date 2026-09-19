const { Schema, model } = require('mongoose');
const propertySchema = new Schema({
    title: { type: String, required: true, trim: true, maxlength: 200 },
    location: { type: String, required: true, trim: true, maxlength: 200 },
    price: { type: Number, required: true, min: 1, max: 1e15 },
    type: { type: String, required: true, enum: ['House', 'Apartment', 'Villa', 'Condo'] },
    description: { type: String, trim: true, maxlength: 10000 },
    beds: { type: Number, min: 0, max: 100, validate: Number.isInteger },
    baths: { type: Number, min: 0, max: 100, validate: Number.isInteger },
    agentContact: { type: String, trim: true, maxlength: 200 },
    image: { type: String, maxlength: 2048 },
    images: { type: [String], validate: value => value.length <= 10 },
    agentId: { type: Schema.Types.ObjectId, ref: 'User' },
    coordinates: {
        lat: { type: Number, min: -90, max: 90 },
        lng: { type: Number, min: -180, max: 180 }
    }
});
module.exports = model('Property', propertySchema);
