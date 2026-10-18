const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const User = require("../../models/user");

// ==========================================
// GET ALL USERS
// Optional role filtering
// Example:
// /api/users?role=staff
// /api/users?role=staff,verifier
// ==========================================
router.get("/users", async (req, res) => {
  try {
    const { role } = req.query;

    let query = {};

    if (role) {
      const rolesArray = role.split(",");
      query.role = { $in: rolesArray };
    }

    const users = await User.find(query, "-password");

    res.json({
      success: true,
      users,
    });
  } catch (err) {
    console.error("Fetch users error:", err);

    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    });
  }
});

// ==========================================
// ✅ ADDED: GET SINGLE USER BY ID
// Used for fetching user details for the Profile Modal
// ==========================================
router.get("/users/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      user,
    });
  } catch (err) {
    console.error("Fetch single user error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user",
    });
  }
});

// ==========================================
// POST - REGISTER NEW USER
// ==========================================
router.post("/users", async (req, res) => {
  try {
    const {
      name,
      role,
      contact,
      email,
      password,
    } = req.body;

    // Validate required fields
    if (!name || !role || !contact || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }

    // Check if email already exists
    const existing = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "A user with this email already exists.",
      });
    }

    // Create new user
    // Password will automatically be hashed
    // by the User model pre-save middleware.
    const newUser = new User({
      name,
      role,
      contact,
      email,
      password,
    });

    await newUser.save();

    // Remove password from response
    const safeUser = newUser.toObject();
    delete safeUser.password;

    res.status(201).json({
      success: true,
      user: safeUser,
    });
  } catch (err) {
    // Duplicate email
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A user with this email already exists.",
      });
    }

    console.error("Create user error:", err);

    res.status(500).json({
      success: false,
      message: "Failed to create user",
    });
  }
});

// ==========================================
// PUT - UPDATE USER
// ==========================================
router.put("/users/:id", async (req, res) => {
  try {
    const updates = {
      ...req.body,
    };

    // If password is being updated,
    // hash it manually because findByIdAndUpdate()
    // does not trigger the save middleware.
    if (updates.password) {
      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(
        updates.password,
        salt
      );
    }

    // Keep email lowercase
    if (updates.email) {
      updates.email = updates.email.toLowerCase().trim();
    }

    const updated = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      {
        returnDocument: "after",
        runValidators: true,
      }
    ).select("-password");

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      user: updated,
    });
  } catch (err) {
    // Duplicate email / staffId / verifierId
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email, Staff ID, or Verifier ID already exists.",
      });
    }

    console.error("Update user error:", err);

    res.status(500).json({
      success: false,
      message: "Failed to update user",
    });
  }
});

// ==========================================
// PUT - UPDATE DETAILED PROFILE
// Staff / Verifier / Admin Profile
// URL:
// PUT /api/users/profile/:id
// ==========================================
router.put("/profile/:id", async (req, res) => {
  try {
    const userId = req.params.id;
    const profileUser = await User.findById(userId);

    if (!profileUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (
      ["staff", "verifier"].includes(profileUser.role) &&
      [
        profileUser.role === "staff" ? "staffId" : "verifierId",
        "staffId",
        "verifierId",
        "department",
        "password",
      ].some((field) =>
        Object.prototype.hasOwnProperty.call(req.body || {}, field)
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Staff/verifier ID and department are read-only. Use the password change form to update your password.",
      });
    }

    const updateData = {
      ...req.body,
    };

    // Keep email lowercase if it is being updated
    if (updateData.email) {
      updateData.email = updateData.email
        .toLowerCase()
        .trim();
    }

    // If password is included in profile update,
    // hash it manually.
    if (updateData.password) {
      const salt = await bcrypt.genSalt(10);

      updateData.password = await bcrypt.hash(
        updateData.password,
        salt
      );
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      {
        returnDocument: "after",
        runValidators: true,
      }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      user: updatedUser,
    });
  } catch (err) {
    // Duplicate email / staffId / verifierId
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email, Staff ID, or Verifier ID already exists.",
      });
    }

    console.error("Profile update error:", err);

    res.status(500).json({
      success: false,
      message: "Failed to update profile",
    });
  }
});

// ==========================================
// DELETE - REMOVE USER
// ==========================================
router.delete("/users/:id", async (req, res) => {
  try {
    const deleted = await User.findByIdAndDelete(
      req.params.id
    );

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: "User removed",
    });
  } catch (err) {
    console.error("Delete user error:", err);

    res.status(500).json({
      success: false,
      message: "Failed to delete user",
    });
  }
});

module.exports = router;