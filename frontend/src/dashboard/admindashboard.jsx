import React, { useState } from "react";
import "./admindashboard.css";

/* Complaint pipeline status, from the flow diagram's System Overview:
   New Complaints -> Pending -> Under Verification -> Under Action -> Resolved */
const statusOptions = ["New", "Pending", "Under Verification", "Under Action", "Resolved"];
const statusTone = { New: "navy", Pending: "amber", "Under Verification": "orange", "Under Action": "orange", Resolved: "green" };

const priorityOptions = ["Critical", "Urgent", "Normal"];
const priorityTone = { Critical: "red", Urgent: "amber", Normal: "green" };

const roleOptions = ["Citizen", "Staff", "Verifier", "Admin"];
const roleTone = { Citizen: "navy", Staff: "orange", Verifier: "amber", Admin: "red" };

const mapColors = ["#e07b1c", "#2e6cb0", "#1d8a5c", "#c1900a", "#cf4438", "#7a5c9e"];
const colorForCategory = (category) => {
  let hash = 0;
  for (let i = 0; i < category.length; i++) hash = category.charCodeAt(i) + ((hash << 5) - hash);
  return mapColors[Math.abs(hash) % mapColors.length];
};

const seedUsers = [
  { id: 1, name: "R. Deshmukh", role: "Citizen", contact: "+91 90000 11122", joined: "2026-03-12" },
  { id: 2, name: "S. Kulkarni", role: "Citizen", contact: "+91 90000 33344", joined: "2026-04-02" },
  { id: 3, name: "Field Officer", role: "Staff", contact: "+91 98111 22334", joined: "2026-01-20" },
  { id: 4, name: "N. Pawar", role: "Staff", contact: "+91 98111 55667", joined: "2026-02-14" },
  { id: 5, name: "Ward Verifier", role: "Verifier", contact: "+91 98222 44556", joined: "2026-01-25" },
  { id: 6, name: "Admin User", role: "Admin", contact: "+91 99000 00011", joined: "2025-12-01" },
];

const seedComplaints = [
  {
    id: 1,
    complaintNumber: "MRI-482913",
    category: "Road Issues",
    issue: "Road Potholes",
    location: "Camp Road Bus Stop",
    citizenName: "R. Deshmukh",
    description: "Large pothole near the bus stop causing traffic slowdown.",
    photos: 2,
    priority: "Critical",
    status: "Under Action",
    assignedStaff: "Field Officer",
    assignedVerifier: "",
    date: "2026-08-12",
  },
  {
    id: 2,
    complaintNumber: "MRI-291045",
    category: "Streetlight Issues",
    issue: "Light Not Working",
    location: "House No. 21, Riverside Lane",
    citizenName: "S. Kulkarni",
    description: "Streetlight outside house no. 21 has been off for a week.",
    photos: 1,
    priority: "Normal",
    status: "Resolved",
    assignedStaff: "Field Officer",
    assignedVerifier: "Ward Verifier",
    date: "2026-08-25",
  },
  {
    id: 3,
    complaintNumber: "MRI-661120",
    category: "Drinking Water Issues",
    issue: "Pipeline Leakage",
    location: "Riverside Ward Pipeline",
    citizenName: "A. Joshi",
    description: "Water leaking continuously from an underground pipeline joint.",
    photos: 3,
    priority: "Urgent",
    status: "Under Verification",
    assignedStaff: "N. Pawar",
    assignedVerifier: "Ward Verifier",
    date: "2026-09-01",
  },
  {
    id: 4,
    complaintNumber: "MRI-104488",
    category: "Sanitation",
    issue: "Overflowing Garbage Bin",
    location: "Market Yard Junction",
    citizenName: "P. Naik",
    description: "Community bin overflowing for three days, needs urgent clearing.",
    photos: 2,
    priority: "Urgent",
    status: "Pending",
    assignedStaff: "",
    assignedVerifier: "",
    date: "2026-09-04",
  },
  {
    id: 5,
    complaintNumber: "MRI-773820",
    category: "Drinking Water Issues",
    issue: "Low Water Pressure",
    location: "Riverside Ward Pipeline",
    citizenName: "R. Deshmukh",
    description: "Very low water pressure every morning in the ward.",
    photos: 0,
    priority: "Normal",
    status: "New",
    assignedStaff: "",
    assignedVerifier: "",
    date: "2026-09-06",
  },
];

const notificationFeed = [
  { type: "Complaint Registered", text: "MRI-773820 registered by R. Deshmukh", time: "1 hour ago" },
  { type: "Complaint Verified", text: "MRI-291045 verified by Ward Verifier", time: "3 hours ago" },
  { type: "Staff Assigned", text: "N. Pawar assigned to MRI-661120", time: "6 hours ago" },
  { type: "Action Initiated", text: "Field Officer started work on MRI-482913", time: "1 day ago" },
  { type: "Work Completed", text: "Streetlight repair completed for MRI-291045", time: "2 days ago" },
  { type: "Complaint Closed", text: "MRI-291045 closed after citizen confirmation", time: "2 days ago" },
];

const notifTone = {
  "Complaint Registered": "navy",
  "Complaint Verified": "amber",
  "Staff Assigned": "orange",
  "Action Initiated": "orange",
  "Work Completed": "green",
  "Complaint Resolved": "green",
  "Complaint Closed": "green",
};

const AdminDashboard = () => {
  const [admin] = useState({
    name: "Admin User",
    role: "System Administrator",
    contact: "+91 99000 00011",
    staffId: "ADM-0001",
  });

  const [users, setUsers] = useState(seedUsers);
  const [complaints, setComplaints] = useState(seedComplaints);
  const [selectedId, setSelectedId] = useState(seedComplaints[0].id);
  const [showMapView, setShowMapView] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");

  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", role: "Citizen", contact: "" });
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState(null);
  const [confirmDeleteComplaintId, setConfirmDeleteComplaintId] = useState(null);

  const selected = complaints.find((c) => c.id === selectedId) || complaints[0];
  const categories = ["All", ...Array.from(new Set(complaints.map((c) => c.category)))];

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

  // ---------------- USER MANAGEMENT ----------------
  const userCounts = roleOptions.map((role) => ({
    role,
    count: users.filter((u) => u.role === role).length,
  }));

  const addUser = (e) => {
    e.preventDefault();
    if (!newUser.name.trim() || !newUser.contact.trim()) return;
    setUsers([{ id: Date.now(), ...newUser, joined: new Date().toISOString().slice(0, 10) }, ...users]);
    setNewUser({ name: "", role: "Citizen", contact: "" });
    setShowAddUser(false);
  };

  const updateUserRole = (id, role) => {
    setUsers(users.map((u) => (u.id === id ? { ...u, role } : u)));
  };

  const deleteUser = (id) => {
    setUsers(users.filter((u) => u.id !== id));
    setConfirmDeleteUserId(null);
  };

  // ---------------- COMPLAINT MANAGEMENT: filter / search ----------------
  const filteredComplaints = complaints.filter((c) => {
    const matchesSearch =
      !searchTerm.trim() ||
      c.complaintNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.issue.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "All" || c.category === categoryFilter;
    const matchesPriority = priorityFilter === "All" || c.priority === priorityFilter;
    return matchesSearch && matchesCategory && matchesPriority;
  });

  const mapGroups = complaints.reduce((groups, c) => {
    const key = c.location || "Location pending";
    if (!groups[key]) groups[key] = [];
    groups[key].push(c);
    return groups;
  }, {});

  // ---------------- CRUD + ASSIGN on complaints ----------------
  const updateStatus = (id, status) => {
    setComplaints(complaints.map((c) => (c.id === id ? { ...c, status } : c)));
  };

  const updatePriority = (id, priority) => {
    setComplaints(complaints.map((c) => (c.id === id ? { ...c, priority } : c)));
  };

  const assignStaff = (id, staffName) => {
    setComplaints(complaints.map((c) => (c.id === id ? { ...c, assignedStaff: staffName } : c)));
  };

  const assignVerifier = (id, verifierName) => {
    setComplaints(complaints.map((c) => (c.id === id ? { ...c, assignedVerifier: verifierName } : c)));
  };

  const deleteComplaint = (id) => {
    setComplaints(complaints.filter((c) => c.id !== id));
    setConfirmDeleteComplaintId(null);
    if (selectedId === id && complaints.length > 1) {
      setSelectedId(complaints.find((c) => c.id !== id).id);
    }
  };

  // ---------------- REPORTS & ANALYTICS (category-wise / priority-wise breakdown) ----------------
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

  const staffList = users.filter((u) => u.role === "Staff");
  const verifierList = users.filter((u) => u.role === "Verifier");

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  const initials = admin.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="ad-shell">
      {/* ============ SIDEBAR ============ */}
      <aside className="ad-sidebar">
        <div className="ad-sb-brand">
          <div className="ad-sb-logo">MI</div>
          <div>
            <b>MyRoad India</b>
            <span>Admin Portal</span>
          </div>
        </div>

        <div className="ad-sb-label">Overview</div>
        <nav className="ad-sb-nav">
          <button type="button" className="ad-sb-link active" onClick={() => scrollTo("ad-top")}>
            📊 System Overview
          </button>
          <button type="button" className="ad-sb-link" onClick={() => scrollTo("ad-profile")}>
            👤 My Profile
          </button>
        </nav>

        <div className="ad-sb-label">Management</div>
        <nav className="ad-sb-nav">
          <button type="button" className="ad-sb-link" onClick={() => scrollTo("user-mgmt")}>
            👥 User Management
            <span className="ad-sb-badge">{users.length}</span>
          </button>
          <button type="button" className="ad-sb-link" onClick={() => scrollTo("complaint-mgmt")}>
            📋 Complaint Management
            <span className="ad-sb-badge">{complaints.length}</span>
          </button>
          <button type="button" className="ad-sb-link" onClick={() => scrollTo("assignment-panel")}>
            🧑‍🔧 Staff / Verifier Assignment
          </button>
          <button
            type="button"
            className="ad-sb-link"
            onClick={() => {
              setShowMapView(true);
              scrollTo("map-section");
            }}
          >
            🗺️ Location / Map View
          </button>
        </nav>

        <div className="ad-sb-label">Insights</div>
        <nav className="ad-sb-nav">
          <button type="button" className="ad-sb-link" onClick={() => scrollTo("reports-panel")}>
            📈 Reports &amp; Analytics
          </button>
          <button type="button" className="ad-sb-link" onClick={() => scrollTo("notif-panel")}>
            🔔 Notification Monitoring
            <span className="ad-sb-badge">{notificationFeed.length}</span>
          </button>
        </nav>

        <div className="ad-sb-footer">
          <div className="ad-sb-user">
            <div className="ad-sb-avatar">{initials}</div>
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
            <button className="ad-btn-primary" type="button" onClick={() => setShowAddUser(true)}>
              + Add User
            </button>
            <div className="ad-tb-user" id="ad-profile">
              <div className="ad-tb-avatar">{initials}</div>
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

          {/* STAT CARDS — System Overview */}
          <div className="ad-stats-row">
            {overviewStats.map((stat, i) => (
              <div className={`ad-stat-card tone-${stat.tone}`} key={i}>
                <div className="ad-stat-ic">{stat.icon}</div>
                <div className="ad-stat-num">{stat.value}</div>
                <div className="ad-stat-label">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* USER MANAGEMENT */}
          <div className="ad-panel ad-form-panel" id="user-mgmt">
            <div className="ad-panel-head">
              <h3>User Management</h3>
              <button className="ad-btn-primary small" type="button" onClick={() => setShowAddUser(true)}>
                + Add User
              </button>
            </div>

            <div className="ad-role-counts">
              {userCounts.map((rc) => (
                <div className={`ad-role-chip tone-${roleTone[rc.role]}`} key={rc.role}>
                  <b>{rc.count}</b>
                  <span>{rc.role}s</span>
                </div>
              ))}
            </div>

            {showAddUser && (
              <form className="ad-new-form" onSubmit={addUser}>
                <div className="ad-form-row">
                  <div className="ad-field">
                    <label htmlFor="new-user-name">Name</label>
                    <input
                      id="new-user-name"
                      type="text"
                      placeholder="Full name"
                      value={newUser.name}
                      onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="ad-field">
                    <label htmlFor="new-user-role">Role</label>
                    <select
                      id="new-user-role"
                      value={newUser.role}
                      onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    >
                      {roleOptions.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="ad-field">
                    <label htmlFor="new-user-contact">Contact</label>
                    <input
                      id="new-user-contact"
                      type="text"
                      placeholder="+91 ..."
                      value={newUser.contact}
                      onChange={(e) => setNewUser({ ...newUser, contact: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="ad-form-actions">
                  <button className="ad-btn-outline" type="button" onClick={() => setShowAddUser(false)}>
                    Cancel
                  </button>
                  <button className="ad-btn-primary" type="submit">
                    Add User →
                  </button>
                </div>
              </form>
            )}

            <div className="ad-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Contact</th>
                    <th>Joined</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <React.Fragment key={u.id}>
                      <tr>
                        <td>{u.name}</td>
                        <td>
                          <select
                            className="ad-inline-select"
                            value={u.role}
                            onChange={(e) => updateUserRole(u.id, e.target.value)}
                          >
                            {roleOptions.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="ad-mono">{u.contact}</td>
                        <td className="ad-mono">{u.joined}</td>
                        <td>
                          <button
                            className="ad-icon-btn small danger"
                            type="button"
                            onClick={() => setConfirmDeleteUserId(u.id)}
                            title="Remove user"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                      {confirmDeleteUserId === u.id && (
                        <tr className="ad-edit-row">
                          <td colSpan={5}>
                            <div className="ad-delete-confirm">
                              <span>Remove {u.name} from the system?</span>
                              <div>
                                <button className="ad-btn-outline small" type="button" onClick={() => setConfirmDeleteUserId(null)}>
                                  No
                                </button>
                                <button className="ad-btn-danger small" type="button" onClick={() => deleteUser(u.id)}>
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

          {/* COMPLAINT MANAGEMENT: view / filter / search / priority */}
          <div className="ad-panel ad-form-panel" id="complaint-mgmt">
            <div className="ad-panel-head">
              <h3>Complaint Management</h3>
              <span className="ad-panel-link">{filteredComplaints.length} shown</span>
            </div>

            <div className="ad-filter-row">
              <select className="ad-inline-select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c === "All" ? "All Categories" : c}
                  </option>
                ))}
              </select>
              <select className="ad-inline-select" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
                <option value="All">All Priorities</option>
                {priorityOptions.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div className="ad-table-wrap">
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
                  {filteredComplaints.map((c) => (
                    <React.Fragment key={c.id}>
                      <tr className={selectedId === c.id ? "ad-row-active" : ""} onClick={() => setSelectedId(c.id)}>
                        <td className="ad-mono">{c.complaintNumber}</td>
                        <td>
                          <div className="ad-cat">
                            <span className="ad-cat-dot" style={{ background: colorForCategory(c.category) }}></span>
                            {c.issue}
                          </div>
                        </td>
                        <td>{c.location}</td>
                        <td>
                          <span className={`ad-badge ad-badge-${priorityTone[c.priority]}`}>{c.priority}</span>
                        </td>
                        <td>
                          <span className={`ad-badge ad-badge-${statusTone[c.status]}`}>{c.status}</span>
                        </td>
                        <td className="ad-mono">{c.photos}</td>
                        <td onClick={(e) => e.stopPropagation()}>
                          {c.status === "New" && (
                            <button
                              className="ad-icon-btn small danger"
                              type="button"
                              onClick={() => setConfirmDeleteComplaintId(c.id)}
                              title="Remove eligible record"
                            >
                              🗑️
                            </button>
                          )}
                        </td>
                      </tr>
                      {confirmDeleteComplaintId === c.id && (
                        <tr className="ad-edit-row">
                          <td colSpan={7}>
                            <div className="ad-delete-confirm">
                              <span>Remove complaint {c.complaintNumber}? Only eligible new records can be removed.</span>
                              <div>
                                <button
                                  className="ad-btn-outline small"
                                  type="button"
                                  onClick={() => setConfirmDeleteComplaintId(null)}
                                >
                                  No
                                </button>
                                <button className="ad-btn-danger small" type="button" onClick={() => deleteComplaint(c.id)}>
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

          {/* COMPLAINT DETAILS + UPDATE (status/priority) */}
          <div className="ad-panel ad-form-panel">
            <div className="ad-panel-head">
              <h3>Complaint Details — {selected.complaintNumber}</h3>
            </div>
            <div className="ad-detail-grid">
              <div className="ad-detail-item">
                <span>Citizen</span>
                <b>{selected.citizenName}</b>
              </div>
              <div className="ad-detail-item">
                <span>Category</span>
                <b>{selected.category}</b>
              </div>
              <div className="ad-detail-item">
                <span>Location</span>
                <b>{selected.location}</b>
              </div>
              <div className="ad-detail-item">
                <span>Date Reported</span>
                <b>{selected.date}</b>
              </div>
              <div className="ad-detail-item ad-detail-wide">
                <span>Description</span>
                <b>{selected.description}</b>
              </div>
            </div>
            <div className="ad-update-row">
              <div className="ad-field">
                <label htmlFor="upd-status">Update Status</label>
                <select
                  id="upd-status"
                  className="ad-inline-select"
                  value={selected.status}
                  onChange={(e) => updateStatus(selected.id, e.target.value)}
                >
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="ad-field">
                <label htmlFor="upd-priority">Update Priority</label>
                <select
                  id="upd-priority"
                  className="ad-inline-select"
                  value={selected.priority}
                  onChange={(e) => updatePriority(selected.id, e.target.value)}
                >
                  {priorityOptions.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* STAFF / VERIFIER ASSIGNMENT */}
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
                  <select
                    id="assign-staff"
                    className="ad-inline-select"
                    value={selected.assignedStaff}
                    onChange={(e) => assignStaff(selected.id, e.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {staffList.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="ad-assign-card">
                <h5>Verifier Assignment</h5>
                <p>Verifiers pick this up in their verification queue to approve or reject completed work.</p>
                <div className="ad-field">
                  <label htmlFor="assign-verifier">Assign Verifier</label>
                  <select
                    id="assign-verifier"
                    className="ad-inline-select"
                    value={selected.assignedVerifier}
                    onChange={(e) => assignVerifier(selected.id, e.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {verifierList.map((v) => (
                      <option key={v.id} value={v.name}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* LOCATION / MAP VIEW */}
          {showMapView && (
            <div className="ad-panel ad-form-panel" id="map-section">
              <div className="ad-panel-head">
                <h3>Complaint Locations — Category &amp; Area-wise</h3>
                <span className="ad-panel-link" onClick={() => setShowMapView(false)} style={{ cursor: "pointer" }}>
                  Hide Map View
                </span>
              </div>
              <div className="ad-map-grid">
                {Object.entries(mapGroups).map(([location, group]) => (
                  <div className="ad-map-ward-card" key={location}>
                    <p className="ad-map-ward-name">{location}</p>
                    <div className="ad-map-pins">
                      {group.map((c) => (
                        <span
                          className="ad-map-pin"
                          key={c.id}
                          style={{ background: colorForCategory(c.category) }}
                          title={`${c.complaintNumber} — ${c.category} · ${c.priority}`}
                        >
                          📍
                        </span>
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
                      <div
                        className="ad-bar-fill"
                        style={{ width: `${(b.count / maxCategoryCount) * 100}%`, background: colorForCategory(b.label) }}
                      ></div>
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
                      <div
                        className={`ad-bar-fill tone-${priorityTone[b.label]}`}
                        style={{ width: `${(b.count / maxPriorityCount) * 100}%` }}
                      ></div>
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
              <h3>Notification Monitoring</h3>
              <span className="ad-panel-link">Complete System Monitoring</span>
            </div>
            <div className="ad-notif-list">
              {notificationFeed.map((note, i) => (
                <div className="ad-notif-item" key={i}>
                  <span className={`ad-badge ad-badge-${notifTone[note.type] || "navy"} ad-notif-type`}>{note.type}</span>
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
    </div>
  );
};

export default AdminDashboard;