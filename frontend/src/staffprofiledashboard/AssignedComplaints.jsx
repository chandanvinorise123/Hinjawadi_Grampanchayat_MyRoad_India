import React, { useState } from "react";
import "./AssignedComplaints.css";

// ✅ HARDCODED MOCK DATA
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
    assignedStaffId: "STF-0142",
    citizenPhotos: ["citizen-photo-1.jpg", "citizen-photo-2.jpg"],
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
    assignedStaffId: "STF-0142",
    citizenPhotos: [],
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
    assignedStaffId: "STF-0999",
    citizenPhotos: ["leak-photo.jpg"],
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
    assignedStaffId: "STF-0142",
    citizenPhotos: ["bin-photo.jpg"],
  },
];

const AssignedComplaints = ({ complaints = seedAssigned, staffId = "STF-0142", onBack }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPriority, setFilterPriority] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [selectedComplaint, setSelectedComplaint] = useState(null); // For table row selection
  const [viewingComplaint, setViewingComplaint] = useState(null); // For modal overlay

  // ✅ 1. FILTER: Only keep complaints assigned to this specific staff member
  const myAssignedComplaints = complaints.filter(
    (c) => c.assignedStaffId === staffId
  );

  // Helper to map status string to stage number
  const getStageValue = (status) => {
    const map = {
      "Action Initiated": 0,
      "Work In Progress": 1,
      "Work Completed": 2,
      "After-Repair Upload": 3,
      "Verification": 4,
      "Work Resolved / Closed": 5,
    };
    return map[status] !== undefined ? map[status] : -1;
  };

  const stageLabels = [
    "Action Initiated",
    "Work In Progress",
    "Work Completed",
    "After-Repair Upload",
    "Verification",
    "Work Resolved / Closed",
  ];

  // ✅ 2. FILTER: Apply search and dropdown filters
  const filteredComplaints = myAssignedComplaints.filter((c) => {
    const matchesSearch =
      c.complaintNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.issue.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPriority = filterPriority === "All" || c.priority === filterPriority;
    const matchesStatus = filterStatus === "All" || c.stage === getStageValue(filterStatus);
    
    return matchesSearch && matchesPriority && matchesStatus;
  });

  const priorityTone = { High: "red", Medium: "amber", Low: "green" };
  const stageTone = ["amber", "orange", "orange", "orange", "amber", "green"];

  // Close modal on Escape key
  React.useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") setViewingComplaint(null);
    };
    if (viewingComplaint) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "auto";
    };
  }, [viewingComplaint]);

  return (
    <div className="ac-shell">
      {/* Header with Back Button */}
      <div className="ac-header">
        <button className="ac-back-btn" onClick={onBack}>
          ← Back to Dashboard
        </button>
        <div>
          <h2>My Assigned Complaints</h2>
          <p style={{ fontSize: "13px", color: "var(--ink-soft)", margin: "4px 0 0 0" }}>
            Showing {myAssignedComplaints.length} complaint(s) assigned to you
          </p>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="ac-controls">
        <div className="ac-search">
          <span>🔍</span>
          <input
            type="text"
            placeholder="Search by complaint number, issue, or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="ac-filters">
          <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
            <option value="All">All Priorities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="All">All Statuses</option>
            {stageLabels.map((label) => (
              <option key={label} value={label}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Complaints Table */}
      <div className="ac-table-container">
        <table className="ac-table">
          <thead>
            <tr>
              <th>Complaint No.</th>
              <th>Category & Issue</th>
              <th>Location</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Due Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredComplaints.length === 0 ? (
              <tr>
                <td colSpan="7" className="ac-empty">
                  {myAssignedComplaints.length === 0 
                    ? "You currently have no complaints assigned to you." 
                    : "No complaints match your search or filters."}
                </td>
              </tr>
            ) : (
              filteredComplaints.map((c) => (
                <React.Fragment key={c.id}>
                  <tr 
                    className={selectedComplaint?.id === c.id ? "ac-row-active" : ""} 
                    onClick={() => setSelectedComplaint(c)}
                  >
                    <td className="ac-mono">{c.complaintNumber}</td>
                    <td>
                      <div className="ac-category">
                        <span className="ac-cat-dot" style={{ background: getCategoryColor(c.category) }}></span>
                        {c.issue}
                      </div>
                    </td>
                    <td>{c.location}</td>
                    <td>
                      <span className={`ac-badge ac-badge-${priorityTone[c.priority]}`}>{c.priority}</span>
                    </td>
                    <td>
                      <span className={`ac-badge ac-badge-${stageTone[c.stage]}`}>{stageLabels[c.stage]}</span>
                    </td>
                    <td className="ac-mono">{c.dueDate}</td>
                    <td>
                      <button 
                        className="ac-view-btn" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewingComplaint(c);
                        }}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ✅ OVERLAY MODAL for Complaint Details */}
      {viewingComplaint && (
        <div className="ac-modal-overlay" onClick={() => setViewingComplaint(null)}>
          <div className="ac-modal-content" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="ac-modal-header">
              <h3>Complete Complaint Details: {viewingComplaint.complaintNumber}</h3>
              <button className="ac-modal-close" onClick={() => setViewingComplaint(null)}>✕</button>
            </div>

            {/* Modal Body */}
            <div className="ac-modal-body">
              {/* Top Info Row */}
              <div className="ac-modal-info-row">
                <div className="ac-modal-info-item">
                  <span className="ac-modal-label">Category</span>
                  <b>{viewingComplaint.category}</b>
                </div>
                <div className="ac-modal-info-item">
                  <span className="ac-modal-label">Specific Issue</span>
                  <b>{viewingComplaint.issue}</b>
                </div>
                <div className="ac-modal-info-item">
                  <span className="ac-modal-label">Citizen Name</span>
                  <b>{viewingComplaint.citizenName}</b>
                </div>
                <div className="ac-modal-info-item">
                  <span className="ac-modal-label">Citizen Contact</span>
                  <b>{viewingComplaint.citizenContact}</b>
                </div>
              </div>

              {/* Description */}
              <div className="ac-modal-section">
                <span className="ac-modal-label">Description</span>
                <p className="ac-modal-description">{viewingComplaint.description}</p>
              </div>

              {/* Citizen Uploaded Photos */}
              <div className="ac-modal-section">
                <span className="ac-modal-label">Citizen Uploaded Photos</span>
                {viewingComplaint.citizenPhotos && viewingComplaint.citizenPhotos.length > 0 ? (
                  <div className="ac-photos-grid">
                    {viewingComplaint.citizenPhotos.map((photo, idx) => (
                      <div key={idx} className="ac-photo-box">
                        📷 {photo}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="ac-empty-text">No photos uploaded by citizen.</p>
                )}
              </div>

              {/* Location */}
              <div className="ac-modal-section">
                <span className="ac-modal-label">Location</span>
                <div className="ac-location-row">
                  <b>{viewingComplaint.location}</b>
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(viewingComplaint.location)}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="ac-navigate-btn"
                  >
                    📍 Navigate to Location
                  </a>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="ac-modal-footer">
              <button className="ac-modal-close-btn" onClick={() => setViewingComplaint(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function for category colors
const getCategoryColor = (category) => {
  const mapColors = ["#e07b1c", "#2e6cb0", "#1d8a5c", "#c1900a", "#cf4438", "#7a5c9e"];
  let hash = 0;
  for (let i = 0; i < category.length; i++) hash = category.charCodeAt(i) + ((hash << 5) - hash);
  return mapColors[Math.abs(hash) % mapColors.length];
};

export default AssignedComplaints;