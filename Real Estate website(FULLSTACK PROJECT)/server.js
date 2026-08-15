//ENTRY POINT OF BACKEND WHRE WE CREATE THE EXPRESS SERVER AND CONNECT TO MONGODB
const express = require("express");//USED TO CREATE SERVER
const mongoose = require("mongoose");//CONNECT KARTO WITH DATABASE
const app = express();

app.use(express.json());
app.use(express.static("public"));
app.use('/uploads', express.static('public/uploads'));

const propertyRoutes = require("./routes/propertyroutes");
const adminRoutes = require("./routes/admin");
const authRoutes = require("./routes/auth");
const favoritesRoutes = require("./routes/favorites");
const agentRoutes = require("./routes/agent");

mongoose.connect("mongodb://127.0.0.1:27017/realestate")//connects mongodb
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log("MongoDB Connection Error:", err));

app.use("/api/properties", propertyRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/favorites", favoritesRoutes);
app.use("/api/agent", agentRoutes);
app.listen(3000, () => {//starts the server
  console.log("Server running on port 3000");
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Global Error Handler:", err);
  res.status(500).json({ error: err.message || "Internal Server Error" });
});
