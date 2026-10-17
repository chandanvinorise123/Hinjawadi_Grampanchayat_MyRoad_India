import React, { useState, useMemo } from "react";
import "./CompletedWork.css";
import { toMediaUrl } from "../utils/dashboardApi";
import VerifierComplaintDetails from "./VerifierComplaintDetails";

const CompletedWork = ({ complaints, onBack, onVerify }) => {
  const [selectedItem, setSelectedItem] = useState(null);
  const [verifierRemarks, setVerifierRemarks] = useState("");
  const [verificationDateTime, setVerificationDateTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // 1. Filter only "Completed Work" items
  const completedItems = useMemo(() => {
    return complaints.filter((c) => c.queue === "Completed Work");
  }, [complaints]);

  // Reset form when selecting a new item
  const handleSelectItem = (item) => {
    setSelectedItem(item);
    setVerifierRemarks(item.verifierRemarks || "");
    // Set default date/time to now if not already set
    if (!item.verificationDateTime) {
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      setVerificationDateTime(now.toISOString().slice(0, 16));
    } else {
      setVerificationDateTime(item.verificationDateTime);
    }
  };

  // 2. Handle Approval / Rejection
  const handleAction = async (action) => {
    if (!verifierRemarks.trim()) {
      alert("Please add verification remarks before taking action.");
      return;
    }
    if (!verificationDateTime) {
      alert("Please record the verification date and time.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await onVerify(selectedItem.id, action, verifierRemarks, verificationDateTime);
      setSelectedItem(null);
      setVerifierRemarks("");
    } catch (saveError) {
      setError(saveError.message || "Unable to save the verification decision.");
    } finally {
      setSaving(false);
    }
  };

  const getStatusTone = (status) => {
    const tones = { pending: "amber", in_review: "orange", verified: "green", rejected: "red" };
    return tones[status] || "navy";
  };

  return (
    <div className="cw-shell">
      {/* Header */}
      <div className="cw-header">
        <button className="cw-back-btn" onClick={onBack}>← Back to Dashboard</button>
        <h2>🛠️ Completed Work Verification</h2>
      </div>

      <div className="cw-container">
        {/* Summary */}
        <div className="cw-summary">
          <span>📋 Total Completed Work Awaiting Verification: <b>{completedItems.length}</b></span>
        </div>

        <div className="cw-layout">
          {/* LEFT: List of Completed Work */}
          <div className="cw-list-panel">
            <h3>Work Queue</h3>
            {completedItems.length === 0 ? (
              <div className="cw-empty">No completed work in the queue.</div>
            ) : (
              <div className="cw-list">
                {completedItems.map((item) => (
                  <div 
                    key={item.id} 
                    className={`cw-list-item ${selectedItem?.id === item.id ? "active" : ""}`}
                    onClick={() => handleSelectItem(item)}
                  >
                    <div className="cw-item-header">
                      <span className="cw-item-number">{item.complaintNumber}</span>
                      <span className={`cw-status-badge cw-status-${getStatusTone(item.status)}`}>
                        {item.status === "pending" ? "Awaiting Review" : item.status}
                      </span>
                    </div>
                    <div className="cw-item-details">
                      <p><b>Issue:</b> {item.issue}</p>
                      <p><b>Location:</b> {item.location}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: Detailed Comparison & Verification Form */}
          <div className="cw-detail-panel">
            {selectedItem ? (
              <>
                <div className="cw-detail-header">
                  <h3>Verification Details: {selectedItem.complaintNumber}</h3>
                  <span className="cw-category-tag">{selectedItem.category}</span>
                </div>
                <VerifierComplaintDetails complaint={selectedItem} />

                {/* Requirement 1, 2, 3: View & Compare Photos */}
                <div className="cw-section">
                  <h4>📸 Before & After Work Comparison</h4>
                  <div className="cw-comparison-grid">
                    <div className="cw-photo-card cw-photo-before">
                      <span className="cw-photo-label">Before Repair</span>
                      <div className="cw-photo-placeholder">
                        {selectedItem.photos?.before
                          ? <img src={toMediaUrl(selectedItem.photos.before)} alt="Before repair evidence" />
                          : "No photo available"}
                      </div>
                    </div>
                    <div className="cw-photo-arrow">️</div>
                    <div className="cw-photo-card cw-photo-after">
                      <span className="cw-photo-label">After Repair</span>
                      <div className="cw-photo-placeholder">
                        {selectedItem.photos?.after
                          ? <img src={toMediaUrl(selectedItem.photos.after)} alt="After repair evidence" />
                          : "No photo available"}
                      </div>
                    </div>
                  </div>
                  {selectedItem.photos?.site && (
                    <div className="cw-site-photo">
                      <span className="cw-photo-label">Site Inspection Photo</span>
                      <div className="cw-photo-placeholder-small">
                        <img src={toMediaUrl(selectedItem.photos.site)} alt="Site inspection evidence" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Requirement 4: Review Staff Details */}
                <div className="cw-section">
                  <h4>👷 Staff Inspection & Completion Details</h4>
                  <div className="cw-staff-details">
                    <div className="cw-detail-row">
                      <span>Citizen:</span> <b>{selectedItem.citizenName}</b> ({selectedItem.citizenContact})
                    </div>
                    <div className="cw-detail-row">
                      <span>Original Issue:</span> <b>{selectedItem.description}</b>
                    </div>
                    <div className="cw-detail-row">
                      <span>Staff Remarks:</span> <b>{selectedItem.remarks || "No remarks provided by staff."}</b>
                    </div>
                    <div className="cw-detail-row">
                      <span>Activity Log:</span>
                      <ul className="cw-log-list">
                        {selectedItem.log.map((entry, idx) => (
                          <li key={idx}>{entry.text} <span className="cw-log-time">({entry.time})</span></li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Requirement 5 & 6: Add Remarks & Record Date/Time */}
                <div className="cw-section cw-verification-form">
                  {error && <p className="cw-save-error" role="alert">{error}</p>}
                  <h4>✅ Verifier Action</h4>
                  
                  <div className="cw-form-group">
                    <label htmlFor="cw-remarks">Verification Remarks *</label>
                    <textarea
                      id="cw-remarks"
                      rows="3"
                      placeholder="Document your observations after comparing the work..."
                      value={verifierRemarks}
                      onChange={(e) => setVerifierRemarks(e.target.value)}
                    ></textarea>
                  </div>

                  <div className="cw-form-group">
                    <label htmlFor="cw-datetime">Verification Date & Time *</label>
                    <input
                      id="cw-datetime"
                      type="datetime-local"
                      value={verificationDateTime}
                      onChange={(e) => setVerificationDateTime(e.target.value)}
                    />
                  </div>

                  <div className="cw-action-buttons">
                    <button className="cw-btn cw-btn-reject" disabled={saving} onClick={() => handleAction("reject")}>
                      ❌ Work Not Satisfied (Reject)
                    </button>
                    <button className="cw-btn cw-btn-approve" disabled={saving} onClick={() => handleAction("approve")}>
                      ✅ Work Satisfied (Approve)
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="cw-empty-selection">
                <div className="cw-empty-icon"></div>
                <h4>Select a completed work item</h4>
                <p>Choose an item from the queue on the left to view details, compare photos, and record your verification.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompletedWork;