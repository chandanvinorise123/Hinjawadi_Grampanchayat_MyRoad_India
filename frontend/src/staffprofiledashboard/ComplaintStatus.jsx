import React, { useState, useEffect } from "react";
import "./ComplaintStatus.css";
import StaffComplaintDetails from "./StaffComplaintDetails";

const EMPTY_COMPLAINT = { id: "", complaintNumber: "", issue: "", stage: 0 };

const ComplaintStatus = ({ complaints, selectedId, onBack, onStatusUpdate }) => {
  const [currentComplaintId, setCurrentComplaintId] = useState(selectedId || complaints[0]?.id);
  const currentComplaint = complaints.find((c) => String(c.id) === String(currentComplaintId)) || complaints[0] || EMPTY_COMPLAINT;

  const [newStage, setNewStage] = useState(currentComplaint.stage);
  const [updateMessage, setUpdateMessage] = useState("");
  const [updateError, setUpdateError] = useState("");
  const [saving, setSaving] = useState(false);

  const stageLabels = [
    "Action Initiated",
    "Work In Progress",
    "Work Completed",
    "After-Repair Upload",
    "Verification",
    "Work Resolved / Closed",
  ];

  // Reset state when complaint changes
  useEffect(() => {
    setNewStage(currentComplaint.stage);
    setUpdateMessage("");
  }, [currentComplaintId, currentComplaint]);

  const saveStage = async (stage) => {
    setSaving(true);
    setUpdateError("");
    try {
      await onStatusUpdate?.(currentComplaintId, stage);
      setNewStage(stage);
      setUpdateMessage(`Status saved as "${stageLabels[stage]}".`);
    } catch (error) {
      setUpdateMessage("");
      setUpdateError(error.message || "Unable to save the complaint status.");
    } finally {
      setSaving(false);
    }
  };

  const handleManualUpdate = async (e) => {
    e.preventDefault();
    await saveStage(newStage);
  };

  const handleQuickAction = async (targetStage) => {
    setNewStage(targetStage);
    await saveStage(targetStage);
  };

  return (
    <div className="cs-shell">
      {/* Header */}
      <div className="cs-header">
        <button className="cs-back-btn" onClick={onBack}>
          ← Back to Dashboard
        </button>
        <h2>Complaint Status Update</h2>
      </div>

      <div className="cs-container">
        {/* Complaint Selector */}
        <div className="cs-selector-card">
          <label htmlFor="complaint-select">Select Complaint:</label>
          <select 
            id="complaint-select" 
            value={currentComplaintId} 
            onChange={(e) => setCurrentComplaintId(e.target.value)}
          >
            {complaints.map((c) => (
              <option key={c.id} value={c.id}>
                {c.complaintNumber} - {c.issue}
              </option>
            ))}
          </select>
        </div>

        <StaffComplaintDetails complaint={currentComplaint} />

        {/* Success Message */}
        {updateMessage && (
          <div className="cs-success-banner">
            ✅ {updateMessage}
          </div>
        )}
        {updateError && <div className="cs-error-banner" role="alert">{updateError}</div>}

        {/* Visual Workflow Tracker */}
        <div className="cs-card">
          <h3>Current Workflow Status</h3>
          <div className="cs-stepper">
            {stageLabels.map((label, index) => (
              <div 
                key={index} 
                className={`cs-step ${index < newStage ? "completed" : index === newStage ? "active" : "pending"}`}
              >
                <div className="cs-step-dot">
                  {index < newStage ? "✓" : index + 1}
                </div>
                <div className="cs-step-label">{label}</div>
              </div>
            ))}
          </div>
          <div className="cs-current-status-text">
            Latest Status: <strong>{currentComplaint.status || stageLabels[newStage]}</strong>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="cs-card">
          <h3>⚡ Quick Workflow Actions</h3>
          <p className="cs-subtitle">Click to instantly update the status to these key milestones.</p>
          <div className="cs-actions-grid">
            <button 
              type="button" 
              className="cs-action-btn cs-action-initiate"
              onClick={() => handleQuickAction(0)}
              disabled={saving || newStage >= 0}
            >
              🚀 Mark Action Initiated
            </button>
            
            <button 
              type="button" 
              className="cs-action-btn cs-action-complete"
              onClick={() => handleQuickAction(2)}
              disabled={saving || newStage >= 2}
            >
              🛠️ Mark Work Completed
            </button>
            
            <button 
              type="button" 
              className="cs-action-btn cs-action-verify"
              onClick={() => handleQuickAction(4)}
              disabled={saving || newStage >= 4}
            >
              📤 Submit for Verification
            </button>
          </div>
        </div>

        {/* Manual Status Update Form */}
        <form className="cs-card cs-form-card" onSubmit={handleManualUpdate}>
          <h3>Manual Status Update</h3>
          <div className="cs-field">
            <label htmlFor="manual-stage">Select New Status Stage:</label>
            <select 
              id="manual-stage" 
              value={newStage} 
              onChange={(e) => setNewStage(Number(e.target.value))}
            >
              {stageLabels.map((label, index) => (
                <option key={index} value={index}>{label}</option>
              ))}
            </select>
          </div>
          <div className="cs-form-actions">
            <button type="button" className="cs-btn-outline" onClick={onBack}>Cancel</button>
            <button type="submit" className="cs-btn-primary" disabled={saving}>{saving ? "Saving..." : "Update Status →"}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ComplaintStatus;