import React, { useState } from "react";
import "./citizendashboard.css";

const lifecycleStages = [
  "Complaint Registered",
  "Complaint Verified",
  "Assigned to Staff/Officer",
  "Action Initiated",
  "Work Completed",
  "Verification",
  "Complaint Closed",
];

// Deterministic color per category so free-text categories still get a
// consistent pin color on the Issues Map.
const mapColors = ["#e07b1c", "#2e6cb0", "#1d8a5c", "#c1900a", "#cf4438", "#7a5c9e"];
const colorForCategory = (category) => {
  let hash = 0;
  for (let i = 0; i < category.length; i++) hash = category.charCodeAt(i) + ((hash << 5) - hash);
  return mapColors[Math.abs(hash) % mapColors.length];
};

const seedComplaints = [
  {
    id: 1,
    complaintNumber: "MRI-482913",
    category: "Road Issues",
    issue: "Road Potholes",
    location: "Camp Road Bus Stop",
    description: "Large pothole near the bus stop causing traffic slowdown.",
    date: "2026-08-12",
    stage: 4,
  },
  {
    id: 2,
    complaintNumber: "MRI-291045",
    category: "Streetlight Issues",
    issue: "Light Not Working",
    location: "House No. 21, Riverside Lane",
    description: "Streetlight outside house no. 21 has been off for a week.",
    date: "2026-08-25",
    stage: 2,
  },
  {
    id: 3,
    complaintNumber: "MRI-773820",
    category: "Drinking Water Issues",
    issue: "Low Water Pressure",
    location: "Riverside Ward Pipeline",
    description: "Very low water pressure every morning in the ward.",
    date: "2026-09-01",
    stage: 0,
  },
];

const notifications = [
  { text: "Complaint MRI-482913 has moved to Work Completed", time: "2 hours ago" },
  { text: "Complaint MRI-291045 was assigned to a field officer", time: "1 day ago" },
  { text: "Complaint MRI-773820 has been registered", time: "3 days ago" },
];

const CitizenDashboard = () => {
  const [profile] = useState({
    name: "Citizen User",
    mobile: "+91 98765 43210",
    memberSince: "March 2026",
    ward: "Ward 3 — Riverside",
  });

  const [complaints, setComplaints] = useState(seedComplaints);
  const [selectedId, setSelectedId] = useState(seedComplaints[0].id);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [showMapView, setShowMapView] = useState(false);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [newComplaint, setNewComplaint] = useState({
    category: "",
    issue: "",
    location: "",
    description: "",
    photo: "",
    gps: "",
  });

  const selectedComplaint = complaints.find((c) => c.id === selectedId) || complaints[0];

  const overviewStats = [
    { label: "Total Complaints", value: complaints.length, icon: "📋", tone: "navy" },
    { label: "Pending", value: complaints.filter((c) => c.stage <= 1).length, icon: "⏳", tone: "amber" },
    { label: "Under Action", value: complaints.filter((c) => c.stage > 1 && c.stage < 6).length, icon: "🧰", tone: "orange" },
    { label: "Closed", value: complaints.filter((c) => c.stage === 6).length, icon: "✅", tone: "green" },
  ];

  // Group complaints by location for the Issues Map.
  const mapGroups = complaints.reduce((groups, c) => {
    const key = c.location || "Location pending";
    if (!groups[key]) groups[key] = [];
    groups[key].push(c);
    return groups;
  }, {});

  // ---------------- CREATE ----------------
  const handleCreateComplaint = (e) => {
    e.preventDefault();
    if (!newComplaint.category.trim() || !newComplaint.description.trim()) return;
    const complaint = {
      id: Date.now(),
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
    setComplaints([complaint, ...complaints]);
    setSelectedId(complaint.id);
    setNewComplaint({ category: "", issue: "", location: "", description: "", photo: "", gps: "" });
    setShowNewForm(false);
  };

  const captureGps = () => {
    setGpsBusy(true);
    setTimeout(() => {
      setNewComplaint((prev) => ({ ...prev, gps: "18.5993° N, 73.7629° E" }));
      setGpsBusy(false);
    }, 700);
  };

  // ---------------- UPDATE ----------------
  const startEdit = (complaint) => {
    setEditingId(complaint.id);
    setEditText(complaint.description);
    setEditLocation(complaint.location || "");
  };

  const saveEdit = (id) => {
    setComplaints(
      complaints.map((c) => (c.id === id ? { ...c, description: editText, location: editLocation } : c))
    );
    setEditingId(null);
  };

  // ---------------- DELETE ----------------
  const handleDelete = (id) => {
    setComplaints(complaints.filter((c) => c.id !== id));
    setConfirmDeleteId(null);
    if (selectedId === id && complaints.length > 1) {
      setSelectedId(complaints.find((c) => c.id !== id).id);
    }
  };

  return (
    <main className="citizen-page">
      {/* ================= PAGE HERO ================= */}
      <section className="page-hero">
        <div className="hero-glow"></div>
        <div className="page-hero-inner">
          <div className="breadcrumb">
            Home / <b>Citizen Dashboard</b>
          </div>
          <p className="eyebrow eyebrow-light">Welcome Back</p>
          <h1>Your MyRoad India dashboard</h1>
          <p className="hero-lead">
            View your profile, track complaints, and report new issues from
            one place.
          </p>
        </div>
      </section>

      {/* ================= PROFILE + OVERVIEW ================= */}
      <section className="section">
        <div className="top-grid">
          {/* Citizen Profile Information */}
          <div className="profile-card">
            <p className="eyebrow">Citizen Profile Information</p>
            <div className="profile-row">
              <span className="profile-avatar">🧑</span>
              <div>
                <h3>{profile.name}</h3>
                <p>{profile.mobile}</p>
              </div>
            </div>
            <div className="profile-details">
              <div>
                <span className="profile-label">Ward</span>
                <span className="profile-value">{profile.ward}</span>
              </div>
              <div>
                <span className="profile-label">Member Since</span>
                <span className="profile-value">{profile.memberSince}</span>
              </div>
            </div>
          </div>

          {/* Dashboard Overview */}
          <div className="overview-card">
            <p className="eyebrow">Dashboard Overview</p>
            <div className="stats-grid">
              {overviewStats.map((stat, i) => (
                <div className={`stat-card tone-${stat.tone}`} key={i}>
                  <span className="stat-icon">{stat.icon}</span>
                  <div>
                    <span className="stat-value">{stat.value}</span>
                    <span className="stat-label">{stat.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================= CITIZEN FUNCTIONS ================= */}
      <section className="section surface">
        <div className="section-heading">
          <p className="eyebrow">Citizen Functions</p>
          <h2>What would you like to do?</h2>
        </div>

        <div className="functions-grid">
          <div className="function-card">
            <span className="function-icon">📝</span>
            <h4>Report Issue</h4>
            <p>Select category, add description, upload photo & capture GPS.</p>
            <button className="primary-btn" type="button" onClick={() => setShowNewForm(true)}>
              Report New Issue <span>→</span>
            </button>
          </div>
          <div className="function-card">
            <span className="function-icon">🔍</span>
            <h4>Track Complaint</h4>
            <p>View complaint number, current status, and full status history.</p>
            <button
              className="secondary-btn"
              type="button"
              onClick={() =>
                document.getElementById("my-activity")?.scrollIntoView({ behavior: "smooth" })
              }
            >
              View My Complaints
            </button>
          </div>
          <div className="function-card">
            <span className="function-icon">🗺️</span>
            <h4>View Issues Map</h4>
            <p>See reported issue locations and their map positions.</p>
            <button className="secondary-btn" type="button" onClick={() => setShowMapView((v) => !v)}>
              {showMapView ? "Hide Map View" : "Open Map View"}
            </button>
          </div>
        </div>

        {/* Quick create form (CREATE) */}
        {showNewForm && (
          <form className="new-complaint-form" onSubmit={handleCreateComplaint}>
            <h4>Register a New Issue</h4>
            <div className="form-row">
              <div className="form-field">
                <label htmlFor="new-category">Category</label>
                <input
                  id="new-category"
                  type="text"
                  placeholder="e.g. Road Issues"
                  value={newComplaint.category}
                  onChange={(e) => setNewComplaint({ ...newComplaint, category: e.target.value })}
                  required
                />
              </div>
              <div className="form-field">
                <label htmlFor="new-issue">Specific Issue</label>
                <input
                  id="new-issue"
                  type="text"
                  placeholder="e.g. Road Potholes"
                  value={newComplaint.issue}
                  onChange={(e) => setNewComplaint({ ...newComplaint, issue: e.target.value })}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-field">
                <label htmlFor="new-location">Location</label>
                <input
                  id="new-location"
                  type="text"
                  placeholder="Street, landmark or ward"
                  value={newComplaint.location}
                  onChange={(e) => setNewComplaint({ ...newComplaint, location: e.target.value })}
                />
              </div>
              <div className="form-field">
                <label htmlFor="new-gps">Capture GPS</label>
                <div className="gps-row">
                  <input id="new-gps" type="text" placeholder="Not captured yet" value={newComplaint.gps} readOnly />
                  <button className="secondary-btn small" type="button" onClick={captureGps}>
                    {gpsBusy ? "Locating…" : "📍 Capture"}
                  </button>
                </div>
              </div>
            </div>
            <div className="form-field">
              <label htmlFor="new-description">Description</label>
              <textarea
                id="new-description"
                rows="3"
                placeholder="Describe the issue"
                value={newComplaint.description}
                onChange={(e) => setNewComplaint({ ...newComplaint, description: e.target.value })}
                required
              ></textarea>
            </div>
            <div className="form-field">
              <label htmlFor="new-photo">Upload Photo</label>
              <label className="photo-upload">
                {newComplaint.photo ? `📷 ${newComplaint.photo}` : "📷 Click to attach a photo"}
                <input
                  id="new-photo"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setNewComplaint({ ...newComplaint, photo: e.target.files?.[0]?.name || "" })}
                />
              </label>
            </div>
            <div className="form-actions">
              <button className="secondary-btn" type="button" onClick={() => setShowNewForm(false)}>
                Cancel
              </button>
              <button className="primary-btn" type="submit">
                Submit Complaint <span>→</span>
              </button>
            </div>
          </form>
        )}

        {/* Issues Map (READ — grouped by location) */}
        {showMapView && (
          <div className="map-view">
            <h4>Reported Issues Near {profile.ward}</h4>
            <div className="map-grid">
              {Object.entries(mapGroups).map(([location, items]) => (
                <div className="map-ward-card" key={location}>
                  <p className="map-ward-name">{location}</p>
                  <div className="map-pins">
                    {items.map((c) => (
                      <span
                        className="map-pin"
                        key={c.id}
                        style={{ background: colorForCategory(c.category) }}
                        title={`${c.complaintNumber} — ${c.category}`}
                      >
                        📍
                      </span>
                    ))}
                  </div>
                  <span className="map-ward-count">
                    {items.length} issue{items.length !== 1 ? "s" : ""} reported
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ================= MY ACTIVITY ================= */}
      <section className="section" id="my-activity">
        <div className="section-heading">
          <p className="eyebrow">My Activity</p>
          <h2>Reported issues & complaint history</h2>
        </div>

        <div className="activity-layout">
          {/* Complaints list (READ / UPDATE / DELETE) */}
          <div className="complaints-list">
            {complaints.map((complaint) => (
              <div
                className={`complaint-card ${selectedId === complaint.id ? "active" : ""}`}
                key={complaint.id}
                onClick={() => setSelectedId(complaint.id)}
              >
                <div className="complaint-top">
                  <span className="complaint-number">{complaint.complaintNumber}</span>
                  <span className={`complaint-stage stage-${complaint.stage}`}>
                    {lifecycleStages[complaint.stage]}
                  </span>
                </div>
                <h4>{complaint.issue}</h4>
                <p className="complaint-location">📍 {complaint.location || "Location pending"}</p>

                {editingId === complaint.id ? (
                  <div className="edit-block" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      className="edit-location-input"
                      value={editLocation}
                      onChange={(e) => setEditLocation(e.target.value)}
                      placeholder="Location"
                    />
                    <textarea
                      rows="3"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                    ></textarea>
                    <div className="edit-actions">
                      <button
                        className="secondary-btn"
                        type="button"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </button>
                      <button
                        className="primary-btn small"
                        type="button"
                        onClick={() => saveEdit(complaint.id)}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <p>{complaint.description}</p>
                )}

                <div className="complaint-footer">
                  <span className="complaint-date">{complaint.date}</span>
                  <div className="complaint-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="icon-btn"
                      type="button"
                      onClick={() => startEdit(complaint)}
                      title="Update"
                    >
                      ✏️
                    </button>
                    {complaint.stage === 0 && (
                      <button
                        className="icon-btn danger"
                        type="button"
                        onClick={() => setConfirmDeleteId(complaint.id)}
                        title="Delete"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>

                {confirmDeleteId === complaint.id && (
                  <div className="delete-confirm" onClick={(e) => e.stopPropagation()}>
                    <span>Delete this complaint?</span>
                    <div>
                      <button
                        className="secondary-btn small"
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                      >
                        No
                      </button>
                      <button
                        className="danger-btn small"
                        type="button"
                        onClick={() => handleDelete(complaint.id)}
                      >
                        Yes, Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Lifecycle + Notifications */}
          <div className="activity-side">
            <div className="lifecycle-card">
              <p className="eyebrow">Complaint Lifecycle</p>
              <h4>{selectedComplaint.complaintNumber}</h4>
              <p className="lifecycle-location">📍 {selectedComplaint.location || "Location pending"}</p>
              <div className="lifecycle-track-vertical">
                {lifecycleStages.map((stage, i) => (
                  <div
                    className={`lifecycle-step-v ${
                      i < selectedComplaint.stage
                        ? "done"
                        : i === selectedComplaint.stage
                        ? "now"
                        : "pend"
                    }`}
                    key={i}
                  >
                    <span className="lifecycle-dot-v"></span>
                    <span>{stage}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="notifications-card">
              <p className="eyebrow">Notifications</p>
              <ul className="notification-list">
                {notifications.map((note, i) => (
                  <li key={i}>
                    <span className="notification-dot"></span>
                    <div>
                      <p>{note.text}</p>
                      <span className="notification-time">{note.time}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default CitizenDashboard;