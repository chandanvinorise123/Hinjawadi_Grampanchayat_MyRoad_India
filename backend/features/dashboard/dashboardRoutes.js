const express = require("express");
const mongoose = require("mongoose");
const Complaint = require("../../models/Complaint");
const Notification = require("../../models/Notification");
const User = require("../../models/user");
const Admin = require("../../models/Admin");

const router = express.Router();
const roles = new Set(["admin", "citizen", "staff", "verifier"]);

const isObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const findAssignedUser = async (role, identifier) => {
  if (!identifier) return null;
  if (isObjectId(identifier)) {
    const userById = await User.findOne({ _id: identifier, role }).select("_id");
    if (userById) return userById;
  }
  const fields = role === "staff" ? ["name", "staffId"] : ["name", "verifierId"];
  const alternatives = fields.map((field) => ({ [field]: identifier }));
  const matches = await User.find({ role, $or: alternatives }).select("_id").limit(2);
  return matches.length === 1 ? matches[0] : null;
};

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
      after: inspection.completionPhoto || "",
      verification: inspection.verificationPhoto || "",
    },
    inspection: {
      ...inspection,
      inspectionDate: inspection.inspectionDate || "",
      completionDate: inspection.completionDate || "",
      remarks: inspection.remarks || "",
      actionTaken: inspection.actionTaken || "",
      sitePhoto: inspection.sitePhoto || "",
      completionPhoto: inspection.completionPhoto || "",
      verificationPhoto: inspection.verificationPhoto || "",
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

router.get("/staff-assigned-complaints", async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId || !isObjectId(userId)) {
      return res.status(400).json({ success: false, message: "A valid staff userId is required" });
    }

    const staffProfile = await getProfile(userId, "staff");
    if (!staffProfile || staffProfile.role !== "staff") {
      return res.status(403).json({ success: false, message: "Staff access is required" });
    }

    const complaints = await Complaint.find({
      $or: [
        { assignedStaffId: { $exists: true, $nin: [null, ""] } },
        { assignedStaff: { $exists: true, $nin: [null, ""] } },
      ],
    })
      .populate("citizenId", "name email mobile contact")
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      complaints: complaints.map(toComplaintView),
    });
  } catch (error) {
    console.error("Failed to fetch staff assigned complaints:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch assigned complaints",
    });
  }
});

router.get("/staff-new-complaints", async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId || !isObjectId(userId)) {
      return res.status(400).json({ success: false, message: "A valid staff userId is required" });
    }

    const staffProfile = await getProfile(userId, "staff");
    if (!staffProfile || staffProfile.role !== "staff") {
      return res.status(403).json({ success: false, message: "Staff access is required" });
    }

    const complaints = await Complaint.find({
      status: { $in: ["New", "Pending", "Under Action"] },
    })
      .populate("citizenId", "name email mobile contact")
      .sort({ createdAt: -1 })
      .lean();
    const hasAssignment = (value) => {
      const normalized = String(value || "").trim().toLowerCase();
      return normalized !== "" && !["unassigned", "not assigned", "none", "null"].includes(normalized);
    };
    const wasActedOnByStaffOrVerifier = (complaint) =>
      [...(complaint.activityLog || []), ...(complaint.statusHistory || [])]
        .some((entry) => /\b(staff|verifier)\b/i.test(String(entry.actor || "")));
    const staffIdentifiers = [userId, staffProfile.staffId, staffProfile.name]
      .filter(Boolean)
      .map((identifier) => String(identifier).trim().toLowerCase());
    const availableComplaints = complaints.filter((complaint) =>
      !wasActedOnByStaffOrVerifier(complaint) &&
      (
        (
          ["New", "Pending"].includes(complaint.status) &&
          !hasAssignment(complaint.assignedStaffId) &&
          !hasAssignment(complaint.assignedStaff)
        ) ||
        (
          complaint.status === "Under Action" &&
          (
            (hasAssignment(complaint.assignedStaffId) &&
              String(complaint.assignedStaffId).trim().toLowerCase() === String(userId).toLowerCase()) ||
            (!hasAssignment(complaint.assignedStaffId) &&
              staffIdentifiers.includes(String(complaint.assignedStaff || "").trim().toLowerCase()))
          )
        )
      )
    );

    return res.json({
      success: true,
      complaints: availableComplaints.map(toComplaintView),
    });
  } catch (error) {
    console.error("Failed to fetch new staff complaints:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch new complaints",
    });
  }
});

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
    } else if (role === "staff") {
      const identifiers = [profile?.staffId, userId].filter(Boolean).map(String);
      if (profile?.name) {
        const sameNameStaff = await User.find({ role: "staff", name: profile.name })
          .select("_id")
          .limit(2)
          .lean();
        if (sameNameStaff.length === 1) identifiers.push(String(profile.name));
      }
      query.$or = [
        { assignedStaffId: userId },
        {
          assignedStaffId: { $in: [null, ""] },
          assignedStaff: { $in: identifiers },
        },
      ];
    }

    const [complaints, notifications] = await Promise.all([
      Complaint.find(query)
        .populate("citizenId", "name email mobile contact")
        .sort({ createdAt: -1 })
        .lean(),
      Notification.find({
        role,
        ...(role === "staff"
          ? { userId }
          : userId && isObjectId(userId)
          ? role === "citizen"
            ? { $or: [{ userId }, { userId: null, complaintId: null }] }
            : { $or: [{ userId }, { userId: null }] }
          : {}),
      }).populate({
        path: "complaintId",
        select: "complaintNumber citizenId citizenName citizenMobile category issueType description location landmark coordinates images photos inspection assignedStaff assignedStaffId assignedVerifier assignedVerifierId department priority status statusHistory activityLog verifierRemarks previousRemarks remarks createdAt updatedAt",
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
        complaintId: notification.complaintId?._id ? String(notification.complaintId._id) : null,
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
          after: notification.complaintId?.inspection?.completionPhoto || "",
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

    const allowed = ["status", "priority", "assignedStaff", "assignedStaffId", "assignedVerifier", "assignedVerifierId", "description", "location", "inspection"];
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
      ["assignedStaff", "assignedStaffId", "assignedVerifier", "assignedVerifierId", "description", "location"].some(
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

    if (updates.assignedStaffId) {
      if (!isObjectId(updates.assignedStaffId)) {
        return res.status(400).json({ success: false, message: "Invalid assigned staff ID" });
      }
      const assignedUser = await User.findOne({ _id: updates.assignedStaffId, role: "staff" }).select("name");
      if (!assignedUser) {
        return res.status(400).json({ success: false, message: "Assigned staff member was not found" });
      }
      if (
        updates.assignedStaff !== undefined &&
        String(updates.assignedStaff).trim().toLowerCase() !== String(assignedUser.name).trim().toLowerCase()
      ) {
        return res.status(400).json({ success: false, message: "Assigned staff name does not match the staff account" });
      }
      updates.assignedStaff = assignedUser.name;
    }

    let assignedVerifierUser = null;
    if (updates.assignedVerifierId || updates.assignedVerifier) {
      const verifierIdentifier = updates.assignedVerifierId || updates.assignedVerifier;
      if (updates.assignedVerifierId && !isObjectId(updates.assignedVerifierId)) {
        return res.status(400).json({ success: false, message: "Invalid assigned verifier ID" });
      }
      assignedVerifierUser = updates.assignedVerifierId
        ? await User.findOne({ _id: updates.assignedVerifierId, role: "verifier" }).select("_id name")
        : await findAssignedUser("verifier", verifierIdentifier);
      if (!assignedVerifierUser) {
        return res.status(400).json({ success: false, message: "Assigned verifier was not found" });
      }
      if (
        updates.assignedVerifier &&
        !isObjectId(updates.assignedVerifier) &&
        String(updates.assignedVerifier).trim().toLowerCase() !== String(assignedVerifierUser.name).trim().toLowerCase()
      ) {
        return res.status(400).json({ success: false, message: "Assigned verifier name does not match the verifier account" });
      }
      updates.assignedVerifier = assignedVerifierUser.name;
      updates.assignedVerifierId = String(assignedVerifierUser._id);
    } else if (updates.assignedVerifier === "" || updates.assignedVerifierId === "") {
      updates.assignedVerifier = "";
      updates.assignedVerifierId = "";
    }

    const previousStatus = previousComplaint.status;
    const previousAssignedStaff = previousComplaint.assignedStaff;
    const previousAssignedStaffId = previousComplaint.assignedStaffId || "";
    const previousAssignedVerifier = previousComplaint.assignedVerifier || "";
    const previousAssignedVerifierId = previousComplaint.assignedVerifierId || "";
    const staffAssignmentChanged =
      (updates.assignedStaff !== undefined && updates.assignedStaff !== previousAssignedStaff) ||
      (updates.assignedStaffId !== undefined && updates.assignedStaffId !== previousAssignedStaffId);
    if (
      staffAssignmentChanged &&
      (updates.assignedStaffId || updates.assignedStaff) &&
      ["New", "Pending"].includes(previousStatus) &&
      updates.status === undefined
    ) {
      updates.status = "Under Action";
    }
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
    const inspectionUpdated = Boolean(
      updates.inspection && !sameValue(updates.inspection, previousComplaint.inspection || {})
    );

    if (staffAssignmentChanged) {
      activityEntries.push({
        actor: actorName || "Admin",
        message: (updates.assignedStaff ?? previousAssignedStaff)
          ? `Assigned staff member ${updates.assignedStaff ?? previousAssignedStaff}`
          : "Removed staff assignment",
        createdAt: new Date(),
      });
    }
    const verifierAssignmentChanged =
      (updates.assignedVerifier !== undefined && updates.assignedVerifier !== previousAssignedVerifier) ||
      (updates.assignedVerifierId !== undefined && updates.assignedVerifierId !== previousAssignedVerifierId);
    if (verifierAssignmentChanged) {
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
    if (inspectionUpdated) {
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
    if (staffAssignmentChanged && (updates.assignedStaffId || updates.assignedStaff)) {
      const staff = await findAssignedUser("staff", updates.assignedStaffId || updates.assignedStaff);
      if (staff) {
        notifications.push({
          role: "staff",
          userId: staff._id,
          complaintId: complaint._id,
          type: "Staff Assigned",
          message: `${complaintLabel} has been assigned to you for action.${typeof req.body.remarks === "string" && req.body.remarks.trim() ? ` Verifier remarks: ${req.body.remarks.trim()}` : ""}`,
        });
      }
      if (updates.status === undefined || updates.status === previousStatus) {
        notifications.push({
          role: "admin",
          complaintId: complaint._id,
          type: "Staff Assignment Updated",
          message: `${complaintLabel} was assigned to ${updates.assignedStaff || "a staff member"} by ${actorName || "the dashboard"}.`,
        });
      }
    }
    if (verifierAssignmentChanged && (updates.assignedVerifierId || updates.assignedVerifier)) {
      const verifier = assignedVerifierUser || await findAssignedUser("verifier", updates.assignedVerifierId || updates.assignedVerifier);
      if (verifier) {
        notifications.push({
          role: "verifier",
          userId: verifier._id,
          complaintId: complaint._id,
          type: "Verifier Assigned",
          message: `${complaintLabel} has been assigned to you for verification.`,
        });
      }
    }
    if (
      updates.priority !== undefined &&
      updates.priority !== previousComplaint.priority &&
      (complaint.assignedStaff || complaint.assignedStaffId)
    ) {
      const staff = await findAssignedUser("staff", complaint.assignedStaffId || complaint.assignedStaff);
      if (staff) {
        notifications.push({
          role: "staff",
          userId: staff._id,
          complaintId: complaint._id,
          type: "Priority Updated",
          message: `${complaintLabel} priority was changed to ${updates.priority}.`,
        });
      }
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
    const verifierStatusMessages = {
      "Under Action": "A verifier accepted the complaint and assigned it for staff action.",
      Verified: "A verifier approved the completed work.",
      Rejected: "A verifier rejected the submission and sent it for correction.",
    };
    if (
      updates.status &&
      updates.status !== previousStatus &&
      verifierStatusMessages[updates.status]
    ) {
      const remarks = typeof req.body.remarks === "string" && req.body.remarks.trim()
        ? ` Remarks: ${req.body.remarks.trim()}`
        : "";
      notifications.push({
        role: "admin",
        complaintId: complaint._id,
        type: updates.status === "Under Action" ? "Complaint Assigned" : "Verifier Decision",
        message: `${complaintLabel}: ${verifierStatusMessages[updates.status]}${remarks}`,
      });
    }
    if (updates.status === "Rejected" && updates.status !== previousStatus && (complaint.assignedStaff || complaint.assignedStaffId)) {
      const staff = await findAssignedUser("staff", complaint.assignedStaffId || complaint.assignedStaff);
      if (staff) {
        notifications.push({
          role: "staff",
          userId: staff._id,
          complaintId: complaint._id,
          type: "Verification Rejected",
          message: `${complaintLabel} was rejected during verification and requires further action.${typeof req.body.remarks === "string" && req.body.remarks.trim() ? ` Remarks: ${req.body.remarks.trim()}` : ""}`,
        });
      }
    }
    if (updates.status === "Verified" && updates.status !== previousStatus && (complaint.assignedStaff || complaint.assignedStaffId)) {
      const staff = await findAssignedUser("staff", complaint.assignedStaffId || complaint.assignedStaff);
      if (staff) {
        notifications.push({
          role: "staff",
          userId: staff._id,
          complaintId: complaint._id,
          type: "Verification Approved",
          message: `${complaintLabel} passed verifier review.${typeof req.body.remarks === "string" && req.body.remarks.trim() ? ` Remarks: ${req.body.remarks.trim()}` : ""}`,
        });
      }
    }
    if (
      ["Resolved", "Closed"].includes(updates.status) &&
      updates.status !== previousStatus &&
      (complaint.assignedStaff || complaint.assignedStaffId)
    ) {
      const staff = await findAssignedUser("staff", complaint.assignedStaffId || complaint.assignedStaff);
      if (staff) {
        notifications.push({
          role: "staff",
          userId: staff._id,
          complaintId: complaint._id,
          type: "Complaint Resolved",
          message: `${complaintLabel} was marked ${updates.status} after verification.`,
        });
      }
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
        type: ["Resolved", "Closed"].includes(updates.status)
          ? "Complaint Resolved"
          : "Complaint Status Updated",
        message: `${complaintLabel}: ${citizenStatusMessages[updates.status]}`,
      });
    }
    if (
      inspectionUpdated &&
      !(updates.status === "Under Verification" && updates.status !== previousStatus)
    ) {
      notifications.push(
        {
          role: "admin",
          complaintId: complaint._id,
          type: "Work Updated",
          message: `${complaintLabel} work details were updated by staff.`,
        },
        {
          role: "verifier",
          complaintId: complaint._id,
          type: "Work Updated",
          message: `${complaintLabel} work details were updated and are available for review.`,
        }
      );
      if (
        complaint.citizenId &&
        !(updates.status && updates.status !== previousStatus && citizenStatusMessages[updates.status])
      ) {
        notifications.push({
          role: "citizen",
          userId: complaint.citizenId,
          complaintId: complaint._id,
          type: "Work Updated",
          message: `${complaintLabel}: staff updated the work details for your complaint.`,
        });
      }
    }
    if (inspectionUpdated && actorRole === "staff" && (complaint.assignedStaffId || complaint.assignedStaff)) {
      const assignedStaff = await findAssignedUser("staff", complaint.assignedStaffId || complaint.assignedStaff);
      if (assignedStaff) {
        notifications.push({
          role: "staff",
          userId: assignedStaff._id,
          complaintId: complaint._id,
          type: "Work Updated",
          message: `${complaintLabel} work details were updated successfully.`,
        });
      }
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
