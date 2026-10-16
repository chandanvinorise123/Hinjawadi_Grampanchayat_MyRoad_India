const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const ImageVerification = require("../models/ImageVerification"); // ✅ ADDED: Import the model
const User = require("../models/user");
const Admin = require("../models/Admin");

// Ensure upload directory exists
const uploadDir = path.join(__dirname, "../uploads/complaints");
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
// Handles image upload, AI verification, and database logging
// ==========================================
router.post("/verify-image", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: "No image file provided" 
      });

    }

    const category = req.body.category || "unknown";
    const filePath = req.file.path;
    const latitude = Number(req.body.latitude);
    const longitude = Number(req.body.longitude);
    const accuracy = Number(req.body.accuracy);

    let aiResult;
    let verificationStatus = "PENDING";
    try {
      aiResult = await verifyWithGoogleVision(filePath, category);
    } catch (visionError) {
      console.error("Google Vision verification unavailable:", visionError.message);
      aiResult = {
        roadRelated: true,
        confidence: 0,
        detectedIssue: null,
        message: "Image uploaded successfully. Manual verification is required.",
        modelVersion: "manual-review",
      };
      verificationStatus = "MANUAL_REVIEW";
    }

    // 2. Determine Status based on confidence and relevance
    let status = verificationStatus;
    if (verificationStatus === "PENDING") {
      if (!aiResult.roadRelated) {
        status = "REJECTED";
      } else if (aiResult.confidence >= 80) {
        status = "VERIFIED";
      } else if (aiResult.confidence >= 50) {
        status = "MANUAL_REVIEW";
      } else {
        status = "REJECTED";
      }
    }

    // 3. ✅ SAVE TO DATABASE
    const verificationLog = new ImageVerification({
      fileName: req.file.filename,
      filePath: filePath,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      aiVerification: {
        checked: verificationStatus !== "MANUAL_REVIEW",
        roadRelated: aiResult.roadRelated,
        confidence: aiResult.confidence,
        detectedIssue: aiResult.detectedIssue,
        modelVersion: aiResult.modelVersion,
        checkedAt: new Date()
      },
      status: status
      ,
      location: Number.isFinite(latitude) && Number.isFinite(longitude)
        ? {
            latitude,
            longitude,
            accuracy: Number.isFinite(accuracy) ? accuracy : undefined,
          }
        : undefined,
    });

    await verificationLog.save();

    // 4. Return result to frontend
    res.json({
      success: true,
      roadRelated: aiResult.roadRelated,
      confidence: aiResult.confidence,
      detectedIssue: aiResult.detectedIssue,
      message: aiResult.message,
      fileName: req.file.filename,
      publicUrl: `${req.protocol}://${req.get("host")}/uploads/complaints/${req.file.filename}`,
      requiresReview: status === "MANUAL_REVIEW",
      verificationId: verificationLog._id, // ✅ Send ID back so frontend/backend can link it
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

const verifyWithGoogleVision = async (filePath, category) => {
  const apiKey = process.env.GOOGLE_VISION_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_VISION_API_KEY is not configured");
  }

  const image = fs.readFileSync(filePath).toString("base64");
  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [{
          image: { content: image },
          features: [{ type: "LABEL_DETECTION", maxResults: 20 }],
        }],
      }),
    }
  );
  const result = await response.json();
  if (!response.ok || result.responses?.[0]?.error) {
    throw new Error(result.responses?.[0]?.error?.message || "Google Vision verification failed");
  }

  const labels = result.responses?.[0]?.labelAnnotations || [];
  const categoryText = String(category || "").toLowerCase();
  const issueLabel = labels.find((label) => {
    const description = String(label.description || "").toLowerCase();
    return ["road", "pothole", "street", "bridge", "drain", "water", "traffic", "infrastructure"]
      .some((term) => description.includes(term)) || categoryText.includes(description);
  });
  const confidence = Math.round((issueLabel?.score || 0) * 100);
  const roadRelated = Boolean(issueLabel);

  return {
    roadRelated,
    confidence,
    detectedIssue: issueLabel?.description || null,
    message: roadRelated
      ? confidence >= 80
        ? "High confidence: infrastructure issue detected."
        : "Possible infrastructure issue detected. Manual review is required."
      : "Image does not appear to show a road or infrastructure issue.",
    modelVersion: "google-vision-label-detection",
  };
};

router.post("/upload", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No image file provided" });
    }
    const verificationLog = await ImageVerification.create({
      fileName: req.file.filename,
      filePath: req.file.path,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      status: "PENDING",
      aiVerification: { checked: false, modelVersion: "pending-manual-review" },
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