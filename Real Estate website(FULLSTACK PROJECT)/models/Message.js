const { Schema, model } = require("mongoose");

const messageSchema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    message: { type: String, required: true },
    propertyId: { type: Schema.Types.ObjectId, ref: "Property" },
    timestamp: { type: Date, default: Date.now }
});

module.exports = model("Message", messageSchema);
