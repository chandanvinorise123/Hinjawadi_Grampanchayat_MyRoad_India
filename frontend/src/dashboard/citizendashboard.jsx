import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "./citizendashboard.css";
import logo from "../assets/logo.jpeg";

import MyProfile from "../Citizenprofiledashboard/MyProfile";
import MyComplaints from "../Citizenprofiledashboard/MyComplaints";
import TrackComplaint from "../Citizenprofiledashboard/TrackComplaint";
import ComplaintsDetails from "../Citizenprofiledashboard/ComplaintsDetails";
import IssueMap from "../Citizenprofiledashboard/IssueMap";
import Notifications from "../Citizenprofiledashboard/Notifications";
import RecentActivity from "../Citizenprofiledashboard/RecentActivity";
import UpdatedComplaints from "../adminprofiledashboard/UpdatedComplaints";
import {
  API_BASE_URL,
  markDashboardNotificationRead,
} from "../utils/dashboardApi";

const API_URL = `${API_BASE_URL}/complaints`;
const REPORT_ROUTE = "/reportissue";

const lifecycleStageKeys = [
  "citizenDashboard.lifecycle.registered",
  "citizenDashboard.lifecycle.verified",
  "citizenDashboard.lifecycle.assigned",
  "citizenDashboard.lifecycle.action",
  "citizenDashboard.lifecycle.completed",
  "citizenDashboard.lifecycle.verification",
  "citizenDashboard.lifecycle.closed",
];

const mapColors = [
  "#e07b1c",
  "#2e6cb0",
  "#1d8a5c",
  "#c1900a",
  "#cf4438",
  "#7a5c9e",
];

const colorForCategory = (category = "") => {
  let hash = 0;

  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }

  return mapColors[Math.abs(hash) % mapColors.length];
};

const stageTone = [
  "amber",
  "amber",
  "orange",
  "orange",
  "orange",
  "amber",
  "green",
];

const getStageFromStatus = (status) => {
  const normalized = String(status || "").trim().toLowerCase();

  const statusMap = {
    registered: 0,
    new: 0,
    "complaint registered": 0,
    pending: 0,
    submitted: 0,
    "under review": 0,

    verified: 1,
    "complaint verified": 1,
    "under verification": 1,

    assigned: 2,
    "assigned to staff/officer": 2,
    "assigned to staff": 2,
    "assigned to officer": 2,

    "action initiated": 3,
    "in progress": 3,
    "under action": 3,

    "work completed": 4,
    completed: 4,

    verification: 5,
    "awaiting verification": 5,
    resolved: 5,

    closed: 6,
    "complaint closed": 6,
  };

  return statusMap[normalized] ?? 0;
};

/* Safely read JSON responses */
const readJsonResponse = async (response) => {
  const text = await response.text();

  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch (error) {
    console.error("API returned non-JSON response:", text);

    throw new Error(
      `Server returned an invalid response (${response.status}).`
    );
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
   SVG ICONS
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

  Logout: () => (
    <svg width="18" height="18" {...svgProps}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
};

const CitizenDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const stored = getStoredUser();

  // ---------------- STATE VARIABLES ----------------

  const [profile, setProfile] = useState({
    name: stored.name || "",
    mobile: stored.mobile ? `+91 ${stored.mobile}` : "",
    memberSince: stored.createdAt
      ? new Date(stored.createdAt).toLocaleDateString()
      : "",
    ward: stored.location || stored.address || "",
    profilePhoto: stored.profilePhoto || "",
  });

  const [complaints, setComplaints] = useState([]);
  const [notifications, setNotifications] = useState([]);
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
    category: "",
    issue: "",
    location: "",
    description: "",
    photo: "",
    gps: "",
  });

  // Page visibility states

  const [showProfile, setShowProfile] = useState(false);
  const [showMyComplaints, setShowMyComplaints] = useState(false);
  const [showUpdatedComplaints, setShowUpdatedComplaints] = useState(false);
  const [showTrackComplaint, setShowTrackComplaint] = useState(false);
  const [initialTrackComplaintNumber, setInitialTrackComplaintNumber] =
    useState("");
  const [showComplaintDetails, setShowComplaintDetails] = useState(false);
  const [showIssueMap, setShowIssueMap] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showRecentActivity, setShowRecentActivity] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  // Sidebar: "All Complaints" group open/closed
  const [complaintsOpen, setComplaintsOpen] = useState(true);

  // Authentication headers

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");

    return {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    };
  };

  const openView = (setter) => {
    setShowProfile(false);
    setShowMyComplaints(false);
    setShowUpdatedComplaints(false);
    setShowTrackComplaint(false);
    setShowComplaintDetails(false);
    setShowIssueMap(false);
    setShowNotifications(false);
    setShowRecentActivity(false);

    setter(true);
  };

  // ---------------- HANDLERS ----------------

  const goToReportIssue = () => {
    navigate(REPORT_ROUTE);
  };

  const handleLogout = () => {
    if (window.confirm(t("citizenDashboard.confirmLogout"))) {
      localStorage.removeItem("user");
      window.dispatchEvent(new Event("authChange"));
      navigate("/login");
    }
  };

  const fetchMyComplaints = async ({ silent = false } = {}) => {
    const user = getStoredUser();
    const citizenId = getCitizenId(user);

    if (!citizenId) {
      if (!silent) {
        setComplaints([]);
        setSelectedId(null);
      }

      setComplaintsError(t("citizenDashboard.citizenInfoMissing"));
      return;
    }

    if (!silent) setComplaintsLoading(true);

    setComplaintsError("");

    const requestUrl = `${API_URL}/my/${encodeURIComponent(
      String(citizenId)
    )}`;

    try {
      const response = await fetch(requestUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
          ...getAuthHeaders(),
        },
      });

      const result = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(
          result.message ||
            `Failed to load complaints. Server returned ${response.status}.`
        );
      }

      if (!result.success) {
        throw new Error(
          result.message || t("citizenDashboard.failedLoadComplaints")
        );
      }

      const formattedComplaints = (
        Array.isArray(result.data) ? result.data : []
      ).map((c) => ({
        ...c,
        id: String(c.id || c._id),
        complaintNumber: c.complaintNumber || c._id || c.id || "Unknown",
        issue: c.issue || c.issueType || "General Issue",
        issueType: c.issueType || c.issue || "General Issue",
        location: c.location || "Location pending",
        description: c.description || "",
        date:
          c.date ||
          (c.createdAt ? new Date(c.createdAt).toISOString().slice(0, 10) : ""),
        stage: getStageFromStatus(c.status),
      }));

      setComplaints(formattedComplaints);

      setSelectedId((currentId) => {
        if (
          currentId &&
          formattedComplaints.some((c) => c.id === currentId)
        ) {
          return currentId;
        }

        return formattedComplaints[0]?.id ?? null;
      });
    } catch (error) {
      console.error("Fetch complaints error:", error);

      if (!silent) {
        setComplaints([]);
        setSelectedId(null);
      }

      setComplaintsError(
        error.message || t("citizenDashboard.unableLoadComplaints")
      );
    } finally {
      if (!silent) setComplaintsLoading(false);
    }
  };

  const handleTrackComplaint = async (e) => {
    e.preventDefault();

    const complaintId = trackId.trim();

    if (!complaintId) {
      setTrackError(t("citizenDashboard.pleaseEnterComplaintId"));
      setTrackedComplaint(null);
      return;
    }

    setTrackLoading(true);
    setTrackError("");
    setTrackedComplaint(null);

    try {
      const requestUrl = `${API_URL}/track/${encodeURIComponent(
        complaintId
      )}`;

      const response = await fetch(requestUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
          ...getAuthHeaders(),
        },
      });

      const result = await readJsonResponse(response);

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || t("citizenDashboard.complaintNotFound")
        );
      }

      if (!result.data) {
        throw new Error(t("citizenDashboard.noComplaintDetails"));
      }

      setTrackedComplaint(result.data);
    } catch (error) {
      console.error("Track complaint error:", error);

      setTrackError(error.message || t("citizenDashboard.unableTrack"));
    } finally {
      setTrackLoading(false);
    }
  };

  const handleCreateComplaint = async (e) => {
    e.preventDefault();

    if (
      !newComplaint.category.trim() ||
      !newComplaint.description.trim()
    ) {
      return;
    }

    const user = getStoredUser();
    const citizenId = getCitizenId(user);
    const citizenName = user.name;
    const mobile = String(user.mobile || user.contact || "")
      .replace(/\D/g, "")
      .slice(-10);

    const [latitude, longitude] = newComplaint.gps.split(",").map(Number);

    if (!citizenId || !citizenName) {
      alert(t("citizenDashboard.loginBeforeSubmit"));
      return;
    }

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      alert(t("citizenDashboard.validMobile"));
      return;
    }

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      alert(t("citizenDashboard.captureLocation"));
      return;
    }

    if (!newComplaint.photo) {
      alert(t("citizenDashboard.uploadComplaintPhoto"));
      return;
    }

    try {
      const body = new FormData();

      body.append("citizenId", citizenId);
      body.append("citizenName", citizenName);
      body.append("mobile", mobile);
      body.append("category", newComplaint.category.trim());
      body.append(
        "issueType",
        newComplaint.issue.trim() || "General Issue"
      );
      body.append("description", newComplaint.description.trim());

      body.append(
        "location",
        newComplaint.location.trim() ||
          `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
      );

      body.append(
        "coordinates",
        JSON.stringify({ latitude, longitude })
      );

      if (newComplaint.photo) {
        body.append("images", newComplaint.photo);
      }

      const response = await fetch(API_URL, {
        method: "POST",
        body,
      });

      const result = await readJsonResponse(response);

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || t("citizenDashboard.failedRegister")
        );
      }

      await fetchMyComplaints();

      const dashboardResponse = await fetch(
        `${API_BASE_URL}/dashboard/citizen?userId=${encodeURIComponent(
          citizenId
        )}`,
        {
          headers: getAuthHeaders(),
        }
      );

      const dashboardResult = await dashboardResponse.json();

      if (dashboardResponse.ok && dashboardResult.success) {
        setNotifications(dashboardResult.notifications || []);
      }

      setNewComplaint({
        category: "",
        issue: "",
        location: "",
        description: "",
        photo: "",
        gps: "",
      });

      setShowNewForm(false);
    } catch (error) {
      console.error("Create complaint error:", error);

      alert(error.message || t("citizenDashboard.unableRegister"));
    }
  };

  const captureGps = () => {
    if (!navigator.geolocation) {
      alert(t("citizenDashboard.geolocationUnsupported"));
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
        alert(t("citizenDashboard.unableGetLocation"));
        setGpsBusy(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
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

    if (!citizenId) {
      alert(t("citizenDashboard.pleaseLogin"));
      return;
    }

    if (!editText.trim()) {
      alert(t("citizenDashboard.descriptionEmpty"));
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/${encodeURIComponent(id)}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            citizenId,
            location: editLocation.trim(),
            description: editText.trim(),
          }),
        }
      );

      const result = await readJsonResponse(response);

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || t("citizenDashboard.failedUpdate")
        );
      }

      await fetchMyComplaints();
      setEditingId(null);

      alert(t("citizenDashboard.updatedSuccessfully"));
    } catch (error) {
      console.error("Update complaint error:", error);

      alert(error.message || t("citizenDashboard.failedUpdate"));
    }
  };

  const handleDelete = async (id) => {
    const user = getStoredUser();
    const citizenId = getCitizenId(user);

    if (!citizenId) {
      alert(t("citizenDashboard.pleaseLogin"));
      return false;
    }

    try {
      const response = await fetch(
        `${API_URL}/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ citizenId }),
        }
      );

      const result = await readJsonResponse(response);

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || t("citizenDashboard.failedDelete")
        );
      }

      setConfirmDeleteId(null);
      await fetchMyComplaints();

      alert(t("citizenDashboard.deletedSuccessfully"));

      return true;
    } catch (error) {
      console.error("Delete complaint error:", error);

      alert(error.message || t("citizenDashboard.failedDelete"));

      return false;
    }
  };

  const markAllNotificationsRead = async () => {
    const unreadNotifications = notifications.filter(
      (notification) => !notification.isRead && notification.id
    );

    if (!unreadNotifications.length) return;

    try {
      await Promise.all(
        unreadNotifications.map((notification) =>
          markDashboardNotificationRead(notification.id)
        )
      );

      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          isRead: true,
        }))
      );
    } catch (error) {
      console.error("Mark notifications read error:", error);

      alert(error.message || t("citizenDashboard.unableMarkRead"));
    }
  };

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
    });
  };

  // ---------------- EFFECTS ----------------

  useEffect(() => {
    fetchMyComplaints();

    const refreshTimer = window.setInterval(
      () => fetchMyComplaints({ silent: true }),
      30000
    );

    return () => window.clearInterval(refreshTimer);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const citizenId = getCitizenId(getStoredUser());

    if (!citizenId) return;

    let active = true;

    const loadCitizenDashboard = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/dashboard/citizen?userId=${encodeURIComponent(
            citizenId
          )}`,
          {
            headers: getAuthHeaders(),
          }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message ||
              t("citizenDashboard.failedLoadNotifications")
          );
        }

        if (!active) return;

        setNotifications(result.notifications || []);

        if (result.profile) {
          setProfile((current) => ({
            ...current,
            ...result.profile,
            mobile: result.profile.mobile
              ? `+91 ${result.profile.mobile}`
              : current.mobile,
            ward:
              result.profile.location ||
              result.profile.address ||
              current.ward,
            profilePhoto:
              result.profile.profilePhoto || current.profilePhoto,
          }));
        }
      } catch (error) {
        if (active) {
          console.error("Fetch citizen dashboard error:", error);
        }
      }
    };

    loadCitizenDashboard();

    const refreshTimer = window.setInterval(
      loadCitizenDashboard,
      30000
    );

    return () => {
      active = false;
      window.clearInterval(refreshTimer);
    };
  }, []);

  useEffect(() => {
    const s = location.state;

    if (!s) return;

    if (s.openForm) setShowNewForm(true);

    if (s.openTrack) {
      setInitialTrackComplaintNumber(s.trackComplaintNumber || "");
      setShowTrackComplaint(true);
    }

    if (s.openMap) setShowMapView(true);

    if (s.scrollTo) {
      setTimeout(() => scrollTo(s.scrollTo), 50);
    }

    navigate(location.pathname, {
      replace: true,
      state: null,
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  // ---------------- DERIVED VALUES ----------------

  const selectedComplaint =
    complaints.find((c) => c.id === selectedId) || complaints[0];

  const initials = profile.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const trackedStage = trackedComplaint
    ? getStageFromStatus(trackedComplaint.status)
    : 0;

  const overviewStats = [
    {
      label: t("citizenDashboard.totalComplaints"),
      value: complaints.length,
      icon: "📋",
      tone: "navy",
    },
    {
      label: t("citizenDashboard.pending"),
      value: complaints.filter((c) => c.stage <= 1).length,
      icon: "⏳",
      tone: "amber",
    },
    {
      label: t("citizenDashboard.underProcess"),
      value: complaints.filter((c) => c.stage > 1 && c.stage < 5).length,
      icon: "🧰",
      tone: "orange",
    },
    {
      label: t("citizenDashboard.resolved"),
      value: complaints.filter((c) => c.stage === 5).length,
      icon: "✅",
      tone: "green",
    },
    {
      label: t("citizenDashboard.closed"),
      value: complaints.filter((c) => c.stage === 6).length,
      icon: "📁",
      tone: "navy",
    },
  ];

  // Sidebar: every complaint-related tab lives inside one "All Complaints" group
  const complaintTabs = [
    {
      key: "report",
      Icon: Icons.Report,
      label: t("citizenDashboard.reportIssue"),
      onClick: goToReportIssue,
    },
    {
      key: "my-complaints",
      Icon: Icons.Complaints,
      label: t("citizenDashboard.myComplaints"),
      onClick: () => openView(setShowMyComplaints),
      badge: complaints.length,
    },
    {
      key: "updated",
      Icon: Icons.Details,
      label: t("citizenDashboard.updatedComplaints"),
      onClick: () => openView(setShowUpdatedComplaints),
    },
    {
      key: "track",
      Icon: Icons.Track,
      label: t("citizenDashboard.trackComplaint"),
      onClick: () => {
        setInitialTrackComplaintNumber("");
        openView(setShowTrackComplaint);
      },
    },
    {
      key: "details",
      Icon: Icons.Details,
      label: t("citizenDashboard.complaintDetails"),
      onClick: () => openView(setShowComplaintDetails),
    },
    {
      key: "map",
      Icon: Icons.Map,
      label: t("citizenDashboard.issuesMap"),
      onClick: () => openView(setShowIssueMap),
    },
  ];

  const mapGroups = complaints.reduce((groups, c) => {
    const key = c.location || "Location pending";

    if (!groups[key]) groups[key] = [];

    groups[key].push(c);

    return groups;
  }, {});

  // ---------------- CONDITIONAL RENDERING ----------------

  // Sub-pages are rendered INSIDE the shell (next to the sidebar) instead of
  // replacing the whole screen, so the blue sidebar stays on every page.
  let activeView = null;
  let activeKey = "dashboard";

  if (showProfile) {
    activeKey = "profile";
    activeView = <MyProfile onBack={() => setShowProfile(false)} />;
  } else if (showMyComplaints) {
    activeKey = "myComplaints";
    activeView = (
      <MyComplaints
        complaints={complaints}
        onBack={() => setShowMyComplaints(false)}
        onDelete={handleDelete}
      />
    );
  } else if (showUpdatedComplaints) {
    activeKey = "updatedComplaints";
    activeView = (
      <UpdatedComplaints
        complaints={complaints}
        actorRoles={["staff", "admin", "verifier"]}
        audienceLabel={t("citizenDashboard.staffAdminVerifierActivity")}
        listTitle={t("citizenDashboard.staffAdminVerifierUpdates")}
        showUpdateHistory={false}
        onBack={() => setShowUpdatedComplaints(false)}
      />
    );
  } else if (showTrackComplaint) {
    activeKey = "trackComplaint";
    activeView = (
      <TrackComplaint
        onBack={() => setShowTrackComplaint(false)}
        initialComplaintId={initialTrackComplaintNumber}
      />
    );
  } else if (showComplaintDetails) {
    activeKey = "complaintDetails";
    activeView = (
      <ComplaintsDetails
        complaints={complaints}
        onBack={() => setShowComplaintDetails(false)}
      />
    );
  } else if (showIssueMap) {
    activeKey = "issueMap";
    activeView = (
      <IssueMap
        complaints={complaints}
        onBack={() => setShowIssueMap(false)}
      />
    );
  } else if (showNotifications) {
    activeKey = "notifications";
    activeView = <Notifications onBack={() => setShowNotifications(false)} />;
  } else if (showRecentActivity) {
    activeKey = "recentActivity";
    activeView = <RecentActivity onBack={() => setShowRecentActivity(false)} />;
  }

  // ---------------- MAIN DASHBOARD ----------------

  return (
    <div className="cdp-shell">
      {/* SIDEBAR */}
      <aside className="cdp-sidebar">
        <div className="cdp-sb-brand">
          <div className="cdp-sb-logo">
            {logoFailed ? (
              "MI"
            ) : (
              <img
                src={logo}
                alt={t("citizenDashboard.brand")}
                className="cdp-sb-logo-img"
                onError={() => setLogoFailed(true)}
              />
            )}
          </div>

          <div>
            <b>{t("citizenDashboard.brand")}</b>
            <span>{t("citizenDashboard.portal")}</span>
          </div>
        </div>

        <div className="cdp-sb-label">
          {t("citizenDashboard.overview")}
        </div>

        <nav className="cdp-sb-nav">
          <button
            type="button"
            className={`cdp-sb-link ${activeKey === "dashboard" ? "active" : ""}`}
            onClick={() => {
              if (activeView) {
                openView(() => {});
              } else {
                scrollTo("cdp-top");
              }
            }}
          >
            <span className="cdp-sb-ic"><Icons.Dashboard /></span>
            <span className="cdp-sb-text">
              {t("citizenDashboard.dashboard")}
            </span>
          </button>

          <button
            type="button"
            className={`cdp-sb-link ${activeKey === "profile" ? "active" : ""}`}
            onClick={() => openView(setShowProfile)}
          >
            <span className="cdp-sb-ic"><Icons.Profile /></span>
            <span className="cdp-sb-text">
              {t("citizenDashboard.myProfile")}
            </span>
          </button>
        </nav>

        <div className="cdp-sb-label">
          {t("citizenDashboard.citizenFunctions")}
        </div>

        <nav className="cdp-sb-nav">
          <div className={`cdp-sb-group ${complaintsOpen ? "open" : ""}`}>
            <button
              type="button"
              className="cdp-sb-link cdp-sb-group-toggle"
              onClick={() => setComplaintsOpen((open) => !open)}
              aria-expanded={complaintsOpen}
            >
              <span className="cdp-sb-ic"><Icons.Complaints /></span>
              <span className="cdp-sb-text">
                {t("citizenDashboard.allComplaints", {
                  defaultValue: "All Complaints",
                })}
              </span>
              <span className="cdp-sb-badge">{complaints.length}</span>
              <span className="cdp-sb-chevron" aria-hidden="true">▾</span>
            </button>

            <div className="cdp-sb-sub">
              <div className="cdp-sb-sub-inner">
                {complaintTabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    className={`cdp-sb-link cdp-sb-sublink ${
                      {
                        "my-complaints": "myComplaints",
                        updated: "updatedComplaints",
                        track: "trackComplaint",
                        details: "complaintDetails",
                        map: "issueMap",
                      }[tab.key] === activeKey
                        ? "active"
                        : ""
                    }`}
                    onClick={tab.onClick}
                  >
                    <span className="cdp-sb-ic"><tab.Icon /></span>
                    <span className="cdp-sb-text">{tab.label}</span>
                    {tab.badge !== undefined && (
                      <span className="cdp-sb-badge">{tab.badge}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </nav>

        <div className="cdp-sb-label">
          {t("citizenDashboard.activity")}
        </div>

        <nav className="cdp-sb-nav">
          <button
            type="button"
            className={`cdp-sb-link ${activeKey === "notifications" ? "active" : ""}`}
            onClick={() => openView(setShowNotifications)}
          >
            <span className="cdp-sb-ic"><Icons.Bell /></span>
            <span className="cdp-sb-text">
              {t("citizenDashboard.notifications")}
            </span>
            <span className="cdp-sb-badge">{notifications.length}</span>
          </button>

          <button
            type="button"
            className={`cdp-sb-link ${activeKey === "recentActivity" ? "active" : ""}`}
            onClick={() => openView(setShowRecentActivity)}
          >
            <span className="cdp-sb-ic"><Icons.Clock /></span>
            <span className="cdp-sb-text">
              {t("citizenDashboard.recentActivity")}
            </span>
          </button>

          <button
            type="button"
            className="cdp-sb-link"
            onClick={handleLogout}
            style={{
              color: "var(--red, #d13438)",
              marginTop: "8px",
            }}
          >
            <span className="cdp-sb-ic"><Icons.Logout /></span>
            <span className="cdp-sb-text">
              {t("citizenDashboard.logout")}
            </span>
          </button>
        </nav>

        <div className="cdp-sb-footer">
          <div className="cdp-sb-user">
            <div className="cdp-sb-avatar">
              {profile.profilePhoto ? (
                <img
                  src={profile.profilePhoto}
                  alt={t("citizenDashboard.myProfile")}
                />
              ) : (
                initials
              )}
            </div>

            <div className="cdp-sb-user-info">
              <b>{profile.name}</b>
              <span>{profile.mobile}</span>
            </div>
          </div>

          <div className="cdp-sb-ward">
            {profile.ward} · {t("citizenDashboard.memberSince")}{" "}
            {profile.memberSince}
          </div>
        </div>
      </aside>

      {/* MAIN AREA */}
      {activeView ? (
        <div className="cdp-main cdp-main-subview">{activeView}</div>
      ) : (
      <div className="cdp-main cdp-home" id="cdp-top">
        {/* TOPBAR */}
        <div className="cdp-topbar">
          <div className="cdp-search">
            <Icons.Search />

            <input
              type="text"
              placeholder={t("citizenDashboard.searchPlaceholder")}
              aria-label={t("citizenDashboard.searchComplaints")}
            />
          </div>

          <div className="cdp-tb-actions">
            <button
              type="button"
              className="cdp-icon-btn"
              aria-label={t("citizenDashboard.notifications")}
              onClick={() => openView(setShowNotifications)}
            >
              <Icons.Bell />
              <span className="cdp-tb-dot"></span>
            </button>

            <div
              className="cdp-tb-user"
              onClick={() => openView(setShowProfile)}
            >
              <div className="cdp-tb-avatar">
                {profile.profilePhoto ? (
                  <img
                    src={profile.profilePhoto}
                    alt={t("citizenDashboard.myProfile")}
                  />
                ) : (
                  initials
                )}
              </div>

              <div>
                <b>{profile.name}</b>
                <span>{t("citizenDashboard.citizenAccount")}</span>
              </div>
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div className="cdp-content">
          <div className="cdp-title-row">
            <h1>
              {t("citizenDashboard.welcomeBack", {
                name: profile.name.split(" ")[0],
              })}
            </h1>

            <p>
              {profile.ward} · {t("citizenDashboard.memberSince")}{" "}
              {profile.memberSince}
            </p>
          </div>

          {/* DASHBOARD STAT CARDS */}
          <div className="cdp-stats-row">
            {overviewStats.map((stat, i) => (
              <div
                className={`cdp-stat-card tone-${stat.tone}`}
                key={i}
              >
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
                  <strong>
                    {t("citizenDashboard.unableLoadComplaints")}
                  </strong>
                  <p>{complaintsError}</p>
                </div>

                <button
                  type="button"
                  className="cdp-btn-primary"
                  onClick={fetchMyComplaints}
                  disabled={complaintsLoading}
                >
                  {complaintsLoading
                    ? t("citizenDashboard.loading")
                    : t("citizenDashboard.retry")}
                </button>
              </div>
            </div>
          )}

          {/* TRACK COMPLAINT */}
          <div
            className="cdp-panel cdp-track-panel"
            id="track-complaint"
          >
            <div className="cdp-panel-head">
              <div>
                <h3>{t("citizenDashboard.trackYourComplaint")}</h3>
                <p>{t("citizenDashboard.enterLatestStatus")}</p>
              </div>
            </div>

            <div className="cdp-track-body">
              <form
                className="cdp-track-form"
                onSubmit={handleTrackComplaint}
              >
                <input
                  type="text"
                  value={trackId}
                  onChange={(e) => {
                    setTrackId(e.target.value);
                    setTrackError("");
                  }}
                  placeholder={t("citizenDashboard.enterComplaintId")}
                  aria-label={t("citizenDashboard.complaintId")}
                  required
                />

                <button
                  type="submit"
                  className="cdp-btn-primary"
                  disabled={trackLoading}
                >
                  {trackLoading
                    ? t("citizenDashboard.tracking")
                    : t("citizenDashboard.trackComplaint")}
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
                      <span className="cdp-track-label">
                        {t("citizenDashboard.complaintId")}
                      </span>
                      <h4>
                        {trackedComplaint.complaintNumber ||
                          trackedComplaint._id}
                      </h4>
                    </div>

                    <span
                      className={`cdp-badge cdp-badge-${stageTone[trackedStage]}`}
                    >
                      {trackedComplaint.status ||
                        t(lifecycleStageKeys[0])}
                    </span>
                  </div>

                  <div className="cdp-track-progress">
                    {lifecycleStageKeys.map((stageKey, index) => (
                      <div
                        className="cdp-track-progress-item"
                        key={stageKey}
                      >
                        <div
                          className={`cdp-track-progress-dot ${
                            index < trackedStage
                              ? "done"
                              : index === trackedStage
                                ? "current"
                                : "pending"
                          }`}
                        >
                          {index < trackedStage ? "✓" : index + 1}
                        </div>

                        <span>{t(stageKey)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="cdp-track-details">
                    <div>
                      <span>{t("citizenDashboard.category")}</span>
                      <strong>{trackedComplaint.category || "—"}</strong>
                    </div>

                    <div>
                      <span>{t("citizenDashboard.specificIssue")}</span>
                      <strong>
                        {trackedComplaint.issueType ||
                          trackedComplaint.issue ||
                          "—"}
                      </strong>
                    </div>

                    <div>
                      <span>{t("citizenDashboard.department")}</span>
                      <strong>{trackedComplaint.department || "—"}</strong>
                    </div>

                    <div>
                      <span>{t("citizenDashboard.location")}</span>
                      <strong>{trackedComplaint.location || "—"}</strong>
                    </div>

                    <div>
                      <span>{t("citizenDashboard.dateRegistered")}</span>
                      <strong>
                        {trackedComplaint.createdAt
                          ? new Date(
                              trackedComplaint.createdAt
                            ).toLocaleDateString("en-IN")
                          : "—"}
                      </strong>
                    </div>

                    <div>
                      <span>{t("citizenDashboard.description")}</span>
                      <strong>
                        {trackedComplaint.description || "—"}
                      </strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* MY REPORTED ISSUES */}
          <div className="cdp-dash-grid" id="my-activity">
            <div className="cdp-panel">
              <div className="cdp-panel-head">
                <h3>{t("citizenDashboard.myReportedIssues")}</h3>

                <span className="cdp-panel-link">
                  {t("citizenDashboard.total", {
                    count: complaints.length,
                  })}
                </span>
              </div>

              <div className="cdp-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{t("citizenDashboard.complaint")}</th>
                      <th>{t("citizenDashboard.category")}</th>
                      <th>{t("citizenDashboard.location")}</th>
                      <th>{t("citizenDashboard.status")}</th>
                      <th>{t("citizenDashboard.date")}</th>
                      <th></th>
                    </tr>
                  </thead>

                  <tbody>
                    {complaintsLoading && complaints.length === 0 && (
                      <tr className="cdp-empty-row">
                        <td colSpan={6} className="cdp-empty-cell">
                          {t("citizenDashboard.loadingComplaints")}
                        </td>
                      </tr>
                    )}

                    {!complaintsLoading && complaints.length === 0 && (
                      <tr className="cdp-empty-row">
                        <td colSpan={6} className="cdp-empty-cell">
                          {t("citizenDashboard.noComplaintsFound")}
                        </td>
                      </tr>
                    )}

                    {complaints.map((c) => (
                      <React.Fragment key={c.id}>
                        <tr
                          className={
                            selectedId === c.id ? "cdp-row-active" : ""
                          }
                          onClick={() => setSelectedId(c.id)}
                        >
                          <td className="cdp-mono">{c.complaintNumber}</td>

                          <td>
                            <div className="cdp-cat">
                              <span
                                className="cdp-cat-dot"
                                style={{
                                  background: colorForCategory(c.category),
                                }}
                              ></span>

                              {c.issue}
                            </div>
                          </td>

                          <td>
                            {c.location ||
                              t("citizenDashboard.locationPending")}
                          </td>

                          <td>
                            <span
                              className={`cdp-badge cdp-badge-${stageTone[c.stage]}`}
                            >
                              {t(lifecycleStageKeys[c.stage])}
                            </span>
                          </td>

                          <td className="cdp-mono">{c.date}</td>

                          <td onClick={(e) => e.stopPropagation()}>
                            <div className="cdp-row-actions">
                              <button
                                className="cdp-icon-btn small"
                                type="button"
                                onClick={() => startEdit(c)}
                                title={t("citizenDashboard.update")}
                                aria-label={t(
                                  "citizenDashboard.updateComplaint"
                                )}
                              >
                                <Icons.Edit />
                              </button>

                              {c.stage === 0 && (
                                <button
                                  className="cdp-icon-btn small danger"
                                  type="button"
                                  onClick={() =>
                                    setConfirmDeleteId(c.id)
                                  }
                                  title={t("citizenDashboard.delete")}
                                  aria-label={t(
                                    "citizenDashboard.deleteComplaint"
                                  )}
                                >
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
                                <input
                                  type="text"
                                  value={editLocation}
                                  onChange={(e) =>
                                    setEditLocation(e.target.value)
                                  }
                                  placeholder={t(
                                    "citizenDashboard.location"
                                  )}
                                />

                                <textarea
                                  rows="2"
                                  value={editText}
                                  onChange={(e) =>
                                    setEditText(e.target.value)
                                  }
                                />

                                <div className="cdp-edit-actions">
                                  <button
                                    className="cdp-btn-outline"
                                    type="button"
                                    onClick={() => setEditingId(null)}
                                  >
                                    {t("citizenDashboard.cancel")}
                                  </button>

                                  <button
                                    className="cdp-btn-primary small"
                                    type="button"
                                    onClick={() => saveEdit(c.id)}
                                  >
                                    {t("citizenDashboard.save")}
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}

                        {confirmDeleteId === c.id && (
                          <tr className="cdp-edit-row">
                            <td colSpan={6}>
                              <div className="cdp-delete-confirm">
                                <span>
                                  {t(
                                    "citizenDashboard.deleteThisComplaint"
                                  )}
                                </span>

                                <div>
                                  <button
                                    className="cdp-btn-outline small"
                                    type="button"
                                    onClick={() =>
                                      setConfirmDeleteId(null)
                                    }
                                  >
                                    {t("citizenDashboard.no")}
                                  </button>

                                  <button
                                    className="cdp-btn-danger small"
                                    type="button"
                                    onClick={() => handleDelete(c.id)}
                                  >
                                    {t("citizenDashboard.yesDelete")}
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

            {/* LIFECYCLE AND NOTIFICATIONS */}
            <div className="cdp-side-col">
              <div className="cdp-panel">
                <div className="cdp-panel-head">
                  <h3>{t("citizenDashboard.complaintLifecycle")}</h3>

                  <span className="cdp-mono cdp-faint">
                    {selectedComplaint?.complaintNumber ||
                      t("citizenDashboard.noComplaintSelected")}
                  </span>
                </div>

                {selectedComplaint && (
                  <>
                    <p className="cdp-lifecycle-location">
                      📍{" "}
                      {selectedComplaint.location ||
                        t("citizenDashboard.locationPending")}
                    </p>

                    <div className="cdp-lifecycle">
                      {lifecycleStageKeys.map((stageKey, i) => (
                        <div className="cdp-lc-item" key={i}>
                          <div
                            className={`cdp-lc-dot ${
                              i < selectedComplaint.stage
                                ? "done"
                                : i === selectedComplaint.stage
                                  ? "now"
                                  : "pend"
                            }`}
                          ></div>

                          <div className="cdp-lc-body">
                            <b>{t(stageKey)}</b>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="cdp-panel" id="notif-panel">
                <div className="cdp-panel-head">
                  <h3>{t("citizenDashboard.notifications")}</h3>

                  <button
                    type="button"
                    className="cdp-panel-link"
                    onClick={markAllNotificationsRead}
                  >
                    {t("citizenDashboard.markAllRead")}
                  </button>
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

          {/* QUICK REGISTER FORM */}
          {showNewForm && (
            <div className="cdp-panel cdp-form-panel">
              <div className="cdp-panel-head">
                <h3>{t("citizenDashboard.quickRegister")}</h3>
              </div>

              <form
                className="cdp-new-form"
                onSubmit={handleCreateComplaint}
              >
                <div className="cdp-form-row">
                  <div className="cdp-field">
                    <label htmlFor="new-category">
                      {t("citizenDashboard.category")}
                    </label>

                    <select
                      id="new-category"
                      value={newComplaint.category}
                      onChange={(e) =>
                        setNewComplaint({
                          ...newComplaint,
                          category: e.target.value,
                        })
                      }
                      required
                    >
                      <option value="">
                        {t("citizenDashboard.selectCategory")}
                      </option>

                      <option value="Road Issues">
                        {t("citizenDashboard.roadIssues")}
                      </option>

                      <option value="Sewerage & Drain Issues">
                        {t("citizenDashboard.sewerageIssues")}
                      </option>

                      <option value="Drinking Water Issues">
                        {t("citizenDashboard.drinkingWaterIssues")}
                      </option>

                      <option value="Streetlight Issues">
                        {t("citizenDashboard.streetlightIssues")}
                      </option>

                      <option value="Road Safety Issues">
                        {t("citizenDashboard.roadSafetyIssues")}
                      </option>

                      <option value="Bridge & Culvert Issues">
                        {t("citizenDashboard.bridgeCulvertIssues")}
                      </option>
                    </select>
                  </div>

                  <div className="cdp-field">
                    <label htmlFor="new-issue">
                      {t("citizenDashboard.specificIssue")}
                    </label>

                    <input
                      id="new-issue"
                      type="text"
                      placeholder={t(
                        "citizenDashboard.issueExamplePlaceholder"
                      )}
                      value={newComplaint.issue}
                      onChange={(e) =>
                        setNewComplaint({
                          ...newComplaint,
                          issue: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="cdp-form-row">
                  <div className="cdp-field">
                    <label htmlFor="new-location">
                      {t("citizenDashboard.location")}
                    </label>

                    <input
                      id="new-location"
                      type="text"
                      placeholder={t(
                        "citizenDashboard.streetLandmarkWard"
                      )}
                      value={newComplaint.location}
                      onChange={(e) =>
                        setNewComplaint({
                          ...newComplaint,
                          location: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="cdp-field">
                    <label htmlFor="new-gps">
                      {t("citizenDashboard.captureGps")}
                    </label>

                    <div className="cdp-gps-row">
                      <input
                        id="new-gps"
                        type="text"
                        placeholder={t(
                          "citizenDashboard.notCapturedYet"
                        )}
                        value={newComplaint.gps}
                        readOnly
                      />

                      <button
                        className="cdp-btn-outline small"
                        type="button"
                        onClick={captureGps}
                        disabled={gpsBusy}
                      >
                        {gpsBusy
                          ? t("citizenDashboard.locating")
                          : `📍 ${t("citizenDashboard.capture")}`}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="cdp-field">
                  <label htmlFor="new-description">
                    {t("citizenDashboard.description")}
                  </label>

                  <textarea
                    id="new-description"
                    rows="3"
                    placeholder={t("citizenDashboard.describeIssue")}
                    value={newComplaint.description}
                    onChange={(e) =>
                      setNewComplaint({
                        ...newComplaint,
                        description: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div className="cdp-field">
                  <label htmlFor="new-photo">
                    {t("citizenDashboard.uploadPhoto")}
                  </label>

                  <label className="cdp-photo-upload">
                    {newComplaint.photo
                      ? `📷 ${newComplaint.photo.name}`
                      : `📷 ${t("citizenDashboard.clickToAttachPhoto")}`}

                    <input
                      id="new-photo"
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        setNewComplaint({
                          ...newComplaint,
                          photo: e.target.files?.[0] || "",
                        })
                      }
                    />
                  </label>
                </div>

                <div className="cdp-form-actions">
                  <button
                    className="cdp-btn-outline"
                    type="button"
                    onClick={() => setShowNewForm(false)}
                  >
                    {t("citizenDashboard.cancel")}
                  </button>

                  <button
                    className="cdp-btn-primary"
                    type="submit"
                  >
                    {t("citizenDashboard.submitComplaint")}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ISSUES MAP */}
          {showMapView && (
            <div
              className="cdp-panel cdp-form-panel"
              id="map-section"
            >
              <div className="cdp-panel-head">
                <h3>
                  {t("citizenDashboard.reportedIssuesNear", {
                    ward: profile.ward,
                  })}
                </h3>

                <span
                  className="cdp-panel-link cdp-clickable"
                  onClick={() => setShowMapView(false)}
                >
                  {t("citizenDashboard.hideMap")}
                </span>
              </div>

              <div className="cdp-map-grid">
                {Object.entries(mapGroups).map(([loc, items]) => (
                  <div className="cdp-map-ward-card" key={loc}>
                    <p className="cdp-map-ward-name">{loc}</p>

                    <div className="cdp-map-pins">
                      {items.map((c) => (
                        <span
                          className="cdp-map-pin"
                          key={c.id}
                          style={{
                            background: colorForCategory(c.category),
                          }}
                          title={`${c.complaintNumber} — ${c.category}`}
                        >
                          📍
                        </span>
                      ))}
                    </div>

                    <span className="cdp-map-ward-count">
                      {t("citizenDashboard.issuesReported", {
                        count: items.length,
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* QUICK ACTIONS */}
          <div className="cdp-quick-row">
            <button
              className="cdp-quick-card"
              type="button"
              onClick={goToReportIssue}
            >
              <div className="cdp-quick-ic navy">📍</div>

              <div>
                <h5>{t("citizenDashboard.reportNewIssue")}</h5>
                <p>
                  {t("citizenDashboard.photoLocationDescription")}
                </p>
              </div>
            </button>

            <button
              className="cdp-quick-card"
              type="button"
              onClick={() => scrollTo("track-complaint")}
            >
              <div className="cdp-quick-ic saffron">🔍</div>

              <div>
                <h5>{t("citizenDashboard.trackComplaintQuick")}</h5>
                <p>{t("citizenDashboard.checkStatusById")}</p>
              </div>
            </button>

            <button
              className="cdp-quick-card"
              type="button"
              onClick={() => {
                setShowMapView(true);
                setTimeout(() => scrollTo("map-section"), 50);
              }}
            >
              <div className="cdp-quick-ic green">🗺️</div>

              <div>
                <h5>{t("citizenDashboard.viewIssuesMap")}</h5>
                <p>{t("citizenDashboard.seeReportsNearWard")}</p>
              </div>
            </button>
          </div>
        </div>
      </div>
      )}
    </div>
  );
  };

export default CitizenDashboard;