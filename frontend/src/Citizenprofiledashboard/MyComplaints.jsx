import React, { useState, useMemo } from "react";
import "./MyComplaints.css";

const lifecycleStages = [
  "Complaint Registered",
  "Complaint Verified",
  "Assigned to Staff/Officer",
  "Action Initiated",
  "Work Completed",
  "Verification",
  "Complaint Closed",
];

const stageTone = ["amber", "amber", "orange", "orange", "orange", "amber", "green"];

const colorForCategory = (category = "") => {
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  const mapColors = ["#e07b1c", "#2e6cb0", "#1d8a5c", "#c1900a", "#cf4438", "#7a5c9e"];
  return mapColors[Math.abs(hash) % mapColors.length];
};

const MyComplaints = ({ complaints, onBack, onDelete }) => {
  // ✅ Use local state to handle deletions dynamically
  const initialData = complaints || [];
  const [localComplaints, setLocalComplaints] = useState(initialData);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  
  // ✅ NEW: Selection and Delete State
  const [selectedIds, setSelectedIds] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // 'bulk' or specific complaint ID

  const getFilterStatus = (stage) => {
    if (stage <= 1) return "Pending";
    if (stage >= 2 && stage <= 4) return "Under Process";
    if (stage === 5) return "Resolved";
    if (stage === 6) return "Closed";
    return "Unknown";
  };

  const filteredComplaints = useMemo(() => {
    return localComplaints.filter((c) => {
      const matchesSearch =
        c.complaintNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.location.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = filterStatus === "All" || getFilterStatus(c.stage) === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [localComplaints, searchTerm, filterStatus]);

  // ✅ NEW: Selection Handlers
  const toggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredComplaints.map(c => c.id));
    } else {
      setSelectedIds([]);
    }
  };

  const toggleSelect = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(itemId => itemId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // ✅ NEW: Delete Handlers
  const handleDeleteClick = (target) => {
    setDeleteTarget(target);
    setShowDeleteConfirm(true);
    setSelectedComplaint(null); // Close details modal if open
  };

  const confirmDelete = () => {
    const idsToDelete = deleteTarget === 'bulk' ? selectedIds : [deleteTarget];
    const updatedComplaints = localComplaints.filter(c => !idsToDelete.includes(c.id));
    
    setLocalComplaints(updatedComplaints);
    if (onDelete) onDelete(updatedComplaints); // Notify parent component if needed
    
    setSelectedIds([]);
    setShowDeleteConfirm(false);
    setDeleteTarget(null);
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setDeleteTarget(null);
  };

  // Close modals on Escape key
  React.useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        setSelectedComplaint(null);
        if (showDeleteConfirm) cancelDelete();
      }
    };
    if (selectedComplaint || showDeleteConfirm) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "auto";
    };
  }, [selectedComplaint, showDeleteConfirm]);

  const isAllSelected = filteredComplaints.length > 0 && selectedIds.length === filteredComplaints.length;
  const isIndeterminate = selectedIds.length > 0 && selectedIds.length < filteredComplaints.length;

  return (
    <div className="cdp-mc-page">
      <div className="cdp-mc-header">
        <button className="cdp-back-btn" onClick={onBack}>← Back to Dashboard</button>
        <h1>My Complaints</h1>
      </div>

      <div className="cdp-mc-content">
        <p className="cdp-mc-subtitle">Track and manage all the issues you have reported.</p>

        <div className="cdp-mc-controls">
          <div className="cdp-mc-search">
            <span className="cdp-mc-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by complaint number, category, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="cdp-mc-filter">
            <label>Status:</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Under Process">Under Process</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
        </div>

        {/* ✅ NEW: Bulk Action Bar */}
        {selectedIds.length > 0 && (
          <div className="cdp-mc-bulk-bar">
            <span className="cdp-mc-bulk-text">{selectedIds.length} complaint(s) selected</span>
            <button className="cdp-mc-bulk-delete-btn" onClick={() => handleDeleteClick('bulk')}>
              🗑️ Delete Selected
            </button>
          </div>
        )}

        <div className="cdp-mc-table-container">
          {filteredComplaints.length === 0 ? (
            <div className="cdp-mc-empty-state">
              <div className="cdp-mc-empty-icon">📭</div>
              <h4>No Complaints Found</h4>
              <p>Try adjusting your search or filter criteria.</p>
            </div>
          ) : (
            <table className="cdp-mc-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      ref={input => { if (input) input.indeterminate = isIndeterminate; }}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th>Complaint No.</th>
                  <th>Category</th>
                  <th>Date</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredComplaints.map((c) => (
                  <tr key={c.id} className={`cdp-mc-row ${selectedIds.includes(c.id) ? 'cdp-mc-row-selected' : ''}`}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(c.id)}
                        onChange={() => toggleSelect(c.id)}
                      />
                    </td>
                    <td className="cdp-mc-mono">{c.complaintNumber}</td>
                    <td>
                      <div className="cdp-mc-category">
                        <span className="cdp-mc-cat-dot" style={{ background: colorForCategory(c.category) }}></span>
                        {c.category}
                      </div>
                    </td>
                    <td className="cdp-mc-mono">{c.date}</td>
                    <td>{c.location}</td>
                    <td>
                      <span className={`cdp-mc-badge cdp-mc-badge-${stageTone[c.stage]}`}>
                        {lifecycleStages[c.stage]}
                      </span>
                    </td>
                    <td>
                      <div className="cdp-mc-actions">
                        <button className="cdp-mc-view-btn" onClick={() => setSelectedComplaint(c)}>
                          View Details
                        </button>
                        <button 
                          className="cdp-mc-delete-icon-btn"
                          onClick={() => handleDeleteClick(c.id)}
                          title="Delete Complaint"
                        >
                          🗑️
                        </button>
                      </div>
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
        <div className="cdp-mc-modal-overlay" onClick={() => setSelectedComplaint(null)}>
          <div className="cdp-mc-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="cdp-mc-modal-header">
              <div>
                <span className="cdp-mc-modal-badge">Complaint Details</span>
                <h3>{selectedComplaint.complaintNumber}</h3>
              </div>
              <button className="cdp-mc-modal-close" onClick={() => setSelectedComplaint(null)}>✕</button>
            </div>
            <div className="cdp-mc-modal-body">
              <div className="cdp-mc-modal-info-grid">
                <div className="cdp-mc-info-item"><span>Category</span><b>{selectedComplaint.category}</b></div>
                <div className="cdp-mc-info-item"><span>Date Submitted</span><b>{selectedComplaint.date}</b></div>
                <div className="cdp-mc-info-item"><span>Location</span><b>{selectedComplaint.location}</b></div>
                <div className="cdp-mc-info-item">
                  <span>Current Status</span>
                  <b className={`cdp-mc-text-${stageTone[selectedComplaint.stage]}`}>{lifecycleStages[selectedComplaint.stage]}</b>
                </div>
              </div>
              <div className="cdp-mc-modal-section">
                <h4>📝 Issue Description</h4>
                <p className="cdp-mc-modal-description">{selectedComplaint.description || "No description provided."}</p>
              </div>
              {(selectedComplaint.photos?.before || selectedComplaint.photos?.site || selectedComplaint.photos?.after) && (
                <div className="cdp-mc-modal-section">
                  <h4>📷 Attached Photos</h4>
                  <div className="cdp-mc-photos-grid">
                    {selectedComplaint.photos.before && (
                      <div className="cdp-mc-photo-box"><span className="cdp-mc-photo-label">Before Repair</span><div className="cdp-mc-photo-placeholder">📷 {selectedComplaint.photos.before}</div></div>
                    )}
                    {selectedComplaint.photos.site && (
                      <div className="cdp-mc-photo-box"><span className="cdp-mc-photo-label">Site Photo</span><div className="cdp-mc-photo-placeholder">📷 {selectedComplaint.photos.site}</div></div>
                    )}
                    {selectedComplaint.photos.after && (
                      <div className="cdp-mc-photo-box"><span className="cdp-mc-photo-label">After Repair</span><div className="cdp-mc-photo-placeholder">📷 {selectedComplaint.photos.after}</div></div>
                    )}
                  </div>
                </div>
              )}
              <div className="cdp-mc-modal-section">
                <h4>ℹ️ Additional Details</h4>
                <div className="cdp-mc-detail-row">
                  <span>Specific Issue:</span>
                  <strong>{selectedComplaint.issue || selectedComplaint.issueType || "General Issue"}</strong>
                </div>
              </div>
            </div>
            <div className="cdp-mc-modal-footer">
              <button className="cdp-mc-modal-close-btn" onClick={() => setSelectedComplaint(null)}>Close Details</button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ NEW: Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="cdp-mc-modal-overlay" onClick={cancelDelete}>
          <div className="cdp-mc-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cdp-mc-confirm-header">
              <h3>⚠️ Confirm Deletion</h3>
              <button className="cdp-mc-modal-close" onClick={cancelDelete}>✕</button>
            </div>
            <div className="cdp-mc-confirm-body">
              <p>
                {deleteTarget === 'bulk' 
                  ? `Are you sure you want to permanently delete the ${selectedIds.length} selected complaint(s)? This action cannot be undone.`
                  : "Are you sure you want to permanently delete this complaint? This action cannot be undone."}
              </p>
            </div>
            <div className="cdp-mc-confirm-footer">
              <button className="cdp-mc-confirm-cancel-btn" onClick={cancelDelete}>Cancel</button>
              <button className="cdp-mc-confirm-delete-btn" onClick={confirmDelete}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyComplaints;