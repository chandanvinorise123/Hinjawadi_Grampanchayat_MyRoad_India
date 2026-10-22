import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./admindashboard.css";

import AdminProfile from "../adminprofiledashboard/AdminProfile";
import AdminManagement from "../adminprofiledashboard/AdminManagement";
import StaffVerifierProfile from "../adminprofiledashboard/StaffVerifierProfile";
import ComplaintManagement from "../adminprofiledashboard/ComplaintManagement";
import StaffWorkMonitoring from "../adminprofiledashboard/StaffWorkMonitoring";
import UpdatedComplaints from "../adminprofiledashboard/UpdatedComplaints";
import ComplaintVerification from "../adminprofiledashboard/ComplaintVerification";
import ReportsManagement from "../adminprofiledashboard/ReportsManagement";
import logo from '../assets/logo.jpeg';
import ComplaintDetails from "../adminprofiledashboard/ComplaintDetails";
import { countUpdatedComplaints } from "../adminprofiledashboard/updatedComplaintsUtils";
import VisitorsOverview from "../components/visitoroverview/VisitorsOverview";
import NotificationMonitoring from "../adminprofiledashboard/Notification";
import { API_BASE_URL, fetchDashboard, getStoredUser, getUserId, updateDashboardComplaint } from "../utils/dashboardApi";
import AdminComplaintsMap from "../components/maps/AdminComplaintsMap";

/* Complaint pipeline status */
const statusOptions = ["New", "Pending", "Under Verification", "Under Action", "Resolved"];
const statusTone = { New: "navy", Pending: "amber", "Under Verification": "orange", "Under Action": "orange", Resolved: "green" };

const priorityOptions = ["Critical", "Urgent", "Normal"];
const priorityTone = { Critical: "red", Urgent: "amber", Normal: "green" };

// Role options for Staff/Verifier management (excludes Citizen and Admin)
const staffVerifierRoles = [
  { value: "verifier", label: "Verifier (Sarpanch)" },
  { value: "staff", label: "Staff (Contractor)" },
];

// Role options for Admin management (only Admin)
const adminRoles = [
  { value: "admin", label: "Admin" },
];

const roleTone = { citizen: "navy", staff: "orange", verifier: "amber", admin: "red" };

const mapColors = ["#e07b1c", "#2e6cb0", "#1d8a5c", "#c1900a", "#cf4438", "#7a5c9e"];
const colorForCategory = (category) => {
  let hash = 0;
  for (let i = 0; i < category.length; i++) hash = category.charCodeAt(i) + ((hash << 5) - hash);
  return mapColors[Math.abs(hash) % mapColors.length];
};

const notifTone = {
  "Complaint Registered": "navy",
  "Complaint Verified": "amber",
  "Staff Assigned": "orange",
  "Action Initiated": "orange",
  "Work Completed": "green",
  "Complaint Resolved": "green",
  "Complaint Closed": "green",
};

// Normalize MongoDB _id to id
const normalizeId = (doc) => ({ ...doc, id: doc.id || doc._id });

const complaintsAreUnchanged = (current, next) =>
  current.length === next.length &&
  current.every((complaint, index) =>
    String(complaint.id || complaint._id) === String(next[index].id || next[index]._id) &&
    complaint.updatedAt === next[index].updatedAt
  );

const notificationsAreUnchanged = (current, next) =>
  current.length === next.length &&
  current.every((notification, index) => {
    const refreshed = next[index];
    return notification.id === refreshed.id &&
      notification.type === refreshed.type &&
      notification.text === refreshed.text &&
      notification.complaintId === refreshed.complaintId &&
      notification.complaintNumber === refreshed.complaintNumber &&
      notification.complaintStatus === refreshed.complaintStatus &&
      notification.isRead === refreshed.isRead;
  });

// ✅ HELPER: Safely extract location string whether it's an object or plain string
const getLocationString = (loc) => {
  if (!loc) return "Location pending";
  if (typeof loc === 'object' && loc !== null) return loc.address || "Location pending";
  return String(loc);
};

const getPhotoCount = (complaint) => {
  if (Array.isArray(complaint.photos)) return complaint.photos.length;
  if (Array.isArray(complaint.images)) return complaint.images.length;
  if (typeof complaint.photos === "number") return complaint.photos;
  if (complaint.photos && typeof complaint.photos === "object") {
    return new Set(Object.values(complaint.photos).filter(Boolean)).size;
  }
  return 0;
};

const hasValidMapCoordinates = (complaint) => {
  const latitude = complaint.lat ?? complaint.coordinates?.latitude;
  const longitude = complaint.lng ?? complaint.coordinates?.longitude;
  return latitude !== null &&
    latitude !== undefined &&
    latitude !== "" &&
    longitude !== null &&
    longitude !== undefined &&
    longitude !== "" &&
    Number.isFinite(Number(latitude)) &&
    Number.isFinite(Number(longitude)) &&
    Number(latitude) >= -90 &&
    Number(latitude) <= 90 &&
    Number(longitude) >= -180 &&
    Number(longitude) <= 180;
};

const defaultCenter = { lat: 18.5913, lng: 73.7389 };

const AdminDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const storedAdmin = getStoredUser();
  const [admin, setAdmin] = useState({
    name: storedAdmin.name || "",
    role: storedAdmin.designation || storedAdmin.role || "",
    contact: storedAdmin.contact || storedAdmin.mobile || "",
    staffId: storedAdmin.adminId || storedAdmin.staffId || getUserId(storedAdmin) || "",
    profilePhoto: storedAdmin.profilePhoto || "",
  });

  // ✅ Helper to get auth headers with token for ALL fetch requests
  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      "Content-Type": "application/json",
      "Authorization": token ? `Bearer ${token}` : ""
    };
  };

  useEffect(() => {
    const loadAdminProfile = async () => {
      try {
        const data = await fetchDashboard("admin", getUserId(storedAdmin));
        if (data.profile) {
          setAdmin((current) => ({
            ...current,
            ...data.profile,
            staffId: data.profile.adminId || data.profile.staffId || current.staffId,
            role: data.profile.designation || data.profile.role || current.role,
            contact: data.profile.contact || data.profile.mobile || current.contact,
          }));
        }
      } catch (error) {
        console.error("Failed to load admin dashboard profile:", error);
      }
    };
    loadAdminProfile();
  }, []);

  // ---------------- USERS (Staff & Verifiers) ----------------
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersLoadError, setUsersLoadError] = useState("");

  // ---------------- ADMINS ----------------
  const [admins, setAdmins] = useState([]);
  const [adminsLoading, setAdminsLoading] = useState(true);

  // ---------------- COMPLAINTS ----------------
  const [complaints, setComplaints] = useState([]);
  const [complaintsLoading, setComplaintsLoading] = useState(true);
  const [assignmentSavingKey, setAssignmentSavingKey] = useState("");
  const [assignmentError, setAssignmentError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [showMapView, setShowMapView] = useState(false);

  // ---------------- NOTIFICATIONS ----------------
  const [notificationFeed, setNotificationFeed] = useState([]);
  const [notifLoading, setNotifLoading] = useState(true);

  // ---------------- COMPLAINT ANALYTICS (NEW) ----------------
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  // ---------------- MAP DASHBOARD (NEW) ----------------
  const [mapComplaints, setMapComplaints] = useState([]);
  const [mapCategoryFilter, setMapCategoryFilter] = useState("All");
  const [mapStatusFilter, setMapStatusFilter] = useState("All");
  const [mapPriorityFilter, setMapPriorityFilter] = useState("All");

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");

  // Staff/Verifier form state
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [newUser, setNewUser] = useState({
    name: "",
    role: "staff",
    contact: "",
    email: "",
    password: "",
  });

  // Admin form state
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [editingAdminId, setEditingAdminId] = useState(null);
  const [newAdmin, setNewAdmin] = useState({
    name: "",
    role: "admin",
    contact: "",
    email: "",
    password: "",
  });

  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState(null);
  const [confirmDeleteAdminId, setConfirmDeleteAdminId] = useState(null);
  const [confirmDeleteComplaintId, setConfirmDeleteComplaintId] = useState(null);
  const [userMessage, setUserMessage] = useState({ type: "", text: "" });

  // Password reset UI state
  const [resettingPasswordId, setResettingPasswordId] = useState(null);
  const [resettingAdminPasswordId, setResettingAdminPasswordId] = useState(null);
  const [newPassword, setNewPassword] = useState("");

  const [showProfile, setShowProfile] = useState(false);
  const [showUpdatedComplaints, setShowUpdatedComplaints] = useState(false);

  const openView = (setter) => {
    setShowProfile(false);
    setShowAdminManagement(false);
    setShowComplaintManagement(false);
    setShowComplaintVerification(false);
    setShowComplaintDetails(false);
    setShowStaffMonitoring(false);
    setShowUpdatedComplaints(false);
    setShowReports(false);
    setter(true);
  };

  useEffect(() => {
    if (!location.state?.openProfile) return;
    openView(setShowProfile);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate]);

  const [showStaffVerifierProfile, setShowStaffVerifierProfile] = useState(false);
  const [showComplaintVerification, setShowComplaintVerification] = useState(false);
  const [showStaffMonitoring, setShowStaffMonitoring] = useState(false);
  const [selectedUserProfile, setSelectedUserProfile] = useState(null);
  const [showAdminManagement, setShowAdminManagement] = useState(false);
  const [showComplaintManagement, setShowComplaintManagement] = useState(false);
  const [showComplaintDetails, setShowComplaintDetails] = useState(false);
  const [complaintListType, setComplaintListType] = useState("new");
  const [showReports, setShowReports] = useState(false);
  const [showNotificationMonitoring, setShowNotificationMonitoring] = useState(false);

  // ---------------- LOGOUT FUNCTION ----------------
  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      localStorage.removeItem("adminData");
      window.location.href = "/login";
    }
  };

  const [viewingProfileId, setViewingProfileId] = useState(null);
  const [viewingProfileRole, setViewingProfileRole] = useState(null);

  const selected = complaints.find((c) => c.id === selectedId) || complaints[0] || null;
  const categories = ["All", ...Array.from(new Set(complaints.map((c) => c.category)))];
  const adminStaffOptions = useMemo(() => users.filter((user) => user.role === "staff"), [users]);
  const adminVerifierOptions = useMemo(() => users.filter((user) => user.role === "verifier"), [users]);
  const getStaffAccountId = (complaint) =>
    complaint.assignedStaffId ||
    adminStaffOptions.find((user) => user.name === complaint.assignedStaff)?.id ||
    "";
  const getVerifierAccountId = (complaint) =>
    complaint.assignedVerifierId ||
    adminVerifierOptions.find((user) => user.name === complaint.assignedVerifier)?.id ||
    "";

  const handleComplaintUpdated = (updatedComplaint) => {
    if (!updatedComplaint) return;
    const normalized = normalizeId(updatedComplaint);
    setSelectedId(normalized.id);
    setComplaints((current) => current.map((complaint) =>
      String(complaint.id) === String(normalized.id) ? { ...complaint, ...normalized } : complaint
    ));
  };

  const handleManagedUserUpdated = (updatedUser) => {
    setUsers((current) => current.map((user) =>
      String(user.id) === String(updatedUser._id || updatedUser.id)
        ? normalizeId(updatedUser)
        : user
    ));
  };

  const showMessage = (type, text) => {
    setUserMessage({ type, text });
    setTimeout(() => setUserMessage({ type: "", text: "" }), 3000);
  };

  const findComplaintForNotification = (notification) => {
    const complaintId =
      notification.complaintId ||
      notification.complaint?._id ||
      notification.complaint?.id;
    const complaintNumber =
      notification.complaintNumber ||
      notification.complaint?.complaintNumber;

    return complaints.find((item) =>
      (complaintId && String(item.id || item._id) === String(complaintId)) ||
      (complaintNumber && item.complaintNumber === complaintNumber)
    );
  };

  const handleInlineAssignment = async (complaint, role, accountId) => {
    const savingKey = String(complaint.id);
    const usersForRole = role === "staff" ? adminStaffOptions : adminVerifierOptions;
    const selectedUser = usersForRole.find((user) => String(user.id) === String(accountId));
    setAssignmentError("");
    setAssignmentSavingKey(savingKey);
    try {
      const update = role === "staff"
        ? {
            assignedStaff: selectedUser?.name || "",
            assignedStaffId: selectedUser?.id || "",
            ...(selectedUser && ["New", "Pending"].includes(complaint.status)
              ? { status: "Under Action" }
              : {}),
          }
        : {
            assignedVerifier: selectedUser?.name || "",
            assignedVerifierId: selectedUser?.id || "",
          };
      const result = await updateDashboardComplaint(complaint.id, update);
      handleComplaintUpdated(result.complaint);
    } catch (error) {
      console.error(`Failed to assign ${role}:`, error);
      setAssignmentError(error.message || `Unable to assign ${role}. Please try again.`);
    } finally {
      setAssignmentSavingKey("");
    }
  };

  const handleOpenNotificationComplaint = (notification) => {
    const complaint = findComplaintForNotification(notification);
    if (!complaint) {
      showMessage("error", "The complaint linked to this notification is not available in the current complaint list yet.");
      return;
    }
    setSelectedId(complaint.id || complaint._id);
    setComplaintListType(null);
    setShowNotificationMonitoring(false);
    setShowComplaintDetails(true);
  };

  // ---------------- FETCH USERS (Staff & Verifiers) ----------------
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setUsersLoading(true);
        setUsersLoadError("");
        const response = await fetch(`${API_BASE_URL}/users?role=staff,verifier`, {
          headers: getAuthHeaders() // ✅ ADDED
        });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.message || "Failed to load staff and verifier accounts.");
        setUsers(data.users.map(normalizeId));
      } catch (err) {
        console.error("Failed to fetch users:", err);
        setUsersLoadError(err.message || "Failed to load staff and verifier accounts.");
      } finally {
        setUsersLoading(false);
      }
    };
    fetchUsers();
  }, []);

  // ---------------- FETCH ADMINS ----------------
  useEffect(() => {
    const fetchAdmins = async () => {
      try {
        setAdminsLoading(true);
        const response = await fetch(`${API_BASE_URL}/users?role=admin`, {
          headers: getAuthHeaders() // ✅ ADDED
        });
        const data = await response.json();
        if (response.ok && data.success) {
          setAdmins(data.users.map(normalizeId));
        }
      } catch (err) {
        console.error("Failed to fetch admins:", err);
      } finally {
        setAdminsLoading(false);
      }
    };
    fetchAdmins();
  }, []);

  // ---------------- FETCH COMPLAINTS ----------------
  useEffect(() => {
    let active = true;
    const fetchComplaints = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/complaints`, {
          headers: getAuthHeaders() // ✅ ADDED
        });
        const data = await response.json();
        if (response.ok && data.success) {
          if (!active) return;
          const normalized = data.complaints.map((complaint) => ({
            ...normalizeId(complaint),
            lat: complaint.lat ?? complaint.coordinates?.latitude,
            lng: complaint.lng ?? complaint.coordinates?.longitude,
          }));
          setComplaints((current) =>
            complaintsAreUnchanged(current, normalized) ? current : normalized
          );
          if (normalized.length > 0) {
            setSelectedId((current) => (
              normalized.some((complaint) => String(complaint.id) === String(current))
                ? current
                : normalized[0].id
            ));
          }
        }
      } catch (err) {
        if (active) console.error("Failed to fetch complaints:", err);
      } finally {
        if (active) setComplaintsLoading(false);
      }
    };
    fetchComplaints();
    const refreshTimer = window.setInterval(fetchComplaints, 30000);
    return () => {
      active = false;
      window.clearInterval(refreshTimer);
    };
  }, []);

  // ---------------- FETCH NOTIFICATIONS ----------------
  useEffect(() => {
    let active = true;
    const fetchNotifications = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/notifications`, {
          headers: getAuthHeaders() // ✅ ADDED
        });
        const data = await response.json();
        if (response.ok && data.success) {
          if (active) {
            const normalized = data.notifications.map(normalizeId);
            setNotificationFeed((current) =>
              notificationsAreUnchanged(current, normalized) ? current : normalized
            );
          }
        }
      } catch (err) {
        if (active) console.error("Failed to fetch notifications:", err);
      } finally {
        if (active) setNotifLoading(false);
      }
    };
    fetchNotifications();
    const refreshTimer = window.setInterval(fetchNotifications, 30000);
    return () => {
      active = false;
      window.clearInterval(refreshTimer);
    };
  }, []);

  // ---------------- FETCH COMPLAINT ANALYTICS (NEW) ----------------
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setAnalyticsLoading(true);
        const response = await fetch(`${API_BASE_URL}/complaints/analytics`, {
          headers: getAuthHeaders() // ✅ ADDED
        });
        const data = await response.json();
        if (response.ok && data.success) {
          setAnalytics(data.analytics);
        }
      } catch (err) {
        console.error("Failed to fetch analytics:", err);
      } finally {
        setAnalyticsLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  // ---------------- FETCH MAP COMPLAINTS (NEW) ----------------
  useEffect(() => {
    const fetchMapComplaints = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/complaints`, {
          headers: getAuthHeaders() // ✅ ADDED
        });
        const data = await response.json();
        if (response.ok && data.success) {
          const normalized = data.complaints.map((complaint) => ({
            ...normalizeId(complaint),
            lat: complaint.lat ?? complaint.coordinates?.latitude ?? null,
            lng: complaint.lng ?? complaint.coordinates?.longitude ?? null,
          }));
          setMapComplaints(normalized);
        }
      } catch (err) {
        console.error("Failed to fetch map complaints:", err);
      }
    };
    fetchMapComplaints();
  }, []);

  // ---------------- SYSTEM OVERVIEW ----------------
  const overviewStats = [
    { label: "Total Complaints", value: complaints.length, icon: "🗂️", tone: "navy" },
    { label: "New Complaints", value: complaints.filter((c) => c.status === "New").length, icon: "🆕", tone: "navy" },
    { label: "Pending", value: complaints.filter((c) => c.status === "Pending").length, icon: "", tone: "amber" },
    { label: "Under Verification", value: complaints.filter((c) => c.status === "Under Verification").length, icon: "🔍", tone: "orange" },
    { label: "Under Action", value: complaints.filter((c) => c.status === "Under Action").length, icon: "️", tone: "orange" },
    { label: "Resolved", value: complaints.filter((c) => c.status === "Resolved").length, icon: "✅", tone: "green" },
    { label: "Critical", value: complaints.filter((c) => c.priority === "Critical").length, icon: "", tone: "red" },
  ];

  const userCounts = [
    { role: "staff", label: "Staff (Contractor)", count: users.filter((u) => u.role === "staff").length },
    { role: "verifier", label: "Verifier (Sarpanch)", count: users.filter((u) => u.role === "verifier").length },
    { role: "admin", label: "Admin", count: admins.length },
  ];
  const newComplaintCount = complaints.filter(
    (complaint) => String(complaint.status || "").toLowerCase() === "new"
  ).length;
  const assignedComplaintCount = complaints.filter((complaint) =>
    [
      complaint.assignedStaff,
      complaint.assignedStaffId,
    ].some((assignment) => String(assignment || "").trim())
  ).length;
  const updatedComplaintCount = countUpdatedComplaints(complaints, ["staff", "admin", "verifier"]);
  const verificationComplaintCount = complaints.filter((complaint) =>
    ["Under Verification", "Verified", "Resolved", "Closed", "Rejected"].includes(complaint.status)
  ).length;

  // ---------------- GENERATE PASSWORD ----------------
  const generatePassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#";
    let pass = "";
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  };

  // ---------------- STAFF/VERIFIER CRUD ----------------
  const saveUser = async (e) => {
    e.preventDefault();
    setUserMessage({ type: "", text: "" });

    if (!newUser.name.trim() || !newUser.contact.trim() || !newUser.email.trim() || !newUser.password.trim()) {
      showMessage("error", "All fields are required.");
      return;
    }

    try {
      const url = editingUserId ? `${API_BASE_URL}/users/${editingUserId}` : `${API_BASE_URL}/users`;
      const method = editingUserId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(), // ✅ UPDATED
        body: JSON.stringify(newUser),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        if (editingUserId) {
          setUsers(users.map((u) => (u.id === editingUserId ? normalizeId(data.user) : u)));
          showMessage("success", `User "${data.user.name}" updated successfully!`);
        } else {
          setUsers([normalizeId(data.user), ...users]);
          showMessage("success", `User "${data.user.name}" registered successfully!`);
        }
        setNewUser({ name: "", role: "staff", contact: "", email: "", password: "" });
        setShowAddUser(false);
        setEditingUserId(null);
      } else {
        showMessage("error", data.message || "Operation failed.");
      }
    } catch (err) {
      showMessage("error", "Unable to reach the server.");
    }
  };

  const editUser = (user) => {
    setNewUser({
      name: user.name,
      role: user.role,
      contact: user.contact,
      email: user.email,
      password: "",
    });
    setEditingUserId(user.id);
    setShowAddUser(true);
  };

  const resetUserPassword = async (id) => {
    if (!newPassword.trim()) {
      showMessage("error", "Password cannot be empty.");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/users/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(), // ✅ UPDATED
        body: JSON.stringify({ password: newPassword }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setResettingPasswordId(null);
        setNewPassword("");
        showMessage("success", "Password reset successfully!");
      } else {
        showMessage("error", data.message || "Failed to reset password.");
      }
    } catch (err) {
      console.error("Failed to reset user password:", err);
      showMessage("error", "Unable to reach the server.");
    }
  };

  const deleteUser = async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(), // ✅ ADDED
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setUsers(users.filter((u) => u.id !== id));
        setConfirmDeleteUserId(null);
        showMessage("success", "User removed successfully!");
      } else {
        showMessage("error", data.message || "Failed to remove user.");
      }
    } catch (err) {
      console.error("Failed to delete user:", err);
      showMessage("error", "Unable to reach the server.");
    }
  };

  // ---------------- ADMIN CRUD ----------------
  const saveAdmin = async (e) => {
    e.preventDefault();
    setUserMessage({ type: "", text: "" });

    if (!newAdmin.name.trim() || !newAdmin.contact.trim() || !newAdmin.email.trim() || !newAdmin.password.trim()) {
      showMessage("error", "All fields are required.");
      return;
    }

    try {
      const url = editingAdminId ? `${API_BASE_URL}/users/${editingAdminId}` : `${API_BASE_URL}/users`;
      const method = editingAdminId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(), // ✅ UPDATED
        body: JSON.stringify({ ...newAdmin, role: "admin" }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        if (editingAdminId) {
          setAdmins(admins.map((a) => (a.id === editingAdminId ? normalizeId(data.user) : a)));
          showMessage("success", `Admin "${data.user.name}" updated successfully!`);
        } else {
          setAdmins([normalizeId(data.user), ...admins]);
          showMessage("success", `Admin "${data.user.name}" registered successfully!`);
        }
        setNewAdmin({ name: "", role: "admin", contact: "", email: "", password: "" });
        setShowAddAdmin(false);
        setEditingAdminId(null);
      } else {
        showMessage("error", data.message || "Operation failed.");
      }
    } catch (err) {
      showMessage("error", "Unable to reach the server.");
    }
  };

  const editAdmin = (adminUser) => {
    setNewAdmin({
      name: adminUser.name,
      role: "admin",
      contact: adminUser.contact,
      email: adminUser.email,
      password: "",
    });
    setEditingAdminId(adminUser.id);
    setShowAddAdmin(true);
  };

  const resetAdminPassword = async (id) => {
    if (!newPassword.trim()) {
      showMessage("error", "Password cannot be empty.");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/users/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(), // ✅ UPDATED
        body: JSON.stringify({ password: newPassword }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setResettingAdminPasswordId(null);
        setNewPassword("");
        showMessage("success", "Password reset successfully!");
      } else {
        showMessage("error", data.message || "Failed to reset password.");
      }
    } catch (err) {
      console.error("Failed to reset admin password:", err);
      showMessage("error", "Unable to reach the server.");
    }
  };

  const deleteAdmin = async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(), // ✅ ADDED
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setAdmins(admins.filter((a) => a.id !== id));
        setConfirmDeleteAdminId(null);
        showMessage("success", "Admin removed successfully!");
      } else {
        showMessage("error", data.message || "Failed to remove admin.");
      }
    } catch (err) {
      console.error("Failed to delete admin:", err);
      showMessage("error", "Unable to reach the server.");
    }
  };

  // ---------------- COMPLAINT FILTERING ----------------
  const filteredComplaints = complaints.filter((c) => {
    const locStr = getLocationString(c.location).toLowerCase();
    const normalizedSearchTerm = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm.trim() ||
      String(c.complaintNumber || "").toLowerCase().includes(normalizedSearchTerm) ||
      String(c.issue || "").toLowerCase().includes(normalizedSearchTerm) ||
      locStr.includes(normalizedSearchTerm);
    const matchesCategory = categoryFilter === "All" || c.category === categoryFilter;
    const matchesPriority = priorityFilter === "All" || c.priority === priorityFilter;
    return matchesSearch && matchesCategory && matchesPriority;
  });

  const mapGroups = complaints.reduce((groups, c) => {
    const key = getLocationString(c.location);
    if (!groups[key]) groups[key] = [];
    groups[key].push(c);
    return groups;
  }, {});

  // ---------------- COMPLAINT CRUD ----------------
  const deleteComplaint = async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/complaints/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(), // ✅ ADDED
      });
      const data = await response.json();
      if (response.ok && data.success) {
        const remaining = complaints.filter((c) => c.id !== id);
        setComplaints(remaining);
        setConfirmDeleteComplaintId(null);
        if (selectedId === id && remaining.length > 0) {
          setSelectedId(remaining[0].id);
        }
        showMessage("success", "Complaint removed successfully!");
      } else {
        showMessage("error", data.message || "Failed to remove complaint.");
      }
    } catch (err) {
      console.error("Failed to delete complaint:", err);
      showMessage("error", "Unable to reach the server.");
    }
  };

  // ---------------- REPORTS & ANALYTICS ----------------
  const byCategory = Array.from(new Set(complaints.map((c) => c.category))).map((cat) => ({
    label: cat,
    count: complaints.filter((c) => c.category === cat).length,
  }));
  const byPriority = priorityOptions.map((p) => ({
    label: p,
    count: complaints.filter((c) => c.priority === p).length,
  }));
  const maxCategoryCount = Math.max(1, ...byCategory.map((b) => b.count));
  const maxPriorityCount = Math.max(1, ...byPriority.map((b) => b.count));

  const staffList = users.filter((u) => u.role === "staff");
  const verifierList = users.filter((u) => u.role === "verifier");

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  const initials = admin.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // ---------------- MAP DASHBOARD HELPERS (NEW) ----------------
  const filteredMapComplaints = useMemo(() => {
    return mapComplaints.filter((c) => {
      if (!hasValidMapCoordinates(c)) return false;
      const matchesCategory = mapCategoryFilter === "All" || c.category === mapCategoryFilter;
      const matchesStatus = mapStatusFilter === "All" || c.status === mapStatusFilter;
      const matchesPriority = mapPriorityFilter === "All" || c.priority === mapPriorityFilter;
      return matchesCategory && matchesStatus && matchesPriority;
    });
  }, [mapComplaints, mapCategoryFilter, mapStatusFilter, mapPriorityFilter]);

  const resetMapFilters = () => {
    setMapCategoryFilter("All");
    setMapStatusFilter("All");
    setMapPriorityFilter("All");
  };

  return (
    <>
      {showProfile ? (
        <AdminProfile
          adminId={admin.staffId || getUserId(storedAdmin)}
          onBack={() => setShowProfile(false)}
        />
      ) : showComplaintManagement ? (
        <ComplaintManagement onBack={() => setShowComplaintManagement(false)} />
      ) : showComplaintVerification ? (
        <ComplaintVerification onBack={() => setShowComplaintVerification(false)} />
      ) : showComplaintDetails ? (
        <ComplaintDetails
          listType={complaintListType || "new"}
          key={complaintListType || `detail-${String(complaints.find((complaint) => String(complaint.id) === String(selectedId))?.id || "list")}`}
          complaint={complaintListType ? null : complaints.find((complaint) => String(complaint.id) === String(selectedId))}
          staffOptions={adminStaffOptions}
          verifierOptions={adminVerifierOptions}
          assignmentsLoading={usersLoading}
          assignmentsError={usersLoadError}
          onComplaintUpdated={handleComplaintUpdated}
          onBack={() => {
            setShowComplaintDetails(false);
            setSelectedId(null);
          }}
        />
      ) : showStaffMonitoring ? (
        <StaffWorkMonitoring onBack={() => setShowStaffMonitoring(false)} />
      ) : showUpdatedComplaints ? (
        <UpdatedComplaints
          complaints={complaints}
          actorRoles={["staff", "admin", "verifier"]}
          audienceLabel="Staff, admin & verifier activity"
          listTitle="Staff, Admin & Verifier Updates"
          onBack={() => setShowUpdatedComplaints(false)}
        />
      ) : showReports ? (
        <ReportsManagement onBack={() => setShowReports(false)} />
      ) : showAdminManagement ? (
        <AdminManagement onBack={() => setShowAdminManagement(false)} />
      ) : showStaffVerifierProfile ? (
        <StaffVerifierProfile
          userId={selectedUserProfile?.id}
          role={selectedUserProfile?.role || "staff"}
          usersList={users} // ✅ PASS THE FULL USERS ARRAY HERE
          onUserUpdated={handleManagedUserUpdated}
          onBack={() => {
            setShowStaffVerifierProfile(false);
            setSelectedUserProfile(null);
          }}
        />
      )

        : showNotificationMonitoring ? (
          <NotificationMonitoring
            onBack={() => setShowNotificationMonitoring(false)}
            onOpenComplaint={handleOpenNotificationComplaint}
          />
        )

          : (
            <div className="ad-shell">
              {/* ============ SIDEBAR ============ */}
              <aside className="ad-sidebar">
                <div className="ad-sb-brand">
                  <div className="ad-sb-logo">
                    <img src={logo} alt="My Road India Logo" />
                  </div>
                  <div>
                    <b>My Road India</b>
                    <span>Admin Portal</span>
                  </div>
                </div>

                <div className="ad-sb-label">Overview</div>
                <nav className="ad-sb-nav">
                  <button type="button" className="ad-sb-link active" onClick={() => scrollTo("ad-top")}>
                    📊 System Overview
                  </button>
                  <button type="button" className="ad-sb-link" onClick={() => openView(setShowProfile)}>
                    👤 My Profile
                  </button>
                </nav>

                <div className="ad-sb-label">Management</div>
                <nav className="ad-sb-nav">
                  <button
                    type="button"
                    className="ad-sb-link"
                    onClick={() => {
                      if (users.length > 0) {
                        setSelectedUserProfile(users[0]);
                        setShowStaffVerifierProfile(true);
                      }
                    }}
                  >
                    👥 Staff & Verifier Profile
                    <span className="ad-sb-badge">{users.length}</span>
                  </button>

                  <button type="button" className="ad-sb-link" onClick={() => openView(setShowAdminManagement)}>
                    ⚙️ Admin Management
                    <span className="ad-sb-badge">{admins.length}</span>
                  </button>

                  <button type="button" className="ad-sb-link" onClick={() => openView(setShowComplaintManagement)}>
                    ⚙️ComplaintManagement
                    <span className="ad-sb-badge">{complaints.length}</span>
                  </button>

                  <button
                    type="button"
                    className="ad-sb-link"
                    onClick={() => {
                      setSelectedId(null);
                      setComplaintListType("new");
                      openView(setShowComplaintDetails);
                    }}
                  >
                    📈 New Complaints
                    <span className="ad-sb-badge">{newComplaintCount}</span>
                  </button>

                  <button
                    type="button"
                    className="ad-sb-link"
                    onClick={() => {
                      setSelectedId(null);
                      setComplaintListType("assigned");
                      openView(setShowComplaintDetails);
                    }}
                  >
                    📋 Assigned Complaints
                    <span className="ad-sb-badge">{assignedComplaintCount}</span>
                  </button>

                  
                  <button type="button" className="ad-sb-link" onClick={() => openView(setShowUpdatedComplaints)}>
                    📋 Updated Complaints
                    <span className="ad-sb-badge">{updatedComplaintCount}</span>
                  </button>

                  <button type="button" className="ad-sb-link" onClick={() => openView(setShowStaffMonitoring)}>
                    🧑‍Staff&Work Monitoring
                    <span className="ad-sb-badge">{users.filter((user) => user.role === "staff").length}</span>
                  </button>


                  <button type="button" className="ad-sb-link" onClick={() => openView(setShowComplaintVerification)}>
                    📈 Complaint Verification
                    <span className="ad-sb-badge">{verificationComplaintCount}</span>
                  </button>
                </nav>

                <div className="ad-sb-label">Insights</div>
                <nav className="ad-sb-nav">
                  <button type="button" className="ad-sb-link" onClick={() => openView(setShowReports)}>
                    📈Reports Management
                  </button>
                  <button type="button" className="ad-sb-link" onClick={() => setShowNotificationMonitoring(true)}>
                🔔NotificationMonitoring
                    <span className="ad-sb-badge">{notificationFeed.length}</span>
                  </button>

                  <button
                    type="button"
                    className="ad-button-link"
                    onClick={handleLogout}
                    style={{ color: "#cf4438", fontWeight: "600", marginTop: "8px" }}
                  >
                    Logout
                  </button>
                </nav>

                <div className="ad-sb-footer">
                  <div className="ad-sb-user">
                    <div className="ad-sb-avatar">
                      {admin.profilePhoto ? <img src={admin.profilePhoto} alt="Profile" /> : initials}
                    </div>
                    <div className="ad-sb-user-info">
                      <b>{admin.name}</b>
                      <span>{admin.staffId}</span>
                    </div>
                  </div>
                  <div className="ad-sb-ward">{admin.role}</div>
                </div>
              </aside>

              {/* ============ MAIN AREA ============ */}
              <div className="ad-main" id="ad-top">
                {/* TOPBAR */}
                <div className="ad-topbar">
                  <div className="ad-search">
                    🔍{" "}
                    <input
                      type="text"
                      placeholder="Search complaint number, issue or location..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="ad-tb-actions">
                    <button type="button" className="ad-icon-btn" aria-label="Notifications" onClick={() => scrollTo("notif-panel")}>
                      🔔<span className="ad-tb-dot"></span>
                    </button>
                    <div className="ad-tb-user" id="ad-profile">
                      <div className="ad-tb-avatar">
                        {admin.profilePhoto ? <img src={admin.profilePhoto} alt="Profile" /> : initials}
                      </div>
                      <div>
                        <b>{admin.name}</b>
                        <span>{admin.role}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CONTENT */}
                <div className="ad-content">
                  <div className="ad-title-row">
                    <div>
                      <h1>System Overview</h1>
                      <p>
                        {admin.role} · {admin.contact}
                      </p>
                    </div>
                  </div>

                  {/* STAT CARDS */}
                  <div className="ad-stats-row">
                    {overviewStats.map((stat, i) => (
                      <div className={`ad-stat-card tone-${stat.tone}`} key={i}>
                        <div className="ad-stat-ic">{stat.icon}</div>
                        <div className="ad-stat-num">{stat.value}</div>
                        <div className="ad-stat-label">{stat.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* ✅ NEW: VISITORS OVERVIEW SECTION */}
                  <VisitorsOverview />

                  {/* MESSAGE BANNER */}
                  {userMessage.text && (
                    <div className={`ad-message-banner ${userMessage.type}`}>{userMessage.text}</div>
                  )}

                  {/* ================= STAFF & VERIFIER MANAGEMENT ================= */}
                  <div className="ad-panel ad-form-panel" id="user-mgmt">
                    <div className="ad-panel-head">
                      <h3>Staff & Verifier Management</h3>
                      <button className="ad-btn-primary small" type="button" onClick={() => { setShowAddUser(true); setEditingUserId(null); setNewUser({ name: "", role: "staff", contact: "", email: "", password: "" }); }}>
                        + Add Staff/Verifier
                      </button>
                    </div>

                    {/* Role Count Chips */}
                    <div className="ad-role-counts">
                      {userCounts.filter(rc => rc.role !== 'admin').map((rc) => (
                        <div className={`ad-role-chip tone-${roleTone[rc.role]}`} key={rc.role}>
                          <b>{rc.count}</b>
                          <span>{rc.label}s</span>
                        </div>
                      ))}
                    </div>

                    {/* ADD/EDIT USER FORM */}
                    {showAddUser && (
                      <form className="ad-new-form-vertical" onSubmit={saveUser}>
                        <h4>{editingUserId ? "Edit Staff/Verifier" : "Add New Staff/Verifier"}</h4>

                        <div className="ad-vertical-field">
                          <label htmlFor="user-name">Full Name</label>
                          <input
                            id="user-name"
                            type="text"
                            placeholder="e.g., Shiv Kumar"
                            value={newUser.name}
                            onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                            required
                          />
                        </div>

                        <div className="ad-vertical-field">
                          <label htmlFor="user-role">Role</label>
                          <select
                            id="user-role"
                            value={newUser.role}
                            onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                          >
                            {staffVerifierRoles.map((r) => (
                              <option key={r.value} value={r.value}>
                                {r.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="ad-vertical-field">
                          <label htmlFor="user-contact">Contact</label>
                          <input
                            id="user-contact"
                            type="text"
                            placeholder="+91 ..."
                            value={newUser.contact}
                            onChange={(e) => setNewUser({ ...newUser, contact: e.target.value })}
                            required
                          />
                        </div>

                        <div className="ad-vertical-field">
                          <label htmlFor="user-email">Email Address</label>
                          <input
                            id="user-email"
                            type="email"
                            placeholder="e.g., name@example.com"
                            value={newUser.email}
                            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                            required
                          />
                        </div>

                        <div className="ad-vertical-field">
                          <label htmlFor="user-password">{editingUserId ? "New Password (leave blank to keep current)" : "Password"}</label>
                          <div className="ad-password-row">
                            <input
                              id="user-password"
                              type="text"
                              placeholder={editingUserId ? "Leave blank to keep current" : "Generate or type password"}
                              value={newUser.password}
                              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                              required={!editingUserId}
                            />
                            {!editingUserId && (
                              <button
                                type="button"
                                className="ad-btn-outline small"
                                onClick={() => setNewUser({ ...newUser, password: generatePassword() })}
                                title="Generate Random Secure Password"
                              >
                                🎲 Generate
                              </button>
                            )}
                          </div>
                          <small className="ad-field-hint">
                            {editingUserId
                              ? "Leave password blank to keep the current one."
                              : "Provide these credentials to the user for login."}
                          </small>
                        </div>

                        <div className="ad-form-actions">
                          <button className="ad-btn-outline" type="button" onClick={() => { setShowAddUser(false); setEditingUserId(null); setNewUser({ name: "", role: "staff", contact: "", email: "", password: "" }); }}>
                            Cancel
                          </button>
                          <button className="ad-btn-primary" type="submit">
                            {editingUserId ? "Update User →" : "Register User →"}
                          </button>
                        </div>
                      </form>
                    )}

                    {/* Users Table */}
                    <div className="ad-table-wrap">
                      {usersLoading ? (
                        <div className="ad-loading">Loading users...</div>
                      ) : (
                        <table>
                          <thead>
                            <tr>
                              <th>Name</th>
                              <th>Email</th>
                              <th>Password</th>
                              <th>Role</th>
                              <th>Contact</th>
                              <th>Joined</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {users.length === 0 ? (
                              <tr>
                                <td colSpan={7} style={{ textAlign: "center", padding: "20px", color: "#888" }}>
                                  No staff or verifiers registered yet. Click "+ Add Staff/Verifier" to register.
                                </td>
                              </tr>
                            ) : (
                              users.map((u) => (
                                <React.Fragment key={u.id}>
                                  <tr>
                                    <td>{u.name}</td>
                                    <td className="ad-mono" style={{ fontWeight: "600", color: "#2e6cb0" }}>
                                      {u.email || "-"}
                                    </td>
                                    <td>
                                      {resettingPasswordId === u.id ? (
                                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                          <input
                                            type="text"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            style={{ width: "120px", padding: "4px 8px", border: "1px solid #2e6cb0", borderRadius: "4px", fontSize: "0.85em" }}
                                            placeholder="New password"
                                            autoFocus
                                          />
                                          <button className="ad-btn-primary small" onClick={() => resetUserPassword(u.id)} style={{ padding: "4px 8px", fontSize: "0.8rem" }}>✓</button>
                                          <button className="ad-btn-outline small" onClick={() => { setResettingPasswordId(null); setNewPassword(""); }} style={{ padding: "4px 8px", fontSize: "0.8rem" }}>✕</button>
                                        </div>
                                      ) : (
                                        <div
                                          className="ad-mono"
                                          style={{ fontSize: "0.85em", color: "#555", background: "#f4f6f8", padding: "4px 8px", borderRadius: "4px", cursor: "pointer", display: "inline-block" }}
                                          onClick={() => { setResettingPasswordId(u.id); setNewPassword(""); }}
                                          title="Click to reset password"
                                        >
                                          •••••••• (click to reset)
                                        </div>
                                      )}
                                    </td>
                                    <td>
                                      <span className={`ad-badge ad-badge-${roleTone[u.role]}`}>
                                        {u.role === "staff" ? "Staff (Contractor)" : "Verifier (Sarpanch)"}
                                      </span>
                                    </td>
                                    <td className="ad-mono">{u.contact}</td>
                                    <td className="ad-mono">{u.joined || (u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "-")}</td>
                                    <td>
                                      <button className="ad-btn-outline small" type="button" onClick={() => { setSelectedUserProfile(u); setShowStaffVerifierProfile(true); }} title="View Profile" style={{ marginRight: "4px" }}>👁️</button>
                                      <button className="ad-btn-outline small" type="button" onClick={() => editUser(u)} title="Edit" style={{ marginRight: "4px" }}>✏️</button>
                                      <button className="ad-icon-btn small danger" type="button" onClick={() => setConfirmDeleteUserId(u.id)} title="Remove user">🗑️</button>
                                    </td>
                                  </tr>
                                  {confirmDeleteUserId === u.id && (
                                    <tr className="ad-edit-row">
                                      <td colSpan={7}>
                                        <div className="ad-delete-confirm">
                                          <span>Remove {u.name} from the system?</span>
                                          <div>
                                            <button className="ad-btn-outline small" type="button" onClick={() => setConfirmDeleteUserId(null)}>No</button>
                                            <button className="ad-btn-danger small" type="button" onClick={() => deleteUser(u.id)}>Yes, Remove</button>
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              ))
                            )}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>

                  {/* ================= ADMIN MANAGEMENT ================= */}
                  <div className="ad-panel ad-form-panel" id="admin-mgmt">
                    <div className="ad-panel-head">
                      <h3>Admin Management</h3>
                      <button className="ad-btn-primary small" type="button" onClick={() => { setShowAddAdmin(true); setEditingAdminId(null); setNewAdmin({ name: "", role: "admin", contact: "", email: "", password: "" }); }}>
                        + Add Admin
                      </button>
                    </div>

                    {/* Admin Count */}
                    <div className="ad-role-counts">
                      <div className="ad-role-chip tone-admin">
                        <b>{admins.length}</b>
                        <span>Admin{admins.length !== 1 ? "s" : ""}</span>
                      </div>
                    </div>

                    {/* ADD/EDIT ADMIN FORM */}
                    {showAddAdmin && (
                      <form className="ad-new-form-vertical" onSubmit={saveAdmin}>
                        <h4>{editingAdminId ? "Edit Admin" : "Add New Admin"}</h4>

                        <div className="ad-vertical-field">
                          <label htmlFor="admin-name">Full Name</label>
                          <input id="admin-name" type="text" placeholder="e.g., Admin User" value={newAdmin.name} onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })} required />
                        </div>

                        <div className="ad-vertical-field">
                          <label htmlFor="admin-contact">Contact</label>
                          <input id="admin-contact" type="text" placeholder="+91 ..." value={newAdmin.contact} onChange={(e) => setNewAdmin({ ...newAdmin, contact: e.target.value })} required />
                        </div>

                        <div className="ad-vertical-field">
                          <label htmlFor="admin-email">Email Address</label>
                          <input id="admin-email" type="email" placeholder="e.g., admin@example.com" value={newAdmin.email} onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })} required />
                        </div>

                        <div className="ad-vertical-field">
                          <label htmlFor="admin-password">{editingAdminId ? "New Password (leave blank to keep current)" : "Password"}</label>
                          <div className="ad-password-row">
                            <input id="admin-password" type="text" placeholder={editingAdminId ? "Leave blank to keep current" : "Generate or type password"} value={newAdmin.password} onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })} required={!editingAdminId} />
                            {!editingAdminId && (
                              <button type="button" className="ad-btn-outline small" onClick={() => setNewAdmin({ ...newAdmin, password: generatePassword() })} title="Generate Random Secure Password">🎲 Generate</button>
                            )}
                          </div>
                          <small className="ad-field-hint">
                            {editingAdminId ? "Leave password blank to keep the current one." : "Provide these credentials to the admin for login."}
                          </small>
                        </div>

                        <div className="ad-form-actions">
                          <button className="ad-btn-outline" type="button" onClick={() => { setShowAddAdmin(false); setEditingAdminId(null); setNewAdmin({ name: "", role: "admin", contact: "", email: "", password: "" }); }}>Cancel</button>
                          <button className="ad-btn-primary" type="submit">{editingAdminId ? "Update Admin →" : "Register Admin →"}</button>
                        </div>
                      </form>
                    )}

                    {/* Admins Table */}
                    <div className="ad-table-wrap">
                      {adminsLoading ? (
                        <div className="ad-loading">Loading admins...</div>
                      ) : (
                        <table>
                          <thead>
                            <tr>
                              <th>Name</th>
                              <th>Email</th>
                              <th>Password</th>
                              <th>Role</th>
                              <th>Contact</th>
                              <th>Joined</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {admins.length === 0 ? (
                              <tr>
                                <td colSpan={7} style={{ textAlign: "center", padding: "20px", color: "#888" }}>
                                  No admins registered yet. Click "+ Add Admin" to register.
                                </td>
                              </tr>
                            ) : (
                              admins.map((a) => (
                                <React.Fragment key={a.id}>
                                  <tr>
                                    <td>{a.name}</td>
                                    <td className="ad-mono" style={{ fontWeight: "600", color: "#2e6cb0" }}>{a.email || "-"}</td>
                                    <td>
                                      {resettingAdminPasswordId === a.id ? (
                                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                          <input type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={{ width: "120px", padding: "4px 8px", border: "1px solid #2e6cb0", borderRadius: "4px", fontSize: "0.85em" }} placeholder="New password" autoFocus />
                                          <button className="ad-btn-primary small" onClick={() => resetAdminPassword(a.id)} style={{ padding: "4px 8px", fontSize: "0.8rem" }}>✓</button>
                                          <button className="ad-btn-outline small" onClick={() => { setResettingAdminPasswordId(null); setNewPassword(""); }} style={{ padding: "4px 8px", fontSize: "0.8rem" }}>✕</button>
                                        </div>
                                      ) : (
                                        <div className="ad-mono" style={{ fontSize: "0.85em", color: "#555", background: "#f4f6f8", padding: "4px 8px", borderRadius: "4px", cursor: "pointer", display: "inline-block" }} onClick={() => { setResettingAdminPasswordId(a.id); setNewPassword(""); }} title="Click to reset password">
                                          •••••••• (click to reset)
                                        </div>
                                      )}
                                    </td>
                                    <td><span className={`ad-badge ad-badge-${roleTone[a.role]}`}>Admin</span></td>
                                    <td className="ad-mono">{a.contact}</td>
                                    <td className="ad-mono">{a.joined || (a.createdAt ? new Date(a.createdAt).toLocaleDateString() : "-")}</td>
                                    <td>
                                      <button className="ad-btn-outline small" type="button" onClick={() => editAdmin(a)} title="Edit admin" style={{ marginRight: "4px" }}>✏️</button>
                                      <button className="ad-icon-btn small danger" type="button" onClick={() => setConfirmDeleteAdminId(a.id)} title="Remove admin">🗑️</button>
                                    </td>
                                  </tr>
                                  {confirmDeleteAdminId === a.id && (
                                    <tr className="ad-edit-row">
                                      <td colSpan={7}>
                                        <div className="ad-delete-confirm">
                                          <span>Remove {a.name} from the system?</span>
                                          <div>
                                            <button className="ad-btn-outline small" type="button" onClick={() => setConfirmDeleteAdminId(null)}>No</button>
                                            <button className="ad-btn-danger small" type="button" onClick={() => deleteAdmin(a.id)}>Yes, Remove</button>
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              ))
                            )}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>

                  {/* COMPLAINT MANAGEMENT - TABLE VIEW */}
                  <div className="ad-panel ad-form-panel" id="complaint-mgmt">
                    <div className="ad-panel-head">
                      <h3>All Complaints</h3>
                      <span className="ad-panel-link">{filteredComplaints.length} total</span>
                    </div>

                    <div className="ad-filter-row">
                      <select className="ad-inline-select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                        {categories.map((c) => (
                          <option key={c} value={c}>{c === "All" ? "All Categories" : c}</option>
                        ))}
                      </select>
                      <select className="ad-inline-select" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
                        <option value="All">All Priorities</option>
                        {priorityOptions.map((p) => (<option key={p} value={p}>{p}</option>))}
                      </select>
                    </div>

                    {assignmentError && <div className="ad-assignment-error" role="alert">{assignmentError}</div>}

                    <div className="ad-table-wrap">
                      {complaintsLoading ? (
                        <div className="ad-loading">Loading complaints...</div>
                      ) : (
                        <table className="ad-all-complaints-table">
                          <colgroup>
                            <col className="ad-col-complaint" />
                            <col className="ad-col-category" />
                            <col className="ad-col-location" />
                            <col className="ad-col-priority" />
                            <col className="ad-col-status" />
                            <col className="ad-col-assignee" />
                            <col className="ad-col-assignee" />
                            <col className="ad-col-photos" />
                            <col className="ad-col-action" />
                          </colgroup>
                          <thead>
                            <tr>
                              <th>Complaint</th>
                              <th>Category</th>
                              <th>Location</th>
                              <th>Priority</th>
                              <th>Status</th>
                              <th>Assigned Staff</th>
                              <th>Verifier</th>
                              <th>Photos</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredComplaints.length === 0 ? (
                              <tr><td colSpan={9} style={{ textAlign: "center", padding: "20px", color: "#888" }}>No complaints found.</td></tr>
                            ) : (
                              filteredComplaints.map((c) => (
                                <React.Fragment key={c.id}>
                                  <tr className={String(selectedId) === String(c.id) ? "ad-row-active" : ""} onClick={() => setSelectedId(c.id)}>
                                    <td className="ad-mono">{c.complaintNumber}</td>
                                    <td>
                                      <div className="ad-cat">
                                        <span className="ad-cat-dot" style={{ background: colorForCategory(c.category) }}></span>
                                        {c.category}
                                      </div>
                                    </td>
                                    <td>
                                      {getLocationString(c.location)}
                                      {(c.coordinates?.latitude ?? c.lat) != null && (c.coordinates?.longitude ?? c.lng) != null && (
                                        <a
                                          className="ad-location-map-link"
                                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${c.coordinates?.latitude ?? c.lat},${c.coordinates?.longitude ?? c.lng}`)}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={(event) => event.stopPropagation()}
                                        >
                                          Open Map · {Number(c.coordinates?.latitude ?? c.lat).toFixed(4)}, {Number(c.coordinates?.longitude ?? c.lng).toFixed(4)}
                                        </a>
                                      )}
                                    </td>
                                    <td><span className={`ad-badge ad-badge-${priorityTone[c.priority]}`}>{c.priority}</span></td>
                                    <td><span className={`ad-badge ad-badge-${statusTone[c.status]}`}>{c.status}</span></td>
                                    <td onClick={(event) => event.stopPropagation()}>
                                      <select
                                        className="ad-assignment-select"
                                        aria-label={`Assign staff for complaint ${c.complaintNumber}`}
                                        value={getStaffAccountId(c)}
                                        disabled={usersLoading || Boolean(usersLoadError) || assignmentSavingKey === String(c.id)}
                                        onChange={(event) => handleInlineAssignment(c, "staff", event.target.value)}
                                      >
                                        <option value="">Unassigned</option>
                                        {adminStaffOptions.map((user) => (
                                          <option key={user.id} value={user.id}>
                                            {user.name} · {user.staffId || user.email}{user.department ? ` · ${user.department}` : ""}
                                          </option>
                                        ))}
                                      </select>
                                      {assignmentSavingKey === String(c.id) && <small className="ad-assignment-saving">Saving…</small>}
                                    </td>
                                    <td onClick={(event) => event.stopPropagation()}>
                                      <select
                                        className="ad-assignment-select"
                                        aria-label={`Assign verifier for complaint ${c.complaintNumber}`}
                                        value={getVerifierAccountId(c)}
                                        disabled={usersLoading || Boolean(usersLoadError) || assignmentSavingKey === String(c.id)}
                                        onChange={(event) => handleInlineAssignment(c, "verifier", event.target.value)}
                                      >
                                        <option value="">Unassigned</option>
                                        {adminVerifierOptions.map((user) => (
                                          <option key={user.id} value={user.id}>
                                            {user.name} · {user.verifierId || user.staffId || user.email}{user.department ? ` · ${user.department}` : ""}
                                          </option>
                                        ))}
                                      </select>
                                      {assignmentSavingKey === String(c.id) && <small className="ad-assignment-saving">Saving…</small>}
                                    </td>
                                    <td className="ad-mono">{getPhotoCount(c)}</td>
                                    <td onClick={(e) => e.stopPropagation()}>
                                      <button 
                                        className="ad-btn-primary small" 
                                        onClick={() => {
                                          setSelectedId(c.id);
                                          setComplaintListType(null);
                                          setShowComplaintDetails(true);
                                        }}
                                      >
                                        View Details
                                      </button>
                                      {c.status === "New" && (
                                        <button className="ad-icon-btn small danger" type="button" onClick={() => setConfirmDeleteComplaintId(c.id)} title="Remove eligible record" style={{ marginLeft: "8px" }}>🗑️</button>
                                      )}
                                    </td>
                                  </tr>
                                  {confirmDeleteComplaintId === c.id && (
                                    <tr className="ad-edit-row">
                                      <td colSpan={9}>
                                        <div className="ad-delete-confirm">
                                          <span>Remove complaint {c.complaintNumber}? Only eligible new records can be removed.</span>
                                          <div>
                                            <button className="ad-btn-outline small" type="button" onClick={() => setConfirmDeleteComplaintId(null)}>No</button>
                                            <button className="ad-btn-danger small" type="button" onClick={() => deleteComplaint(c.id)}>Yes, Remove</button>
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              ))
                            )}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>

                  {/* ================= COMPLAINT ANALYTICS (NEW) ================= */}
                  <div className="ad-panel ad-form-panel" id="complaint-analytics">
                    <div className="ad-panel-head">
                      <h3>Complaint Analytics</h3>
                      <span className="ad-panel-link">Dynamic Real-time Data</span>
                    </div>

                    {analyticsLoading ? (
                      <div className="ad-loading">Loading analytics...</div>
                    ) : analytics ? (
                      <div className="ad-analytics-grid">
                        {/* 1. Category-Wise */}
                        <div className="ad-report-block">
                          <h5>Category-Wise Complaints</h5>
                          {analytics.categoryWise.map((item, i) => (
                            <div className="ad-bar-row" key={i}>
                              <span className="ad-bar-label">{item.label}</span>
                              <div className="ad-bar-track">
                                <div className="ad-bar-fill" style={{ width: `${(item.count / Math.max(1, ...analytics.categoryWise.map(b => b.count))) * 100}%`, background: colorForCategory(item.label) }}></div>
                              </div>
                              <span className="ad-bar-count">{item.count}</span>
                            </div>
                          ))}
                        </div>

                        {/* 2. Area / Location-Wise */}
                        <div className="ad-report-block">
                          <h5>Area / Location-Wise Complaints</h5>
                          {analytics.locationWise.map((item, i) => (
                            <div className="ad-bar-row" key={i}>
                              <span className="ad-bar-label">{getLocationString(item.label)}</span>
                              <div className="ad-bar-track">
                                <div className="ad-bar-fill alt" style={{ width: `${(item.count / Math.max(1, ...analytics.locationWise.map(b => b.count))) * 100}%` }}></div>
                              </div>
                              <span className="ad-bar-count">{item.count}</span>
                            </div>
                          ))}
                        </div>

                        {/* 3. Priority-Wise */}
                        <div className="ad-report-block">
                          <h5>Priority-Wise Complaints</h5>
                          {analytics.priorityWise.map((item, i) => (
                            <div className="ad-bar-row" key={i}>
                              <span className="ad-bar-label">{item.label}</span>
                              <div className="ad-bar-track">
                                <div className={`ad-bar-fill tone-${priorityTone[item.label] || 'navy'}`} style={{ width: `${(item.count / Math.max(1, ...analytics.priorityWise.map(b => b.count))) * 100}%` }}></div>
                              </div>
                              <span className="ad-bar-count">{item.count}</span>
                            </div>
                          ))}
                        </div>

                        {/* 4. Status-Wise */}
                        <div className="ad-report-block">
                          <h5>Status-Wise Complaints</h5>
                          {analytics.statusWise.map((item, i) => (
                            <div className="ad-bar-row" key={i}>
                              <span className="ad-bar-label">{item.label}</span>
                              <div className="ad-bar-track">
                                <div className={`ad-bar-fill tone-${statusTone[item.label] || 'navy'}`} style={{ width: `${(item.count / Math.max(1, ...analytics.statusWise.map(b => b.count))) * 100}%` }}></div>
                              </div>
                              <span className="ad-bar-count">{item.count}</span>
                            </div>
                          ))}
                        </div>

                        {/* 5. Date-Wise */}
                        <div className="ad-report-block">
                          <h5>Date-Wise Complaints</h5>
                          {analytics.dateWise.map((item, i) => (
                            <div className="ad-bar-row" key={i}>
                              <span className="ad-bar-label">{item.label}</span>
                              <div className="ad-bar-track">
                                <div className="ad-bar-fill" style={{ width: `${(item.count / Math.max(1, ...analytics.dateWise.map(b => b.count))) * 100}%` }}></div>
                              </div>
                              <span className="ad-bar-count">{item.count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="ad-loading">No analytics data available.</div>
                    )}
                  </div>

                  {/* ================= MAP DASHBOARD (NEW) ================= */}
                  <div className="ad-panel ad-form-panel" id="map-dashboard">
                    <div className="ad-panel-head">
                      <h3>🗺️ Map Dashboard — Complaint Locations</h3>
                      <span className="ad-panel-link">{filteredMapComplaints.length} complaints on map</span>
                    </div>

                    {/* Map Filters */}
                    <div className="ad-filter-row" style={{ marginBottom: "16px" }}>
                      <select className="ad-inline-select" value={mapCategoryFilter} onChange={(e) => setMapCategoryFilter(e.target.value)}>
                        <option value="All">All Categories</option>
                        {categories.filter(c => c !== "All").map((c) => (<option key={c} value={c}>{c}</option>))}
                      </select>

                      <select className="ad-inline-select" value={mapStatusFilter} onChange={(e) => setMapStatusFilter(e.target.value)}>
                        <option value="All">All Statuses</option>
                        {statusOptions.map((s) => (<option key={s} value={s}>{s}</option>))}
                      </select>

                      <select className="ad-inline-select" value={mapPriorityFilter} onChange={(e) => setMapPriorityFilter(e.target.value)}>
                        <option value="All">All Priorities</option>
                        {priorityOptions.map((p) => (<option key={p} value={p}>{p}</option>))}
                      </select>

                      <button className="ad-btn-outline small" type="button" onClick={resetMapFilters}>Reset Filters</button>
                    </div>

                    {/* Legend */}
                    <div style={{ display: "flex", gap: "16px", marginBottom: "12px", fontSize: "0.85rem", flexWrap: "wrap" }}>
                      <span>📍 Red pins show complaint locations</span>
                      <span style={{ marginLeft: "auto", color: "#666" }}>💡 Click a pin to view complaint details</span>
                    </div>

                    <AdminComplaintsMap
                      complaints={filteredMapComplaints}
                      center={defaultCenter}
                    />

                    {/* Complaints without coordinates */}
                    {mapComplaints.some((complaint) => !hasValidMapCoordinates(complaint)) && (
                      <div style={{ marginTop: "16px", padding: "12px", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: "6px" }}>
                        <strong style={{ color: "#c2410c" }}>⚠️ {mapComplaints.filter((complaint) => !hasValidMapCoordinates(complaint)).length} complaint(s) missing coordinates</strong>
                        <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "#666" }}>These complaints will appear on the map once their locations are geocoded.</p>
                      </div>
                    )}
                  </div>

                  {/* REPORTS & ANALYTICS */}
                  <div className="ad-panel ad-form-panel" id="reports-panel">
                    <div className="ad-panel-head">
                      <h3>Reports &amp; Analytics</h3>
                      <span className="ad-panel-link">Category-wise · Priority-wise</span>
                    </div>
                    <div className="ad-reports-grid">
                      <div className="ad-report-block">
                        <h5>Complaints by Category</h5>
                        {byCategory.map((b) => (
                          <div className="ad-bar-row" key={b.label}>
                            <span className="ad-bar-label">{b.label}</span>
                            <div className="ad-bar-track">
                              <div className="ad-bar-fill" style={{ width: `${(b.count / maxCategoryCount) * 100}%`, background: colorForCategory(b.label) }}></div>
                            </div>
                            <span className="ad-bar-count">{b.count}</span>
                          </div>
                        ))}
                      </div>
                      <div className="ad-report-block">
                        <h5>Complaints by Priority</h5>
                        {byPriority.map((b) => (
                          <div className="ad-bar-row" key={b.label}>
                            <span className="ad-bar-label">{b.label}</span>
                            <div className="ad-bar-track">
                              <div className={`ad-bar-fill tone-${priorityTone[b.label]}`} style={{ width: `${(b.count / maxPriorityCount) * 100}%` }}></div>
                            </div>
                            <span className="ad-bar-count">{b.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* NOTIFICATION MONITORING */}
                  <div className="ad-panel" id="notif-panel">
                    <div className="ad-panel-head">
                      <h3> Notification Monitoring</h3>
                      <button
                        type="button"
                        className="ad-panel-link ad-notif-monitor-link"
                        onClick={() => setShowNotificationMonitoring(true)}
                      >
                        Complete System Monitoring
                      </button>
                    </div>
                    <div className="ad-notif-list">
                      {notifLoading ? (
                        <div className="ad-loading">Loading notifications...</div>
                      ) : notificationFeed.length === 0 ? (
                        <div className="ad-loading">No notifications yet.</div>
                      ) : (
                        <table className="ad-notif-table">
                          <thead>
                            <tr>
                              <th>Notification</th>
                              <th>Complaint</th>
                              <th>Status</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {notificationFeed.map((note) => {
                              const complaint = findComplaintForNotification(note);
                              const canOpenComplaint = Boolean(
                                note.complaintId || note.complaintNumber || note.complaint
                              );

                              return (
                                <tr key={note.id}>
                                  <td className="ad-notif-message-cell">
                                    <span className={`ad-badge ad-badge-${notifTone[note.type] || "navy"} ad-notif-type`}>
                                      {note.type || "Notification"}
                                    </span>
                                    <b>{note.text || note.message || "No message provided."}</b>
                                    <span className="ad-notif-time">{note.time || "Time unavailable"}</span>
                                  </td>
                                  <td className="ad-notif-complaint">
                                    {note.complaintNumber || note.complaint?.complaintNumber || note.complaintId || note.complaint?._id || "—"}
                                  </td>
                                  <td>
                                    <span className={`ad-notif-status ${note.complaintStatus || complaint?.status ? "has-status" : ""}`}>
                                      {note.complaintStatus || complaint?.status || (note.isRead ? "Read" : "New")}
                                    </span>
                                  </td>
                                  <td>
                                    <button
                                      type="button"
                                      className="ad-notif-view-btn"
                                      onClick={() => handleOpenNotificationComplaint(note)}
                                      disabled={!canOpenComplaint}
                                    >
                                      View Details
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}
    </>
  );
};

export default AdminDashboard;