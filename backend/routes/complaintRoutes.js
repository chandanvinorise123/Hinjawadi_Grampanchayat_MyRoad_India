const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();

const Complaint = require("../models/Complaint");

const {
  createComplaint,
  getComplaintById,
  getMyComplaints,
  updateComplaint,
  deleteComplaint,
} = require("../controllers/complaintController");

// =====================================================
// ROUTE FILE LOAD CHECK
// =====================================================

console.log("✅ complaintRoutes.js loaded successfully");

// =====================================================
// UPLOAD DIRECTORY
// =====================================================

const uploadDir = path.join(__dirname, "../uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, {
    recursive: true,
  });
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
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(
      new Error("Only image files are allowed"),
      false
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

// =====================================================
// TEST ROUTE
// =====================================================

router.get("/test", (req, res) => {
  console.log(
    "✅ GET /api/complaints/test"
  );

  res.status(200).json({
    success: true,
    message: "Complaint routes are working",
  });
});

// =====================================================
// ANALYTICS
// =====================================================

router.get("/analytics", async (req, res) => {
  try {
    const aggregationResult =
      await Complaint.aggregate([
        {
          $facet: {
            categoryWise: [
              {
                $group: {
                  _id: "$category",
                  count: {
                    $sum: 1,
                  },
                },
              },
              {
                $sort: {
                  count: -1,
                },
              },
            ],

            locationWise: [
              {
                $group: {
                  _id: "$location",
                  count: {
                    $sum: 1,
                  },
                },
              },
              {
                $sort: {
                  count: -1,
                },
              },
            ],

            priorityWise: [
              {
                $group: {
                  _id: "$priority",
                  count: {
                    $sum: 1,
                  },
                },
              },
            ],

            statusWise: [
              {
                $group: {
                  _id: "$status",
                  count: {
                    $sum: 1,
                  },
                },
              },
            ],

            dateWise: [
              {
                $group: {
                  _id: "$date",
                  count: {
                    $sum: 1,
                  },
                },
              },
              {
                $sort: {
                  _id: 1,
                },
              },
            ],
          },
        },
      ]);

    const data =
      aggregationResult[0] || {
        categoryWise: [],
        locationWise: [],
        priorityWise: [],
        statusWise: [],
        dateWise: [],
      };

    const formattedAnalytics = {
      categoryWise:
        data.categoryWise.map(
          (item) => ({
            label:
              item._id || "Unknown",
            count: item.count,
          })
        ),

      locationWise:
        data.locationWise.map(
          (item) => ({
            label:
              item._id || "Unknown",
            count: item.count,
          })
        ),

      priorityWise:
        data.priorityWise.map(
          (item) => ({
            label:
              item._id || "Unknown",
            count: item.count,
          })
        ),

      statusWise:
        data.statusWise.map(
          (item) => ({
            label:
              item._id || "Unknown",
            count: item.count,
          })
        ),

      dateWise:
        data.dateWise.map(
          (item) => ({
            label:
              item._id || "Unknown",
            count: item.count,
          })
        ),
    };

    res.status(200).json({
      success: true,
      analytics: formattedAnalytics,
    });
  } catch (error) {
    console.error(
      "Analytics aggregation error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to fetch analytics data from the database.",
    });
  }
});

// =====================================================
// GET MY COMPLAINTS
// IMPORTANT: This is the route your frontend needs.
// =====================================================

router.get(
  "/my/:citizenId",
  (req, res, next) => {
    console.log(
      "======================================"
    );

    console.log(
      "✅ MY COMPLAINTS ROUTE HIT"
    );

    console.log(
      "Citizen ID:",
      req.params.citizenId
    );

    console.log(
      "======================================"
    );

    next();
  },
  getMyComplaints
);

// =====================================================
// GET SINGLE COMPLAINT / TRACK
// =====================================================

router.get(
  "/track/:complaintId",
  getComplaintById
);

// =====================================================
// CREATE COMPLAINT
// =====================================================

router.post(
  "/",
  upload.array("images", 5),
  createComplaint
);

// =====================================================
// UPDATE COMPLAINT
// =====================================================

router.put(
  "/:id",
  updateComplaint
);

// =====================================================
// DELETE COMPLAINT
// =====================================================

router.delete(
  "/:id",
  deleteComplaint
);

// =====================================================
// EXPORT ROUTER
// =====================================================

module.exports = router;