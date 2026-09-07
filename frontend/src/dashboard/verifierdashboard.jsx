import React, { useState } from "react";
import "./verifierdashboard.css";

/* Physical Verification lifecycle, from the flow diagram:
   Completed Work Received -> Physical Verification -> (Work Satisfied -> Verified | Work Not Satisfied -> Rejected -> Re-verification)
   -> Verified -> Update Status as Verified -> Complaint Resolved/Closed -> Citizen Gets Status Update */
const lifecycleStages = [
  "Completed Work Received",
  "Physical Verification",
  "Verified",
  "Complaint Resolved / Closed",
  "Citizen Notified",
];

const statusToStageIndex = {
  pending: 0,
  in_review: 1,
  verified: 2,
  resolved: 3,
  notified: 4,
  rejected: 1, // sent back mid Physical Verification
};

const statusTone = {
  pending: "amber",
  in_review: "orange",
  verified: "green",
  resolved: "green",
  notified: "green",
  rejected: "red",
};

const statusLabel = {
  pending: "Pending Verification",
  in_review: "Physical Verification",
  verified: "Verified",
  resolved: "Resolved / Closed",
  notified: "Citizen Notified",
  rejected: "Sent Back for Action",
};

const queueTone = { "New Complaints": "navy", "Completed Work": "orange", "Re-verification": "red", "Resolution Requests": "amber" };

const mapColors = ["#e07b1c", "#2e6cb0", "#1d8a5c", "#c1900a", "#cf4438", "#7a5c9e"];
const colorForCategory = (category) => {
  let hash = 0;
  for (let i = 0; i < category.length; i++) hash = category.charCodeAt(i) + ((hash << 5) - hash);
  return mapColors[Math.abs(hash) % mapColors.length];
};

const seedQueue = [
  {
    id: 1,
    complaintNumber: "MRI-482913",
    category: "Road Issues",
    issue: "Road Potholes",
    location: "Camp Road Bus Stop",
    citizenName: "R. Deshmukh",
    citizenContact: "+91 90000 11122",
    description: "Large pothole near the bus stop causing traffic slowdown.",
    queue: "Completed Work",
    status: "pending",
    photos: { before: "before-482913.jpg", site: "site-482913.jpg", after: "after-482913.jpg" },
    remarks: "",
    log: [{ text: "Staff marked work as completed", time: "5 hours ago" }],
  },
  {
    id: 2,
    complaintNumber: "MRI-661120",
    category: "Drinking Water Issues",
    issue: "Pipeline Leakage",
    location: "Riverside Ward Pipeline",
    citizenName: "A. Joshi",
    citizenContact: "+91 90000 55566",
    description: "Water leaking continuously from an underground pipeline joint.",
    queue: "New Complaints",
    status: "pending",
    photos: { before: "before-661120.jpg", site: "site-661120.jpg", after: "after-661120.jpg" },
    remarks: "",
    log: [{ text: "Complaint routed to verifier", time: "1 day ago" }],
  },
  {
    id: 3,
    complaintNumber: "MRI-104488",
    category: "Sanitation",
    issue: "Overflowing Garbage Bin",
    location: "Market Yard Junction",
    citizenName: "P. Naik",
    citizenContact: "+91 90000 77788",
    description: "Community bin overflowing for three days, needs urgent clearing.",
    queue: "Re-verification",
    status: "rejected",
    photos: { before: "before-104488.jpg", site: "site-104488.jpg", after: "after-104488-v1.jpg" },
    remarks: "After-repair photo showed bin still partly full — sent back for a second pickup.",
    log: [
      { text: "Verification rejected — work not satisfactory", time: "2 days ago" },
      { text: "Staff scheduled a second pickup", time: "1 day ago" },
    ],
  },
  {
    id: 4,
    complaintNumber: "MRI-291045",
    category: "Streetlight Issues",
    issue: "Light Not Working",
    location: "House No. 21, Riverside Lane",
    citizenName: "S. Kulkarni",
    citizenContact: "+91 90000 33344",
    description: "Streetlight outside house no. 21 has been off for a week.",
    queue: "Resolution Requests",
    status: "verified",
    photos: { before: "before-291045.jpg", site: "site-291045.jpg", after: "after-291045.jpg" },
    remarks: "New bulb and wiring confirmed working on-site.",
    log: [{ text: "Verified — work satisfies the reported issue", time: "3 hours ago" }],
  },
];

const VerifierDashboard = () => {
  const [verifier] = useState({
    name: "Ward Verifier",
    role: "Verification Officer — Public Works",
    contact: "+91 98222 44556",
    ward: "Ward 3 — Riverside",
    staffId: "VER-0087",
  });

  const [items, setItems] = useState(seedQueue);
  const [selectedId, setSelectedId] = useState(seedQueue[0].id);
  const [showMapView, setShowMapView] = useState(false);
  const [remarksDraft, setRemarksDraft] = useState("");

  const selected = items.find((c) => c.id === selectedId) || items[0];

  const overviewStats = [
    { label: "Total Complaints", value: items.length, icon: "🗂️", tone: "navy" },
    { label: "Pending Verification", value: items.filter((c) => c.status === "pending" || c.status === "in_review").length, icon: "⏳", tone: "amber" },
    { label: "Verified", value: items.filter((c) => c.status === "verified").length, icon: "✅", tone: "green" },
    { label: "Rejected", value: items.filter((c) => c.status === "rejected").length, icon: "⛔", tone: "red" },
    { label: "Resolved", value: items.filter((c) => c.status === "resolved" || c.status === "notified").length, icon: "📁", tone: "green" },
  ];

  const mapGroups = items.reduce((groups, c) => {
    const key = c.location || "Location pending";
    if (!groups[key]) groups[key] = [];
    groups[key].push(c);
    return groups;
  }, {});

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  const addLog = (list, text) => [...list, { text, time: "just now" }];

  const openVerification = (c) => {
    setSelectedId(c.id);
    setRemarksDraft(c.remarks || "");
    scrollTo("verification-panel");
  };

  // ---------------- PHYSICAL VERIFICATION: compare, then approve or reject ----------------
  const approveWork = (id) => {
    setItems(
      items.map((c) =>
        c.id === id
          ? { ...c, status: "verified", remarks: remarksDraft, log: addLog(c.log, "Approved — work satisfies the reported issue") }
          : c
      )
    );
  };

  const rejectWork = (id) => {
    if (!remarksDraft.trim()) return;
    setItems(
      items.map((c) =>
        c.id === id
          ? {
              ...c,
              status: "rejected",
              queue: "Re-verification",
              remarks: remarksDraft,
              log: addLog(c.log, "Rejected — sent back for further action"),
            }
          : c
      )
    );
  };

  // ---------------- Staff completes further action -> back into review ----------------
  const sendForReverification = (id) => {
    setItems(
      items.map((c) =>
        c.id === id
          ? { ...c, status: "in_review", log: addLog(c.log, "Staff completed further action — ready for re-verification") }
          : c
      )
    );
  };

  // ---------------- UPDATE status as Verified -> Resolved/Closed -> Notify citizen ----------------
  const markResolved = (id) => {
    setItems(
      items.map((c) => (c.id === id ? { ...c, status: "resolved", log: addLog(c.log, "Marked as Resolved / Closed") } : c))
    );
  };

  const notifyCitizen = (id) => {
    setItems(
      items.map((c) => (c.id === id ? { ...c, status: "notified", log: addLog(c.log, "Citizen notified of status update") } : c))
    );
  };

  const initials = verifier.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="vd-shell">
      {/* ============ SIDEBAR ============ */}
      <aside className="vd-sidebar">
        <div className="vd-sb-brand">
          <div className="vd-sb-logo">MI</div>
          <div>
            <b>MyRoad India</b>
            <span>Verifier Portal</span>
          </div>
        </div>

        <div className="vd-sb-label">Overview</div>
        <nav className="vd-sb-nav">
          <button type="button" className="vd-sb-link active" onClick={() => scrollTo("vd-top")}>
            📊 Dashboard
          </button>
          <button type="button" className="vd-sb-link" onClick={() => scrollTo("vd-profile")}>
            👤 My Profile
          </button>
        </nav>

        <div className="vd-sb-label">Pending Verifications</div>
        <nav className="vd-sb-nav">
          <button type="button" className="vd-sb-link" onClick={() => scrollTo("queue-panel")}>
            🆕 New Complaints
            <span className="vd-sb-badge">{items.filter((c) => c.queue === "New Complaints").length}</span>
          </button>
          <button type="button" className="vd-sb-link" onClick={() => scrollTo("queue-panel")}>
            🧰 Completed Work
            <span className="vd-sb-badge">{items.filter((c) => c.queue === "Completed Work").length}</span>
          </button>
          <button type="button" className="vd-sb-link" onClick={() => scrollTo("queue-panel")}>
            🔁 Re-verification
            <span className="vd-sb-badge">{items.filter((c) => c.queue === "Re-verification").length}</span>
          </button>
          <button type="button" className="vd-sb-link" onClick={() => scrollTo("queue-panel")}>
            📌 Resolution Requests
            <span className="vd-sb-badge">{items.filter((c) => c.queue === "Resolution Requests").length}</span>
          </button>
        </nav>

        <div className="vd-sb-label">Verification</div>
        <nav className="vd-sb-nav">
          <button type="button" className="vd-sb-link" onClick={() => scrollTo("verification-panel")}>
            🔍 Physical Verification
          </button>
          <button
            type="button"
            className="vd-sb-link"
            onClick={() => {
              setShowMapView(true);
              scrollTo("map-section");
            }}
          >
            🗺️ View Location on Map
          </button>
        </nav>

        <div className="vd-sb-footer">
          <div className="vd-sb-user">
            <div className="vd-sb-avatar">{initials}</div>
            <div className="vd-sb-user-info">
              <b>{verifier.name}</b>
              <span>{verifier.staffId}</span>
            </div>
          </div>
          <div className="vd-sb-ward">
            {verifier.role} · {verifier.ward}
          </div>
        </div>
      </aside>

      {/* ============ MAIN AREA ============ */}
      <div className="vd-main" id="vd-top">
        {/* TOPBAR */}
        <div className="vd-topbar">
          <div className="vd-search">
            🔍 <input type="text" placeholder="Search complaints to verify..." />
          </div>
          <div className="vd-tb-actions">
            <div className="vd-tb-user" id="vd-profile">
              <div className="vd-tb-avatar">{initials}</div>
              <div>
                <b>{verifier.name}</b>
                <span>{verifier.role}</span>
              </div>
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div className="vd-content">
          <div className="vd-title-row">
            <div>
              <h1>Welcome back, {verifier.name.split(" ")[0]}</h1>
              <p>
                {verifier.role} · {verifier.ward} · {verifier.contact}
              </p>
            </div>
          </div>

          {/* STAT CARDS — Dashboard Overview */}
          <div className="vd-stats-row">
            {overviewStats.map((stat, i) => (
              <div className={`vd-stat-card tone-${stat.tone}`} key={i}>
                <div className="vd-stat-ic">{stat.icon}</div>
                <div className="vd-stat-num">{stat.value}</div>
                <div className="vd-stat-label">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* TWO COLUMN: QUEUE TABLE + LIFECYCLE/ACTIVITY */}
          <div className="vd-dash-grid" id="queue-panel">
            {/* LEFT: Pending Verifications (READ) */}
            <div className="vd-panel">
              <div className="vd-panel-head">
                <h3>Pending Verifications</h3>
                <span className="vd-panel-link">{items.length} total</span>
              </div>

              <div className="vd-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Complaint</th>
                      <th>Category</th>
                      <th>Location</th>
                      <th>Queue</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((c) => (
                      <tr
                        key={c.id}
                        className={selectedId === c.id ? "vd-row-active" : ""}
                        onClick={() => setSelectedId(c.id)}
                      >
                        <td className="vd-mono">{c.complaintNumber}</td>
                        <td>
                          <div className="vd-cat">
                            <span className="vd-cat-dot" style={{ background: colorForCategory(c.category) }}></span>
                            {c.issue}
                          </div>
                        </td>
                        <td>{c.location || "Location pending"}</td>
                        <td>
                          <span className={`vd-badge vd-badge-${queueTone[c.queue]}`}>{c.queue}</span>
                        </td>
                        <td>
                          <span className={`vd-badge vd-badge-${statusTone[c.status]}`}>{statusLabel[c.status]}</span>
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <button className="vd-icon-btn small" type="button" onClick={() => openVerification(c)} title="Open Verification">
                            🔍
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* RIGHT: Lifecycle + Activity Log */}
            <div className="vd-side-col">
              <div className="vd-panel">
                <div className="vd-panel-head">
                  <h3>Verification Lifecycle</h3>
                  <span className="vd-mono vd-faint">{selected.complaintNumber}</span>
                </div>
                <p className="vd-lifecycle-location">📍 {selected.location || "Location pending"}</p>
                {selected.status === "rejected" && (
                  <div className="vd-status-banner reject">Sent back for further action — awaiting re-inspection.</div>
                )}
                <div className="vd-lifecycle">
                  {lifecycleStages.map((stage, i) => {
                    const currentIndex = statusToStageIndex[selected.status];
                    return (
                      <div className="vd-lc-item" key={i}>
                        <div
                          className={`vd-lc-dot ${
                            selected.status === "rejected" && i === 1
                              ? "reject"
                              : i < currentIndex
                              ? "done"
                              : i === currentIndex
                              ? "now"
                              : "pend"
                          }`}
                        ></div>
                        <div className="vd-lc-body">
                          <b>{stage}</b>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="vd-panel" id="history-panel">
                <div className="vd-panel-head">
                  <h3>Activity Log</h3>
                </div>
                <div className="vd-notif-list">
                  {selected.log.map((note, i) => (
                    <div className="vd-notif-item" key={i}>
                      <span className="vd-notif-dot"></span>
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

          {/* COMPLAINT DETAILS (READ — Category, Description, Citizen Details, Complaint Number) */}
          <div className="vd-panel vd-form-panel">
            <div className="vd-panel-head">
              <h3>Complaint Details</h3>
              <span className="vd-panel-link">{selected.complaintNumber}</span>
            </div>
            <div className="vd-detail-grid">
              <div className="vd-detail-item">
                <span>Complaint Number</span>
                <b>{selected.complaintNumber}</b>
              </div>
              <div className="vd-detail-item">
                <span>Category</span>
                <b>{selected.category}</b>
              </div>
              <div className="vd-detail-item">
                <span>Citizen</span>
                <b>{selected.citizenName}</b>
              </div>
              <div className="vd-detail-item">
                <span>Citizen Contact</span>
                <b>{selected.citizenContact}</b>
              </div>
              <div className="vd-detail-item vd-detail-wide">
                <span>Description</span>
                <b>{selected.description}</b>
              </div>
            </div>
          </div>

          {/* VIEW PHOTOS: Before Repair, Site Photo, After Repair */}
          <div className="vd-panel vd-form-panel">
            <div className="vd-panel-head">
              <h3>Photos — {selected.complaintNumber}</h3>
            </div>
            <div className="vd-photo-grid">
              <div className="vd-photo-card">
                <div className="vd-photo-thumb">📷</div>
                <span>Before Repair</span>
                <b>{selected.photos.before || "Not available"}</b>
              </div>
              <div className="vd-photo-card">
                <div className="vd-photo-thumb">📷</div>
                <span>Site Photo</span>
                <b>{selected.photos.site || "Not available"}</b>
              </div>
              <div className="vd-photo-card">
                <div className="vd-photo-thumb">📷</div>
                <span>After Repair</span>
                <b>{selected.photos.after || "Not available"}</b>
              </div>
            </div>
          </div>

          {/* PHYSICAL VERIFICATION: compare reported issue with completed work, then approve or reject */}
          <div className="vd-panel vd-form-panel" id="verification-panel">
            <div className="vd-panel-head">
              <h3>Physical Verification — {selected.complaintNumber}</h3>
              <span className={`vd-badge vd-badge-${statusTone[selected.status]}`}>{statusLabel[selected.status]}</span>
            </div>
            <div className="vd-new-form">
              <p className="vd-compare-note">
                Compare the reported issue against the completed work and photos above before recording a decision.
              </p>
              <div className="vd-field">
                <label htmlFor="verifier-remarks">Verifier Remarks</label>
                <textarea
                  id="verifier-remarks"
                  rows="3"
                  placeholder="Note what you observed on-site"
                  value={remarksDraft}
                  onChange={(e) => setRemarksDraft(e.target.value)}
                ></textarea>
              </div>

              <div className="vd-verify-actions">
                {(selected.status === "pending" || selected.status === "in_review") && (
                  <>
                    <button className="vd-btn-danger" type="button" onClick={() => rejectWork(selected.id)}>
                      Work Not Satisfied — Reject
                    </button>
                    <button className="vd-btn-primary" type="button" onClick={() => approveWork(selected.id)}>
                      Work Satisfied — Approve / Verify
                    </button>
                  </>
                )}

                {selected.status === "rejected" && (
                  <button className="vd-btn-outline" type="button" onClick={() => sendForReverification(selected.id)}>
                    Staff Completed Action → Send for Re-verification
                  </button>
                )}

                {selected.status === "verified" && (
                  <button className="vd-btn-primary" type="button" onClick={() => markResolved(selected.id)}>
                    Update Status → Resolved / Closed
                  </button>
                )}

                {selected.status === "resolved" && (
                  <button className="vd-btn-primary" type="button" onClick={() => notifyCitizen(selected.id)}>
                    Notify Citizen of Status Update
                  </button>
                )}

                {selected.status === "notified" && <span className="vd-done-note">✅ Citizen has been notified — complaint closed.</span>}
              </div>
            </div>
          </div>

          {/* VIEW LOCATION ON MAP (READ — grouped by location) */}
          {showMapView && (
            <div className="vd-panel vd-form-panel" id="map-section">
              <div className="vd-panel-head">
                <h3>Complaint Locations — {verifier.ward}</h3>
                <span className="vd-panel-link" onClick={() => setShowMapView(false)} style={{ cursor: "pointer" }}>
                  Hide Map View
                </span>
              </div>
              <div className="vd-map-grid">
                {Object.entries(mapGroups).map(([location, group]) => (
                  <div className="vd-map-ward-card" key={location}>
                    <p className="vd-map-ward-name">{location}</p>
                    <div className="vd-map-pins">
                      {group.map((c) => (
                        <span
                          className="vd-map-pin"
                          key={c.id}
                          style={{ background: colorForCategory(c.category) }}
                          title={`${c.complaintNumber} — ${c.category}`}
                        >
                          📍
                        </span>
                      ))}
                    </div>
                    <span className="vd-map-ward-count">
                      {group.length} complaint{group.length !== 1 ? "s" : ""} to verify
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* QUICK ACTIONS */}
          <div className="vd-quick-row">
            <button className="vd-quick-card" type="button" onClick={() => scrollTo("queue-panel")}>
              <div className="vd-quick-ic navy">🗂️</div>
              <div>
                <h5>View Pending Verifications</h5>
                <p>New, completed, and re-verification queues</p>
              </div>
            </button>
            <button className="vd-quick-card" type="button" onClick={() => openVerification(selected)}>
              <div className="vd-quick-ic saffron">🔍</div>
              <div>
                <h5>Run Physical Verification</h5>
                <p>Compare reported issue with completed work</p>
              </div>
            </button>
            <button
              className="vd-quick-card"
              type="button"
              onClick={() => {
                setShowMapView(true);
                scrollTo("map-section");
              }}
            >
              <div className="vd-quick-ic green">🗺️</div>
              <div>
                <h5>View Location on Map</h5>
                <p>See complaints awaiting verification</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifierDashboard;