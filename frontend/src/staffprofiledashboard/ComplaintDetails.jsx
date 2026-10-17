import React from "react";
import "./ComplaintDetails.css";
import StaffComplaintDetails from "./StaffComplaintDetails";

const ComplaintDetails = ({ complaint, onBack }) => {
  if (!complaint) return null;

  const priorityTone = { Critical: "red", Urgent: "amber", Normal: "green", High: "red", Medium: "amber", Low: "green" };

  return (
    <div className="cd-shell">
      <div className="cd-header">
        <button className="cd-back-btn" onClick={onBack}>
          ← Back to Dashboard
        </button>
        <h2>Complaint Details</h2>
      </div>

      <div className="cd-container">
        <div className="cd-info-bar">
          <div className="cd-info-item">
            <span>Complaint Number</span>
            <b className="cd-mono">{complaint.complaintNumber || "Not available"}</b>
          </div>
          <div className="cd-info-item">
            <span>Category & Issue</span>
            <b>{[complaint.category, complaint.issue].filter(Boolean).join(" · ") || "Not available"}</b>
          </div>
          <div className="cd-info-item">
            <span>Priority</span>
            <span className={`cd-badge cd-badge-${priorityTone[complaint.priority] || "amber"}`}>
              {complaint.priority || "Normal"}
            </span>
          </div>
          <div className="cd-info-item">
            <span>Status</span>
            <b>{complaint.status || "Not recorded"}</b>
          </div>
        </div>

        <StaffComplaintDetails complaint={complaint} />
      </div>
    </div>
  );
};

export default ComplaintDetails;
