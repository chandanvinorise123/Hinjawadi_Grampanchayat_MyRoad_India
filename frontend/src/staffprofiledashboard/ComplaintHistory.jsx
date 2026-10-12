import React, { useState, useMemo, useEffect, useRef } from "react";
import "./ComplaintHistory.css";

const ComplaintHistory = ({ complaints, onBack }) => {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [filterType, setFilterType] = useState("All");
  const modalRef = useRef(null);

  const stageLabels = [
    "Action Initiated", "Work In Progress", "Work Completed",
    "After-Repair Upload", "Verification", "Work Resolved / Closed",
  ];

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") setSelectedEvent(null);
    };
    if (selectedEvent) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden"; // Prevent background scrolling
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "auto";
    };
  }, [selectedEvent]);

  // Close modal when clicking outside
  const handleBackdropClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      setSelectedEvent(null);
    }
  };

  // 1. Calculate Overview Stats
  const stats = useMemo(() => ({
    totalAssigned: complaints.length,
    solved: complaints.filter((c) => c.stage === 5).length,
    inProgress: complaints.filter((c) => c.stage > 0 && c.stage < 5).length,
    pending: complaints.filter((c) => c.stage === 0).length,
  }), [complaints]);

  // 2. Generate Flat History Log from Complaints
  const historyLog = useMemo(() => {
    const log = [];
    complaints.forEach((c) => {
      log.push({
        id: `${c.id}-assign`,
        complaintNumber: c.complaintNumber,
        issue: c.issue,
        type: "Assignment",
        date: "Initial",
        description: `Complaint assigned for ${c.location}.`,
        photos: [],
        complaintRef: c
      });

      if (c.stage >= 0) {
        log.push({
          id: `${c.id}-status`,
          complaintNumber: c.complaintNumber,
          issue: c.issue,
          type: "Status Change",
          date: "Recent",
          description: `Status updated to: ${stageLabels[c.stage]}`,
          photos: [],
          complaintRef: c
        });
      }

      if (c.inspection?.remarks) {
        log.push({
          id: `${c.id}-inspect`,
          complaintNumber: c.complaintNumber,
          issue: c.issue,
          type: "Inspection",
          date: c.inspection.inspectionDate ? new Date(c.inspection.inspectionDate).toLocaleDateString() : "Recent",
          description: c.inspection.remarks,
          photos: c.inspection.sitePhoto ? [c.inspection.sitePhoto] : [],
          complaintRef: c
        });
      }

      if (c.inspection?.actionTaken) {
        log.push({
          id: `${c.id}-action`,
          complaintNumber: c.complaintNumber,
          issue: c.issue,
          type: "Action Taken",
          date: c.inspection.completionDate ? new Date(c.inspection.completionDate).toLocaleDateString() : "Recent",
          description: c.inspection.actionTaken,
          photos: c.inspection.completionPhoto ? [c.inspection.completionPhoto] : [],
          complaintRef: c
        });
      }
    });
    return log.sort((a, b) => (a.date === "Initial" ? -1 : 1));
  }, [complaints]);

  const filteredLog = filterType === "All" 
    ? historyLog 
    : historyLog.filter((e) => e.type === filterType);

  const getTypeBadgeClass = (type) => {
    switch (type) {
      case "Assignment": return "ch-badge-navy";
      case "Status Change": return "ch-badge-amber";
      case "Inspection": return "ch-badge-blue";
      case "Action Taken": return "ch-badge-green";
      default: return "ch-badge-gray";
    }
  };

  return (
    <div className="ch-shell">
      {/* Header */}
      <div className="ch-header">
        <button className="ch-back-btn" onClick={onBack}>← Back to Dashboard</button>
        <h2>Complaint History & Logs</h2>
      </div>

      <div className="ch-container">
        {/* 1. Overview Stats */}
        <div className="ch-stats-row">
          <div className="ch-stat-card ch-stat-navy">
            <div className="ch-stat-num">{stats.totalAssigned}</div>
            <div className="ch-stat-label">Total Assigned</div>
          </div>
          <div className="ch-stat-card ch-stat-green">
            <div className="ch-stat-num">{stats.solved}</div>
            <div className="ch-stat-label">Solved / Closed</div>
          </div>
          <div className="ch-stat-card ch-stat-orange">
            <div className="ch-stat-num">{stats.inProgress}</div>
            <div className="ch-stat-label">In Progress</div>
          </div>
          <div className="ch-stat-card ch-stat-amber">
            <div className="ch-stat-num">{stats.pending}</div>
            <div className="ch-stat-label">Pending Action</div>
          </div>
        </div>

        {/* 2. History Table */}
        <div className="ch-table-card">
          <div className="ch-table-header">
            <h3>Activity History Log</h3>
            <div className="ch-filters">
              {["All", "Status Change", "Inspection", "Action Taken"].map((type) => (
                <button
                  key={type}
                  className={`ch-filter-btn ${filterType === type ? "active" : ""}`}
                  onClick={() => setFilterType(type)}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="ch-table-wrap">
            <table className="ch-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Complaint No.</th>
                  <th>Update Type</th>
                  <th>Description / Remarks</th>
                  <th>Photos</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredLog.map((event) => (
                  <tr key={event.id}>
                    <td className="ch-mono">{event.date}</td>
                    <td className="ch-mono ch-complaint-link">{event.complaintNumber}</td>
                    <td>
                      <span className={`ch-badge ${getTypeBadgeClass(event.type)}`}>
                        {event.type}
                      </span>
                    </td>
                    <td className="ch-desc">{event.description}</td>
                    <td>
                      {event.photos.length > 0 ? (
                        <span className="ch-photo-count">📷 {event.photos.length}</span>
                      ) : (
                        <span className="ch-empty-text">-</span>
                      )}
                    </td>
                    <td>
                      <button 
                        className="ch-view-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvent(event);
                        }}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ✅ 3. OVERLAY MODAL - Shows when View Details is clicked */}
      {selectedEvent && (
        <div className="ch-modal-overlay" onClick={handleBackdropClick}>
          <div className="ch-modal-content" ref={modalRef}>
            {/* Modal Header */}
            <div className="ch-modal-header">
              <h3>
                Details: {selectedEvent.complaintNumber} - {selectedEvent.issue}
              </h3>
              <button 
                className="ch-modal-close" 
                onClick={() => setSelectedEvent(null)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="ch-modal-body">
              {/* Top Info Row */}
              <div className="ch-modal-info-row">
                <div className="ch-modal-info-item">
                  <span className="ch-modal-label">Update Type</span>
                  <b>{selectedEvent.type}</b>
                </div>
                <div className="ch-modal-info-item">
                  <span className="ch-modal-label">Date Recorded</span>
                  <b>{selectedEvent.date}</b>
                </div>
                <div className="ch-modal-info-item">
                  <span className="ch-modal-label">Current Status</span>
                  <b>{stageLabels[selectedEvent.complaintRef.stage]}</b>
                </div>
              </div>

              {/* Remarks / Description */}
              <div className="ch-modal-section">
                <span className="ch-modal-section-label">Remarks / Description</span>
                <p className="ch-modal-description">{selectedEvent.description}</p>
              </div>

              {/* Inspection Specifics */}
              {selectedEvent.type === "Inspection" && selectedEvent.complaintRef.inspection && (
                <div className="ch-modal-section">
                  <span className="ch-modal-section-label">Inspection Details</span>
                  <div className="ch-modal-info-row">
                    <div className="ch-modal-info-item">
                      <span className="ch-modal-label">Inspection Date</span>
                      <b>{selectedEvent.complaintRef.inspection.inspectionDate 
                        ? new Date(selectedEvent.complaintRef.inspection.inspectionDate).toLocaleString() 
                        : "N/A"}</b>
                    </div>
                    <div className="ch-modal-info-item">
                      <span className="ch-modal-label">Inspector</span>
                      <b>Field Staff (You)</b>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Specifics */}
              {selectedEvent.type === "Action Taken" && selectedEvent.complaintRef.inspection && (
                <div className="ch-modal-section">
                  <span className="ch-modal-section-label">Action Details</span>
                  <div className="ch-modal-info-row">
                    <div className="ch-modal-info-item">
                      <span className="ch-modal-label">Completion Date</span>
                      <b>{selectedEvent.complaintRef.inspection.completionDate 
                        ? new Date(selectedEvent.complaintRef.inspection.completionDate).toLocaleString() 
                        : "N/A"}</b>
                    </div>
                  </div>
                  <p className="ch-modal-description" style={{ marginTop: "12px" }}>
                    {selectedEvent.complaintRef.inspection.actionTaken}
                  </p>
                </div>
              )}

              {/* Uploaded Photographs */}
              <div className="ch-modal-section">
                <span className="ch-modal-section-label">Uploaded Photographs</span>
                {selectedEvent.photos.length > 0 ? (
                  <div className="ch-photos-grid">
                    {selectedEvent.photos.map((photo, idx) => (
                      <div key={idx} className="ch-photo-box">
                        📷 {photo}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="ch-modal-empty">No photographs attached for this update.</p>
                )}
              </div>

              {/* Citizen Uploaded Photos (for Assignment events) */}
              {selectedEvent.type === "Assignment" && selectedEvent.complaintRef.citizenPhotos?.length > 0 && (
                <div className="ch-modal-section">
                  <span className="ch-modal-section-label">Citizen Uploaded:</span>
                  <div className="ch-photos-grid">
                    {selectedEvent.complaintRef.citizenPhotos.map((photo, idx) => (
                      <div key={`cit-${idx}`} className="ch-photo-box ch-photo-citizen">
                        👤 {photo}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="ch-modal-footer">
              <button 
                className="ch-modal-close-btn" 
                onClick={() => setSelectedEvent(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplaintHistory;