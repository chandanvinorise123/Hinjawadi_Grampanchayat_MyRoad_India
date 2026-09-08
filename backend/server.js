const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db.js");
const authRoutes = require("./routes/authRoutes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection
connectDB();

// Routes
app.use("/api/auth", authRoutes);

// Default Route
app.get("/", (req, res) => {
    res.send("backend running");
});

// Server Start
const PORT = process.env.PORT || 3200;
app.listen(PORT, () => {
    console.log(`server running on port ${PORT}`);
});