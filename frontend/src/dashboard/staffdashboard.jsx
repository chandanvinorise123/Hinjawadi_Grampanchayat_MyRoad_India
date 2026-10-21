import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import "./staffdashboard.css";
import logo from "../assets/logo.jpeg";
import { fetchDashboard, fetchStaffAssignedComplaints, getStoredUser, getUserId, updateDashboardComplaint, updateDashboardProfile, markDashboardNotificationRead, uploadDashboardPhoto, toMediaUrl } from "../utils/dashboardApi";

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
import ComplaintMapInfoWindow from "../components/maps/ComplaintMapInfoWindow";
import { getComplaintMapMarkerIcon } from "../components/maps/complaintMapMarker";

/* ============================================
   CONSTANTS & CONFIGURATION
   ============================================ */
const lifecycleStages = [
  "Action Initiated",
  "Work In Progress",
  "Work Completed",
  "After-Repair Upload",
  "Verification",
  "Work Resolved / Closed",
];

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
const staffMapContainerStyle = { width: "100%", height: "400px", borderRadius: "8px" };
const GOOGLE_MAPS_LIBRARIES = ["places"];

const stageForComplaintStatus = (status) => {
  const normalized = String(status || "").toLowerCase();
  if (["under verification", "under review", "verified"].includes(normalized)) return 4;
  if (["resolved", "closed"].includes(normalized)) return 5;
  if (normalized === "assigned") return 1;
  if (normalized === "under action") return 2;
  if (normalized === "in progress") return 3;
  if (normalized === "rejected") return 1;
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

/* ============================================
   MAIN COMPONENT
   ============================================ */
const StaffDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoaded: isStaffMapLoaded, loadError: staffMapError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries: GOOGLE_MAPS_LIBRARIES,
  });
  // ✅ Staff Information
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

  // ✅ State Management
  const [complaints, setComplaints] = useState([]);
  const [allAssignedComplaints, setAllAssignedComplaints] = useState([]);
  const [assignedComplaintsError, setAssignedComplaintsError] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedMapComplaint, setSelectedMapComplaint] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showMapView, setShowMapView] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [inspectionDraft, setInspectionDraft] = useState(null);
  const [inspectionError, setInspectionError] = useState("");

  // ✅ Full Page Navigation States
  const [showProfile, setShowProfile] = useState(false);
  const [showAssignedComplaints, setShowAssignedComplaints] = useState(false);
  const [showAllAssignedComplaints, setShowAllAssignedComplaints] = useState(false);
  const [showComplaintDetails, setShowComplaintDetails] = useState(false);
  const [showPhysicalInspection, setShowPhysicalInspection] = useState(false);
  const [showActionWorkManagement, setShowActionWorkManagement] = useState(false);
  const [showComplaintStatus, setShowComplaintStatus] = useState(false);
  const [showComplaintHistory, setShowComplaintHistory] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLocationMap, setShowLocationMap] = useState(false);

  const openView = (setter) => {
    setShowProfile(false);
    setShowAssignedComplaints(false);
    setShowAllAssignedComplaints(false);
    setShowComplaintDetails(false);
    setShowPhysicalInspection(false);
    setShowActionWorkManagement(false);
    setShowComplaintStatus(false);
    setShowComplaintHistory(false);
    setShowNotifications(false);
    setShowLocationMap(false);
    setter(true);
  };

  useEffect(() => {
    if (!location.state?.openProfile) return;
    openView(setShowProfile);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate]);

  const selected = complaints.find((c) => c.id === selectedId) || complaints[0] || {
    id: null, complaintNumber: "", category: "", issue: "", location: "",
    priority: "", dueDate: "", stage: 0, citizenName: "", citizenContact: "",
    description: "", citizenPhotos: [], inspection: { remarks: "", sitePhoto: "", actionTaken: "", completionPhoto: "" },
  };

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
    const loadAllAssignedComplaints = async () => {
      try {
        const result = await fetchStaffAssignedComplaints(getUserId(getStoredUser()));
        if (!active) return;
        setAllAssignedComplaints(
          (result.complaints || []).map(mapStaffComplaint)
        );
        setAssignedComplaintsError("");
      } catch (error) {
        if (!active) return;
        console.error("Failed to load all staff-assigned complaints:", error);
        setAssignedComplaintsError(
          error.message || "Unable to load assigned complaints."
        );
      }
    };

    loadAllAssignedComplaints();
    const refreshTimer = window.setInterval(loadAllAssignedComplaints, 30000);
    return () => {
      active = false;
      window.clearInterval(refreshTimer);
    };
  }, []);

  // ✅ Helper Functions
  const scrollTo = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const initials = staff.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // ✅ Dashboard Stats
  const currentStaffId = String(staff._id || getUserId(storedUser) || "").trim().toLowerCase();
  const assignedComplaints = complaints.filter((complaint) => {
    const assignedStaffId = String(complaint.assignedStaffId || "").trim().toLowerCase();
    if (assignedStaffId) return assignedStaffId === currentStaffId;
    return [staff.name, staff.staffId, currentStaffId].some(
      (identifier) => identifier && String(complaint.assignedStaff || "").trim().toLowerCase() === String(identifier).trim().toLowerCase()
    );
  });
  const overviewStats = [
    { label: "Assigned Complaints", value: complaints.length, icon: "🗂️", tone: "navy" },
    { label: "Active Assignments", value: assignedComplaints.filter((c) => !["Verified", "Resolved", "Closed"].includes(c.status)).length, icon: "🆕", tone: "navy" },
    { label: "Under Inspection", value: complaints.filter((c) => ["Assigned", "Under Action"].includes(c.status)).length, icon: "🔍", tone: "amber" },
    { label: "Work in Progress", value: complaints.filter((c) => c.status === "In Progress").length, icon: "️", tone: "orange" },
    { label: "Pending Verification", value: complaints.filter((c) => c.status === "Under Verification").length, icon: "⏳", tone: "amber" },
    { label: "Completed Work", value: complaints.filter((c) => ["Verified", "Resolved", "Closed"].includes(c.status)).length, icon: "✅", tone: "green" },
  ];

  // ✅ Group complaints by location for map
  const mapGroups = complaints.reduce((groups, c) => {
    const key = c.location || "Location pending";
    if (!groups[key]) groups[key] = [];
    groups[key].push(c);
    return groups;
  }, {});
  const hasCoordinates = (complaint) => complaint.coordinates?.latitude !== null
    && complaint.coordinates?.latitude !== undefined
    && complaint.coordinates?.latitude !== ""
    && complaint.coordinates?.longitude !== null
    && complaint.coordinates?.longitude !== undefined
    && Number.isFinite(Number(complaint.coordinates.latitude))
    && Number.isFinite(Number(complaint.coordinates.longitude))
    && Number(complaint.coordinates.latitude) >= -90
    && Number(complaint.coordinates.latitude) <= 90
    && Number(complaint.coordinates.longitude) >= -180
    && Number(complaint.coordinates.longitude) <= 180;
  const mapComplaint = complaints.find(hasCoordinates);
  const staffMapCenter = mapComplaint
    ? { lat: Number(mapComplaint.coordinates.latitude), lng: Number(mapComplaint.coordinates.longitude) }
    : null;

  // ✅ Filter complaints for search
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

  // ✅ Handler Functions
  const applyComplaintUpdate = (id, updatedComplaint) => {
    if (!updatedComplaint) return;
    const mappedComplaint = mapStaffComplaint(updatedComplaint);
    setComplaints((current) => current.map((complaint) => (
      complaint.id === id ? { ...complaint, ...mappedComplaint } : complaint
    )));
  };

  const startInspection = (c) => {
    setSelectedId(c.id);
    setInspectionError("");
    setInspectionDraft({
      id: c.id,
      remarks: c.inspection.remarks,
      sitePhoto: c.inspection.sitePhoto,
      actionTaken: c.inspection.actionTaken,
      completionPhoto: c.inspection.completionPhoto,
      inspectionDate: c.inspection.inspectionDate || new Date().toISOString().slice(0, 16),
      completionDate: c.inspection.completionDate || "",
    });
  };

  const saveInspection = async (e) => {
    e.preventDefault();
    if (!inspectionDraft) return;
    const nextStatus = inspectionDraft.completionPhoto && inspectionDraft.actionTaken.trim()
      ? "Under Verification"
      : "Under Action";
    setInspectionError("");
    try {
      const result = await updateDashboardComplaint(inspectionDraft.id, {
        status: nextStatus,
        inspection: {
          remarks: inspectionDraft.remarks,
          sitePhoto: inspectionDraft.sitePhoto,
          actionTaken: inspectionDraft.actionTaken,
          completionPhoto: inspectionDraft.completionPhoto,
          inspectionDate: inspectionDraft.inspectionDate,
          completionDate: inspectionDraft.completionDate,
        },
      });
      applyComplaintUpdate(inspectionDraft.id, result.complaint);
    } catch (error) {
      console.error("Failed to save inspection:", error);
      setInspectionError(error.message || "Unable to save the inspection record.");
      return;
    }
    setInspectionDraft(null);
  };

  const attachPhoto = async (field, file) => {
    if (!file) return;
    try {
      const uploaded = await uploadDashboardPhoto(file);
      setInspectionDraft((prev) => ({ ...prev, [field]: uploaded.publicUrl }));
    } catch (error) {
      console.error("Failed to upload inspection photo:", error);
      setInspectionError(error.message || "Unable to upload the inspection photo.");
    }
  };

  const advanceStage = async (id) => {
    const complaint = complaints.find((item) => item.id === id);
    const nextStage = (complaint?.stage || 0) + 1;
    const nextStatus = ["New", "Pending", "Under Action", "In Progress", "Under Verification", "Resolved"][nextStage];
    if (nextStatus) {
      try {
        const result = await updateDashboardComplaint(id, { status: nextStatus });
        applyComplaintUpdate(id, result.complaint);
      } catch (error) {
        console.error("Failed to advance complaint:", error);
        return;
      }
    }
  };

  const revertStage = async (id) => {
    const complaint = complaints.find((item) => item.id === id);
    const previousStage = (complaint?.stage || 0) - 1;
    const previousStatus = ["New", "Pending", "Under Action", "In Progress", "Under Verification", "Resolved"][previousStage];
    if (previousStatus) {
      try {
        const result = await updateDashboardComplaint(id, { status: previousStatus });
        applyComplaintUpdate(id, result.complaint);
      } catch (error) {
        console.error("Failed to revert complaint:", error);
        return;
      }
    }
  };

  const handleDeleteDraft = (id) => {
    setComplaints(complaints.filter((c) => c.id !== id));
    setConfirmDeleteId(null);
    if (selectedId === id && complaints.length > 1) {
      setSelectedId(complaints.find((c) => c.id !== id).id);
    }
  };

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      localStorage.removeItem("staffData");
      window.location.href = "/login";
    }
  };

  const handleUpdateProfile = async (updatedStaff) => {
    try {
      const data = await updateDashboardProfile(getUserId(storedUser), {
        name: updatedStaff.name,
        designation: updatedStaff.role,
        assignedArea: updatedStaff.ward,
        contact: updatedStaff.contact,
        email: updatedStaff.email,
      });
      setStaff((current) => ({
        ...current,
        ...updatedStaff,
        ...(data.user || {}),
        role: data.user?.designation || updatedStaff.role,
        staffId: current.staffId,
        department: current.department,
      }));
    } catch (error) {
      console.error("Failed to update staff profile:", error);
      throw error;
    }
  };

  const handleSaveInspection = async (complaintId, formData) => {
    try {
      const result = await updateDashboardComplaint(complaintId, {
        status: ["New", "Pending", "Under Action", "In Progress", "Under Verification", "Resolved"][formData.newStage],
        inspection: {
          inspectionDate: formData.inspectionDate,
          completionDate: formData.completionDate,
          remarks: formData.remarks,
          actionTaken: formData.actionTaken,
          sitePhoto: formData.sitePhoto,
          completionPhoto: formData.completionPhoto,
        },
      });
      applyComplaintUpdate(complaintId, result.complaint);
      return result;
    } catch (error) {
      console.error("Failed to save physical inspection:", error);
      throw error;
    }
  };

  const handleUpdateWork = async (complaintId, formData) => {
    try {
      const result = await updateDashboardComplaint(complaintId, {
        status: ["New", "Pending", "Under Action", "In Progress", "Under Verification", "Resolved"][formData.newStage],
        inspection: {
          inspectionDate: formData.inspectionDate || "",
          completionDate: formData.completionDateTime,
          remarks: formData.remarks,
          actionTaken: formData.actionTaken,
          sitePhoto: formData.beforePhoto,
          completionPhoto: formData.afterPhoto,
        },
      });
      applyComplaintUpdate(complaintId, result.complaint);
      return result;
    } catch (error) {
      console.error("Failed to save work update:", error);
      throw error;
    }
  };

  const handleMarkAsRead = async (id) => {
    await markDashboardNotificationRead(id);
    setNotifications((current) => current.map((notification) => (
      notification.id === id ? { ...notification, isRead: true } : notification
    )));
  };

  const handleMarkAllRead = async () => {
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
    const failures = results.filter((result) => result.status === "rejected");
    if (failures.length) {
      console.error("Failed to mark some staff notifications as read:", failures);
      throw new Error(`Could not update ${failures.length} notification(s). Please retry.`);
    }
  };

  const handleStatusUpdate = async (complaintId, newStage) => {
    const status = ["New", "Pending", "Under Action", "In Progress", "Under Verification", "Resolved"][newStage] || "New";
    try {
      const result = await updateDashboardComplaint(complaintId, { status });
      applyComplaintUpdate(complaintId, result.complaint);
      return result;
    } catch (error) {
      console.error("Failed to update complaint status:", error);
      throw error;
    }
  };

  /* ============================================
   ✅ FULL PAGE CONDITIONAL RENDERING
   ============================================ */
  
  if (showProfile) {
    return (
      <MyProfile
        initialStaff={staff}
        onBack={() => setShowProfile(false)}
        onUpdate={handleUpdateProfile}
      />
    );
  }

  if (showAssignedComplaints) {
    return (
      <AssignedComplaints
        complaints={complaints}
        staffId={staff.staffId}
        staffName={staff.name}
        staffUserId={getUserId(storedUser)}
        onBack={() => setShowAssignedComplaints(false)}
      />
    );
  }

  if (showAllAssignedComplaints) {
    return (
      <AssignedComplaints
        complaints={allAssignedComplaints}
        staffId={staff.staffId}
        staffName={staff.name}
        staffUserId={getUserId(storedUser)}
        onBack={() => setShowAllAssignedComplaints(false)}
        allAssigned
        loadError={assignedComplaintsError}
      />
    );
  }

  if (showComplaintDetails) {
    return (
      <ComplaintDetails
        complaints={complaints}
        onBack={() => setShowComplaintDetails(false)}
      />
    );
  }

  if (showPhysicalInspection) {
    return (
      <PhysicalInspection
        complaints={complaints}
        selectedId={selectedId}
        onBack={() => setShowPhysicalInspection(false)}
        onSaveInspection={handleSaveInspection}
      />
    );
  }

  if (showActionWorkManagement) {
    return (
      <ActionWorkManagement
        complaints={complaints}
        selectedId={selectedId}
        onBack={() => setShowActionWorkManagement(false)}
        onUpdateWork={handleUpdateWork}
      />
    );
  }

  if (showComplaintStatus) {
    return (
      <ComplaintStatus
        complaints={complaints}
        selectedId={selectedId}
        onBack={() => setShowComplaintStatus(false)}
        onStatusUpdate={handleStatusUpdate}
      />
    );
  }

  if (showComplaintHistory) {
    return (
      <ComplaintHistory
        complaints={complaints}
        selectedId={selectedId}
        onBack={() => setShowComplaintHistory(false)}
      />
    );
  }

  if (showNotifications) {
    return (
      <Notifications
        notifications={notifications}
        onBack={() => setShowNotifications(false)}
        onMarkAsRead={handleMarkAsRead}
        onMarkAllRead={handleMarkAllRead}
      />
    );
  }

  if (showLocationMap) {
    return (
      <LocationMap
        complaints={complaints}
        ward={staff.ward}
        onBack={() => setShowLocationMap(false)}
      />
    );
  }

  /* ============================================
   ✅ MAIN DASHBOARD RENDER
   ============================================ */
  return (
    <div className="sd-shell">
      {/* ============ SIDEBAR ============ */}
      <aside className="sd-sidebar">
        <div className="sd-sb-brand">
          <div className="sd-sb-logo">
            <img
              src={logo}
              alt="My Road India Logo"
              style={{ width: "40px", height: "40px", borderRadius: "50%", objectFit: "cover" }}
            />
          </div>
          <div>
            <b>My Road India</b>
            <span>Staff Portal</span>
          </div>
        </div>

        <div className="sd-sb-label">Overview</div>
        <nav className="sd-sb-nav">
          <button type="button" className="sd-sb-link active" onClick={() => scrollTo("sd-top")}>
            📊 Dashboard
          </button>
          <button type="button" className="sd-sb-link" onClick={() => openView(setShowProfile)}>
            👤 My Profile
          </button>
        </nav>

        <div className="sd-sb-label">Assigned Work</div>
        <nav className="sd-sb-nav">
          <button
            type="button"
            className="sd-sb-link"
            onClick={() => openView(setShowAssignedComplaints)}
          >
            🗂️ Complaint Register
            <span className="sd-sb-badge">
              {complaints.length}
            </span>
          </button>
          <button
            type="button"
            className="sd-sb-link"
            onClick={() => openView(setShowAllAssignedComplaints)}
          >
            📋 Complaint Assigned
            <span className="sd-sb-badge">{allAssignedComplaints.length}</span>
          </button>
          <button
            type="button"
            className="sd-sb-link"
            onClick={() => openView(setShowComplaintDetails)}
          >
            📋 ComplaintUpdatedDetails
          </button>
          <button
            type="button"
            className="sd-sb-link"
            onClick={() => openView(setShowPhysicalInspection)}
          >
            🔎 Physical Inspection
          </button>
          <button
            type="button"
            className="sd-sb-link"
            onClick={() => openView(setShowActionWorkManagement)}
          >
            ⚙️Action/Work Management
          </button>
          <button
            type="button"
            className="sd-sb-link"
            onClick={() => openView(setShowComplaintStatus)}
          >
            ⚙️ Complaint Status Update
          </button>
        </nav>

        <div className="sd-sb-label">Activity & Alerts</div>
        <nav className="sd-sb-nav">
          <button
            type="button"
            className="sd-sb-link"
            onClick={() => openView(setShowComplaintHistory)}
          >
            🕘 Complaint History
          </button>
          <button
            type="button"
            className="sd-sb-link"
            onClick={() => openView(setShowNotifications)}
          >
            🔔 Notifications
            <span className="sd-sb-badge">
              {notifications.filter((n) => !n.isRead).length}
            </span>
          </button>
          <button
            type="button"
            className="sd-sb-link"
            onClick={() => openView(setShowLocationMap)}
          >
            🗺️ View Location on Map
          </button>
          <button
            type="button"
            className="sd-sb-link"
            onClick={handleLogout}
            style={{ color: "#ff6b6b", marginTop: "8px" }}
          >
            🚪 Logout
          </button>
        </nav>

        <div className="sd-sb-footer">
          <div className="sd-sb-user">
            <div className="sd-sb-avatar">
              {staff.profilePhoto ? <img src={staff.profilePhoto} alt="Profile" /> : initials}
            </div>
            <div className="sd-sb-user-info">
              <b>{staff.name}</b>
              <span>{staff.staffId}</span>
            </div>
          </div>
          <div className="sd-sb-ward">
            {staff.role} · {staff.ward}
          </div>
        </div>
      </aside>

      {/* ============ MAIN AREA ============ */}
      <div className="sd-main" id="sd-top">
        {/* TOPBAR */}
        <div className="sd-topbar">
          <div className="sd-search">
            <input
              type="text"
              placeholder="Search all complaints..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="sd-tb-actions">
            <button
              type="button"
              className="sd-icon-btn"
              aria-label="Notifications"
              onClick={() => scrollTo("notifications-panel")}
            >
              🔔<span className="sd-tb-dot"></span>
            </button>
            <div className="sd-tb-user" id="sd-profile">
              <div className="sd-tb-avatar">
                {staff.profilePhoto ? <img src={staff.profilePhoto} alt="Profile" /> : initials}
              </div>
              <div>
                <b>{staff.name}</b>
                <span>{staff.role}</span>
              </div>
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div className="sd-content">
          <div className="sd-title-row">
            <div>
              <h1>Welcome back, {staff.name.split(" ")[0]}</h1>
              <p>
                {staff.role} · {staff.ward} · {staff.contact}
              </p>
            </div>
          </div>

          {/* STAT CARDS */}
          <div className="sd-stats-row">
            {overviewStats.map((stat, i) => (
              <div className={`sd-stat-card tone-${stat.tone}`} key={i}>
                <div className="sd-stat-ic">{stat.icon}</div>
                <div className="sd-stat-num">{stat.value}</div>
                <div className="sd-stat-label">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* FULL WIDTH: ASSIGNED WORK TABLE */}
          <div className="sd-panel" id="assigned-work" style={{ marginBottom: "24px" }}>
            <div className="sd-panel-head">
              <h3>Assigned Complaints</h3>
              <span className="sd-panel-link">{filteredComplaints.length} total</span>
            </div>
            <div className="sd-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ minWidth: "140px" }}>Complaint</th>
                    <th style={{ minWidth: "180px" }}>Category</th>
                    <th style={{ minWidth: "200px" }}>Location</th>
                    <th style={{ minWidth: "100px" }}>Priority</th>
                    <th style={{ minWidth: "160px" }}>Status</th>
                    <th style={{ minWidth: "150px" }}>Assigned Staff</th>
                    <th style={{ minWidth: "180px" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredComplaints.map((c) => (
                    <React.Fragment key={c.id}>
                      <tr
                        className={selectedId === c.id ? "sd-row-active" : ""}
                        onClick={() => setSelectedId(c.id)}
                      >
                        <td className="sd-mono">{c.complaintNumber}</td>
                        <td>
                          <div className="sd-cat">
                            <span
                              className="sd-cat-dot"
                              style={{ background: colorForCategory(c.category) }}
                            ></span>
                            {c.issue}
                          </div>
                        </td>
                        <td>{c.location || "Location pending"}</td>
                        <td>
                          <span className={`sd-badge sd-badge-${priorityTone[c.priority]}`}>
                            {c.priority}
                          </span>
                        </td>
                        <td>
                          <span className={`sd-badge sd-badge-${stageTone[c.stage] || "navy"}`}>
                            {c.status || lifecycleStages[c.stage] || "Unknown"}
                          </span>
                        </td>
                        <td>{c.assignedStaff || "Not assigned"}</td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="sd-row-actions">
                            <button
                              className="sd-btn-outline small"
                              type="button"
                              title={`View full details for ${c.complaintNumber}`}
                              onClick={() => {
                                setSelectedId(c.id);
                                openView(setShowComplaintDetails);
                              }}
                            >
                              View Details
                            </button>
                            <button
                              className="sd-icon-btn small"
                              type="button"
                              onClick={() => startInspection(c)}
                              title="Physical Inspection"
                              aria-label={`Physical inspection for ${c.complaintNumber}`}
                            >
                              🔎
                            </button>
                            {c.stage === 0 && c.isDraft && (
                              <button
                                className="sd-icon-btn small danger"
                                type="button"
                                onClick={() => setConfirmDeleteId(c.id)}
                                title="Remove draft"
                              >
                                🗑️
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {confirmDeleteId === c.id && (
                        <tr className="sd-edit-row">
                          <td colSpan={7}>
                            <div className="sd-delete-confirm">
                              <span>Remove this draft complaint from your queue?</span>
                              <div>
                                <button
                                  className="sd-btn-outline small"
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                >
                                  No
                                </button>
                                <button
                                  className="sd-btn-danger small"
                                  type="button"
                                  onClick={() => handleDeleteDraft(c.id)}
                                >
                                  Yes, Remove
                                </button>
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
          </div>

          {/* TWO COLUMN: LIFECYCLE + DETAILS */}
          <div className="sd-dash-grid">
            {/* LEFT: Lifecycle + Work History */}
            <div className="sd-side-col">
              <div className="sd-panel" id="lifecycle-panel">
                <div className="sd-panel-head">
                  <h3>Action / Repair Work</h3>
                  <span className="sd-mono sd-faint">{selected.complaintNumber}</span>
                </div>
                <p className="sd-lifecycle-location">
                  📍 {selected.location || "Location pending"}
                </p>
                <div className="sd-lifecycle">
                  {lifecycleStages.map((stage, i) => (
                    <div className="sd-lc-item" key={i}>
                      <div
                        className={`sd-lc-dot ${
                          i < selected.stage ? "done" : i === selected.stage ? "now" : "pend"
                        }`}
                      ></div>
                      <div className="sd-lc-body">
                        <b>{stage}</b>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="sd-lifecycle-actions">
                  <button
                    className="sd-btn-outline small"
                    type="button"
                    onClick={() => revertStage(selected.id)}
                    disabled={selected.stage === 0}
                  >
                    ← Move Back
                  </button>
                  <button
                    className="sd-btn-primary small"
                    type="button"
                    onClick={() => advanceStage(selected.id)}
                    disabled={selected.stage === lifecycleStages.length - 1}
                  >
                    Advance Stage →
                  </button>
                </div>
              </div>

              <div className="sd-panel" id="history-panel">
                <div className="sd-panel-head">
                  <h3>Work History</h3>
                </div>
                <div className="sd-notif-list">
                  {[...(selected.log || [])].reverse().map((note, i) => (
                    <div className="sd-notif-item" key={`${note.time || "activity"}-${i}`}>
                      <span className="sd-notif-dot"></span>
                      <div>
                        <b>{note.actor || "Dashboard"}: {note.text}</b>
                        <span>{note.time && !Number.isNaN(new Date(note.time).getTime()) ? new Date(note.time).toLocaleString() : "Time not recorded"}</span>
                      </div>
                    </div>
                  ))}
                  {!selected.log?.length && <p className="sd-empty-note">No activity has been recorded for this complaint yet.</p>}
                </div>
              </div>
            </div>

            {/* RIGHT: Complaint Details */}
            <div className="sd-panel sd-form-panel" id="complaint-details">
              <div className="sd-panel-head">
                <h3>Complaint Details</h3>
                <span className="sd-panel-link">{selected.complaintNumber}</span>
              </div>
              <div className="sd-detail-grid">
                <div className="sd-detail-item">
                  <span>Category</span>
                  <b>{selected.category}</b>
                </div>
                <div className="sd-detail-item">
                  <span>Specific Issue</span>
                  <b>{selected.issue}</b>
                </div>
                <div className="sd-detail-item">
                  <span>Priority</span>
                  <b>{selected.priority}</b>
                </div>
                <div className="sd-detail-item">
                  <span>Submitted</span>
                  <b>{selected.createdAt ? new Date(selected.createdAt).toLocaleString() : selected.date || "Not recorded"}</b>
                </div>
                <div className="sd-detail-item">
                  <span>Current Status</span>
                  <b>{selected.status || "Not recorded"}</b>
                </div>
                <div className="sd-detail-item">
                  <span>Assigned Staff</span>
                  <b>{selected.assignedStaff || "Not assigned"}</b>
                </div>
                <div className="sd-detail-item">
                  <span>Assigned Verifier</span>
                  <b>{selected.assignedVerifier || "Not assigned"}</b>
                </div>
                <div className="sd-detail-item">
                  <span>Department</span>
                  <b>{selected.department || "Not recorded"}</b>
                </div>
                <div className="sd-detail-item">
                  <span>Citizen</span>
                  <b>{selected.citizenName}</b>
                </div>
                <div className="sd-detail-item">
                  <span>Citizen Contact</span>
                  <b>{selected.citizenContact}</b>
                </div>
                <div className="sd-detail-item sd-detail-wide">
                  <span>Description</span>
                  <b>{selected.description}</b>
                </div>
                {selected.verifierRemarks && (
                  <div className="sd-verifier-feedback">
                    <b>Verifier requested correction</b>
                    <p>{selected.verifierRemarks}</p>
                  </div>
                )}
                <div className="sd-detail-item sd-detail-wide">
                  <span>Citizen Uploaded Photos</span>
                  <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                    {selected.citizenPhotos && selected.citizenPhotos.length > 0 ? (
                      selected.citizenPhotos.map((photo, idx) => (
                        <a
                          key={idx}
                          href={toMediaUrl(photo)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ display: "block", width: "96px", height: "76px", borderRadius: "8px", border: "1px solid #e2e6ee", overflow: "hidden" }}
                        >
                          <img src={toMediaUrl(photo)} alt={`Citizen evidence ${idx + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </a>
                      ))
                    ) : (
                      <span style={{ color: "#888", fontSize: "13px" }}>
                        No photos uploaded by citizen.
                      </span>
                    )}
                  </div>
                </div>
                <div className="sd-detail-item sd-detail-wide">
                  <span>Before & After Work Photos</span>
                  <div style={{ display: "flex", gap: "8px", marginTop: "8px", flexWrap: "wrap" }}>
                    {[
                      ["Before / Site", selected.inspection?.sitePhoto],
                      ["After Work", selected.inspection?.completionPhoto],
                    ].filter(([, photo]) => photo).length ? (
                      [
                        ["Before / Site", selected.inspection?.sitePhoto],
                        ["After Work", selected.inspection?.completionPhoto],
                      ].filter(([, photo]) => photo).map(([label, photo]) => (
                        <a key={label} href={toMediaUrl(photo)} target="_blank" rel="noopener noreferrer" style={{ width: "120px", color: "#1b4586", fontSize: "12px" }}>
                          <img src={toMediaUrl(photo)} alt={`${label} work photo`} style={{ width: "120px", height: "84px", objectFit: "cover", borderRadius: "8px", border: "1px solid #e2e6ee" }} />
                          <span>{label}</span>
                        </a>
                      ))
                    ) : <span style={{ color: "#888", fontSize: "13px" }}>No staff work photos attached.</span>}
                  </div>
                </div>
                <div className="sd-detail-item sd-detail-wide" style={{ alignItems: "center" }}>
                  <span>Location</span>
                  <div style={{ display: "flex", gap: "12px", alignItems: "center", width: "100%" }}>
                    <b>{selected.location}</b>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        selected.location
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="sd-btn-outline small"
                      style={{
                        textDecoration: "none",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                       Navigate to Location
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* PHYSICAL INSPECTION */}
          <div
            className="sd-panel sd-form-panel"
            id="inspection-panel"
            style={{ marginTop: "24px" }}
          >
            <div className="sd-panel-head">
              <h3>Physical Inspection & Action Taken — {selected.complaintNumber}</h3>
              {!inspectionDraft && (
                <button
                  className="sd-btn-primary small"
                  type="button"
                  onClick={() => startInspection(selected)}
                >
                  {selected.inspection.remarks ? "Update Record" : "Create Inspection Record"}
                </button>
              )}
            </div>
            {inspectionError && <p className="sd-empty-note" role="alert">{inspectionError}</p>}

            {inspectionDraft && inspectionDraft.id === selected.id ? (
              <form className="sd-new-form" onSubmit={saveInspection}>
                <div className="sd-form-row">
                  <div className="sd-field">
                    <label htmlFor="insp-date">Inspection Date & Time</label>
                    <input
                      id="insp-date"
                      type="datetime-local"
                      value={inspectionDraft.inspectionDate}
                      onChange={(e) =>
                        setInspectionDraft({ ...inspectionDraft, inspectionDate: e.target.value })
                      }
                    />
                  </div>
                  <div className="sd-field">
                    <label htmlFor="comp-date">Work Completion Date & Time</label>
                    <input
                      id="comp-date"
                      type="datetime-local"
                      value={inspectionDraft.completionDate}
                      onChange={(e) =>
                        setInspectionDraft({ ...inspectionDraft, completionDate: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="sd-field">
                  <label htmlFor="insp-remarks">Inspection Remarks</label>
                  <textarea
                    id="insp-remarks"
                    rows="3"
                    placeholder="Site inspection findings"
                    value={inspectionDraft.remarks}
                    onChange={(e) =>
                      setInspectionDraft({ ...inspectionDraft, remarks: e.target.value })
                    }
                    required
                  ></textarea>
                </div>
                <div className="sd-form-row">
                  <div className="sd-field">
                    <label htmlFor="insp-site-photo">Before-Work / Site Photograph</label>
                    <label className="sd-photo-upload">
                      {inspectionDraft.sitePhoto
                        ? "Replace site photo"
                        : " Click to attach site photo"}
                      <input
                        id="insp-site-photo"
                        type="file"
                        accept="image/*"
                        onChange={(e) => attachPhoto("sitePhoto", e.target.files?.[0])}
                      />
                    </label>
                    {inspectionDraft.sitePhoto && <img className="sd-inspection-preview" src={toMediaUrl(inspectionDraft.sitePhoto)} alt="Before-work site evidence preview" />}
                  </div>
                  <div className="sd-field">
                    <label htmlFor="insp-completion-photo">
                      After-Work / Completion Photograph
                    </label>
                    <label className="sd-photo-upload">
                      {inspectionDraft.completionPhoto
                        ? "Replace after-repair photo"
                        : "📷 Click to attach after-repair photo"}
                      <input
                        id="insp-completion-photo"
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          attachPhoto("completionPhoto", e.target.files?.[0])
                        }
                      />
                    </label>
                    {inspectionDraft.completionPhoto && <img className="sd-inspection-preview" src={toMediaUrl(inspectionDraft.completionPhoto)} alt="After-work completion evidence preview" />}
                  </div>
                </div>
                <div className="sd-field">
                  <label htmlFor="insp-action">Action Taken / Work Remarks</label>
                  <textarea
                    id="insp-action"
                    rows="2"
                    placeholder="Repair / action carried out"
                    value={inspectionDraft.actionTaken}
                    onChange={(e) =>
                      setInspectionDraft({ ...inspectionDraft, actionTaken: e.target.value })
                    }
                  ></textarea>
                </div>
                <div className="sd-form-actions">
                  <button
                    className="sd-btn-outline"
                    type="button"
                    onClick={() => setInspectionDraft(null)}
                  >
                    Cancel
                  </button>
                  <button className="sd-btn-primary" type="submit">
                    Save Record →
                  </button>
                </div>
              </form>
            ) : (
              <div className="sd-inspection-view">
                {selected.inspection.remarks || selected.inspection.sitePhoto || selected.inspection.completionPhoto || selected.inspection.actionTaken ? (
                  <>
                    <div className="sd-detail-grid" style={{ marginBottom: "16px" }}>
                      <div className="sd-detail-item">
                        <span>Inspection Date/Time</span>
                        <b>
                          {selected.inspection.inspectionDate
                            ? new Date(selected.inspection.inspectionDate).toLocaleString()
                            : "Not recorded"}
                        </b>
                      </div>
                      <div className="sd-detail-item">
                        <span>Completion Date/Time</span>
                        <b>
                          {selected.inspection.completionDate
                            ? new Date(selected.inspection.completionDate).toLocaleString()
                            : "Pending"}
                        </b>
                      </div>
                    </div>
                    <div className="sd-detail-item sd-detail-wide">
                      <span>Inspection Remarks</span>
                      <b>{selected.inspection.remarks}</b>
                    </div>
                    <div className="sd-detail-item">
                      <span>Before-Work Photo</span>
                      {selected.inspection.sitePhoto
                        ? <img className="sd-inspection-preview" src={toMediaUrl(selected.inspection.sitePhoto)} alt="Before-work site evidence" />
                        : <b>Not attached</b>}
                    </div>
                    <div className="sd-detail-item">
                      <span>After-Work Photo</span>
                      {selected.inspection.completionPhoto
                        ? <img className="sd-inspection-preview" src={toMediaUrl(selected.inspection.completionPhoto)} alt="After-work completion evidence" />
                        : <b>Not attached</b>}
                    </div>
                    <div className="sd-detail-item sd-detail-wide">
                      <span>Action Taken</span>
                      <b>{selected.inspection.actionTaken || "Not recorded"}</b>
                    </div>
                  </>
                ) : (
                  <p className="sd-empty-note">No inspection record yet for this complaint.</p>
                )}
              </div>
            )}
          </div>

          {/* NOTIFICATIONS PANEL */}
          <div
            className="sd-panel sd-form-panel"
            id="notifications-panel"
            style={{ marginTop: "24px" }}
          >
            <div className="sd-panel-head">
              <h3>🔔 Notifications & Alerts</h3>
              <span className="sd-panel-link">
                {notifications.filter((n) => !n.isRead).length} Unread
              </span>
            </div>
            <div className="sd-notif-list">
              {notifications.map((note) => (
                <div
                  className="sd-notif-item"
                  key={note.id}
                  style={{
                    background: !note.isRead ? "#fff6ea" : "transparent",
                    borderLeft: !note.isRead ? "4px solid var(--saffron)" : "4px solid transparent",
                  }}
                >
                  <span
                    className="sd-notif-dot"
                    style={{ background: !note.isRead ? "var(--saffron)" : "#ccc" }}
                  ></span>
                  <div style={{ flex: 1 }}>
                    <b>{note.type}</b>
                    <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#4b5567" }}>
                      {note.text}
                    </p>
                    <span style={{ fontSize: "11px", color: "#8a93a6" }}>{note.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* STAFF PROFILE PANEL */}
          <div className="sd-panel sd-form-panel" id="sd-profile" style={{ marginTop: "24px" }}>
            <div className="sd-panel-head">
              <h3>👤 My Profile & Account Information</h3>
              <button className="sd-btn-outline small" type="button">
                ✏️ Edit Profile
              </button>
            </div>
            <div className="sd-detail-grid">
              <div className="sd-detail-item">
                <span>Full Name</span>
                <b>{staff.name}</b>
              </div>
              <div className="sd-detail-item">
                <span>Staff ID</span>
                <b>{staff.staffId}</b>
              </div>
              <div className="sd-detail-item">
                <span>Role / Designation</span>
                <b>{staff.role}</b>
              </div>
              <div className="sd-detail-item">
                <span>Department</span>
                <b>{staff.department}</b>
              </div>
              <div className="sd-detail-item">
                <span>Assigned Ward</span>
                <b>{staff.ward}</b>
              </div>
              <div className="sd-detail-item">
                <span>Contact Number</span>
                <b>{staff.contact}</b>
              </div>
              <div className="sd-detail-item">
                <span>Email Address</span>
                <b>{staff.email}</b>
              </div>
              <div className="sd-detail-item">
                <span>Join Date</span>
                <b>{staff.joinDate}</b>
              </div>
            </div>
          </div>

          {/* VIEW LOCATION ON MAP (Embedded in Dashboard) */}
          {showMapView && (
            <div className="sd-panel sd-form-panel" id="map-section" style={{ marginTop: "24px" }}>
              <div className="sd-panel-head">
                <h3>🗺️ Assigned Locations — {staff.ward}</h3>
                <span
                  className="sd-panel-link"
                  onClick={() => setShowMapView(false)}
                  style={{ cursor: "pointer" }}
                >
                  Hide Map View
                </span>
              </div>
              <div
                style={{
                  width: "100%",
                  height: "400px",
                  borderRadius: "8px",
                  overflow: "hidden",
                  marginBottom: "20px",
                  border: "1px solid #e2e6ee",
                }}
              >
                {staffMapError ? (
                  <div className="sd-empty-note">Google Maps could not be loaded.</div>
                ) : !isStaffMapLoaded ? (
                  <div className="sd-empty-note">Loading map...</div>
                ) : !staffMapCenter ? (
                  <div className="sd-empty-note">No complaint coordinates are available.</div>
                ) : (
                  <GoogleMap
                    mapContainerStyle={staffMapContainerStyle}
                    center={selectedMapComplaint && hasCoordinates(selectedMapComplaint)
                      ? {
                          lat: Number(selectedMapComplaint.coordinates.latitude),
                          lng: Number(selectedMapComplaint.coordinates.longitude),
                        }
                      : staffMapCenter}
                    zoom={13}
                    onClick={() => setSelectedMapComplaint(null)}
                  >
                    {complaints
                      .filter(hasCoordinates)
                      .map((complaint) => (
                        <Marker
                          key={complaint.id}
                          position={{ lat: Number(complaint.coordinates.latitude), lng: Number(complaint.coordinates.longitude) }}
                          icon={getComplaintMapMarkerIcon(complaint)}
                          title={`${complaint.complaintNumber} - ${complaint.issue}`}
                              onClick={() => {
                                setSelectedId(complaint.id);
                                setSelectedMapComplaint(complaint);
                              }}
                            />
                          ))}
                        {selectedMapComplaint && hasCoordinates(selectedMapComplaint) && (
                          <ComplaintMapInfoWindow
                            complaint={selectedMapComplaint}
                            position={{
                              lat: Number(selectedMapComplaint.coordinates.latitude),
                              lng: Number(selectedMapComplaint.coordinates.longitude),
                            }}
                            onClose={() => setSelectedMapComplaint(null)}
                          />
                        )}
                  </GoogleMap>
                )}
              </div>
              <div className="sd-map-grid">
                {Object.entries(mapGroups).map(([location, items]) => (
                  <div className="sd-map-ward-card" key={location}>
                    <p className="sd-map-ward-name">{location}</p>
                    <div className="sd-map-pins">
                      {items.map((c) => (
                        <span
                          className="sd-map-pin"
                          key={c.id}
                          style={{ background: colorForCategory(c.category) }}
                          title={`${c.complaintNumber} — ${c.category}`}
                        >
                          📍
                        </span>
                      ))}
                    </div>
                    <span className="sd-map-ward-count">
                      {items.length} complaint{items.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* QUICK ACTIONS */}
          <div className="sd-quick-row" style={{ marginTop: "24px" }}>
            <button
              className="sd-quick-card"
              type="button"
              onClick={() => scrollTo("assigned-work")}
            >
              <div className="sd-quick-ic navy">🗂️</div>
              <div>
                <h5>View Assigned Complaints</h5>
                <p>Your assignments, evidence & status</p>
              </div>
            </button>
            <button
              className="sd-quick-card"
              type="button"
              onClick={() => startInspection(selected)}
            >
              <div className="sd-quick-ic saffron">🔎</div>
              <div>
                <h5>Log Physical Inspection</h5>
                <p>Remarks, site & after-repair photos</p>
              </div>
            </button>
            <button
              className="sd-quick-card"
              type="button"
              onClick={() => {
                setShowMapView(true);
                scrollTo("map-section");
              }}
            >
              <div className="sd-quick-ic green">️</div>
              <div>
                <h5>View Location on Map</h5>
                <p>See assigned issues near your ward</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffDashboard;