require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const statRoutes = require("./routes/statRoutes");
const complaintRoutes = require("./routes/complaintRoutes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database Connection
connectDB();

// Routes
app.use("/api/auth", authRoutes);
app.use("/api", userRoutes);
app.use("/api/stats", statRoutes);
app.use("/uploads", express.static("uploads"));
app.use("/api/complaints", complaintRoutes);

// Default Route
app.get("/", (req, res) => {
  res.send("MyRoad India Backend is running successfully!");
});

const PORT = process.env.PORT || 3200;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});