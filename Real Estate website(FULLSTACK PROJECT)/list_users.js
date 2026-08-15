const mongoose = require("mongoose");
const User = require("./models/User");

mongoose.connect("mongodb://127.0.0.1:27017/realestate")
    .then(async () => {
        console.log("MongoDB Connected");
        const users = await User.find({});
        console.log("Users:", users);
        mongoose.connection.close();
    })
    .catch(err => console.log(err));