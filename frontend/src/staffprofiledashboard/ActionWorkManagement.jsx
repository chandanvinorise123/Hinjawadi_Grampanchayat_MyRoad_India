import React, { useMemo, useState } from "react";
import "./ActionWorkManagement.css";
import StaffComplaintDetails from "./StaffComplaintDetails";
import { toMediaUrl, uploadDashboardPhoto } from "../utils/dashboardApi";

const createFormData = (complaint) => ({
  actionTaken: complaint?.inspection?.actionTaken || "",
  remarks: complaint?.inspection?.remarks || "",
  newStage: complaint?.stage ?? 0,
  beforePhoto: complaint?.inspection?.sitePhoto || "",
  afterPhoto: complaint?.inspection?.completionPhoto || "",
  completionDateTime: complaint?.inspection?.completionDate || "",
});

const ActionWorkManagement = ({ complaints, onBack, onUpdateWork }) => {
  const [currentComplaintId, setCurrentComplaintId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const currentComplaint = complaints.find((complaint) =>
    String(complaint.id) === String(currentComplaintId)
  ) || null;
  const sortedComplaints = useMemo(
    () => [...complaints].sort((first, second) => {
      const firstTime = new Date(first.updatedAt || first.createdAt || 0).getTime();
      const secondTime = new Date(second.updatedAt || second.createdAt || 0).getTime();
      return secondTime - firstTime;
    }),
    [complaints]
  );
  const filteredComplaints = sortedComplaints.filter((complaint) => {
    const query = searchTerm.trim().toLowerCase();
    return !query || [
      complaint.complaintNumber,
      complaint.issue,
      complaint.category,
      complaint.location,
      complaint.citizenName,
      complaint.status,
    ].some((value) => String(value || "").toLowerCase().includes(query));
  });

  const [formData, setFormData] = useState(() => createFormData(null));
  const [uploadingPhoto, setUploadingPhoto] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

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
      setFormError(error.message || "Unable to upload the work photograph.");
    } finally {
      setUploadingPhoto("");
      e.target.value = "";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentComplaint) return;
    setSaving(true);
    setFormError("");
    try {
      await onUpdateWork?.(currentComplaintId, formData);
      setFormError("");
    } catch (error) {
      setFormError(error.message || "Unable to save the work update.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="awm-shell">
      {/* Header */}
      <div className="awm-header">
        <button className="awm-back-btn" type="button" onClick={onBack}>
          ← Back to Dashboard
        </button>
        <div>
          <span className="awm-eyebrow">Staff workspace</span>
          <h2>{currentComplaint ? "Update Assigned Work" : "Action / Work Management"}</h2>
          <p>
            {currentComplaint
              ? `Review and update ${currentComplaint.complaintNumber || "this assigned complaint"}.`
              : "Review your assigned complaints and keep work progress up to date."}
          </p>
        </div>
      </div>

      <div className="awm-container">
        {!currentComplaint && (
        <section className="awm-table-card" aria-label="Assigned complaints awaiting work updates">
          <div className="awm-table-heading">
            <div>
              <span className="awm-eyebrow">Your workload</span>
              <h3>Assigned Complaints</h3>
              <p>Choose a complaint to review its information and update the work record.</p>
            </div>
            <span className="awm-count">{complaints.length} assigned</span>
          </div>
          <label className="awm-search">
            <span>Search complaints</span>
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Complaint number, issue, citizen, location..."
            />
          </label>
          <div className="awm-table-wrap">
            <table className="awm-table">
              <thead>
                <tr>
                  <th>Complaint</th>
                  <th>Issue & Location</th>
                  <th>Status</th>
                  <th>Last Updated</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredComplaints.length ? filteredComplaints.map((complaint) => (
                  <tr key={complaint.id}>
                    <td>
                      <b className="awm-complaint-number">{complaint.complaintNumber || "Complaint"}</b>
                      <span className="awm-cell-note">{complaint.citizenName || "Citizen not available"}</span>
                    </td>
                    <td>
                      <b>{complaint.issue || complaint.category || "Issue not specified"}</b>
                      <span className="awm-cell-note">{complaint.location || "Location pending"}</span>
                    </td>
                    <td><span className="awm-status-badge">{complaint.status || "Status unavailable"}</span></td>
                    <td>{complaint.updatedAt ? new Date(complaint.updatedAt).toLocaleString() : "Not updated"}</td>
                    <td>
                      <button
                        className="awm-select-btn"
                        type="button"
                        onClick={() => {
                          setCurrentComplaintId(complaint.id);
                          setFormData(createFormData(complaint));
                          setFormError("");
                        }}
                      >
                        Update Work
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td className="awm-empty" colSpan="5">
                      {complaints.length
                        ? "No assigned complaints match your search."
                        : "No complaints are currently assigned to you."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        )}

        {currentComplaint && (
          <section className="awm-workspace">
            <button
              className="awm-list-back-btn"
              type="button"
              onClick={() => {
                setCurrentComplaintId("");
                setFormError("");
              }}
              disabled={saving}
            >
              ← Back to Assigned Complaints
            </button>
            <div className="awm-update-layout">
              <section className="awm-details-card">
                <div className="awm-section-heading">
                  <div>
                    <span className="awm-eyebrow">Complaint information</span>
                    <h3>{currentComplaint.complaintNumber}</h3>
                  </div>
                  <span className="awm-status-badge">{currentComplaint.status || "Status unavailable"}</span>
                </div>
                <StaffComplaintDetails complaint={currentComplaint} showActivity={false} />
              </section>

              <form className="awm-form-card" onSubmit={handleSubmit}>
                <div className="awm-form-header">
                  <span className="awm-eyebrow">Work update</span>
                  <h3>Update assigned work</h3>
                  <p>Record the work performed and attach clear before/after evidence.</p>
                </div>
                {formError && <p className="awm-form-error" role="alert">{formError}</p>}

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
                    <label htmlFor="newStage">Work Status</label>
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

                <div className="awm-field awm-full-width">
                  <label htmlFor="actionTaken">Work Performed</label>
                  <textarea
                    id="actionTaken"
                    name="actionTaken"
                    rows="4"
                    placeholder="Describe the repairs or actions completed..."
                    value={formData.actionTaken}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="awm-field awm-full-width">
                  <label htmlFor="remarks">Work Remarks</label>
                  <textarea
                    id="remarks"
                    name="remarks"
                    rows="3"
                    placeholder="Add observations or additional work notes..."
                    value={formData.remarks}
                    onChange={handleChange}
                  />
                </div>

                <div className="awm-photo-grid">
                  <div className="awm-field">
                    <label>Before-Work Photograph</label>
                    <div className="awm-photo-upload">
                      <span>{uploadingPhoto === "beforePhoto" ? "Uploading..." : formData.beforePhoto ? "Replace before-work photo" : "Choose a before-work photo"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={Boolean(uploadingPhoto) || saving}
                        onChange={(event) => handlePhotoChange("beforePhoto", event)}
                      />
                    </div>
                    {formData.beforePhoto && (
                      <img className="awm-photo-preview" src={toMediaUrl(formData.beforePhoto)} alt="Before-work evidence" />
                    )}
                  </div>

                  <div className="awm-field">
                    <label>After-Work Photograph</label>
                    <div className="awm-photo-upload">
                      <span>{uploadingPhoto === "afterPhoto" ? "Uploading..." : formData.afterPhoto ? "Replace after-work photo" : "Choose an after-work photo"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={Boolean(uploadingPhoto) || saving}
                        onChange={(event) => handlePhotoChange("afterPhoto", event)}
                      />
                    </div>
                    {formData.afterPhoto && (
                      <img className="awm-photo-preview" src={toMediaUrl(formData.afterPhoto)} alt="After-work evidence" />
                    )}
                  </div>
                </div>

                <div className="awm-form-actions">
                  <button
                    type="button"
                    className="awm-btn-outline"
                    onClick={() => {
                      setCurrentComplaintId("");
                      setFormError("");
                    }}
                    disabled={saving}
                  >
                    Back to Assigned Complaints
                  </button>
                  <button type="submit" className="awm-btn-primary" disabled={saving || Boolean(uploadingPhoto)}>
                    {saving ? "Saving update..." : "Save Work Update"}
                  </button>
                </div>
              </form>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default ActionWorkManagement;