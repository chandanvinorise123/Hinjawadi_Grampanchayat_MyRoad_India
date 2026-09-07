import React, { useState } from "react";
import "./staffdashboard.css";

/* Action/Repair Work lifecycle, from the flow diagram:
   Action Initiated -> Work In Progress -> Work Completed ->
   Upload After-Repair Photo + Action Taken + Remarks -> Verification -> Work Resolved/Closed */
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
  for (let i = 0; i < category.length; i++) hash = category.charCodeAt(i) + ((hash << 5) - hash);
  return mapColors[Math.abs(hash) % mapColors.length];
};

const priorityTone = { High: "red", Medium: "amber", Low: "green" };

const seedAssigned = [
  {
    id: 1,
    complaintNumber: "MRI-482913",
    category: "Road Issues",
    issue: "Road Potholes",
    location: "Camp Road Bus Stop",
    citizenName: "R. Deshmukh",
    citizenContact: "+91 90000 11122",
    description: "Large pothole near the bus stop causing traffic slowdown.",
    priority: "High",
    dueDate: "2026-09-10",
    stage: 2,
    inspection: {
      remarks: "Pothole confirmed, approx 2ft wide. Marked for patch repair.",
      sitePhoto: "site-482913.jpg",
      actionTaken: "Requested asphalt patch crew for the location.",
      completionPhoto: "",
    },
    isDraft: false,
  },
  {
    id: 2,
    complaintNumber: "MRI-291045",
    category: "Streetlight Issues",
    issue: "Light Not Working",
    location: "House No. 21, Riverside Lane",
    citizenName: "S. Kulkarni",
    citizenContact: "+91 90000 33344",
    description: "Streetlight outside house no. 21 has been off for a week.",
    priority: "Medium",
    dueDate: "2026-09-14",
    stage: 0,
    inspection: {
      remarks: "",
      sitePhoto: "",
      actionTaken: "",
      completionPhoto: "",
    },
    isDraft: true,
  },
  {
    id: 3,
    complaintNumber: "MRI-661120",
    category: "Drinking Water Issues",
    issue: "Pipeline Leakage",
    location: "Riverside Ward Pipeline",
    citizenName: "A. Joshi",
    citizenContact: "+91 90000 55566",
    description: "Water leaking continuously from an underground pipeline joint.",
    priority: "High",
    dueDate: "2026-09-08",
    stage: 4,
    inspection: {
      remarks: "Leak confirmed at joint near junction box 4.",
      sitePhoto: "site-661120.jpg",
      actionTaken: "Joint resealed, pressure tested for 24 hours.",
      completionPhoto: "repair-661120.jpg",
    },
    isDraft: false,
  },
  {
    id: 4,
    complaintNumber: "MRI-104488",
    category: "Sanitation",
    issue: "Overflowing Garbage Bin",
    location: "Market Yard Junction",
    citizenName: "P. Naik",
    citizenContact: "+91 90000 77788",
    description: "Community bin overflowing for three days, needs urgent clearing.",
    priority: "Low",
    dueDate: "2026-09-12",
    stage: 5,
    inspection: {
      remarks: "Bin cleared and area hosed down.",
      sitePhoto: "site-104488.jpg",
      actionTaken: "Extra pickup scheduled twice a week for this junction.",
      completionPhoto: "repair-104488.jpg",
    },
    isDraft: false,
  },
];

const workHistory = [
  { text: "Marked MRI-661120 as Verification pending", time: "3 hours ago" },
  { text: "Uploaded after-repair photo for MRI-104488", time: "yesterday" },
  { text: "Started inspection on MRI-482913", time: "2 days ago" },
];

const StaffDashboard = () => {
  const [staff] = useState({
    name: "Field Officer",
    role: "Junior Engineer — Public Works",
    contact: "+91 98111 22334",
    ward: "Ward 3 — Riverside",
    staffId: "STF-0142",
  });

  const [complaints, setComplaints] = useState(seedAssigned);
  const [selectedId, setSelectedId] = useState(seedAssigned[0].id);
  const [showMapView, setShowMapView] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const [inspectionDraft, setInspectionDraft] = useState(null); // { id, remarks, sitePhoto, actionTaken, completionPhoto }

  const selected = complaints.find((c) => c.id === selectedId) || complaints[0];

  const overviewStats = [
    { label: "Assigned Issues", value: complaints.length, icon: "🗂️", tone: "navy" },
    { label: "Pending", value: complaints.filter((c) => c.stage === 0).length, icon: "⏳", tone: "amber" },
    { label: "In Progress", value: complaints.filter((c) => c.stage > 0 && c.stage < 5).length, icon: "🛠️", tone: "orange" },
    { label: "Completed", value: complaints.filter((c) => c.stage === 5).length, icon: "✅", tone: "green" },
  ];

  const mapGroups = complaints.reduce((groups, c) => {
    const key = c.location || "Location pending";
    if (!groups[key]) groups[key] = [];
    groups[key].push(c);
    return groups;
  }, {});

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  // ---------------- READ (view details happens via selection; below is CRUD on inspection/status) ----------------

  const startInspection = (c) => {
    setSelectedId(c.id);
    setInspectionDraft({
      id: c.id,
      remarks: c.inspection.remarks,
      sitePhoto: c.inspection.sitePhoto,
      actionTaken: c.inspection.actionTaken,
      completionPhoto: c.inspection.completionPhoto,
    });
  };

  // ---------------- CREATE / UPDATE inspection record ----------------
  const saveInspection = (e) => {
    e.preventDefault();
    if (!inspectionDraft) return;
    setComplaints(
      complaints.map((c) =>
        c.id === inspectionDraft.id
          ? {
              ...c,
              isDraft: false,
              inspection: {
                remarks: inspectionDraft.remarks,
                sitePhoto: inspectionDraft.sitePhoto,
                actionTaken: inspectionDraft.actionTaken,
                completionPhoto: inspectionDraft.completionPhoto,
              },
            }
          : c
      )
    );
    setInspectionDraft(null);
  };

  const attachPhoto = (field, fileName) => {
    setInspectionDraft((prev) => ({ ...prev, [field]: fileName }));
  };

  // ---------------- UPDATE work status (Action Initiated -> ... -> Closed) ----------------
  const advanceStage = (id) => {
    setComplaints(
      complaints.map((c) =>
        c.id === id && c.stage < lifecycleStages.length - 1 ? { ...c, stage: c.stage + 1, isDraft: false } : c
      )
    );
  };

  const revertStage = (id) => {
    setComplaints(
      complaints.map((c) => (c.id === id && c.stage > 0 ? { ...c, stage: c.stage - 1 } : c))
    );
  };

  // ---------------- DELETE (only eligible draft data — stage 0, isDraft) ----------------
  const handleDeleteDraft = (id) => {
    setComplaints(complaints.filter((c) => c.id !== id));
    setConfirmDeleteId(null);
    if (selectedId === id && complaints.length > 1) {
      setSelectedId(complaints.find((c) => c.id !== id).id);
    }
  };

  const initials = staff.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="sd-shell">
      {/* ============ SIDEBAR ============ */}
      <aside className="sd-sidebar">
        <div className="sd-sb-brand">
          <div className="sd-sb-logo">MI</div>
          <div>
            <b>MyRoad India</b>
            <span>Staff Portal</span>
          </div>
        </div>

        <div className="sd-sb-label">Overview</div>
        <nav className="sd-sb-nav">
          <button type="button" className="sd-sb-link active" onClick={() => scrollTo("sd-top")}>
            📊 Dashboard
          </button>
          <button type="button" className="sd-sb-link" onClick={() => scrollTo("sd-profile")}>
            👤 My Profile
          </button>
        </nav>

        <div className="sd-sb-label">Assigned Work</div>
        <nav className="sd-sb-nav">
          <button type="button" className="sd-sb-link" onClick={() => scrollTo("assigned-work")}>
            🗂️ Assigned Complaints
            <span className="sd-sb-badge">{complaints.length}</span>
          </button>
          <button
            type="button"
            className="sd-sb-link"
            onClick={() => {
              setShowMapView(true);
              scrollTo("map-section");
            }}
          >
            🗺️ View Location on Map
          </button>
          <button type="button" className="sd-sb-link" onClick={() => scrollTo("inspection-panel")}>
            🔎 Physical Inspection
          </button>
        </nav>

        <div className="sd-sb-label">Activity</div>
        <nav className="sd-sb-nav">
          <button type="button" className="sd-sb-link" onClick={() => scrollTo("history-panel")}>
            🕘 Work History
          </button>
        </nav>

        <div className="sd-sb-footer">
          <div className="sd-sb-user">
            <div className="sd-sb-avatar">{initials}</div>
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
            🔍 <input type="text" placeholder="Search assigned complaints..." />
          </div>
          <div className="sd-tb-actions">
            <button type="button" className="sd-icon-btn" aria-label="Work history" onClick={() => scrollTo("history-panel")}>
              🕘<span className="sd-tb-dot"></span>
            </button>
            <div className="sd-tb-user" id="sd-profile">
              <div className="sd-tb-avatar">{initials}</div>
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

          {/* STAT CARDS — Dashboard Overview */}
          <div className="sd-stats-row">
            {overviewStats.map((stat, i) => (
              <div className={`sd-stat-card tone-${stat.tone}`} key={i}>
                <div className="sd-stat-ic">{stat.icon}</div>
                <div className="sd-stat-num">{stat.value}</div>
                <div className="sd-stat-label">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* TWO COLUMN: ASSIGNED WORK TABLE + LIFECYCLE/HISTORY */}
          <div className="sd-dash-grid" id="assigned-work">
            {/* LEFT: Assigned Complaint Management (READ / UPDATE / DELETE draft) */}
            <div className="sd-panel">
              <div className="sd-panel-head">
                <h3>Assigned Complaints</h3>
                <span className="sd-panel-link">{complaints.length} total</span>
              </div>

              <div className="sd-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Complaint</th>
                      <th>Category</th>
                      <th>Location</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>Due</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {complaints.map((c) => (
                      <React.Fragment key={c.id}>
                        <tr
                          className={selectedId === c.id ? "sd-row-active" : ""}
                          onClick={() => setSelectedId(c.id)}
                        >
                          <td className="sd-mono">{c.complaintNumber}</td>
                          <td>
                            <div className="sd-cat">
                              <span className="sd-cat-dot" style={{ background: colorForCategory(c.category) }}></span>
                              {c.issue}
                            </div>
                          </td>
                          <td>{c.location || "Location pending"}</td>
                          <td>
                            <span className={`sd-badge sd-badge-${priorityTone[c.priority]}`}>{c.priority}</span>
                          </td>
                          <td>
                            <span className={`sd-badge sd-badge-${stageTone[c.stage]}`}>{lifecycleStages[c.stage]}</span>
                          </td>
                          <td className="sd-mono">{c.dueDate}</td>
                          <td onClick={(e) => e.stopPropagation()}>
                            <div className="sd-row-actions">
                              <button
                                className="sd-icon-btn small"
                                type="button"
                                onClick={() => startInspection(c)}
                                title="Physical Inspection"
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
                                  <button className="sd-btn-outline small" type="button" onClick={() => setConfirmDeleteId(null)}>
                                    No
                                  </button>
                                  <button className="sd-btn-danger small" type="button" onClick={() => handleDeleteDraft(c.id)}>
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

            {/* RIGHT: Lifecycle + Work History */}
            <div className="sd-side-col">
              <div className="sd-panel">
                <div className="sd-panel-head">
                  <h3>Action / Repair Work</h3>
                  <span className="sd-mono sd-faint">{selected.complaintNumber}</span>
                </div>
                <p className="sd-lifecycle-location">📍 {selected.location || "Location pending"}</p>
                <div className="sd-lifecycle">
                  {lifecycleStages.map((stage, i) => (
                    <div className="sd-lc-item" key={i}>
                      <div
                        className={`sd-lc-dot ${i < selected.stage ? "done" : i === selected.stage ? "now" : "pend"}`}
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
                  {workHistory.map((note, i) => (
                    <div className="sd-notif-item" key={i}>
                      <span className="sd-notif-dot"></span>
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

          {/* COMPLAINT DETAILS (READ — Category, Description, Citizen Details) */}
          <div className="sd-panel sd-form-panel">
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
                <span>Due Date</span>
                <b>{selected.dueDate}</b>
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
            </div>
          </div>

          {/* PHYSICAL INSPECTION / CRUD ON INSPECTION RECORD */}
          <div className="sd-panel sd-form-panel" id="inspection-panel">
            <div className="sd-panel-head">
              <h3>Physical Inspection — {selected.complaintNumber}</h3>
              {!inspectionDraft && (
                <button className="sd-btn-primary small" type="button" onClick={() => startInspection(selected)}>
                  {selected.inspection.remarks ? "Update Record" : "Create Inspection Record"}
                </button>
              )}
            </div>

            {inspectionDraft && inspectionDraft.id === selected.id ? (
              <form className="sd-new-form" onSubmit={saveInspection}>
                <div className="sd-field">
                  <label htmlFor="insp-remarks">Inspection Remarks</label>
                  <textarea
                    id="insp-remarks"
                    rows="3"
                    placeholder="Site inspection findings"
                    value={inspectionDraft.remarks}
                    onChange={(e) => setInspectionDraft({ ...inspectionDraft, remarks: e.target.value })}
                    required
                  ></textarea>
                </div>
                <div className="sd-form-row">
                  <div className="sd-field">
                    <label htmlFor="insp-site-photo">Site Photograph</label>
                    <label className="sd-photo-upload">
                      {inspectionDraft.sitePhoto ? `📷 ${inspectionDraft.sitePhoto}` : "📷 Click to attach site photo"}
                      <input
                        id="insp-site-photo"
                        type="file"
                        accept="image/*"
                        onChange={(e) => attachPhoto("sitePhoto", e.target.files?.[0]?.name || "")}
                      />
                    </label>
                  </div>
                  <div className="sd-field">
                    <label htmlFor="insp-completion-photo">Completion Photograph</label>
                    <label className="sd-photo-upload">
                      {inspectionDraft.completionPhoto
                        ? `📷 ${inspectionDraft.completionPhoto}`
                        : "📷 Click to attach after-repair photo"}
                      <input
                        id="insp-completion-photo"
                        type="file"
                        accept="image/*"
                        onChange={(e) => attachPhoto("completionPhoto", e.target.files?.[0]?.name || "")}
                      />
                    </label>
                  </div>
                </div>
                <div className="sd-field">
                  <label htmlFor="insp-action">Action Taken</label>
                  <textarea
                    id="insp-action"
                    rows="2"
                    placeholder="Repair / action carried out"
                    value={inspectionDraft.actionTaken}
                    onChange={(e) => setInspectionDraft({ ...inspectionDraft, actionTaken: e.target.value })}
                  ></textarea>
                </div>
                <div className="sd-form-actions">
                  <button className="sd-btn-outline" type="button" onClick={() => setInspectionDraft(null)}>
                    Cancel
                  </button>
                  <button className="sd-btn-primary" type="submit">
                    Save Record →
                  </button>
                </div>
              </form>
            ) : (
              <div className="sd-inspection-view">
                {selected.inspection.remarks ? (
                  <>
                    <div className="sd-detail-item sd-detail-wide">
                      <span>Inspection Remarks</span>
                      <b>{selected.inspection.remarks}</b>
                    </div>
                    <div className="sd-detail-item">
                      <span>Site Photograph</span>
                      <b>{selected.inspection.sitePhoto || "Not attached"}</b>
                    </div>
                    <div className="sd-detail-item">
                      <span>Completion Photograph</span>
                      <b>{selected.inspection.completionPhoto || "Not attached"}</b>
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

          {/* VIEW LOCATION ON MAP (READ — grouped by location) */}
          {showMapView && (
            <div className="sd-panel sd-form-panel" id="map-section">
              <div className="sd-panel-head">
                <h3>Assigned Locations — {staff.ward}</h3>
                <span className="sd-panel-link" onClick={() => setShowMapView(false)} style={{ cursor: "pointer" }}>
                  Hide Map View
                </span>
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
                      {items.length} issue{items.length !== 1 ? "s" : ""} assigned
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* QUICK ACTIONS */}
          <div className="sd-quick-row">
            <button className="sd-quick-card" type="button" onClick={() => scrollTo("assigned-work")}>
              <div className="sd-quick-ic navy">🗂️</div>
              <div>
                <h5>View Assigned Complaints</h5>
                <p>Priority, location & due status</p>
              </div>
            </button>
            <button className="sd-quick-card" type="button" onClick={() => startInspection(selected)}>
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
              <div className="sd-quick-ic green">🗺️</div>
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