require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const statRoutes = require("./routes/statRoutes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection
connectDB();

// Routes
app.use("/api/auth", authRoutes);
app.use("/api", userRoutes);
app.use("/api/stats", statRoutes);

// Default Route
app.get("/", (req, res) => {
  res.send("✅ MyRoad India Backend is running successfully!");
});

// Server Start
const PORT = process.env.PORT || 3200;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});