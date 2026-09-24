const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const User = require("../models/user");

// GET all users (with optional role filtering)
router.get("/users", async (req, res) => {
  try {
    const { role } = req.query;
    let query = {};
    
    if (role) {
      const rolesArray = role.split(",");
      query.role = { $in: rolesArray };
    }

    const users = await User.find(query, "-password");
    res.json({ success: true, users });
  } catch (err) {
    console.error("Fetch users error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch users" });
  }
});

// POST - Register new user
router.post("/users", async (req, res) => {
  try {
    const { name, role, contact, email, password } = req.body;

    if (!name || !role || !contact || !email || !password) {
      return res.status(400).json({ success: false, message: "All fields are required." });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ success: false, message: "A user with this email already exists." });
    }

    const newUser = new User({ name, role, contact, email, password });
    await newUser.save();

    const safeUser = newUser.toObject();
    delete safeUser.password;

    res.status(201).json({ success: true, user: safeUser });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: "A user with this email already exists." });
    }
    console.error("Create user error:", err);
    res.status(500).json({ success: false, message: "Failed to create user" });
  }
});

// PUT - Update user
router.put("/users/:id", async (req, res) => {
  try {
    const updates = { ...req.body };

    if (updates.password) {
      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(updates.password, salt);
    }

    const updated = await User.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!updated) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({ success: true, user: updated });
  } catch (err) {
    console.error("Update user error:", err);
    res.status(500).json({ success: false, message: "Failed to update user" });
  }
});

// DELETE - Remove user
router.delete("/users/:id", async (req, res) => {
  try {
    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.json({ success: true, message: "User removed" });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ success: false, message: "Failed to delete user" });
  }
});

module.exports = router;