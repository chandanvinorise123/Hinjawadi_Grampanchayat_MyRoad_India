import React, { useState, useMemo } from "react";
import "./ComplaintVerification.css";

// ==========================================
// 1. HARDCODED MOCK DATA
// ==========================================
const MOCK_VERIFICATION_QUEUE = [
  {
    id: "V1", complaintNumber: "MRI-849201", issue: "Large Pothole Repair", location: "Hinjawadi Phase 2",
    staffName: "Shiv Kumar", assignedDate: "2023-10-26", currentStep: 3, // 1:Work Started, 2:Under Working, 3:Under Verification, 4:Verified, 5:Completed
    workDetails: "Excavated the damaged area, filled with cold mix asphalt, and compacted using a roller. Barricades removed.",
    photos: ["https://images.unsplash.com/photo-1590486803833-1c5dc8ddd4c8?auto=format&fit=crop&w=400&q=80"],
    remarks: ""
  },
  {
    id: "V2", complaintNumber: "MRI-849204", issue: "Cracked Road Sealing", location: "Pirangut Road",
    staffName: "Anil Patil", assignedDate: "2023-10-24", currentStep: 4,
    workDetails: "Cracks sealed with bituminous emulsion. Road markings repainted.",
    photos: [],
    remarks: "Work looks good, ready for final closure."
  },
  {
    id: "V3", complaintNumber: "MRI-849208", issue: "Street Light Replacement", location: "Marunji Road",
    staffName: "Ramesh Yadav", assignedDate: "2023-10-27", currentStep: 2,
    workDetails: "Waiting for new LED bulb delivery. Temporary light installed.",
    photos: [],
    remarks: ""
  }
];

const WORKFLOW_STEPS = ["Work Started", "Under Working", "Under Verification", "Verified", "Work Completed"];

const ComplaintVerification = ({ onBack }) => {
  const [complaints, setComplaints] = useState(MOCK_VERIFICATION_QUEUE);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [verifierRemarks, setVerifierRemarks] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 3000);
  };

  // Stats
  const stats = useMemo(() => ({
    pending: complaints.filter(c => c.currentStep === 3).length,
    verified: complaints.filter(c => c.currentStep === 4).length,
    completed: complaints.filter(c => c.currentStep === 5).length,
    returned: 1 // Mock data for returned
  }), [complaints]);

  const openVerificationModal = (complaint) => {
    setSelectedComplaint({ ...complaint });
    setVerifierRemarks(complaint.remarks || "");
    setIsModalOpen(true);
  };

  // Action: Verify and Close
  const handleVerifyAndClose = () => {
    if (!verifierRemarks.trim()) {
      showMessage("error", "Please add closure remarks before verifying.");
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
  const handleReturnForAction = () => {
    if (!verifierRemarks.trim()) {
      showMessage("error", "Please add remarks explaining why it's being returned.");
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