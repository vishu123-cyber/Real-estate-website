const { connectDatabase, disconnectDatabase } = require('./config/database');
const User = require("./models/User");

connectDatabase()
    .then(async () => {
        console.log("MongoDB Connected");
        const users = await User.find({}).select('username email role status agentIdString').lean();
        console.table(users);
    })
    .catch(err => { console.error('Could not list users:', err.name); process.exitCode = 1; })
    .finally(disconnectDatabase);
