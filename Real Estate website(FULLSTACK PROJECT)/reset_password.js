const { connectDatabase, disconnectDatabase } = require('./config/database');
const User = require('./models/User');

const email = process.env.RESET_EMAIL?.trim().toLowerCase();
const newPass = process.env.RESET_PASSWORD;
if (!email || !newPass || newPass.length < 8 || Buffer.byteLength(newPass, 'utf8') > 72) {
    console.error('Set RESET_EMAIL and RESET_PASSWORD (8+ characters, at most 72 UTF-8 bytes) before running this script.');
    process.exit(1);
}

connectDatabase()
    .then(async () => {
        console.log('Connected to DB');

        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            console.log(`User ${email} not found.`);
            process.exitCode = 1;
            return;
        }

        user.password = newPass;
        await user.save();
        console.log(`Password updated for ${email}.`);
    })
    .catch(err => {
        console.error('Password reset failed:', err.name);
        process.exitCode = 1;
    })
    .finally(disconnectDatabase);
