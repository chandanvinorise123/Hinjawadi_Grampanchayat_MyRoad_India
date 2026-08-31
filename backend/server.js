const express = require("express");

const cors = require("cors");

const dotenv = require("dotenv");

const connectDB = require("./config/db.js");

//const routes = require("./routes/routes");

const app = express();

dotenv.config();

// Middleware
app.use(cors());

app.use(express.json());

// Database Connection
connectDB();

// Routes
//app.use("/api", routes);

// Default Route
app.get("/", (req, res) => {
    res.send("backend running");
});

// Server Start
app.listen(3200, () => {
    console.log("server running on port 3200");
});