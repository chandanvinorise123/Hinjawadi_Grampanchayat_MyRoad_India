import React, { useState, useMemo } from "react";
import "./Reverification.css";

const Reverification = ({ complaints, onBack, onReverify }) => {
  const [selectedItem, setSelectedItem] = useState(null);
  const [remarks, setRemarks] = useState("");
  const [dateTime, setDateTime] = useState("");

  // 1. Filter only "Re-verification" items
  const reverifyQueue = useMemo(() => {
    return complaints.filter((c) => c.queue === "Re-verification");
  }, [complaints]);

  const handleSelect = (item) => {
    setSelectedItem(item);
    setRemarks("");
    // Set default date/time to now
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setDateTime(now.toISOString().slice(0, 16));
  };

  // 2. Handle Approve or Reject Again
  const handleAction = (action) => {
    if (!remarks.trim()) {
      alert("Please add re-verification remarks before taking action.");
      return;
    }
    if (!dateTime) {
      alert("Please record the re-verification date and time.");
      return;
    }

    if (onReverify) {
      onReverify(selectedItem.id, action, remarks, dateTime);
    }
    setSelectedItem(null);
  };

  return (
    <div className="rv-shell">
      {/* Header */}
      <div className="rv-header">
        <button className="rv-back-btn" onClick={onBack}>← Back to Dashboard</button>
        <h2>🔁 Re-verification Queue</h2>
      </div>

      <div className="rv-container">
        {/* Summary */}
        <div className="rv-summary">
          <span>⚠️ Awaiting Re-verification: <b>{reverifyQueue.length}</b> complaint(s) resubmitted by staff.</span>
        </div>

        <div className="rv-layout">
          {/* LEFT: Re-verification Queue List */}
          <div className="rv-list-panel">
            <h3>Resubmitted Work</h3>
            {reverifyQueue.length === 0 ? (
              <div className="rv-empty">No items currently in the re-verification queue.</div>
            ) : (
              <div className="rv-list">
                {reverifyQueue.map((item) => (
                  <div 
                    key={item.id} 
                    className={`rv-list-item ${selectedItem?.id === item.id ? "active" : ""}`}
                    onClick={() => handleSelect(item)}
                  >
                    <div className="rv-item-header">
                      <span className="rv-item-number">{item.complaintNumber}</span>
                      <span className="rv-status-badge rv-status-red">Needs Review</span>
                    </div>
                    <div className="rv-item-details">
                      <p><b>Issue:</b> {item.issue}</p>
                      <p><b>Location:</b> {item.location}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: Detailed Comparison & Action Form */}
          <div className="rv-detail-panel">
            {selectedItem ? (
              <>
                <div className="rv-detail-header">
                  <h3>Re-verifying: {selectedItem.complaintNumber}</h3>
                  <span className="rv-category-tag">{selectedItem.category}</span>
                </div>

                {/* Requirement 2: View Previous Rejection Remarks */}
                <div className="rv-section rv-alert-box">
                  <h4>🚨 Previous Rejection Reason</h4>
                  <p className="rv-previous-remarks">
                    {selectedItem.previousRemarks || selectedItem.remarks || "No specific remarks recorded during previous rejection."}
                  </p>
                  <small>Staff has resubmitted this work claiming the above issues have been corrected.</small>
                </div>

                {/* Requirement 3 & 4: Review & Compare Updated Evidence */}
                <div className="rv-section">
                  <h4>📸 Updated Work Evidence</h4>
                  <div className="rv-comparison-grid">
                    <div className="rv-photo-card">
                      <span className="rv-photo-label">Before Repair (Original)</span>
                      <div className="rv-photo-placeholder">
                        {selectedItem.photos?.before ? `📷 ${selectedItem.photos.before}` : "No photo"}
                      </div>
                    </div>
                    <div className="rv-photo-arrow">➡️</div>
                    <div className="rv-photo-card rv-photo-updated">
                      <span className="rv-photo-label">Updated After Repair (Resubmitted)</span>
                      <div className="rv-photo-placeholder">
                        {selectedItem.photos?.after ? `📷 ${selectedItem.photos.after}` : "No photo"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Requirement 5: Verify Corrections via Staff Log */}
                <div className="rv-section">
                  <h4> Staff Correction Log</h4>
                  <ul className="rv-log-list">
                    {selectedItem.log.map((entry, idx) => (
                      <li key={idx}>
                        <span className="rv-log-text">{entry.text}</span> 
                        <span className="rv-log-time">{entry.time}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Requirement 6, 7, 8: Action Form (Remarks, Date, Approve/Reject) */}
                <div className="rv-section rv-action-form">
                  <h4>✅ Re-verification Decision</h4>
                  
                  <div className="rv-form-group">
                    <label htmlFor="rv-remarks">Re-verification Remarks *</label>
                    <textarea
                      id="rv-remarks"
                      rows="3"
                      placeholder="Confirm if corrections are satisfactory or detail why it is rejected again..."
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                    ></textarea>
                  </div>

                  <div className="rv-form-group">
                    <label htmlFor="rv-datetime">Re-verification Date & Time *</label>
                    <input
                      id="rv-datetime"
                      type="datetime-local"
                      value={dateTime}
                      onChange={(e) => setDateTime(e.target.value)}
                    />
                  </div>

                  <div className="rv-action-buttons">
                    <button className="rv-btn rv-btn-reject-again" onClick={() => handleAction("reject_again")}>
                      ❌ Reject Again (Further Action Required)
                    </button>
                    <button className="rv-btn rv-btn-approve" onClick={() => handleAction("approve")}>
                      ✅ Approve Corrected Work
                    </button>
                  </div>
                  <p className="rv-notify-note">* Approving or rejecting will automatically update the status and notify the assigned staff member.</p>
                </div>
              </>
            ) : (
              <div className="rv-empty-selection">
                <div className="rv-empty-icon">🔍</div>
                <h4>Select a resubmitted complaint</h4>
                <p>Choose an item from the queue to view previous rejection reasons, compare updated photos, and make a final decision.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reverification;