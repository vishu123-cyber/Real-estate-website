const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

// Connect (using same string as server.js)
mongoose.connect('mongodb://localhost:27017/realestate')
    .then(async () => {
        console.log('Connected to DB');

        const email = 'vasu@gmail.com';
        const newPass = 'password123';

        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            console.log(`User ${email} not found.`);
            process.exit(0);
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPass, 8);

        // Update
        await User.updateOne(
            { email },
            { $set: { password: hashedPassword } }
        );

        console.log(`Password for ${email} reset to: ${newPass}`);
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
