const express = require("express");
const cors = require("cors");
// const connectDB = require("./config/db");
// const routes = require("./routes/routes");

const app = express();

// // Middleware
// app.use(cors());
// app.use(express.json());

// // Database Connection
// connectDB();

// // Routes
// app.use("/api", routes);

// Default Route
app.get("/", (req, res) => {
    res.send("backend running");
});

// Server Start
app.listen(3200, () => {
    console.log("server running on port 3200");
});