import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next"; // ✅ ADDED
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";
import { Bar, Doughnut, Line, Pie } from "react-chartjs-2";
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

ChartJS.register(
  ArcElement, BarElement, CategoryScale, Legend, LinearScale, LineElement, PointElement, Tooltip
);

const verifierChartBaseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { usePointStyle: true, boxWidth: 8, padding: 16 } },
    tooltip: { backgroundColor: "#142d4e", padding: 10, cornerRadius: 8 },
  },
};

// ⚠️ KEEP IN ENGLISH: Used for internal logic/status mapping
const statusLabel = {
  pending: "Pending Verification",
  in_action: "Staff Work in Progress",
  in_review: "Physical Verification",
  verified: "Verified",
  resolved: "Resolved / Closed",
  notified: "Citizen Notified",
  rejected: "Sent Back for Action",
};

const statusTone = {
  pending: "amber", in_action: "orange", in_review: "orange",
  verified: "green", resolved: "green", notified: "green", rejected: "red",
};

const queueTone = {
  "New Complaints": "navy", "Staff Work in Progress": "orange", "Completed Work": "orange",
  "Awaiting Staff Correction": "red", "Re-verification": "red", "Resolution Requests": "amber", "Resolved / Closed": "green"
};

// ✅ NEW: sidebar keys that live inside the single "Complaints" dropdown
const complaintNavKeys = [
  "new",
  "complaint-assigned",
  "updated-complaints",
  "work-verification",
  "completed",
  "reverification",
  "physical",
  "history",
];

const normalizeVerifierStatus = (status) => {
  const normalized = String(status || "").trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
  if (normalized === "closed") return "notified";
  if (["resolved", "complaint resolved"].includes(normalized)) return "resolved";
  if (["verified", "approved"].includes(normalized)) return "verified";
  if (["rejected", "sent back for action", "awaiting staff correction"].includes(normalized)) return "rejected";
  if (["assigned", "under action", "in action", "in progress", "staff work in progress"].includes(normalized)) return "in_action";
  if (["under verification", "under review", "in review", "work completed", "completed work", "work submitted", "awaiting verification", "ready for verification", "re verification", "reverification"].includes(normalized)) return "in_review";
  if (["notified", "citizen notified"].includes(normalized)) return "notified";
  if (["new", "registered", "complaint registered", "submitted", "pending", "pending verification"].includes(normalized)) return "pending";
  return "pending";
};

const mapVerifierComplaint = (complaint) => {
  let status = normalizeVerifierStatus(complaint.status);
  const history = Array.isArray(complaint.statusHistory) ? complaint.statusHistory : [];
  const activityLog = Array.isArray(complaint.activityLog) ? complaint.activityLog : [];
  const hasStaffOrVerifierAction = [...history, ...activityLog].some((entry) => /\b(staff|verifier)\b/i.test(String(entry.actor || "")));
  const wasAssignedByAdmin = activityLog.some((entry) => /\badmin\b/i.test(String(entry.actor || "")) && /^Assigned staff member\b/i.test(String(entry.message || "")));
  const historyStatus = (entry) => String(entry.status || "").trim().toLowerCase().replace(/[_-]+/g, " ");
  const wasRejected = history.some((entry) => historyStatus(entry) === "rejected");
  const previousRejection = [...history].reverse().find((entry) => historyStatus(entry) === "rejected");
  const previousVerifierDecision = [...history].reverse().find((entry) => ["verified", "approved", "rejected"].includes(historyStatus(entry)));
  const inspection = complaint.inspection && typeof complaint.inspection === "object" ? complaint.inspection : {};
  const hasSubmittedWork = Boolean(String(inspection.completionPhoto || complaint.completionPhoto || "").trim() && String(inspection.actionTaken || complaint.actionTaken || "").trim());
  const latestStatusEntry = history[history.length - 1];
  const staffSubmittedResolvedWork = Boolean(latestStatusEntry && /\bstaff\b/i.test(String(latestStatusEntry.actor || "")) && ["resolved", "closed"].includes(historyStatus(latestStatusEntry)) && hasSubmittedWork);
  
  if (staffSubmittedResolvedWork || (["in_action", "pending"].includes(status) && hasSubmittedWork)) status = "in_review";
  
  const storedPhotos = Array.isArray(complaint.images) ? complaint.images : Array.isArray(complaint.citizenPhotos) ? complaint.citizenPhotos : Array.isArray(complaint.photos) ? complaint.photos : [];
  const photos = complaint.photos && typeof complaint.photos === "object" && !Array.isArray(complaint.photos) ? complaint.photos : {};
  
  let queue = "New Complaints";
  if (status === "rejected") queue = "Awaiting Staff Correction";
  else if (status === "in_action") queue = "Staff Work in Progress";
  else if (status === "in_review") queue = wasRejected ? "Re-verification" : "Completed Work";
  else if (status === "verified") queue = "Resolution Requests";
  else if (status === "resolved" || status === "notified") queue = "Resolved / Closed";
  if (status === "in_action" && wasAssignedByAdmin && !hasStaffOrVerifierAction) queue = "New Complaints";

  return {
    ...complaint,
    category: complaint.category || complaint.issueType || "Uncategorized",
    issue: complaint.issue || complaint.issueType || complaint.category || "Issue not specified",
    description: complaint.description || complaint.issueDescription || "",
    citizenContact: complaint.citizenContact || complaint.citizenMobile || complaint.citizenProfile?.mobile || "",
    citizenEmail: complaint.citizenEmail || complaint.citizenProfile?.email || "",
    status, queue,
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

const hasComplaintAssignee = (value) => {
  const assignee = typeof value === "object" ? value?._id || value?.name || "" : value;
  const normalized = String(assignee || "").trim().toLowerCase();
  return normalized !== "" && !["unassigned", "not assigned", "none", "null"].includes(normalized);
};

const isNewVerifierComplaint = (complaint) =>
  complaint.queue === "New Complaints" &&
  ![...(complaint.statusHistory || []), ...(complaint.activityLog || [])].some((entry) => /\b(staff|verifier)\b/i.test(String(entry.actor || "")));

const mapColors = ["#e07b1c", "#2e6cb0", "#1d8a5c", "#c1900a", "#cf4438", "#7a5c9e"];
const colorForCategory = (category) => {
  let hash = 0;
  for (let i = 0; i < category.length; i++) hash = category.charCodeAt(i) + ((hash << 5) - hash);
  return mapColors[Math.abs(hash) % mapColors.length];
};

const VerifierDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation(); // ✅ ADDED

  // ✅ HELPERS for safe translation of internal status/queue strings
  const statusKeyMap = { pending: "pending_verification", in_action: "staff_work_in_progress", in_review: "physical_verification", verified: "verified", resolved: "resolved_closed", notified: "citizen_notified", rejected: "sent_back_for_action" };
  const queueKeyMap = { "New Complaints": "new_complaints", "Staff Work in Progress": "staff_work_in_progress", "Completed Work": "completed_work", "Awaiting Staff Correction": "awaiting_staff_correction", "Re-verification": "re_verification", "Resolution Requests": "resolution_requests", "Resolved / Closed": "resolved_closed" };
  const getStatusLabel = (status) => t(`verifier_dashboard.status.${statusKeyMap[status]}`, statusLabel[status]);
  const getQueueLabel = (queue) => t(`verifier_dashboard.queue.${queueKeyMap[queue]}`, queue);

  const storedUser = getStoredUser();
  const [verifier, setVerifier] = useState({
    name: storedUser.name || "", role: storedUser.designation || storedUser.role || "",
    contact: storedUser.contact || storedUser.mobile || "", ward: storedUser.assignedArea || "",
    staffId: storedUser.verifierId || storedUser.staffId || "", department: storedUser.department || "",
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
  const [trendRange, setTrendRange] = useState(7);
  const [showDetailView, setShowDetailView] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [activityComplaint, setActivityComplaint] = useState(null);
  const [activeNav, setActiveNav] = useState("dashboard");

  // ✅ NEW: open/close state for the single "Complaints" sidebar dropdown (UI only)
  const [showComplaintsMenu, setShowComplaintsMenu] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  
  // Mobile sidebar accessibility: close with Escape and keep the page behind it still.
  useEffect(() => {
    if (!mobileSidebarOpen) return undefined;

    const handleMobileSidebarKeyDown = (event) => {
      if (event.key === "Escape") setMobileSidebarOpen(false);
    };

    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleMobileSidebarKeyDown);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      window.removeEventListener("keydown", handleMobileSidebarKeyDown);
    };
  }, [mobileSidebarOpen]);

  const verifierId = getUserId(storedUser);
  const assignedComplaints = items.filter((complaint) =>
    hasComplaintAssignee(complaint.assignedStaffId) || hasComplaintAssignee(complaint.assignedStaff) ||
    hasComplaintAssignee(complaint.assignedVerifierId) || hasComplaintAssignee(complaint.assignedVerifier)
  );

  const verifierAssignmentUpdates = (complaint) => {
    if (!verifierId || !verifier.name) return {};
    const existingVerifierId = String(complaint?.assignedVerifierId || "");
    const existingVerifierName = String(complaint?.assignedVerifier || "").trim();
    const isAssignedToAnotherVerifier = (existingVerifierId && existingVerifierId !== String(verifierId)) || (!existingVerifierId && existingVerifierName && existingVerifierName.toLowerCase() !== verifier.name.trim().toLowerCase());
    if (isAssignedToAnotherVerifier) return {};
    return { assignedVerifier: existingVerifierName || verifier.name, assignedVerifierId: existingVerifierId || String(verifierId) };
  };

  const openView = (setter) => {
    [setShowProfile, setShowNewComplaints, setShowComplaintAssigned, setShowCompletedWork, setShowWorkVerification, setShowUpdatedComplaints, setShowReverification, setShowPhysicalVerification, setShowComplaintHistory, setShowNotifications, setShowViewLocation, setShowDetailView, setShowActivityModal].forEach(fn => fn(false));
    setter(true);
  };

  const selectView = (view, setter) => { setActiveNav(view); openView(setter); setMobileSidebarOpen(false); };
  const returnToDashboard = () => {
    [setShowProfile, setShowNewComplaints, setShowComplaintAssigned, setShowCompletedWork, setShowWorkVerification, setShowUpdatedComplaints, setShowReverification, setShowPhysicalVerification, setShowComplaintHistory, setShowNotifications, setShowViewLocation, setShowDetailView, setShowActivityModal].forEach(fn => fn(false));
    setActiveNav("dashboard");
    setMobileSidebarOpen(false);
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
            ...current, ...data.profile,
            contact: data.profile.contact || data.profile.mobile || current.contact,
            staffId: data.profile.verifierId || data.profile.staffId || current.staffId,
            role: data.profile.designation || data.profile.role || current.role,
            department: data.profile.department || current.department,
            ward: data.profile.assignedArea || current.ward,
            joinDate: data.profile.joiningDate ? new Date(data.profile.joiningDate).toLocaleDateString() : current.joinDate || "",
            profilePhoto: data.profile.profilePhoto || current.profilePhoto,
          }));
        }
        const mapped = (data.complaints || []).map(mapVerifierComplaint);
        setItems((current) => {
          const existing = new Map(current.map((complaint) => [complaint.id, complaint]));
          return mapped.map((complaint) => {
            const previous = existing.get(complaint.id);
            return previous && JSON.stringify(previous) === JSON.stringify(complaint) ? previous : complaint;
          });
        });
        if (!showDetailView) setSelectedId(mapped[0]?.id || null);
        setNotifications(data.notifications || []);
        setLoadError("");
      } catch (error) {
        if (active) { console.error("Failed to load verifier dashboard:", error); setLoadError(t('verifier_dashboard.error_load_dashboard')); }
      }
    };
    loadDashboard();
    const refreshTimer = window.setInterval(loadDashboard, 30000);
    return () => { active = false; window.clearInterval(refreshTimer); };
  }, [showDetailView, t]);

  useEffect(() => {
    let active = true;
    fetchDashboardUsers("staff")
      .then((data) => { if (active) setStaffOptions(data.users || []); })
      .catch((error) => { if (!active) return; console.error("Failed to load staff options:", error); setLoadError(t('verifier_dashboard.error_load_staff')); });
    return () => { active = false; };
  }, [t]);

  const previousStats = [
    { label: t('verifier_dashboard.total_complaints'), value: items.length, icon: "📊", tone: "navy" },
    { label: t('verifier_dashboard.pending_verification'), value: items.filter((c) => c.status === "pending").length, icon: "⏳", tone: "amber" },
    { label: t('verifier_dashboard.verified'), value: items.filter((c) => c.status === "verified").length, icon: "✅", tone: "green" },
    { label: t('verifier_dashboard.rejected'), value: items.filter((c) => c.status === "rejected").length, icon: "⛔", tone: "red" },
    { label: t('verifier_dashboard.resolved'), value: items.filter((c) => c.status === "resolved" || c.status === "notified").length, icon: "📂", tone: "green" },
  ];

  const newStats = [
    { label: t('verifier_dashboard.under_verification'), value: items.filter((c) => c.status === "in_review").length, icon: "🔍", tone: "orange" },
    { label: t('verifier_dashboard.completed_work_awaiting'), value: items.filter((c) => c.queue === "Completed Work").length, icon: "🛠️", tone: "navy" },
    { label: t('verifier_dashboard.rework_correction'), value: items.filter((c) => c.queue === "Awaiting Staff Correction").length, icon: "🔄", tone: "red" },
    { label: t('verifier_dashboard.resolution_requests'), value: items.filter((c) => c.queue === "Resolution Requests").length, icon: "📌", tone: "amber" },
    { label: t('verifier_dashboard.reverification_queue'), value: items.filter((c) => c.queue === "Re-verification").length, icon: "🔁", tone: "red" },
    { label: t('verifier_dashboard.staff_work_in_progress'), value: items.filter((c) => c.queue === "Staff Work in Progress").length, icon: "🚧", tone: "orange" },
  ];

  const verifierCharts = useMemo(() => {
    const categoryCounts = new Map();
    const statusCounts = new Map();
    const trendDays = Array.from({ length: trendRange }, (_, index) => {
      const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - (trendRange - index - 1)); return date;
    });
    const dateKey = (date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    const trendCounts = new Map(trendDays.map((date) => [dateKey(date), { total: 0, verified: 0 }]));
    const addToTrend = (value, key) => {
      if (!value) return false;
      const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
      const date = dateOnly ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3])) : new Date(value);
      if (Number.isNaN(date.getTime())) return false;
      const counts = trendCounts.get(dateKey(date));
      if (!counts) return false;
      counts[key] += 1; return true;
    };

    items.forEach((complaint) => {
      const category = String(complaint.category || "Uncategorized");
      const status = String(statusLabel[complaint.status] || complaint.status || "Unknown");
      categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
      statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
      addToTrend(complaint.createdAt || complaint.date, "total");
      const statusHistory = Array.isArray(complaint.statusHistory) ? complaint.statusHistory : [];
      const verificationEvents = statusHistory.filter((entry) => {
        const eventStatus = String(entry.status || "").trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
        return ["verified", "resolved", "closed", "complaint resolved"].includes(eventStatus);
      });
      if (verificationEvents.length) verificationEvents.forEach((entry) => addToTrend(entry.updatedAt, "verified"));
      else if (statusHistory.length === 0 && ["verified", "resolved", "notified"].includes(complaint.status)) addToTrend(complaint.updatedAt || complaint.verificationDateTime, "verified");
    });

    const categories = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1]);
    const statuses = [...statusCounts.entries()].sort((a, b) => b[1] - a[1]);
    const formatDate = (date) => date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    const englishQueueLabels = ["New Complaints", "Staff Work in Progress", "Completed Work", "Re-verification", "Resolution Requests"];

    return {
      trendHasData: [...trendCounts.values()].some((counts) => counts.total > 0 || counts.verified > 0),
      trend: {
        labels: trendDays.map(formatDate),
        datasets: [
          { label: t('verifier_dashboard.trend.total_complaints'), data: trendDays.map((date) => trendCounts.get(dateKey(date)).total), borderColor: "#2585ed", backgroundColor: "rgba(37, 133, 237, 0.12)", fill: true, tension: 0.35, pointRadius: 3, pointHoverRadius: 5 },
          { label: t('verifier_dashboard.trend.verified_resolved'), data: trendDays.map((date) => trendCounts.get(dateKey(date)).verified), borderColor: "#15b89a", backgroundColor: "rgba(21, 184, 154, 0.08)", fill: false, tension: 0.35, pointRadius: 3, pointHoverRadius: 5 },
        ],
      },
      category: {
        labels: categories.map(([label]) => label),
        datasets: [{ data: categories.map(([, count]) => count), backgroundColor: categories.map(([label]) => colorForCategory(label)), borderColor: "#ffffff", borderWidth: 3 }],
      },
      status: {
        labels: statuses.map(([label]) => label),
        datasets: [{
          data: statuses.map(([, count]) => count),
          backgroundColor: statuses.map(([label]) => {
            const colors = { "Pending Verification": "#8450e8", "Staff Work in Progress": "#2585ed", "Physical Verification": "#13b7ad", Verified: "#17b98f", "Sent Back for Action": "#f05d72", "Resolved / Closed": "#f2a838", "Citizen Notified": "#f2a838" };
            return colors[label] || "#8ca0b8";
          }),
          borderColor: "#ffffff", borderWidth: 3,
        }],
      },
      queue: {
        labels: englishQueueLabels.map(q => getQueueLabel(q)),
        datasets: [{
          label: "Complaints",
          data: englishQueueLabels.map((label) => {
            if (label === "New Complaints") return items.filter(isNewVerifierComplaint).length;
            return items.filter((complaint) => complaint.queue === label).length;
          }),
          backgroundColor: ["#2585ed", "#8450e8", "#13b7ad", "#f2a838", "#f05d72"], borderRadius: 6, maxBarThickness: 44,
        }],
      },
    };
  }, [items, trendRange, t]);

  const filteredItems = items.filter((complaint) => {
    const query = searchTerm.trim().toLowerCase();
    return !query || [complaint.complaintNumber, complaint.category, complaint.issue, complaint.location, complaint.status, complaint.queue].some((value) => String(value || "").toLowerCase().includes(query));
  });
  
  const getAssignedStaffId = (complaint) => complaint.assignedStaffId || staffOptions.find((staff) => staff.name === complaint.assignedStaff)?._id || "";
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  const openVerification = (c) => { setSelectedId(c.id); setRemarksDraft(c.remarks || ""); scrollTo("verification-panel"); };
  const handleViewDetails = (complaint) => { setSelectedId(complaint.id); setDetailStaffId(getAssignedStaffId(complaint)); setShowDetailView(true); setRemarksDraft(complaint.remarks || ""); };
  const handleBackToList = () => { setShowDetailView(false); };
  const handleQuickVerify = (complaint) => { setSelectedId(complaint.id); setDetailStaffId(getAssignedStaffId(complaint)); setRemarksDraft(complaint.remarks || ""); setShowDetailView(true); };
  const handleShowActivity = (complaint) => { setActivityComplaint(complaint); setShowActivityModal(true); };
  const handleCloseActivityModal = () => { setShowActivityModal(false); setActivityComplaint(null); };

  const handleUpdateProfile = async (updatedVerifier) => {
    const data = await updateDashboardProfile(getUserId(storedUser), { name: updatedVerifier.name, designation: updatedVerifier.role, assignedArea: updatedVerifier.ward, contact: updatedVerifier.contact, email: updatedVerifier.email, profilePhoto: updatedVerifier.profilePhoto });
    const user = data.user || {};
    const nextVerifier = { ...updatedVerifier, ...user, role: user.designation || updatedVerifier.role, ward: user.assignedArea || updatedVerifier.ward, staffId: user.verifierId || user.staffId || updatedVerifier.staffId, contact: user.contact || user.mobile || updatedVerifier.contact };
    setVerifier((current) => ({ ...current, ...nextVerifier }));
    return data;
  };

  const persistComplaintStatus = async (id, status, remarks = "", dateTime = "", additionalUpdates = {}) => {
    const complaint = items.find((item) => item.id === id);
    const result = await updateDashboardComplaint(id, { ...verifierAssignmentUpdates(complaint), ...additionalUpdates, status, remarks, ...(dateTime ? { verificationDateTime: dateTime } : {}) });
    const updatedComplaint = mapVerifierComplaint(result.complaint);
    setItems((current) => current.map((complaint) => (complaint.id === id ? updatedComplaint : complaint)));
    return updatedComplaint;
  };

  const handleAssignStaff = async (complaint, staffId) => {
    setActionMessage(""); setAssignmentSavingId(complaint.id);
    const assignedStaff = staffOptions.find((staff) => String(staff._id) === String(staffId));
    try {
      const result = await updateDashboardComplaint(complaint.id, { assignedStaff: assignedStaff?.name || "", assignedStaffId: assignedStaff?._id || "", ...verifierAssignmentUpdates(complaint), ...(assignedStaff && ["pending", "rejected"].includes(complaint.status) ? { status: "Under Action" } : {}) });
      const updatedComplaint = mapVerifierComplaint(result.complaint);
      setItems((current) => current.map((item) => item.id === complaint.id ? updatedComplaint : item));
    } catch (error) {
      console.error("Failed to assign staff to complaint:", error);
      setActionMessage(t('verifier_dashboard.error_assign_staff'));
    } finally { setAssignmentSavingId(""); }
  };

  const handleManagementAssignStaff = async (complaint, staffId) => {
    const assignedStaff = staffOptions.find((staff) => String(staff._id) === String(staffId));
    if (!assignedStaff) throw new Error(t('verifier_dashboard.error_valid_staff'));
    const result = await updateDashboardComplaint(complaint.id, { assignedStaff: assignedStaff.name, assignedStaffId: assignedStaff._id, ...verifierAssignmentUpdates(complaint), ...(["pending", "rejected"].includes(complaint.status) ? { status: "Under Action" } : {}) });
    const updatedComplaint = mapVerifierComplaint(result.complaint);
    setItems((current) => current.map((item) => (item.id === complaint.id ? updatedComplaint : item)));
    return updatedComplaint;
  };

  const handleCompletedWorkVerify = (id, action, remarks, dateTime) => persistComplaintStatus(id, action === "approve" ? "Verified" : "Rejected", remarks, dateTime);

  const handleNewComplaintAction = async (id, action, details = {}) => {
    const complaint = items.find((item) => item.id === id);
    if (action === "reject") return persistComplaintStatus(id, "Rejected", details.remarks, "", verifierAssignmentUpdates(complaint));
    const assignedStaff = staffOptions.find((staff) => String(staff._id) === String(details.staffId));
    if (!assignedStaff) throw new Error(t('verifier_dashboard.error_select_staff_accept'));
    const result = await updateDashboardComplaint(id, { assignedStaff: assignedStaff.name, assignedStaffId: assignedStaff._id, ...verifierAssignmentUpdates(complaint), status: "Under Action", remarks: t('verifier_dashboard.accepted_assigned_action') });
    const updatedComplaint = mapVerifierComplaint(result.complaint);
    setItems((current) => current.map((complaint) => (complaint.id === id ? updatedComplaint : complaint)));
    return updatedComplaint;
  };

  const handleSaveVerifierEvidence = async (id, photoUrl) => {
    const complaint = items.find((item) => item.id === id);
    if (!complaint) throw new Error(t('verifier_dashboard.error_complaint_not_found'));
    const result = await updateDashboardComplaint(id, { ...verifierAssignmentUpdates(complaint), inspection: { ...(complaint.inspection || {}), verificationPhoto: photoUrl } });
    const updatedComplaint = mapVerifierComplaint(result.complaint);
    setItems((current) => current.map((item) => (item.id === id ? updatedComplaint : item)));
    return updatedComplaint;
  };

  const handleVerificationDecision = (complaint, status, remarks, dateTime) => persistComplaintStatus(complaint.id, status, remarks, dateTime);
  const handleNotificationComplaintUpdated = (updatedComplaint) => {
    setNotifications((current) => current.map((notification) => ((notification.complaint?.id || notification.complaintId) === updatedComplaint.id ? { ...notification, complaint: updatedComplaint, complaintNumber: updatedComplaint.complaintNumber } : notification)));
  };

  const updateNotificationComplaintStaff = async (complaint, staffId, remarks) => {
    const assignedStaff = staffOptions.find((staff) => String(staff._id) === String(staffId));
    if (!assignedStaff) throw new Error(t('verifier_dashboard.error_valid_staff'));
    const result = await updateDashboardComplaint(complaint.id, { assignedStaff: assignedStaff.name, assignedStaffId: assignedStaff._id, ...verifierAssignmentUpdates(complaint), status: "Under Action", remarks });
    const updatedComplaint = mapVerifierComplaint(result.complaint);
    setItems((current) => current.map((item) => (item.id === complaint.id ? updatedComplaint : item)));
    return updatedComplaint;
  };

  const handleNotificationReject = (complaint, remarks) => persistComplaintStatus(complaint.id, "Rejected", remarks);

  const handleMarkNotifAsRead = async (id) => {
    await markDashboardNotificationRead(id);
    setNotifications((current) => current.map((notification) => (notification.id === id ? { ...notification, isRead: true } : notification)));
  };

  const handleMarkAllNotifsRead = async () => {
    const unread = notifications.filter((notification) => !notification.isRead);
    const results = await Promise.allSettled(unread.map((notification) => markDashboardNotificationRead(notification.id)));
    const successfulIds = new Set(results.flatMap((result, index) => result.status === "fulfilled" ? [unread[index].id] : []));
    setNotifications((current) => current.map((notification) => (successfulIds.has(notification.id) ? { ...notification, isRead: true } : notification)));
    const failedCount = results.filter((result) => result.status === "rejected").length;
    if (failedCount) throw new Error(t('verifier_dashboard.error_mark_notifs', { count: failedCount }));
  };

  const handlePhysicalVerificationSubmit = (id, decision, remarks, dateTime, verificationPhoto) => {
    const complaint = items.find((item) => item.id === id);
    return persistComplaintStatus(id, decision === "approve" ? "Verified" : "Rejected", remarks, dateTime, { inspection: { ...(complaint?.inspection || {}), verificationPhoto } });
  };

  const handleReverifyAction = (id, action, remarks, dateTime) => persistComplaintStatus(id, action === "approve" ? "Verified" : "Rejected", remarks, dateTime);

  const handleLogout = () => {
    if (window.confirm(t('verifier_dashboard.confirm_logout'))) {
      localStorage.removeItem("user"); localStorage.removeItem("token"); localStorage.removeItem("verifierData");
      window.location.href = "/login";
    }
  };

  const approveWork = (id) => {
    if (!remarksDraft.trim()) throw new Error(t('verifier_dashboard.error_remarks_approve'));
    return persistComplaintStatus(id, "Verified", remarksDraft);
  };

  const rejectWork = (id) => {
    if (!remarksDraft.trim()) throw new Error(t('verifier_dashboard.error_remarks_reject'));
    return persistComplaintStatus(id, "Rejected", remarksDraft);
  };

  const assignStaffFromDetails = async () => {
    if (!detailStaffId) { setActionMessage(t('verifier_dashboard.error_select_staff_assign')); return; }
    await handleAssignStaff(selected, detailStaffId);
  };

  const markResolved = (id) => persistComplaintStatus(id, "Resolved");
  const closeComplaint = (id) => persistComplaintStatus(id, "Closed");

  const handleDashboardAction = async (action) => {
    setActionMessage(""); setActionSaving(true);
    try { await action(); } catch (error) { console.error("Verifier action failed:", error); setActionMessage(t('verifier_dashboard.error_save_action')); } finally { setActionSaving(false); }
  };

  const initials = verifier.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  // Keep the navigation mounted while switching complaint screens.
  const renderWithSidebar = (content) => (
    <div className={`vd-shell ${mobileSidebarOpen ? "vd-mobile-nav-open" : ""}`}>
      {sidebarMarkup}
      <button type="button" className="vd-mobile-nav-backdrop" aria-label="Close navigation menu" onClick={() => setMobileSidebarOpen(false)} />
      <div className="vd-main">
        <div className="vd-topbar">
          <button
            type="button"
            className="vd-mobile-menu-btn"
            aria-label={mobileSidebarOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileSidebarOpen}
            onClick={() => setMobileSidebarOpen((open) => !open)}
          >
            <span></span><span></span><span></span>
          </button>
          <div className="vd-tb-user">
            <div className="vd-tb-avatar">{verifier.profilePhoto ? <img src={toMediaUrl(verifier.profilePhoto)} alt="Profile" /> : initials}</div>
            <div><b>{verifier.name}</b><span>{verifier.role}</span></div>
          </div>
        </div>
        <main className="vd-content vd-subview-content">{content}</main>
      </div>
    </div>
  );

  const sidebarMarkup = (
  <aside className="vd-sidebar">
    <div className="vd-sb-brand">
      <div className="vd-sb-logo"><img src={logo} alt={t('verifier_dashboard.brand')} /></div>
      <div><b>{t('verifier_dashboard.brand')}</b><span>{t('verifier_dashboard.portal')}</span></div>
    </div>
    <div className="vd-sb-label">{t('verifier_dashboard.overview')}</div>
    <nav className="vd-sb-nav">
      <button type="button" className={`vd-sb-link ${activeNav === "dashboard" ? "active" : ""}`} onClick={() => { returnToDashboard(); scrollTo("vd-top"); }}>📊 {t('verifier_dashboard.dashboard')}</button>
      <button type="button" className={`vd-sb-link ${activeNav === "profile" ? "active" : ""}`} onClick={() => selectView("profile", setShowProfile)}>👤 {t('verifier_dashboard.my_profile')}</button>

      {/* ===== ONE TAB FOR ALL COMPLAINT OPTIONS ===== */}
      <button
        type="button"
        className={`vd-sb-link vd-sb-parent ${showComplaintsMenu ? "open" : ""} ${complaintNavKeys.includes(activeNav) ? "has-active" : ""}`}
        aria-expanded={showComplaintsMenu}
        onClick={() => setShowComplaintsMenu((open) => !open)}
      >
        📂 {t('verifier_dashboard.complaints', 'Complaints')}
        <span className="vd-sb-caret">▾</span>
      </button>

      <div className={`vd-sb-submenu ${showComplaintsMenu ? "open" : ""}`}>
        <button type="button" className={`vd-sb-sublink ${activeNav === "new" ? "active" : ""}`} onClick={() => selectView("new", setShowNewComplaints)}>
          <span className="vd-sb-sublabel"><span className="vd-sb-ic">🆕</span><span className="vd-sb-txt">{t('verifier_dashboard.new_complaints')}</span></span>
          <span className="vd-sb-badge">{items.filter(isNewVerifierComplaint).length}</span>
        </button>

        <button type="button" className={`vd-sb-sublink ${activeNav === "complaint-assigned" ? "active" : ""}`} onClick={() => selectView("complaint-assigned", setShowComplaintAssigned)}>
          <span className="vd-sb-sublabel"><span className="vd-sb-ic">📋</span><span className="vd-sb-txt">{t('verifier_dashboard.complaint_assigned')}</span></span>
          <span className="vd-sb-badge">{assignedComplaints.length}</span>
        </button>

        <button type="button" className={`vd-sb-sublink ${activeNav === "updated-complaints" ? "active" : ""}`} onClick={() => selectView("updated-complaints", setShowUpdatedComplaints)}>
          <span className="vd-sb-sublabel"><span className="vd-sb-ic">🔄</span><span className="vd-sb-txt">{t('verifier_dashboard.updated_complaints')}</span></span>
        </button>

        <button type="button" className={`vd-sb-sublink ${activeNav === "work-verification" ? "active" : ""}`} onClick={() => selectView("work-verification", setShowWorkVerification)}>
          <span className="vd-sb-sublabel"><span className="vd-sb-ic">✅</span><span className="vd-sb-txt">{t('verifier_dashboard.work_verification')}</span></span>
          <span className="vd-sb-badge">{items.filter((c) => c.queue === "Completed Work").length}</span>
        </button>

        <button type="button" className={`vd-sb-sublink ${activeNav === "completed" ? "active" : ""}`} onClick={() => selectView("completed", setShowCompletedWork)}>
          <span className="vd-sb-sublabel"><span className="vd-sb-ic">🛠️</span><span className="vd-sb-txt">{t('verifier_dashboard.completed_work')}</span></span>
          <span className="vd-sb-badge">{items.filter((c) => c.queue === "Completed Work").length}</span>
        </button>

        <button type="button" className={`vd-sb-sublink ${activeNav === "reverification" ? "active" : ""}`} onClick={() => selectView("reverification", setShowReverification)}>
          <span className="vd-sb-sublabel"><span className="vd-sb-ic">🔁</span><span className="vd-sb-txt">{t('verifier_dashboard.reverification')}</span></span>
          <span className="vd-sb-badge">{items.filter((c) => c.queue === "Re-verification").length}</span>
        </button>

        <button type="button" className={`vd-sb-sublink ${activeNav === "physical" ? "active" : ""}`} onClick={() => selectView("physical", setShowPhysicalVerification)}>
          <span className="vd-sb-sublabel"><span className="vd-sb-ic">🔍</span><span className="vd-sb-txt">{t('verifier_dashboard.physical_verification')}</span></span>
        </button>

        <button type="button" className={`vd-sb-sublink ${activeNav === "history" ? "active" : ""}`} onClick={() => selectView("history", setShowComplaintHistory)}>
          <span className="vd-sb-sublabel"><span className="vd-sb-ic">📜</span><span className="vd-sb-txt">{t('verifier_dashboard.complaint_history')}</span></span>
        </button>
      </div>
    </nav>
    <div className="vd-sb-label">{t('verifier_dashboard.tools_actions')}</div>
    <nav className="vd-sb-nav">
      <button type="button" className={`vd-sb-link ${activeNav === "notifications" ? "active" : ""}`} onClick={() => selectView("notifications", setShowNotifications)}>🔔 {t('verifier_dashboard.notifications')}<span className="vd-sb-badge">{notifications.filter((n) => !n.isRead).length}</span></button>
      <button type="button" className={`vd-sb-link ${activeNav === "location" ? "active" : ""}`} onClick={() => selectView("location", setShowViewLocation)}>🗺️ {t('verifier_dashboard.view_location')}</button>
    </nav>
    <div className="vd-sb-label">{t('verifier_dashboard.account')}</div>
    <nav className="vd-sb-nav">
      <button type="button" className="vd-sb-link" onClick={handleLogout} style={{ color: "#ff6b6b", marginTop: "8px" }}>🚪 {t('verifier_dashboard.logout')}</button>
    </nav>
    <div className="vd-sb-footer">
      <div className="vd-sb-user">
        <div className="vd-sb-avatar">{verifier.profilePhoto ? <img src={toMediaUrl(verifier.profilePhoto)} alt="Profile" /> : initials}</div>
        <div className="vd-sb-user-info"><b>{verifier.name}</b><span>{verifier.staffId}</span></div>
      </div>
      <div className="vd-sb-ward">{verifier.role} · {verifier.ward}</div>
    </div>
  </aside>
  );

  // Keep complaint navigation expanded when one of its pages is active.
  useEffect(() => {
    if (complaintNavKeys.includes(activeNav)) setShowComplaintsMenu(true);
  }, [activeNav]);

  // ✅ CONDITIONAL RENDERING
  if (showProfile) return renderWithSidebar(<MyProfile initialVerifier={verifier} onBack={returnToDashboard} onUpdate={handleUpdateProfile} />);
  if (showNewComplaints) return renderWithSidebar(<NewComplaints complaints={items.filter(isNewVerifierComplaint)} staffOptions={staffOptions} onAction={handleNewComplaintAction} onBack={returnToDashboard} />);
  if (showComplaintAssigned) return renderWithSidebar(<ComplaintAssigned complaints={assignedComplaints} staffOptions={staffOptions} verifier={verifier} loadError={loadError} onBack={returnToDashboard} onAction={handleNewComplaintAction} onAssignStaff={handleManagementAssignStaff} onSaveEvidence={handleSaveVerifierEvidence} />);
  if (showComplaintHistory) return renderWithSidebar(<ComplaintHistory complaints={items} onVerify={handleVerificationDecision} onBack={returnToDashboard} />);
  if (showPhysicalVerification) return renderWithSidebar(<PhysicalVerification complaints={items} loadError={loadError} onBack={returnToDashboard} onSubmitVerification={handlePhysicalVerificationSubmit} />);
  if (showCompletedWork) return renderWithSidebar(<CompletedWork complaints={items} loadError={loadError} onBack={returnToDashboard} onVerify={handleCompletedWorkVerify} />);
  if (showWorkVerification) return renderWithSidebar(<WorkVerification complaints={items} loadError={loadError} onBack={returnToDashboard} onVerify={handleCompletedWorkVerify} />);
  if (showUpdatedComplaints) return renderWithSidebar(<UpdatedComplaints complaints={items} actorRoles={["staff", "admin", "verifier"]} audienceLabel="Staff, admin & verifier activity" listTitle="Staff, Admin & Verifier Updates" showUpdateHistory={false} onBack={returnToDashboard} />);
  if (showReverification) return renderWithSidebar(<Reverification complaints={items} loadError={loadError} onBack={returnToDashboard} onReverify={handleReverifyAction} />);
  if (showNotifications) return renderWithSidebar(<Notifications notifications={notifications} complaints={items} staffOptions={staffOptions} onVerify={handleVerificationDecision} onAcceptAssign={updateNotificationComplaintStaff} onAssign={updateNotificationComplaintStaff} onReject={handleNotificationReject} onComplaintUpdated={handleNotificationComplaintUpdated} onBack={returnToDashboard} onMarkAsRead={handleMarkNotifAsRead} onMarkAllRead={handleMarkAllNotifsRead} />);
  if (showViewLocation) return renderWithSidebar(<ViewLocation complaints={items} staffOptions={staffOptions} onVerify={handleVerificationDecision} onAcceptAssign={updateNotificationComplaintStaff} onAssign={updateNotificationComplaintStaff} onReject={handleNotificationReject} onBack={returnToDashboard} />);

  // ✅ DETAILED COMPLAINT VIEW
  if (showDetailView && selected) {
    return (
      <div className={`vd-shell ${mobileSidebarOpen ? "vd-mobile-nav-open" : ""}`}>
        {sidebarMarkup}
        <button type="button" className="vd-mobile-nav-backdrop" aria-label="Close navigation menu" onClick={() => setMobileSidebarOpen(false)} />

        <div className="vd-main">
          <div className="vd-topbar">
            <button
            type="button"
            className="vd-mobile-menu-btn"
            aria-label={mobileSidebarOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileSidebarOpen}
            onClick={() => setMobileSidebarOpen((open) => !open)}
          >
            <span></span><span></span><span></span>
          </button>
            <button className="vd-btn-outline" onClick={handleBackToList}>← {t('verifier_dashboard.back_to_list')}</button>
            <div className="vd-tb-actions">
              <div className="vd-tb-user">
                <div className="vd-tb-avatar">{verifier.profilePhoto ? <img src={toMediaUrl(verifier.profilePhoto)} alt="Profile" /> : initials}</div>
                <div><b>{verifier.name}</b><span>{verifier.role}</span></div>
              </div>
            </div>
          </div>

          <div className="vd-content">
            {actionMessage && <div className="vd-error-message" role="alert">{actionMessage}</div>}
            <div className="vd-panel vd-form-panel">
              <div className="vd-panel-head"><h3>{t('verifier_dashboard.complaint_details')}</h3><span className="vd-panel-link">{selected.complaintNumber}</span></div>
              <div className="vd-detail-grid">
                <div className="vd-detail-item"><span>{t('verifier_dashboard.complaint_number')}</span><b>{selected.complaintNumber}</b></div>
                <div className="vd-detail-item"><span>{t('verifier_dashboard.category')}</span><b>{selected.category}</b></div>
                <div className="vd-detail-item"><span>{t('verifier_dashboard.citizen')}</span><b>{selected.citizenName}</b></div>
                <div className="vd-detail-item"><span>{t('verifier_dashboard.citizen_contact')}</span><b>{selected.citizenContact}</b></div>
                <div className="vd-detail-item vd-detail-wide"><span>{t('verifier_dashboard.description')}</span><b>{selected.description}</b></div>
              </div>
            </div>

            <div className="vd-panel vd-form-panel">
              <div className="vd-panel-head"><h3>{t('verifier_dashboard.citizen_assignment_work')}</h3></div>
              <div className="vd-detail-table-grid">
                <div className="vd-detail-table-row">
                  <div className="vd-detail-table-cell"><span className="vd-detail-label">{t('verifier_dashboard.citizen')}</span><span className="vd-detail-value">{selected.citizenName}</span></div>
                  <div className="vd-detail-table-cell"><span className="vd-detail-label">{t('verifier_dashboard.citizen_contact')}</span><span className="vd-detail-value">{selected.citizenContact || t('verifier_dashboard.not_available')}</span></div>
                  <div className="vd-detail-table-cell"><span className="vd-detail-label">{t('verifier_dashboard.citizen_email')}</span><span className="vd-detail-value">{selected.citizenEmail || t('verifier_dashboard.not_available')}</span></div>
                  <div className="vd-detail-table-cell"><span className="vd-detail-label">{t('verifier_dashboard.department')}</span><span className="vd-detail-value">{selected.department || t('verifier_dashboard.not_assigned')}</span></div>
                  <div className="vd-detail-table-cell"><span className="vd-detail-label">{t('verifier_dashboard.assigned_staff')}</span><span className="vd-detail-value">{selected.assignedStaff || t('verifier_dashboard.not_assigned')}</span></div>
                </div>
                <div className="vd-detail-table-row">
                  <div className="vd-detail-table-cell"><span className="vd-detail-label">{t('verifier_dashboard.assigned_verifier')}</span><span className="vd-detail-value">{selected.assignedVerifier || verifier.name}</span></div>
                  <div className="vd-detail-table-cell"><span className="vd-detail-label">{t('verifier_dashboard.priority')}</span><span className="vd-detail-value">{selected.priority || "Normal"}</span></div>
                  <div className="vd-detail-table-cell"><span className="vd-detail-label">{t('verifier_dashboard.submitted')}</span><span className="vd-detail-value">{selected.createdAt ? new Date(selected.createdAt).toLocaleString() : selected.date ? new Date(selected.date).toLocaleString() : t('verifier_dashboard.not_recorded')}</span></div>
                  <div className="vd-detail-table-cell"><span className="vd-detail-label">{t('verifier_dashboard.last_updated')}</span><span className="vd-detail-value">{selected.updatedAt ? new Date(selected.updatedAt).toLocaleString() : t('verifier_dashboard.not_recorded')}</span></div>
                  <div className="vd-detail-table-cell"><span className="vd-detail-label">{t('verifier_dashboard.landmark')}</span><span className="vd-detail-value">{selected.landmark || t('verifier_dashboard.not_provided')}</span></div>
                </div>
                <div className="vd-detail-table-row">
                  <div className="vd-detail-table-cell"><span className="vd-detail-label">{t('verifier_dashboard.inspection_date')}</span><span className="vd-detail-value">{selected.inspection?.inspectionDate || selected.inspectionDate || t('verifier_dashboard.not_recorded')}</span></div>
                  <div className="vd-detail-table-cell"><span className="vd-detail-label">{t('verifier_dashboard.work_completion_date')}</span><span className="vd-detail-value">{selected.inspection?.completionDate || selected.completionDate || t('verifier_dashboard.not_recorded')}</span></div>
                </div>
                <div className="vd-detail-table-row vd-full-width">
                  <div className="vd-detail-table-cell"><span className="vd-detail-label">{t('verifier_dashboard.reported_description')}</span><span className="vd-detail-value vd-description">{selected.description}</span></div>
                </div>
                <div className="vd-detail-table-row vd-full-width">
                  <div className="vd-detail-table-cell"><span className="vd-detail-label">{t('verifier_dashboard.staff_inspection_remarks')}</span><span className="vd-detail-value vd-description">{selected.inspection?.remarks || t('verifier_dashboard.no_staff_inspection_remarks')}</span></div>
                </div>
                <div className="vd-detail-table-row vd-full-width">
                  <div className="vd-detail-table-cell"><span className="vd-detail-label">{t('verifier_dashboard.action_taken_by_staff')}</span><span className="vd-detail-value vd-description">{selected.inspection?.actionTaken || selected.actionTaken || t('verifier_dashboard.no_work_action_recorded')}</span></div>
                </div>
                <div className="vd-detail-table-row vd-full-width">
                  <div className="vd-detail-table-cell">
                    <span className="vd-detail-label">{t('verifier_dashboard.complaint_gps_coordinates')}</span>
                    {selected.coordinates?.latitude != null && selected.coordinates?.longitude != null ? (
                      <a className="vd-detail-value" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${selected.coordinates.latitude},${selected.coordinates.longitude}`)}`} target="_blank" rel="noopener noreferrer">
                        {selected.coordinates.latitude}, {selected.coordinates.longitude} · {t('verifier_dashboard.open_map')}
                      </a>
                    ) : <span className="vd-detail-value">{t('verifier_dashboard.coordinates_not_available')}</span>}
                  </div>
                </div>
              </div>
            </div>

            <div className="vd-panel vd-form-panel">
              <div className="vd-panel-head"><h3>{t('verifier_dashboard.photos_for', { complaintNumber: selected.complaintNumber })}</h3></div>
              <div className="vd-photo-table">
                <table>
                  <thead><tr><th>{t('verifier_dashboard.before_repair')}</th><th>{t('verifier_dashboard.site_photo')}</th><th>{t('verifier_dashboard.after_repair')}</th></tr></thead>
                  <tbody>
                    <tr>
                      <td>{selected.photos.before ? <ComplaintImage src={selected.photos.before} alt={t('verifier_dashboard.before_repair')} className="vd-photo-table-img" fallbackClassName="vd-photo-placeholder" /> : <div className="vd-photo-placeholder"><span>📷</span><span>{t('verifier_dashboard.not_available')}</span></div>}</td>
                      <td>{selected.photos.site ? <ComplaintImage src={selected.photos.site} alt={t('verifier_dashboard.site_photo')} className="vd-photo-table-img" fallbackClassName="vd-photo-placeholder" /> : <div className="vd-photo-placeholder"><span>📷</span><span>{t('verifier_dashboard.not_available')}</span></div>}</td>
                      <td>{selected.photos.after ? <ComplaintImage src={selected.photos.after} alt={t('verifier_dashboard.after_repair')} className="vd-photo-table-img" fallbackClassName="vd-photo-placeholder" /> : <div className="vd-photo-placeholder"><span>📷</span><span>{t('verifier_dashboard.not_available')}</span></div>}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="vd-panel vd-form-panel" id="verification-panel">
              <div className="vd-panel-head">
                <h3>{t('verifier_dashboard.complaint_review_assignment', { complaintNumber: selected.complaintNumber })}</h3>
                <span className={`vd-badge vd-badge-${statusTone[selected.status]}`}>{getStatusLabel(selected.status)}</span>
              </div>
              <div className="vd-verification-table">
                <div className="vd-verification-row">
                  <div className="vd-verification-label">{t('verifier_dashboard.current_status')}</div>
                  <div className="vd-verification-value"><span className={`vd-badge vd-badge-${statusTone[selected.status]}`}>{getStatusLabel(selected.status)}</span></div>
                </div>
                {["pending", "in_review"].includes(selected.status) && (
                  <div className="vd-verification-row">
                    <div className="vd-verification-label">{selected.status === "pending" ? t('verifier_dashboard.review_rejection_remarks') : t('verifier_dashboard.verification_remarks')}</div>
                    <div className="vd-verification-value">
                      <textarea id="verifier-remarks" rows="3" placeholder={selected.status === "pending" ? t('verifier_dashboard.add_reason_reject') : t('verifier_dashboard.note_review_findings')} value={remarksDraft} onChange={(e) => setRemarksDraft(e.target.value)} className="vd-verification-textarea" />
                    </div>
                  </div>
                )}
                {selected.status === "rejected" && (
                  <div className="vd-verification-row">
                    <div className="vd-verification-label">{t('verifier_dashboard.previous_rejection_reason')}</div>
                    <div className="vd-verification-value vd-description">{selected.previousRemarks || t('verifier_dashboard.see_activity_log_feedback')}</div>
                  </div>
                )}
                <div className="vd-verification-actions">
                  {["pending", "in_action", "rejected"].includes(selected.status) && (
                    <div className="vd-assignment-detail">
                      <label htmlFor="vd-detail-staff">{t('verifier_dashboard.assign_staff_for_complaint')}</label>
                      <select id="vd-detail-staff" className="vd-assignment-select" value={detailStaffId} disabled={assignmentSavingId === selected.id || staffOptions.length === 0} onChange={(event) => setDetailStaffId(event.target.value)}>
                        <option value="">{t('verifier_dashboard.select_staff_member')}</option>
                        {staffOptions.map((staff) => <option key={staff._id} value={staff._id}>{staff.name}{staff.staffId ? ` · ${staff.staffId}` : ""}</option>)}
                      </select>
                      <button className="vd-btn-primary" type="button" disabled={assignmentSavingId === selected.id || !detailStaffId} onClick={assignStaffFromDetails}>
                        {assignmentSavingId === selected.id ? t('verifier_dashboard.saving_assignment') : selected.status === "pending" ? t('verifier_dashboard.accept_assign_staff') : t('verifier_dashboard.assign_reassign_staff')}
                      </button>
                    </div>
                  )}
                  {selected.status === "pending" && <button className="vd-btn-danger" type="button" disabled={actionSaving} onClick={() => handleDashboardAction(() => rejectWork(selected.id))}>{t('verifier_dashboard.reject_complaint_remarks_required')}</button>}
                  {selected.status === "in_review" && (
                    <>
                      <button className="vd-btn-danger" type="button" disabled={actionSaving} onClick={() => handleDashboardAction(() => rejectWork(selected.id))}>{t('verifier_dashboard.work_not_satisfied_reject')}</button>
                      <button className="vd-btn-primary" type="button" disabled={actionSaving} onClick={() => handleDashboardAction(() => approveWork(selected.id))}>{t('verifier_dashboard.work_satisfied_approve_verify')}</button>
                    </>
                  )}
                  {selected.status === "in_action" && <div className="vd-verification-info">{t('verifier_dashboard.assigned_to_staff_info')}</div>}
                  {selected.status === "rejected" && <div className="vd-verification-info">{t('verifier_dashboard.staff_must_submit_corrected')}</div>}
                  {selected.status === "verified" && <button className="vd-btn-primary" type="button" disabled={actionSaving} onClick={() => handleDashboardAction(() => markResolved(selected.id))}>{t('verifier_dashboard.update_status_resolved_closed')}</button>}
                  {selected.status === "resolved" && <button className="vd-btn-primary" type="button" disabled={actionSaving} onClick={() => handleDashboardAction(() => closeComplaint(selected.id))}>{t('verifier_dashboard.close_complaint')}</button>}
                  {selected.status === "notified" && <div className="vd-verification-success">{t('verifier_dashboard.citizen_notified_closed')}</div>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ✅ MAIN DASHBOARD VIEW
  return (
    <div className={`vd-shell ${mobileSidebarOpen ? "vd-mobile-nav-open" : ""}`}>
      {sidebarMarkup}
      <button type="button" className="vd-mobile-nav-backdrop" aria-label="Close navigation menu" onClick={() => setMobileSidebarOpen(false)} />

      <div className="vd-main" id="vd-top">
        <div className="vd-topbar">
          <button
            type="button"
            className="vd-mobile-menu-btn"
            aria-label={mobileSidebarOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileSidebarOpen}
            onClick={() => setMobileSidebarOpen((open) => !open)}
          >
            <span></span><span></span><span></span>
          </button>
          <div className="vd-search">🔍 <input type="search" placeholder={t('verifier_dashboard.search_placeholder')} value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} /></div>
          <div className="vd-tb-actions">
            <div className="vd-tb-user" id="vd-profile">
              <div className="vd-tb-avatar">{verifier.profilePhoto ? <img src={toMediaUrl(verifier.profilePhoto)} alt="Profile" /> : initials}</div>
              <div><b>{verifier.name}</b><span>{verifier.role}</span></div>
            </div>
          </div>
        </div>

        <div className="vd-content vd-overview-content">
          {loadError && <div className="vd-error-message" role="alert">{loadError}</div>}
          {actionMessage && <div className="vd-error-message" role="alert">{actionMessage}</div>}
          <div className="vd-title-row">
            <div><h1>{t('verifier_dashboard.welcome_back', { name: verifier.name.split(" ")[0] })}</h1><p>{verifier.role} · {verifier.ward} · {verifier.contact}</p></div>
          </div>

          <div className="vd-stats-row vd-primary-stats">
            {previousStats.map((stat, i) => (
              <div className={`vd-stat-card tone-${stat.tone}`} key={i}><div className="vd-stat-ic">{stat.icon}</div><div className="vd-stat-num">{stat.value}</div><div className="vd-stat-label">{stat.label}</div></div>
            ))}
          </div>

          <section className="vd-dashboard-charts" aria-label={t('verifier_dashboard.complaint_verification_charts')}>
            <article className="vd-dashboard-chart">
              <div className="vd-dashboard-chart-head">
                <div><h3>{t('verifier_dashboard.complaint_trend')}</h3><p>{t('verifier_dashboard.reported_verified_over_time')}</p></div>
                <label className="vd-chart-range">
                  <span className="vd-visually-hidden">{t('verifier_dashboard.trend_date_range')}</span>
                  <select value={trendRange} onChange={(event) => setTrendRange(Number(event.target.value))}>
                    <option value={7}>{t('verifier_dashboard.last_7_days')}</option>
                    <option value={30}>{t('verifier_dashboard.last_30_days')}</option>
                    <option value={90}>{t('verifier_dashboard.last_90_days')}</option>
                  </select>
                </label>
              </div>
              <div className="vd-chart-canvas vd-chart-canvas-trend">
                {items.length === 0 ? <div className="vd-chart-empty">{t('verifier_dashboard.no_complaint_data')}</div> : !verifierCharts.trendHasData ? <div className="vd-chart-empty">{t('verifier_dashboard.no_dated_complaints')}</div> : (
                  <Line data={verifierCharts.trend} options={{ ...verifierChartBaseOptions, plugins: { ...verifierChartBaseOptions.plugins, legend: { position: "top", align: "end", labels: verifierChartBaseOptions.plugins.legend.labels } }, scales: { x: { grid: { display: false }, border: { display: false } }, y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: "#edf2f8" }, border: { display: false } } } }} />
                )}
              </div>
            </article>
            <article className="vd-dashboard-chart">
              <div className="vd-dashboard-chart-head"><div><h3>{t('verifier_dashboard.complaint_categories')}</h3><p>{t('verifier_dashboard.share_of_reported')}</p></div></div>
              <div className="vd-chart-canvas vd-chart-canvas-circle">
                {verifierCharts.category.labels.length === 0 ? <div className="vd-chart-empty">{t('verifier_dashboard.no_category_data')}</div> : <Pie data={verifierCharts.category} options={{ ...verifierChartBaseOptions, plugins: { ...verifierChartBaseOptions.plugins, legend: { position: "bottom", labels: verifierChartBaseOptions.plugins.legend.labels } } }} />}
              </div>
            </article>
            <article className="vd-dashboard-chart">
              <div className="vd-dashboard-chart-head"><div><h3>{t('verifier_dashboard.complaint_status')}</h3><p>{t('verifier_dashboard.current_verification_pipeline')}</p></div></div>
              <div className="vd-chart-canvas vd-chart-canvas-circle vd-chart-doughnut">
                {verifierCharts.status.labels.length === 0 ? <div className="vd-chart-empty">{t('verifier_dashboard.no_status_data')}</div> : (<>
                  <Doughnut data={verifierCharts.status} options={{ ...verifierChartBaseOptions, cutout: "68%", plugins: { ...verifierChartBaseOptions.plugins, legend: { position: "bottom", labels: verifierChartBaseOptions.plugins.legend.labels } } }} />
                  <div className="vd-chart-center" aria-hidden="true"><span>{t('verifier_dashboard.total')}</span><strong>{items.length}</strong></div>
                </>)}
              </div>
            </article>
            <article className="vd-dashboard-chart">
              <div className="vd-dashboard-chart-head"><div><h3>{t('verifier_dashboard.workflow_queue')}</h3><p>{t('verifier_dashboard.complaints_awaiting_step')}</p></div></div>
              <div className="vd-chart-canvas vd-chart-canvas-column">
                {items.length === 0 ? <div className="vd-chart-empty">{t('verifier_dashboard.no_workflow_data')}</div> : <Bar data={verifierCharts.queue} options={{ ...verifierChartBaseOptions, plugins: { ...verifierChartBaseOptions.plugins, legend: { display: false } }, scales: { x: { grid: { display: false }, border: { display: false }, ticks: { maxRotation: 25, minRotation: 0 } }, y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: "#edf2f8" }, border: { display: false } } } }} />}
              </div>
            </article>
          </section>

          <div className="vd-stats-row vd-queue-stats">
            {newStats.map((stat, i) => (
              <div className={`vd-stat-card tone-${stat.tone}`} key={i}><div className="vd-stat-ic">{stat.icon}</div><div className="vd-stat-num">{stat.value}</div><div className="vd-stat-label">{stat.label}</div></div>
            ))}
          </div>

          <div className="vd-panel" id="queue-panel">
            <div className="vd-panel-head">
              <h3>{t('verifier_dashboard.all_complaints')}</h3>
              <span className="vd-panel-link">{t('verifier_dashboard.shown_total', { shown: filteredItems.length, total: items.length })}</span>
            </div>
            <div className="vd-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{t('verifier_dashboard.complaint')}</th>
                    <th>{t('verifier_dashboard.source')}</th>
                    <th>{t('verifier_dashboard.category')}</th>
                    <th>{t('verifier_dashboard.location_gps')}</th>
                    <th>{t('verifier_dashboard.queue')}</th>
                    <th>{t('verifier_dashboard.status')}</th>
                    <th>{t('verifier_dashboard.assigned_staff')}</th>
                    <th>{t('verifier_dashboard.details_verify')}</th>
                    <th>{t('verifier_dashboard.activity')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.length === 0 ? (
                    <tr><td colSpan="9" style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>{t('verifier_dashboard.no_complaints_found')}</td></tr>
                  ) : filteredItems.map((c) => (
                    <tr key={c.id} className={selectedId === c.id ? "vd-row-active" : ""} onClick={() => setSelectedId(c.id)}>
                      <td className="vd-mono">{c.complaintNumber}</td>
                      <td>{c.citizenId ? t('verifier_dashboard.registered_citizen') : t('verifier_dashboard.guest')}</td>
                      <td><div className="vd-cat"><span className="vd-cat-dot" style={{ background: colorForCategory(c.category) }}></span>{c.issue}</div></td>
                      <td>
                        <div>{c.location || t('verifier_dashboard.location_pending')}</div>
                        {c.coordinates?.latitude != null && c.coordinates?.longitude != null && (
                          <a className="vd-table-map-link" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${c.coordinates.latitude},${c.coordinates.longitude}`)}`} target="_blank" rel="noopener noreferrer" onClick={(event) => event.stopPropagation()}>
                            {c.coordinates.latitude}, {c.coordinates.longitude} · {t('verifier_dashboard.map')}
                          </a>
                        )}
                      </td>
                      <td><span className={`vd-badge vd-badge-${queueTone[c.queue]}`}>{getQueueLabel(c.queue)}</span></td>
                      <td><span className={`vd-badge vd-badge-${statusTone[c.status]}`}>{getStatusLabel(c.status)}</span></td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <select className="vd-assignment-select" aria-label={`${t('verifier_dashboard.assign_staff_for_complaint')} ${c.complaintNumber}`} value={getAssignedStaffId(c)} disabled={assignmentSavingId === c.id || staffOptions.length === 0} onChange={(event) => handleAssignStaff(c, event.target.value)}>
                          <option value="">{t('verifier_dashboard.unassigned')}</option>
                          {staffOptions.map((staff) => <option key={staff._id} value={staff._id}>{staff.name}{staff.staffId ? ` · ${staff.staffId}` : ""}</option>)}
                        </select>
                        {assignmentSavingId === c.id && <small> {t('verifier_dashboard.saving')}</small>}
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <button className="vd-verify-btn" type="button" onClick={() => handleQuickVerify(c)} title={t('verifier_dashboard.open_verification_title')}>📄 {t('verifier_dashboard.details_verify')}</button>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <button className="vd-activity-btn" type="button" onClick={() => handleShowActivity(c)} title={t('verifier_dashboard.view_activity_log_title')}>📜 {c.log?.length || 0}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {showActivityModal && activityComplaint && (
            <div className="vd-activity-modal-overlay" onClick={handleCloseActivityModal}>
              <div className="vd-activity-modal" onClick={(e) => e.stopPropagation()}>
                <div className="vd-activity-modal-header">
                  <div><h3>{t('verifier_dashboard.activity_log')}</h3><span className="vd-mono vd-faint">{activityComplaint.complaintNumber}</span></div>
                  <button className="vd-activity-modal-close" onClick={handleCloseActivityModal}>✕</button>
                </div>
                <div className="vd-activity-modal-body">
                  {activityComplaint.log && activityComplaint.log.length > 0 ? (
                    <div className="vd-activity-list">
                      {activityComplaint.log.map((note, i) => (
                        <div className="vd-activity-item" key={i}>
                          <span className="vd-activity-dot"></span>
                          <div className="vd-activity-content"><b>{note.text}</b><span>{note.time}</span></div>
                        </div>
                      ))}
                    </div>
                  ) : <div className="vd-activity-empty"><p>{t('verifier_dashboard.no_activity_recorded')}</p></div>}
                </div>
                <div className="vd-activity-modal-footer"><button className="vd-btn-outline" onClick={handleCloseActivityModal}>{t('verifier_dashboard.close')}</button></div>
              </div>
            </div>
          )}

          <div className="vd-quick-row">
            <button className="vd-quick-card" type="button" onClick={() => scrollTo("queue-panel")}>
              <div className="vd-quick-ic navy">🗂️</div>
              <div><h5>{t('verifier_dashboard.view_pending_verifications')}</h5><p>{t('verifier_dashboard.view_pending_desc')}</p></div>
            </button>
            <button className="vd-quick-card" type="button" onClick={() => openVerification(selected)}>
              <div className="vd-quick-ic saffron">🔍</div>
              <div><h5>{t('verifier_dashboard.run_physical_verification')}</h5><p>{t('verifier_dashboard.run_physical_desc')}</p></div>
            </button>
            <button className="vd-quick-card" type="button" onClick={() => { setShowMapView(true); scrollTo("map-section"); }}>
              <div className="vd-quick-ic green">🗺️</div>
              <div><h5>{t('verifier_dashboard.view_location_map')}</h5><p>{t('verifier_dashboard.view_location_desc')}</p></div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifierDashboard;