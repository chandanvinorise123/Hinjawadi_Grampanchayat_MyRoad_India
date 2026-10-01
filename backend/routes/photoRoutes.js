const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const ImageVerification = require("../models/ImageVerification"); // ✅ ADDED: Import the model

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

    // 1. Run AI Verification (Mock or Real)
    const aiResult = await mockAIVerification(filePath, category);

    // 2. Determine Status based on confidence and relevance
    let status = "PENDING";
    if (!aiResult.roadRelated) {
      status = "REJECTED";
    } else if (aiResult.confidence >= 80) {
      status = "VERIFIED";
    } else if (aiResult.confidence >= 50) {
      status = "MANUAL_REVIEW";
    } else {
      status = "REJECTED"; // Low confidence
    }

    // 3. ✅ SAVE TO DATABASE
    const verificationLog = new ImageVerification({
      fileName: req.file.filename,
      filePath: filePath,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      aiVerification: {
        checked: true,
        roadRelated: aiResult.roadRelated,
        confidence: aiResult.confidence,
        detectedIssue: aiResult.detectedIssue,
        modelVersion: aiResult.modelVersion || "mock-v1.0",
        checkedAt: new Date()
      },
      status: status
      // Note: imageHash and location can be added here later when you implement Steps 10 & 11
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

// ==========================================
// MOCK AI VERIFICATION FUNCTION
// Replace this with your actual AI service integration
// ==========================================
const mockAIVerification = async (filePath, category) => {
  return new Promise((resolve) => {
    // Simulate AI processing delay (1.5 seconds)
    setTimeout(() => {
      const issues = ["pothole", "damaged_road", "waterlogging", "streetlight", "drainage", "bridge_damage"];
      
      // Simulate random AI detection for testing purposes
      const randomConfidence = Math.random() * 100;
      const isRoadRelated = randomConfidence > 40; // 60% chance it's road-related in mock
      const detectedIssue = isRoadRelated ? issues[Math.floor(Math.random() * issues.length)] : null;

      let message = "";
      if (!isRoadRelated) {
        message = "Image does not appear to be a road or infrastructure issue. Please upload a relevant photo.";
      } else if (randomConfidence >= 80) {
        message = "High confidence: Road issue detected successfully.";
      } else if (randomConfidence >= 50) {
        message = "Medium confidence: Possible road issue. Flagged for manual verifier review.";
      } else {
        message = "Low confidence: Image is unclear. Please upload a clearer photo.";
      }

      resolve({
        roadRelated: isRoadRelated,
        confidence: randomConfidence,
        detectedIssue: detectedIssue,
        message: message,
        modelVersion: "mock-v1.0",
      });
    }, 1500);
  });
};

module.exports = router;