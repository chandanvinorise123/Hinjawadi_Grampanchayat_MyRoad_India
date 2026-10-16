const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Admin = require("../models/Admin");
const User = require("../models/user");

const adminQuery = (value) => ({
  $or: [
    { adminId: value },
    ...(mongoose.Types.ObjectId.isValid(value) ? [{ _id: value }] : []),
  ],
});

const findAdminRecord = async (value) => {
  const admin = await Admin.findOne(adminQuery(value));
  if (admin) return { model: Admin, query: adminQuery(value), record: admin };
  if (mongoose.Types.ObjectId.isValid(value)) {
    const userAdmin = await User.findOne({ _id: value, role: "admin" });
    if (userAdmin) return { model: User, query: { _id: value }, record: userAdmin };
  }
  return null;
};

// ==========================================
// GET /api/admin/profile/:id - Fetch Admin Profile
// ==========================================
router.get("/profile/:id", async (req, res) => {
  try {
    // ✅ FIXED: Use findOne with 'adminId' instead of findById (which expects ObjectId)
    const result = await findAdminRecord(req.params.id);
    if (!result) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }
    const admin = result.record.toObject();
    delete admin.password;
    res.json({ success: true, admin });
  } catch (err) {
    console.error("Fetch profile error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch profile" });
  }
});

// ==========================================
// PUT /api/admin/profile/:id - Update Admin Profile
// ==========================================
router.put("/profile/:id", async (req, res) => {
  try {
    const { password, ...updateData } = req.body;
    const result = await findAdminRecord(req.params.id);
    if (!result) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }
    const existingAdmin = result.record;
    const mergedData = {
      ...existingAdmin.toObject(),
      ...updateData,
    };
    delete mergedData._id;
    delete mergedData.__v;
    delete mergedData.password;
    if (mergedData.gender === "") delete mergedData.gender;
    
    // ✅ FIXED: Use findOneAndUpdate with 'adminId' instead of findByIdAndUpdate
    const updatedAdmin = await result.model.findOneAndUpdate(
      result.query,
      mergedData,
      { returnDocument: "after", runValidators: true }
    ).select("-password");

    if (!updatedAdmin) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    res.json({
      success: true,
      message: "Profile updated successfully",
      admin: updatedAdmin,
    });
  } catch (err) {
    console.error("Update profile error:", err);
    if (err.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: Object.values(err.errors).map((item) => item.message).join(" "),
      });
    }
    res.status(500).json({ success: false, message: "Failed to update profile" });
  }
});

// ==========================================
// POST /api/admin/change-password/:id - Change Password
// ==========================================
router.post("/change-password/:id", async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "All password fields required" });
    }

    // ✅ FIXED: Use findOne with 'adminId' instead of findById
    const result = await findAdminRecord(req.params.id);
    if (!result) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }
    const admin = result.record;

    // Verify current password using the method defined in your Admin model
    const isMatch = await admin.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Current password is incorrect" });
    }

    // Update to new password (will be hashed automatically by the pre-save hook in your model)
    admin.password = newPassword;
    await admin.save();

    res.json({ success: true, message: "Password changed successfully" });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ success: false, message: "Failed to change password" });
  }
});

module.exports = router;