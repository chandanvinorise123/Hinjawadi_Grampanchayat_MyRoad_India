import React, { useState, useEffect } from "react";
import "./PhysicalInspection.css";
import StaffComplaintDetails from "./StaffComplaintDetails";
import { toMediaUrl, uploadDashboardPhoto } from "../utils/dashboardApi";

const EMPTY_COMPLAINT = {
  id: "",
  complaintNumber: "",
  stage: 0,
  inspection: {
    inspectionDate: "",
    completionDate: "",
    remarks: "",
    actionTaken: "",
    sitePhoto: "",
    completionPhoto: "",
  },
};

const PhysicalInspection = ({ complaints, selectedId, onBack, onSaveInspection }) => {
  // Find the currently selected complaint or default to the first one
  const [currentComplaintId, setCurrentComplaintId] = useState(selectedId || complaints[0]?.id);
  const currentComplaint = complaints.find((c) => String(c.id) === String(currentComplaintId)) || complaints[0] || EMPTY_COMPLAINT;

  // Local state for the inspection form
  const [formData, setFormData] = useState({
    inspectionDate: "",
    completionDate: "",
    remarks: "",
    actionTaken: "",
    sitePhoto: "",
    completionPhoto: "",
    newStage: currentComplaint.stage,
  });
  const [uploadingPhoto, setUploadingPhoto] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // Reset form when complaint changes
  useEffect(() => {
    setFormData({
      inspectionDate: currentComplaint.inspection.inspectionDate || new Date().toISOString().slice(0, 16),
      completionDate: currentComplaint.inspection.completionDate || "",
      remarks: currentComplaint.inspection.remarks || "",
      actionTaken: currentComplaint.inspection.actionTaken || "",
      sitePhoto: currentComplaint.inspection.sitePhoto || "",
      completionPhoto: currentComplaint.inspection.completionPhoto || "",
      newStage: currentComplaint.stage,
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

  const handlePhotoChange = async (field, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormError("");
    setUploadingPhoto(field);
    try {
      const uploaded = await uploadDashboardPhoto(file);
      setFormData((prev) => ({ ...prev, [field]: uploaded.publicUrl }));
    } catch (error) {
      setFormError(error.message || "Unable to upload the inspection photograph.");
    } finally {
      setUploadingPhoto("");
      e.target.value = "";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      await onSaveInspection?.(currentComplaintId, formData);
      setFormError("");
    } catch (error) {
      setFormError(error.message || "Unable to save the inspection record.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pi-shell">
      {/* Header */}
      <div className="pi-header">
        <button className="pi-back-btn" onClick={onBack}>
          ← Back to Dashboard
        </button>
        <h2>Physical Inspection</h2>
      </div>

      <div className="pi-container">
        {/* Complaint Selector */}
        <div className="pi-selector-card">
          <label htmlFor="complaint-select">Select Complaint to Inspect:</label>
          <select 
            id="complaint-select" 
            value={currentComplaintId} 
            onChange={(e) => setCurrentComplaintId(e.target.value)}
          >
            {complaints.map((c) => (
              <option key={c.id} value={c.id}>
                {c.complaintNumber} - {c.issue} ({c.location})
              </option>
            ))}
          </select>
        </div>
        <StaffComplaintDetails complaint={currentComplaint} />
        {formError && <p className="pi-form-error" role="alert">{formError}</p>}

        {/* Inspection Form */}
        <form className="pi-form-card" onSubmit={handleSubmit}>
          <div className="pi-form-header">
            <h3>Inspection Record: {currentComplaint.complaintNumber}</h3>
            <p>{currentComplaint.issue} at {currentComplaint.location}</p>
          </div>

          <div className="pi-grid-2">
            {/* Date & Time */}
            <div className="pi-field">
              <label htmlFor="inspectionDate">Inspection Date & Time</label>
              <input
                id="inspectionDate"
                name="inspectionDate"
                type="datetime-local"
                value={formData.inspectionDate}
                onChange={handleChange}
                required
              />
            </div>

            <div className="pi-field">
              <label htmlFor="completionDate">Work Completion Date & Time</label>
              <input
                id="completionDate"
                name="completionDate"
                type="datetime-local"
                value={formData.completionDate}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Update Status */}
          <div className="pi-field pi-full-width">
            <label htmlFor="newStage">Update Inspection Status</label>
            <select 
              id="newStage" 
              name="newStage" 
              value={formData.newStage} 
              onChange={handleChange}
              className="pi-status-select"
            >
              {stageLabels.map((label, index) => (
                <option key={index} value={index}>{label}</option>
              ))}
            </select>
          </div>

          {/* Remarks */}
          <div className="pi-field pi-full-width">
            <label htmlFor="remarks">Inspection Remarks</label>
            <textarea
              id="remarks"
              name="remarks"
              rows="4"
              placeholder="Describe your physical inspection findings here..."
              value={formData.remarks}
              onChange={handleChange}
              required
            ></textarea>
          </div>

          <div className="pi-field pi-full-width">
            <label htmlFor="actionTaken">Action Taken / Work Remarks</label>
            <textarea
              id="actionTaken"
              name="actionTaken"
              rows="3"
              placeholder="Describe the repair or action carried out..."
              value={formData.actionTaken}
              onChange={handleChange}
            ></textarea>
          </div>

          {/* Photographs */}
          <div className="pi-grid-2">
            <div className="pi-field">
              <label>Before-Work / Site Photograph</label>
              <div className="pi-photo-upload">
                <span>{uploadingPhoto === "sitePhoto" ? "Uploading..." : formData.sitePhoto ? "Replace site photo" : "Click to upload site photo"}</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  disabled={Boolean(uploadingPhoto)}
                  onChange={(e) => handlePhotoChange("sitePhoto", e)} 
                />
              </div>
              {formData.sitePhoto && <img className="pi-photo-preview" src={toMediaUrl(formData.sitePhoto)} alt="Before-work site evidence" />}
            </div>

            <div className="pi-field">
              <label>After-Work / Completion Photograph</label>
              <div className="pi-photo-upload">
                <span>{uploadingPhoto === "completionPhoto" ? "Uploading..." : formData.completionPhoto ? "Replace completion photo" : "Click to upload after-repair photo"}</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  disabled={Boolean(uploadingPhoto)}
                  onChange={(e) => handlePhotoChange("completionPhoto", e)} 
                />
              </div>
              {formData.completionPhoto && <img className="pi-photo-preview" src={toMediaUrl(formData.completionPhoto)} alt="After-work completion evidence" />}
            </div>
          </div>

          {/* Form Actions */}
          <div className="pi-form-actions">
            <button type="button" className="pi-btn-outline" onClick={onBack}>Cancel</button>
            <button type="submit" className="pi-btn-primary" disabled={saving || Boolean(uploadingPhoto)}>{saving ? "Saving..." : "💾 Save Inspection Record"}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PhysicalInspection;