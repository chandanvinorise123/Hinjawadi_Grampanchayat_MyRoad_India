import React, { useState, useMemo } from "react";
import "./PhysicalVerification.css";
import VerifierComplaintDetails from "./VerifierComplaintDetails";
import ComplaintImage from "./ComplaintImage";

const PhysicalVerification = ({ complaints, onBack, onSubmitVerification }) => {
  const [selectedItem, setSelectedItem] = useState(null);
  const [decision, setDecision] = useState("approve"); // 'approve' or 'reject'
  const [remarks, setRemarks] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // 1. Filter items ready for Physical Verification
  const verificationQueue = useMemo(() => {
    return complaints.filter((c) => c.queue === "Completed Work");
  }, [complaints]);

  const handleSelect = (item) => {
    setSelectedItem(item);
    setDecision("approve");
    setRemarks("");
    // Auto-set current date/time
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setDateTime(now.toISOString().slice(0, 16));
  };

  // 2. Submit Verification Result
  const handleSubmit = async () => {
    if (!remarks.trim()) {
      alert("Verification remarks are mandatory before submitting.");
      return;
    }
    if (!dateTime) {
      alert("Please record the verification date and time.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await onSubmitVerification(selectedItem.id, decision, remarks, dateTime);
      setSelectedItem(null);
    } catch (saveError) {
      setError(saveError.message || "Unable to save the verification decision.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pv-shell">
      {/* Header */}
      <div className="pv-header">
        <button className="pv-back-btn" onClick={onBack}>← Back to Dashboard</button>
        <h2>🔍 Physical Verification Workspace</h2>
      </div>

      <div className="pv-container">
        {/* Summary */}
        <div className="pv-summary">
          <span>📋 Items Awaiting Physical Verification: <b>{verificationQueue.length}</b></span>
        </div>

        <div className="pv-layout">
          {/* LEFT: Queue List */}
          <div className="pv-list-panel">
            <h3>Verification Queue</h3>
            {verificationQueue.length === 0 ? (
              <div className="pv-empty">No items currently require physical verification.</div>
            ) : (
              <div className="pv-list">
                {verificationQueue.map((item) => (
                  <div 
                    key={item.id} 
                    className={`pv-list-item ${selectedItem?.id === item.id ? "active" : ""}`}
                    onClick={() => handleSelect(item)}
                  >
                    <div className="pv-item-header">
                      <span className="pv-item-number">{item.complaintNumber}</span>
                      <span className="pv-status-dot"></span>
                    </div>
                    <div className="pv-item-details">
                      <p className="pv-issue">{item.issue}</p>
                      <p className="pv-location">📍 {item.location}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: Verification Workspace */}
          <div className="pv-workspace">
            {selectedItem ? (
              <>
                <div className="pv-workspace-header">
                  <div>
                    <h3>Verifying: {selectedItem.complaintNumber}</h3>
                    <p className="pv-subtitle">{selectedItem.category} • {selectedItem.citizenName}</p>
                  </div>
                </div>
                <VerifierComplaintDetails complaint={selectedItem} />

                {/* Quick Info & Photos */}
                <div className="pv-info-grid">
                  <div className="pv-info-card">
                    <span>Issue Description</span>
                    <p>{selectedItem.description}</p>
                  </div>
                  <div className="pv-info-card">
                    <span>Staff Remarks</span>
                    <p>{selectedItem.remarks || "No remarks provided."}</p>
                  </div>
                  <div className="pv-info-card pv-photos-card">
                    <span>Evidence Photos</span>
                    <div className="pv-photo-row">
                      <div className="pv-mini-photo">
                        <span>Before</span>
                        <div>
                          {selectedItem.photos?.before
                            ? <ComplaintImage src={selectedItem.photos.before} alt="Before repair evidence" fallbackClassName="pv-photo-fallback" />
                            : "N/A"}
                        </div>
                      </div>
                      <div className="pv-mini-photo">
                        <span>After</span>
                        <div>
                          {selectedItem.photos?.after
                            ? <ComplaintImage src={selectedItem.photos.after} alt="After repair evidence" fallbackClassName="pv-photo-fallback" />
                            : "N/A"}
                        </div>
                      </div>
                      <div className="pv-mini-photo">
                        <span>Site</span>
                        <div>
                          {selectedItem.photos?.site
                            ? <ComplaintImage src={selectedItem.photos.site} alt="Site inspection evidence" fallbackClassName="pv-photo-fallback" />
                            : "N/A"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Verification Action Form */}
                <div className="pv-action-form">
                  {error && <p className="pv-save-error" role="alert">{error}</p>}
                  <h4>Submit Verification Result</h4>
                  
                  {/* Decision Toggle */}
                  <div className="pv-decision-toggle">
                    <button 
                      type="button" 
                      className={`pv-toggle-btn pv-approve ${decision === 'approve' ? 'active' : ''}`}
                      onClick={() => setDecision('approve')}
                    >
                      ✅ Approve / Verify Work
                    </button>
                    <button 
                      type="button" 
                      className={`pv-toggle-btn pv-reject ${decision === 'reject' ? 'active' : ''}`}
                      onClick={() => setDecision('reject')}
                    >
                      ❌ Reject / Send for Correction
                    </button>
                  </div>

                  {/* Remarks */}
                  <div className="pv-form-group">
                    <label>Verification Remarks *</label>
                    <textarea
                      rows="3"
                      placeholder={decision === 'approve' 
                        ? "Confirm that the work meets the required standards..." 
                        : "Detail exactly what needs correction or additional action..."}
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                    ></textarea>
                  </div>

                  {/* Date & Time */}
                  <div className="pv-form-group">
                    <label>Verification Date & Time *</label>
                    <input
                      type="datetime-local"
                      value={dateTime}
                      onChange={(e) => setDateTime(e.target.value)}
                    />
                  </div>

                  {/* Submit Button */}
                  <button className="pv-submit-btn" disabled={saving} onClick={handleSubmit}>
                    {saving ? "Saving..." : decision === 'approve' ? '✅ Submit Verification (Approve)' : '❌ Submit Verification (Reject)'}
                  </button>
                </div>
              </>
            ) : (
              <div className="pv-empty-workspace">
                <div className="pv-empty-icon">🔍</div>
                <h4>Select an item to verify</h4>
                <p>Choose a complaint from the queue to begin the physical verification process.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhysicalVerification;