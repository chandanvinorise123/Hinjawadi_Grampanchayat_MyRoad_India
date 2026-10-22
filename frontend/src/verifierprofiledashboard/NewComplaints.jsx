import React, { useState, useMemo, useEffect } from "react";
import "./NewComplaints.css";
import VerifierComplaintDetails from "./VerifierComplaintDetails";
import ComplaintImage from "./ComplaintImage";

const NewComplaints = ({ complaints, staffOptions = [], onAction, onBack }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPriority, setFilterPriority] = useState("All");
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [assignedStaffId, setAssignedStaffId] = useState("");
  const [verifierRemarks, setVerifierRemarks] = useState("");
  const [savingAction, setSavingAction] = useState(false);
  const [actionError, setActionError] = useState("");

  // 1. Filter only "New Complaints"
  const newComplaints = useMemo(() => {
    return complaints.filter((c) => c.queue === "New Complaints");
  }, [complaints]);

  // 2. Apply Search and Priority Filters
  const filteredComplaints = useMemo(() => {
    return newComplaints.filter((c) => {
      const matchesSearch =
        String(c.complaintNumber || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(c.category || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(c.location || "").toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesPriority = filterPriority === "All" || c.priority === filterPriority;
      
      return matchesSearch && matchesPriority;
    });
  }, [newComplaints, searchTerm, filterPriority]);

  // Helper for badge colors
  const getPriorityTone = (priority) => {
    if (priority === "High" || priority === "Critical") return "red";
    if (priority === "Medium" || priority === "Urgent") return "amber";
    return "green";
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: "Pending Verification",
      in_review: "Under Review",
      verified: "Verified",
      rejected: "Sent Back",
    };
    return labels[status] || status;
  };

  const getStatusTone = (status) => {
    const tones = {
      pending: "amber",
      in_review: "orange",
      verified: "green",
      rejected: "red",
    };
    return tones[status] || "navy";
  };

  const selectComplaint = (complaint) => {
    setSelectedComplaint(complaint);
    setAssignedStaffId(
      complaint.assignedStaffId ||
      staffOptions.find((staff) => staff.name === complaint.assignedStaff)?._id ||
      ""
    );
    setVerifierRemarks("");
    setActionError("");
  };

  const handleAction = async (action) => {
    if (action === "accept" && !assignedStaffId) {
      setActionError("Select a staff member before accepting this complaint.");
      return;
    }
    if (action === "reject" && !verifierRemarks.trim()) {
      setActionError("Add remarks explaining why this complaint is rejected.");
      return;
    }

    setSavingAction(true);
    setActionError("");
    try {
      await onAction(selectedComplaint.id, action, {
        staffId: assignedStaffId,
        remarks: verifierRemarks.trim(),
      });
      setSelectedComplaint(null);
    } catch (error) {
      setActionError(error.message || "Unable to save the complaint decision.");
    } finally {
      setSavingAction(false);
    }
  };

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") setSelectedComplaint(null);
    };
    if (selectedComplaint) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "auto";
    };
  }, [selectedComplaint]);

  return (
    <div className="nc-shell">
      {/* Header */}
      <div className="nc-header">
        <button className="nc-back-btn" onClick={onBack}>
          ← Back to Dashboard
        </button>
        <h2>🆕 New Complaints</h2>
      </div>

      <div className="nc-container">
        {/* ✅ Summary Cards (Two Distinct Cards) */}
        <div className="nc-summary-cards">
          <div className="nc-summary-card">
            <span className="nc-summary-label">Total New Complaints</span>
            <span className="nc-summary-value">{newComplaints.length}</span>
          </div>
          <div className="nc-summary-card">
            <span className="nc-summary-label">Filtered Results</span>
            <span className="nc-summary-value">{filteredComplaints.length}</span>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="nc-controls">
          <div className="nc-search">
            <span>🔍</span>
            <input
              type="text"
              placeholder="Search by complaint number, category, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="nc-filter">
            <label>Priority:</label>
            <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
              <option value="All">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="Urgent">Urgent</option>
              <option value="Normal">Normal</option>
            </select>
          </div>
        </div>

        {/* Complaints Table */}
        <div className="nc-table-container">
          {filteredComplaints.length === 0 ? (
            <div className="nc-empty-state">
              <div className="nc-empty-icon">📭</div>
              <h4>No New Complaints Found</h4>
              <p>Try adjusting your search or filter criteria.</p>
            </div>
          ) : (
            <table className="nc-table">
              <thead>
                <tr>
                  <th>Complaint No.</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredComplaints.map((c) => (
                  <tr key={c.id} className="nc-row">
                    <td className="nc-mono">{c.complaintNumber}</td>
                    <td>
                      <div className="nc-category">
                        <span className="nc-cat-dot" style={{ background: getCategoryColor(c.category) }}></span>
                        {c.category}
                      </div>
                    </td>
                    <td>
                      <span className={`nc-badge nc-badge-${getPriorityTone(c.priority)}`}>
                        {c.priority}
                      </span>
                    </td>
                    <td>{c.location}</td>
                    <td>
                      <span className={`nc-badge nc-badge-${getStatusTone(c.status)}`}>
                        {getStatusLabel(c.status)}
                      </span>
                    </td>
                    <td>
                      <button 
                        className="nc-view-btn"
                        onClick={() => selectComplaint(c)}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ✅ OVERLAY MODAL for Complete Complaint Details */}
      {selectedComplaint && (
        <div className="nc-modal-overlay" onClick={() => setSelectedComplaint(null)}>
          <div className="nc-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="nc-modal-header">
              <div>
                <span className="nc-modal-badge">Complaint Details</span>
                <h3>{selectedComplaint.complaintNumber}</h3>
              </div>
              <button className="nc-modal-close" onClick={() => setSelectedComplaint(null)}>✕</button>
            </div>

            <div className="nc-modal-body">
              {/* Top Info Grid */}
              <div className="nc-modal-info-grid">
                <div className="nc-info-item">
                  <span>Category</span>
                  <b>{selectedComplaint.category}</b>
                </div>
                <div className="nc-info-item">
                  <span>Priority</span>
                  <b className={`nc-text-${getPriorityTone(selectedComplaint.priority)}`}>
                    {selectedComplaint.priority}
                  </b>
                </div>
                <div className="nc-info-item">
                  <span>Location</span>
                  <b>{selectedComplaint.location}</b>
                </div>
                <div className="nc-info-item">
                  <span>Status</span>
                  <b>{getStatusLabel(selectedComplaint.status)}</b>
                </div>
              </div>

              {/* Citizen Info */}
              <div className="nc-modal-section">
                <h4>👤 Citizen Information</h4>
                <div className="nc-citizen-row">
                  <div><span>Name:</span> <b>{selectedComplaint.citizenName}</b></div>
                  <div><span>Contact:</span> <b>{selectedComplaint.citizenContact}</b></div>
                </div>
              </div>

              {/* Description */}
              <div className="nc-modal-section">
                <h4>📝 Description</h4>
                <p className="nc-description">{selectedComplaint.description}</p>
              </div>
              <VerifierComplaintDetails complaint={selectedComplaint} />

              {/* Photos */}
              <div className="nc-modal-section">
                <h4>📷 Attached Photos</h4>
                <div className="nc-photos-grid">
                  {selectedComplaint.photos?.before && (
                    <div className="nc-photo-box">
                      <span className="nc-photo-label">Before Repair</span>
                      <div className="nc-photo-placeholder">
                        <ComplaintImage key={`${selectedComplaint.id}-before`} src={selectedComplaint.photos.before} alt="Before repair evidence" fallbackClassName="nc-photo-load-error" />
                      </div>
                    </div>
                  )}
                  {!selectedComplaint.photos?.before && !selectedComplaint.photos?.site && !selectedComplaint.photos?.after && (
                    <p>No photographs were attached to this complaint.</p>
                  )}
                  {selectedComplaint.photos?.site && (
                    <div className="nc-photo-box">
                      <span className="nc-photo-label">Site Photo</span>
                      <div className="nc-photo-placeholder">
                        <ComplaintImage key={`${selectedComplaint.id}-site`} src={selectedComplaint.photos.site} alt="Site inspection evidence" fallbackClassName="nc-photo-load-error" />
                      </div>
                    </div>
                  )}
                  {selectedComplaint.photos?.after && (
                    <div className="nc-photo-box">
                      <span className="nc-photo-label">After Repair</span>
                      <div className="nc-photo-placeholder">
                        <ComplaintImage key={`${selectedComplaint.id}-after`} src={selectedComplaint.photos.after} alt="After repair evidence" fallbackClassName="nc-photo-load-error" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {["pending", "in_action"].includes(selectedComplaint.status) && (
              <div className="nc-review-actions">
                {actionError && <p className="nc-review-error" role="alert">{actionError}</p>}
                <label htmlFor="nc-assigned-staff">Assign staff to accept this complaint *</label>
                <select
                  id="nc-assigned-staff"
                  value={assignedStaffId}
                  disabled={savingAction}
                  onChange={(event) => setAssignedStaffId(event.target.value)}
                >
                  <option value="">Select staff member</option>
                  {staffOptions.map((staff) => (
                    <option key={staff._id} value={staff._id}>
                      {staff.name}{staff.staffId ? ` · ${staff.staffId}` : ""}
                    </option>
                  ))}
                </select>
                <label htmlFor="nc-verifier-remarks">Rejection remarks (required to reject)</label>
                <textarea
                  id="nc-verifier-remarks"
                  rows="3"
                  value={verifierRemarks}
                  disabled={savingAction}
                  onChange={(event) => setVerifierRemarks(event.target.value)}
                  placeholder="Explain the issue requiring rejection."
                />
                <div className="nc-review-buttons">
                  <button type="button" disabled={savingAction} onClick={() => handleAction("reject")}>
                    Reject Complaint
                  </button>
                  <button type="button" disabled={savingAction} onClick={() => handleAction("accept")}>
                    {savingAction ? "Saving..." : "Accept & Assign Staff"}
                  </button>
                </div>
              </div>
            )}

            <div className="nc-modal-footer">
              <button className="nc-modal-close-btn" onClick={() => setSelectedComplaint(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function for category colors (matches dashboard)
const getCategoryColor = (category) => {
  const mapColors = ["#e07b1c", "#2e6cb0", "#1d8a5c", "#c1900a", "#cf4438", "#7a5c9e"];
  let hash = 0;
  const value = String(category || "");
  for (let i = 0; i < value.length; i++) hash = value.charCodeAt(i) + ((hash << 5) - hash);
  return mapColors[Math.abs(hash) % mapColors.length];
};

export default NewComplaints;