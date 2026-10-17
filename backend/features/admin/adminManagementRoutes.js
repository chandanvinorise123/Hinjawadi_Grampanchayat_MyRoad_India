const express = require("express");
const router = express.Router();
const User = require("../../models/user");
const Category = require("../../models/Category");
const SystemConfig = require("../../models/SystemConfig");
const QRCode = require("../../models/QRCode");
const ActivityLog = require("../../models/ActivityLog");
const Complaint = require("../../models/Complaint"); // Adjust path if needed

// ==========================================
// 0. ADMIN OVERVIEW STATS
// ==========================================
router.get("/overview", async (req, res) => {
  try {
    // Use $ne: false to safely count users even if 'isActive' is missing in older documents
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: { $ne: false } });
    
    const totalCategories = await Category.countDocuments();
    const activeQRCodes = await QRCode.countDocuments({ isActive: true });
    
    const complaintStatusCounts = await Complaint.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const recentActivity = await ActivityLog.find()
      .sort({ timestamp: -1 })
      .limit(5)
      .select("action userName details timestamp createdAt");

    res.json({
      success: true,
      stats: { 
        totalUsers, 
        activeUsers, 
        totalCategories, 
        activeQRCodes, 
        complaintStatusCounts, 
        recentActivity 
      }
    });
  } catch (err) {
    console.error("Overview fetch error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch overview", error: err.message });
  }
});

// ==========================================
// 1. MANAGE USERS (Activate/Deactivate)
// ==========================================
router.patch("/users/:id/status", async (req, res) => {
  try {
    const { isActive } = req.body;
    
    // Find user first to get their name for the activity log
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    
    user.isActive = isActive;
    await user.save();
    
    await ActivityLog.create({ 
      action: "USER_STATUS_UPDATED", 
      userName: "Admin", 
      details: `Set user ${user.name} isActive to ${isActive}` 
    });
    
    const safeUser = user.toObject();
    delete safeUser.password;
    
    res.json({ success: true, user: safeUser });
  } catch (err) {
    console.error("Update user status error:", err);
    res.status(500).json({ success: false, message: "Failed to update user status" });
  }
});

// ==========================================
// 3. MANAGE ISSUE CATEGORIES
// ==========================================
router.get("/categories", async (req, res) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 });
    res.json({ success: true, categories });
  } catch (err) {
    console.error("Fetch categories error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch categories" });
  }
});

router.post("/categories", async (req, res) => {
  try {
    const newCategory = new Category(req.body);
    await newCategory.save();
    await ActivityLog.create({ action: "CATEGORY_CREATED", userName: "Admin", details: `Created category: ${newCategory.name}` });
    res.status(201).json({ success: true, category: newCategory });
  } catch (err) {
    console.error("Create category error:", err);
    res.status(500).json({ success: false, message: "Failed to create category" });
  }
});

router.put("/categories/:id", async (req, res) => {
  try {
    const updated = await Category.findByIdAndUpdate(req.params.id, req.body, { returnDocument: "after" });
    if (!updated) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }
    await ActivityLog.create({ action: "CATEGORY_UPDATED", userName: "Admin", details: `Updated category: ${updated.name}` });
    res.json({ success: true, category: updated });
  } catch (err) {
    console.error("Update category error:", err);
    res.status(500).json({ success: false, message: "Failed to update category" });
  }
});

router.delete("/categories/:id", async (req, res) => {
  try {
    const deleted = await Category.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }
    await ActivityLog.create({ action: "CATEGORY_DELETED", userName: "Admin", details: `Deleted category: ${deleted.name}` });
    res.json({ success: true, message: "Category deleted" });
  } catch (err) {
    console.error("Delete category error:", err);
    res.status(500).json({ success: false, message: "Failed to delete category" });
  }
});

// ==========================================
// 4. MANAGE SYSTEM CONFIGURATION
// ==========================================
router.get("/config", async (req, res) => {
  try {
    let config = await SystemConfig.findOne();
    if (!config) {
      config = new SystemConfig();
      await config.save();
    }
    res.json({ success: true, config });
  } catch (err) {
    console.error("Fetch config error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch config" });
  }
});

router.put("/config", async (req, res) => {
  try {
    let config = await SystemConfig.findOne();
    if (!config) {
      config = new SystemConfig();
    }
    
    Object.assign(config, req.body);
    await config.save();
    
    await ActivityLog.create({ action: "CONFIG_UPDATED", userName: "Admin", details: "Updated system configuration" });
    res.json({ success: true, config });
  } catch (err) {
    console.error("Update config error:", err);
    res.status(500).json({ success: false, message: "Failed to update config" });
  }
});

// ==========================================
// 5. MANAGE QR CODES
// ==========================================
router.get("/qrcodes", async (req, res) => {
  try {
    const qrcodes = await QRCode.find().sort({ createdAt: -1 });
    res.json({ success: true, qrcodes });
  } catch (err) {
    console.error("Fetch QR codes error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch QR codes" });
  }
});

router.post("/qrcodes", async (req, res) => {
  try {
    const newQR = new QRCode(req.body);
    await newQR.save();
    await ActivityLog.create({ action: "QR_CREATED", userName: "Admin", details: `Generated QR for ${newQR.location}` });
    res.status(201).json({ success: true, qrCode: newQR });
  } catch (err) {
    console.error("Create QR code error:", err);
    res.status(500).json({ success: false, message: "Failed to create QR code" });
  }
});

router.put("/qrcodes/:id", async (req, res) => {
  try {
    const updated = await QRCode.findByIdAndUpdate(req.params.id, req.body, { returnDocument: "after" });
    if (!updated) {
      return res.status(404).json({ success: false, message: "QR Code not found" });
    }
    res.json({ success: true, qrCode: updated });
  } catch (err) {
    console.error("Update QR code error:", err);
    res.status(500).json({ success: false, message: "Failed to update QR code" });
  }
});

// ==========================================
// 6. MONITOR SYSTEM ACTIVITY & COMPLAINTS
// ==========================================
router.get("/activity", async (req, res) => {
  try {
    const logs = await ActivityLog.find().sort({ timestamp: -1 }).limit(50);
    const complaints = await Complaint.find().sort({ createdAt: -1 }).limit(50).select("complaintNumber category location date status");
    res.json({ success: true, logs, complaints });
  } catch (err) {
    console.error("Fetch activity error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch activity" });
  }
});

module.exports = router;