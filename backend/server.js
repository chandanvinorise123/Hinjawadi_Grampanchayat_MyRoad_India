
require("dotenv").config();

const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");

// =====================================================
// ROUTES
// =====================================================

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const statRoutes = require("./routes/statRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const adminProfileRoutes = require("./routes/adminProfileRoutes");
const photoRoutes = require("./routes/photoRoutes");
const complaintRoutes = require("./routes/complaintRoutes");
const adminManagementRoutes = require("./routes/adminManagementRoutes");

// =====================================================
// APP
// =====================================================

const app = express();

// =====================================================
// CORS
// =====================================================

app.use(
  cors({
    origin: [
      "http://localhost:5800",
      "http://127.0.0.1:5800",
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:5100",
      "http://127.0.0.1:5100",
      "http://localhost:5101",
      "http://127.0.0.1:5101",
    ],
    credentials: true,
  })
);

// =====================================================
// BODY PARSER
// =====================================================

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  })
);

// =====================================================
// DATABASE
// =====================================================

connectDB();

// =====================================================
// API ROUTES
// =====================================================

app.use("/api/auth", authRoutes);

app.use("/api", userRoutes);

app.use("/api/users", userRoutes);

// =====================================================
// COMPLAINT ROUTES
// =====================================================

app.use("/api/complaints", complaintRoutes);

// =====================================================
// MAP ROUTES
// =====================================================

try {
  const mapRoutes = require("./routes/mapRoutes");

  app.use("/api/map", mapRoutes);
} catch (error) {
  if (
    error.code === "MODULE_NOT_FOUND" &&
    error.message.includes("./routes/mapRoutes")
  ) {
    // Optional map routes are not available.
  } else {
    throw error;
  }
}

// =====================================================
// OTHER ROUTES
// =====================================================

app.use("/api/stats", statRoutes);

app.use("/api/notifications", notificationRoutes);

app.use("/api/admin", adminProfileRoutes);

app.use("/api/admin", adminManagementRoutes);

app.use("/api/photos", photoRoutes);

// =====================================================
// STATIC UPLOADS
// =====================================================

app.use("/uploads", express.static("uploads"));

// =====================================================
// ROOT
// =====================================================

app.get("/", (req, res) => {
  res.status(200).send(
    "MyRoad India Backend is running successfully!"
  );
});

// =====================================================
// API 404 HANDLER
// =====================================================

app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    message: `API route not found: ${req.method} ${req.originalUrl}`,
  });
});

// =====================================================
// GLOBAL ERROR HANDLER
// =====================================================

app.use((error, req, res, next) => {
  console.error("Global server error:", error);

  res.status(error.status || 500).json({
    success: false,
    message: error.message || "Internal server error",
  });
});

// =====================================================
// START SERVER
// =====================================================

const PORT = process.env.PORT || 3200;

app.listen(PORT, () => {
  console.log(
    `MyRoad India Backend running on http://localhost:${PORT}`
  );

  



});
