import React, { useState, useMemo, useEffect } from "react";
import "./ComplaintVerification.css";
import { fetchDashboard, getStoredUser, getUserId, updateDashboardComplaint } from "../utils/dashboardApi";

// ==========================================
// ==========================================

const WORKFLOW_STEPS = ["Work Started", "Under Working", "Under Verification", "Verified", "Work Completed"];

const ComplaintVerification = ({ onBack }) => {
  const [complaints, setComplaints] = useState([]);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [verifierRemarks, setVerifierRemarks] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    fetchDashboard("admin", getUserId(getStoredUser()))
      .then(({ complaints: loaded = [] }) => setComplaints(loaded
        .filter((complaint) => ["Under Verification", "Verified", "Resolved", "Closed", "Rejected"].includes(complaint.status))
        .map((complaint) => ({
          ...complaint,
          currentStep: { "Under Action": 1, "Under Verification": 3, Verified: 4, Resolved: 5, Closed: 5, Rejected: 2 }[complaint.status] || 0,
          issue: complaint.issue || complaint.issueType,
          staffName: complaint.assignedStaff || "Unassigned",
          workDetails: complaint.description,
          photos: complaint.images || [],
        }))))
      .catch((error) => console.error("Failed to load verification queue:", error));
  }, []);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 3000);
  };

  // Stats
  const stats = useMemo(() => ({
    pending: complaints.filter(c => c.currentStep === 3).length,
    verified: complaints.filter(c => c.currentStep === 4).length,
    completed: complaints.filter(c => c.currentStep === 5).length,
    returned: complaints.filter(c => c.status === "Rejected" || c.status === "Under Action").length
  }), [complaints]);

  const openVerificationModal = (complaint) => {
    setSelectedComplaint({ ...complaint });
    setVerifierRemarks(complaint.remarks || "");
    setIsModalOpen(true);
  };

  // Action: Verify and Close
  const handleVerifyAndClose = async () => {
    if (!verifierRemarks.trim()) {
      showMessage("error", "Please add closure remarks before verifying.");
      return;
    }
    try {
      await updateDashboardComplaint(selectedComplaint.id, { status: "Closed", remarks: verifierRemarks });
    } catch (error) {
      console.error("Failed to close complaint:", error);
      return;
    }
    const updated = complaints.map(c => 
      c.id === selectedComplaint.id 
        ? { ...c, currentStep: 5, remarks: verifierRemarks, status: "Closed" } 
        : c
    );
    setComplaints(updated);
    setIsModalOpen(false);
    showMessage("success", "Complaint verified and closed successfully!");
  };

  // Action: Return for Additional Action
  const handleReturnForAction = async () => {
    if (!verifierRemarks.trim()) {
      showMessage("error", "Please add remarks explaining why it's being returned.");
      return;
    }
    try {
      await updateDashboardComplaint(selectedComplaint.id, { status: "Under Action", remarks: verifierRemarks });
    } catch (error) {
      console.error("Failed to return complaint:", error);
      return;
    }
    const updated = complaints.map(c => 
      c.id === selectedComplaint.id 
        ? { ...c, currentStep: 2, remarks: `RETURNED: ${verifierRemarks}`, status: "Under Action" } 
        : c
    );
    setComplaints(updated);
    setIsModalOpen(false);
    showMessage("error", "Complaint returned to staff for additional action.");
  };

  return (
    <div className="cv-shell">
      <div className="cv-header">
        <button className="cv-back-btn" onClick={onBack}>← Back to Dashboard</button>
        <div>
          <h2>✅ Complaint Verification & Closure</h2>
          <p>Review completed work, verify resolutions, and track the workflow lifecycle.</p>
        </div>
      </div>

      {message.text && <div className={`cv-message ${message.type}`}>{message.text}</div>}

      {/* Stats */}
      <div className="cv-stats-row">
        <div className="cv-stat-card pending"><h3>Pending Verification</h3><p>{stats.pending}</p></div>
        <div className="cv-stat-card verified"><h3>Verified</h3><p>{stats.verified}</p></div>
        <div className="cv-stat-card completed"><h3>Work Completed</h3><p>{stats.completed}</p></div>
        <div className="cv-stat-card returned"><h3>Returned for Action</h3><p>{stats.returned}</p></div>
      </div>

      {/* Verification Queue Table */}
      <div className="cv-table-container">
        <h3 className="cv-section-title">Verification Queue</h3>
        <table className="cv-table">
          <thead>
            <tr>
              <th>Complaint ID</th>
              <th>Issue & Location</th>
              <th>Assigned Staff</th>
              <th>Current Workflow Stage</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {complaints.map(c => (
              <tr key={c.id}>
                <td className="cv-mono">{c.complaintNumber}</td>
                <td><strong>{c.issue}</strong><br/><small className="cv-subtext">{c.location}</small></td>
                <td>{c.staffName}</td>
                <td>
                  <div className="cv-mini-tracker">
                    {WORKFLOW_STEPS.map((step, idx) => (
                      <div key={idx} className={`cv-mini-step ${idx + 1 <= c.currentStep ? "active" : ""}`} title={step}>
                        {idx + 1 <= c.currentStep ? "✓" : "○"}
                      </div>
                    ))}
                  </div>
                  <small className="cv-step-label">{WORKFLOW_STEPS[c.currentStep - 1]}</small>
                </td>
                <td>
                  <button className="cv-btn-review" onClick={() => openVerificationModal(c)}>
                    {c.currentStep >= 4 ? "View Details" : "Review & Verify"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Verification Modal */}
      {isModalOpen && selectedComplaint && (
        <div className="cv-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="cv-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="cv-modal-header">
              <h3>Verification: {selectedComplaint.complaintNumber}</h3>
              <button className="cv-close-btn" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>

            <div className="cv-modal-body">
              {/* 7. Track Complaint Workflow */}
              <div className="cv-workflow-tracker">
                {WORKFLOW_STEPS.map((step, idx) => (
                  <div key={idx} className={`cv-tracker-step ${idx + 1 < selectedComplaint.currentStep ? "completed" : ""} ${idx + 1 === selectedComplaint.currentStep ? "current" : ""}`}>
                    <div className="cv-tracker-circle">{idx + 1 < selectedComplaint.currentStep ? "✓" : idx + 1}</div>
                    <span className="cv-tracker-label">{step}</span>
                  </div>
                ))}
              </div>

              {/* Review Details */}
              <div className="cv-details-grid">
                <div className="cv-detail-card">
                  <h4>Work Details by {selectedComplaint.staffName}</h4>
                  <p>{selectedComplaint.workDetails}</p>
                </div>
                <div className="cv-detail-card">
                  <h4>Evidence / Photos</h4>
                  {selectedComplaint.photos.length > 0 ? (
                    <div className="cv-photo-grid">
                      {selectedComplaint.photos.map((url, i) => <img key={i} src={url} alt="Work proof" />)}
                    </div>
                  ) : (
                    <p className="cv-empty">No photos uploaded.</p>
                  )}
                </div>
              </div>

              {/* Record Closure Remarks */}
              <div className="cv-remarks-section">
                <h4>Verifier Remarks & Closure Details</h4>
                <textarea 
                  value={verifierRemarks} 
                  onChange={(e) => setVerifierRemarks(e.target.value)}
                  placeholder="Enter your verification remarks, observations, or reasons for return..."
                  rows="4"
                ></textarea>
              </div>
            </div>

            <div className="cv-modal-footer">
              <button className="cv-btn-return" onClick={handleReturnForAction}>↩ Return for Additional Action</button>
              <button className="cv-btn-verify" onClick={handleVerifyAndClose}>✅ Verify & Close Complaint</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplaintVerification;