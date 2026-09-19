const { Schema, model } = require('mongoose');
const bcrypt = require('bcryptjs');
function hidePassword(doc, result) { delete result.password; return result; }
const userSchema = new Schema({
    username: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 50 },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 254 },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['user', 'agent'], default: 'user' },
    name: { type: String, trim: true, maxlength: 100 },
    phone: { type: String, trim: true, maxlength: 30 },
    licenseNumber: { type: String, trim: true, maxlength: 30 },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: function () { return this.role === 'agent' ? 'pending' : 'approved'; } },
    agentIdString: { type: String, unique: true, sparse: true },
    favorites: [{ type: Schema.Types.ObjectId, ref: 'Property' }]
}, { toJSON: { transform: hidePassword }, toObject: { transform: hidePassword } });
userSchema.pre('save', async function () {
    if (this.isModified('password')) this.password = await bcrypt.hash(this.password, 12);
});
module.exports = model('User', userSchema);
