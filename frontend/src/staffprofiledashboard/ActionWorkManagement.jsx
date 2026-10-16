import React, { useState, useEffect } from "react";
import "./ActionWorkManagement.css";

const EMPTY_COMPLAINT = {
  id: "",
  complaintNumber: "",
  issue: "",
  location: "",
  stage: 0,
  inspection: {
    actionTaken: "",
    remarks: "",
    sitePhoto: "",
    completionPhoto: "",
    completionDate: "",
  },
};

const ActionWorkManagement = ({ complaints, selectedId, onBack, onUpdateWork }) => {
  const [currentComplaintId, setCurrentComplaintId] = useState(selectedId || complaints[0]?.id);
  const currentComplaint = complaints.find((c) => String(c.id) === String(currentComplaintId)) || complaints[0] || EMPTY_COMPLAINT;

  const [formData, setFormData] = useState({
    actionTaken: "",
    remarks: "",
    newStage: currentComplaint.stage,
    beforePhoto: "",
    afterPhoto: "",
    completionDateTime: "",
  });

  // Reset form when complaint changes
  useEffect(() => {
    setFormData({
      actionTaken: currentComplaint.inspection.actionTaken || "",
      remarks: currentComplaint.inspection.remarks || "",
      newStage: currentComplaint.stage,
      beforePhoto: currentComplaint.inspection.sitePhoto || "",
      afterPhoto: currentComplaint.inspection.completionPhoto || "",
      completionDateTime: currentComplaint.inspection.completionDate || "",
    });
  }, [currentComplaintId, currentComplaint]);

  const stageLabels = [
    "Action Initiated",
    "Work In Progress",
    "Work Completed",
    "After-Repair Upload",
    "Verification",
    "Work Resolved / Closed",
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (field, e) => {
    const fileName = e.target.files?.[0]?.name || "";
    setFormData((prev) => ({ ...prev, [field]: fileName }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onUpdateWork) {
      onUpdateWork(currentComplaintId, formData);
    }
    alert(`Work update for ${currentComplaint.complaintNumber} saved successfully!`);
  };

  return (
    <div className="awm-shell">
      {/* Header */}
      <div className="awm-header">
        <button className="awm-back-btn" onClick={onBack}>
          ← Back to Dashboard
        </button>
        <h2>Action / Work Management</h2>
      </div>

      <div className="awm-container">
        {/* Complaint Selector */}
        <div className="awm-selector-card">
          <label htmlFor="complaint-select">Select Complaint:</label>
          <select 
            id="complaint-select" 
            value={currentComplaintId} 
            onChange={(e) =>             setCurrentComplaintId(e.target.value)}
          >
            {complaints.map((c) => (
              <option key={c.id} value={c.id}>
                {c.complaintNumber} - {c.issue} ({c.location})
              </option>
            ))}
          </select>
        </div>

        {/* Work Management Form */}
        <form className="awm-form-card" onSubmit={handleSubmit}>
          <div className="awm-form-header">
            <h3>Manage Work: {currentComplaint.complaintNumber}</h3>
            <p>{currentComplaint.issue} at {currentComplaint.location}</p>
          </div>

          {/* Row 1: Completion Date & Status Update */}
          <div className="awm-grid-2">
            <div className="awm-field">
              <label htmlFor="completionDateTime">Work Completion Date & Time</label>
              <input
                id="completionDateTime"
                name="completionDateTime"
                type="datetime-local"
                value={formData.completionDateTime}
                onChange={handleChange}
              />
            </div>

            <div className="awm-field">
              <label htmlFor="newStage">Update Work Status</label>
              <select 
                id="newStage" 
                name="newStage" 
                value={formData.newStage} 
                onChange={handleChange}
                className="awm-status-select"
              >
                {stageLabels.map((label, index) => (
                  <option key={index} value={index}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Action Taken */}
          <div className="awm-field awm-full-width">
            <label htmlFor="actionTaken">Record Action Taken</label>
            <textarea
              id="actionTaken"
              name="actionTaken"
              rows="3"
              placeholder="Describe the specific actions or repairs carried out..."
              value={formData.actionTaken}
              onChange={handleChange}
              required
            ></textarea>
          </div>

          {/* Row 3: Work Remarks */}
          <div className="awm-field awm-full-width">
            <label htmlFor="remarks">Add Work-Related Remarks</label>
            <textarea
              id="remarks"
              name="remarks"
              rows="2"
              placeholder="Add any additional notes, observations, or remarks about the work..."
              value={formData.remarks}
              onChange={handleChange}
            ></textarea>
          </div>

          {/* Row 4: Photo Uploads */}
          <div className="awm-grid-2">
            <div className="awm-field">
              <label>Upload Before-Work Photograph</label>
              <div className="awm-photo-upload">
                <span>{formData.beforePhoto ? `📷 ${formData.beforePhoto}` : "Click to upload before-work photo"}</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => handlePhotoChange("beforePhoto", e)} 
                />
              </div>
            </div>

            <div className="awm-field">
              <label>Upload Work Completion / After-Work Photograph</label>
              <div className="awm-photo-upload">
                <span>{formData.afterPhoto ? `📷 ${formData.afterPhoto}` : "Click to upload after-work photo"}</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => handlePhotoChange("afterPhoto", e)} 
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="awm-form-actions">
            <button type="button" className="awm-btn-outline" onClick={onBack}>Cancel</button>
            <button type="submit" className="awm-btn-primary">💾 Save Work Update</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ActionWorkManagement;