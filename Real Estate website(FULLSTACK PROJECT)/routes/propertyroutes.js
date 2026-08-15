const { Router } = require("express");
const router = Router();
const Property = require("../models/Property");

const jwt = require("jsonwebtoken");
const JWT_SECRET = "supersecretkey";

// Middleware to verify Agent
const authenticateAgent = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  console.log("Auth Middleware - Token:", token ? "Present" : "Missing");
  if (!token) return res.status(401).json({ error: "Access denied" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log("Auth Middleware - Decoded:", decoded);
    if (decoded.role !== 'agent' && decoded.role !== 'admin') {
      console.log("Auth Middleware - Role mismatch:", decoded.role);
      return res.status(403).json({ error: "Agent access required" });
    }
    req.user = decoded;
    next();
  } catch (err) {
    console.error("Auth Middleware - Error:", err.message);
    res.status(401).json({ error: "Invalid token" });
  }
};

// ... (existing code)

router.delete("/:id", authenticateAgent, async (req, res) => {
  try {
    console.log("Delete Route - User:", req.user);
    console.log("Delete Route - ID:", req.params.id);

    const property = await Property.findOne({ _id: req.params.id });
    if (!property) return res.status(404).json({ message: "Property not found" });

    // Check ownership (Admin bypasses this check)
    if (req.user.role !== 'admin' && property.agentId && property.agentId.toString() !== req.user.userId) {
      console.log("Delete Route - Unauthorized. Owner:", property.agentId, "Requestor:", req.user.userId);
      return res.status(403).json({ error: "Unauthorized to delete this property" });
    }

    await Property.findByIdAndDelete(req.params.id);
    console.log("Delete Route - Success");
    res.json({ message: "Property deleted" });
  } catch (error) {
    console.error("Delete Route - Error:", error);
    res.status(500).json({ error: error.message });
  }
});

const upload = require('../middleware/upload');

router.post("/", authenticateAgent, (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      console.error("Upload Error:", err);
      return res.status(400).json({ error: typeof err === 'string' ? err : err.message || "Upload error" });
    } else {
      try {
        console.log("POST /api/properties - Files received:", req.files ? req.files.length : 'none');
        console.log("POST /api/properties - Body fields:", Object.keys(req.body));

        const imageFiles = req.files || [];
        const imagePaths = imageFiles.map(file => `/uploads/${file.filename}`);

        // If no files uploaded, check if a text image URL was provided
        const primaryImage = imagePaths.length > 0 ? imagePaths[0] : req.body.image;
        const allImages = imagePaths.length > 0 ? imagePaths : (req.body.image ? [req.body.image] : []);

        const propertyData = {
          ...req.body,
          image: primaryImage,
          images: allImages,
          agentId: req.user.userId
        };

        console.log("Attempting to save property:", propertyData.title);

        const property = new Property(propertyData);
        await property.save();
        console.log("Property saved with ID:", property._id);
        res.json(property);
      } catch (error) {
        console.error("Property Save Error:", error);
        res.status(500).json({ error: error.message });
      }
    }
  });
});

router.put("/:id", authenticateAgent, (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      console.error("Upload Error (PUT):", err);
      return res.status(400).json({ error: typeof err === 'string' ? err : err.message || "Upload error" });
    } else {
      try {
        const property = await Property.findOne({ _id: req.params.id });
        if (!property) return res.status(404).json({ message: "Property not found" });

        // Check ownership
        if (property.agentId && property.agentId.toString() !== req.user.userId) {
          return res.status(403).json({ error: "Unauthorized to edit this property" });
        }

        console.log("PUT /api/properties/:id - Files received:", req.files ? req.files.length : 'none');
        console.log("PUT /api/properties/:id - Updates:", Object.keys(req.body));

        const updates = { ...req.body };

        if (req.files && req.files.length > 0) {
          const newImagePaths = req.files.map(file => `/uploads/${file.filename}`);
          updates.image = newImagePaths[0];
          updates.images = newImagePaths;
        }

        Object.assign(property, updates);
        await property.save();
        console.log("Property updated successfully:", req.params.id);
        res.json(property);
      } catch (error) {
        console.error("Property Update Error:", error);
        res.status(500).json({ error: error.message });
      }
    }
  });
});

router.get("/", async (req, res) => {
  try {
    const { location, type, maxPrice } = req.query;
    let query = {};

    if (location) {
      query.location = { $regex: location, $options: "i" };
    }
    if (type) {
      query.type = type;
    }
    if (maxPrice) {
      query.price = { $lte: Number(maxPrice) };
    }

    const properties = await Property.find(query).populate('agentId', 'name email phone agentIdString');
    res.json(properties);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const property = await Property.findById(req.params.id).populate('agentId', 'name email phone agentIdString');
    if (!property) return res.status(404).json({ message: "Property not found" });
    res.json(property);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



const Message = require("../models/Message");

router.post("/messages", async (req, res) => {
  try {
    const message = new Message(req.body);
    await message.save();
    res.json({ message: "Message sent successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
