
const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const Notification = require("../../models/Notification");
const Complaint = require("../../models/Complaint");
const User = require("../../models/user");
const { createNotifications } = require("../../services/notificationService");
const requirePushAuth = require("../../middleware/requirePushAuth");

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
      ? { role: "staff", $or: [{ userId: req.query.userId }, { userId: null }] }
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
router.post("/", requirePushAuth, async (req, res) => {
  try {
    const {
      userId,
      role,
      complaintId,
      type,
      message,
    } = req.body;

    if (req.pushUser.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only administrators can create notifications",
      });
    }

    if (!["admin", "staff", "verifier", "citizen"].includes(role) || !type || !message) {
      return res.status(400).json({
        success: false,
        message: "A valid role, notification type, and message are required",
      });
    }

    if (role !== "admin" && !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "A valid recipient userId is required for this role",
      });
    }
    if (userId) {
      const recipient = await User.findById(userId).select("role");
      if (!recipient || recipient.role !== role) {
        return res.status(400).json({
          success: false,
          message: "Recipient does not match the requested notification role",
        });
      }
    }

    const [newNotif] = await createNotifications([{
      userId,
      role,
      complaintId,
      type,
      message,
    }]);

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
    const newStatus = updatedComplaint.status;
    const oldStatus = oldComplaint.status;
    const notificationsToCreate = [];
    const complaintLabel = updatedComplaint.complaintNumber || String(updatedComplaint._id);
    const addNotification = (role, userId, type, message) => {
      notificationsToCreate.push({
        role,
        ...(userId ? { userId } : {}),
        complaintId: updatedComplaint._id,
        type,
        message,
      });
    };
    const findAssignedUser = async (role, id, name) => {
      if (id && mongoose.Types.ObjectId.isValid(id)) {
        return User.findOne({ _id: id, role }).select("_id");
      }
      if (name) return User.findOne({ role, name }).select("_id");
      return null;
    };
    const staffAssignmentChanged =
      String(updatedComplaint.assignedStaffId || "") !== String(oldComplaint.assignedStaffId || "") ||
      String(updatedComplaint.assignedStaff || "") !== String(oldComplaint.assignedStaff || "");
    const verifierAssignmentChanged =
      String(updatedComplaint.assignedVerifierId || "") !== String(oldComplaint.assignedVerifierId || "") ||
      String(updatedComplaint.assignedVerifier || "") !== String(oldComplaint.assignedVerifier || "");
    const staff = await findAssignedUser("staff", updatedComplaint.assignedStaffId, updatedComplaint.assignedStaff);
    const verifier = await findAssignedUser("verifier", updatedComplaint.assignedVerifierId, updatedComplaint.assignedVerifier);
    const previousStaff = await findAssignedUser("staff", oldComplaint.assignedStaffId, oldComplaint.assignedStaff);
    const previousVerifier = await findAssignedUser("verifier", oldComplaint.assignedVerifierId, oldComplaint.assignedVerifier);
    const staffReassigned = Boolean(
      previousStaff && staff && String(previousStaff._id) !== String(staff._id)
    );
    const verifierReassigned = Boolean(
      previousVerifier && verifier && String(previousVerifier._id) !== String(verifier._id)
    );
    const remarks = typeof updateData.remarks === "string" && updateData.remarks.trim()
      ? ` Remarks: ${updateData.remarks.trim()}`
      : "";

    if (staffAssignmentChanged) {
      if (previousStaff && (staffReassigned || !staff)) {
        addNotification(
          "staff",
          previousStaff._id,
          staffReassigned ? "Complaint Reassigned" : "Complaint Assignment Changed",
          staffReassigned
            ? `${complaintLabel} was reassigned to another staff member.`
            : `${complaintLabel} is no longer assigned to you.`
        );
      }
      if (staff) {
        addNotification(
          "staff",
          staff._id,
          staffReassigned
            ? "Complaint Reassigned"
            : previousStaff
              ? "Complaint Assignment Changed"
              : "New Complaint Assigned",
          `${complaintLabel} has been ${staffReassigned ? "reassigned" : "assigned"} to you.${remarks}`
        );
      }
      addNotification(
        "admin",
        null,
        staffReassigned
          ? "Complaint Reassigned"
          : staff
            ? "Complaint Assigned"
            : "Complaint Assignment Changed",
        `${complaintLabel} staff assignment was changed.`
      );
      if (updatedComplaint.citizenId) {
        addNotification("citizen", updatedComplaint.citizenId, staffReassigned ? "Complaint Reassigned" : "Complaint Assigned", `${complaintLabel} staff assignment was changed.`);
      }
    }

    if (verifierAssignmentChanged) {
      if (previousVerifier && (verifierReassigned || !verifier)) {
        addNotification(
          "verifier",
          previousVerifier._id,
          verifierReassigned ? "Complaint Reassigned" : "Complaint Assignment Changed",
          verifierReassigned
            ? `${complaintLabel} was reassigned to another verifier.`
            : `${complaintLabel} is no longer assigned to you.`
        );
      }
      if (verifier) {
        addNotification(
          "verifier",
          verifier._id,
          verifierReassigned
            ? "Complaint Reassigned"
            : previousVerifier
              ? "Complaint Assignment Changed"
              : "New Complaint Assigned",
          `${complaintLabel} has been assigned to you for verification.`
        );
      }
      addNotification("admin", null, verifierReassigned ? "Complaint Reassigned" : "Complaint Assignment Changed", `${complaintLabel} verifier assignment was changed.`);
    }

    if (updatedComplaint.priority !== oldComplaint.priority) {
      addNotification("admin", null, "Complaint Priority Changed", `${complaintLabel} priority changed to ${updatedComplaint.priority}.`);
      if (staff) addNotification("staff", staff._id, "Complaint Priority Changed", `${complaintLabel} priority changed to ${updatedComplaint.priority}.`);
      if (verifier) addNotification("verifier", verifier._id, "Complaint Priority Changed", `${complaintLabel} priority changed to ${updatedComplaint.priority}.`);
      if (updatedComplaint.priority === "Critical") {
        addNotification("admin", null, "Critical Complaint Alert", `${complaintLabel} is now marked Critical.`);
      }
    }

    if (newStatus !== oldStatus) {
      const summary = `${complaintLabel}: status changed from ${oldStatus} to ${newStatus}.${remarks}`;
      const submitted = ["Under Verification", "Under Review", "Submitted"].includes(newStatus);
      if (submitted) {
        const reverification = oldStatus === "Rejected";
        addNotification("admin", null, reverification ? "Reverification Requested" : "Complaint Submitted for Verification", summary);
        addNotification("verifier", verifier?._id, reverification ? "Reverification Requested" : "Work Submitted for Verification", `${complaintLabel} is ready for verification.`);
        if (staff) addNotification("staff", staff._id, reverification ? "Complaint Reverification Requested" : "Complaint Verification Pending", `${complaintLabel} is waiting for verification.`);
        if (updatedComplaint.citizenId) addNotification("citizen", updatedComplaint.citizenId, reverification ? "Complaint Reverification" : "Complaint Submitted for Verification", summary);
      } else if (newStatus === "Rejected") {
        addNotification("admin", null, "Complaint Verification Rejected", summary);
        addNotification("admin", null, "Complaint Rework Requested", `${complaintLabel} requires corrective work.${remarks}`);
        addNotification("verifier", verifier?._id, "Complaint Verification Rejected", summary);
        if (staff) addNotification("staff", staff._id, "Complaint Work Rejected", `${complaintLabel} work was rejected during verification.${remarks}`);
        if (staff) addNotification("staff", staff._id, "Rework Requested", `${complaintLabel} was rejected and needs correction.${remarks}`);
        if (updatedComplaint.citizenId) addNotification("citizen", updatedComplaint.citizenId, "Complaint Rejected", summary);
      } else if (newStatus === "Verified") {
        addNotification("admin", null, "Complaint Verification Accepted", summary);
        addNotification("verifier", verifier?._id, "Complaint Verification Accepted", summary);
        if (staff) addNotification("staff", staff._id, "Complaint Work Approved", summary);
        if (updatedComplaint.citizenId) addNotification("citizen", updatedComplaint.citizenId, "Complaint Verification Accepted", summary);
      } else if (["Resolved", "Closed"].includes(newStatus)) {
        addNotification("admin", null, "Complaint Resolved", summary);
        addNotification("verifier", verifier?._id, "Complaint Resolved", summary);
        if (staff) addNotification("staff", staff._id, "Complaint Resolved", summary);
        if (updatedComplaint.citizenId) addNotification("citizen", updatedComplaint.citizenId, "Complaint Resolved", summary);
      } else {
        const accepted = ["Under Action", "Assigned"].includes(newStatus);
        const type = accepted ? "Complaint Accepted" : "Complaint Status Changed";
        addNotification("admin", null, type, summary);
        addNotification("verifier", verifier?._id, type, summary);
        if (staff) addNotification("staff", staff._id, accepted ? "Complaint Work Started" : type, summary);
        if (updatedComplaint.citizenId) addNotification("citizen", updatedComplaint.citizenId, type, summary);
      }
    } else if (JSON.stringify(updatedComplaint.inspection || {}) !== JSON.stringify(oldComplaint.inspection || {})) {
      const workStarted = !oldComplaint.inspection?.actionTaken && updatedComplaint.inspection?.actionTaken;
      const type = workStarted ? "Complaint Work Started" : "Complaint Work Updated";
      const message = `${complaintLabel} work details were ${workStarted ? "started" : "updated"}.`;
      addNotification("admin", null, type, message);
      addNotification("verifier", verifier?._id, type, message);
      if (staff) addNotification("staff", staff._id, type, message);
      if (updatedComplaint.citizenId) addNotification("citizen", updatedComplaint.citizenId, type, message);
    }

    await createNotifications(notificationsToCreate, { broadcast: true });

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