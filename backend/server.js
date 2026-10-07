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
// REQUEST LOGGER
// =====================================================

app.use((req, res, next) => {
  console.log(
    `[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`
  );

  next();
});

// =====================================================
// DATABASE
// =====================================================

connectDB();

// =====================================================
// API ROUTES
// =====================================================

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api",
  userRoutes
);

app.use(
  "/api/users",
  userRoutes
);

// =====================================================
// COMPLAINT ROUTES
// IMPORTANT
// =====================================================

console.log(
  "🔗 Registering complaint routes at /api/complaints"
);

app.use(
  "/api/complaints",
  complaintRoutes
);

console.log(
  "✅ Complaint routes registered"
);

// =====================================================
// MAP ROUTES
// =====================================================

try {
  const mapRoutes =
    require("./routes/mapRoutes");

  app.use(
    "/api/map",
    mapRoutes
  );

  console.log(
    "✅ Map routes loaded"
  );
} catch (error) {
  console.log(
    "ℹ️ mapRoutes.js not found. Skipping map routes."
  );
}

// =====================================================
// OTHER ROUTES
// =====================================================

app.use(
  "/api/stats",
  statRoutes
);

app.use(
  "/api/notifications",
  notificationRoutes
);

app.use(
  "/api/admin",
  adminProfileRoutes
);

app.use(
  "/api/admin",
  adminManagementRoutes
);

app.use(
  "/api/photos",
  photoRoutes
);

// =====================================================
// STATIC UPLOADS
// =====================================================

app.use(
  "/uploads",
  express.static("uploads")
);

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
  console.error(
    `❌ API route not found: ${req.method} ${req.originalUrl}`
  );

  res.status(404).json({
    success: false,
    message: `API route not found: ${req.method} ${req.originalUrl}`,
  });
});

// =====================================================
// GLOBAL ERROR HANDLER
// =====================================================

app.use(
  (error, req, res, next) => {
    console.error(
      "❌ Global server error:",
      error
    );

    res.status(
      error.status || 500
    ).json({
      success: false,
      message:
        error.message ||
        "Internal server error",
    });
  }
);

// =====================================================
// START SERVER
// =====================================================

const PORT =
  process.env.PORT || 3200;

app.listen(
  PORT,
  () => {
    console.log(
      "======================================"
    );

    console.log(
      `🚀 MyRoad India Backend running on port ${PORT}`
    );

    console.log(
      `🌐 http://localhost:${PORT}`
    );

    console.log(
      `🧪 Test: http://localhost:${PORT}/api/complaints/test`
    );

    console.log(
      `📋 My Complaints: http://localhost:${PORT}/api/complaints/my/:citizenId`
    );

    console.log(
      "======================================"
    );
  }
);