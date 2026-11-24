import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "./staffdashboard.css";
import logo from "../assets/logo.jpeg";
import { fetchDashboard, fetchStaffAssignedComplaints, fetchStaffNewComplaints, getStoredUser, getUserId, updateDashboardComplaint, updateDashboardProfile, markDashboardNotificationRead, toMediaUrl, uploadDashboardPhoto } from "../utils/dashboardApi";

// ✅ Import all full-page components
import MyProfile from "../staffprofiledashboard/MyProfile";
import AssignedComplaints from "../staffprofiledashboard/AssignedComplaints";
import ComplaintDetails from "../staffprofiledashboard/ComplaintDetails";
import PhysicalInspection from "../staffprofiledashboard/PhysicalInspection";
import ActionWorkManagement from "../staffprofiledashboard/ActionWorkManagement";
import ComplaintStatus from "../staffprofiledashboard/ComplaintStatus";
import ComplaintHistory from "../staffprofiledashboard/ComplaintHistory";
import Notifications from "../staffprofiledashboard/Notifications";
import LocationMap from "../staffprofiledashboard/LocationMap";
import StaffComplaintDetails from "../staffprofiledashboard/StaffComplaintDetails";
import CompletedWork from "../verifierprofiledashboard/CompletedWork";
import AdminComplaintsMap from "../components/maps/AdminComplaintsMap";
import { isApprovedCompletedWork } from "../utils/completedWork";
import {
  getComplaintMapPinType,
  isComplaintAwaitingVerification,
  isComplaintReworkRequested,
} from "../components/maps/complaintMapMarker";
import { isWithinReportedRange } from "../components/maps/homeComplaintMapFilters";

/* ============================================
   CONSTANTS & CONFIGURATION
   ============================================ */

const stageTone = ["amber", "orange", "orange", "orange", "amber", "green"];
const mapColors = ["#e07b1c", "#2e6cb0", "#1d8a5c", "#c1900a", "#cf4438", "#7a5c9e"];

const colorForCategory = (category) => {
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  return mapColors[Math.abs(hash) % mapColors.length];
};

const priorityTone = { Critical: "red", Urgent: "amber", Normal: "green", High: "red", Medium: "amber", Low: "green" };
const getStaffDisplayStatus = (status) =>
  String(status || "").trim().toLowerCase() === "under action"
    ? "Assigned"
    : status;
// Sidebar keys that live inside the "All Complaints" dropdown
const complaintNavKeys = [
  "new",
  "my",
  "action",
  "updated",
  "history",
];

const stageForComplaintStatus = (status) => {
  const normalized = String(status || "").toLowerCase();
  if (["under verification", "under review", "verified"].includes(normalized)) return 4;
  if (["resolved", "closed"].includes(normalized)) return 5;
  if (normalized === "assigned") return 1;
  if (normalized === "under action") return 2;
  if (normalized === "in progress") return 3;
  if (normalized === "rejected") return 2;
  return 0;
};

const mapStaffComplaint = (complaint) => ({
  ...complaint,
  stage: stageForComplaintStatus(complaint.status),
  verifierRemarks: [...(complaint.statusHistory || [])]
    .reverse()
    .find((entry) => entry.status === "Rejected")?.remarks || complaint.verifierRemarks || "",
  inspection: complaint.inspection || {
    remarks: "",
    sitePhoto: complaint.images?.[0] || "",
    actionTaken: "",
    completionPhoto: "",
    inspectionDate: "",
    completionDate: "",
  },
});

const StaffMapWorkUpload = ({ complaint, onSubmitWork, translate }) => {
  const [afterPhoto, setAfterPhoto] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const status = String(complaint.status || "").trim().toLowerCase();
  if (["verified", "resolved", "closed", "under verification", "under review", "submitted"].includes(status)) return null;

  const handlePhotoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    setSuccess("");
    try {
      const uploaded = await uploadDashboardPhoto(file);
      setAfterPhoto(uploaded.publicUrl);
    } catch (uploadError) {
      setError(uploadError.message || translate("staff_dashboard.map_upload_error"));
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const submitForVerification = async () => {
    if (!afterPhoto) {
      setError(translate("staff_dashboard.map_after_photo_required"));
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await onSubmitWork(complaint.id, afterPhoto);
      setSuccess(translate("staff_dashboard.map_verification_sent"));
    } catch (submitError) {
      setError(submitError.message || translate("staff_dashboard.map_verification_send_error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="sd-map-work-upload">
      <label htmlFor={`staff-after-photo-${complaint.id}`}>
        {translate("staff_dashboard.map_after_work_photo")}
      </label>
      <input
        id={`staff-after-photo-${complaint.id}`}
        type="file"
        accept="image/*"
        onChange={handlePhotoUpload}
        disabled={uploading || saving}
      />
      {afterPhoto && (
        <img src={toMediaUrl(afterPhoto)} alt={translate("staff_dashboard.map_after_work_photo")} />
      )}
      {error && <small className="sd-map-work-error" role="alert">{error}</small>}
      {success && <small className="sd-map-work-success" role="status">{success}</small>}
      <button type="button" onClick={submitForVerification} disabled={uploading || saving || !afterPhoto}>
        {saving
          ? translate("staff_dashboard.map_sending")
          : translate("staff_dashboard.map_send_verification")}
      </button>
    </div>
  );
};

/* ============================================
   MAIN COMPONENT
   ============================================ */
const StaffDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const staffStages = t('lifecycle.staff_stages', { returnObjects: true });

  const storedUser = getStoredUser();
  const [staff, setStaff] = useState({
    name: storedUser.name || "",
    role: storedUser.designation || storedUser.role || "",
    contact: storedUser.contact || storedUser.mobile || "",
    ward: storedUser.assignedArea || "",
    staffId: storedUser.staffId || "",
    department: storedUser.department || "",
    email: storedUser.email || "",
    joinDate: storedUser.joiningDate || "",
    profilePhoto: storedUser.profilePhoto || "",
  });

  const [complaints, setComplaints] = useState([]);
  const [newComplaints, setNewComplaints] = useState([]);
  const [newComplaintsError, setNewComplaintsError] = useState("");
  const [allAssignedComplaints, setAllAssignedComplaints] = useState([]);
  const [assignedComplaintsError, setAssignedComplaintsError] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [dashboardDetailsComplaint, setDashboardDetailsComplaint] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [boundaryGeoJson, setBoundaryGeoJson] = useState(null);
  const [boundaryError, setBoundaryError] = useState(false);
  const [mapReportedRange, setMapReportedRange] = useState("all");
  const [mapStatusFilter, setMapStatusFilter] = useState("All");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Sidebar: "All Complaints" group open/closed
  const [complaintsOpen, setComplaintsOpen] = useState(true);

  // Which sidebar item is currently selected (drives the highlight)
  const [activeNav, setActiveNav] = useState("dashboard");

  const [showProfile, setShowProfile] = useState(false);
  const [showAssignedComplaints, setShowAssignedComplaints] = useState(false);
  const [showNewComplaints, setShowNewComplaints] = useState(false);
  const [showAllAssignedComplaints, setShowAllAssignedComplaints] = useState(false);
  const [showAllAssignedInDashboard, setShowAllAssignedInDashboard] = useState(false);
  const [showComplaintDetails, setShowComplaintDetails] = useState(false);
  const [showCompletedWork, setShowCompletedWork] = useState(false);
  const [showRejectedComplaints, setShowRejectedComplaints] = useState(false);
  const [showPhysicalInspection, setShowPhysicalInspection] = useState(false);
  const [showActionWorkManagement, setShowActionWorkManagement] = useState(false);
  const [showComplaintStatus, setShowComplaintStatus] = useState(false);
  const [showComplaintHistory, setShowComplaintHistory] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationToOpen, setNotificationToOpen] = useState(null);
  const [showLocationMap, setShowLocationMap] = useState(false);

  // Close every sub-view
  const closeAllViews = () => {
    setShowProfile(false);
    setShowAssignedComplaints(false);
    setShowNewComplaints(false);
    setShowAllAssignedComplaints(false);
    setShowComplaintDetails(false);
    setShowCompletedWork(false);
    setShowRejectedComplaints(false);
    setShowPhysicalInspection(false);
    setShowActionWorkManagement(false);
    setShowComplaintStatus(false);
    setShowComplaintHistory(false);
    setShowNotifications(false);
    setShowLocationMap(false);
  };

  const openView = (setter) => {
    closeAllViews();
    setter(true);
  };

  // Open a sub-view AND mark its sidebar item as active
  const selectView = (view, setter) => {
    setActiveNav(view);
    openView(setter);
  };

  // Back to the main dashboard (sidebar stays)
  const returnToDashboard = () => {
    closeAllViews();
    setActiveNav("dashboard");
  };

  useEffect(() => {
    if (!location.state?.openProfile) return;
    selectView("profile", setShowProfile);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate]);

  useEffect(() => {
    if (!dashboardDetailsComplaint) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setDashboardDetailsComplaint(null);
    };
    document.addEventListener("keydown", closeOnEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = "";
    };
  }, [dashboardDetailsComplaint]);

  useEffect(() => {
    let active = true;
    const fetchBoundary = async () => {
      try {
        const response = await fetch("/boundaries/hinjavadi.geojson");
        const boundary = await response.json();
        if (
          !response.ok ||
          boundary?.type !== "FeatureCollection" ||
          !Array.isArray(boundary.features) ||
          !boundary.features.some((feature) =>
            ["Polygon", "MultiPolygon"].includes(feature?.geometry?.type)
          )
        ) throw new Error("Unable to load the Hinjawadi boundary GeoJSON");
        if (active) {
          setBoundaryGeoJson(boundary);
          setBoundaryError(false);
        }
      } catch (error) {
        console.error("Failed to fetch staff map boundary:", error);
        if (active) setBoundaryError(true);
      }
    };
    fetchBoundary();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const loadDashboard = async () => {
      try {
        const user = getStoredUser();
        const data = await fetchDashboard("staff", getUserId(user));
        if (!active) return;
        if (data.profile) {
          setStaff((current) => ({
            ...current,
            ...data.profile,
            contact: data.profile.contact || data.profile.mobile || current.contact,
            staffId: data.profile.staffId || current.staffId,
            role: data.profile.designation || data.profile.role || current.role,
            ward: data.profile.assignedArea || current.ward,
            joinDate: data.profile.joiningDate || current.joinDate,
          }));
        }
        const mapped = (data.complaints || []).map(mapStaffComplaint);
        setComplaints((current) => {
          const existing = new Map(current.map((complaint) => [complaint.id, complaint]));
          return mapped.map((complaint) => {
            const previous = existing.get(complaint.id);
            return previous && JSON.stringify(previous) === JSON.stringify(complaint)
              ? previous
              : complaint;
          });
        });
        setSelectedId((currentId) => mapped.some((complaint) => complaint.id === currentId)
          ? currentId
          : mapped[0]?.id || null);
        setNotifications(data.notifications || []);
      } catch (error) {
        if (active) console.error("Failed to load staff dashboard:", error);
      }
    };
    loadDashboard();
    const refreshTimer = window.setInterval(loadDashboard, 30000);
    return () => {
      active = false;
      window.clearInterval(refreshTimer);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const loadNewComplaints = async () => {
      try {
        const result = await fetchStaffNewComplaints(getUserId(getStoredUser()));
        if (!active) return;
        setNewComplaints((result.complaints || []).map(mapStaffComplaint));
        setNewComplaintsError("");
      } catch (error) {
        if (!active) return;
        console.error("Failed to load unassigned complaints for staff:", error);
        setNewComplaintsError(error.message || "Unable to load new complaints.");
      }
    };
    loadNewComplaints();
    const refreshTimer = window.setInterval(loadNewComplaints, 30000);
    return () => { active = false; window.clearInterval(refreshTimer); };
  }, []);

  useEffect(() => {
    let active = true;
    const loadAllAssignedComplaints = async () => {
      try {
        const result = await fetchStaffAssignedComplaints(getUserId(getStoredUser()));
        if (!active) return;
        setAllAssignedComplaints((result.complaints || []).map(mapStaffComplaint));
        setAssignedComplaintsError("");
      } catch (error) {
        if (!active) return;
        console.error("Failed to load all staff-assigned complaints:", error);
        setAssignedComplaintsError(error.message || "Unable to load assigned complaints.");
      }
    };
    loadAllAssignedComplaints();
    const refreshTimer = window.setInterval(loadAllAssignedComplaints, 30000);
    return () => { active = false; window.clearInterval(refreshTimer); };
  }, []);

  // Keep the complaints dropdown open whenever one of its pages is active
  useEffect(() => {
    if (complaintNavKeys.includes(activeNav)) setComplaintsOpen(true);
  }, [activeNav]);

  const scrollTo = (id) => {
    const element = document.getElementById(id);
    if (element) element.scrollIntoView({ behavior: "smooth" });
  };

  const initials = staff.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  const currentStaffId = String(staff._id || getUserId(storedUser) || "").trim().toLowerCase();
  const assignedComplaints = complaints.filter((complaint) => {
    const assignedStaffId = String(complaint.assignedStaffId || "").trim().toLowerCase();
    if (assignedStaffId) return assignedStaffId === currentStaffId;
    return [staff.name, staff.staffId, currentStaffId].some(
      (identifier) => identifier && String(complaint.assignedStaff || "").trim().toLowerCase() === String(identifier).trim().toLowerCase()
    );
  });
  const completedWorkComplaints = complaints.filter(isApprovedCompletedWork);
  const rejectedComplaints = complaints.filter((complaint) => {
    if (String(complaint.status || "").trim().toLowerCase() !== "rejected") return false;
    const assignedStaffId = String(complaint.assignedStaffId || "").trim().toLowerCase();
    if (assignedStaffId) return assignedStaffId === currentStaffId;
    return [staff.name, staff.staffId, currentStaffId].some(
      (identifier) => identifier && String(complaint.assignedStaff || "").trim().toLowerCase() === String(identifier).trim().toLowerCase()
    );
  });
  const staffActionComplaints = complaints.filter((complaint) => {
    const status = String(complaint.status || "").trim().toLowerCase();
    if (!["assigned", "under action", "in progress", "rejected"].includes(status)) return false;
    const assignedStaffId = String(complaint.assignedStaffId || "").trim().toLowerCase();
    if (assignedStaffId) return assignedStaffId === currentStaffId;
    return [staff.name, staff.staffId, currentStaffId].some(
      (identifier) => identifier && String(complaint.assignedStaff || "").trim().toLowerCase() === String(identifier).trim().toLowerCase()
    );
  });

  const overviewStats = [
    { label: t('staff_dashboard.assigned_complaints'), value: complaints.length, icon: "🗂️", tone: "navy" },
    { label: t('staff_dashboard.active_assignments', 'Active Assignments'), value: assignedComplaints.filter((c) => !["Verified", "Resolved", "Closed"].includes(c.status)).length, icon: "🆕", tone: "navy" },
    { label: t('staff_dashboard.under_inspection', 'Under Inspection'), value: complaints.filter((c) => ["Assigned", "Under Action"].includes(c.status)).length, icon: "🔍", tone: "amber" },
    { label: t('staff_dashboard.work_in_progress', 'Work in Progress'), value: complaints.filter((c) => c.status === "In Progress").length, icon: "⚙️", tone: "orange" },
    { label: t('staff_dashboard.pending_verification', 'Pending Verification'), value: complaints.filter((c) => c.status === "Under Verification").length, icon: "⏳", tone: "amber" },
    { label: t('staff_dashboard.completed_work', 'Completed Work'), value: complaints.filter((c) => ["Verified", "Resolved", "Closed"].includes(c.status)).length, icon: "✅", tone: "green" },
  ];

  // Every complaint-related tab lives inside one "All Complaints" group
  const complaintTabs = [
    { key: "new", icon: "🆕", label: t('staff_dashboard.new_complaints'), setter: setShowNewComplaints, badge: newComplaints.length },
    { key: "my", icon: "🗂️", label: t('staff_dashboard.my_complaints'), setter: setShowAssignedComplaints, badge: staffActionComplaints.length },
    { key: "action", icon: "⚙️", label: t('staff_dashboard.action_work_management'), setter: setShowActionWorkManagement, badge: staffActionComplaints.length },
    { key: "completed", icon: "✅", label: t('staff_dashboard.completed_work', 'Completed Work'), setter: setShowCompletedWork, badge: completedWorkComplaints.length },
    { key: "rejected", icon: "🔄", label: t('staff_dashboard.rejected_complaints', 'Rejected Complaints'), setter: setShowRejectedComplaints, badge: rejectedComplaints.length },
    { key: "history", icon: "🕘", label: t('staff_dashboard.complaint_history'), setter: setShowComplaintHistory },
  ];

  const staffMapComplaints = useMemo(
    () => complaints
      .filter((complaint) => {
        const latitude = Number(complaint.coordinates?.latitude);
        const longitude = Number(complaint.coordinates?.longitude);
        return complaint.coordinates?.latitude !== null &&
          complaint.coordinates?.latitude !== undefined &&
          complaint.coordinates?.latitude !== "" &&
          complaint.coordinates?.longitude !== null &&
          complaint.coordinates?.longitude !== undefined &&
          complaint.coordinates?.longitude !== "" &&
          Number.isFinite(latitude) &&
          latitude >= -90 &&
          latitude <= 90 &&
          Number.isFinite(longitude) &&
          longitude >= -180 &&
          longitude <= 180;
      })
      .map((complaint) => ({
        ...complaint,
        lat: Number(complaint.coordinates.latitude),
        lng: Number(complaint.coordinates.longitude),
      })),
    [complaints]
  );
  const staffMapCenter = staffMapComplaints.length
    ? { lat: staffMapComplaints[0].lat, lng: staffMapComplaints[0].lng }
    : null;
  const mapStatusOptions = ["All", "Assigned", "Under Verification", "Resolved", "Rejected"];
  const filteredStaffMapComplaints = useMemo(() => staffMapComplaints
    .filter((complaint) => {
      if (mapStatusFilter === "All") return true;
      if (mapStatusFilter === "Under Verification") return isComplaintAwaitingVerification(complaint);
      if (mapStatusFilter === "Assigned") {
        return getComplaintMapPinType(complaint) === "assigned" &&
          !isComplaintAwaitingVerification(complaint) &&
          !isComplaintReworkRequested(complaint);
      }
      if (mapStatusFilter === "New") {
        return getComplaintMapPinType(complaint) === "open";
      }
      if (mapStatusFilter === "Resolved") return ["resolved", "closed", "verified", "notified"].includes(String(complaint.status || "").trim().toLowerCase());
      if (mapStatusFilter === "Rejected") return isComplaintReworkRequested(complaint);
      return false;
    })
    .filter((complaint) => isWithinReportedRange(complaint, mapReportedRange))
    .map((complaint) => ({
      ...complaint,
      lat: Number(complaint.lat),
      lng: Number(complaint.lng),
    })), [mapReportedRange, mapStatusFilter, staffMapComplaints]);

  const normalizedSearchTerm = searchTerm.toLowerCase();
  const filteredComplaints = complaints.filter((c) =>
    String(c.complaintNumber || "").toLowerCase().includes(normalizedSearchTerm) ||
    String(c.issue || "").toLowerCase().includes(normalizedSearchTerm) ||
    String(c.location || "").toLowerCase().includes(normalizedSearchTerm) ||
    String(c.citizenName || "").toLowerCase().includes(normalizedSearchTerm) ||
    String(c.assignedStaff || "").toLowerCase().includes(normalizedSearchTerm) ||
    String(c.assignedVerifier || "").toLowerCase().includes(normalizedSearchTerm) ||
    String(c.status || "").toLowerCase().includes(normalizedSearchTerm)
  );

  const applyComplaintUpdate = (id, updatedComplaint) => {
    if (!updatedComplaint) return;
    const mappedComplaint = mapStaffComplaint(updatedComplaint);
    setComplaints((current) => current.map((complaint) => (
      complaint.id === id ? { ...complaint, ...mappedComplaint } : complaint
    )));
  };

  const handleDeleteDraft = (id) => {
    setComplaints(complaints.filter((c) => c.id !== id));
    setConfirmDeleteId(null);
    if (selectedId === id && complaints.length > 1) {
      setSelectedId(complaints.find((c) => c.id !== id).id);
    }
  };

  const handleLogout = () => {
    if (window.confirm(t('staff_dashboard.confirm_logout'))) {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      localStorage.removeItem("staffData");
      window.location.href = "/login";
    }
  };

  const handleUpdateProfile = async (updatedStaff) => {
    try {
      const data = await updateDashboardProfile(getUserId(storedUser), {
        name: updatedStaff.name, designation: updatedStaff.role, assignedArea: updatedStaff.ward,
        contact: updatedStaff.contact, email: updatedStaff.email,
      });
      setStaff((current) => ({
        ...current, ...updatedStaff, ...(data.user || {}),
        role: data.user?.designation || updatedStaff.role, staffId: current.staffId, department: current.department,
      }));
    } catch (error) { console.error("Failed to update staff profile:", error); throw error; }
  };

  const handleSaveInspection = async (complaintId, formData) => {
    try {
      const result = await updateDashboardComplaint(complaintId, {
        status: ["New", "Pending", "Under Action", "In Progress", "Under Verification", "Resolved"][formData.newStage],
        inspection: {
          inspectionDate: formData.inspectionDate, completionDate: formData.completionDate,
          remarks: formData.remarks, actionTaken: formData.actionTaken,
          sitePhoto: formData.sitePhoto, completionPhoto: formData.completionPhoto,
        },
      });
      applyComplaintUpdate(complaintId, result.complaint);
      return result;
    } catch (error) { console.error("Failed to save physical inspection:", error); throw error; }
  };

  const handleUpdateWork = async (complaintId, formData) => {
    try {
      const complaint = complaints.find((item) => String(item.id) === String(complaintId));
      const result = await updateDashboardComplaint(complaintId, {
        status: ["New", "Pending", "Under Action", "In Progress", "Under Verification", "Resolved"][formData.newStage],
        inspection: {
          inspectionDate: formData.inspectionDate || "", completionDate: formData.completionDateTime,
          remarks: formData.remarks, actionTaken: formData.actionTaken,
          sitePhoto: complaint?.inspection?.sitePhoto || "", completionPhoto: formData.afterPhoto,
        },
      });
      applyComplaintUpdate(complaintId, result.complaint);
      return result;
    } catch (error) { console.error("Failed to save work update:", error); throw error; }
  };

  const handleSubmitMapWorkForVerification = async (complaintId, afterPhoto) => {
    const complaint = complaints.find((item) => String(item.id) === String(complaintId));
    if (!complaint) throw new Error(t("staff_dashboard.map_complaint_not_found"));
    const result = await updateDashboardComplaint(complaintId, {
      status: "Under Verification",
      inspection: {
        ...(complaint.inspection || {}),
        completionDate: new Date().toISOString(),
        completionPhoto: afterPhoto,
      },
    });
    applyComplaintUpdate(complaintId, result.complaint);
    return result;
  };

  const handleResubmitRework = async (complaintId, reworkData) => {
    const complaint = complaints.find((item) => String(item.id) === String(complaintId));
    if (!complaint) throw new Error(t("staff_dashboard.map_complaint_not_found"));
    const result = await updateDashboardComplaint(complaintId, {
      status: "Under Verification",
      inspection: {
        ...(complaint.inspection || {}),
        completionDate: new Date().toISOString(),
        completionPhoto: reworkData.afterPhoto,
        actionTaken: reworkData.actionTaken,
      },
    });
    applyComplaintUpdate(complaintId, result.complaint);
    return result;
  };

  const handleSubmitStaffWorkForVerification = async (complaintId, workData) => {
    const complaint = complaints.find((item) => String(item.id) === String(complaintId));
    if (!complaint) throw new Error(t("staff_dashboard.map_complaint_not_found"));
    const status = String(complaint.status || "").trim().toLowerCase();
    if (["under verification", "under review", "submitted", "verified", "approved", "resolved", "closed"].includes(status)) {
      throw new Error(t("staff_dashboard.work_not_available_for_verification", "This complaint cannot be submitted for verification again."));
    }
    const result = await updateDashboardComplaint(complaintId, {
      status: "Under Verification",
      inspection: {
        ...(complaint.inspection || {}),
        completionDate: new Date().toISOString(),
        completionPhoto: workData.afterPhoto,
        actionTaken: workData.actionTaken,
      },
    });
    applyComplaintUpdate(complaintId, result.complaint);
    return result;
  };

  const handleMarkAsRead = async (id) => {
    await markDashboardNotificationRead(id);
    setNotifications((current) => current.map((notification) => (
      notification.id === id ? { ...notification, isRead: true } : notification
    )));
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter((notification) => !notification.isRead);
    const results = await Promise.allSettled(unread.map((notification) => markDashboardNotificationRead(notification.id)));
    const successfulIds = new Set(results.flatMap((result, index) => result.status === "fulfilled" ? [unread[index].id] : []));
    setNotifications((current) => current.map((notification) => (
      successfulIds.has(notification.id) ? { ...notification, isRead: true } : notification
    )));
    const failures = results.filter((result) => result.status === "rejected");
    if (failures.length) console.error("Failed to mark some staff notifications as read:", failures);
  };

  /* ============================================
   ✅ SIDEBAR (shared by the dashboard AND every sub-view)
   ============================================ */
  const sidebarMarkup = (
    <aside className="sd-sidebar">
      <div className="sd-sb-brand">
        <a href="https://myroadindia.com/" target="_blank" rel="noopener noreferrer" className="sd-sb-logo sd-sb-logo-button" aria-label="MyRoad India website">
          <img src={logo} alt="My Road India Logo" />
        </a>
        <div>
          <b>{t('staff_dashboard.brand')}</b>
          <span>{t('staff_dashboard.staff_portal')}</span>
        </div>
      </div>

      <div className="sd-sb-label">{t('staff_dashboard.overview')}</div>
      <nav className="sd-sb-nav">
        <button
          type="button"
          className={`sd-sb-link ${activeNav === "dashboard" ? "active" : ""}`}
          onClick={() => { returnToDashboard(); scrollTo("sd-top"); }}
        >
          <span className="sd-sb-ic">📊</span>
          <span className="sd-sb-text">{t('staff_dashboard.dashboard')}</span>
        </button>
        <button
          type="button"
          className={`sd-sb-link ${activeNav === "profile" ? "active" : ""}`}
          onClick={() => selectView("profile", setShowProfile)}
        >
          <span className="sd-sb-ic">👤</span>
          <span className="sd-sb-text">{t('staff_dashboard.my_profile')}</span>
        </button>
      </nav>

      <div className="sd-sb-label">{t('staff_dashboard.complaints', 'Complaints')}</div>
      <nav className="sd-sb-nav">
        <div className={`sd-sb-group ${complaintsOpen ? "open" : ""} ${complaintNavKeys.includes(activeNav) ? "has-active" : ""}`}>
          <button
            type="button"
            className="sd-sb-link sd-sb-group-toggle"
            onClick={() => setComplaintsOpen((open) => !open)}
            aria-expanded={complaintsOpen}
          >
            <span className="sd-sb-ic">📋</span>
            <span className="sd-sb-text">{t('staff_dashboard.all_complaints', 'All Complaints')}</span>
            <span className="sd-sb-badge">{newComplaints.length}</span>
            <span className="sd-sb-chevron" aria-hidden="true">▾</span>
          </button>

          <div className="sd-sb-sub">
            <div className="sd-sb-sub-inner">
              {complaintTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  className={`sd-sb-link sd-sb-sublink ${activeNav === tab.key ? "active" : ""}`}
                  onClick={() => selectView(tab.key, tab.setter)}
                >
                  <span className="sd-sb-ic">{tab.icon}</span>
                  <span className="sd-sb-text">{tab.label}</span>
                  {tab.badge !== undefined && <span className="sd-sb-badge">{tab.badge}</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      </nav>

      <div className="sd-sb-label">{t('staff_dashboard.activity_alerts')}</div>
      <nav className="sd-sb-nav">
        <button
          type="button"
          className={`sd-sb-link ${activeNav === "notifications" ? "active" : ""}`}
          onClick={() => { setNotificationToOpen(null); selectView("notifications", setShowNotifications); }}
        >
          <span className="sd-sb-ic">🔔</span>
          <span className="sd-sb-text">{t('staff_dashboard.notifications')}</span>
          <span className="sd-sb-badge">{notifications.filter((n) => !n.isRead).length}</span>
        </button>
        <button type="button" className="sd-sb-link" onClick={handleLogout} style={{ color: "#ff6b6b", marginTop: "8px" }}>
          <span className="sd-sb-ic">🚪</span>
          <span className="sd-sb-text">{t('staff_dashboard.logout')}</span>
        </button>
      </nav>

      <div className="sd-sb-footer">
        <div className="sd-sb-user">
          <div className="sd-sb-avatar">{staff.profilePhoto ? <img src={toMediaUrl(staff.profilePhoto)} alt="Profile" /> : initials}</div>
          <div className="sd-sb-user-info"><b>{staff.name}</b><span>{staff.email}</span></div>
        </div>
        <div className="sd-sb-ward">{staff.role} · {staff.ward}</div>
      </div>
    </aside>
  );

  /* ============================================
   ✅ SUB-VIEW WRAPPER: sidebar stays on the left,
   the clicked page opens in the right-hand area.
   If a page component draws its own sidebar/topbar, the CSS
   block at the end of staffdashboard.css hides it.
   ============================================ */
  const renderWithSidebar = (content) => (
    <div className="sd-shell">
      {sidebarMarkup}
      <div className="sd-main">
        <div className="sd-topbar sd-topbar-end">
          <div className="sd-tb-user">
            <div className="sd-tb-avatar">{staff.profilePhoto ? <img src={toMediaUrl(staff.profilePhoto)} alt="Profile" /> : initials}</div>
            <div><b>{staff.name}</b><span>{staff.role}</span></div>
          </div>
        </div>
        <main className="sd-content sd-subview-content">{content}</main>
      </div>
    </div>
  );

  /* ============================================
   ✅ CONDITIONAL RENDERING (each page opens beside the sidebar)
   ============================================ */
  if (showProfile) return renderWithSidebar(<MyProfile initialStaff={staff} onBack={returnToDashboard} onUpdate={handleUpdateProfile} />);
  if (showAssignedComplaints) return renderWithSidebar(
    <AssignedComplaints
      complaints={staffActionComplaints}
      staffId={staff.staffId}
      staffName={staff.name}
      staffUserId={getUserId(storedUser)}
      onBack={returnToDashboard}
      submissionMode
      onSubmitWork={handleSubmitStaffWorkForVerification}
    />
  );
  if (showNewComplaints) return renderWithSidebar(<AssignedComplaints complaints={newComplaints} staffId={staff.staffId} staffName={staff.name} staffUserId={getUserId(storedUser)} onBack={returnToDashboard} newAssignments loadError={newComplaintsError} />);
  if (showAllAssignedComplaints) return renderWithSidebar(<AssignedComplaints complaints={allAssignedComplaints} staffId={staff.staffId} staffName={staff.name} staffUserId={getUserId(storedUser)} onBack={returnToDashboard} allAssigned loadError={assignedComplaintsError} />);
  if (showCompletedWork) return renderWithSidebar(<CompletedWork complaints={complaints.filter(isApprovedCompletedWork)} onBack={returnToDashboard} />);
  if (showRejectedComplaints) {
    const currentStaffId = String(staff._id || getUserId(storedUser) || "").trim().toLowerCase();
    const rejectedComplaints = complaints.filter((complaint) => {
      const status = String(complaint.status || "").trim().toLowerCase();
      const assignedStaffId = String(complaint.assignedStaffId || "").trim().toLowerCase();
      if (status !== "rejected") return false;
      if (assignedStaffId) return assignedStaffId === currentStaffId;
      return [staff.name, staff.staffId, currentStaffId].some((value) =>
        String(value || "").trim() &&
        String(complaint.assignedStaff || "").trim().toLowerCase() === String(value).trim().toLowerCase()
      );
    });
    return renderWithSidebar(
      <AssignedComplaints
        complaints={rejectedComplaints}
        staffId={staff.staffId}
        staffName={staff.name}
        staffUserId={getUserId(storedUser)}
        onBack={returnToDashboard}
        rejectedMode
        onResubmitRejected={handleResubmitRework}
      />
    );
  }
  if (showComplaintDetails) return renderWithSidebar(<ComplaintDetails complaints={complaints} onBack={returnToDashboard} />);
  if (showPhysicalInspection) return renderWithSidebar(<PhysicalInspection complaints={complaints} onBack={returnToDashboard} onSaveInspection={handleSaveInspection} />);
  if (showActionWorkManagement) return renderWithSidebar(<ActionWorkManagement complaints={staffActionComplaints} onBack={returnToDashboard} onUpdateWork={handleUpdateWork} />);
  if (showComplaintStatus) return renderWithSidebar(<ComplaintStatus complaints={complaints} onBack={returnToDashboard} onWorkUpdate={handleUpdateWork} />);
  if (showComplaintHistory) return renderWithSidebar(<ComplaintHistory complaints={complaints} selectedId={selectedId} onBack={returnToDashboard} />);
  if (showNotifications) return renderWithSidebar(<Notifications notifications={notifications} initialSelectedNotification={notificationToOpen} onInitialSelectionHandled={() => setNotificationToOpen(null)} onBack={returnToDashboard} onMarkAsRead={handleMarkAsRead} onMarkAllRead={handleMarkAllRead} />);
  if (showLocationMap) return renderWithSidebar(<LocationMap complaints={complaints} ward={staff.ward} onBack={returnToDashboard} />);

  /* ============================================
   ✅ MAIN DASHBOARD RENDER
   ============================================ */
  return (
    <div className="sd-shell">
      {sidebarMarkup}

      <div className="sd-main" id="sd-top">
        <div className="sd-topbar">
          <div className="sd-search">
            <input type="text" placeholder={t('staff_dashboard.search_placeholder')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div className="sd-tb-actions">
            <button type="button" className="sd-icon-btn" aria-label={t('staff_dashboard.assigned_locations', { ward: staff.ward })} onClick={() => scrollTo("map-section")}>🗺️</button>
            <div className="sd-tb-user" id="sd-profile">
              <div className="sd-tb-avatar">{staff.profilePhoto ? <img src={toMediaUrl(staff.profilePhoto)} alt="Profile" /> : initials}</div>
              <div><b>{staff.name}</b><span>{staff.role}</span></div>
            </div>
          </div>
        </div>

        <div className="sd-content">
          <div className="sd-title-row">
            <div>
              <h1>{t('staff_dashboard.welcome_back', { name: staff.name.split(" ")[0] })}</h1>
              <p>{staff.role} · {staff.ward} · {staff.contact}</p>
            </div>
          </div>

          <div className="sd-stats-row">
            {overviewStats.map((stat, i) => (
              <div className={`sd-stat-card tone-${stat.tone}`} key={i}>
                <div className="sd-stat-ic">{stat.icon}</div>
                <div className="sd-stat-num">{stat.value}</div>
                <div className="sd-stat-label">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="sd-panel sd-assigned-table-panel" id="assigned-work" style={{ marginBottom: "16px" }}>
            <div className="sd-panel-head">
              <h3>{t('staff_dashboard.all_assigned_complaints', 'All Assigned Complaints')}</h3>
              <span className="sd-panel-link">{filteredComplaints.length} {t('staff_dashboard.total')}</span>
            </div>
            <div className="sd-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{t('staff_dashboard.col_complaint')}</th>
                    <th>{t('staff_dashboard.col_category')}</th>
                    <th>{t('staff_dashboard.col_location')}</th>
                    <th>{t('staff_dashboard.col_priority')}</th>
                    <th>{t('staff_dashboard.col_status')}</th>
                    <th>{t('staff_dashboard.col_assigned_staff')}</th>
                    <th>{t('staff_dashboard.col_actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(showAllAssignedInDashboard ? filteredComplaints : filteredComplaints.slice(0, 5)).map((c) => (
                    <React.Fragment key={c.id}>
                      <tr className={selectedId === c.id ? "sd-row-active" : ""} onClick={() => setSelectedId(c.id)}>
                        <td className="sd-mono">{c.complaintNumber}</td>
                        <td>
                          <div className="sd-cat">
                            <span className="sd-cat-dot" style={{ background: colorForCategory(c.category) }}></span>
                            {c.issue}
                          </div>
                        </td>
                        <td>{c.location || t('staff_dashboard.location_pending')}</td>
                        <td><span className={`sd-badge sd-badge-${priorityTone[c.priority]}`}>{c.priority}</span></td>
                        <td><span className={`sd-badge sd-badge-${stageTone[c.stage] || "navy"}`}>{getStaffDisplayStatus(c.status) || staffStages[c.stage] || t('staff_dashboard.unknown')}</span></td>
                        <td>{c.assignedStaff || t('staff_dashboard.not_assigned')}</td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="sd-row-actions">
                            <button className="sd-btn-outline small" type="button" title={`View full details for ${c.complaintNumber}`} onClick={() => {
                              setSelectedId(c.id);
                              setDashboardDetailsComplaint(c);
                            }}>
                              {t('staff_dashboard.view_details')}
                            </button>
                            {c.stage === 0 && c.isDraft && (
                              <button className="sd-icon-btn small danger" type="button" onClick={() => setConfirmDeleteId(c.id)} title="Remove draft">🗑️</button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {confirmDeleteId === c.id && (
                        <tr className="sd-edit-row">
                          <td colSpan={7}>
                            <div className="sd-delete-confirm">
                              <span>{t('staff_dashboard.remove_draft_confirm')}</span>
                              <div>
                                <button className="sd-btn-outline small" type="button" onClick={() => setConfirmDeleteId(null)}>{t('staff_dashboard.no')}</button>
                                <button className="sd-btn-danger small" type="button" onClick={() => handleDeleteDraft(c.id)}>{t('staff_dashboard.yes_remove')}</button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredComplaints.length > 5 && (
              <div className="sd-assigned-table-footer">
                <button
                  className="sd-assigned-view-more"
                  type="button"
                  onClick={() => setShowAllAssignedInDashboard((showAll) => !showAll)}
                >
                  {showAllAssignedInDashboard
                    ? t('staff_dashboard.view_less', 'View Less')
                    : t('staff_dashboard.view_more', 'View More')}
                </button>
              </div>
            )}
          </div>

          <div className="sd-panel sd-map-panel" id="map-section" style={{ marginTop: "24px" }}>
              <div className="sd-panel-head">
                <h3>{t('staff_dashboard.assigned_locations', { ward: staff.ward })}</h3>
                <span className="sd-panel-link">{t("admin_dashboard.complaints_on_map", { count: filteredStaffMapComplaints.length })}</span>
              </div>
              <div className="sd-map-legend">
                <span>📍 {t("admin_dashboard.map_red_pins_legend")}</span>
                <span><i className="verification-map-legend-pin" aria-hidden="true" />{t("admin_dashboard.map_verification_pins_legend")}</span>
                <span><i className="rework-map-legend-pin" aria-hidden="true" />{t("admin_dashboard.map_rework_pins_legend")}</span>
                <span className="sd-map-legend-hint">💡 {t("admin_dashboard.map_click_pin_legend")}</span>
              </div>
              {boundaryError && (
                <div className="sd-map-error" role="alert">
                  {t("admin_dashboard.map_boundary_load_error")}
                </div>
              )}
              <div className="sd-map-container">
                {filteredStaffMapComplaints.length === 0 ? (
                  <div className="sd-empty-note">{t('staff_dashboard.no_coordinates')}</div>
                ) : (
                  <AdminComplaintsMap
                    complaints={filteredStaffMapComplaints}
                    center={staffMapCenter}
                    boundaryGeoJson={boundaryGeoJson}
                    mapClassName="sd-complaints-map"
                    translate={t}
                    reportedRange={mapReportedRange}
                    onReportedRangeChange={setMapReportedRange}
                    mapStatusFilter={mapStatusFilter}
                    onMapStatusFilterChange={setMapStatusFilter}
                    statusOptions={mapStatusOptions}
                    onResetFilters={() => {
                      setMapStatusFilter("All");
                      setMapReportedRange("all");
                    }}
                    renderPopupActions={(complaint) => (
                      <StaffMapWorkUpload
                        key={`${complaint.id}-staff-work-upload`}
                        complaint={complaint}
                        onSubmitWork={handleSubmitMapWorkForVerification}
                        translate={t}
                      />
                    )}
                  />
                )}
              </div>
          </div>

        </div>
      </div>
      {dashboardDetailsComplaint && (
        <div
          className="sd-details-modal-overlay"
          role="presentation"
          onClick={() => setDashboardDetailsComplaint(null)}
        >
          <section
            className="sd-details-modal"
            role="dialog"
            aria-modal="true"
            aria-label={dashboardDetailsComplaint.complaintNumber || "Complaint details"}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="sd-details-modal-header">
              <h2>
                {t("assignedComplaints.completeComplaintDetails", {
                  number: dashboardDetailsComplaint.complaintNumber || t("assignedComplaints.notAvailable"),
                })}
              </h2>
              <button
                type="button"
                className="sd-details-modal-close"
                aria-label={t("assignedComplaints.close")}
                onClick={() => setDashboardDetailsComplaint(null)}
              >
                ×
              </button>
            </header>
            <div className="sd-details-modal-body">
              <StaffComplaintDetails
                complaint={dashboardDetailsComplaint}
                layout="split"
                showActivity={false}
              />
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default StaffDashboard;