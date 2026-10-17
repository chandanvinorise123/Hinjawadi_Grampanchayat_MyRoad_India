import React, { useState, useMemo } from "react";
import "./ComplaintHistory.css";
import { toMediaUrl } from "../utils/dashboardApi";
import VerifierComplaintDetails from "./VerifierComplaintDetails";

const ComplaintHistory = ({ complaints = [], onBack }) => {
  const [selectedId, setSelectedId] = useState(complaints[0]?.id || null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLog, setSelectedLog] = useState(null); // State for overlay modal

  // Filter complaints based on search
  const filteredComplaints = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return complaints.filter((complaint) => [
      complaint.complaintNumber,
      complaint.category,
      complaint.issue,
      complaint.location,
      complaint.citizenName,
      complaint.citizenContact,
      complaint.status,
      complaint.assignedStaff,
      complaint.assignedVerifier,
    ].some((value) => String(value || "").toLowerCase().includes(query)));
  }, [complaints, searchTerm]);

  const selectedItem = filteredComplaints.find((complaint) => complaint.id === selectedId)
    || filteredComplaints[0];

  // Helper to determine timeline event type based on log text
  const getEventType = (text) => {
    const lowerText = String(text || "").toLowerCase();
    if (lowerText.includes("verified") || lowerText.includes("rejected") || lowerText.includes("approved")) return "verification";
    if (lowerText.includes("staff") || lowerText.includes("completed") || lowerText.includes("action")) return "action";
    if (lowerText.includes("status") || lowerText.includes("routed") || lowerText.includes("assigned")) return "status";
    return "general";
  };

  const getStatusTone = (status) => {
    const tones = { pending: "amber", in_review: "orange", verified: "green", rejected: "red", resolved: "navy", notified: "green" };
    return tones[status] || "navy";
  };

  // Prepare all log entries (including the origin) for the table
  const allLogEntries = useMemo(() => {
    if (!selectedItem) return [];

    const entries = (Array.isArray(selectedItem.log) ? selectedItem.log : [])
      .map((entry) => ({
        ...entry,
        time: entry.time ? new Date(entry.time).toLocaleString() : "Time not recorded",
      }))
      .reverse();
    entries.push({
      time: selectedItem.createdAt ? new Date(selectedItem.createdAt).toLocaleString() : "Time not recorded",
      text: `Complaint ${selectedItem.complaintNumber} was submitted by ${selectedItem.citizenName || "the citizen"}.`,
      actor: "Citizen",
      eventType: "origin",
      isOrigin: true
    });
    return entries;
  }, [selectedItem]);

  return (
    <div className="ch-shell">
      {/* Header */}
      <div className="ch-header">
        <button className="ch-back-btn" onClick={onBack}>← Back to Dashboard</button>
        <h2>📜 Complaint History & Timeline</h2>
      </div>

      <div className="ch-container">
        {/* LEFT: Complaint List & Search (Unchanged) */}
        <div className="ch-sidebar">
          <div className="ch-search-box">
            <span></span>
            <input
              type="text"
              placeholder="Search complaints..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="ch-list">
            {filteredComplaints.length === 0 ? (
              <div className="ch-empty-list">No complaints found.</div>
            ) : (
              filteredComplaints.map((c) => (
                <div
                  key={c.id}
                  className={`ch-list-item ${selectedItem?.id === c.id ? "active" : ""}`}
                  onClick={() => setSelectedId(c.id)}
                >
                  <div className="ch-item-top">
                    <span className="ch-item-number">{c.complaintNumber}</span>
                    <span className={`ch-status-badge ch-status-${getStatusTone(c.status)}`}>
                      {c.status}
                    </span>
                  </div>
                  <p className="ch-item-issue">{c.issue}</p>
                  <p className="ch-item-location">📍 {c.location}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT: Summary + Table Format + Overlay Modal */}
        <div className="ch-main-content">
          {selectedItem ? (
            <>
              {/* 1. Complaint Summary Card */}
              <div className="ch-summary-card">
                <div className="ch-summary-header">
                  <h3>{selectedItem.complaintNumber}</h3>
                  <span className={`ch-main-status ch-status-${getStatusTone(selectedItem.status)}`}>
                    {String(selectedItem.status || "pending").toUpperCase()}
                  </span>
                </div>
                <div className="ch-summary-grid">
                  <div className="ch-summary-item">
                    <span>Category</span>
                    <b>{selectedItem.category}</b>
                  </div>
                  <div className="ch-summary-item">
                    <span>Citizen</span>
                    <b>{selectedItem.citizenName}</b>
                  </div>
                  <div className="ch-summary-item">
                    <span>Location</span>
                    <b>{selectedItem.location}</b>
                  </div>
                  <div className="ch-summary-item">
                    <span>Queue</span>
                    <b>{selectedItem.queue}</b>
                  </div>
                </div>
              </div>
              <VerifierComplaintDetails complaint={selectedItem} />

              {/* 2. Log Table */}
              <div className="ch-table-section">
                <div className="ch-table-header">
                  <h4>📅 Activity Log History</h4>
                  <span className="ch-table-count">{allLogEntries.length} records</span>
                </div>
                <div className="ch-table-container">
                  <table className="ch-log-table">
                    <thead>
                      <tr>
                        <th>Date & Time</th>
                        <th>Updated By</th>
                        <th>Event Type</th>
                        <th>Description</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allLogEntries.map((entry, index) => {
                        const type = entry.eventType || getEventType(entry.text);
                        return (
                          <tr key={index} className="ch-table-row" onClick={() => setSelectedLog({ ...entry, type })}>
                            <td className="ch-mono">{entry.time}</td>
                            <td>{entry.actor || "Dashboard"}</td>
                            <td>
                              <span className={`ch-event-type-badge type-${type}`}>
                                {type.toUpperCase()}
                              </span>
                            </td>
                            <td className="ch-desc-text">{entry.text}</td>
                            <td>
                              <button className="ch-view-details-btn">View Details</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="ch-empty-selection">
              <h4>Select a complaint to view its history</h4>
            </div>
          )}
        </div>
      </div>

      {/* ✅ OVERLAY MODAL for Log Details */}
      {selectedLog && (
        <div className="ch-modal-overlay" onClick={() => setSelectedLog(null)}>
          <div className="ch-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="ch-modal-header">
              <div>
                <span className={`ch-modal-badge type-${selectedLog.type}`}>
                  {selectedLog.type.toUpperCase()} EVENT
                </span>
                <h3>Log Details</h3>
              </div>
              <button className="ch-modal-close" onClick={() => setSelectedLog(null)}>✕</button>
            </div>

            <div className="ch-modal-body">
              <div className="ch-modal-info-row">
                <span>Recorded At:</span> 
                <b>{selectedLog.time}</b>
              </div>
              
              <div className="ch-modal-info-row">
                <span>Description:</span> 
                <p className="ch-modal-description">{selectedLog.text}</p>
              </div>

              {/* Show associated records if it's not the origin event */}
              {!selectedLog.isOrigin && (
                <div className="ch-modal-extra-details">
                  <h4>📎 Associated Records at this Stage</h4>
                  <div className="ch-detail-grid-modal">
                    <div className="ch-mini-card">
                      <span>Staff Remarks</span>
                      <p>{selectedItem.inspection?.remarks || selectedItem.remarks || "No remarks provided by staff."}</p>
                    </div>
                    <div className="ch-mini-card">
                      <span>Verifier Remarks</span>
                      <p>{selectedItem.verifierRemarks || selectedItem.previousRemarks || "Pending verification."}</p>
                    </div>
                    <div className="ch-mini-card">
                      <span>Assigned Staff / Verifier</span>
                      <p>{selectedItem.assignedStaff || "No staff assigned"} / {selectedItem.assignedVerifier || "No verifier assigned"}</p>
                    </div>
                    <div className="ch-mini-card">
                      <span>Work Taken</span>
                      <p>{selectedItem.inspection?.actionTaken || "No work action recorded."}</p>
                    </div>
                  </div>
                  
                  <div className="ch-photos-modal">
                    <span className="ch-photos-label">Attached Evidence:</span>
                    <div className="ch-photo-badges">
                      {selectedItem.photos?.before && (
                        <div className="ch-photo-badge">
                          <span>Before Repair</span>
                          <img src={toMediaUrl(selectedItem.photos.before)} alt="Before repair evidence" />
                        </div>
                      )}
                      {selectedItem.photos?.site && (
                        <div className="ch-photo-badge">
                          <span>Site Photo</span>
                          <img src={toMediaUrl(selectedItem.photos.site)} alt="Site inspection evidence" />
                        </div>
                      )}
                      {selectedItem.photos?.after && (
                        <div className="ch-photo-badge">
                          <span>After Repair</span>
                          <img src={toMediaUrl(selectedItem.photos.after)} alt="After repair evidence" />
                        </div>
                      )}
                      {!selectedItem.photos?.before && !selectedItem.photos?.site && !selectedItem.photos?.after && (
                        <span className="ch-empty-text">No photos attached.</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="ch-modal-footer">
              <button className="ch-modal-close-btn" onClick={() => setSelectedLog(null)}>
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplaintHistory;