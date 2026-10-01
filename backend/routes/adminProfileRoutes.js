const express = require("express");
const router = express.Router();
const Admin = require("../models/Admin");

// ==========================================
// GET /api/admin/profile/:id - Fetch Admin Profile
// ==========================================
router.get("/profile/:id", async (req, res) => {
  try {
    // ✅ FIXED: Use findOne with 'adminId' instead of findById (which expects ObjectId)
    const admin = await Admin.findOne({ adminId: req.params.id }).select("-password");
    
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }
    
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
    const { password, ...updateData } = req.body; // Exclude password from regular update
    
    // ✅ FIXED: Use findOneAndUpdate with 'adminId' instead of findByIdAndUpdate
    const updatedAdmin = await Admin.findOneAndUpdate(
      { adminId: req.params.id },
      updateData,
      { new: true, runValidators: true }
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
    const admin = await Admin.findOne({ adminId: req.params.id });
    
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

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