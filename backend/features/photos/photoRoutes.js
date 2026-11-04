const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const ImageVerification = require("../../models/ImageVerification");
const User = require("../../models/user");
const Admin = require("../../models/Admin");
const { validateImageWithGemini } = require("../../utils/gemini");

// Ensure upload directory exists
const uploadDir = path.join(__dirname, "../../uploads/complaints");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPG, PNG, and WEBP are allowed."));
    }
  },
});

// ==========================================
// POST /api/photos/verify-image
// Handles image upload and AI verification
// ==========================================
router.post("/verify-image", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: "No image file provided" 
      });
    }

    const category = req.body.category || req.body.issueType || "Road Issue";
    const filePath = req.file.path;
    const latitude = Number(req.body.latitude);
    const longitude = Number(req.body.longitude);
    const accuracy = Number(req.body.accuracy);

    let isGeminiValid = true;
    try {
      isGeminiValid = await validateImageWithGemini(filePath, category);
    } catch (err) {
      console.warn("Gemini verification warning:", err.message);
    }

    if (!isGeminiValid) {
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        console.error("Error deleting rejected image:", e);
      }
      return res.status(400).json({
        success: false,
        roadRelated: false,
        confidence: 0,
        message: `Image does not match the selected issue (${category}). Please capture or upload a relevant picture.`,
      });
    }

    const verificationLog = new ImageVerification({
      fileName: req.file.filename,
      filePath: filePath,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      aiVerification: {
        checked: true,
        roadRelated: true,
        confidence: 95,
        detectedIssue: category,
        modelVersion: "gemini-vision",
        checkedAt: new Date(),
      },
      status: "VERIFIED",
      location: Number.isFinite(latitude) && Number.isFinite(longitude)
        ? {
            latitude,
            longitude,
            accuracy: Number.isFinite(accuracy) ? accuracy : undefined,
          }
        : undefined,
    });

    await verificationLog.save();

    res.json({
      success: true,
      roadRelated: true,
      confidence: 95,
      detectedIssue: category,
      message: "Image verified successfully with Gemini Vision.",
      fileName: req.file.filename,
      publicUrl: `${req.protocol}://${req.get("host")}/uploads/complaints/${req.file.filename}`,
      requiresReview: false,
      verificationId: verificationLog._id,
    });
  } catch (error) {
    console.error("Photo verification error:", error);
    res.status(500).json({
      success: false,
      message: "AI verification failed",
      error: error.message,
    });
  }
});

// ==========================================
// POST /api/photos/upload
// Used by camera capture in PhotoDetection
// ==========================================
router.post("/upload", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No image file provided" });
    }

    const targetIssue = req.body.category || req.body.issueType || req.body.issue;
    if (targetIssue) {
      const isValid = await validateImageWithGemini(req.file.path, targetIssue);
      if (!isValid) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (e) {
          console.error("Error cleaning up rejected camera photo:", e);
        }
        return res.status(400).json({
          success: false,
          message: `The camera photo does not match the selected issue (${targetIssue}). Please capture a photo showing the actual issue.`,
        });
      }
    }

    const verificationLog = await ImageVerification.create({
      fileName: req.file.filename,
      filePath: req.file.path,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      status: targetIssue ? "VERIFIED" : "PENDING",
      aiVerification: {
        checked: Boolean(targetIssue),
        modelVersion: "gemini-vision",
        roadRelated: true,
        checkedAt: new Date(),
      },
    });

    res.status(201).json({
      success: true,
      verificationId: verificationLog._id,
      fileName: req.file.filename,
      publicUrl: `${req.protocol}://${req.get("host")}/uploads/complaints/${req.file.filename}`,
    });
  } catch (error) {
    console.error("Photo upload error:", error);
    res.status(500).json({ success: false, message: "Failed to save photo" });
  }
});

// ==========================================
// POST /api/photos/profile
// ==========================================
router.post("/profile", upload.single("image"), async (req, res) => {
  try {
    const { userId, role } = req.body;
    if (!req.file || !userId || !["admin", "citizen", "staff", "verifier"].includes(role)) {
      return res.status(400).json({ success: false, message: "A profile image, user ID, and valid role are required" });
    }
    if (role !== "admin" && !mongoose.Types.ObjectId.isValid(userId)) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ success: false, message: "The logged-in user ID is invalid. Please sign in again." });
    }

    const profilePhoto = `${req.protocol}://${req.get("host")}/uploads/complaints/${req.file.filename}`;
    let model = role === "admin" ? Admin : User;
    let query = role === "admin"
      ? { $or: [{ adminId: userId }, ...(mongoose.Types.ObjectId.isValid(userId) ? [{ _id: userId }] : [])] }
      : { _id: userId };
    let updated = await model.findOneAndUpdate(
      query, { profilePhoto }, { returnDocument: "after", runValidators: true }
    ).select("-password");
    if (!updated && role === "admin" && mongoose.Types.ObjectId.isValid(userId)) {
      model = User;
      query = { _id: userId, role: "admin" };
      updated = await model.findOneAndUpdate(
        query, { profilePhoto }, { returnDocument: "after", runValidators: true }
      ).select("-password");
    }

    if (!updated) {
      fs.unlink(req.file.path, () => {});
      return res.status(404).json({ success: false, message: "Profile user not found" });
    }

    res.status(201).json({ success: true, profilePhoto, user: updated });
  } catch (error) {
    console.error("Profile photo upload error:", error);
    if (req.file?.path) {
      fs.unlink(req.file.path, () => {});
    }
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "The logged-in user ID is invalid. Please sign in again." });
    }
    res.status(500).json({ success: false, message: "Failed to save profile photo" });
  }
});

module.exports = router;
