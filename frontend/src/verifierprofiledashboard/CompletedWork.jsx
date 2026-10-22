import React, { useState, useMemo } from "react";
import "./CompletedWork.css";
import ComplaintImage from "./ComplaintImage";

const formatDate = (value) => {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
};

const CompletedWork = ({ complaints, loadError, onBack, onVerify }) => {
  const [selectedItem, setSelectedItem] = useState(null);
  const [verifierRemarks, setVerifierRemarks] = useState("");
  const [verificationDateTime, setVerificationDateTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // 1. Filter only "Completed Work" items
  const completedItems = useMemo(() => {
    return complaints
      .filter((c) => c.queue === "Completed Work")
      .sort((left, right) =>
        new Date(right.updatedAt || right.inspection?.completionDate || 0).getTime() -
        new Date(left.updatedAt || left.inspection?.completionDate || 0).getTime()
      );
  }, [complaints]);

  // Reset form when selecting a new item
  const handleSelectItem = (item) => {
    setSelectedItem(item);
    setVerifierRemarks(item.verifierRemarks || "");
    setError("");
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
      setError("Please add verification remarks before taking action.");
      return;
    }
    if (!verificationDateTime) {
      setError("Please record the verification date and time.");
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

  const closeDetails = () => {
    if (saving) return;
    setSelectedItem(null);
    setError("");
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
        {loadError && <div className="cw-save-error" role="alert">{loadError}</div>}
        {/* Summary */}
        <div className="cw-summary">
          <span>📋 Total Completed Work Awaiting Verification: <b>{completedItems.length}</b></span>
        </div>

        <section className="cw-table-panel" aria-label="Completed work awaiting verification">
          <div className="cw-table-wrap">
            <table className="cw-table">
              <thead>
                <tr>
                  <th>Complaint</th>
                  <th>Issue & Location</th>
                  <th>Assigned Staff</th>
                  <th>Work Completed</th>
                  <th>Status</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {completedItems.length ? completedItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <b className="cw-table-number">{item.complaintNumber || "—"}</b>
                      <span className="cw-table-subtitle">{item.citizenName || "Citizen not available"}</span>
                    </td>
                    <td>
                      <b>{item.issue || item.category || "Issue not specified"}</b>
                      <span className="cw-table-subtitle">{item.location || "Location pending"}</span>
                    </td>
                    <td>{item.assignedStaff || "Not assigned"}</td>
                    <td>{formatDate(item.inspection?.completionDate || item.updatedAt)}</td>
                    <td>
                      <span className={`cw-status-badge cw-status-${getStatusTone(item.status)}`}>
                        {item.status === "pending" ? "Awaiting Review" : item.status || "Awaiting Review"}
                      </span>
                    </td>
                    <td>
                      <button className="cw-view-button" type="button" onClick={() => handleSelectItem(item)}>
                        View Details
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td className="cw-empty" colSpan="6">
                      {loadError ? "Completed work could not be loaded." : "No completed work in the queue."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {selectedItem && (
        <div className="cw-modal-backdrop" onClick={closeDetails}>
          <section
            className="cw-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cw-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="cw-modal-header">
              <div>
                <span className="cw-modal-eyebrow">Completed work submission</span>
                <h2 id="cw-modal-title">{selectedItem.complaintNumber || "Complaint details"}</h2>
              </div>
              <button type="button" className="cw-modal-close" aria-label="Close details" onClick={closeDetails} disabled={saving}>×</button>
            </header>

            <div className="cw-modal-body">
              <section className="cw-modal-section">
                <h3>Citizen & Complaint Details</h3>
                <div className="cw-modal-detail-grid">
                  <div><span>Citizen</span><b>{selectedItem.citizenName || "Not available"}</b></div>
                  <div><span>Citizen contact</span><b>{selectedItem.citizenContact || "Not available"}</b></div>
                  <div><span>Citizen email</span><b>{selectedItem.citizenProfile?.email || "Not available"}</b></div>
                  <div><span>Department</span><b>{selectedItem.department || "Not assigned"}</b></div>
                  <div><span>Assigned staff</span><b>{selectedItem.assignedStaff || "Not assigned"}</b></div>
                  <div><span>Assigned verifier</span><b>{selectedItem.assignedVerifier || "Not assigned"}</b></div>
                  <div><span>Priority</span><b>{selectedItem.priority || "Normal"}</b></div>
                  <div><span>Submitted</span><b>{formatDate(selectedItem.createdAt || selectedItem.date)}</b></div>
                  <div><span>Last updated</span><b>{formatDate(selectedItem.updatedAt)}</b></div>
                  <div><span>Landmark</span><b>{selectedItem.landmark || "Not provided"}</b></div>
                  <div className="cw-modal-detail-wide"><span>Reported description</span><b>{selectedItem.description || "No description provided."}</b></div>
                  <div className="cw-modal-detail-wide"><span>Complaint location</span><b>{selectedItem.location || "Location pending"}</b></div>
                  {selectedItem.coordinates?.latitude != null && selectedItem.coordinates?.longitude != null && (
                    <div className="cw-modal-detail-wide">
                      <span>GPS coordinates</span>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${selectedItem.coordinates.latitude},${selectedItem.coordinates.longitude}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {selectedItem.coordinates.latitude}, {selectedItem.coordinates.longitude} · Open map
                      </a>
                    </div>
                  )}
                </div>
              </section>

              <section className="cw-modal-section">
                <h3>Inspection & Action Details</h3>
                <div className="cw-modal-detail-grid">
                  <div><span>Inspection date</span><b>{formatDate(selectedItem.inspection?.inspectionDate)}</b></div>
                  <div><span>Work completion date</span><b>{formatDate(selectedItem.inspection?.completionDate)}</b></div>
                  <div className="cw-modal-detail-wide"><span>Staff inspection remarks</span><b>{selectedItem.inspection?.remarks || selectedItem.remarks || "No staff inspection remarks recorded."}</b></div>
                  <div className="cw-modal-detail-wide"><span>Action taken by staff</span><b>{selectedItem.inspection?.actionTaken || selectedItem.actionTaken || "No work action recorded."}</b></div>
                  {selectedItem.verifierRemarks && (
                    <div className="cw-modal-detail-wide"><span>Latest verifier feedback</span><b>{selectedItem.verifierRemarks}</b></div>
                  )}
                </div>

                <div className="cw-modal-comparison">
                  <h4>Before & After Work Photos</h4>
                  <div className="cw-comparison-grid">
                    <div className="cw-photo-card">
                      <span className="cw-photo-label">Before Repair</span>
                      <div className="cw-photo-placeholder">
                        {selectedItem.photos?.before
                          ? <ComplaintImage src={selectedItem.photos.before} alt="Before repair evidence" fallbackClassName="cw-photo-fallback" />
                          : "No photo available"}
                      </div>
                    </div>
                    <div className="cw-photo-card">
                      <span className="cw-photo-label">After Repair</span>
                      <div className="cw-photo-placeholder">
                        {selectedItem.photos?.after
                          ? <ComplaintImage src={selectedItem.photos.after} alt="After repair evidence" fallbackClassName="cw-photo-fallback" />
                          : "No photo available"}
                      </div>
                    </div>
                  </div>
                </div>

                {Array.isArray(selectedItem.log) && selectedItem.log.length > 0 && (
                  <div className="cw-modal-log">
                    <h4>Activity Log</h4>
                    <ul className="cw-log-list">
                      {selectedItem.log.map((entry, idx) => (
                        <li key={`${entry.time || "log"}-${idx}`}>{entry.text} <span className="cw-log-time">({entry.time})</span></li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="cw-verification-form">
                  <h4>Verifier Action</h4>
                  {error && <p className="cw-save-error" role="alert">{error}</p>}
                  <div className="cw-form-group">
                    <label htmlFor="cw-remarks">Verification Remarks *</label>
                    <textarea
                      id="cw-remarks"
                      rows="3"
                      placeholder="Document your observations after comparing the work..."
                      value={verifierRemarks}
                      onChange={(event) => setVerifierRemarks(event.target.value)}
                      disabled={saving}
                    />
                  </div>
                  <div className="cw-form-group">
                    <label htmlFor="cw-datetime">Verification Date & Time *</label>
                    <input
                      id="cw-datetime"
                      type="datetime-local"
                      value={verificationDateTime}
                      onChange={(event) => setVerificationDateTime(event.target.value)}
                      disabled={saving}
                    />
                  </div>
                  <div className="cw-action-buttons">
                    <button className="cw-btn cw-btn-reject" disabled={saving} onClick={() => handleAction("reject")}>
                      {saving ? "Saving..." : "Work Not Satisfied (Reject)"}
                    </button>
                    <button className="cw-btn cw-btn-approve" disabled={saving} onClick={() => handleAction("approve")}>
                      {saving ? "Saving..." : "Work Satisfied (Approve)"}
                    </button>
                  </div>
                </div>
              </section>
            </div>

            <footer className="cw-modal-footer">
              <button className="cw-back-btn" type="button" onClick={closeDetails} disabled={saving}>Close</button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
};

export default CompletedWork;