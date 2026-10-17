import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./admindashboard.css";

import AdminProfile from "../adminprofiledashboard/AdminProfile";
import AdminManagement from "../adminprofiledashboard/AdminManagement";
import StaffVerifierProfile from "../adminprofiledashboard/StaffVerifierProfile";
import ComplaintManagement from "../adminprofiledashboard/ComplaintManagement";
import StaffWorkMonitoring from "../adminprofiledashboard/StaffWorkMonitoring";
import ComplaintVerification from "../adminprofiledashboard/ComplaintVerification";
import ReportsManagement from "../adminprofiledashboard/ReportsManagement";
import logo from '../assets/logo.jpeg';
import ComplaintDetails from "../adminprofiledashboard/ComplaintDetails";
import VisitorsOverview from "../components/visitoroverview/VisitorsOverview";
import NotificationMonitoring from "../adminprofiledashboard/Notification";
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from "@react-google-maps/api";
import { API_BASE_URL, fetchDashboard, getStoredUser, getUserId } from "../utils/dashboardApi";

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

// ✅ HELPER: Safely extract location string whether it's an object or plain string
const getLocationString = (loc) => {
  if (!loc) return "Location pending";
  if (typeof loc === 'object' && loc !== null) return loc.address || "Location pending";
  return String(loc);
};

// Google Maps configuration
const mapContainerStyle = {
  width: "100%",
  height: "500px",
  borderRadius: "8px",
};

const defaultCenter = null;

// ✅ Constants outside component so Google Maps script is NOT reloaded on every render
const GOOGLE_MAPS_LIBRARIES = ["places"];
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const mapOptions = {
  styles: [
    { featureType: "poi", stylers: [{ visibility: "off" }] },
  ],
};

const markerIcons = {
  Critical: {
    path: "M12 2L2 22h20L12 2z",
    fillColor: "#cf4438",
    fillOpacity: 1,
    strokeColor: "#8b0000",
    strokeWeight: 2,
    scale: 1.5,
    anchor: { x: 12, y: 22 },
  },
  Urgent: {
    path: "M12 2L2 22h20L12 2z",
    fillColor: "#c1900a",
    fillOpacity: 1,
    strokeColor: "#8b6508",
    strokeWeight: 2,
    scale: 1.3,
    anchor: { x: 12, y: 22 },
  },
  Normal: {
    path: "M12 2L2 22h20L12 2z",
    fillColor: "#1d8a5c",
    fillOpacity: 1,
    strokeColor: "#0d5c3a",
    strokeWeight: 2,
    scale: 1.1,
    anchor: { x: 12, y: 22 },
  },
};

const AdminDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // ✅ Load Google Maps script once (fast reload, no repeated script download)
  const { isLoaded: isMapLoaded, loadError: mapLoadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

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

  // ---------------- ADMINS ----------------
  const [admins, setAdmins] = useState([]);
  const [adminsLoading, setAdminsLoading] = useState(true);

  // ---------------- COMPLAINTS ----------------
  const [complaints, setComplaints] = useState([]);
  const [complaintsLoading, setComplaintsLoading] = useState(true);
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
  const [mapLoading, setMapLoading] = useState(true);
  const [mapCategoryFilter, setMapCategoryFilter] = useState("All");
  const [mapStatusFilter, setMapStatusFilter] = useState("All");
  const [mapPriorityFilter, setMapPriorityFilter] = useState("All");
  const [selectedMapComplaint, setSelectedMapComplaint] = useState(null);
  const [mapCenter, setMapCenter] = useState(defaultCenter);

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

  const openView = (setter) => {
    setShowProfile(false);
    setShowAdminManagement(false);
    setShowComplaintManagement(false);
    setShowComplaintVerification(false);
    setShowComplaintDetails(false);
    setShowStaffMonitoring(false);
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

  const showMessage = (type, text) => {
    setUserMessage({ type, text });
    setTimeout(() => setUserMessage({ type: "", text: "" }), 3000);
  };

  // ---------------- FETCH USERS (Staff & Verifiers) ----------------
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setUsersLoading(true);
        const response = await fetch(`${API_BASE_URL}/users?role=staff,verifier`, {
          headers: getAuthHeaders() // ✅ ADDED
        });
        const data = await response.json();
        if (response.ok && data.success) {
          setUsers(data.users.map(normalizeId));
        }
      } catch (err) {
        console.error("Failed to fetch users:", err);
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
    const fetchComplaints = async () => {
      try {
        setComplaintsLoading(true);
        const response = await fetch(`${API_BASE_URL}/complaints`, {
          headers: getAuthHeaders() // ✅ ADDED
        });
        const data = await response.json();
        if (response.ok && data.success) {
          const normalized = data.complaints.map((complaint) => ({
            ...normalizeId(complaint),
            lat: complaint.lat ?? complaint.coordinates?.latitude,
            lng: complaint.lng ?? complaint.coordinates?.longitude,
          }));
          setComplaints(normalized);
          if (normalized.length > 0) setSelectedId(normalized[0].id);
        }
      } catch (err) {
        console.error("Failed to fetch complaints:", err);
      } finally {
        setComplaintsLoading(false);
      }
    };
    fetchComplaints();
  }, []);

  // ---------------- FETCH NOTIFICATIONS ----------------
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setNotifLoading(true);
        const response = await fetch(`${API_BASE_URL}/notifications`, {
          headers: getAuthHeaders() // ✅ ADDED
        });
        const data = await response.json();
        if (response.ok && data.success) {
          setNotificationFeed(data.notifications.map(normalizeId));
        }
      } catch (err) {
        console.error("Failed to fetch notifications:", err);
      } finally {
        setNotifLoading(false);
      }
    };
    fetchNotifications();
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
        setMapLoading(true);
        const response = await fetch(`${API_BASE_URL}/complaints`, {
          headers: getAuthHeaders() // ✅ ADDED
        });
        const data = await response.json();
        if (response.ok && data.success) {
          const normalized = data.complaints.map(normalizeId);
          setMapComplaints(normalized);
          const firstWithCoords = normalized.find(c => c.lat && c.lng);
          if (firstWithCoords) {
            setMapCenter({ lat: firstWithCoords.lat, lng: firstWithCoords.lng });
          }
        }
      } catch (err) {
        console.error("Failed to fetch map complaints:", err);
      } finally {
        setMapLoading(false);
      }
    };
    fetchMapComplaints();
  }, []);

  // ---------------- SYSTEM OVERVIEW ----------------
  const overviewStats = [
    { label: "Total Complaints", value: complaints.length, icon: "🗂️", tone: "navy" },
    { label: "New Complaints", value: complaints.filter((c) => c.status === "New").length, icon: "🆕", tone: "navy" },
    { label: "Pending", value: complaints.filter((c) => c.status === "Pending").length, icon: "⏳", tone: "amber" },
    { label: "Under Verification", value: complaints.filter((c) => c.status === "Under Verification").length, icon: "🔍", tone: "orange" },
    { label: "Under Action", value: complaints.filter((c) => c.status === "Under Action").length, icon: "🛠️", tone: "orange" },
    { label: "Resolved", value: complaints.filter((c) => c.status === "Resolved").length, icon: "✅", tone: "green" },
    { label: "Critical", value: complaints.filter((c) => c.priority === "Critical").length, icon: "🚨", tone: "red" },
  ];

  const userCounts = [
    { role: "staff", label: "Staff (Contractor)", count: users.filter((u) => u.role === "staff").length },
    { role: "verifier", label: "Verifier (Sarpanch)", count: users.filter((u) => u.role === "verifier").length },
    { role: "admin", label: "Admin", count: admins.length },
  ];

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
  const patchComplaint = async (id, patch, successMsg) => {
    try {
      const response = await fetch(`${API_BASE_URL}/complaints/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(), // ✅ UPDATED
        body: JSON.stringify(patch),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setComplaints(complaints.map((c) => (c.id === id ? { ...c, ...patch } : c)));
        if (successMsg) showMessage("success", successMsg);
      } else {
        showMessage("error", data.message || "Failed to update complaint.");
      }
    } catch (err) {
      console.error("Failed to update complaint:", err);
      showMessage("error", "Unable to reach the server.");
    }
  };

  const updateStatus = (id, status) => patchComplaint(id, { status });
  const updatePriority = (id, priority) => patchComplaint(id, { priority });
  const assignStaff = (id, assignedStaff) => patchComplaint(id, { assignedStaff });
  const assignVerifier = (id, assignedVerifier) => patchComplaint(id, { assignedVerifier });

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
      if (!c.lat || !c.lng) return false;
      const matchesCategory = mapCategoryFilter === "All" || c.category === mapCategoryFilter;
      const matchesStatus = mapStatusFilter === "All" || c.status === mapStatusFilter;
      const matchesPriority = mapPriorityFilter === "All" || c.priority === mapPriorityFilter;
      return matchesCategory && matchesStatus && matchesPriority;
    });
  }, [mapComplaints, mapCategoryFilter, mapStatusFilter, mapPriorityFilter]);

  const handleMarkerClick = useCallback((complaint) => {
    setSelectedMapComplaint(complaint);
    setMapCenter({ lat: complaint.lat, lng: complaint.lng });
  }, []);

  const handleMapClick = useCallback(() => {
    setSelectedMapComplaint(null);
  }, []);

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
          complaint={complaints.find((complaint) => complaint.id === selectedId)}
          onBack={() => setShowComplaintDetails(false)}
        />
      ) : showStaffMonitoring ? (
        <StaffWorkMonitoring onBack={() => setShowStaffMonitoring(false)} />
      ) : showReports ? (
        <ReportsManagement onBack={() => setShowReports(false)} />
      ) : showAdminManagement ? (
        <AdminManagement onBack={() => setShowAdminManagement(false)} />
      ) : showStaffVerifierProfile ? (
        <StaffVerifierProfile
          userId={selectedUserProfile?.id}
          role={selectedUserProfile?.role || "staff"}
          usersList={users} // ✅ PASS THE FULL USERS ARRAY HERE
          onBack={() => {
            setShowStaffVerifierProfile(false);
            setSelectedUserProfile(null);
          }}
        />
      )

        : showNotificationMonitoring ? (
          <NotificationMonitoring
            onBack={() => setShowNotificationMonitoring(false)}
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

                  <button type="button" className="ad-sb-link" onClick={() => openView(setShowComplaintDetails)}>
                    📋 Complaint Details
                  </button>

                  <button type="button" className="ad-sb-link" onClick={() => openView(setShowStaffMonitoring)}>
                    🧑‍🔧 Staff & Work Monitoring
                  </button>

                  <button type="button" className="ad-sb-link" onClick={() => openView(setShowComplaintVerification)}>
                    📈 Complaint Verification
                  </button>
                </nav>

                <div className="ad-sb-label">Insights</div>
                <nav className="ad-sb-nav">
                  <button type="button" className="ad-sb-link" onClick={() => openView(setShowReports)}>
                    📈Reports Management
                  </button>
                  <button type="button" className="ad-sb-link" onClick={() => setShowNotificationMonitoring(true)}>
                    🔔 Notification Monitoring
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

                  {/* COMPLAINT MANAGEMENT */}
                  <div className="ad-panel ad-form-panel" id="complaint-mgmt">
                    <div className="ad-panel-head">
                      <h3>Complaint Management</h3>
                      <span className="ad-panel-link">{filteredComplaints.length} shown</span>
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

                    <div className="ad-table-wrap">
                      {complaintsLoading ? (
                        <div className="ad-loading">Loading complaints...</div>
                      ) : (
                        <table>
                          <thead>
                            <tr>
                              <th>Complaint</th>
                              <th>Category</th>
                              <th>Location</th>
                              <th>Priority</th>
                              <th>Status</th>
                              <th>Photos</th>
                              <th></th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredComplaints.length === 0 ? (
                              <tr><td colSpan={7} style={{ textAlign: "center", padding: "20px", color: "#888" }}>No complaints found.</td></tr>
                            ) : (
                              filteredComplaints.map((c) => (
                                <React.Fragment key={c.id}>
                                  <tr className={selectedId === c.id ? "ad-row-active" : ""} onClick={() => setSelectedId(c.id)}>
                                    <td className="ad-mono">{c.complaintNumber}</td>
                                    <td>
                                      <div className="ad-cat">
                                        <span className="ad-cat-dot" style={{ background: colorForCategory(c.category) }}></span>
                                        {c.issue}
                                      </div>
                                    </td>
                                    <td>{getLocationString(c.location)}</td>
                                    <td><span className={`ad-badge ad-badge-${priorityTone[c.priority]}`}>{c.priority}</span></td>
                                    <td><span className={`ad-badge ad-badge-${statusTone[c.status]}`}>{c.status}</span></td>
                                    <td className="ad-mono">{c.photos}</td>
                                    <td onClick={(e) => e.stopPropagation()}>
                                      {c.status === "New" && (
                                        <button className="ad-icon-btn small danger" type="button" onClick={() => setConfirmDeleteComplaintId(c.id)} title="Remove eligible record">🗑️</button>
                                      )}
                                    </td>
                                  </tr>
                                  {confirmDeleteComplaintId === c.id && (
                                    <tr className="ad-edit-row">
                                      <td colSpan={7}>
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
                      <span><span style={{ color: "#cf4438", fontWeight: "bold" }}>▲</span> Critical</span>
                      <span><span style={{ color: "#c1900a", fontWeight: "bold" }}>▲</span> Urgent</span>
                      <span><span style={{ color: "#1d8a5c", fontWeight: "bold" }}>▲</span> Normal</span>
                      <span style={{ marginLeft: "auto", color: "#666" }}>💡 Click a marker to view details</span>
                    </div>

                    {/* Google Map */}
                    {mapLoadError ? (
                      <div className="ad-loading">Failed to load Google Maps. Please check your API key / internet connection.</div>
                    ) : !isMapLoaded ? (
                      <div className="ad-loading">Loading map...</div>
                    ) : !mapCenter ? (
                      <div className="ad-loading">No complaint coordinates are available yet.</div>
                    ) : (
                      <GoogleMap mapContainerStyle={mapContainerStyle} center={mapCenter} zoom={13} onClick={handleMapClick} options={mapOptions}>
                        {filteredMapComplaints.map((complaint) => (
                          <Marker
                            key={complaint.id}
                            position={{ lat: complaint.lat, lng: complaint.lng }}
                            onClick={() => handleMarkerClick(complaint)}
                            icon={markerIcons[complaint.priority] || markerIcons.Normal}
                            title={`${complaint.complaintNumber} - ${complaint.issue}`}
                          />
                        ))}

                        {selectedMapComplaint && (
                          <InfoWindow position={{ lat: selectedMapComplaint.lat, lng: selectedMapComplaint.lng }} onCloseClick={() => setSelectedMapComplaint(null)}>
                            <div style={{ minWidth: "250px", maxWidth: "320px" }}>
                              <h4 style={{ margin: "0 0 8px 0", fontSize: "1rem", color: "#1e293b" }}>{selectedMapComplaint.complaintNumber}</h4>
                              <p style={{ margin: "4px 0", fontSize: "0.85rem" }}><strong>Issue:</strong> {selectedMapComplaint.issue}</p>
                              <p style={{ margin: "4px 0", fontSize: "0.85rem" }}><strong>Category:</strong> <span style={{ color: colorForCategory(selectedMapComplaint.category) }}>{selectedMapComplaint.category}</span></p>
                              <p style={{ margin: "4px 0", fontSize: "0.85rem" }}><strong>Status:</strong> <span className={`ad-badge ad-badge-${statusTone[selectedMapComplaint.status]}`} style={{ fontSize: "0.75rem" }}>{selectedMapComplaint.status}</span></p>
                              <p style={{ margin: "4px 0", fontSize: "0.85rem" }}><strong>Priority:</strong> <span className={`ad-badge ad-badge-${priorityTone[selectedMapComplaint.priority]}`} style={{ fontSize: "0.75rem" }}>{selectedMapComplaint.priority}</span></p>
                              <p style={{ margin: "4px 0", fontSize: "0.85rem" }}><strong>Location:</strong> {getLocationString(selectedMapComplaint.location)}</p>
                              <p style={{ margin: "4px 0", fontSize: "0.85rem" }}><strong>Citizen:</strong> {selectedMapComplaint.citizenName}</p>
                              <p style={{ margin: "4px 0", fontSize: "0.85rem" }}><strong>Date:</strong> {selectedMapComplaint.date}</p>
                              {selectedMapComplaint.description && (
                                <p style={{ margin: "8px 0 4px 0", fontSize: "0.8rem", color: "#555", fontStyle: "italic" }}>"{selectedMapComplaint.description}"</p>
                              )}
                              {selectedMapComplaint.photos > 0 && (
                                <p style={{ margin: "4px 0", fontSize: "0.8rem", color: "#2e6cb0" }}>{selectedMapComplaint.photos} photo(s) attached</p>
                              )}
                              {selectedMapComplaint.photoUrls && selectedMapComplaint.photoUrls.length > 0 && (
                                <div style={{ margin: "8px 0", display: "flex", gap: "4px", flexWrap: "wrap" }}>
                                  {selectedMapComplaint.photoUrls.map((url, idx) => (
                                    <img key={idx} src={url} alt={`Photo ${idx + 1}`} style={{ width: "60px", height: "60px", objectFit: "cover", borderRadius: "4px", border: "1px solid #ddd" }} />
                                  ))}
                                </div>
                              )}
                              <div style={{ marginTop: "8px", display: "flex", gap: "4px", flexWrap: "wrap" }}>
                                <a href={`https://www.google.com/maps/search/?api=1&query=${selectedMapComplaint.lat},${selectedMapComplaint.lng}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.75rem", color: "#2e6cb0", textDecoration: "none" }}>📍 Open in Google Maps</a>
                              </div>
                            </div>
                          </InfoWindow>
                        )}
                      </GoogleMap>
                    )}

                    {/* Complaints without coordinates */}
                    {mapComplaints.some(c => !c.lat || !c.lng) && (
                      <div style={{ marginTop: "16px", padding: "12px", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: "6px" }}>
                        <strong style={{ color: "#c2410c" }}>⚠️ {mapComplaints.filter(c => !c.lat || !c.lng).length} complaint(s) missing coordinates</strong>
                        <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "#666" }}>These complaints will appear on the map once their locations are geocoded.</p>
                      </div>
                    )}
                  </div>

                  {/* COMPLAINT DETAILS */}
                  {selected && (
                    <div className="ad-panel ad-form-panel">
                      <div className="ad-panel-head">
                        <h3>Complaint Details — {selected.complaintNumber}</h3>
                      </div>
                      <div className="ad-detail-grid">
                        <div className="ad-detail-item"><span>Citizen</span><b>{selected.citizenName}</b></div>
                        <div className="ad-detail-item"><span>Category</span><b>{selected.category}</b></div>
                        <div className="ad-detail-item"><span>Location</span><b>{getLocationString(selected.location)}</b></div>
                        <div className="ad-detail-item"><span>Date Reported</span><b>{selected.date}</b></div>
                        <div className="ad-detail-item ad-detail-wide"><span>Description</span><b>{selected.description}</b></div>
                      </div>
                      <div className="ad-update-row">
                        <div className="ad-field">
                          <label htmlFor="upd-status">Update Status</label>
                          <select id="upd-status" className="ad-inline-select" value={selected.status} onChange={(e) => updateStatus(selected.id, e.target.value)}>
                            {statusOptions.map((s) => (<option key={s} value={s}>{s}</option>))}
                          </select>
                        </div>
                        <div className="ad-field">
                          <label htmlFor="upd-priority">Update Priority</label>
                          <select id="upd-priority" className="ad-inline-select" value={selected.priority} onChange={(e) => updatePriority(selected.id, e.target.value)}>
                            {priorityOptions.map((p) => (<option key={p} value={p}>{p}</option>))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STAFF / VERIFIER ASSIGNMENT */}
                  {selected && (
                    <div className="ad-panel ad-form-panel" id="assignment-panel">
                      <div className="ad-panel-head">
                        <h3>Staff / Verifier Assignment — {selected.complaintNumber}</h3>
                      </div>
                      <div className="ad-assign-grid">
                        <div className="ad-assign-card">
                          <h5>Staff Assignment</h5>
                          <p>Assigned issues, work status and action taken are tracked on the staff dashboard once assigned.</p>
                          <div className="ad-field">
                            <label htmlFor="assign-staff">Assign Staff</label>
                            <select id="assign-staff" className="ad-inline-select" value={selected.assignedStaff} onChange={(e) => assignStaff(selected.id, e.target.value)}>
                              <option value="">Unassigned</option>
                              {staffList.map((s) => (<option key={s.id} value={s.name}>{s.name}</option>))}
                            </select>
                          </div>
                        </div>
                        <div className="ad-assign-card">
                          <h5>Verifier Assignment</h5>
                          <p>Verifiers pick this up in their verification queue to approve or reject completed work.</p>
                          <div className="ad-field">
                            <label htmlFor="assign-verifier">Assign Verifier</label>
                            <select id="assign-verifier" className="ad-inline-select" value={selected.assignedVerifier} onChange={(e) => assignVerifier(selected.id, e.target.value)}>
                              <option value="">Unassigned</option>
                              {verifierList.map((v) => (<option key={v.id} value={v.name}>{v.name}</option>))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* LOCATION / MAP VIEW */}
                  {showMapView && (
                    <div className="ad-panel ad-form-panel" id="map-section">
                      <div className="ad-panel-head">
                        <h3>Complaint Locations — Category &amp; Area-wise</h3>
                        <span className="ad-panel-link" onClick={() => setShowMapView(false)} style={{ cursor: "pointer" }}>Hide Map View</span>
                      </div>
                      <div className="ad-map-grid">
                        {Object.entries(mapGroups).map(([location, group]) => (
                          <div className="ad-map-ward-card" key={location}>
                            <p className="ad-map-ward-name">{location}</p>
                            <div className="ad-map-pins">
                              {group.map((c) => (
                                <span className="ad-map-pin" key={c.id} style={{ background: colorForCategory(c.category) }} title={`${c.complaintNumber} — ${c.category} · ${c.priority}`}>📍</span>
                              ))}
                            </div>
                            <span className="ad-map-ward-count">
                              {group.length} issue{group.length !== 1 ? "s" : ""}
                              {group.some((c) => c.priority === "Critical") ? " · includes critical" : ""}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

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
                      <h3>🔔 Notification Monitoring</h3>
                      <span className="ad-panel-link">Complete System Monitoring</span>
                    </div>
                    <div className="ad-notif-list">
                      {notifLoading ? (
                        <div className="ad-loading">Loading notifications...</div>
                      ) : notificationFeed.length === 0 ? (
                        <div className="ad-loading">No notifications yet.</div>
                      ) : (
                        notificationFeed.map((note) => (
                          <div className="ad-notif-item" key={note.id}>
                            <span className={`ad-badge ad-badge-${notifTone[note.type] || "navy"} ad-notif-type`}>{note.type}</span>
                            <div>
                              <b>{note.text}</b>
                              <span>{note.time}</span>
                            </div>
                          </div>
                        ))
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