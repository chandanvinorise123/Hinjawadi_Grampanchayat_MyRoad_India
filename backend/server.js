
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const connectDB = require("./config/db");

// =====================================================
// ROUTES
// =====================================================

const authRoutes = require("./features/auth/authRoutes");
const userRoutes = require("./features/users/userRoutes");
const statRoutes = require("./features/stats/statRoutes");
const notificationRoutes = require("./features/notifications/notificationRoutes");
const adminProfileRoutes = require("./features/admin/adminProfileRoutes");
const photoRoutes = require("./features/photos/photoRoutes");
const complaintRoutes = require("./routes/complaintRoutes");
const adminManagementRoutes = require("./features/admin/adminManagementRoutes");
const dashboardRoutes = require("./features/dashboard/dashboardRoutes");
const contactRoutes = require("./features/contact/contactRoutes");
const blogRoutes = require("./features/blog/blogRoutes");

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

app.use(express.json({ limit: "2mb" }));

app.use(
  express.urlencoded({
    extended: true,
    limit: "2mb",
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
app.use("/api/blog", blogRoutes);

// =====================================================
// MAP ROUTES
// =====================================================

try {
  const mapRoutes = require("./features/maps/mapRoutes");

  app.use("/api/map", mapRoutes);
} catch (error) {
  if (
    error.code === "MODULE_NOT_FOUND" &&
    error.message.includes("./features/maps/mapRoutes")
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

app.use("/api/contact-messages", contactRoutes);

app.use("/api/admin", adminProfileRoutes);

app.use("/api/admin", adminManagementRoutes);

app.use("/api/photos", photoRoutes);

app.use("/api/dashboard", dashboardRoutes);

// =====================================================
// STATIC UPLOADS
// =====================================================

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

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

  if (error.type === "entity.too.large") {
    return res.status(413).json({
      success: false,
      message: "Request is too large. Please upload smaller images.",
    });
  }

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
