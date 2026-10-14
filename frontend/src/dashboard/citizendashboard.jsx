import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./citizendashboard.css";
import logo from "../assets/logo.jpeg"; // ⚠ make sure this file name + extension exist in src/assets

// ✅ SUB-PAGE IMPORTS
import MyProfile from "../Citizenprofiledashboard/MyProfile";
import MyComplaints from "../Citizenprofiledashboard/MyComplaints";
import TrackComplaint from "../Citizenprofiledashboard/TrackComplaint";
import ComplaintsDetails from "../Citizenprofiledashboard/ComplaintsDetails";
import IssueMap from "../Citizenprofiledashboard/IssueMap";
import Notifications from "../Citizenprofiledashboard/Notifications";
import RecentActivity from "../Citizenprofiledashboard/RecentActivity";

const API_URL = "http://localhost:3200/api/complaints";

/*
 * ✅ SINGLE SOURCE OF TRUTH for the Report page route.
 * This MUST match the path in App.jsx, e.g.
 *   <Route path="/reportissue" element={<Report />} />
 */
const REPORT_ROUTE = "/reportissue";

const lifecycleStages = [
  "Complaint Registered",
  "Complaint Verified",
  "Assigned to Staff/Officer",
  "Action Initiated",
  "Work Completed",
  "Verification",
  "Complaint Closed",
];

const mapColors = ["#e07b1c", "#2e6cb0", "#1d8a5c", "#c1900a", "#cf4438", "#7a5c9e"];

const colorForCategory = (category = "") => {
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  return mapColors[Math.abs(hash) % mapColors.length];
};

const notifications = [
  { text: "Complaint MRI-482913 has moved to Work Completed", time: "2 hours ago" },
  { text: "Complaint MRI-291045 was assigned to a field officer", time: "1 day ago" },
  { text: "Complaint MRI-773820 has been registered", time: "3 days ago" },
];

const stageTone = ["amber", "amber", "orange", "orange", "orange", "amber", "green"];

const getStageFromStatus = (status) => {
  const normalized = String(status || "").trim().toLowerCase();
  const statusMap = {
    registered: 0, new: 0, "complaint registered": 0, pending: 0, submitted: 0, "under review": 0,
    verified: 1, "complaint verified": 1, "under verification": 1,
    assigned: 2, "assigned to staff/officer": 2, "assigned to staff": 2, "assigned to officer": 2,
    "action initiated": 3, "in progress": 3, "under action": 3,
    "work completed": 4, completed: 4,
    verification: 5, "awaiting verification": 5, resolved: 5,
    closed: 6, "complaint closed": 6,
  };
  return statusMap[normalized] ?? 0;
};

/* Safely read JSON (prevents "Unexpected token '<'" when server returns HTML) */
const readJsonResponse = async (response) => {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (error) {
    console.error("API returned non-JSON response:", text);
    throw new Error(`Server returned an invalid response (${response.status}).`);
  }
};

const getStoredUser = () => {
  try {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) return {};
    return JSON.parse(storedUser);
  } catch (error) {
    console.error("Unable to read logged-in user:", error);
    return {};
  }
};

const getCitizenId = (user) =>
  user?._id || user?.id || user?.userId || user?.citizenId || null;

/* ============================================================
   SVG ICONS (Sidebar / Topbar)
   ============================================================ */
const svgProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": "true",
};

const Icons = {
  Dashboard: () => (
    <svg width="18" height="18" {...svgProps}>
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  ),
  Profile: () => (
    <svg width="18" height="18" {...svgProps}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  Report: () => (
    <svg width="18" height="18" {...svgProps}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  Complaints: () => (
    <svg width="18" height="18" {...svgProps}>
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <line x1="8" y1="10" x2="16" y2="10" />
      <line x1="8" y1="14" x2="16" y2="14" />
      <line x1="8" y1="18" x2="12" y2="18" />
    </svg>
  ),
  Track: () => (
    <svg width="18" height="18" {...svgProps}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  Details: () => (
    <svg width="18" height="18" {...svgProps}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="15" y2="17" />
    </svg>
  ),
  Map: () => (
    <svg width="18" height="18" {...svgProps}>
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
      <line x1="8" y1="2" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="22" />
    </svg>
  ),
  Bell: () => (
    <svg width="18" height="18" {...svgProps}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  Clock: () => (
    <svg width="18" height="18" {...svgProps}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  Edit: () => (
    <svg width="14" height="14" {...svgProps}>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  Delete: () => (
    <svg width="14" height="14" {...svgProps}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  Search: () => (
    <svg width="16" height="16" {...svgProps}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  // ✅ ADDED: Logout Icon
  Logout: () => (
    <svg width="18" height="18" {...svgProps}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
};

const CitizenDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const stored = getStoredUser();

  // ---------------- STATE VARIABLES ----------------
  const [profile] = useState({
    name: stored.name || "Citizen User",
    mobile: stored.mobile ? `+91 ${stored.mobile}` : "+91 98765 43210",
    memberSince: "March 2026",
    ward: stored.location || "Ward 3 — Riverside",
  });

  const [complaints, setComplaints] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [showMapView, setShowMapView] = useState(false);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [complaintsLoading, setComplaintsLoading] = useState(false);
  const [complaintsError, setComplaintsError] = useState("");
  const [trackId, setTrackId] = useState("");
  const [trackedComplaint, setTrackedComplaint] = useState(null);
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState("");
  const [newComplaint, setNewComplaint] = useState({
    category: "", issue: "", location: "", description: "", photo: "", gps: "",
  });

  // Page visibility states
  const [showProfile, setShowProfile] = useState(false);
  const [showMyComplaints, setShowMyComplaints] = useState(false);
  const [showTrackComplaint, setShowTrackComplaint] = useState(false);
  const [showComplaintDetails, setShowComplaintDetails] = useState(false);
  const [showIssueMap, setShowIssueMap] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showRecentActivity, setShowRecentActivity] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  // ---------------- HANDLERS ----------------
  const goToReportIssue = () => {
    navigate(REPORT_ROUTE);
  };

  // ✅ FIXED: Proper Logout Functionality
  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      localStorage.removeItem("user");
      window.dispatchEvent(new Event("authChange"));
      navigate("/login"); // Change to "/" if your login route is root
    }
  };

  const fetchMyComplaints = async () => {
    const user = getStoredUser();
    const citizenId = getCitizenId(user);

    if (!citizenId) {
      setComplaints([]);
      setSelectedId(null);
      setComplaintsError("Citizen information was not found. Please log in again.");
      return;
    }

    setComplaintsLoading(true);
    setComplaintsError("");
    const requestUrl = `${API_URL}/my/${encodeURIComponent(String(citizenId))}`;

    try {
      const response = await fetch(requestUrl, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      const result = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(result.message || `Failed to load complaints. Server returned ${response.status}.`);
      }
      if (!result.success) throw new Error(result.message || "Failed to load complaints.");

      const formattedComplaints = (Array.isArray(result.data) ? result.data : []).map((c) => ({
        ...c,
        id: String(c.id || c._id),
        complaintNumber: c.complaintNumber || c._id || c.id || "Unknown",
        issue: c.issue || c.issueType || "General Issue",
        issueType: c.issueType || c.issue || "General Issue",
        location: c.location || "Location pending",
        description: c.description || "",
        date: c.date || (c.createdAt ? new Date(c.createdAt).toISOString().slice(0, 10) : ""),
        stage: getStageFromStatus(c.status),
      }));

      setComplaints(formattedComplaints);
      setSelectedId((currentId) => {
        if (currentId && formattedComplaints.some((c) => c.id === currentId)) return currentId;
        return formattedComplaints[0]?.id ?? null;
      });
    } catch (error) {
      console.error("Fetch complaints error:", error);
      setComplaints([]);
      setSelectedId(null);
      setComplaintsError(error.message || "Unable to load complaints. Please try again.");
    } finally {
      setComplaintsLoading(false);
    }
  };

  const handleTrackComplaint = async (e) => {
    e.preventDefault();
    const complaintId = trackId.trim();
    if (!complaintId) {
      setTrackError("Please enter a complaint ID.");
      setTrackedComplaint(null);
      return;
    }

    setTrackLoading(true);
    setTrackError("");
    setTrackedComplaint(null);

    try {
      const requestUrl = `${API_URL}/track/${encodeURIComponent(complaintId)}`;
      const response = await fetch(requestUrl, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      const result = await readJsonResponse(response);

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Complaint not found. Please check the ID.");
      }
      if (!result.data) throw new Error("No complaint details were returned by the server.");
      setTrackedComplaint(result.data);
    } catch (error) {
      console.error("Track complaint error:", error);
      setTrackError(error.message || "Unable to track complaint. Please try again.");
    } finally {
      setTrackLoading(false);
    }
  };

  const handleCreateComplaint = (e) => {
    e.preventDefault();
    if (!newComplaint.category.trim() || !newComplaint.description.trim()) return;

    const complaint = {
      id: String(Date.now()),
      complaintNumber: `MRI-${Math.floor(100000 + Math.random() * 900000)}`,
      category: newComplaint.category,
      issue: newComplaint.issue || "General Issue",
      location: newComplaint.location || "Location pending",
      description: newComplaint.description,
      photo: newComplaint.photo,
      gps: newComplaint.gps,
      date: new Date().toISOString().slice(0, 10),
      stage: 0,
    };

    setComplaints((prev) => [complaint, ...prev]);
    setSelectedId(complaint.id);
    setNewComplaint({ category: "", issue: "", location: "", description: "", photo: "", gps: "" });
    setShowNewForm(false);
  };

  const captureGps = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setGpsBusy(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setNewComplaint((prev) => ({
          ...prev,
          gps: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        }));
        setGpsBusy(false);
      },
      () => {
        alert("Unable to get your location. Please allow location access.");
        setGpsBusy(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const startEdit = (complaint) => {
    setEditingId(complaint.id);
    setEditText(complaint.description || "");
    setEditLocation(complaint.location || "");
  };

  const saveEdit = async (id) => {
    const user = getStoredUser();
    const citizenId = getCitizenId(user);
    if (!citizenId) { alert("Please log in again."); return; }
    if (!editText.trim()) { alert("Description cannot be empty."); return; }

    try {
      const response = await fetch(`${API_URL}/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          citizenId,
          location: editLocation.trim(),
          description: editText.trim(),
        }),
      });
      const result = await readJsonResponse(response);
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to update complaint");
      }
      await fetchMyComplaints();
      setEditingId(null);
      alert("Complaint updated successfully");
    } catch (error) {
      console.error("Update complaint error:", error);
      alert(error.message || "Failed to update complaint");
    }
  };

  const handleDelete = async (id) => {
    const user = getStoredUser();
    const citizenId = getCitizenId(user);
    if (!citizenId) { alert("Please log in again."); return; }

    try {
      const response = await fetch(`${API_URL}/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ citizenId }),
      });
      const result = await readJsonResponse(response);
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to delete complaint");
      }
      setConfirmDeleteId(null);
      await fetchMyComplaints();
      alert("Complaint deleted successfully");
    } catch (error) {
      console.error("Delete complaint error:", error);
      alert(error.message || "Failed to delete complaint");
    }
  };

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  // ---------------- EFFECTS ----------------
  useEffect(() => {
    fetchMyComplaints();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const s = location.state;
    if (!s) return;
    if (s.openForm) setShowNewForm(true);
    if (s.openMap) setShowMapView(true);
    if (s.scrollTo) setTimeout(() => scrollTo(s.scrollTo), 50);
    navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  // ---------------- DERIVED VALUES ----------------
  const selectedComplaint = complaints.find((c) => c.id === selectedId) || complaints[0];
  const initials = profile.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const trackedStage = trackedComplaint ? getStageFromStatus(trackedComplaint.status) : 0;

  const overviewStats = [
    { label: "Total Complaints", value: complaints.length, icon: "📋", tone: "navy" },
    { label: "Pending", value: complaints.filter((c) => c.stage <= 1).length, icon: "⏳", tone: "amber" },
    { label: "Under Process", value: complaints.filter((c) => c.stage > 1 && c.stage < 5).length, icon: "🧰", tone: "orange" },
    { label: "Resolved", value: complaints.filter((c) => c.stage === 5).length, icon: "✅", tone: "green" },
    { label: "Closed", value: complaints.filter((c) => c.stage === 6).length, icon: "📁", tone: "navy" },
  ];

  const mapGroups = complaints.reduce((groups, c) => {
    const key = c.location || "Location pending";
    if (!groups[key]) groups[key] = [];
    groups[key].push(c);
    return groups;
  }, {});

  // ✅ CONDITIONAL RENDERING (Must be AFTER all hooks, BEFORE main return)
  if (showProfile) return <MyProfile onBack={() => setShowProfile(false)} />;
  if (showMyComplaints) return <MyComplaints complaints={complaints} onBack={() => setShowMyComplaints(false)} />;
  if (showTrackComplaint) return <TrackComplaint onBack={() => setShowTrackComplaint(false)} />;
  if (showComplaintDetails) return <ComplaintsDetails onBack={() => setShowComplaintDetails(false)} />;
  if (showIssueMap) return <IssueMap onBack={() => setShowIssueMap(false)} />;
  if (showNotifications) return <Notifications onBack={() => setShowNotifications(false)} />;
  if (showRecentActivity) return <RecentActivity onBack={() => setShowRecentActivity(false)} />;

  // ✅ MAIN DASHBOARD RENDER
  return (
    <div className="cdp-shell">
      {/* ============ SIDEBAR ============ */}
      <aside className="cdp-sidebar">
        <div className="cdp-sb-brand">
          <div className="cdp-sb-logo">
            {logoFailed ? (
              "MI"
            ) : (
              <img
                src={logo}
                alt="MyRoad India"
                className="cdp-sb-logo-img"
                onError={() => setLogoFailed(true)}
              />
            )}
          </div>
          <div>
            <b>MyRoad India</b>
            <span>Citizen Portal</span>
          </div>
        </div>

        <div className="cdp-sb-label">Overview</div>
        <nav className="cdp-sb-nav">
          <button type="button" className="cdp-sb-link active" onClick={() => scrollTo("cdp-top")}>
            <Icons.Dashboard /> Dashboard
          </button>
          <button type="button" className="cdp-sb-link" onClick={() => setShowProfile(true)}>
            <Icons.Profile /> My Profile
          </button>
        </nav>

        <div className="cdp-sb-label">Citizen Functions</div>
        <nav className="cdp-sb-nav">
          <button type="button" className="cdp-sb-link" onClick={goToReportIssue}>
            <Icons.Report /> Report an Issue
          </button>
          <button type="button" className="cdp-sb-link" onClick={() => setShowMyComplaints(true)}>
            <Icons.Complaints /> My Complaints
            <span className="cdp-sb-badge">{complaints.length}</span>
          </button>
          <button type="button" className="cdp-sb-link" onClick={() => setShowTrackComplaint(true)}>
            <Icons.Track /> Track Complaint
          </button>
          <button type="button" className="cdp-sb-link" onClick={() => setShowComplaintDetails(true)}>
            <Icons.Details /> Complaint Details
          </button>
          <button type="button" className="cdp-sb-link" onClick={() => setShowIssueMap(true)}>
            <Icons.Map /> Issues Map
          </button>
        </nav>

        <div className="cdp-sb-label">Activity</div>
        <nav className="cdp-sb-nav">
          <button type="button" className="cdp-sb-link" onClick={() => setShowNotifications(true)}>
            <Icons.Bell /> Notifications
            <span className="cdp-sb-badge">{notifications.length}</span>
          </button>
          <button type="button" className="cdp-sb-link" onClick={() => setShowRecentActivity(true)}>
            <Icons.Clock /> Recent Activity
          </button>
          {/* ✅ FIXED: Proper Logout Button */}
          <button 
            type="button" 
            className="cdp-sb-link" 
            onClick={handleLogout}
            style={{ color: "var(--red, #d13438)", marginTop: "8px" }}
          >
            <Icons.Logout /> Logout
          </button>
        </nav>

        <div className="cdp-sb-footer">
          <div className="cdp-sb-user">
            <div className="cdp-sb-avatar">{initials}</div>
            <div className="cdp-sb-user-info">
              <b>{profile.name}</b>
              <span>{profile.mobile}</span>
            </div>
          </div>
          <div className="cdp-sb-ward">
            {profile.ward} · Member since {profile.memberSince}
          </div>
        </div>
      </aside>

      {/* ============ MAIN AREA ============ */}
      <div className="cdp-main" id="cdp-top">
        {/* TOPBAR */}
        <div className="cdp-topbar">
          <div className="cdp-search">
            <Icons.Search />
            <input type="text" placeholder="Search your complaints..." aria-label="Search complaints" />
          </div>
          <div className="cdp-tb-actions">
            <button
              type="button"
              className="cdp-icon-btn"
              aria-label="Notifications"
              onClick={() => setShowNotifications(true)}
            >
              <Icons.Bell />
              <span className="cdp-tb-dot"></span>
            </button>
            <div className="cdp-tb-user" onClick={() => setShowProfile(true)}>
              <div className="cdp-tb-avatar">{initials}</div>
              <div>
                <b>{profile.name}</b>
                <span>Citizen Account</span>
              </div>
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div className="cdp-content">
          <div className="cdp-title-row">
            <h1>Welcome back, {profile.name.split(" ")[0]}</h1>
            <p>{profile.ward} · Member since {profile.memberSince}</p>
          </div>

          {/* DASHBOARD STAT CARDS */}
          <div className="cdp-stats-row">
            {overviewStats.map((stat, i) => (
              <div className={`cdp-stat-card tone-${stat.tone}`} key={i}>
                <div className="cdp-stat-ic">{stat.icon}</div>
                <div className="cdp-stat-num">{stat.value}</div>
                <div className="cdp-stat-label">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* API ERROR */}
          {complaintsError && (
            <div className="cdp-panel cdp-error-panel">
              <div className="cdp-error-inner">
                <div>
                  <strong>Unable to load complaints</strong>
                  <p>{complaintsError}</p>
                </div>
                <button
                  type="button"
                  className="cdp-btn-primary"
                  onClick={fetchMyComplaints}
                  disabled={complaintsLoading}
                >
                  {complaintsLoading ? "Loading..." : "Retry"}
                </button>
              </div>
            </div>
          )}

          {/* TRACK COMPLAINT */}
          <div className="cdp-panel cdp-track-panel" id="track-complaint">
            <div className="cdp-panel-head">
              <div>
                <h3>Track Your Complaint</h3>
                <p>Enter your complaint ID to check its latest status.</p>
              </div>
            </div>
            <div className="cdp-track-body">
              <form className="cdp-track-form" onSubmit={handleTrackComplaint}>
                <input
                  type="text"
                  value={trackId}
                  onChange={(e) => {
                    setTrackId(e.target.value);
                    setTrackError("");
                  }}
                  placeholder="Enter Complaint ID"
                  aria-label="Complaint ID"
                  required
                />
                <button type="submit" className="cdp-btn-primary" disabled={trackLoading}>
                  {trackLoading ? "Tracking..." : "Track Complaint"}
                </button>
              </form>
              {trackError && (
                <div className="cdp-track-error" role="alert">
                  {trackError}
                </div>
              )}
              {trackedComplaint && (
                <div className="cdp-track-result">
                  <div className="cdp-track-result-header">
                    <div>
                      <span className="cdp-track-label">Complaint ID</span>
                      <h4>{trackedComplaint.complaintNumber || trackedComplaint._id}</h4>
                    </div>
                    <span className={`cdp-badge cdp-badge-${stageTone[trackedStage]}`}>
                      {trackedComplaint.status || lifecycleStages[0]}
                    </span>
                  </div>
                  <div className="cdp-track-progress">
                    {lifecycleStages.map((stage, index) => (
                      <div className="cdp-track-progress-item" key={stage}>
                        <div
                          className={`cdp-track-progress-dot ${index < trackedStage ? "done" : index === trackedStage ? "current" : "pending"}`}
                        >
                          {index < trackedStage ? "✓" : index + 1}
                        </div>
                        <span>{stage}</span>
                      </div>
                    ))}
                  </div>
                  <div className="cdp-track-details">
                    <div><span>Category</span><strong>{trackedComplaint.category || "—"}</strong></div>
                    <div><span>Specific Issue</span><strong>{trackedComplaint.issueType || trackedComplaint.issue || "—"}</strong></div>
                    <div><span>Department</span><strong>{trackedComplaint.department || "—"}</strong></div>
                    <div><span>Location</span><strong>{trackedComplaint.location || "—"}</strong></div>
                    <div>
                      <span>Date Registered</span>
                      <strong>{trackedComplaint.createdAt ? new Date(trackedComplaint.createdAt).toLocaleDateString("en-IN") : "—"}</strong>
                    </div>
                    <div><span>Description</span><strong>{trackedComplaint.description || "—"}</strong></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* MY REPORTED ISSUES */}
          <div className="cdp-dash-grid" id="my-activity">
            <div className="cdp-panel">
              <div className="cdp-panel-head">
                <h3>My Reported Issues</h3>
                <span className="cdp-panel-link">{complaints.length} total</span>
              </div>
              <div className="cdp-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Complaint</th>
                      <th>Category</th>
                      <th>Location</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {complaintsLoading && complaints.length === 0 && (
                      <tr className="cdp-empty-row"><td colSpan={6} className="cdp-empty-cell">Loading complaints...</td></tr>
                    )}
                    {!complaintsLoading && complaints.length === 0 && (
                      <tr className="cdp-empty-row"><td colSpan={6} className="cdp-empty-cell">No complaints found.</td></tr>
                    )}
                    {complaints.map((c) => (
                      <React.Fragment key={c.id}>
                        <tr className={selectedId === c.id ? "cdp-row-active" : ""} onClick={() => setSelectedId(c.id)}>
                          <td className="cdp-mono">{c.complaintNumber}</td>
                          <td>
                            <div className="cdp-cat">
                              <span className="cdp-cat-dot" style={{ background: colorForCategory(c.category) }}></span>
                              {c.issue}
                            </div>
                          </td>
                          <td>{c.location || "Location pending"}</td>
                          <td><span className={`cdp-badge cdp-badge-${stageTone[c.stage]}`}>{lifecycleStages[c.stage]}</span></td>
                          <td className="cdp-mono">{c.date}</td>
                          <td onClick={(e) => e.stopPropagation()}>
                            <div className="cdp-row-actions">
                              <button className="cdp-icon-btn small" type="button" onClick={() => startEdit(c)} title="Update" aria-label="Update complaint">
                                <Icons.Edit />
                              </button>
                              {c.stage === 0 && (
                                <button className="cdp-icon-btn small danger" type="button" onClick={() => setConfirmDeleteId(c.id)} title="Delete" aria-label="Delete complaint">
                                  <Icons.Delete />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                        {editingId === c.id && (
                          <tr className="cdp-edit-row">
                            <td colSpan={6}>
                              <div className="cdp-edit-block">
                                <input type="text" value={editLocation} onChange={(e) => setEditLocation(e.target.value)} placeholder="Location" />
                                <textarea rows="2" value={editText} onChange={(e) => setEditText(e.target.value)} />
                                <div className="cdp-edit-actions">
                                  <button className="cdp-btn-outline" type="button" onClick={() => setEditingId(null)}>Cancel</button>
                                  <button className="cdp-btn-primary small" type="button" onClick={() => saveEdit(c.id)}>Save</button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                        {confirmDeleteId === c.id && (
                          <tr className="cdp-edit-row">
                            <td colSpan={6}>
                              <div className="cdp-delete-confirm">
                                <span>Delete this complaint?</span>
                                <div>
                                  <button className="cdp-btn-outline small" type="button" onClick={() => setConfirmDeleteId(null)}>No</button>
                                  <button className="cdp-btn-danger small" type="button" onClick={() => handleDelete(c.id)}>Yes, Delete</button>
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

            {/* LIFECYCLE + NOTIFICATIONS */}
            <div className="cdp-side-col">
              <div className="cdp-panel">
                <div className="cdp-panel-head">
                  <h3>Complaint Lifecycle</h3>
                  <span className="cdp-mono cdp-faint">{selectedComplaint?.complaintNumber || "No complaint selected"}</span>
                </div>
                {selectedComplaint && (
                  <>
                    <p className="cdp-lifecycle-location">📍 {selectedComplaint.location || "Location pending"}</p>
                    <div className="cdp-lifecycle">
                      {lifecycleStages.map((stage, i) => (
                        <div className="cdp-lc-item" key={i}>
                          <div className={`cdp-lc-dot ${i < selectedComplaint.stage ? "done" : i === selectedComplaint.stage ? "now" : "pend"}`}></div>
                          <div className="cdp-lc-body"><b>{stage}</b></div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="cdp-panel" id="notif-panel">
                <div className="cdp-panel-head">
                  <h3>Notifications</h3>
                  <span className="cdp-panel-link">Mark all read</span>
                </div>
                <div className="cdp-notif-list">
                  {notifications.map((note, i) => (
                    <div className="cdp-notif-item" key={i}>
                      <span className="cdp-notif-dot"></span>
                      <div>
                        <b>{note.text}</b>
                        <span>{note.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* QUICK REGISTER FORM (optional) */}
          {showNewForm && (
            <div className="cdp-panel cdp-form-panel">
              <div className="cdp-panel-head"><h3>Quick Register a New Issue</h3></div>
              <form className="cdp-new-form" onSubmit={handleCreateComplaint}>
                <div className="cdp-form-row">
                  <div className="cdp-field">
                    <label htmlFor="new-category">Category</label>
                    <input id="new-category" type="text" placeholder="e.g. Road Issues" value={newComplaint.category} onChange={(e) => setNewComplaint({ ...newComplaint, category: e.target.value })} required />
                  </div>
                  <div className="cdp-field">
                    <label htmlFor="new-issue">Specific Issue</label>
                    <input id="new-issue" type="text" placeholder="e.g. Road Potholes" value={newComplaint.issue} onChange={(e) => setNewComplaint({ ...newComplaint, issue: e.target.value })} />
                  </div>
                </div>
                <div className="cdp-form-row">
                  <div className="cdp-field">
                    <label htmlFor="new-location">Location</label>
                    <input id="new-location" type="text" placeholder="Street, landmark or ward" value={newComplaint.location} onChange={(e) => setNewComplaint({ ...newComplaint, location: e.target.value })} />
                  </div>
                  <div className="cdp-field">
                    <label htmlFor="new-gps">Capture GPS</label>
                    <div className="cdp-gps-row">
                      <input id="new-gps" type="text" placeholder="Not captured yet" value={newComplaint.gps} readOnly />
                      <button className="cdp-btn-outline small" type="button" onClick={captureGps} disabled={gpsBusy}>
                        {gpsBusy ? "Locating…" : "📍 Capture"}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="cdp-field">
                  <label htmlFor="new-description">Description</label>
                  <textarea id="new-description" rows="3" placeholder="Describe the issue" value={newComplaint.description} onChange={(e) => setNewComplaint({ ...newComplaint, description: e.target.value })} required />
                </div>
                <div className="cdp-field">
                  <label htmlFor="new-photo">Upload Photo</label>
                  <label className="cdp-photo-upload">
                    {newComplaint.photo ? `📷 ${newComplaint.photo}` : "📷 Click to attach a photo"}
                    <input id="new-photo" type="file" accept="image/*" onChange={(e) => setNewComplaint({ ...newComplaint, photo: e.target.files?.[0]?.name || "" })} />
                  </label>
                </div>
                <div className="cdp-form-actions">
                  <button className="cdp-btn-outline" type="button" onClick={() => setShowNewForm(false)}>Cancel</button>
                  <button className="cdp-btn-primary" type="submit">Submit Complaint →</button>
                </div>
              </form>
            </div>
          )}

          {/* ISSUES MAP */}
          {showMapView && (
            <div className="cdp-panel cdp-form-panel" id="map-section">
              <div className="cdp-panel-head">
                <h3>Reported Issues Near {profile.ward}</h3>
                <span className="cdp-panel-link cdp-clickable" onClick={() => setShowMapView(false)}>Hide Map View</span>
              </div>
              <div className="cdp-map-grid">
                {Object.entries(mapGroups).map(([loc, items]) => (
                  <div className="cdp-map-ward-card" key={loc}>
                    <p className="cdp-map-ward-name">{loc}</p>
                    <div className="cdp-map-pins">
                      {items.map((c) => (
                        <span className="cdp-map-pin" key={c.id} style={{ background: colorForCategory(c.category) }} title={`${c.complaintNumber} — ${c.category}`}>📍</span>
                      ))}
                    </div>
                    <span className="cdp-map-ward-count">{items.length} issue{items.length !== 1 ? "s" : ""} reported</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* QUICK ACTIONS */}
          <div className="cdp-quick-row">
            <button className="cdp-quick-card" type="button" onClick={goToReportIssue}>
              <div className="cdp-quick-ic navy">📍</div>
              <div><h5>Report a New Issue</h5><p>Photo, location & description</p></div>
            </button>
            <button className="cdp-quick-card" type="button" onClick={() => scrollTo("track-complaint")}>
              <div className="cdp-quick-ic saffron">🔍</div>
              <div><h5>Track a Complaint</h5><p>Check status by complaint ID</p></div>
            </button>
            <button className="cdp-quick-card" type="button" onClick={() => { setShowMapView(true); setTimeout(() => scrollTo("map-section"), 50); }}>
              <div className="cdp-quick-ic green">🗺️</div>
              <div><h5>View Issues Map</h5><p>See reports near your ward</p></div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CitizenDashboard;