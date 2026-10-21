import React, { useState } from "react";
import "./AssignedComplaints.css";
import StaffComplaintDetails from "./StaffComplaintDetails";


const AssignedComplaints = ({
  complaints = [],
  staffId = "",
  staffName = "",
  staffUserId = "",
  onBack,
  allAssigned = false,
  loadError = "",
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPriority, setFilterPriority] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [selectedComplaint, setSelectedComplaint] = useState(null); // For table row selection
  const [viewingComplaint, setViewingComplaint] = useState(null); // For modal overlay

  const normalizedStaffName = String(staffName || "").trim().toLowerCase();
  const normalizedStaffId = String(staffId || "").trim().toLowerCase();
  const normalizedUserId = String(staffUserId || "").trim().toLowerCase();
  const isAssignedToStaff = (complaint) => {
    const assignedStaffId = String(complaint.assignedStaffId || "").trim().toLowerCase();
    if (assignedStaffId) return assignedStaffId === normalizedUserId;
    const assignee = String(complaint.assignedStaff || "").trim().toLowerCase();
    return Boolean(assignee && [normalizedStaffName, normalizedStaffId, normalizedUserId].includes(assignee));
  };
  const hasStaffAssignment = (complaint) => {
    const assignedStaffId = String(complaint.assignedStaffId || "").trim().toLowerCase();
    const assignedStaff = String(complaint.assignedStaff || "").trim().toLowerCase();
    return Boolean(
      (assignedStaffId && !["unassigned", "not assigned", "none", "null"].includes(assignedStaffId)) ||
      (assignedStaff && !["unassigned", "not assigned", "none", "null"].includes(assignedStaff))
    );
  };
  const staffComplaints = allAssigned
    ? complaints.filter(hasStaffAssignment)
    : complaints.filter(isAssignedToStaff);
  const assignmentTime = (complaint) => {
    const latestAssignment = (complaint.log || []).reduce((latest, entry) => {
      if (!/assigned/i.test(entry.text || "")) return latest;
      const timestamp = new Date(entry.time || 0).getTime();
      return Number.isFinite(timestamp) ? Math.max(latest, timestamp) : latest;
    }, 0);
    if (latestAssignment) return latestAssignment;
    const timestamp = new Date(complaint.updatedAt || complaint.createdAt || 0).getTime();
    return Number.isFinite(timestamp) ? timestamp : 0;
  };
  const sortedComplaints = [...staffComplaints].sort((first, second) =>
    assignmentTime(second) - assignmentTime(first)
  );
  const statuses = [...new Set(sortedComplaints.map((complaint) => complaint.status).filter(Boolean))];

  const filteredComplaints = sortedComplaints.filter((c) => {
    const matchesSearch =
      String(c.complaintNumber || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(c.issue || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(c.location || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(c.citizenName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(c.assignedStaff || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(c.assignedStaffId || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(c.assignedVerifier || "").toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesPriority = filterPriority === "All" || c.priority === filterPriority;
    const matchesStatus = filterStatus === "All" || c.status === filterStatus;
    
    return matchesSearch && matchesPriority && matchesStatus;
  });

  const priorityTone = { Critical: "red", Urgent: "amber", Normal: "green", High: "red", Medium: "amber", Low: "green" };

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
          <h2>{allAssigned ? "Complaint Assigned" : "Assigned Complaints"}</h2>
          <p style={{ fontSize: "13px", color: "var(--ink-soft)", margin: "4px 0 0 0" }}>
            Showing {staffComplaints.length} {allAssigned ? "complaints assigned to staff" : "complaints assigned to you"}
          </p>
        </div>
      </div>
      {loadError && <p className="ac-load-error" role="alert">{loadError}</p>}

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
            <option value="Critical">Critical</option>
            <option value="Urgent">Urgent</option>
            <option value="Normal">Normal</option>
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="All">All Statuses</option>
            {statuses.map((status) => (
              <option key={status} value={status}>{status}</option>
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
              <th>Assigned Staff</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredComplaints.length === 0 ? (
              <tr>
                <td colSpan="7" className="ac-empty">
                  {staffComplaints.length === 0
                    ? allAssigned
                      ? "No complaints assigned to staff are available yet."
                      : "No complaints are assigned to you yet."
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
                      <span className="ac-badge ac-badge-orange">{c.status || "Unknown"}</span>
                    </td>
                    <td>
                      {c.assignedStaff || c.assignedStaffId
                        ? `${c.assignedStaff || c.assignedStaffId}${isAssignedToStaff(c) ? " (You)" : ""}`
                        : "Not assigned"}
                    </td>
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
              <StaffComplaintDetails complaint={viewingComplaint} />
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
const getCategoryColor = (category = "") => {
  const mapColors = ["#e07b1c", "#2e6cb0", "#1d8a5c", "#c1900a", "#cf4438", "#7a5c9e"];
  let hash = 0;
  for (let i = 0; i < category.length; i++) hash = category.charCodeAt(i) + ((hash << 5) - hash);
  return mapColors[Math.abs(hash) % mapColors.length];
};

export default AssignedComplaints;