
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();

const Complaint = require("../../models/Complaint");

// IMPORTANT:
// The controller is in backend/controllers/complaintController.js
const {
  createComplaint,
  getComplaintById,
  getMyComplaints,
  updateComplaint,
  deleteComplaint,
} = require("./complaintController");

// =====================================================
// ROUTE FILE LOAD CHECK
// =====================================================
console.log("✅ routes/complaintRoutes.js loaded successfully");

// =====================================================
// UPLOAD DIRECTORY
// =====================================================
const uploadDir = path.join(__dirname, "../../uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// =====================================================
// MULTER CONFIGURATION
// =====================================================
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

const fileFilter = (req, file, cb) => {
  if (file.mimetype && file.mimetype.startsWith("image/")) {
    return cb(null, true);
  }

  return cb(new Error("Only image files are allowed"), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB per image
  },
});

// =====================================================
// GET ALL COMPLAINTS
// Used by the Admin Dashboard
// GET /api/complaints
// =====================================================
router.get("/", async (req, res) => {
  try {
    const complaints = await Complaint.find().sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: complaints.length,
      complaints,
    });
  } catch (error) {
    console.error("Fetch all complaints error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch complaints.",
    });
  }
});

// =====================================================
// TEST ROUTE
// GET /api/complaints/test
// =====================================================
router.get("/test", (req, res) => {
  console.log("✅ GET /api/complaints/test");

  return res.status(200).json({
    success: true,
    message: "Complaint routes are working.",
  });
});

// =====================================================
// COMPLAINT ANALYTICS
// GET /api/complaints/analytics
// =====================================================
router.get("/analytics", async (req, res) => {
  try {
    const aggregationResult = await Complaint.aggregate([
      {
        $facet: {
          categoryWise: [
            {
              $group: {
                _id: "$category",
                count: { $sum: 1 },
              },
            },
            { $sort: { count: -1 } },
          ],

          locationWise: [
            {
              $group: {
                _id: "$location",
                count: { $sum: 1 },
              },
            },
            { $sort: { count: -1 } },
          ],

          priorityWise: [
            {
              $group: {
                _id: "$priority",
                count: { $sum: 1 },
              },
            },
            { $sort: { count: -1 } },
          ],

          statusWise: [
            {
              $group: {
                _id: "$status",
                count: { $sum: 1 },
              },
            },
            { $sort: { count: -1 } },
          ],

          dateWise: [
            {
              $group: {
                _id: "$date",
                count: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
          ],
        },
      },
    ]);

    const data = aggregationResult[0] || {
      categoryWise: [],
      locationWise: [],
      priorityWise: [],
      statusWise: [],
      dateWise: [],
    };

    const formatLabel = (value) => {
      if (value === null || value === undefined || value === "") {
        return "Unknown";
      }

      if (typeof value === "object") {
        return (
          value.address ||
          value.name ||
          value.label ||
          "Unknown"
        );
      }

      return String(value);
    };

    const formattedAnalytics = {
      categoryWise: data.categoryWise.map((item) => ({
        label: formatLabel(item._id),
        count: item.count,
      })),

      locationWise: data.locationWise.map((item) => ({
        label: formatLabel(item._id),
        count: item.count,
      })),

      priorityWise: data.priorityWise.map((item) => ({
        label: formatLabel(item._id),
        count: item.count,
      })),

      statusWise: data.statusWise.map((item) => ({
        label: formatLabel(item._id),
        count: item.count,
      })),

      dateWise: data.dateWise.map((item) => ({
        label: formatLabel(item._id),
        count: item.count,
      })),
    };

    return res.status(200).json({
      success: true,
      analytics: formattedAnalytics,
    });
  } catch (error) {
    console.error("Analytics aggregation error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch complaint analytics.",
    });
  }
});

// =====================================================
// GET COMPLAINTS FOR A CITIZEN
// GET /api/complaints/my/:citizenId
// =====================================================
router.get("/my/:citizenId", getMyComplaints);

// =====================================================
// TRACK / GET SINGLE COMPLAINT
// GET /api/complaints/track/:complaintId
// =====================================================
router.get("/track/:complaintId", getComplaintById);

// =====================================================
// CREATE A COMPLAINT
// POST /api/complaints
// Expects image files in the "images" field
// =====================================================
router.post("/", upload.array("images", 5), createComplaint);

// =====================================================
// UPDATE A COMPLAINT
// PUT /api/complaints/:id
// =====================================================
router.put("/:id", updateComplaint);

// =====================================================
// DELETE A COMPLAINT
// DELETE /api/complaints/:id
// =====================================================
router.delete("/:id", deleteComplaint);

// =====================================================
// EXPORT EXPRESS ROUTER
// REQUIRED: server.js must receive a router function
// =====================================================
module.exports = router;
