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
  const citizenProfile = value.citizenId && typeof value.citizenId === "object"
    ? value.citizenId
    : null;
  const storedPhotos = Array.isArray(value.images) && value.images.length > 0
    ? value.images
    : Array.isArray(value.photos)
      ? value.photos
      : [];
  const images = storedPhotos
    .map((photo) => typeof photo === "string" ? photo : photo?.url || photo?.path || photo?.filePath)
    .filter((photo) => typeof photo === "string" && photo.trim());
  const locationValue = value.location;
  const locationObject =
    locationValue && typeof locationValue === "object" ? locationValue : {};
  const geoCoordinates = Array.isArray(locationObject.coordinates)
    ? locationObject.coordinates
    : [];
  const storedCoordinates = value.coordinates || {};
  const readCoordinate = (...values) => {
    const valueToRead = values.find((coordinate) => coordinate !== null && coordinate !== undefined && coordinate !== "");
    if (valueToRead === undefined) return NaN;
    const coordinate = Number(valueToRead);
    return Number.isFinite(coordinate) ? coordinate : NaN;
  };
  const latitude = readCoordinate(
    storedCoordinates.latitude,
    storedCoordinates.lat,
    locationObject.latitude,
    locationObject.lat,
    geoCoordinates[1]
  );
  const longitude = readCoordinate(
    storedCoordinates.longitude,
    storedCoordinates.lng,
    locationObject.longitude,
    locationObject.lng,
    geoCoordinates[0]
  );
  const statusLog = (Array.isArray(value.statusHistory) ? value.statusHistory : []).map((entry) => ({
    actor: entry.actor && entry.actor !== "Dashboard" ? entry.actor : (
      ["verified", "rejected", "resolved", "closed"].includes(String(entry.status || "").toLowerCase()) ||
      entry.remarks
        ? "Verifier"
        : String(entry.status || "").toLowerCase() === "under verification"
          ? "Staff"
          : "Dashboard"
    ),
    text: entry.remarks ? `${entry.status}: ${entry.remarks}` : `Status changed to ${entry.status}`,
    time: entry.updatedAt,
  }));
  const activityLog = (Array.isArray(value.activityLog) ? value.activityLog : []).map((entry) => ({
    actor: entry.actor || "Dashboard",
    text: entry.message || "",
    time: entry.createdAt,
  }));
  const log = [...statusLog, ...activityLog]
    .filter((entry) => entry.text)
    .sort((left, right) => new Date(left.time || 0) - new Date(right.time || 0));

  return {
    ...value,
    id: String(value._id || value.id),
    citizenId: citizenProfile ? String(citizenProfile._id) : value.citizenId,
    citizenProfile: citizenProfile
      ? {
          name: citizenProfile.name || "",
          email: citizenProfile.email || "",
          mobile: citizenProfile.mobile || citizenProfile.contact || "",
        }
      : null,
    citizenName: value.citizenName || citizenProfile?.name || "",
    issue: value.issue || value.issueType || "",
    issueType: value.issueType || value.issue || "",
    citizenMobile: value.citizenMobile || citizenProfile?.mobile || citizenProfile?.contact || "",
    citizenContact: value.citizenMobile || value.citizenContact || citizenProfile?.mobile || citizenProfile?.contact || "",
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
    log,
    activityLog: Array.isArray(value.activityLog) ? value.activityLog : [],
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

    if (["citizen", "staff", "verifier"].includes(role) && (!userId || !isObjectId(userId))) {
      return res.status(400).json({ success: false, message: "A valid userId is required" });
    }

    const profile = await getProfile(userId, role);
    const query = {};

    if (role === "citizen") {
      query.citizenId = userId;
    } else if (role === "verifier") {
      const identifiers = [profile?.name, profile?.staffId, profile?.verifierId, userId]
        .filter(Boolean)
        .map(String);
      query.$or = [
        { assignedVerifier: { $in: identifiers } },
        { status: { $in: ["New", "Pending", "Submitted", "Under Review", "Under Verification", "Assigned", "Under Action", "In Progress", "Verified", "Resolved", "Rejected", "Closed"] } },
      ];
    }

    const [complaints, notifications] = await Promise.all([
      Complaint.find(query)
        .populate("citizenId", "name email mobile contact")
        .sort({ createdAt: -1 })
        .lean(),
      Notification.find({
        role,
        ...(userId && isObjectId(userId)
          ? role === "citizen"
            ? { $or: [{ userId }, { userId: null, complaintId: null }] }
            : { $or: [{ userId }, { userId: null }] }
          : {}),
      }).populate({
        path: "complaintId",
        select: "complaintNumber citizenId citizenName citizenMobile category issueType description location landmark coordinates images photos inspection assignedStaff assignedVerifier department priority status statusHistory activityLog verifierRemarks previousRemarks remarks createdAt updatedAt",
        populate: { path: "citizenId", select: "name email mobile contact" },
      }).sort({ createdAt: -1 }).lean(),
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
        complaint: notification.complaintId
          ? toComplaintView(notification.complaintId)
          : null,
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
    const actorRole = ["admin", "staff", "verifier"].includes(req.body.actorRole)
      ? req.body.actorRole
      : null;
    const actorName = actorRole
      ? actorRole.charAt(0).toUpperCase() + actorRole.slice(1)
      : null;
    const verificationDateTime = req.body.verificationDateTime;
    if (verificationDateTime !== undefined && typeof verificationDateTime !== "string") {
      return res.status(400).json({ success: false, message: "Verification date and time must be a string" });
    }
    const statusUpdatedAt = verificationDateTime ? new Date(verificationDateTime) : new Date();
    if (verificationDateTime && Number.isNaN(statusUpdatedAt.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid verification date and time" });
    }
    const updateOperation = {
      $set: {
        ...updates,
        updatedAt: new Date(),
      },
    };
    const activityEntries = [];
    const sameValue = (left, right) => JSON.stringify(left) === JSON.stringify(right);

    if (updates.assignedStaff !== undefined && updates.assignedStaff !== previousComplaint.assignedStaff) {
      activityEntries.push({
        actor: actorName || "Admin",
        message: updates.assignedStaff
          ? `Assigned staff member ${updates.assignedStaff}`
          : "Removed staff assignment",
        createdAt: new Date(),
      });
    }
    if (updates.assignedVerifier !== undefined && updates.assignedVerifier !== previousComplaint.assignedVerifier) {
      activityEntries.push({
        actor: actorName || "Admin",
        message: updates.assignedVerifier
          ? `Assigned verifier ${updates.assignedVerifier}`
          : "Removed verifier assignment",
        createdAt: new Date(),
      });
    }
    if (updates.priority !== undefined && updates.priority !== previousComplaint.priority) {
      activityEntries.push({
        actor: actorName || "Admin",
        message: `Priority changed from ${previousComplaint.priority || "Normal"} to ${updates.priority}`,
        createdAt: new Date(),
      });
    }
    if (updates.inspection && !sameValue(updates.inspection, previousComplaint.inspection || {})) {
      const workDescription = updates.inspection.actionTaken || updates.inspection.remarks;
      activityEntries.push({
        actor: actorName || "Staff",
        message: workDescription
          ? `Updated inspection/work record: ${workDescription}`
          : "Updated inspection/work evidence",
        createdAt: new Date(),
      });
    }
    if (
      updates.status &&
      (updates.status !== previousStatus || typeof req.body.remarks === "string")
    ) {
      updateOperation.$push = {
        statusHistory: {
          status: updates.status,
          actor: actorName || "Dashboard",
          remarks: typeof req.body.remarks === "string" ? req.body.remarks : "",
          updatedAt: statusUpdatedAt,
        },
      };
    }
    if (activityEntries.length) {
      updateOperation.$push = {
        ...updateOperation.$push,
        activityLog: { $each: activityEntries },
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
    if (
      updates.assignedVerifier &&
      updates.assignedVerifier !== previousComplaint.assignedVerifier
    ) {
      const verifier = await User.findOne({ role: "verifier", name: updates.assignedVerifier }).select("_id");
      notifications.push({
        role: "verifier",
        userId: verifier?._id || null,
        complaintId: complaint._id,
        type: "Verifier Assigned",
        message: `${complaintLabel} has been assigned to you for verification.`,
      });
    }
    if (
      updates.priority !== undefined &&
      updates.priority !== previousComplaint.priority &&
      complaint.assignedStaff
    ) {
      const staff = await User.findOne({ role: "staff", name: complaint.assignedStaff }).select("_id");
      notifications.push({
        role: "staff",
        userId: staff?._id || null,
        complaintId: complaint._id,
        type: "Priority Updated",
        message: `${complaintLabel} priority was changed to ${updates.priority}.`,
      });
    }
    if (updates.status === "Under Verification" && updates.status !== previousStatus) {
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
    if (updates.status === "Rejected" && updates.status !== previousStatus && complaint.assignedStaff) {
      const staff = await User.findOne({ role: "staff", name: complaint.assignedStaff }).select("_id");
      notifications.push({
        role: "staff",
        userId: staff?._id || null,
        complaintId: complaint._id,
        type: "Verification Rejected",
        message: `${complaintLabel} was rejected during verification and requires further action.`,
      });
    }
    if (updates.status === "Verified" && updates.status !== previousStatus && complaint.assignedStaff) {
      const staff = await User.findOne({ role: "staff", name: complaint.assignedStaff }).select("_id");
      notifications.push({
        role: "staff",
        userId: staff?._id || null,
        complaintId: complaint._id,
        type: "Verification Approved",
        message: `${complaintLabel} passed verifier review.`,
      });
    }
    if (
      ["Resolved", "Closed"].includes(updates.status) &&
      updates.status !== previousStatus &&
      complaint.assignedStaff
    ) {
      const staff = await User.findOne({ role: "staff", name: complaint.assignedStaff }).select("_id");
      notifications.push({
        role: "staff",
        userId: staff?._id || null,
        complaintId: complaint._id,
        type: "Complaint Resolved",
        message: `${complaintLabel} was marked ${updates.status} after verification.`,
      });
    }
    const citizenStatusMessages = {
      "Under Action": "Work has been assigned and is in progress.",
      "Under Verification": "Work has been submitted and is awaiting verification.",
      Verified: "The completed work has been verified.",
      Rejected: "The submitted work needs additional action.",
      Resolved: "The complaint has been resolved.",
      Closed: "The complaint has been verified and closed.",
    };
    if (
      updates.status &&
      updates.status !== previousStatus &&
      citizenStatusMessages[updates.status] &&
      complaint.citizenId
    ) {
      notifications.push({
        role: "citizen",
        userId: complaint.citizenId,
        complaintId: complaint._id,
        type: "Complaint Status Updated",
        message: `${complaintLabel}: ${citizenStatusMessages[updates.status]}`,
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
