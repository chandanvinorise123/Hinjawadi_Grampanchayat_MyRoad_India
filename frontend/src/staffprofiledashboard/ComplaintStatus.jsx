import React, { useMemo, useState } from "react";
import "./ComplaintStatus.css";
import StaffComplaintDetails from "./StaffComplaintDetails";
import { toMediaUrl, uploadDashboardPhoto } from "../utils/dashboardApi";

const stageLabels = [
  "Action Initiated",
  "Work In Progress",
  "Work Completed",
  "After-Repair Upload",
  "Verification",
  "Work Resolved / Closed",
];

const createWorkForm = (complaint) => ({
  newStage: complaint?.stage ?? 0,
  inspectionDate: complaint?.inspection?.inspectionDate || "",
  actionTaken: complaint?.inspection?.actionTaken || "",
  remarks: complaint?.inspection?.remarks || "",
  completionDateTime: complaint?.inspection?.completionDate || "",
  beforePhoto: complaint?.inspection?.sitePhoto || "",
  afterPhoto: complaint?.inspection?.completionPhoto || "",
});

const getLatestStaffUpdate = (complaint) => (complaint.log || [])
  .filter((entry) => /staff/i.test(entry.actor || ""))
  .reduce((latest, entry) => {
    const timestamp = new Date(entry.time || 0).getTime();
    return Number.isFinite(timestamp) && timestamp > latest.timestamp
      ? { entry, timestamp }
      : latest;
  }, { entry: null, timestamp: 0 });

const ComplaintStatus = ({ complaints = [], onBack, onWorkUpdate }) => {
  const [currentComplaintId, setCurrentComplaintId] = useState("");
  const [formData, setFormData] = useState(() => createWorkForm(null));
  const [searchTerm, setSearchTerm] = useState("");
  const [updateMessage, setUpdateMessage] = useState("");
  const [updateError, setUpdateError] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState("");
  const [saving, setSaving] = useState(false);
  const currentComplaint = complaints.find((complaint) =>
    String(complaint.id) === String(currentComplaintId)
  ) || null;

  const sortedComplaints = useMemo(
    () => complaints
      .map((complaint) => ({ complaint, latestStaffUpdate: getLatestStaffUpdate(complaint) }))
      .sort((first, second) => {
        const firstTimestamp = first.latestStaffUpdate.timestamp ||
          new Date(first.complaint.updatedAt || first.complaint.createdAt || 0).getTime() || 0;
        const secondTimestamp = second.latestStaffUpdate.timestamp ||
          new Date(second.complaint.updatedAt || second.complaint.createdAt || 0).getTime() || 0;
        return secondTimestamp - firstTimestamp;
      }),
    [complaints]
  );
  const filteredComplaints = sortedComplaints.filter(({ complaint }) => {
    const query = searchTerm.trim().toLowerCase();
    return !query || [
      complaint.complaintNumber,
      complaint.issue,
      complaint.category,
      complaint.location,
      complaint.status,
      complaint.assignedStaff,
    ].some((value) => String(value || "").toLowerCase().includes(query));
  });

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const handlePhotoChange = async (field, event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUpdateError("");
    setUploadingPhoto(field);
    try {
      const uploaded = await uploadDashboardPhoto(file);
      setFormData((previous) => ({ ...previous, [field]: uploaded.publicUrl }));
    } catch (error) {
      setUpdateError(error.message || "Unable to upload the work photograph.");
    } finally {
      setUploadingPhoto("");
      event.target.value = "";
    }
  };

  const saveWorkUpdate = async (event) => {
    event.preventDefault();
    if (!currentComplaint) return;
    setSaving(true);
    setUpdateError("");
    setUpdateMessage("");
    try {
      await onWorkUpdate?.(currentComplaint.id, formData);
      setUpdateMessage("Work details and status were saved successfully.");
    } catch (error) {
      setUpdateError(error.message || "Unable to save the complaint update.");
    } finally {
      setSaving(false);
    }
  };

  const selectComplaint = (complaint) => {
    setCurrentComplaintId(complaint.id);
    setFormData(createWorkForm(complaint));
    setUpdateMessage("");
    setUpdateError("");
  };

  return (
    <div className="cs-shell">
      <header className="cs-header">
        <button className="cs-back-btn" type="button" onClick={onBack}>
          ← Back to Dashboard
        </button>
        <div>
          <span className="cs-eyebrow">Staff workspace</span>
          <h2>{currentComplaint ? "Complaint Status & Work Update" : "Complaint Status Update"}</h2>
          <p>
            {currentComplaint
              ? `Review and update ${currentComplaint.complaintNumber || "this complaint"}.`
              : "Monitor every assigned complaint and update its progress when needed."}
          </p>
        </div>
      </header>

      <main className="cs-container">
        {!currentComplaint ? (
          <section className="cs-list-panel" aria-label="Assigned complaints and work status">
            <div className="cs-list-heading">
              <div>
                <span className="cs-eyebrow">Assigned workload</span>
                <h3>Complaint Work Status</h3>
                <p>Latest staff updates appear first. Open a complaint to review or update its work.</p>
              </div>
              <span className="cs-count">{complaints.length} complaints</span>
            </div>
            <label className="cs-search">
              <span>Search complaints</span>
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Complaint number, issue, location, status..."
              />
            </label>
            <div className="cs-table-wrap">
              <table className="cs-table">
                <thead>
                  <tr>
                    <th>Complaint</th>
                    <th>Issue & Location</th>
                    <th>Current Status</th>
                    <th>Latest Staff Update</th>
                    <th>Updated At</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredComplaints.length ? filteredComplaints.map(({ complaint, latestStaffUpdate }) => (
                    <tr key={complaint.id}>
                      <td>
                        <b className="cs-complaint-number">{complaint.complaintNumber || "Complaint"}</b>
                        <span className="cs-cell-note">{complaint.citizenName || "Citizen not available"}</span>
                      </td>
                      <td>
                        <b>{complaint.issue || complaint.category || "Issue not specified"}</b>
                        <span className="cs-cell-note">{complaint.location || "Location not recorded"}</span>
                      </td>
                      <td><span className="cs-status-badge">{complaint.status || "Not recorded"}</span></td>
                      <td className="cs-update-message">
                        {latestStaffUpdate.entry?.text || complaint.inspection?.actionTaken || "Awaiting staff work update"}
                      </td>
                      <td>
                        {latestStaffUpdate.entry?.time
                          ? new Date(latestStaffUpdate.entry.time).toLocaleString()
                          : complaint.updatedAt
                            ? new Date(complaint.updatedAt).toLocaleString()
                            : "Not updated"}
                      </td>
                      <td>
                        <button
                          className="cs-view-btn"
                          type="button"
                          onClick={() => selectComplaint(complaint)}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td className="cs-empty" colSpan="6">
                        {complaints.length
                          ? "No complaints match your search."
                          : "No complaints are currently assigned to you."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          <>
            <button
              className="cs-return-btn"
              type="button"
              onClick={() => {
                setCurrentComplaintId("");
                setUpdateMessage("");
                setUpdateError("");
              }}
              disabled={saving}
            >
              ← Back to Complaint List
            </button>
            {updateMessage && <div className="cs-success-banner" role="status">✓ {updateMessage}</div>}
            {updateError && <div className="cs-error-banner" role="alert">{updateError}</div>}

            <div className="cs-detail-layout">
              <section className="cs-information-panel">
                <header className="cs-panel-heading">
                  <div>
                    <span className="cs-eyebrow">Original report</span>
                    <h3>Complaint Information</h3>
                  </div>
                  <span className="cs-status-badge">{currentComplaint.status || "Not recorded"}</span>
                </header>
                <div className="cs-complaint-info">
                  <StaffComplaintDetails
                    complaint={currentComplaint}
                    layout="complaint-only"
                    showActivity={false}
                  />
                </div>
              </section>

              <form className="cs-work-panel" onSubmit={saveWorkUpdate}>
                <header className="cs-panel-heading">
                  <div>
                    <span className="cs-eyebrow">Progress & staff work</span>
                    <h3>Status and Work Update</h3>
                  </div>
                </header>
                <div className="cs-work-content">
                  <div className="cs-status-summary">
                    <span>Current workflow status</span>
                    <b>{currentComplaint.status || stageLabels[formData.newStage]}</b>
                  </div>
                  <div className="cs-stepper" aria-label="Complaint workflow stages">
                    {stageLabels.map((label, index) => (
                      <div
                        key={label}
                        className={`cs-step ${index < Number(formData.newStage) ? "completed" : index === Number(formData.newStage) ? "active" : "pending"}`}
                      >
                        <span className="cs-step-dot">{index < Number(formData.newStage) ? "✓" : index + 1}</span>
                        <span className="cs-step-label">{label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="cs-form-fields">
                    <div className="cs-field">
                      <label htmlFor="cs-stage">Update Work Status</label>
                      <select
                        id="cs-stage"
                        name="newStage"
                        value={formData.newStage}
                        onChange={handleFieldChange}
                      >
                        {stageLabels.map((label, index) => (
                          <option key={label} value={index}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="cs-field">
                      <label htmlFor="cs-inspection-time">Inspection Date & Time</label>
                      <input
                        id="cs-inspection-time"
                        name="inspectionDate"
                        type="datetime-local"
                        value={formData.inspectionDate}
                        onChange={handleFieldChange}
                      />
                    </div>
                    <div className="cs-field">
                      <label htmlFor="cs-completion-time">Work Completion Date & Time</label>
                      <input
                        id="cs-completion-time"
                        name="completionDateTime"
                        type="datetime-local"
                        value={formData.completionDateTime}
                        onChange={handleFieldChange}
                      />
                    </div>
                    <div className="cs-field">
                      <label htmlFor="cs-action-taken">Work Performed</label>
                      <textarea
                        id="cs-action-taken"
                        name="actionTaken"
                        rows="4"
                        value={formData.actionTaken}
                        onChange={handleFieldChange}
                        placeholder="Describe the repairs or work completed..."
                      />
                    </div>
                    <div className="cs-field">
                      <label htmlFor="cs-remarks">Work Remarks</label>
                      <textarea
                        id="cs-remarks"
                        name="remarks"
                        rows="3"
                        value={formData.remarks}
                        onChange={handleFieldChange}
                        placeholder="Add observations or additional work notes..."
                      />
                    </div>
                    <div className="cs-photo-fields">
                      {[
                        ["beforePhoto", "Before-Work Photograph"],
                        ["afterPhoto", "After-Work Photograph"],
                      ].map(([field, label]) => (
                        <div className="cs-field" key={field}>
                          <label htmlFor={`cs-${field}`}>{label}</label>
                          <div className="cs-photo-upload">
                            <span>
                              {uploadingPhoto === field
                                ? "Uploading..."
                                : formData[field] ? "Replace photograph" : "Choose photograph"}
                            </span>
                            <input
                              id={`cs-${field}`}
                              type="file"
                              accept="image/*"
                              disabled={Boolean(uploadingPhoto) || saving}
                              onChange={(event) => handlePhotoChange(field, event)}
                            />
                          </div>
                          {formData[field] && (
                            <img
                              className="cs-photo-preview"
                              src={toMediaUrl(formData[field])}
                              alt={label}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="cs-form-actions">
                      <button
                        className="cs-btn-outline"
                        type="button"
                        onClick={() => setCurrentComplaintId("")}
                        disabled={saving}
                      >
                        Back to List
                      </button>
                      <button
                        className="cs-btn-primary"
                        type="submit"
                        disabled={saving || Boolean(uploadingPhoto)}
                      >
                        {saving ? "Saving..." : "Save Status & Work"}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default ComplaintStatus;
