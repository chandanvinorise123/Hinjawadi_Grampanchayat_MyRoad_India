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

const stageTone = ["amber", "amber", "orange", "orange", "orange", "amber", "green"];

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

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  const initials = profile.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

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
          <button type="button" className="cd-sb-link active" onClick={() => scrollTo("cd-top")}>
            📊 Dashboard
          </button>
          <button type="button" className="cd-sb-link" onClick={() => scrollTo("cd-profile")}>
            👤 My Profile
          </button>
        </nav>

        <div className="cd-sb-label">Citizen Functions</div>
        <nav className="cd-sb-nav">
          <button type="button" className="cd-sb-link" onClick={() => setShowNewForm(true)}>
            📍 Report an Issue
          </button>
          <button type="button" className="cd-sb-link" onClick={() => scrollTo("my-activity")}>
            🔍 Track Complaint
          </button>
          <button
            type="button"
            className="cd-sb-link"
            onClick={() => {
              setShowMapView(true);
              scrollTo("map-section");
            }}
          >
            🗺️ Issues Map
          </button>
          <button type="button" className="cd-sb-link" onClick={() => scrollTo("my-activity")}>
            📋 My Complaints
            <span className="cd-sb-badge">{complaints.length}</span>
          </button>
        </nav>

        <div className="cd-sb-label">Activity</div>
        <nav className="cd-sb-nav">
          <button type="button" className="cd-sb-link" onClick={() => scrollTo("notif-panel")}>
            🔔 Notifications
            <span className="cd-sb-badge">{notifications.length}</span>
          </button>
          <button type="button" className="cd-sb-link" onClick={() => scrollTo("my-activity")}>
            🕘 Recent Activity
          </button>
        </nav>

        <div className="cd-sb-footer">
          <div className="cd-sb-user">
            <div className="cd-sb-avatar">{initials}</div>
            <div className="cd-sb-user-info">
              <b>{profile.name}</b>
              <span>{profile.mobile}</span>
            </div>
          </div>
          <div className="cd-sb-ward">
            {profile.ward} · Member since {profile.memberSince}
          </div>
        </div>
      </aside>

      {/* ============ MAIN AREA ============ */}
      <div className="cd-main" id="cd-top">
        {/* TOPBAR */}
        <div className="cd-topbar">
          <div className="cd-search">
            🔍 <input type="text" placeholder="Search your complaints..." />
          </div>
          <div className="cd-tb-actions">
            <button type="button" className="cd-icon-btn" aria-label="Notifications" onClick={() => scrollTo("notif-panel")}>
              🔔<span className="cd-tb-dot"></span>
            </button>
            <button className="cd-btn-primary" type="button" onClick={() => setShowNewForm(true)}>
              + Report an Issue
            </button>
            <div className="cd-tb-user" id="cd-profile">
              <div className="cd-tb-avatar">{initials}</div>
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
              <h1>Welcome back, {profile.name.split(" ")[0]}</h1>
              <p>
                {profile.ward} · Member since {profile.memberSince}
              </p>
            </div>
          </div>

          {/* STAT CARDS — Dashboard Overview */}
          <div className="cd-stats-row">
            {overviewStats.map((stat, i) => (
              <div className={`cd-stat-card tone-${stat.tone}`} key={i}>
                <div className="cd-stat-ic">{stat.icon}</div>
                <div className="cd-stat-num">{stat.value}</div>
                <div className="cd-stat-label">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* TWO COLUMN: TABLE + LIFECYCLE/NOTIFICATIONS */}
          <div className="cd-dash-grid" id="my-activity">
            {/* LEFT: My Reported Issues (READ / UPDATE / DELETE) */}
            <div className="cd-panel">
              <div className="cd-panel-head">
                <h3>My Reported Issues</h3>
                <span className="cd-panel-link">{complaints.length} total</span>
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
                          className={selectedId === c.id ? "cd-row-active" : ""}
                          onClick={() => setSelectedId(c.id)}
                        >
                          <td className="cd-mono">{c.complaintNumber}</td>
                          <td>
                            <div className="cd-cat">
                              <span className="cd-cat-dot" style={{ background: colorForCategory(c.category) }}></span>
                              {c.issue}
                            </div>
                          </td>
                          <td>{c.location || "Location pending"}</td>
                          <td>
                            <span className={`cd-badge cd-badge-${stageTone[c.stage]}`}>
                              {lifecycleStages[c.stage]}
                            </span>
                          </td>
                          <td className="cd-mono">{c.date}</td>
                          <td onClick={(e) => e.stopPropagation()}>
                            <div className="cd-row-actions">
                              <button className="cd-icon-btn small" type="button" onClick={() => startEdit(c)} title="Update">
                                ✏️
                              </button>
                              {c.stage === 0 && (
                                <button
                                  className="cd-icon-btn small danger"
                                  type="button"
                                  onClick={() => setConfirmDeleteId(c.id)}
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
                                  onChange={(e) => setEditLocation(e.target.value)}
                                  placeholder="Location"
                                />
                                <textarea rows="2" value={editText} onChange={(e) => setEditText(e.target.value)}></textarea>
                                <div className="cd-edit-actions">
                                  <button className="cd-btn-outline" type="button" onClick={() => setEditingId(null)}>
                                    Cancel
                                  </button>
                                  <button className="cd-btn-primary small" type="button" onClick={() => saveEdit(c.id)}>
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
                                <span>Delete this complaint?</span>
                                <div>
                                  <button className="cd-btn-outline small" type="button" onClick={() => setConfirmDeleteId(null)}>
                                    No
                                  </button>
                                  <button className="cd-btn-danger small" type="button" onClick={() => handleDelete(c.id)}>
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

            {/* RIGHT: Lifecycle + Notifications */}
            <div className="cd-side-col">
              <div className="cd-panel">
                <div className="cd-panel-head">
                  <h3>Complaint Lifecycle</h3>
                  <span className="cd-mono cd-faint">{selectedComplaint.complaintNumber}</span>
                </div>
                <p className="cd-lifecycle-location">📍 {selectedComplaint.location || "Location pending"}</p>
                <div className="cd-lifecycle">
                  {lifecycleStages.map((stage, i) => (
                    <div className="cd-lc-item" key={i}>
                      <div
                        className={`cd-lc-dot ${
                          i < selectedComplaint.stage ? "done" : i === selectedComplaint.stage ? "now" : "pend"
                        }`}
                      ></div>
                      <div className="cd-lc-body">
                        <b>{stage}</b>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="cd-panel" id="notif-panel">
                <div className="cd-panel-head">
                  <h3>Notifications</h3>
                  <span className="cd-panel-link">Mark all read</span>
                </div>
                <div className="cd-notif-list">
                  {notifications.map((note, i) => (
                    <div className="cd-notif-item" key={i}>
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

          {/* NEW COMPLAINT FORM (CREATE) */}
          {showNewForm && (
            <div className="cd-panel cd-form-panel">
              <div className="cd-panel-head">
                <h3>Register a New Issue</h3>
              </div>
              <form className="cd-new-form" onSubmit={handleCreateComplaint}>
                <div className="cd-form-row">
                  <div className="cd-field">
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
                  <div className="cd-field">
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
                <div className="cd-form-row">
                  <div className="cd-field">
                    <label htmlFor="new-location">Location</label>
                    <input
                      id="new-location"
                      type="text"
                      placeholder="Street, landmark or ward"
                      value={newComplaint.location}
                      onChange={(e) => setNewComplaint({ ...newComplaint, location: e.target.value })}
                    />
                  </div>
                  <div className="cd-field">
                    <label htmlFor="new-gps">Capture GPS</label>
                    <div className="cd-gps-row">
                      <input id="new-gps" type="text" placeholder="Not captured yet" value={newComplaint.gps} readOnly />
                      <button className="cd-btn-outline small" type="button" onClick={captureGps}>
                        {gpsBusy ? "Locating…" : "📍 Capture"}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="cd-field">
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
                <div className="cd-field">
                  <label htmlFor="new-photo">Upload Photo</label>
                  <label className="cd-photo-upload">
                    {newComplaint.photo ? `📷 ${newComplaint.photo}` : "📷 Click to attach a photo"}
                    <input
                      id="new-photo"
                      type="file"
                      accept="image/*"
                      onChange={(e) => setNewComplaint({ ...newComplaint, photo: e.target.files?.[0]?.name || "" })}
                    />
                  </label>
                </div>
                <div className="cd-form-actions">
                  <button className="cd-btn-outline" type="button" onClick={() => setShowNewForm(false)}>
                    Cancel
                  </button>
                  <button className="cd-btn-primary" type="submit">
                    Submit Complaint →
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ISSUES MAP (READ — grouped by location) */}
          {showMapView && (
            <div className="cd-panel cd-form-panel" id="map-section">
              <div className="cd-panel-head">
                <h3>Reported Issues Near {profile.ward}</h3>
                <span className="cd-panel-link" onClick={() => setShowMapView(false)} style={{ cursor: "pointer" }}>
                  Hide Map View
                </span>
              </div>
              <div className="cd-map-grid">
                {Object.entries(mapGroups).map(([location, items]) => (
                  <div className="cd-map-ward-card" key={location}>
                    <p className="cd-map-ward-name">{location}</p>
                    <div className="cd-map-pins">
                      {items.map((c) => (
                        <span
                          className="cd-map-pin"
                          key={c.id}
                          style={{ background: colorForCategory(c.category) }}
                          title={`${c.complaintNumber} — ${c.category}`}
                        >
                          📍
                        </span>
                      ))}
                    </div>
                    <span className="cd-map-ward-count">
                      {items.length} issue{items.length !== 1 ? "s" : ""} reported
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* QUICK ACTIONS */}
          <div className="cd-quick-row">
            <button className="cd-quick-card" type="button" onClick={() => setShowNewForm(true)}>
              <div className="cd-quick-ic navy">📍</div>
              <div>
                <h5>Report a New Issue</h5>
                <p>Photo, location & description</p>
              </div>
            </button>
            <button className="cd-quick-card" type="button" onClick={() => scrollTo("my-activity")}>
              <div className="cd-quick-ic saffron">🔍</div>
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
                scrollTo("map-section");
              }}
            >
              <div className="cd-quick-ic green">🗺️</div>
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