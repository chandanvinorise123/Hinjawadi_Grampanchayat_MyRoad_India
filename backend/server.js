
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const statRoutes = require("./routes/statRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const adminProfileRoutes = require("./routes/adminProfileRoutes");
const photoRoutes = require("./routes/photoRoutes");

// ==========================================
// ADDITIONAL ROUTES
// ==========================================


// Complaint Routes
const complaintRoutes = require("./routes/complaintRoutes");

// Admin Management Routes
const adminManagementRoutes = require("./routes/adminManagementRoutes");


const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection
connectDB();

// ==========================================
// ROUTES
// ==========================================

// Authentication Routes
app.use("/api/auth", authRoutes);

// User Routes
app.use("/api", userRoutes);


// ==========================================
// ADDITIONAL USER ROUTE PATH
// ==========================================
// This gives:
// /api/users
// while keeping your existing /api user routes working.
app.use("/api/users", userRoutes);

// ==========================================
// Complaint Routes
// Includes:
// /api/complaints
// /api/complaints/analytics
// ==========================================
app.use("/api/complaints", complaintRoutes);

// ==========================================
// Map Routes
// If mapRoutes.js exists, it will be loaded.
// If it does not exist, backend will continue running.
// ==========================================
try {
  const mapRoutes = require("./routes/mapRoutes");

  app.use("/api/map", mapRoutes);

  console.log("✅ Map routes loaded");
} catch (err) {
  console.log(
    "ℹ️ mapRoutes.js not found. If map endpoints are inside complaintRoutes, this is fine."
  );
}

// Statistics Routes
app.use("/api/stats", statRoutes);

// Notification Routes
app.use("/api/notifications", notificationRoutes);

// Admin Profile Routes
app.use("/api/admin", adminProfileRoutes);

// ==========================================
// ADMIN MANAGEMENT ROUTES
// Includes:
// Overview
// Categories
// Config
// QR
// Activity
// ==========================================
app.use("/api/admin", adminManagementRoutes);
app.use("/api/photos", photoRoutes);

// ==========================================
// DEFAULT ROUTE
// ==========================================

app.get("/", (req, res) => {
  res.send("✅ MyRoad India Backend is running successfully!");
});

// ==========================================
// SERVER START
// ==========================================

const PORT = process.env.PORT || 3200;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

