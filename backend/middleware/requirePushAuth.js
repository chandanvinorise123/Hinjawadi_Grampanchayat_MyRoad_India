const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/user");

const requirePushAuth = async (req, res, next) => {
  const authorization = req.get("authorization") || "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    return res.status(503).json({
      success: false,
      message: "Push authentication is not configured on the server.",
    });
  }
  if (!token) {
    return res.status(401).json({ success: false, message: "Authentication is required." });
  }

  try {
    const claims = jwt.verify(token, secret);
    if (!claims.sub || !mongoose.Types.ObjectId.isValid(claims.sub)) {
      return res.status(401).json({ success: false, message: "Authentication token is invalid." });
    }

    const user = await User.findById(claims.sub).select("_id role");
    if (!user || user.role !== claims.role) {
      return res.status(401).json({ success: false, message: "Authentication token is no longer valid." });
    }

    req.pushUser = user;
    return next();
  } catch (error) {
    if (error.name === "TokenExpiredError" || error.name === "JsonWebTokenError") {
      return res.status(401).json({ success: false, message: "Authentication token is invalid or expired." });
    }
    console.error("Push authentication failed:", error);
    return res.status(500).json({ success: false, message: "Unable to authenticate this request." });
  }
};

module.exports = requirePushAuth;
