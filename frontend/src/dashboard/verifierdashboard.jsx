import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./verifierdashboard.css";
import logo from "../assets/logo.jpeg";
import { fetchDashboard, fetchDashboardUsers, getStoredUser, getUserId, updateDashboardComplaint, updateDashboardProfile, markDashboardNotificationRead, toMediaUrl } from "../utils/dashboardApi";

import MyProfile from "../verifierprofiledashboard/MyProfile";
import NewComplaints from "../verifierprofiledashboard/NewComplaints";
import CompletedWork from "../verifierprofiledashboard/CompletedWork";
import WorkVerification from "../verifierprofiledashboard/WorkVerification";
import Reverification from "../verifierprofiledashboard/Reverification";
import PhysicalVerification from "../verifierprofiledashboard/PhysicalVerification";
import ComplaintHistory from "../verifierprofiledashboard/ComplaintHistory";
import ComplaintAssigned from "../verifierprofiledashboard/ComplaintAssigned";
import UpdatedComplaints from "../adminprofiledashboard/UpdatedComplaints";
import Notifications from "../verifierprofiledashboard/Notifications";
import ViewLocation from "../verifierprofiledashboard/ViewLocation";
import ComplaintImage from "../verifierprofiledashboard/ComplaintImage";

const lifecycleStages = [
  "Completed Work Received",
  "Physical Verification",
  "Verified",
  "Complaint Resolved / Closed",
  "Citizen Notified",
];

const statusToStageIndex = {
  pending: 0,
  in_action: 1,
  in_review: 1,
  verified: 2,
  resolved: 3,
  notified: 4,
  rejected: 1,
};

const statusTone = {
  pending: "amber",
  in_action: "orange",
  in_review: "orange",
  verified: "green",
  resolved: "green",
  notified: "green",
  rejected: "red",
};

const statusLabel = {
  pending: "Pending Verification",
  in_action: "Staff Work in Progress",
  in_review: "Physical Verification",
  verified: "Verified",
  resolved: "Resolved / Closed",
  notified: "Citizen Notified",
  rejected: "Sent Back for Action",
};

const normalizeVerifierStatus = (status) => {
  const normalized = String(status || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
  if (normalized === "closed") return "notified";
  if (["resolved", "complaint resolved"].includes(normalized)) return "resolved";
  if (["verified", "approved"].includes(normalized)) return "verified";
  if (["rejected", "sent back for action", "awaiting staff correction"].includes(normalized)) return "rejected";
  if (["assigned", "under action", "in action", "in progress", "staff work in progress"].includes(normalized)) return "in_action";
  if ([
    "under verification",
    "under review",
    "in review",
    "work completed",
    "completed work",
    "work submitted",
    "awaiting verification",
    "ready for verification",
    "re verification",
    "reverification",
  ].includes(normalized)) return "in_review";
  if (["notified", "citizen notified"].includes(normalized)) return "notified";
  if (["new", "registered", "complaint registered", "submitted", "pending", "pending verification"].includes(normalized)) return "pending";
  return "pending";
};

const mapVerifierComplaint = (complaint) => {
  let status = normalizeVerifierStatus(complaint.status);
  const history = Array.isArray(complaint.statusHistory) ? complaint.statusHistory : [];
  const activityLog = Array.isArray(complaint.activityLog) ? complaint.activityLog : [];
  const hasStaffOrVerifierAction = [...history, ...activityLog].some(
    (entry) => /\b(staff|verifier)\b/i.test(String(entry.actor || ""))
  );
  const wasAssignedByAdmin = activityLog.some(
    (entry) =>
      /\badmin\b/i.test(String(entry.actor || "")) &&
      /^Assigned staff member\b/i.test(String(entry.message || ""))
  );
  const historyStatus = (entry) =>
    String(entry.status || "").trim().toLowerCase().replace(/[_-]+/g, " ");
  const wasRejected = history.some((entry) => historyStatus(entry) === "rejected");
  const previousRejection = [...history].reverse().find(
    (entry) => historyStatus(entry) === "rejected"
  );
  const previousVerifierDecision = [...history].reverse().find(
    (entry) => ["verified", "approved", "rejected"].includes(historyStatus(entry))
  );
  const inspection = complaint.inspection && typeof complaint.inspection === "object"
    ? complaint.inspection
    : {};
  const hasSubmittedWork = Boolean(
    String(inspection.completionPhoto || complaint.completionPhoto || "").trim() &&
    String(inspection.actionTaken || complaint.actionTaken || "").trim()
  );
  const latestStatusEntry = history[history.length - 1];
  const staffSubmittedResolvedWork = Boolean(
    latestStatusEntry &&
    /\bstaff\b/i.test(String(latestStatusEntry.actor || "")) &&
    ["resolved", "closed"].includes(historyStatus(latestStatusEntry)) &&
    hasSubmittedWork
  );
  if (staffSubmittedResolvedWork || (["in_action", "pending"].includes(status) && hasSubmittedWork)) {
    status = "in_review";
  }
  const storedPhotos = Array.isArray(complaint.images)
    ? complaint.images
    : Array.isArray(complaint.citizenPhotos)
      ? complaint.citizenPhotos
      : Array.isArray(complaint.photos)
        ? complaint.photos
        : [];
  const photos = complaint.photos && typeof complaint.photos === "object" && !Array.isArray(complaint.photos)
    ? complaint.photos
    : {};
  let queue = "New Complaints";
  if (status === "rejected") {
    queue = "Awaiting Staff Correction";
  } else if (status === "in_action") {
    queue = "Staff Work in Progress";
  } else if (status === "in_review") {
    queue = wasRejected ? "Re-verification" : "Completed Work";
  } else if (status === "verified") {
    queue = "Resolution Requests";
  } else if (status === "resolved" || status === "notified") {
    queue = "Resolved / Closed";
  }
  if (status === "in_action" && wasAssignedByAdmin && !hasStaffOrVerifierAction) {
    queue = "New Complaints";
  }

  return {
    ...complaint,
    category: complaint.category || complaint.issueType || "Uncategorized",
    issue: complaint.issue || complaint.issueType || complaint.category || "Issue not specified",
    description: complaint.description || complaint.issueDescription || "",
    citizenContact: complaint.citizenContact || complaint.citizenMobile || complaint.citizenProfile?.mobile || "",
    citizenEmail: complaint.citizenEmail || complaint.citizenProfile?.email || "",
    status,
    queue,
    previousRemarks: previousRejection?.remarks || complaint.previousRemarks || "",
    verifierRemarks: complaint.verifierRemarks || previousVerifierDecision?.remarks || "",
    remarks: inspection.remarks || complaint.remarks || "",
    inspection: {
      ...inspection,
      inspectionDate: inspection.inspectionDate || complaint.inspectionDate || "",
      completionDate: inspection.completionDate || complaint.completionDate || "",
      remarks: inspection.remarks || complaint.staffRemarks || complaint.remarks || "",
      actionTaken: inspection.actionTaken || complaint.actionTaken || "",
      sitePhoto: inspection.sitePhoto || complaint.sitePhoto || "",
      completionPhoto: inspection.completionPhoto || complaint.completionPhoto || "",
      verificationPhoto: inspection.verificationPhoto || complaint.verificationPhoto || "",
    },
    photos: {
      before: photos.before || storedPhotos[0] || "",
      site: photos.site || inspection.sitePhoto || complaint.sitePhoto || storedPhotos[0] || "",
      after: photos.after || inspection.completionPhoto || complaint.completionPhoto || storedPhotos[1] || "",
      verification: photos.verification || inspection.verificationPhoto || complaint.verificationPhoto || "",
    },
    log: Array.isArray(complaint.log) ? complaint.log : [],
  };
};

const queueTone = { "New Complaints": "navy", "Staff Work in Progress": "orange", "Completed Work": "orange", "Awaiting Staff Correction": "red", "Re-verification": "red", "Resolution Requests": "amber", "Resolved / Closed": "green" };

const hasComplaintAssignee = (value) => {
  const assignee = typeof value === "object"
    ? value?._id || value?.name || ""
    : value;
  const normalized = String(assignee || "").trim().toLowerCase();
  return normalized !== "" &&
    !["unassigned", "not assigned", "none", "null"].includes(normalized);
};

const isNewVerifierComplaint = (complaint) =>
  complaint.queue === "New Complaints" &&
  ![...(complaint.statusHistory || []), ...(complaint.activityLog || [])].some(
    (entry) => /\b(staff|verifier)\b/i.test(String(entry.actor || ""))
  );

const mapColors = ["#e07b1c", "#2e6cb0", "#1d8a5c", "#c1900a", "#cf4438", "#7a5c9e"];
const colorForCategory = (category) => {
  let hash = 0;
  for (let i = 0; i < category.length; i++) hash = category.charCodeAt(i) + ((hash << 5) - hash);
  return mapColors[Math.abs(hash) % mapColors.length];
};

const VerifierDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const storedUser = getStoredUser();
  const [verifier, setVerifier] = useState({
    name: storedUser.name || "",
    role: storedUser.designation || storedUser.role || "",
    contact: storedUser.contact || storedUser.mobile || "",
    ward: storedUser.assignedArea || "",
    staffId: storedUser.verifierId || storedUser.staffId || "",
    department: storedUser.department || "",
    profilePhoto: storedUser.profilePhoto || "",
  });

  const [items, setItems] = useState([]);
  const [staffOptions, setStaffOptions] = useState([]);
  const [assignmentSavingId, setAssignmentSavingId] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [detailStaffId, setDetailStaffId] = useState("");
  const [showMapView, setShowMapView] = useState(false);
  const [remarksDraft, setRemarksDraft] = useState("");
  const [showProfile, setShowProfile] = useState(false);
  const [showNewComplaints, setShowNewComplaints] = useState(false);
  const [showComplaintAssigned, setShowComplaintAssigned] = useState(false);
  const [showCompletedWork, setShowCompletedWork] = useState(false);
  const [showWorkVerification, setShowWorkVerification] = useState(false);
  const [showUpdatedComplaints, setShowUpdatedComplaints] = useState(false);
  const [showReverification, setShowReverification] = useState(false);
  const [showPhysicalVerification, setShowPhysicalVerification] = useState(false);
  const [showComplaintHistory, setShowComplaintHistory] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showViewLocation, setShowViewLocation] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [actionSaving, setActionSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showDetailView, setShowDetailView] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [activityComplaint, setActivityComplaint] = useState(null);
  const [activeNav, setActiveNav] = useState("dashboard");
  const verifierId = getUserId(storedUser);
  const assignedComplaints = items.filter((complaint) =>
    hasComplaintAssignee(complaint.assignedStaffId) ||
    hasComplaintAssignee(complaint.assignedStaff) ||
    hasComplaintAssignee(complaint.assignedVerifierId) ||
    hasComplaintAssignee(complaint.assignedVerifier)
  );

  const verifierAssignmentUpdates = (complaint) => {
    if (!verifierId || !verifier.name) return {};

    const existingVerifierId = String(complaint?.assignedVerifierId || "");
    const existingVerifierName = String(complaint?.assignedVerifier || "").trim();
    const isAssignedToAnotherVerifier =
      (existingVerifierId && existingVerifierId !== String(verifierId)) ||
      (!existingVerifierId &&
        existingVerifierName &&
        existingVerifierName.toLowerCase() !== verifier.name.trim().toLowerCase());

    if (isAssignedToAnotherVerifier) return {};

    return {
      assignedVerifier: existingVerifierName || verifier.name,
      assignedVerifierId: existingVerifierId || String(verifierId),
    };
  };

  const openView = (setter) => {
    setShowProfile(false);
    setShowNewComplaints(false);
    setShowComplaintAssigned(false);
    setShowCompletedWork(false);
    setShowWorkVerification(false);
    setShowUpdatedComplaints(false);
    setShowReverification(false);
    setShowPhysicalVerification(false);
    setShowComplaintHistory(false);
    setShowNotifications(false);
    setShowViewLocation(false);
    setShowDetailView(false);
    setShowActivityModal(false);
    setter(true);
  };

  const selectView = (view, setter) => {
    setActiveNav(view);
    openView(setter);
  };

  const returnToDashboard = () => {
    setShowProfile(false);
    setShowNewComplaints(false);
    setShowComplaintAssigned(false);
    setShowCompletedWork(false);
    setShowWorkVerification(false);
    setShowUpdatedComplaints(false);
    setShowReverification(false);
    setShowPhysicalVerification(false);
    setShowComplaintHistory(false);
    setShowNotifications(false);
    setShowViewLocation(false);
    setShowDetailView(false);
    setShowActivityModal(false);
    setActiveNav("dashboard");
  };

  useEffect(() => {
    if (!location.state?.openProfile) return;
    openView(setShowProfile);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate]);

  const selected = items.find((c) => c.id === selectedId) || items[0] || {
    id: null, complaintNumber: "", category: "", issue: "", location: "",
    citizenName: "", citizenContact: "", description: "", status: "pending",
    queue: "New Complaints", photos: {}, log: [],
  };

  useEffect(() => {
    let active = true;
    const loadDashboard = async () => {
      try {
        const user = getStoredUser();
        const data = await fetchDashboard("verifier", getUserId(user));
        if (!active) return;
        if (data.profile) {
          setVerifier((current) => ({
            ...current,
            ...data.profile,
            contact: data.profile.contact || data.profile.mobile || current.contact,
            staffId: data.profile.verifierId || data.profile.staffId || current.staffId,
            role: data.profile.designation || data.profile.role || current.role,
            department: data.profile.department || current.department,
            ward: data.profile.assignedArea || current.ward,
            joinDate: data.profile.joiningDate
              ? new Date(data.profile.joiningDate).toLocaleDateString()
              : current.joinDate || "",
            profilePhoto: data.profile.profilePhoto || current.profilePhoto,
          }));
        }
        const mapped = (data.complaints || []).map(mapVerifierComplaint);
        setItems((current) => {
          const existing = new Map(current.map((complaint) => [complaint.id, complaint]));
          return mapped.map((complaint) => {
            const previous = existing.get(complaint.id);
            return previous && JSON.stringify(previous) === JSON.stringify(complaint)
              ? previous
              : complaint;
          });
        });
        if (!showDetailView) {
          setSelectedId(mapped[0]?.id || null);
        }
        setNotifications(data.notifications || []);
        setLoadError("");
      } catch (error) {
        if (active) {
          console.error("Failed to load verifier dashboard:", error);
          setLoadError(error.message || "Failed to load verifier dashboard.");
        }
      }
    };
    loadDashboard();
    const refreshTimer = window.setInterval(loadDashboard, 30000);
    return () => {
      active = false;
      window.clearInterval(refreshTimer);
    };
  }, [showDetailView]);

  useEffect(() => {
    let active = true;
    fetchDashboardUsers("staff")
      .then((data) => {
        if (active) setStaffOptions(data.users || []);
      })
      .catch((error) => {
        if (!active) return;
        console.error("Failed to load staff options:", error);
        setLoadError(error.message || "Failed to load staff accounts.");
      });
    return () => {
      active = false;
    };
  }, []);

  const previousStats = [
    { label: "Total Complaints", value: items.length, icon: "📊", tone: "navy" },
    { label: "Pending Verification", value: items.filter((c) => c.status === "pending").length, icon: "⏳", tone: "amber" },
    { label: "Verified", value: items.filter((c) => c.status === "verified").length, icon: "✅", tone: "green" },
    { label: "Rejected", value: items.filter((c) => c.status === "rejected").length, icon: "⛔", tone: "red" },
    { label: "Resolved", value: items.filter((c) => c.status === "resolved" || c.status === "notified").length, icon: "📂", tone: "green" },
  ];

  const newStats = [
    { label: "Under Verification", value: items.filter((c) => c.status === "in_review").length, icon: "🔍", tone: "orange" },
    { label: "Completed Work Awaiting", value: items.filter((c) => c.queue === "Completed Work").length, icon: "🛠️", tone: "navy" },
    { label: "Rework / Correction", value: items.filter((c) => c.queue === "Awaiting Staff Correction").length, icon: "🔄", tone: "red" },
    { label: "Resolution Requests", value: items.filter((c) => c.queue === "Resolution Requests").length, icon: "📌", tone: "amber" },
    { label: "Re-verification Queue", value: items.filter((c) => c.queue === "Re-verification").length, icon: "🔁", tone: "red" },
    { label: "Staff Work in Progress", value: items.filter((c) => c.queue === "Staff Work in Progress").length, icon: "🚧", tone: "orange" },
  ];

  const mapGroups = items.reduce((groups, c) => {
    const key = c.location || "Location pending";
    if (!groups[key]) groups[key] = [];
    groups[key].push(c);
    return groups;
  }, {});

  const filteredItems = items.filter((complaint) => {
    const query = searchTerm.trim().toLowerCase();
    return !query || [
      complaint.complaintNumber,
      complaint.category,
      complaint.issue,
      complaint.location,
      complaint.status,
      complaint.queue,
    ].some((value) => String(value || "").toLowerCase().includes(query));
  });
  const getAssignedStaffId = (complaint) =>
    complaint.assignedStaffId ||
    staffOptions.find((staff) => staff.name === complaint.assignedStaff)?._id ||
    "";

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  const openVerification = (c) => {
    setSelectedId(c.id);
    setRemarksDraft(c.remarks || "");
    scrollTo("verification-panel");
  };

  const handleViewDetails = (complaint) => {
    setSelectedId(complaint.id);
    setDetailStaffId(getAssignedStaffId(complaint));
    setShowDetailView(true);
    setRemarksDraft(complaint.remarks || "");
  };

  const handleBackToList = () => {
    setShowDetailView(false);
  };

  // ✅ NEW: Quick verify action from table
  const handleQuickVerify = (complaint) => {
    setSelectedId(complaint.id);
    setDetailStaffId(getAssignedStaffId(complaint));
    setRemarksDraft(complaint.remarks || "");
    setShowDetailView(true);
  };

  // ✅ NEW: Show activity modal for a complaint
  const handleShowActivity = (complaint) => {
    setActivityComplaint(complaint);
    setShowActivityModal(true);
  };

  const handleCloseActivityModal = () => {
    setShowActivityModal(false);
    setActivityComplaint(null);
  };

  const handleUpdateProfile = async (updatedVerifier) => {
    const data = await updateDashboardProfile(getUserId(storedUser), {
      name: updatedVerifier.name,
      designation: updatedVerifier.role,
      assignedArea: updatedVerifier.ward,
      contact: updatedVerifier.contact,
      email: updatedVerifier.email,
      profilePhoto: updatedVerifier.profilePhoto,
    });
    const user = data.user || {};
    const nextVerifier = {
      ...updatedVerifier,
      ...user,
      role: user.designation || updatedVerifier.role,
      ward: user.assignedArea || updatedVerifier.ward,
      staffId: user.verifierId || user.staffId || updatedVerifier.staffId,
      contact: user.contact || user.mobile || updatedVerifier.contact,
    };
    setVerifier((current) => ({ ...current, ...nextVerifier }));
    return data;
  };

  const persistComplaintStatus = async (id, status, remarks = "", dateTime = "", additionalUpdates = {}) => {
    const complaint = items.find((item) => item.id === id);
    const result = await updateDashboardComplaint(id, {
      ...verifierAssignmentUpdates(complaint),
      ...additionalUpdates,
      status,
      remarks,
      ...(dateTime ? { verificationDateTime: dateTime } : {}),
    });
    const updatedComplaint = mapVerifierComplaint(result.complaint);
    setItems((current) => current.map((complaint) => (
      complaint.id === id ? updatedComplaint : complaint
    )));
    return updatedComplaint;
  };

  const handleAssignStaff = async (complaint, staffId) => {
    setActionMessage("");
    setAssignmentSavingId(complaint.id);
    const assignedStaff = staffOptions.find((staff) => String(staff._id) === String(staffId));
    try {
      const result = await updateDashboardComplaint(complaint.id, {
        assignedStaff: assignedStaff?.name || "",
        assignedStaffId: assignedStaff?._id || "",
        ...verifierAssignmentUpdates(complaint),
        ...(assignedStaff && ["pending", "rejected"].includes(complaint.status) ? { status: "Under Action" } : {}),
      });
      const updatedComplaint = mapVerifierComplaint(result.complaint);
      setItems((current) => current.map((item) => item.id === complaint.id ? updatedComplaint : item));
    } catch (error) {
      console.error("Failed to assign staff to complaint:", error);
      setActionMessage(error.message || "Unable to assign staff to this complaint.");
    } finally {
      setAssignmentSavingId("");
    }
  };

  const handleManagementAssignStaff = async (complaint, staffId) => {
    const assignedStaff = staffOptions.find(
      (staff) => String(staff._id) === String(staffId)
    );
    if (!assignedStaff) {
      throw new Error("Select a valid staff member for this complaint.");
    }

    const result = await updateDashboardComplaint(complaint.id, {
      assignedStaff: assignedStaff.name,
      assignedStaffId: assignedStaff._id,
      ...verifierAssignmentUpdates(complaint),
      ...(["pending", "rejected"].includes(complaint.status)
        ? { status: "Under Action" }
        : {}),
    });
    const updatedComplaint = mapVerifierComplaint(result.complaint);
    setItems((current) => current.map((item) => (
      item.id === complaint.id ? updatedComplaint : item
    )));
    return updatedComplaint;
  };

  const handleCompletedWorkVerify = (id, action, remarks, dateTime) =>
    persistComplaintStatus(id, action === "approve" ? "Resolved" : "Rejected", remarks, dateTime);

  const handleNewComplaintAction = async (id, action, details = {}) => {
    const complaint = items.find((item) => item.id === id);
    if (action === "reject") {
      return persistComplaintStatus(
        id,
        "Rejected",
        details.remarks,
        "",
        verifierAssignmentUpdates(complaint)
      );
    }
    const assignedStaff = staffOptions.find((staff) => String(staff._id) === String(details.staffId));
    if (!assignedStaff) {
      throw new Error("Select a staff member before accepting this complaint.");
    }
    const result = await updateDashboardComplaint(id, {
      assignedStaff: assignedStaff.name,
      assignedStaffId: assignedStaff._id,
      ...verifierAssignmentUpdates(complaint),
      status: "Under Action",
      remarks: "Accepted by verifier and assigned for staff action.",
    });
    const updatedComplaint = mapVerifierComplaint(result.complaint);
    setItems((current) => current.map((complaint) => (
      complaint.id === id ? updatedComplaint : complaint
    )));
    return updatedComplaint;
  };

  const handleSaveVerifierEvidence = async (id, photoUrl) => {
    const complaint = items.find((item) => item.id === id);
    if (!complaint) throw new Error("Complaint could not be found.");

    const result = await updateDashboardComplaint(id, {
      ...verifierAssignmentUpdates(complaint),
      inspection: {
        ...(complaint.inspection || {}),
        verificationPhoto: photoUrl,
      },
    });
    const updatedComplaint = mapVerifierComplaint(result.complaint);
    setItems((current) => current.map((item) => (
      item.id === id ? updatedComplaint : item
    )));
    return updatedComplaint;
  };

  const handleVerificationDecision = (complaint, status, remarks, dateTime) =>
    persistComplaintStatus(complaint.id, status, remarks, dateTime);

  const handleNotificationComplaintUpdated = (updatedComplaint) => {
    setNotifications((current) => current.map((notification) => (
      (notification.complaint?.id || notification.complaintId) === updatedComplaint.id
        ? { ...notification, complaint: updatedComplaint, complaintNumber: updatedComplaint.complaintNumber }
        : notification
    )));
  };

  const updateNotificationComplaintStaff = async (complaint, staffId, remarks) => {
    const assignedStaff = staffOptions.find((staff) => String(staff._id) === String(staffId));
    if (!assignedStaff) {
      throw new Error("Select a valid staff member for this complaint.");
    }
    const result = await updateDashboardComplaint(complaint.id, {
      assignedStaff: assignedStaff.name,
      assignedStaffId: assignedStaff._id,
      ...verifierAssignmentUpdates(complaint),
      status: "Under Action",
      remarks,
    });
    const updatedComplaint = mapVerifierComplaint(result.complaint);
    setItems((current) => current.map((item) => (
      item.id === complaint.id ? updatedComplaint : item
    )));
    return updatedComplaint;
  };

  const handleNotificationReject = (complaint, remarks) =>
    persistComplaintStatus(complaint.id, "Rejected", remarks);

  const handleMarkNotifAsRead = async (id) => {
    await markDashboardNotificationRead(id);
    setNotifications((current) => current.map((notification) => (
      notification.id === id ? { ...notification, isRead: true } : notification
    )));
  };

  const handleMarkAllNotifsRead = async () => {
    const unread = notifications.filter((notification) => !notification.isRead);
    const results = await Promise.allSettled(
      unread.map((notification) => markDashboardNotificationRead(notification.id))
    );
    const successfulIds = new Set(
      results.flatMap((result, index) => result.status === "fulfilled" ? [unread[index].id] : [])
    );
    setNotifications((current) => current.map((notification) => (
      successfulIds.has(notification.id) ? { ...notification, isRead: true } : notification
    )));
    const failedCount = results.filter((result) => result.status === "rejected").length;
    if (failedCount) {
      throw new Error(`Could not mark ${failedCount} notification(s) as read. Please try again.`);
    }
  };

  const handlePhysicalVerificationSubmit = (id, decision, remarks, dateTime, verificationPhoto) => {
    const complaint = items.find((item) => item.id === id);
    return persistComplaintStatus(id, decision === "approve" ? "Verified" : "Rejected", remarks, dateTime, {
      inspection: {
        ...(complaint?.inspection || {}),
        verificationPhoto,
      },
    });
  };

  const handleReverifyAction = (id, action, remarks, dateTime) =>
    persistComplaintStatus(id, action === "approve" ? "Verified" : "Rejected", remarks, dateTime);

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      localStorage.removeItem("verifierData");
      window.location.href = "/login";
    }
  };

  const approveWork = (id) => {
    if (!remarksDraft.trim()) throw new Error("Please enter verification remarks before approving.");
    return persistComplaintStatus(id, "Verified", remarksDraft);
  };

  const rejectWork = (id) => {
    if (!remarksDraft.trim()) throw new Error("Please enter verification remarks before rejecting.");
    return persistComplaintStatus(id, "Rejected", remarksDraft);
  };

  const assignStaffFromDetails = async () => {
    if (!detailStaffId) {
      setActionMessage("Select a staff member before assigning this complaint.");
      return;
    }
    await handleAssignStaff(selected, detailStaffId);
  };

  const markResolved = (id) => persistComplaintStatus(id, "Resolved");

  const closeComplaint = (id) => persistComplaintStatus(id, "Closed");

  const handleDashboardAction = async (action) => {
    setActionMessage("");
    setActionSaving(true);
    try {
      await action();
    } catch (error) {
      console.error("Verifier action failed:", error);
      setActionMessage(error.message || "Unable to save this verifier action.");
    } finally {
      setActionSaving(false);
    }
  };

  const initials = verifier.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (showProfile) {
    return (
      <MyProfile
        initialVerifier={verifier}
        onBack={returnToDashboard}
        onUpdate={handleUpdateProfile}
      />
    );
  }

  if (showNewComplaints) {
    return (
      <NewComplaints
        complaints={items.filter(isNewVerifierComplaint)}
        staffOptions={staffOptions}
        onAction={handleNewComplaintAction}
        onBack={returnToDashboard}
      />
    );
  }

  if (showComplaintAssigned) {
    return (
      <ComplaintAssigned
        complaints={assignedComplaints}
        staffOptions={staffOptions}
        verifier={verifier}
        loadError={loadError}
        onBack={returnToDashboard}
        onAction={handleNewComplaintAction}
        onAssignStaff={handleManagementAssignStaff}
        onSaveEvidence={handleSaveVerifierEvidence}
      />
    );
  }

  if (showComplaintHistory) {
    return (
      <ComplaintHistory
        complaints={items}
        onVerify={handleVerificationDecision}
        onBack={returnToDashboard}
      />
    );
  }

  if (showPhysicalVerification) {
    return (
      <PhysicalVerification
        complaints={items}
        loadError={loadError}
        onBack={returnToDashboard}
        onSubmitVerification={handlePhysicalVerificationSubmit}
      />
    );
  }

  if (showCompletedWork) {
    return (
      <CompletedWork
        complaints={items}
        loadError={loadError}
        onBack={returnToDashboard}
        onVerify={handleCompletedWorkVerify}
      />
    );
  }

  if (showWorkVerification) {
    return (
      <WorkVerification
        complaints={items}
        loadError={loadError}
        onBack={returnToDashboard}
        onVerify={handleCompletedWorkVerify}
      />
    );
  }

  if (showUpdatedComplaints) {
    return (
      <UpdatedComplaints
        complaints={items}
        actorRoles={["staff", "admin", "verifier"]}
        audienceLabel="Staff, admin & verifier activity"
        listTitle="Staff, Admin & Verifier Updates"
        showUpdateHistory={false}
        onBack={returnToDashboard}
      />
    );
  }

  if (showReverification) {
    return (
      <Reverification
        complaints={items}
        loadError={loadError}
        onBack={returnToDashboard}
        onReverify={handleReverifyAction}
      />
    );
  }

  if (showNotifications) {
    return (
      <Notifications
        notifications={notifications}
        complaints={items}
        staffOptions={staffOptions}
        onVerify={handleVerificationDecision}
        onAcceptAssign={updateNotificationComplaintStaff}
        onAssign={updateNotificationComplaintStaff}
        onReject={handleNotificationReject}
        onComplaintUpdated={handleNotificationComplaintUpdated}
        onBack={returnToDashboard}
        onMarkAsRead={handleMarkNotifAsRead}
        onMarkAllRead={handleMarkAllNotifsRead}
      />
    );
  }

  if (showViewLocation) {
    return (
      <ViewLocation
        complaints={items}
        staffOptions={staffOptions}
        onVerify={handleVerificationDecision}
        onAcceptAssign={updateNotificationComplaintStaff}
        onAssign={updateNotificationComplaintStaff}
        onReject={handleNotificationReject}
        onBack={returnToDashboard}
      />
    );
  }

  // ✅ DETAILED COMPLAINT VIEW
  if (showDetailView && selected) {
    return (
      <div className="vd-shell">
        <aside className="vd-sidebar">
          <div className="vd-sb-brand">
            <div className="vd-sb-logo"><img src={logo} alt="MyRoad India logo" /></div>
            <div>
              <b>MyRoad India</b>
              <span>Verifier Portal</span>
            </div>
          </div>

          <div className="vd-sb-label">Overview</div>
          <nav className="vd-sb-nav">
            <button type="button" className={`vd-sb-link ${activeNav === "dashboard" ? "active" : ""}`} onClick={() => { setActiveNav("dashboard"); setShowDetailView(false); }}>
              📊 Dashboard
            </button>
            <button type="button" className={`vd-sb-link ${activeNav === "profile" ? "active" : ""}`} onClick={() => selectView("profile", setShowProfile)}>
              👤 My Profile
            </button>
            <button type="button" className={`vd-sb-link ${activeNav === "complaint-assigned" ? "active" : ""}`} onClick={() => selectView("complaint-assigned", setShowComplaintAssigned)}>
              📋 Complaint Assigned
              <span className="vd-sb-badge">{assignedComplaints.length}</span>
            </button>
          </nav>

          <div className="vd-sb-label">Account</div>
          <nav className="vd-sb-nav">
            <button
              type="button"
              className="vd-sb-link"
              onClick={handleLogout}
              style={{ color: "#ff6b6b", marginTop: "8px" }}
            >
              🚪 Logout
            </button>
          </nav>

          <div className="vd-sb-footer">
            <div className="vd-sb-user">
              <div className="vd-sb-avatar">
                {verifier.profilePhoto ? <img src={toMediaUrl(verifier.profilePhoto)} alt="Profile" /> : initials}
              </div>
              <div className="vd-sb-user-info">
                <b>{verifier.name}</b>
                <span>{verifier.staffId}</span>
              </div>
            </div>
            <div className="vd-sb-ward">
              {verifier.role} · {verifier.ward}
            </div>
          </div>
        </aside>

        <div className="vd-main">
          <div className="vd-topbar">
            <button className="vd-btn-outline" onClick={handleBackToList}>
              ← Back to List
            </button>
            <div className="vd-tb-actions">
              <div className="vd-tb-user">
                <div className="vd-tb-avatar">
                  {verifier.profilePhoto ? <img src={toMediaUrl(verifier.profilePhoto)} alt="Profile" /> : initials}
                </div>
                <div>
                  <b>{verifier.name}</b>
                  <span>{verifier.role}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="vd-content">
            {actionMessage && (
              <div className="vd-error-message" role="alert">
                {actionMessage}
              </div>
            )}

            {/* COMPLAINT DETAILS HEADER */}
            <div className="vd-panel vd-form-panel">
              <div className="vd-panel-head">
                <h3>Complaint Details</h3>
                <span className="vd-panel-link">{selected.complaintNumber}</span>
              </div>
              <div className="vd-detail-grid">
                <div className="vd-detail-item">
                  <span>Complaint Number</span>
                  <b>{selected.complaintNumber}</b>
                </div>
                <div className="vd-detail-item">
                  <span>Category</span>
                  <b>{selected.category}</b>
                </div>
                <div className="vd-detail-item">
                  <span>Citizen</span>
                  <b>{selected.citizenName}</b>
                </div>
                <div className="vd-detail-item">
                  <span>Citizen Contact</span>
                  <b>{selected.citizenContact}</b>
                </div>
                <div className="vd-detail-item vd-detail-wide">
                  <span>Description</span>
                  <b>{selected.description}</b>
                </div>
              </div>
            </div>

            {/* CITIZEN, ASSIGNMENT & WORK DETAILS */}
            <div className="vd-panel vd-form-panel">
              <div className="vd-panel-head">
                <h3>Citizen, Assignment & Work Details</h3>
              </div>
              <div className="vd-detail-table-grid">
                <div className="vd-detail-table-row">
                  <div className="vd-detail-table-cell">
                    <span className="vd-detail-label">Citizen</span>
                    <span className="vd-detail-value">{selected.citizenName}</span>
                  </div>
                  <div className="vd-detail-table-cell">
                    <span className="vd-detail-label">Citizen Contact</span>
                    <span className="vd-detail-value">{selected.citizenContact || "Not available"}</span>
                  </div>
                  <div className="vd-detail-table-cell">
                    <span className="vd-detail-label">Citizen Email</span>
                    <span className="vd-detail-value">{selected.citizenEmail || "Not available"}</span>
                  </div>
                  <div className="vd-detail-table-cell">
                    <span className="vd-detail-label">Department</span>
                    <span className="vd-detail-value">{selected.department || "Not assigned"}</span>
                  </div>
                  <div className="vd-detail-table-cell">
                    <span className="vd-detail-label">Assigned Staff</span>
                    <span className="vd-detail-value">{selected.assignedStaff || "Not assigned"}</span>
                  </div>
                </div>
                <div className="vd-detail-table-row">
                  <div className="vd-detail-table-cell">
                    <span className="vd-detail-label">Assigned Verifier</span>
                    <span className="vd-detail-value">{selected.assignedVerifier || verifier.name}</span>
                  </div>
                  <div className="vd-detail-table-cell">
                    <span className="vd-detail-label">Priority</span>
                    <span className="vd-detail-value">{selected.priority || "Normal"}</span>
                  </div>
                  <div className="vd-detail-table-cell">
                    <span className="vd-detail-label">Submitted</span>
                    <span className="vd-detail-value">{selected.createdAt ? new Date(selected.createdAt).toLocaleString() : selected.date ? new Date(selected.date).toLocaleString() : "Not recorded"}</span>
                  </div>
                  <div className="vd-detail-table-cell">
                    <span className="vd-detail-label">Last Updated</span>
                    <span className="vd-detail-value">{selected.updatedAt ? new Date(selected.updatedAt).toLocaleString() : "Not recorded"}</span>
                  </div>
                  <div className="vd-detail-table-cell">
                    <span className="vd-detail-label">Landmark</span>
                    <span className="vd-detail-value">{selected.landmark || "Not provided"}</span>
                  </div>
                </div>
                <div className="vd-detail-table-row">
                  <div className="vd-detail-table-cell">
                    <span className="vd-detail-label">Inspection Date</span>
                    <span className="vd-detail-value">{selected.inspection?.inspectionDate || selected.inspectionDate || "Not recorded"}</span>
                  </div>
                  <div className="vd-detail-table-cell">
                    <span className="vd-detail-label">Work Completion Date</span>
                    <span className="vd-detail-value">{selected.inspection?.completionDate || selected.completionDate || "Not recorded"}</span>
                  </div>
                </div>
                <div className="vd-detail-table-row vd-full-width">
                  <div className="vd-detail-table-cell">
                    <span className="vd-detail-label">Reported Description</span>
                    <span className="vd-detail-value vd-description">{selected.description}</span>
                  </div>
                </div>
                <div className="vd-detail-table-row vd-full-width">
                  <div className="vd-detail-table-cell">
                    <span className="vd-detail-label">Staff Inspection Remarks</span>
                    <span className="vd-detail-value vd-description">{selected.inspection?.remarks || "No staff inspection remarks recorded."}</span>
                  </div>
                </div>
                <div className="vd-detail-table-row vd-full-width">
                  <div className="vd-detail-table-cell">
                    <span className="vd-detail-label">Action Taken by Staff</span>
                    <span className="vd-detail-value vd-description">{selected.inspection?.actionTaken || selected.actionTaken || "No work action recorded."}</span>
                  </div>
                </div>
                <div className="vd-detail-table-row vd-full-width">
                  <div className="vd-detail-table-cell">
                    <span className="vd-detail-label">Complaint GPS Coordinates</span>
                    {selected.coordinates?.latitude != null && selected.coordinates?.longitude != null ? (
                      <a
                        className="vd-detail-value"
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${selected.coordinates.latitude},${selected.coordinates.longitude}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {selected.coordinates.latitude}, {selected.coordinates.longitude} · Open map
                      </a>
                    ) : (
                      <span className="vd-detail-value">Coordinates not available</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* PHOTOS SECTION */}
            <div className="vd-panel vd-form-panel">
              <div className="vd-panel-head">
                <h3>Photos — {selected.complaintNumber}</h3>
              </div>
              <div className="vd-photo-table">
                <table>
                  <thead>
                    <tr>
                      <th>Before Repair</th>
                      <th>Site Photo</th>
                      <th>After Repair</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        {selected.photos.before ? (
                          <ComplaintImage src={selected.photos.before} alt="Before repair" className="vd-photo-table-img" fallbackClassName="vd-photo-placeholder" />
                        ) : (
                          <div className="vd-photo-placeholder">
                            <span>📷</span>
                            <span>Not available</span>
                          </div>
                        )}
                      </td>
                      <td>
                        {selected.photos.site ? (
                          <ComplaintImage src={selected.photos.site} alt="Site photo" className="vd-photo-table-img" fallbackClassName="vd-photo-placeholder" />
                        ) : (
                          <div className="vd-photo-placeholder">
                            <span>📷</span>
                            <span>Not available</span>
                          </div>
                        )}
                      </td>
                      <td>
                        {selected.photos.after ? (
                          <ComplaintImage src={selected.photos.after} alt="After repair" className="vd-photo-table-img" fallbackClassName="vd-photo-placeholder" />
                        ) : (
                          <div className="vd-photo-placeholder">
                            <span></span>
                            <span>Not available</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* PHYSICAL VERIFICATION */}
            <div className="vd-panel vd-form-panel" id="verification-panel">
              <div className="vd-panel-head">
                <h3>Complaint Review & Assignment — {selected.complaintNumber}</h3>
                <span className={`vd-badge vd-badge-${statusTone[selected.status]}`}>{statusLabel[selected.status]}</span>
              </div>
              <div className="vd-verification-table">
                <div className="vd-verification-row">
                  <div className="vd-verification-label">Current Status</div>
                  <div className="vd-verification-value">
                    <span className={`vd-badge vd-badge-${statusTone[selected.status]}`}>{statusLabel[selected.status]}</span>
                  </div>
                </div>
                {["pending", "in_review"].includes(selected.status) && (
                  <div className="vd-verification-row">
                    <div className="vd-verification-label">
                      {selected.status === "pending" ? "Review / rejection remarks" : "Verification Remarks"}
                    </div>
                    <div className="vd-verification-value">
                      <textarea
                        id="verifier-remarks"
                        rows="3"
                        placeholder={selected.status === "pending"
                          ? "Add a reason if rejecting this complaint."
                          : "Note your review findings or reason for rejection."}
                        value={remarksDraft}
                        onChange={(e) => setRemarksDraft(e.target.value)}
                        className="vd-verification-textarea"
                      />
                    </div>
                  </div>
                )}
                {selected.status === "rejected" && (
                  <div className="vd-verification-row">
                    <div className="vd-verification-label">Previous Rejection Reason</div>
                    <div className="vd-verification-value vd-description">
                      {selected.previousRemarks || "See the activity log for verifier feedback."}
                    </div>
                  </div>
                )}
                <div className="vd-verification-actions">
                  {["pending", "in_action", "rejected"].includes(selected.status) && (
                    <div className="vd-assignment-detail">
                      <label htmlFor="vd-detail-staff">Assign staff for this complaint</label>
                      <select
                        id="vd-detail-staff"
                        className="vd-assignment-select"
                        value={detailStaffId}
                        disabled={assignmentSavingId === selected.id || staffOptions.length === 0}
                        onChange={(event) => setDetailStaffId(event.target.value)}
                      >
                        <option value="">Select staff member</option>
                        {staffOptions.map((staff) => (
                          <option key={staff._id} value={staff._id}>
                            {staff.name}{staff.staffId ? ` · ${staff.staffId}` : ""}
                          </option>
                        ))}
                      </select>
                      <button
                        className="vd-btn-primary"
                        type="button"
                        disabled={assignmentSavingId === selected.id || !detailStaffId}
                        onClick={assignStaffFromDetails}
                      >
                        {assignmentSavingId === selected.id
                          ? "Saving Assignment..."
                          : selected.status === "pending"
                            ? "Accept & Assign Staff"
                            : "Assign / Reassign Staff"}
                      </button>
                    </div>
                  )}
                  {selected.status === "pending" && (
                    <button
                      className="vd-btn-danger"
                      type="button"
                      disabled={actionSaving}
                      onClick={() => handleDashboardAction(() => rejectWork(selected.id))}
                    >
                      Reject Complaint (Remarks Required)
                    </button>
                  )}
                  {selected.status === "in_review" && (
                    <>
                      <button
                        className="vd-btn-danger"
                        type="button"
                        disabled={actionSaving}
                        onClick={() => handleDashboardAction(() => rejectWork(selected.id))}
                      >
                        Work Not Satisfied — Reject
                      </button>
                      <button
                        className="vd-btn-primary"
                        type="button"
                        disabled={actionSaving}
                        onClick={() => handleDashboardAction(() => approveWork(selected.id))}
                      >
                        Work Satisfied — Approve / Verify
                      </button>
                    </>
                  )}
                  {selected.status === "in_action" && (
                    <div className="vd-verification-info">
                      This complaint is assigned to staff. Verification decisions become available after staff submits completed work.
                    </div>
                  )}
                  {selected.status === "rejected" && (
                    <div className="vd-verification-info">
                      The assigned staff member must submit corrected work for re-verification.
                    </div>
                  )}
                  {selected.status === "verified" && (
                    <button
                      className="vd-btn-primary"
                      type="button"
                      disabled={actionSaving}
                      onClick={() => handleDashboardAction(() => markResolved(selected.id))}
                    >
                      Update Status → Resolved / Closed
                    </button>
                  )}
                  {selected.status === "resolved" && (
                    <button
                      className="vd-btn-primary"
                      type="button"
                      disabled={actionSaving}
                      onClick={() => handleDashboardAction(() => closeComplaint(selected.id))}
                    >
                      Close Complaint
                    </button>
                  )}
                  {selected.status === "notified" && (
                    <div className="vd-verification-success">
                      ✅ Citizen has been notified and the complaint is closed.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ✅ MAIN DASHBOARD VIEW (FULL-WIDTH PENDING VERIFICATIONS TABLE)
  return (
    <div className="vd-shell">
      {/* ============ SIDEBAR ============ */}
      <aside className="vd-sidebar">
        <div className="vd-sb-brand">
          <div className="vd-sb-logo"><img src={logo} alt="MyRoad India logo" /></div>
          <div>
            <b>MyRoad India</b>
            <span>Verifier Portal</span>
          </div>
        </div>

        <div className="vd-sb-label">Overview</div>
        <nav className="vd-sb-nav">
          <button type="button" className={`vd-sb-link ${activeNav === "dashboard" ? "active" : ""}`} onClick={() => { setActiveNav("dashboard"); scrollTo("vd-top"); }}>
            📊 Dashboard
          </button>
          <button type="button" className={`vd-sb-link ${activeNav === "profile" ? "active" : ""}`} onClick={() => selectView("profile", setShowProfile)}>
            👤 My Profile
          </button>
          <button type="button" className={`vd-sb-link ${activeNav === "new" ? "active" : ""}`} onClick={() => selectView("new", setShowNewComplaints)}>
            🆕 New Complaints
            <span className="vd-sb-badge">{items.filter(isNewVerifierComplaint).length}</span>
          </button>
          <button type="button" className={`vd-sb-link ${activeNav === "complaint-assigned" ? "active" : ""}`} onClick={() => selectView("complaint-assigned", setShowComplaintAssigned)}>
            📋 Complaint Assigned
            <span className="vd-sb-badge">{assignedComplaints.length}</span>
          </button>
          <button type="button" className={`vd-sb-link ${activeNav === "work-verification" ? "active" : ""}`} onClick={() => selectView("work-verification", setShowWorkVerification)}>
            ✅ Work Verification
            <span className="vd-sb-badge">{items.filter((c) => c.queue === "Completed Work").length}</span>
          </button>
          <button type="button" className={`vd-sb-link ${activeNav === "updated-complaints" ? "active" : ""}`} onClick={() => selectView("updated-complaints", setShowUpdatedComplaints)}>
            📋 Updated Complaints
          </button>
        </nav>

        <div className="vd-sb-label">Verification Queues</div>
        <nav className="vd-sb-nav">
          <button type="button" className={`vd-sb-link ${activeNav === "completed" ? "active" : ""}`} onClick={() => selectView("completed", setShowCompletedWork)}>
            🛠️ Completed Work
            <span className="vd-sb-badge">{items.filter((c) => c.queue === "Completed Work").length}</span>
          </button>
          <button type="button" className={`vd-sb-link ${activeNav === "reverification" ? "active" : ""}`} onClick={() => selectView("reverification", setShowReverification)}>
            ️🔍Re-verification
            <span className="vd-sb-badge">{items.filter((c) => c.queue === "Re-verification").length}</span>
          </button>
        </nav>

        <div className="vd-sb-label">Tools & Actions</div>
        <nav className="vd-sb-nav">
          <button type="button" className={`vd-sb-link ${activeNav === "physical" ? "active" : ""}`} onClick={() => selectView("physical", setShowPhysicalVerification)}>
            🔍Physical Verification
          </button>
          <button type="button" className={`vd-sb-link ${activeNav === "history" ? "active" : ""}`} onClick={() => selectView("history", setShowComplaintHistory)}>
            📜Complaint History
          </button>
          <button type="button" className={`vd-sb-link ${activeNav === "notifications" ? "active" : ""}`} onClick={() => selectView("notifications", setShowNotifications)}>
            🔔 Notifications
            <span className="vd-sb-badge">{notifications.filter((n) => !n.isRead).length}</span>
          </button>
          <button type="button" className={`vd-sb-link ${activeNav === "location" ? "active" : ""}`} onClick={() => selectView("location", setShowViewLocation)}>
            🗺️ View Location
          </button>
        </nav>

        <div className="vd-sb-label">Account</div>
        <nav className="vd-sb-nav">
          <button
            type="button"
            className="vd-sb-link"
            onClick={handleLogout}
            style={{ color: "#ff6b6b", marginTop: "8px" }}
          >
            🚪 Logout
          </button>
        </nav>

        <div className="vd-sb-footer">
          <div className="vd-sb-user">
            <div className="vd-sb-avatar">
              {verifier.profilePhoto ? <img src={toMediaUrl(verifier.profilePhoto)} alt="Profile" /> : initials}
            </div>
            <div className="vd-sb-user-info">
              <b>{verifier.name}</b>
              <span>{verifier.staffId}</span>
            </div>
          </div>
          <div className="vd-sb-ward">
            {verifier.role} · {verifier.ward}
          </div>
        </div>
      </aside>

      {/* ============ MAIN AREA ============ */}
      <div className="vd-main" id="vd-top">
        {/* TOPBAR */}
        <div className="vd-topbar">
          <div className="vd-search">
            🔍 <input
              type="search"
              placeholder="Search complaints to verify..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          <div className="vd-tb-actions">
            <div className="vd-tb-user" id="vd-profile">
              <div className="vd-tb-avatar">
                {verifier.profilePhoto ? <img src={toMediaUrl(verifier.profilePhoto)} alt="Profile" /> : initials}
              </div>
              <div>
                <b>{verifier.name}</b>
                <span>{verifier.role}</span>
              </div>
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div className="vd-content">
          {loadError && (
            <div className="vd-error-message" role="alert">
              {loadError}
            </div>
          )}
          {actionMessage && (
            <div className="vd-error-message" role="alert">
              {actionMessage}
            </div>
          )}
          <div className="vd-title-row">
            <div>
              <h1>Welcome back, {verifier.name.split(" ")[0]}</h1>
              <p>
                {verifier.role} · {verifier.ward} · {verifier.contact}
              </p>
            </div>
          </div>

          {/* FIRST GRID ROW: Previous 5 Cards */}
          <div className="vd-stats-row">
            {previousStats.map((stat, i) => (
              <div className={`vd-stat-card tone-${stat.tone}`} key={i}>
                <div className="vd-stat-ic">{stat.icon}</div>
                <div className="vd-stat-num">{stat.value}</div>
                <div className="vd-stat-label">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* SECOND GRID ROW: New 5 Cards */}
          <div className="vd-stats-row" style={{ marginTop: "16px" }}>
            {newStats.map((stat, i) => (
              <div className={`vd-stat-card tone-${stat.tone}`} key={i}>
                <div className="vd-stat-ic">{stat.icon}</div>
                <div className="vd-stat-num">{stat.value}</div>
                <div className="vd-stat-label">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* All citizen and guest complaints available for verifier review */}
          <div className="vd-panel" id="queue-panel">
            <div className="vd-panel-head">
              <h3>All Complaints</h3>
              <span className="vd-panel-link">{filteredItems.length} shown / {items.length} total</span>
            </div>

            <div className="vd-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Complaint</th>
                    <th>Source</th>
                    <th>Category</th>
                    <th>Location / GPS</th>
                    <th>Queue</th>
                    <th>Status</th>
                    <th>Assigned Staff</th>
                    <th>Details / Verify</th>
                    <th>Activity</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
                        No complaints found.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((c) => (
                      <tr
                        key={c.id}
                        className={selectedId === c.id ? "vd-row-active" : ""}
                        onClick={() => setSelectedId(c.id)}
                      >
                        <td className="vd-mono">{c.complaintNumber}</td>
                        <td>{c.citizenId ? "Registered citizen" : "Guest"}</td>
                        <td>
                          <div className="vd-cat">
                            <span className="vd-cat-dot" style={{ background: colorForCategory(c.category) }}></span>
                            {c.issue}
                          </div>
                        </td>
                        <td>
                          <div>{c.location || "Location pending"}</div>
                          {c.coordinates?.latitude != null && c.coordinates?.longitude != null && (
                            <a
                              className="vd-table-map-link"
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${c.coordinates.latitude},${c.coordinates.longitude}`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(event) => event.stopPropagation()}
                            >
                              {c.coordinates.latitude}, {c.coordinates.longitude} · Map
                            </a>
                          )}
                        </td>
                        <td>
                          <span className={`vd-badge vd-badge-${queueTone[c.queue]}`}>{c.queue}</span>
                        </td>
                        <td>
                          <span className={`vd-badge vd-badge-${statusTone[c.status]}`}>{statusLabel[c.status]}</span>
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <select
                            className="vd-assignment-select"
                            aria-label={`Assign staff for complaint ${c.complaintNumber}`}
                            value={getAssignedStaffId(c)}
                            disabled={assignmentSavingId === c.id || staffOptions.length === 0}
                            onChange={(event) => handleAssignStaff(c, event.target.value)}
                          >
                            <option value="">Unassigned</option>
                            {staffOptions.map((staff) => (
                              <option key={staff._id} value={staff._id}>
                                {staff.name}{staff.staffId ? ` · ${staff.staffId}` : ""}
                              </option>
                            ))}
                          </select>
                          {assignmentSavingId === c.id && <small> Saving…</small>}
                        </td>
                        {/* ✅ VERIFY COLUMN */}
                        <td onClick={(e) => e.stopPropagation()}>
                          <button
                            className="vd-verify-btn"
                            type="button"
                            onClick={() => handleQuickVerify(c)}
                            title="Open verification for this complaint"
                          >
                            📄 Details / Verify
                          </button>
                        </td>
                        {/* ✅ ACTIVITY COLUMN */}
                        <td onClick={(e) => e.stopPropagation()}>
                          <button
                            className="vd-activity-btn"
                            type="button"
                            onClick={() => handleShowActivity(c)}
                            title="View activity log"
                          >
                            📜 {c.log?.length || 0}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ✅ ACTIVITY LOG MODAL */}
          {showActivityModal && activityComplaint && (
            <div className="vd-activity-modal-overlay" onClick={handleCloseActivityModal}>
              <div className="vd-activity-modal" onClick={(e) => e.stopPropagation()}>
                <div className="vd-activity-modal-header">
                  <div>
                    <h3>Activity Log</h3>
                    <span className="vd-mono vd-faint">{activityComplaint.complaintNumber}</span>
                  </div>
                  <button className="vd-activity-modal-close" onClick={handleCloseActivityModal}>✕</button>
                </div>
                <div className="vd-activity-modal-body">
                  {activityComplaint.log && activityComplaint.log.length > 0 ? (
                    <div className="vd-activity-list">
                      {activityComplaint.log.map((note, i) => (
                        <div className="vd-activity-item" key={i}>
                          <span className="vd-activity-dot"></span>
                          <div className="vd-activity-content">
                            <b>{note.text}</b>
                            <span>{note.time}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="vd-activity-empty">
                      <p>No activity recorded for this complaint yet.</p>
                    </div>
                  )}
                </div>
                <div className="vd-activity-modal-footer">
                  <button className="vd-btn-outline" onClick={handleCloseActivityModal}>Close</button>
                </div>
              </div>
            </div>
          )}

          {/* QUICK ACTIONS */}
          <div className="vd-quick-row">
            <button className="vd-quick-card" type="button" onClick={() => scrollTo("queue-panel")}>
              <div className="vd-quick-ic navy">🗂️</div>
              <div>
                <h5>View Pending Verifications</h5>
                <p>New, completed, and re-verification queues</p>
              </div>
            </button>
            <button className="vd-quick-card" type="button" onClick={() => openVerification(selected)}>
              <div className="vd-quick-ic saffron">🔍</div>
              <div>
                <h5>Run Physical Verification</h5>
                <p>Compare reported issue with completed work</p>
              </div>
            </button>
            <button
              className="vd-quick-card"
              type="button"
              onClick={() => {
                setShowMapView(true);
                scrollTo("map-section");
              }}
            >
              <div className="vd-quick-ic green">️</div>
              <div>
                <h5>View Location on Map</h5>
                <p>See complaints awaiting verification</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifierDashboard;