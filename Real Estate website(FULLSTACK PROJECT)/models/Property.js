const { Schema, model } = require("mongoose");

const propertySchema = new Schema({
  title: String,
  location: String,
  price: Number,
  type: String,
  description: String,
  beds: Number,
  baths: Number,
  agentContact: String,
  image: String,
  images: [String], // Added image field for frontend display
  agentId: { type: Schema.Types.ObjectId, ref: 'User' },
  coordinates: {
    lat: Number,
    lng: Number
  }
});

module.exports = model("Property", propertySchema);
