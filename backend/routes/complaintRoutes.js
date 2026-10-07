const express = require("express");

const router = express.Router();

// ⚠️ IMPORTANT: Update this path to match where your Complaint model is actually located
const Complaint = require("../models/Complaint"); 

// ✅ ADDED: Import the Notification model to trigger dynamic notifications
const Notification = require("../models/Notification"); 

/**
 * @route   GET /api/complaints/analytics
 * @desc    Get dynamic complaint analytics (Category, Location, Priority, Status, Date)
 * @access  Private (Admin)
 */
router.get("/analytics", async (req, res) => {
  try {
    // Use $facet to run all 5 aggregations in a SINGLE, optimized database query
    const aggregationResult = await Complaint.aggregate([
      {
        $facet: {
          // 1. Category-Wise
          categoryWise: [
            { $group: { _id: "$category", count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ],
          
          // 2. Location / Area-Wise
          locationWise: [
            { $group: { _id: "$location", count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ],
          
          // 3. Priority-Wise
          priorityWise: [
            { $group: { _id: "$priority", count: { $sum: 1 } } }
          ],
          
          // 4. Status-Wise
          statusWise: [
            { $group: { _id: "$status", count: { $sum: 1 } } }
          ],
          
          // 5. Date-Wise 
          dateWise: [
            { $group: { _id: "$date", count: { $sum: 1 } } },
            { $sort: { _id: 1 } } // Sort dates ascending
          ]
        }
      }
    ]);

    // Extract the first (and only) result from the $facet array
    const data = aggregationResult[0];

    // Format the data to match the frontend's expected structure: { label, count }
    const formattedAnalytics = {
      categoryWise: data.categoryWise.map(item => ({ 
        label: item._id || "Unknown", 
        count: item.count 
      })),
      locationWise: data.locationWise.map(item => ({ 
        label: item._id || "Unknown", 
        count: item.count 
      })),
      priorityWise: data.priorityWise.map(item => ({ 
        label: item._id || "Unknown", 
        count: item.count 
      })),
      statusWise: data.statusWise.map(item => ({ 
        label: item._id || "Unknown", 
        count: item.count 
      })),
      dateWise: data.dateWise.map(item => ({ 
        label: item._id || "Unknown", 
        count: item.count 
      }))
    };

    res.status(200).json({
      success: true,
      analytics: formattedAnalytics
    });

  } catch (err) {
    console.error("Analytics aggregation error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch analytics data from the database." 
    });
  }
});

// ==========================================
// ✅ ADDED: SCENARIO A - CREATE A NEW COMPLAINT
// ==========================================
router.post("/", async (req, res) => {
  try {
    const {
      complaintNumber,
      category,
      issue,
      location,
      citizenName,
      description,
      photos,
      priority,
      status,
      lat,
      lng,
      photoUrls,
    } = req.body;

    // 1. Create and save the complaint
    const newComplaint = new Complaint({
      complaintNumber,
      category,
      issue,
      location,
      citizenName,
      description,
      photos: photos || 0,
      priority: priority || "Normal",
      status: status || "New",
      lat,
      lng,
      photoUrls: photoUrls || [],
    });

    const savedComplaint = await newComplaint.save();

    // 2. ✅ TRIGGER NOTIFICATION: Notify Admin Dashboard
    await Notification.create({
      role: "admin",
      complaintId: savedComplaint._id,
      type: "Complaint Registered",
      message: `${savedComplaint.complaintNumber} registered by ${savedComplaint.citizenName}`,
    });

    res.status(201).json({
      success: true,
      message: "Complaint registered successfully",
      complaint: savedComplaint,
    });
  } catch (err) {
    console.error("Error creating complaint:", err);
    res.status(500).json({ success: false, message: "Failed to register complaint" });
  }
});

// ==========================================
// ✅ ADDED: SCENARIO B - UPDATE COMPLAINT (e.g., Work Completed)
// ==========================================
router.put("/:id", async (req, res) => {
  try {
    const complaintId = req.params.id;
    const updateData = req.body; // Contains fields like status, assignedStaff, etc.

    // 1. Find the old complaint to check its previous status
    const oldComplaint = await Complaint.findById(complaintId);
    if (!oldComplaint) {
      return res.status(404).json({ success: false, message: "Complaint not found" });
    }

    // 2. Update the complaint with new data
    const updatedComplaint = await Complaint.findByIdAndUpdate(
      complaintId,
      updateData,
      { new: true, runValidators: true }
    );

    // 3. ✅ TRIGGER NOTIFICATIONS based on status change
    const newStatus = updateData.status || oldComplaint.status;
    const oldStatus = oldComplaint.status;

    // Only trigger notifications if the status actually changed
    if (newStatus !== oldStatus) {
      const notificationsToCreate = [];

      // A. Notify Admin about major status changes
      if (newStatus === "Under Action" || newStatus === "Resolved" || newStatus === "Under Verification") {
        notificationsToCreate.push({
          role: "admin",
          complaintId: updatedComplaint._id,
          type: "Status Updated",
          message: `${updatedComplaint.complaintNumber} status changed to ${newStatus}`,
        });
      }

      // B. Notify Verifier when work is completed and ready for verification
      if (newStatus === "Under Verification" || newStatus === "Resolved") {
        notificationsToCreate.push({
          role: "verifier",
          complaintId: updatedComplaint._id,
          type: "Ready for Verification",
          message: `${updatedComplaint.complaintNumber} is ready for your verification.`,
        });
      }

      // C. Notify Citizen when their complaint is resolved
      if (newStatus === "Resolved") {
        notificationsToCreate.push({
          role: "citizen",
          complaintId: updatedComplaint._id,
          type: "Complaint Resolved",
          message: `Great news! Your complaint ${updatedComplaint.complaintNumber} has been resolved.`,
        });
      }

      // Save all triggered notifications to the database at once (efficient batch insert)
      if (notificationsToCreate.length > 0) {
        await Notification.insertMany(notificationsToCreate);
      }
    }

    res.json({
      success: true,
      message: "Complaint updated successfully",
      complaint: updatedComplaint,
    });
  } catch (err) {
    console.error("Error updating complaint:", err);
    res.status(500).json({ success: false, message: "Failed to update complaint" });
  }
});

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