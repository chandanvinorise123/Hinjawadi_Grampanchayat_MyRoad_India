const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const {
  createComplaint,
  getComplaintById,
  getMyComplaints,
  updateComplaint,
  deleteComplaint,
} = require("../controllers/complaintController");

const router = express.Router();

// ==========================================
// 1. CREATE UPLOADS DIRECTORY
// ==========================================
const uploadDir = path.join(__dirname, "../uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ==========================================
// 2. CONFIGURE IMAGE STORAGE
// ==========================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9) +
      path.extname(file.originalname);

    cb(null, uniqueName);
  },
});

// ==========================================
// 3. ALLOW IMAGE FILES ONLY
// ==========================================
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"), false);
  }
};

// ==========================================
// 4. MULTER CONFIGURATION
// ==========================================
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB per image
  },
});

// ==========================================
// 5. COMPLAINT ROUTES
// ==========================================

// POST /api/complaints
// Register a new complaint with optional images
router.post(
  "/",
  upload.array("images", 5),
  createComplaint
);

// GET /api/complaints/my/:citizenId
// Get all complaints submitted by a citizen
router.get(
  "/my/:citizenId",
  getMyComplaints
);

// GET /api/complaints/track/:complaintId
// Track a complaint using its complaint number or MongoDB ID
router.get(
  "/track/:complaintId",
  getComplaintById
);

// PUT /api/complaints/:id
// Update a complaint
router.put(
  "/:id",
  updateComplaint
);

// DELETE /api/complaints/:id
// Delete a complaint
router.delete(
  "/:id",
  deleteComplaint
);

module.exports = router;