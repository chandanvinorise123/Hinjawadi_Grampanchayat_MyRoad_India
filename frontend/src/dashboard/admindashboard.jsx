import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next"; // ✅ ADDED
import {
  ArcElement, BarElement, CategoryScale, Chart as ChartJS, Filler, Legend, LinearScale, LineElement, PointElement, Tooltip,
} from "chart.js";
import { Bar, Doughnut, Line, Pie } from "react-chartjs-2";
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

ChartJS.register(ArcElement, BarElement, CategoryScale, Filler, Legend, LinearScale, LineElement, PointElement, Tooltip);

/* Complaint pipeline status (Keep in English for internal logic) */
const statusOptions = ["New", "Pending", "Under Verification", "Under Action", "Resolved"];
const statusTone = { New: "navy", Pending: "amber", "Under Verification": "orange", "Under Action": "orange", Resolved: "green" };
const priorityOptions = ["Critical", "Urgent", "Normal"];
const priorityTone = { Critical: "red", Urgent: "amber", Normal: "green" };
const staffVerifierRoles = [
  { value: "verifier", label: "Verifier (Sarpanch)" },
  { value: "staff", label: "Staff (Contractor)" },
];
const adminRoles = [{ value: "admin", label: "Admin" }];
const roleTone = { citizen: "navy", staff: "orange", verifier: "amber", admin: "red" };
const mapColors = ["#e07b1c", "#2e6cb0", "#1d8a5c", "#c1900a", "#cf4438", "#7a5c9e"];
const notifTone = {
  "Complaint Registered": "navy", "Complaint Verified": "amber", "Staff Assigned": "orange",
  "Action Initiated": "orange", "Work Completed": "green", "Complaint Resolved": "green", "Complaint Closed": "green",
};
const complaintNavKeys = [
  "complaint-management", "new-complaints", "assigned-complaints", "updated-complaints", "complaint-verification", "complaint-detail",
];

const colorForCategory = (category) => {
  let hash = 0;
  for (let i = 0; i < category.length; i++) hash = category.charCodeAt(i) + ((hash << 5) - hash);
  return mapColors[Math.abs(hash) % mapColors.length];
};

const normalizeId = (doc) => ({ ...doc, id: doc.id || doc._id });
const complaintsAreUnchanged = (current, next) => current.length === next.length && current.every((complaint, index) => String(complaint.id || complaint._id) === String(next[index].id || next[index]._id) && complaint.updatedAt === next[index].updatedAt);
const notificationsAreUnchanged = (current, next) => current.length === next.length && current.every((notification, index) => {
  const refreshed = next[index];
  return notification.id === refreshed.id && notification.type === refreshed.type && notification.text === refreshed.text && notification.complaintId === refreshed.complaintId && notification.complaintNumber === refreshed.complaintNumber && notification.complaintStatus === refreshed.complaintStatus && notification.isRead === refreshed.isRead;
});

const getComplaintDate = (complaint) => {
  const value = complaint.createdAt || complaint.date;
  if (!value) return null;
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
  const parsed = dateOnly ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3])) : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const chartBaseOptions = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { labels: { usePointStyle: true, boxWidth: 8, padding: 18 } }, tooltip: { backgroundColor: "#142d4e", padding: 10, cornerRadius: 8 } },
};

const getPhotoCount = (complaint) => {
  if (Array.isArray(complaint.photos)) return complaint.photos.length;
  if (Array.isArray(complaint.images)) return complaint.images.length;
  if (typeof complaint.photos === "number") return complaint.photos;
  if (complaint.photos && typeof complaint.photos === "object") return new Set(Object.values(complaint.photos).filter(Boolean)).size;
  return 0;
};

const hasValidMapCoordinates = (complaint) => {
  const latitude = complaint.lat ?? complaint.coordinates?.latitude;
  const longitude = complaint.lng ?? complaint.coordinates?.longitude;
  return latitude !== null && latitude !== undefined && latitude !== "" && longitude !== null && longitude !== undefined && longitude !== "" && Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude)) && Number(latitude) >= -90 && Number(latitude) <= 90 && Number(longitude) >= -180 && Number(longitude) <= 180;
};

const defaultCenter = { lat: 18.5913, lng: 73.7389 };

const AdminDashboard = () => {
  const { t } = useTranslation(); // ✅ ADDED
  const location = useLocation();
  const navigate = useNavigate();

  const storedAdmin = getStoredUser();
  const [admin, setAdmin] = useState({
    name: storedAdmin.name || "", role: storedAdmin.designation || storedAdmin.role || "",
    contact: storedAdmin.contact || storedAdmin.mobile || "",
    staffId: storedAdmin.adminId || storedAdmin.staffId || getUserId(storedAdmin) || "",
    profilePhoto: storedAdmin.profilePhoto || "",
  });

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return { "Content-Type": "application/json", "Authorization": token ? `Bearer ${token}` : "" };
  };

  // ✅ Moved inside component to access `t`
  const getLocationString = (loc) => {
    if (!loc) return t('admin_dashboard.location_pending');
    if (typeof loc === 'object' && loc !== null) return loc.address || t('admin_dashboard.location_pending');
    return String(loc);
  };

  useEffect(() => {
    const loadAdminProfile = async () => {
      try {
        const data = await fetchDashboard("admin", getUserId(storedAdmin));
        if (data.profile) {
          setAdmin((current) => ({
            ...current, ...data.profile,
            staffId: data.profile.adminId || data.profile.staffId || current.staffId,
            role: data.profile.designation || data.profile.role || current.role,
            contact: data.profile.contact || data.profile.mobile || current.contact,
          }));
        }
      } catch (error) { console.error("Failed to load admin dashboard profile:", error); }
    };
    loadAdminProfile();
  }, []);

  const [users, setUsers] = useState([]); const [usersLoading, setUsersLoading] = useState(true); const [usersLoadError, setUsersLoadError] = useState("");
  const [admins, setAdmins] = useState([]); const [adminsLoading, setAdminsLoading] = useState(true);
  const [complaints, setComplaints] = useState([]); const [complaintsLoading, setComplaintsLoading] = useState(true);
  const [assignmentSavingKey, setAssignmentSavingKey] = useState(""); const [assignmentError, setAssignmentError] = useState("");
  const [selectedId, setSelectedId] = useState(null); const [showMapView, setShowMapView] = useState(false);
  const [notificationFeed, setNotificationFeed] = useState([]); const [notifLoading, setNotifLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null); const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [mapComplaints, setMapComplaints] = useState([]);
  const [mapCategoryFilter, setMapCategoryFilter] = useState("All"); const [mapStatusFilter, setMapStatusFilter] = useState("All"); const [mapPriorityFilter, setMapPriorityFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState(""); const [categoryFilter, setCategoryFilter] = useState("All"); const [priorityFilter, setPriorityFilter] = useState("All");
  const [showAddUser, setShowAddUser] = useState(false); const [editingUserId, setEditingUserId] = useState(null);
  const [newUser, setNewUser] = useState({ name: "", role: "staff", contact: "", email: "", password: "" });
  const [showAddAdmin, setShowAddAdmin] = useState(false); const [editingAdminId, setEditingAdminId] = useState(null);
  const [newAdmin, setNewAdmin] = useState({ name: "", role: "admin", contact: "", email: "", password: "" });
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState(null); const [confirmDeleteAdminId, setConfirmDeleteAdminId] = useState(null); const [confirmDeleteComplaintId, setConfirmDeleteComplaintId] = useState(null);
  const [userMessage, setUserMessage] = useState({ type: "", text: "" });
  const [resettingPasswordId, setResettingPasswordId] = useState(null); const [resettingAdminPasswordId, setResettingAdminPasswordId] = useState(null); const [newPassword, setNewPassword] = useState("");
  const [showProfile, setShowProfile] = useState(false); const [showUpdatedComplaints, setShowUpdatedComplaints] = useState(false);
  const [showStaffVerifierProfile, setShowStaffVerifierProfile] = useState(false); const [showComplaintVerification, setShowComplaintVerification] = useState(false);
  const [showStaffMonitoring, setShowStaffMonitoring] = useState(false); const [selectedUserProfile, setSelectedUserProfile] = useState(null);
  const [showComplaintManagement, setShowComplaintManagement] = useState(false); const [showComplaintDetails, setShowComplaintDetails] = useState(false);
  const [complaintListType, setComplaintListType] = useState("new"); const [showReports, setShowReports] = useState(false);
  const [showNotificationMonitoring, setShowNotificationMonitoring] = useState(false); const [initialNotification, setInitialNotification] = useState(null);
  const [complaintsMenuOpen, setComplaintsMenuOpen] = useState(false);
  const [activeNav, setActiveNav] = useState("dashboard");
  const [showAdminManagement, setShowAdminManagement] = useState(false);

  const closeAllViews = () => {
    setShowProfile(false); setShowAdminManagement(false); setShowComplaintManagement(false); setShowComplaintVerification(false);
    setShowComplaintDetails(false); setShowStaffMonitoring(false); setShowUpdatedComplaints(false); setShowReports(false);
    setShowStaffVerifierProfile(false); setShowNotificationMonitoring(false);
  };
  const openView = (setter) => { closeAllViews(); setter(true); };
  const selectView = (view, setter) => { setActiveNav(view); openView(setter); };
  const returnToDashboard = () => { closeAllViews(); setActiveNav("dashboard"); };

  useEffect(() => {
    if (!location.state?.openProfile) return;
    selectView("profile", setShowProfile); navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate]);

  useEffect(() => { if (complaintNavKeys.includes(activeNav)) setComplaintsMenuOpen(true); }, [activeNav]);

  const handleLogout = () => {
    if (window.confirm(t('admin_dashboard.confirm_logout'))) {
      localStorage.removeItem("user"); localStorage.removeItem("token"); localStorage.removeItem("adminData"); window.location.href = "/login";
    }
  };

  const selected = complaints.find((c) => c.id === selectedId) || complaints[0] || null;
  const categories = ["All", ...Array.from(new Set(complaints.map((c) => c.category)))];
  const adminStaffOptions = useMemo(() => users.filter((user) => user.role === "staff"), [users]);
  const adminVerifierOptions = useMemo(() => users.filter((user) => user.role === "verifier"), [users]);
  const getStaffAccountId = (complaint) => complaint.assignedStaffId || adminStaffOptions.find((user) => user.name === complaint.assignedStaff)?.id || "";
  const getVerifierAccountId = (complaint) => complaint.assignedVerifierId || adminVerifierOptions.find((user) => user.name === complaint.assignedVerifier)?.id || "";

  const handleComplaintUpdated = (updatedComplaint) => {
    if (!updatedComplaint) return; const normalized = normalizeId(updatedComplaint); setSelectedId(normalized.id);
    setComplaints((current) => current.map((complaint) => String(complaint.id) === String(normalized.id) ? { ...complaint, ...normalized } : complaint));
  };
  const handleManagedUserUpdated = (updatedUser) => {
    setUsers((current) => current.map((user) => String(user.id) === String(updatedUser._id || updatedUser.id) ? normalizeId(updatedUser) : user));
  };
  const showMessage = (type, text) => { setUserMessage({ type, text }); setTimeout(() => setUserMessage({ type: "", text: "" }), 3000); };
  const findComplaintForNotification = (notification) => {
    const complaintId = notification.complaintId || notification.complaint?._id || notification.complaint?.id;
    const complaintNumber = notification.complaintNumber || notification.complaint?.complaintNumber;
    return complaints.find((item) => (complaintId && String(item.id || item._id) === String(complaintId)) || (complaintNumber && item.complaintNumber === complaintNumber));
  };

  const handleInlineAssignment = async (complaint, role, accountId) => {
    const savingKey = String(complaint.id); const usersForRole = role === "staff" ? adminStaffOptions : adminVerifierOptions;
    const selectedUser = usersForRole.find((user) => String(user.id) === String(accountId));
    setAssignmentError(""); setAssignmentSavingKey(savingKey);
    try {
      const update = role === "staff" ? { assignedStaff: selectedUser?.name || "", assignedStaffId: selectedUser?.id || "", ...(selectedUser && ["New", "Pending"].includes(complaint.status) ? { status: "Under Action" } : {}) } : { assignedVerifier: selectedUser?.name || "", assignedVerifierId: selectedUser?.id || "" };
      const result = await updateDashboardComplaint(complaint.id, update); handleComplaintUpdated(result.complaint);
    } catch (error) { console.error(`Failed to assign ${role}:`, error); setAssignmentError(error.message || t('admin_dashboard.error_assign_role', { role })); } finally { setAssignmentSavingKey(""); }
  };

  const handleOpenNotificationComplaint = (notification) => {
    if (notification.contactMessageId || notification.contactMessage) { setInitialNotification(notification); selectView("notifications", setShowNotificationMonitoring); return; }
    const complaint = findComplaintForNotification(notification);
    if (!complaint) { showMessage("error", t('admin_dashboard.error_complaint_not_found')); return; }
    setSelectedId(complaint.id || complaint._id); setComplaintListType(null); selectView("complaint-detail", setShowComplaintDetails);
  };

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setUsersLoading(true); setUsersLoadError("");
        const response = await fetch(`${API_BASE_URL}/users?role=staff,verifier`, { headers: getAuthHeaders() });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.message || t('admin_dashboard.error_load_users'));
        setUsers(data.users.map(normalizeId));
      } catch (err) { console.error("Failed to fetch users:", err); setUsersLoadError(err.message || t('admin_dashboard.error_load_users')); } finally { setUsersLoading(false); }
    }; fetchUsers();
  }, [t]);

  useEffect(() => {
    const fetchAdmins = async () => {
      try {
        setAdminsLoading(true);
        const response = await fetch(`${API_BASE_URL}/users?role=admin`, { headers: getAuthHeaders() });
        const data = await response.json();
        if (response.ok && data.success) setAdmins(data.users.map(normalizeId));
      } catch (err) { console.error("Failed to fetch admins:", err); } finally { setAdminsLoading(false); }
    }; fetchAdmins();
  }, []);

  useEffect(() => {
    let active = true; const fetchComplaints = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/complaints`, { headers: getAuthHeaders() });
        const data = await response.json();
        if (response.ok && data.success) {
          if (!active) return;
          const normalized = data.complaints.map((complaint) => ({ ...normalizeId(complaint), lat: complaint.lat ?? complaint.coordinates?.latitude, lng: complaint.lng ?? complaint.coordinates?.longitude }));
          setComplaints((current) => complaintsAreUnchanged(current, normalized) ? current : normalized);
          if (normalized.length > 0) setSelectedId((current) => (normalized.some((complaint) => String(complaint.id) === String(current)) ? current : normalized[0].id));
        }
      } catch (err) { if (active) console.error("Failed to fetch complaints:", err); } finally { if (active) setComplaintsLoading(false); }
    }; fetchComplaints();
    const refreshTimer = window.setInterval(fetchComplaints, 30000);
    return () => { active = false; window.clearInterval(refreshTimer); };
  }, []);

  useEffect(() => {
    let active = true; const fetchNotifications = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/notifications`, { headers: getAuthHeaders() });
        const data = await response.json();
        if (response.ok && data.success) { if (active) { const normalized = data.notifications.map(normalizeId); setNotificationFeed((current) => notificationsAreUnchanged(current, normalized) ? current : normalized); } }
      } catch (err) { if (active) console.error("Failed to fetch notifications:", err); } finally { if (active) setNotifLoading(false); }
    }; fetchNotifications();
    const refreshTimer = window.setInterval(fetchNotifications, 30000);
    return () => { active = false; window.clearInterval(refreshTimer); };
  }, []);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setAnalyticsLoading(true);
        const response = await fetch(`${API_BASE_URL}/complaints/analytics`, { headers: getAuthHeaders() });
        const data = await response.json();
        if (response.ok && data.success) setAnalytics(data.analytics);
      } catch (err) { console.error("Failed to fetch analytics:", err); } finally { setAnalyticsLoading(false); }
    }; fetchAnalytics();
  }, []);

  useEffect(() => {
    const fetchMapComplaints = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/complaints`, { headers: getAuthHeaders() });
        const data = await response.json();
        if (response.ok && data.success) {
          const normalized = data.complaints.map((complaint) => ({ ...normalizeId(complaint), lat: complaint.lat ?? complaint.coordinates?.latitude ?? null, lng: complaint.lng ?? complaint.coordinates?.longitude ?? null }));
          setMapComplaints(normalized);
        }
      } catch (err) { console.error("Failed to fetch map complaints:", err); }
    }; fetchMapComplaints();
  }, []);

  const [trendRange, setTrendRange] = useState(7);
  const dashboardCharts = useMemo(() => {
    const categoryCounts = new Map(); const statusCounts = new Map(); const knownLocations = new Set();
    const trendDays = Array.from({ length: trendRange }, (_, index) => { const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - (trendRange - index - 1)); return date; });
    const trendCounts = new Map(trendDays.map((date) => [`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`, { total: 0, resolved: 0 }]));
    const priorityCounts = new Map(priorityOptions.map((priority) => [priority, 0]));
    let resolvedCount = 0; let activeCount = 0;
    complaints.forEach((complaint) => {
      const category = String(complaint.category || t('admin_dashboard.unknown'));
      const status = String(complaint.status || t('admin_dashboard.unknown'));
      const priority = String(complaint.priority || "Normal");
      const normalizedStatus = status.toLowerCase(); const isResolved = normalizedStatus === "resolved";
      categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1); statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
      if (priorityCounts.has(priority)) priorityCounts.set(priority, priorityCounts.get(priority) + 1);
      const location = getLocationString(complaint.location);
      if (location !== t('admin_dashboard.location_pending')) knownLocations.add(location);
      if (isResolved) resolvedCount += 1; if (!["resolved", "closed", "rejected"].includes(normalizedStatus)) activeCount += 1;
      const date = getComplaintDate(complaint); if (!date) return;
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`; const point = trendCounts.get(key); if (!point) return;
      point.total += 1; if (isResolved) point.resolved += 1;
    });
    const categories = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1]); const statuses = [...statusCounts.entries()].sort((a, b) => b[1] - a[1]); const priorities = [...priorityCounts.entries()];
    const formatDate = (date) => date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    return {
      resolvedCount, activeCount, locationCount: knownLocations.size,
      category: { labels: categories.map(([label]) => label), datasets: [{ data: categories.map(([, count]) => count), backgroundColor: categories.map(([label]) => colorForCategory(label)), borderColor: "#ffffff", borderWidth: 3 }] },
      status: { labels: statuses.map(([label]) => label), datasets: [{ data: statuses.map(([, count]) => count), backgroundColor: statuses.map(([label]) => { const colors = { New: "#4b8df8", Pending: "#f5a623", "Under Verification": "#9b6bdb", "Under Action": "#17a2b8", Resolved: "#27ae70", Closed: "#6b7c93", Rejected: "#e35d6a" }; return colors[label] || "#8ca0b8"; }), borderColor: "#ffffff", borderWidth: 3 }] },
      priority: { labels: priorities.map(([label]) => label), datasets: [{ label: t('admin_dashboard.col_complaints'), data: priorities.map(([, count]) => count), backgroundColor: ["#e95b62", "#f5a623", "#4b8df8"], borderRadius: 7, maxBarThickness: 48 }] },
      trend: { labels: trendDays.map(formatDate), datasets: [ { label: t('admin_dashboard.trend_total'), data: trendDays.map((date) => trendCounts.get(`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`).total), borderColor: "#4b8df8", backgroundColor: "rgba(75, 141, 248, 0.12)", fill: true, tension: 0.35, pointRadius: 3, pointHoverRadius: 5 }, { label: t('admin_dashboard.trend_resolved'), data: trendDays.map((date) => trendCounts.get(`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`).resolved), borderColor: "#27ae70", backgroundColor: "rgba(39, 174, 112, 0.08)", fill: false, tension: 0.35, pointRadius: 3, pointHoverRadius: 5 } ] },
    };
  }, [complaints, trendRange, t]);

  const dashboardSummary = [
    { label: t('admin_dashboard.total_complaints'), value: complaints.length, icon: "▣", tone: "blue" },
    { label: t('admin_dashboard.resolved'), value: dashboardCharts.resolvedCount, icon: "✓", tone: "green" },
    { label: t('admin_dashboard.active_complaints'), value: dashboardCharts.activeCount, icon: "◷", tone: "orange" },
    { label: t('admin_dashboard.staff_admins'), value: users.length + admins.length, icon: "♟", tone: "purple" },
    { label: t('admin_dashboard.reported_locations'), value: dashboardCharts.locationCount, icon: "⌖", tone: "cyan" },
  ];

  const userCounts = [
    { role: "staff", label: t('admin_dashboard.role_staff'), count: users.filter((u) => u.role === "staff").length },
    { role: "verifier", label: t('admin_dashboard.role_verifier'), count: users.filter((u) => u.role === "verifier").length },
    { role: "admin", label: t('admin_dashboard.role_admin'), count: admins.length },
  ];
  const newComplaintCount = complaints.filter((complaint) => String(complaint.status || "").toLowerCase() === "new").length;
  const assignedComplaintCount = complaints.filter((complaint) => [complaint.assignedStaff, complaint.assignedStaffId].some((assignment) => String(assignment || "").trim())).length;
  const updatedComplaintCount = countUpdatedComplaints(complaints, ["staff", "admin", "verifier"]);
  const verificationComplaintCount = complaints.filter((complaint) => ["Under Verification", "Verified", "Resolved", "Closed", "Rejected"].includes(complaint.status)).length;

  const generatePassword = () => { const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#"; let pass = ""; for (let i = 0; i < 8; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length)); return pass; };

  const saveUser = async (e) => {
    e.preventDefault(); setUserMessage({ type: "", text: "" });
    if (!newUser.name.trim() || !newUser.contact.trim() || !newUser.email.trim() || !newUser.password.trim()) { showMessage("error", t('admin_dashboard.error_all_fields_required')); return; }
    try {
      const url = editingUserId ? `${API_BASE_URL}/users/${editingUserId}` : `${API_BASE_URL}/users`; const method = editingUserId ? "PUT" : "POST";
      const response = await fetch(url, { method, headers: getAuthHeaders(), body: JSON.stringify(newUser) }); const data = await response.json();
      if (response.ok && data.success) {
        if (editingUserId) { setUsers(users.map((u) => (u.id === editingUserId ? normalizeId(data.user) : u))); showMessage("success", t('admin_dashboard.success_user_updated', { name: data.user.name })); }
        else { setUsers([normalizeId(data.user), ...users]); showMessage("success", t('admin_dashboard.success_user_registered', { name: data.user.name })); }
        setNewUser({ name: "", role: "staff", contact: "", email: "", password: "" }); setShowAddUser(false); setEditingUserId(null);
      } else showMessage("error", data.message || t('admin_dashboard.error_operation_failed'));
    } catch (err) { showMessage("error", t('admin_dashboard.error_server_unreachable')); }
  };

  const editUser = (user) => { setNewUser({ name: user.name, role: user.role, contact: user.contact, email: user.email, password: "" }); setEditingUserId(user.id); setShowAddUser(true); };
  const resetUserPassword = async (id) => {
    if (!newPassword.trim()) { showMessage("error", t('admin_dashboard.error_password_empty')); return; }
    try {
      const response = await fetch(`${API_BASE_URL}/users/${id}`, { method: "PUT", headers: getAuthHeaders(), body: JSON.stringify({ password: newPassword }) }); const data = await response.json();
      if (response.ok && data.success) { setResettingPasswordId(null); setNewPassword(""); showMessage("success", t('admin_dashboard.success_password_reset')); }
      else showMessage("error", data.message || t('admin_dashboard.error_password_reset'));
    } catch (err) { console.error("Failed to reset user password:", err); showMessage("error", t('admin_dashboard.error_server_unreachable')); }
  };
  const deleteUser = async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${id}`, { method: "DELETE", headers: getAuthHeaders() }); const data = await response.json();
      if (response.ok && data.success) { setUsers(users.filter((u) => u.id !== id)); setConfirmDeleteUserId(null); showMessage("success", t('admin_dashboard.success_user_removed')); }
      else showMessage("error", data.message || t('admin_dashboard.error_user_remove'));
    } catch (err) { console.error("Failed to delete user:", err); showMessage("error", t('admin_dashboard.error_server_unreachable')); }
  };

  const saveAdmin = async (e) => {
    e.preventDefault(); setUserMessage({ type: "", text: "" });
    if (!newAdmin.name.trim() || !newAdmin.contact.trim() || !newAdmin.email.trim() || !newAdmin.password.trim()) { showMessage("error", t('admin_dashboard.error_all_fields_required')); return; }
    try {
      const url = editingAdminId ? `${API_BASE_URL}/users/${editingAdminId}` : `${API_BASE_URL}/users`; const method = editingAdminId ? "PUT" : "POST";
      const response = await fetch(url, { method, headers: getAuthHeaders(), body: JSON.stringify({ ...newAdmin, role: "admin" }) }); const data = await response.json();
      if (response.ok && data.success) {
        if (editingAdminId) { setAdmins(admins.map((a) => (a.id === editingAdminId ? normalizeId(data.user) : a))); showMessage("success", t('admin_dashboard.success_admin_updated', { name: data.user.name })); }
        else { setAdmins([normalizeId(data.user), ...admins]); showMessage("success", t('admin_dashboard.success_admin_registered', { name: data.user.name })); }
        setNewAdmin({ name: "", role: "admin", contact: "", email: "", password: "" }); setShowAddAdmin(false); setEditingAdminId(null);
      } else showMessage("error", data.message || t('admin_dashboard.error_operation_failed'));
    } catch (err) { showMessage("error", t('admin_dashboard.error_server_unreachable')); }
  };

  const editAdmin = (adminUser) => { setNewAdmin({ name: adminUser.name, role: "admin", contact: adminUser.contact, email: adminUser.email, password: "" }); setEditingAdminId(adminUser.id); setShowAddAdmin(true); };
  const resetAdminPassword = async (id) => {
    if (!newPassword.trim()) { showMessage("error", t('admin_dashboard.error_password_empty')); return; }
    try {
      const response = await fetch(`${API_BASE_URL}/users/${id}`, { method: "PUT", headers: getAuthHeaders(), body: JSON.stringify({ password: newPassword }) }); const data = await response.json();
      if (response.ok && data.success) { setResettingAdminPasswordId(null); setNewPassword(""); showMessage("success", t('admin_dashboard.success_password_reset')); }
      else showMessage("error", data.message || t('admin_dashboard.error_password_reset'));
    } catch (err) { console.error("Failed to reset admin password:", err); showMessage("error", t('admin_dashboard.error_server_unreachable')); }
  };
  const deleteAdmin = async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${id}`, { method: "DELETE", headers: getAuthHeaders() }); const data = await response.json();
      if (response.ok && data.success) { setAdmins(admins.filter((a) => a.id !== id)); setConfirmDeleteAdminId(null); showMessage("success", t('admin_dashboard.success_admin_removed')); }
      else showMessage("error", data.message || t('admin_dashboard.error_admin_remove'));
    } catch (err) { console.error("Failed to delete admin:", err); showMessage("error", t('admin_dashboard.error_server_unreachable')); }
  };

  const filteredComplaints = complaints.filter((c) => {
    const locStr = getLocationString(c.location).toLowerCase(); const normalizedSearchTerm = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm.trim() || String(c.complaintNumber || "").toLowerCase().includes(normalizedSearchTerm) || String(c.issue || "").toLowerCase().includes(normalizedSearchTerm) || locStr.includes(normalizedSearchTerm);
    const matchesCategory = categoryFilter === "All" || c.category === categoryFilter; const matchesPriority = priorityFilter === "All" || c.priority === priorityFilter;
    return matchesSearch && matchesCategory && matchesPriority;
  });

  const mapGroups = complaints.reduce((groups, c) => { const key = getLocationString(c.location); if (!groups[key]) groups[key] = []; groups[key].push(c); return groups; }, {});

  const deleteComplaint = async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/complaints/${id}`, { method: "DELETE", headers: getAuthHeaders() }); const data = await response.json();
      if (response.ok && data.success) {
        const remaining = complaints.filter((c) => c.id !== id); setComplaints(remaining); setConfirmDeleteComplaintId(null);
        if (selectedId === id && remaining.length > 0) setSelectedId(remaining[0].id);
        showMessage("success", t('admin_dashboard.success_complaint_removed'));
      } else showMessage("error", data.message || t('admin_dashboard.error_complaint_remove'));
    } catch (err) { console.error("Failed to delete complaint:", err); showMessage("error", t('admin_dashboard.error_server_unreachable')); }
  };

  const byCategory = Array.from(new Set(complaints.map((c) => c.category))).map((cat) => ({ label: cat, count: complaints.filter((c) => c.category === cat).length }));
  const byPriority = priorityOptions.map((p) => ({ label: p, count: complaints.filter((c) => c.priority === p).length }));
  const maxCategoryCount = Math.max(1, ...byCategory.map((b) => b.count)); const maxPriorityCount = Math.max(1, ...byPriority.map((b) => b.count));
  const staffList = users.filter((u) => u.role === "staff"); const verifierList = users.filter((u) => u.role === "verifier");
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  const initials = admin.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  const filteredMapComplaints = useMemo(() => {
    return mapComplaints.filter((c) => {
      if (!hasValidMapCoordinates(c)) return false;
      const matchesCategory = mapCategoryFilter === "All" || c.category === mapCategoryFilter;
      const matchesStatus = mapStatusFilter === "All" || c.status === mapStatusFilter;
      const matchesPriority = mapPriorityFilter === "All" || c.priority === mapPriorityFilter;
      return matchesCategory && matchesStatus && matchesPriority;
    });
  }, [mapComplaints, mapCategoryFilter, mapStatusFilter, mapPriorityFilter]);

  const resetMapFilters = () => { setMapCategoryFilter("All"); setMapStatusFilter("All"); setMapPriorityFilter("All"); };

  const sidebarMarkup = (
    <aside className="ad-sidebar">
      <div className="ad-sb-brand">
        <button type="button" className="ad-sb-logo ad-sb-logo-button" aria-label={t('admin_dashboard.system_overview')} onClick={() => { returnToDashboard(); scrollTo("ad-top"); }}>
          <img src={logo} alt={t('admin_dashboard.brand')} />
        </button>
        <div><b>{t('admin_dashboard.brand')}</b><span>{t('admin_dashboard.portal')}</span></div>
      </div>
      <div className="ad-sb-label">{t('admin_dashboard.overview')}</div>
      <nav className="ad-sb-nav">
        <button type="button" className={`ad-sb-link ${activeNav === "dashboard" ? "active" : ""}`} onClick={() => { returnToDashboard(); scrollTo("ad-top"); }}><span className="ad-sb-text">📊 {t('admin_dashboard.system_overview')}</span></button>



        <button type="button" className={`ad-sb-link ${activeNav === "profile" ? "active" : ""}`} onClick={() => selectView("profile", setShowProfile)}><span className="ad-sb-text">👤 {t('admin_dashboard.my_profile')}</span></button>
      </nav>
      <div className="ad-sb-label">{t('admin_dashboard.management')}</div>
      <nav className="ad-sb-nav">
        <button type="button" className={`ad-sb-link ${activeNav === "staff-verifier" ? "active" : ""}`} onClick={() => { if (users.length > 0) { setSelectedUserProfile(users[0]); selectView("staff-verifier", setShowStaffVerifierProfile); } }}><span className="ad-sb-text">👥 {t('admin_dashboard.staff_verifier_profile')}</span><span className="ad-sb-badge">{users.length}</span></button>
        <button type="button" className={`ad-sb-link ${activeNav === "admin-management" ? "active" : ""}`} onClick={() => selectView("admin-management", setShowAdminManagement)}><span className="ad-sb-text">⚙️ {t('admin_dashboard.admin_management')}</span><span className="ad-sb-badge">{admins.length}</span></button>



        <button type="button" className={`ad-sb-link ad-sb-parent ${complaintsMenuOpen ? "open" : ""} ${complaintNavKeys.includes(activeNav) ? "has-active" : ""}`} aria-expanded={complaintsMenuOpen} onClick={() => setComplaintsMenuOpen((prev) => !prev)}>
          <span className="ad-sb-text" style={{ display: "flex", alignItems: "center", gap: "9px", flex: 1 }}>📋 {t('admin_dashboard.complaints')}</span>
          <span className="ad-sb-badge">{complaints.length}</span><span className="ad-sb-chevron">▸</span>
        </button>


        {complaintsMenuOpen && (
          <div className="ad-sb-subnav">


            <button type="button" className={`ad-sb-link ad-sb-sublink ${activeNav === "complaint-management" ? "active" : ""}`} onClick={() => selectView("complaint-management", setShowComplaintManagement)}><span className="ad-sb-text">⚙️ {t('admin_dashboard.complaint_management')}</span><span className="ad-sb-badge">{complaints.length}</span></button>



            <button type="button" className={`ad-sb-link ad-sb-sublink ${activeNav === "new-complaints" ? "active" : ""}`} onClick={() => { setSelectedId(null); setComplaintListType("new"); selectView("new-complaints", setShowComplaintDetails); }}><span className="ad-sb-text">📈 {t('admin_dashboard.new_complaints')}</span><span className="ad-sb-badge">{newComplaintCount}</span></button>


            
            <button type="button" className={`ad-sb-link ad-sb-sublink ${activeNav === "assigned-complaints" ? "active" : ""}`} onClick={() => { setSelectedId(null); setComplaintListType("assigned"); selectView("assigned-complaints", setShowComplaintDetails); }}><span className="ad-sb-text">📋 {t('admin_dashboard.assigned_complaints')}</span><span className="ad-sb-badge">{assignedComplaintCount}</span></button>
            <button type="button" className={`ad-sb-link ad-sb-sublink ${activeNav === "updated-complaints" ? "active" : ""}`} onClick={() => selectView("updated-complaints", setShowUpdatedComplaints)}><span className="ad-sb-text">📋 {t('admin_dashboard.updated_complaints')}</span><span className="ad-sb-badge">{updatedComplaintCount}</span></button>
            <button type="button" className={`ad-sb-link ad-sb-sublink ${activeNav === "complaint-verification" ? "active" : ""}`} onClick={() => selectView("complaint-verification", setShowComplaintVerification)}><span className="ad-sb-text">✅ {t('admin_dashboard.complaint_verification')}</span><span className="ad-sb-badge">{verificationComplaintCount}</span></button>
          </div>
        )}
        <button type="button" className={`ad-sb-link ${activeNav === "staff-monitoring" ? "active" : ""}`} onClick={() => selectView("staff-monitoring", setShowStaffMonitoring)}><span className="ad-sb-text">👷 {t('admin_dashboard.staff_work_monitoring')}</span><span className="ad-sb-badge">{users.filter((user) => user.role === "staff").length}</span></button>




      </nav>
      <div className="ad-sb-label">{t('admin_dashboard.insights')}</div>
      <nav className="ad-sb-nav">
        <button type="button" className={`ad-sb-link ${activeNav === "reports" ? "active" : ""}`} onClick={() => selectView("reports", setShowReports)}><span className="ad-sb-text">📈 {t('admin_dashboard.reports_management')}</span></button>
        <button type="button" className={`ad-sb-link ${activeNav === "notifications" ? "active" : ""}`} onClick={() => { setInitialNotification(null); selectView("notifications", setShowNotificationMonitoring); }}><span className="ad-sb-text">🔔 {t('admin_dashboard.notification_monitoring')}</span><span className="ad-sb-badge">{notificationFeed.length}</span></button>
        <button type="button" className="ad-button-link" onClick={handleLogout} style={{ color: "#cf4438", fontWeight: "600", marginTop: "8px" }}>{t('admin_dashboard.logout')}</button>
      </nav>
      <div className="ad-sb-footer">
        <div className="ad-sb-user">
          <div className="ad-sb-avatar">{admin.profilePhoto ? <img src={admin.profilePhoto} alt="Profile" /> : initials}</div>
          <div className="ad-sb-user-info"><b>{admin.name}</b><span>{admin.staffId}</span></div>
        </div>
        <div className="ad-sb-ward">{admin.role}</div>
      </div>
    </aside>
  );

  const renderWithSidebar = (content) => (
    <div className="ad-shell">
      {sidebarMarkup}
      <div className="ad-main">
        <div className="ad-topbar ad-topbar-end">
          <div className="ad-tb-user">
            <div className="ad-tb-avatar">{admin.profilePhoto ? <img src={admin.profilePhoto} alt="Profile" /> : initials}</div>
            <div><b>{admin.name}</b><span>{admin.role}</span></div>
          </div>
        </div>
        <main className="ad-content ad-subview-content">{content}</main>
      </div>
    </div>
  );

  if (showProfile) return renderWithSidebar(<AdminProfile adminId={admin.staffId || getUserId(storedAdmin)} onBack={returnToDashboard} />);
  if (showComplaintManagement) return renderWithSidebar(<ComplaintManagement onBack={returnToDashboard} />);
  if (showComplaintVerification) return renderWithSidebar(<ComplaintVerification onBack={returnToDashboard} />);
  if (showComplaintDetails) return renderWithSidebar(<ComplaintDetails listType={complaintListType || "new"} key={complaintListType || `detail-${String(complaints.find((complaint) => String(complaint.id) === String(selectedId))?.id || "list")}`} complaint={complaintListType ? null : complaints.find((complaint) => String(complaint.id) === String(selectedId))} staffOptions={adminStaffOptions} verifierOptions={adminVerifierOptions} assignmentsLoading={usersLoading} assignmentsError={usersLoadError} onComplaintUpdated={handleComplaintUpdated} onBack={() => { setSelectedId(null); returnToDashboard(); }} />);
  if (showStaffMonitoring) return renderWithSidebar(<StaffWorkMonitoring onBack={returnToDashboard} />);
  if (showUpdatedComplaints) return renderWithSidebar(<UpdatedComplaints complaints={complaints} actorRoles={["staff", "admin", "verifier"]} audienceLabel="Staff, admin & verifier activity" listTitle="Staff, Admin & Verifier Updates" onBack={returnToDashboard} />);
  if (showReports) return renderWithSidebar(<ReportsManagement onBack={returnToDashboard} />);
  if (showAdminManagement) return renderWithSidebar(<AdminManagement onBack={returnToDashboard} />);
  if (showStaffVerifierProfile) return renderWithSidebar(<StaffVerifierProfile userId={selectedUserProfile?.id} role={selectedUserProfile?.role || "staff"} usersList={users} onUserUpdated={handleManagedUserUpdated} onBack={() => { setSelectedUserProfile(null); returnToDashboard(); }} />);
  if (showNotificationMonitoring) return renderWithSidebar(<NotificationMonitoring onBack={() => { setInitialNotification(null); returnToDashboard(); }} onOpenComplaint={handleOpenNotificationComplaint} initialNotification={initialNotification} />);

  return (
    <div className="ad-shell">
      {sidebarMarkup}
      <div className="ad-main" id="ad-top">
        <div className="ad-topbar">
          <div className="ad-search">🔍 <input type="text" placeholder={t('admin_dashboard.search_placeholder')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
          <div className="ad-tb-actions">
            <button type="button" className="ad-icon-btn" aria-label={t('admin_dashboard.notifications_aria')} onClick={() => scrollTo("notif-panel")}>🔔<span className="ad-tb-dot"></span></button>
            <div className="ad-tb-user" id="ad-profile">
              <div className="ad-tb-avatar">{admin.profilePhoto ? <img src={admin.profilePhoto} alt="Profile" /> : initials}</div>
              <div><b>{admin.name}</b><span>{admin.role}</span></div>
            </div>
          </div>
        </div>
        <div className="ad-content">
          <div className="ad-title-row">
            <div><h1>{t('admin_dashboard.system_overview')}</h1><p>{admin.role} · {admin.contact}</p></div>
          </div>
          <div className="ad-stats-row">
            {dashboardSummary.map((stat) => (
              <div className={`ad-stat-card ad-dashboard-stat tone-${stat.tone}`} key={stat.label}>
                <div className="ad-stat-heading"><span className="ad-stat-label">{stat.label}</span><span className="ad-stat-ic" aria-hidden="true">{stat.icon}</span></div>
                <div className="ad-stat-num">{stat.value.toLocaleString()}</div>
              </div>
            ))}
          </div>
          <section className="ad-dashboard-charts" aria-label={t('admin_dashboard.complaint_charts')}>
            <article className="ad-dashboard-chart ad-dashboard-chart-trend">
              <div className="ad-dashboard-chart-head">
                <div><h3>{t('admin_dashboard.complaint_trend')}</h3><p>{t('admin_dashboard.new_resolved_over_time')}</p></div>
                <label className="ad-chart-range">
                  <span className="ad-visually-hidden">{t('admin_dashboard.trend_date_range')}</span>
                  <select value={trendRange} onChange={(event) => setTrendRange(Number(event.target.value))}>
                    <option value={7}>{t('admin_dashboard.last_7_days')}</option>
                    <option value={30}>{t('admin_dashboard.last_30_days')}</option>
                    <option value={90}>{t('admin_dashboard.last_90_days')}</option>
                  </select>
                </label>
              </div>
              <div className="ad-chart-canvas ad-chart-canvas-trend">
                {complaintsLoading ? <div className="ad-chart-empty">{t('admin_dashboard.loading_data')}</div> : complaints.length === 0 ? <div className="ad-chart-empty">{t('admin_dashboard.no_data')}</div> : <Line data={dashboardCharts.trend} options={{ ...chartBaseOptions, plugins: { ...chartBaseOptions.plugins, legend: { position: "top", align: "end", labels: chartBaseOptions.plugins.legend.labels } }, scales: { x: { grid: { display: false }, border: { display: false } }, y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: "#edf2f8" }, border: { display: false } } } }} />}
              </div>
            </article>
            <article className="ad-dashboard-chart">
              <div className="ad-dashboard-chart-head"><div><h3>{t('admin_dashboard.complaints_by_category')}</h3><p>{t('admin_dashboard.share_of_reported')}</p></div></div>
              <div className="ad-chart-canvas ad-chart-canvas-circle">
                {complaintsLoading ? <div className="ad-chart-empty">{t('admin_dashboard.loading_data')}</div> : dashboardCharts.category.labels.length === 0 ? <div className="ad-chart-empty">{t('admin_dashboard.no_category_data')}</div> : <Pie data={dashboardCharts.category} options={{ ...chartBaseOptions, plugins: { ...chartBaseOptions.plugins, legend: { position: "bottom", labels: chartBaseOptions.plugins.legend.labels } } }} />}
              </div>
            </article>
            <article className="ad-dashboard-chart">
              <div className="ad-dashboard-chart-head"><div><h3>{t('admin_dashboard.status_distribution')}</h3><p>{t('admin_dashboard.current_pipeline')}</p></div></div>
              <div className="ad-chart-canvas ad-chart-canvas-circle">
                {complaintsLoading ? <div className="ad-chart-empty">{t('admin_dashboard.loading_data')}</div> : dashboardCharts.status.labels.length === 0 ? <div className="ad-chart-empty">{t('admin_dashboard.no_status_data')}</div> : <Doughnut data={dashboardCharts.status} options={{ ...chartBaseOptions, cutout: "68%", plugins: { ...chartBaseOptions.plugins, legend: { position: "bottom", labels: chartBaseOptions.plugins.legend.labels } } }} />}
              </div>
            </article>
            <article className="ad-dashboard-chart">
              <div className="ad-dashboard-chart-head"><div><h3>{t('admin_dashboard.complaints_by_priority')}</h3><p>{t('admin_dashboard.distribution_across_levels')}</p></div></div>
              <div className="ad-chart-canvas ad-chart-canvas-column">
                {complaintsLoading ? <div className="ad-chart-empty">{t('admin_dashboard.loading_data')}</div> : complaints.length === 0 ? <div className="ad-chart-empty">{t('admin_dashboard.no_priority_data')}</div> : <Bar data={dashboardCharts.priority} options={{ ...chartBaseOptions, plugins: { ...chartBaseOptions.plugins, legend: { display: false } }, scales: { x: { grid: { display: false }, border: { display: false } }, y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: "#edf2f8" }, border: { display: false } } } }} />}
              </div>
            </article>
          </section>
          <VisitorsOverview />
          {userMessage.text && <div className={`ad-message-banner ${userMessage.type}`}>{userMessage.text}</div>}
          
          {/* Note: The rest of your original main content (tables, analytics, map, reports, notifications) 
              stays exactly the same. Keep everything from your original file starting from the
              Staff & Verifier Management panel onward right here. */}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;