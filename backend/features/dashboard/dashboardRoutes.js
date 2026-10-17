const express = require("express");
const mongoose = require("mongoose");
const Complaint = require("../../models/Complaint");
const Notification = require("../../models/Notification");
const User = require("../../models/user");
const Admin = require("../../models/Admin");

const router = express.Router();
const roles = new Set(["admin", "citizen", "staff", "verifier"]);

const isObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const toComplaintView = (complaint) => {
  const value = complaint.toObject ? complaint.toObject() : complaint;
  const inspection = value.inspection || {};
  const storedPhotos = Array.isArray(value.images) && value.images.length > 0
    ? value.images
    : Array.isArray(value.photos)
      ? value.photos
      : [];
  const images = storedPhotos
    .map((photo) => typeof photo === "string" ? photo : photo?.url)
    .filter((photo) => typeof photo === "string" && photo.trim());
  const locationValue = value.location;
  const locationObject =
    locationValue && typeof locationValue === "object" ? locationValue : {};
  const geoCoordinates = Array.isArray(locationObject.coordinates)
    ? locationObject.coordinates
    : [];
  const storedCoordinates = value.coordinates || {};
  const latitude = Number(
    storedCoordinates.latitude ??
    storedCoordinates.lat ??
    locationObject.latitude ??
    locationObject.lat ??
    geoCoordinates[1]
  );
  const longitude = Number(
    storedCoordinates.longitude ??
    storedCoordinates.lng ??
    locationObject.longitude ??
    locationObject.lng ??
    geoCoordinates[0]
  );

  return {
    ...value,
    id: String(value._id || value.id),
    issue: value.issue || value.issueType || "",
    issueType: value.issueType || value.issue || "",
    citizenContact: value.citizenMobile || value.citizenContact || "",
    location:
      typeof locationValue === "string"
        ? locationValue
        : locationObject.address || locationObject.name || "",
    coordinates: {
      ...storedCoordinates,
      ...(Number.isFinite(latitude) ? { latitude } : {}),
      ...(Number.isFinite(longitude) ? { longitude } : {}),
    },
    images,
    citizenPhotos: images,
    photos: {
      before: images[0] || "",
      site: inspection.sitePhoto || images[0] || "",
      after: inspection.completionPhoto || images[1] || "",
    },
    inspection: {
      ...inspection,
      inspectionDate: inspection.inspectionDate || "",
      completionDate: inspection.completionDate || "",
      remarks: inspection.remarks || "",
      actionTaken: inspection.actionTaken || "",
      sitePhoto: inspection.sitePhoto || "",
      completionPhoto: inspection.completionPhoto || "",
    },
    log: (value.statusHistory || []).map((entry) => ({
      text: entry.remarks || `Status changed to ${entry.status}`,
      time: entry.updatedAt,
    })),
  };
};

const getProfile = async (userId, role) => {
  if (!userId) return null;

  if (role === "admin") {
    const admin = await Admin.findOne({
      $or: [
        ...(isObjectId(userId) ? [{ _id: userId }] : []),
        { adminId: userId },
      ],
    }).select("-password");
    if (admin) return admin.toObject();
    if (isObjectId(userId)) {
      const userAdmin = await User.findOne({ _id: userId, role: "admin" }).select("-password").lean();
      if (userAdmin) return userAdmin;
    }
  }

  if (!isObjectId(userId)) return null;
  return User.findById(userId).select("-password").lean();
};

router.get("/:role", async (req, res) => {
  try {
    const { role } = req.params;
    const { userId } = req.query;

    if (!roles.has(role)) {
      return res.status(400).json({ success: false, message: "Invalid dashboard role" });
    }

    const profile = await getProfile(userId, role);
    const query = {};

    if (role === "citizen") {
      if (!userId || !isObjectId(userId)) {
        return res.status(400).json({ success: false, message: "A valid userId is required" });
      }
      query.citizenId = userId;
    } else if (role === "staff" || role === "verifier") {
      const identifiers = [profile?.name, profile?.staffId, profile?.verifierId, userId]
        .filter(Boolean)
        .map(String);
      const assignmentField = role === "staff" ? "assignedStaff" : "assignedVerifier";
      query.$or = [
        { [assignmentField]: { $in: identifiers } },
        role === "verifier"
          ? { status: { $in: ["Under Verification", "Resolved", "Verified"] } }
          : { status: { $in: ["Under Action", "Assigned", "In Progress"] } },
      ];
    }

    const [complaints, notifications] = await Promise.all([
      Complaint.find(query).sort({ createdAt: -1 }).limit(500).lean(),
      Notification.find({
        role,
        ...(userId && isObjectId(userId) ? { $or: [{ userId }, { userId: null }] } : {}),
      }).populate("complaintId", "complaintNumber category issueType location images").sort({ createdAt: -1 }).limit(50).lean(),
    ]);

    const statusCounts = complaints.reduce((counts, complaint) => {
      counts[complaint.status] = (counts[complaint.status] || 0) + 1;
      return counts;
    }, {});

    res.json({
      success: true,
      profile,
      complaints: complaints.map(toComplaintView),
      notifications: notifications.map((notification) => ({
        id: notification._id,
        type: notification.type,
        category: notification.type,
        title: notification.type,
        text: notification.message,
        message: notification.message,
        isRead: notification.isRead,
        time: notification.createdAt,
        complaintNumber: notification.complaintId?.complaintNumber || "",
        details: {
          category: notification.complaintId?.category || "",
          issue: notification.complaintId?.issueType || "",
          location: notification.complaintId?.location || "",
        },
        photos: {
          before: notification.complaintId?.images?.[0] || "",
          site: notification.complaintId?.images?.[0] || "",
          after: notification.complaintId?.images?.[1] || "",
        },
      })),
      stats: { total: complaints.length, statusCounts },
    });
  } catch (error) {
    console.error("Dashboard data error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch dashboard data" });
  }
});

router.patch("/complaints/:id", async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid complaint ID" });
    }

    const allowed = ["status", "priority", "assignedStaff", "assignedVerifier", "description", "location", "inspection"];
    const updates = Object.fromEntries(
      Object.entries(req.body || {}).filter(([key]) => allowed.includes(key))
    );
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: "No valid complaint updates were provided" });
    }
    if (updates.status && !Complaint.schema.path("status").enumValues.includes(updates.status)) {
      return res.status(400).json({ success: false, message: "Invalid complaint status" });
    }
    if (updates.priority && !Complaint.schema.path("priority").enumValues.includes(updates.priority)) {
      return res.status(400).json({ success: false, message: "Invalid complaint priority" });
    }
    if (updates.inspection && typeof updates.inspection !== "object") {
      return res.status(400).json({ success: false, message: "Invalid inspection data" });
    }
    if (
      ["assignedStaff", "assignedVerifier", "description", "location"].some(
        (field) => updates[field] !== undefined && typeof updates[field] !== "string"
      )
    ) {
      return res.status(400).json({ success: false, message: "Complaint text fields must be strings" });
    }
    if (updates.description && updates.description.length > 2000) {
      return res.status(400).json({ success: false, message: "Complaint description cannot exceed 2000 characters" });
    }
    if (
      updates.inspection &&
      Object.values(updates.inspection).some((value) => typeof value !== "string")
    ) {
      return res.status(400).json({ success: false, message: "Inspection fields must be strings" });
    }

    const complaintId = new mongoose.Types.ObjectId(req.params.id);
    const previousComplaint = await Complaint.collection.findOne({ _id: complaintId });

    if (!previousComplaint) {
      return res.status(404).json({ success: false, message: "Complaint not found" });
    }

    const previousStatus = previousComplaint.status;
    const previousAssignedStaff = previousComplaint.assignedStaff;
    const updateOperation = {
      $set: {
        ...updates,
        updatedAt: new Date(),
      },
    };
    if (updates.status && updates.status !== previousStatus) {
      updateOperation.$push = {
        statusHistory: {
          status: updates.status,
          remarks: typeof req.body.remarks === "string" ? req.body.remarks : "",
          updatedAt: new Date(),
        },
      };
    }
    await Complaint.collection.updateOne({ _id: complaintId }, updateOperation);
    const complaint = await Complaint.collection.findOne({ _id: complaintId });
    const complaintLabel = complaint.complaintNumber || String(complaint._id);

    const notifications = [];
    if (updates.assignedStaff && updates.assignedStaff !== previousAssignedStaff) {
      const staff = await User.findOne({ role: "staff", name: updates.assignedStaff }).select("_id");
      notifications.push({
        role: "staff",
        userId: staff?._id || null,
        complaintId: complaint._id,
        type: "Staff Assigned",
        message: `${complaintLabel} has been assigned to you for action.`,
      });
    }
    if (updates.status === "Under Verification") {
      notifications.push(
        {
          role: "admin",
          complaintId: complaint._id,
          type: "Work Completed",
          message: `${complaintLabel} has been submitted by staff for verification.`,
        },
        {
          role: "verifier",
          complaintId: complaint._id,
          type: "Work Completed",
          message: `${complaintLabel} is ready for physical verification.`,
        }
      );
    }
    if (["Resolved", "Closed"].includes(updates.status)) {
      notifications.push({
        role: "citizen",
        userId: complaint.citizenId,
        complaintId: complaint._id,
        type: "Complaint Resolved",
        message: `${complaintLabel} has been updated with the latest resolution result.`,
      });
    }
    if (notifications.length) await Notification.insertMany(notifications);
    res.json({ success: true, complaint: toComplaintView(complaint) });
  } catch (error) {
    console.error("Dashboard complaint update error:", error);
    res.status(500).json({ success: false, message: "Failed to update complaint" });
  }
});

router.patch("/notifications/:id/read", async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid notification ID" });
    }
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { returnDocument: "after" }
    );
    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }
    res.json({ success: true, notification });
  } catch (error) {
    console.error("Notification update error:", error);
    res.status(500).json({ success: false, message: "Failed to update notification" });
  }
});

module.exports = router;
