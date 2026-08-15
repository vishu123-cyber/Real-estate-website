const { Schema, model } = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'agent'], default: 'user' },
    name: String,
    phone: String,
    licenseNumber: String,
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    agentIdString: { type: String, unique: true, sparse: true },
    favorites: [{ type: Schema.Types.ObjectId, ref: "Property" }]
});

// Hash password before saving
userSchema.pre("save", async function () {
    if (this.isModified("password")) {
        this.password = await bcrypt.hash(this.password, 8);
    }
});

module.exports = model("User", userSchema);
