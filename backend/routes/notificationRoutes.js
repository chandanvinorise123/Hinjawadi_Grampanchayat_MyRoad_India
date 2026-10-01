
const express = require("express");
const router = express.Router();

const Notification = require("../models/Notification");
const Complaint = require("../models/Complaint");

// Helper function to format time (e.g., "2 hours ago")
const getTimeAgo = (date) => {
  const seconds = Math.floor(
    (new Date() - new Date(date)) / 1000
  );

  if (seconds < 60) return "Just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
};

// GET /api/notifications - Fetch notifications
router.get("/", async (req, res) => {
  try {
    // For Admin Dashboard: fetch all 'admin' notifications,
    // newest first
    // Later, you can pass ?role=citizen&userId=xyz
    // for other dashboards

    const query = req.query.role
      ? { role: req.query.role }
      : { role: "admin" };

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(50);

    // Format to match your frontend's expected structure
    const formatted = notifications.map((n) => ({
      id: n._id,
      type: n.type,
      text: n.message,
      time: getTimeAgo(n.createdAt),
    }));

    res.json({
      success: true,
      notifications: formatted,
    });
  } catch (err) {
    console.error("Notification fetch error:", err);

    res.status(500).json({
      success: false,
      message: "Failed to fetch notifications",
    });
  }
});

// POST /api/notifications - Create a new notification
// (Internal API)
router.post("/", async (req, res) => {
  try {
    const {
      userId,
      role,
      complaintId,
      type,
      message,
    } = req.body;

    const newNotif = new Notification({
      userId,
      role,
      complaintId,
      type,
      message,
    });

    await newNotif.save();

    res.status(201).json({
      success: true,
      notification: newNotif,
    });
  } catch (err) {
    console.error("Notification create error:", err);

    res.status(500).json({
      success: false,
      message: "Failed to create notifications",
    });
  }
});

// ==========================================
// UPDATE COMPLAINT
// (Triggers Notifications for All 4 Dashboards)
// ==========================================

router.put("/:id", async (req, res) => {
  try {
    const complaintId = req.params.id;
    const updateData = req.body;

    // 1. Find the old complaint to check its previous status
    const oldComplaint = await Complaint.findById(complaintId);

    if (!oldComplaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }

    // 2. Update the complaint with new data
    const updatedComplaint = await Complaint.findByIdAndUpdate(
      complaintId,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedComplaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }

    // 3. Trigger notifications based on status change
    const newStatus =
      updateData.status || oldComplaint.status;

    const oldStatus = oldComplaint.status;

    // Only trigger notifications if the status actually changed
    if (newStatus !== oldStatus) {
      const notificationsToCreate = [];

      // A. Notify ADMIN (for all major status changes)
      if (
        [
          "Under Action",
          "Under Verification",
          "Resolved",
        ].includes(newStatus)
      ) {
        notificationsToCreate.push({
          role: "admin",
          complaintId: updatedComplaint._id,
          type: "Status Updated",
          message: `${updatedComplaint.complaintNumber} status changed to ${newStatus}`,
        });
      }

      // B. Notify STAFF (when assigned or work starts)
      if (
        newStatus === "Under Action" &&
        updateData.assignedStaff
      ) {
        notificationsToCreate.push({
          role: "staff",
          complaintId: updatedComplaint._id,
          type: "Complaint Assigned",
          message: `You have been assigned to work on ${updatedComplaint.complaintNumber}.`,
        });
      }

      // C. Notify VERIFIER (when work is done and needs checking)
      if (
        newStatus === "Under Verification" ||
        newStatus === "Resolved"
      ) {
        notificationsToCreate.push({
          role: "verifier",
          complaintId: updatedComplaint._id,
          type: "Ready for Verification",
          message: `${updatedComplaint.complaintNumber} is ready for your verification.`,
        });
      }

      // D. Notify CITIZEN (when their specific complaint is resolved)
      if (newStatus === "Resolved") {
        notificationsToCreate.push({
          // If your Complaint model has a 'citizenId' field,
          // use it here:
          // userId: updatedComplaint.citizenId,

          role: "citizen",
          complaintId: updatedComplaint._id,
          type: "Complaint Resolved",
          message: `Great news! Your complaint ${updatedComplaint.complaintNumber} has been resolved.`,
        });
      }

      // Save all triggered notifications to the database
      // at once (efficient batch insert)
      if (notificationsToCreate.length > 0) {
        await Notification.insertMany(
          notificationsToCreate
        );
      }
    }

    res.json({
      success: true,
      message: "Complaint updated successfully",
      complaint: updatedComplaint,
    });
  } catch (err) {
    console.error("Error updating complaint:", err);

    res.status(500).json({
      success: false,
      message: "Failed to update complaint",
    });
  }
});

module.exports = router;