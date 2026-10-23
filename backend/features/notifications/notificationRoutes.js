
const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const Notification = require("../../models/Notification");
const Complaint = require("../../models/Complaint");
const User = require("../../models/user");

// Helper function to format time (e.g., "2 hours ago")
const getTimeAgo = (date) => {
  const timestamp = new Date(date).getTime();
  if (!Number.isFinite(timestamp)) return "Time unavailable";
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));

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

    const query = req.query.role === "staff"
      ? { role: "staff", userId: req.query.userId }
      : req.query.role
        ? { role: req.query.role }
        : { role: "admin" };

    if (req.query.role === "staff" && !mongoose.Types.ObjectId.isValid(req.query.userId)) {
      return res.status(400).json({
        success: false,
        message: "A valid staff userId is required",
      });
    }

    const notifications = await Notification.find(query)
      .populate("complaintId", "complaintNumber status createdAt date")
      .populate("contactMessageId", "name email mobile subject message createdAt")
      .sort({ createdAt: -1 })
      .limit(50);

    const formatted = notifications.map((n) => ({
      id: String(n._id),
      type: n.type,
      text: n.message,
      time: getTimeAgo(n.createdAt),
      createdAt: n.createdAt || n.complaintId?.createdAt || null,
      complaintId: n.complaintId?._id ? String(n.complaintId._id) : null,
      complaintNumber: n.complaintId?.complaintNumber || "",
      complaintStatus: n.complaintId?.status || "",
      contactMessageId: n.contactMessageId?._id ? String(n.contactMessageId._id) : null,
      contactMessage: n.contactMessageId?._id
        ? {
            id: String(n.contactMessageId._id),
            name: n.contactMessageId.name,
            email: n.contactMessageId.email,
            mobile: n.contactMessageId.mobile,
            subject: n.contactMessageId.subject,
            message: n.contactMessageId.message,
            createdAt: n.contactMessageId.createdAt,
          }
        : null,
      recipientId: n.userId ? String(n.userId) : null,
      isRead: n.isRead,
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

    if (role === "staff" && !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "A valid staff userId is required for staff notifications",
      });
    }

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
        returnDocument: "after",
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
    const notificationsToCreate = [];

    const assignmentChanged =
      (updatedComplaint.assignedStaff || "") !== (oldComplaint.assignedStaff || "") ||
      (updatedComplaint.assignedStaffId || "") !== (oldComplaint.assignedStaffId || "");
    if (assignmentChanged && (updatedComplaint.assignedStaff || updatedComplaint.assignedStaffId)) {
      const staff = updatedComplaint.assignedStaffId && mongoose.Types.ObjectId.isValid(updatedComplaint.assignedStaffId)
        ? await User.findOne({ _id: updatedComplaint.assignedStaffId, role: "staff" }).select("_id")
        : await User.findOne({ role: "staff", name: updatedComplaint.assignedStaff }).select("_id");
      if (staff) {
        notificationsToCreate.push({
          role: "staff",
          userId: staff._id,
          complaintId: updatedComplaint._id,
          type: "Staff Assigned",
          message: `${updatedComplaint.complaintNumber} has been assigned to you for action.`,
        });
      }
    }

    // Only trigger notifications if the status actually changed
    if (newStatus !== oldStatus) {
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

      // B. Notify VERIFIER (when work is done and needs checking)
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

      // C. Notify CITIZEN (when their specific complaint is resolved)
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

    }

    if (notificationsToCreate.length > 0) {
      await Notification.insertMany(notificationsToCreate);
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