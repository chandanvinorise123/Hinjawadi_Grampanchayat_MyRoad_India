import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./citizendashboard.css";

// import VisitorsOverview from "../components/dashboard/VisitorsOverview";

const API_URL = "http://localhost:3200/api/complaints";

const lifecycleStages = [
  "Complaint Registered",
  "Complaint Verified",
  "Assigned to Staff/Officer",
  "Action Initiated",
  "Work Completed",
  "Verification",
  "Complaint Closed",
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
    hash =
      category.charCodeAt(i) +
      ((hash << 5) - hash);
  }

  return mapColors[Math.abs(hash) % mapColors.length];
};

const notifications = [
  {
    text: "Complaint MRI-482913 has moved to Work Completed",
    time: "2 hours ago",
  },
  {
    text: "Complaint MRI-291045 was assigned to a field officer",
    time: "1 day ago",
  },
  {
    text: "Complaint MRI-773820 has been registered",
    time: "3 days ago",
  },
];

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
  const normalized = String(status || "")
    .trim()
    .toLowerCase();

  const statusMap = {
    registered: 0,
    "complaint registered": 0,
    pending: 0,

    verified: 1,
    "complaint verified": 1,

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

    closed: 6,
    resolved: 6,
    "complaint closed": 6,
  };

  return statusMap[normalized] ?? 0;
};

const CitizenDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Logged-in user
  const stored = JSON.parse(
    localStorage.getItem("user") || "{}"
  );

  const [profile] = useState({
    name: stored.name || "Citizen User",
    mobile: stored.mobile
      ? `+91 ${stored.mobile}`
      : "+91 98765 43210",
    memberSince: "March 2026",
    ward: stored.location || "Ward 3 — Riverside",
  });

  const [complaints, setComplaints] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] =
    useState(null);

  const [showNewForm, setShowNewForm] = useState(false);
  const [showMapView, setShowMapView] = useState(false);
  const [gpsBusy, setGpsBusy] = useState(false);

  // Track Complaint state
  const [trackId, setTrackId] = useState("");
  const [trackedComplaint, setTrackedComplaint] =
    useState(null);
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

  // ---------------- FETCH MY COMPLAINTS ----------------
  const fetchMyComplaints = async () => {
    const user = JSON.parse(
      localStorage.getItem("user") || "{}"
    );
    const citizenId = user.id || user._id;

    if (!citizenId) {
      console.error("Citizen ID not found");
      setComplaints([]);
      setSelectedId(null);
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/my/${encodeURIComponent(citizenId)}`
      );
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to load complaints"
        );
      }

      const formattedComplaints = (result.data || []).map((c) => ({
        ...c,
        id: String(c.id || c._id),
        complaintNumber: c.complaintNumber || c._id || c.id,
        issue: c.issue || c.issueType || "General Issue",
        location: c.location || "Location pending",
        date:
          c.date ||
          (c.createdAt
            ? new Date(c.createdAt).toISOString().slice(0, 10)
            : ""),
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
    }
  };

  const selectedComplaint =
    complaints.find((c) => c.id === selectedId) ||
    complaints[0];

  const overviewStats = [
    {
      label: "Total Complaints",
      value: complaints.length,
      icon: "📋",
      tone: "navy",
    },
    {
      label: "Pending",
      value: complaints.filter((c) => c.stage <= 1).length,
      icon: "⏳",
      tone: "amber",
    },
    {
      label: "Under Action",
      value: complaints.filter(
        (c) => c.stage > 1 && c.stage < 6
      ).length,
      icon: "🧰",
      tone: "orange",
    },
    {
      label: "Closed",
      value: complaints.filter((c) => c.stage === 6).length,
      icon: "✅",
      tone: "green",
    },
  ];

  const mapGroups = complaints.reduce((groups, c) => {
    const key = c.location || "Location pending";

    if (!groups[key]) {
      groups[key] = [];
    }

    groups[key].push(c);
    return groups;
  }, {});

  // ---------------- TRACK COMPLAINT ----------------
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
      const response = await fetch(
        `${API_URL}/track/${encodeURIComponent(
          complaintId
        )}`
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Complaint not found. Please check the ID."
        );
      }

      if (!result.data) {
        throw new Error(
          "No complaint details were returned by the server."
        );
      }

      setTrackedComplaint(result.data);
    } catch (error) {
      setTrackError(
        error.message ||
          "Unable to track complaint. Please try again."
      );
    } finally {
      setTrackLoading(false);
    }
  };

  // ---------------- CREATE ----------------
  const handleCreateComplaint = (e) => {
    e.preventDefault();

    if (
      !newComplaint.category.trim() ||
      !newComplaint.description.trim()
    ) {
      return;
    }

    const complaint = {
      id: Date.now(),
      complaintNumber: `MRI-${Math.floor(
        100000 + Math.random() * 900000
      )}`,
      category: newComplaint.category,
      issue: newComplaint.issue || "General Issue",
      location:
        newComplaint.location || "Location pending",
      description: newComplaint.description,
      photo: newComplaint.photo,
      gps: newComplaint.gps,
      date: new Date().toISOString().slice(0, 10),
      stage: 0,
    };

    setComplaints((prev) => [complaint, ...prev]);
    setSelectedId(complaint.id);

    setNewComplaint({
      category: "",
      issue: "",
      location: "",
      description: "",
      photo: "",
      gps: "",
    });

    setShowNewForm(false);
  };

  // ---------------- GPS ----------------
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
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  };

  // ---------------- UPDATE ----------------
  const startEdit = (complaint) => {
    setEditingId(complaint.id);
    setEditText(complaint.description);
    setEditLocation(complaint.location || "");
  };

  const saveEdit = async (id) => {
    const user = JSON.parse(
      localStorage.getItem("user") || "{}"
    );
    const citizenId = user.id || user._id;

    if (!citizenId) {
      alert("Please log in again.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          citizenId,
          location: editLocation,
          description: editText,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to update complaint"
        );
      }

      await fetchMyComplaints();
      setEditingId(null);
      alert("Complaint updated successfully");
    } catch (error) {
      alert(error.message || "Failed to update complaint");
    }
  };

  // ---------------- DELETE ----------------
  const handleDelete = async (id) => {
    const user = JSON.parse(
      localStorage.getItem("user") || "{}"
    );
    const citizenId = user.id || user._id;

    if (!citizenId) {
      alert("Please log in again.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ citizenId }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to delete complaint"
        );
      }

      setConfirmDeleteId(null);
      await fetchMyComplaints();
      alert("Complaint deleted successfully");
    } catch (error) {
      alert(error.message || "Failed to delete complaint");
    }
  };

  const scrollTo = (id) => {
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth" });
  };

  // Load complaints from MongoDB when the dashboard opens
  useEffect(() => {
    fetchMyComplaints();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sidebar links from Profile page
  useEffect(() => {
    const s = location.state;

    if (!s) return;

    if (s.openForm) {
      setShowNewForm(true);
    }

    if (s.openMap) {
      setShowMapView(true);
    }

    if (s.scrollTo) {
      setTimeout(() => scrollTo(s.scrollTo), 50);
    }

    navigate(location.pathname, {
      replace: true,
      state: null,
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const initials = profile.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const trackedStage = trackedComplaint
    ? getStageFromStatus(trackedComplaint.status)
    : 0;

  return (
    <div className="cd-shell">
      {/* ============ SIDEBAR ============ */}
      <aside className="cd-sidebar">
        <div className="cd-sb-brand">
          <div className="cd-sb-logo">MI</div>

          <div>
            <b>MyRoad India</b>
            <span>Citizen Portal</span>
          </div>
        </div>

        <div className="cd-sb-label">Overview</div>

        <nav className="cd-sb-nav">
          <button
            type="button"
            className="cd-sb-link active"
            onClick={() => scrollTo("cd-top")}
          >
            📊 Dashboard
          </button>

          <button
            type="button"
            className="cd-sb-link"
            onClick={() => navigate("/profile")}
          >
            👤 My Profile
          </button>
        </nav>

        <div className="cd-sb-label">
          Citizen Functions
        </div>

        <nav className="cd-sb-nav">
          <button
            type="button"
            className="cd-sb-link"
            onClick={() => navigate("/ReportIssue")}
          >
            📍 Report an Issue
          </button>

          <button
            type="button"
            className="cd-sb-link"
            onClick={() => scrollTo("track-complaint")}
          >
            🔍 Track Complaint
          </button>

          <button
            type="button"
            className="cd-sb-link"
            onClick={() => {
              setShowMapView(true);
              setTimeout(() => scrollTo("map-section"), 50);
            }}
          >
            🗺️ Issues Map
          </button>

          <button
            type="button"
            className="cd-sb-link"
            onClick={() => scrollTo("my-activity")}
          >
            📋 My Complaints
            <span className="cd-sb-badge">
              {complaints.length}
            </span>
          </button>
        </nav>

        <div className="cd-sb-label">Activity</div>

        <nav className="cd-sb-nav">
          <button
            type="button"
            className="cd-sb-link"
            onClick={() => scrollTo("notif-panel")}
          >
            🔔 Notifications
            <span className="cd-sb-badge">
              {notifications.length}
            </span>
          </button>

          <button
            type="button"
            className="cd-sb-link"
            onClick={() => scrollTo("my-activity")}
          >
            🕘 Recent Activity
          </button>
        </nav>

        <div className="cd-sb-footer">
          <div className="cd-sb-user">
            <div className="cd-sb-avatar">
              {initials}
            </div>

            <div className="cd-sb-user-info">
              <b>{profile.name}</b>
              <span>{profile.mobile}</span>
            </div>
          </div>

          <div className="cd-sb-ward">
            {profile.ward} · Member since{" "}
            {profile.memberSince}
          </div>
        </div>
      </aside>

      {/* ============ MAIN AREA ============ */}
      <div className="cd-main" id="cd-top">
        {/* TOPBAR */}
        <div className="cd-topbar">
          <div className="cd-search">
            🔍
            <input
              type="text"
              placeholder="Search your complaints..."
            />
          </div>

          <div className="cd-tb-actions">
            <button
              type="button"
              className="cd-icon-btn"
              aria-label="Notifications"
              onClick={() => scrollTo("notif-panel")}
            >
              🔔
              <span className="cd-tb-dot"></span>
            </button>

            <button
              className="cd-btn-primary"
              type="button"
              onClick={() => navigate("/ReportIssue")}
            >
              + Report an Issue
            </button>

            <div
              className="cd-tb-user"
              onClick={() => navigate("/profile")}
              style={{ cursor: "pointer" }}
            >
              <div className="cd-tb-avatar">
                {initials}
              </div>

              <div>
                <b>{profile.name}</b>
                <span>Citizen Account</span>
              </div>
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div className="cd-content">
          <div className="cd-title-row">
            <div>
              <h1>
                Welcome back, {profile.name.split(" ")[0]}
              </h1>

              <p>
                {profile.ward} · Member since{" "}
                {profile.memberSince}
              </p>
            </div>
          </div>

          {/* DASHBOARD STATS */}
          <div className="cd-stats-row">
            {overviewStats.map((stat, i) => (
              <div
                className={`cd-stat-card tone-${stat.tone}`}
                key={i}
              >
                <div className="cd-stat-ic">
                  {stat.icon}
                </div>

                <div className="cd-stat-num">
                  {stat.value}
                </div>

                <div className="cd-stat-label">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* TRACK COMPLAINT */}
          <div
            className="cd-panel cd-track-panel"
            id="track-complaint"
          >
            <div className="cd-panel-head">
              <div>
                <h3>Track Your Complaint</h3>
                <p>
                  Enter your complaint ID to check its
                  latest status.
                </p>
              </div>
            </div>

            <form
              className="cd-track-form"
              onSubmit={handleTrackComplaint}
            >
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

              <button
                type="submit"
                className="cd-btn-primary"
                disabled={trackLoading}
              >
                {trackLoading
                  ? "Tracking..."
                  : "Track Complaint"}
              </button>
            </form>

            {trackError && (
              <div
                className="cd-track-error"
                role="alert"
              >
                {trackError}
              </div>
            )}

            {trackedComplaint && (
              <div className="cd-track-result">
                <div className="cd-track-result-header">
                  <div>
                    <span className="cd-track-label">
                      Complaint ID
                    </span>

                    <h4>
                      {trackedComplaint.complaintNumber ||
                        trackedComplaint._id}
                    </h4>
                  </div>

                  <span
                    className={`cd-badge cd-badge-${
                      stageTone[trackedStage]
                    }`}
                  >
                    {trackedComplaint.status ||
                      lifecycleStages[0]}
                  </span>
                </div>

                {/* Complaint progress */}
                <div className="cd-track-progress">
                  {lifecycleStages.map((stage, index) => (
                    <div
                      className="cd-track-progress-item"
                      key={stage}
                    >
                      <div
                        className={`cd-track-progress-dot ${
                          index < trackedStage
                            ? "done"
                            : index === trackedStage
                            ? "current"
                            : "pending"
                        }`}
                      >
                        {index < trackedStage ? "✓" : index + 1}
                      </div>

                      <span>{stage}</span>
                    </div>
                  ))}
                </div>

                <div className="cd-track-details">
                  <div>
                    <span>Category</span>
                    <strong>
                      {trackedComplaint.category || "—"}
                    </strong>
                  </div>

                  <div>
                    <span>Specific Issue</span>
                    <strong>
                      {trackedComplaint.issueType || "—"}
                    </strong>
                  </div>

                  <div>
                    <span>Department</span>
                    <strong>
                      {trackedComplaint.department || "—"}
                    </strong>
                  </div>

                  <div>
                    <span>Location</span>
                    <strong>
                      {trackedComplaint.location || "—"}
                    </strong>
                  </div>

                  <div>
                    <span>Date Registered</span>
                    <strong>
                      {trackedComplaint.createdAt
                        ? new Date(
                            trackedComplaint.createdAt
                          ).toLocaleDateString("en-IN")
                        : "—"}
                    </strong>
                  </div>

                  <div>
                    <span>Description</span>
                    <strong>
                      {trackedComplaint.description || "—"}
                    </strong>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* MY REPORTED ISSUES */}
          <div
            className="cd-dash-grid"
            id="my-activity"
          >
            <div className="cd-panel">
              <div className="cd-panel-head">
                <h3>My Reported Issues</h3>
                <span className="cd-panel-link">
                  {complaints.length} total
                </span>
              </div>

              <div className="cd-table-wrap">
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
                    {complaints.map((c) => (
                      <React.Fragment key={c.id}>
                        <tr
                          className={
                            selectedId === c.id
                              ? "cd-row-active"
                              : ""
                          }
                          onClick={() =>
                            setSelectedId(c.id)
                          }
                        >
                          <td className="cd-mono">
                            {c.complaintNumber}
                          </td>

                          <td>
                            <div className="cd-cat">
                              <span
                                className="cd-cat-dot"
                                style={{
                                  background: colorForCategory(
                                    c.category
                                  ),
                                }}
                              ></span>
                              {c.issue}
                            </div>
                          </td>

                          <td>
                            {c.location ||
                              "Location pending"}
                          </td>

                          <td>
                            <span
                              className={`cd-badge cd-badge-${
                                stageTone[c.stage]
                              }`}
                            >
                              {lifecycleStages[c.stage]}
                            </span>
                          </td>

                          <td className="cd-mono">
                            {c.date}
                          </td>

                          <td
                            onClick={(e) =>
                              e.stopPropagation()
                            }
                          >
                            <div className="cd-row-actions">
                              <button
                                className="cd-icon-btn small"
                                type="button"
                                onClick={() => startEdit(c)}
                                title="Update"
                              >
                                ✏️
                              </button>

                              {c.stage === 0 && (
                                <button
                                  className="cd-icon-btn small danger"
                                  type="button"
                                  onClick={() =>
                                    setConfirmDeleteId(c.id)
                                  }
                                  title="Delete"
                                >
                                  🗑️
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {editingId === c.id && (
                          <tr className="cd-edit-row">
                            <td colSpan={6}>
                              <div className="cd-edit-block">
                                <input
                                  type="text"
                                  value={editLocation}
                                  onChange={(e) =>
                                    setEditLocation(
                                      e.target.value
                                    )
                                  }
                                  placeholder="Location"
                                />

                                <textarea
                                  rows="2"
                                  value={editText}
                                  onChange={(e) =>
                                    setEditText(e.target.value)
                                  }
                                />

                                <div className="cd-edit-actions">
                                  <button
                                    className="cd-btn-outline"
                                    type="button"
                                    onClick={() =>
                                      setEditingId(null)
                                    }
                                  >
                                    Cancel
                                  </button>

                                  <button
                                    className="cd-btn-primary small"
                                    type="button"
                                    onClick={() =>
                                      saveEdit(c.id)
                                    }
                                  >
                                    Save
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}

                        {confirmDeleteId === c.id && (
                          <tr className="cd-edit-row">
                            <td colSpan={6}>
                              <div className="cd-delete-confirm">
                                <span>
                                  Delete this complaint?
                                </span>

                                <div>
                                  <button
                                    className="cd-btn-outline small"
                                    type="button"
                                    onClick={() =>
                                      setConfirmDeleteId(null)
                                    }
                                  >
                                    No
                                  </button>

                                  <button
                                    className="cd-btn-danger small"
                                    type="button"
                                    onClick={() =>
                                      handleDelete(c.id)
                                    }
                                  >
                                    Yes, Delete
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

            {/* LIFECYCLE + NOTIFICATIONS */}
            <div className="cd-side-col">
              <div className="cd-panel">
                <div className="cd-panel-head">
                  <h3>Complaint Lifecycle</h3>

                  <span className="cd-mono cd-faint">
                    {selectedComplaint?.complaintNumber ||
                      "No complaint selected"}
                  </span>
                </div>

                {selectedComplaint && (
                  <>
                    <p className="cd-lifecycle-location">
                      📍{" "}
                      {selectedComplaint.location ||
                        "Location pending"}
                    </p>

                    <div className="cd-lifecycle">
                      {lifecycleStages.map(
                        (stage, i) => (
                          <div
                            className="cd-lc-item"
                            key={i}
                          >
                            <div
                              className={`cd-lc-dot ${
                                i < selectedComplaint.stage
                                  ? "done"
                                  : i ===
                                    selectedComplaint.stage
                                  ? "now"
                                  : "pend"
                              }`}
                            ></div>

                            <div className="cd-lc-body">
                              <b>{stage}</b>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </>
                )}
              </div>

              <div
                className="cd-panel"
                id="notif-panel"
              >
                <div className="cd-panel-head">
                  <h3>Notifications</h3>
                  <span className="cd-panel-link">
                    Mark all read
                  </span>
                </div>

                <div className="cd-notif-list">
                  {notifications.map((note, i) => (
                    <div
                      className="cd-notif-item"
                      key={i}
                    >
                      <span className="cd-notif-dot"></span>

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

          {/* NEW COMPLAINT FORM */}
          {showNewForm && (
            <div className="cd-panel cd-form-panel">
              <div className="cd-panel-head">
                <h3>Register a New Issue</h3>
              </div>

              <form
                className="cd-new-form"
                onSubmit={handleCreateComplaint}
              >
                <div className="cd-form-row">
                  <div className="cd-field">
                    <label htmlFor="new-category">
                      Category
                    </label>

                    <input
                      id="new-category"
                      type="text"
                      placeholder="e.g. Road Issues"
                      value={newComplaint.category}
                      onChange={(e) =>
                        setNewComplaint({
                          ...newComplaint,
                          category: e.target.value,
                        })
                      }
                      required
                    />
                  </div>

                  <div className="cd-field">
                    <label htmlFor="new-issue">
                      Specific Issue
                    </label>

                    <input
                      id="new-issue"
                      type="text"
                      placeholder="e.g. Road Potholes"
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

                <div className="cd-form-row">
                  <div className="cd-field">
                    <label htmlFor="new-location">
                      Location
                    </label>

                    <input
                      id="new-location"
                      type="text"
                      placeholder="Street, landmark or ward"
                      value={newComplaint.location}
                      onChange={(e) =>
                        setNewComplaint({
                          ...newComplaint,
                          location: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="cd-field">
                    <label htmlFor="new-gps">
                      Capture GPS
                    </label>

                    <div className="cd-gps-row">
                      <input
                        id="new-gps"
                        type="text"
                        placeholder="Not captured yet"
                        value={newComplaint.gps}
                        readOnly
                      />

                      <button
                        className="cd-btn-outline small"
                        type="button"
                        onClick={captureGps}
                        disabled={gpsBusy}
                      >
                        {gpsBusy
                          ? "Locating…"
                          : "📍 Capture"}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="cd-field">
                  <label htmlFor="new-description">
                    Description
                  </label>

                  <textarea
                    id="new-description"
                    rows="3"
                    placeholder="Describe the issue"
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

                <div className="cd-field">
                  <label htmlFor="new-photo">
                    Upload Photo
                  </label>

                  <label className="cd-photo-upload">
                    {newComplaint.photo
                      ? `📷 ${newComplaint.photo}`
                      : "📷 Click to attach a photo"}

                    <input
                      id="new-photo"
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        setNewComplaint({
                          ...newComplaint,
                          photo:
                            e.target.files?.[0]?.name || "",
                        })
                      }
                    />
                  </label>
                </div>

                <div className="cd-form-actions">
                  <button
                    className="cd-btn-outline"
                    type="button"
                    onClick={() => setShowNewForm(false)}
                  >
                    Cancel
                  </button>

                  <button
                    className="cd-btn-primary"
                    type="submit"
                  >
                    Submit Complaint →
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ISSUES MAP */}
          {showMapView && (
            <div
              className="cd-panel cd-form-panel"
              id="map-section"
            >
              <div className="cd-panel-head">
                <h3>
                  Reported Issues Near {profile.ward}
                </h3>

                <span
                  className="cd-panel-link"
                  onClick={() => setShowMapView(false)}
                  style={{ cursor: "pointer" }}
                >
                  Hide Map View
                </span>
              </div>

              <div className="cd-map-grid">
                {Object.entries(mapGroups).map(
                  ([location, items]) => (
                    <div
                      className="cd-map-ward-card"
                      key={location}
                    >
                      <p className="cd-map-ward-name">
                        {location}
                      </p>

                      <div className="cd-map-pins">
                        {items.map((c) => (
                          <span
                            className="cd-map-pin"
                            key={c.id}
                            style={{
                              background: colorForCategory(
                                c.category
                              ),
                            }}
                            title={`${c.complaintNumber} — ${c.category}`}
                          >
                            📍
                          </span>
                        ))}
                      </div>

                      <span className="cd-map-ward-count">
                        {items.length} issue
                        {items.length !== 1 ? "s" : ""}{" "}
                        reported
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {/* QUICK ACTIONS */}
          <div className="cd-quick-row">
            <button
              className="cd-quick-card"
              type="button"
              onClick={() => navigate("/ReportIssue")}
            >
              <div className="cd-quick-ic navy">
                📍
              </div>

              <div>
                <h5>Report a New Issue</h5>
                <p>Photo, location & description</p>
              </div>
            </button>

            <button
              className="cd-quick-card"
              type="button"
              onClick={() => scrollTo("track-complaint")}
            >
              <div className="cd-quick-ic saffron">
                🔍
              </div>

              <div>
                <h5>Track a Complaint</h5>
                <p>Check status by complaint ID</p>
              </div>
            </button>

            <button
              className="cd-quick-card"
              type="button"
              onClick={() => {
                setShowMapView(true);
                setTimeout(
                  () => scrollTo("map-section"),
                  50
                );
              }}
            >
              <div className="cd-quick-ic green">
                🗺️
              </div>

              <div>
                <h5>View Issues Map</h5>
                <p>See reports near your ward</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CitizenDashboard;