import React, { useEffect, useMemo, useState } from "react";
import "./PhysicalInspection.css";
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

const createInspectionForm = (complaint) => ({
  inspectionDate: complaint?.inspection?.inspectionDate || new Date().toISOString().slice(0, 16),
  completionDate: complaint?.inspection?.completionDate || "",
  remarks: complaint?.inspection?.remarks || "",
  actionTaken: complaint?.inspection?.actionTaken || "",
  sitePhoto: complaint?.inspection?.sitePhoto || "",
  completionPhoto: complaint?.inspection?.completionPhoto || "",
  newStage: complaint?.stage ?? 0,
});

const latestStaffUpdate = (complaint) => (complaint.log || [])
  .filter((entry) => /staff/i.test(entry.actor || ""))
  .reduce((latest, entry) => {
    const timestamp = new Date(entry.time || 0).getTime();
    return Number.isFinite(timestamp) && timestamp > latest.timestamp
      ? { entry, timestamp }
      : latest;
  }, { entry: null, timestamp: 0 });

const PhysicalInspection = ({ complaints = [], onBack, onSaveInspection }) => {
  const [viewingComplaintId, setViewingComplaintId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState(() => createInspectionForm(null));
  const [uploadingPhoto, setUploadingPhoto] = useState("");
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const currentComplaint = complaints.find((complaint) =>
    String(complaint.id) === String(viewingComplaintId)
  ) || null;

  const sortedComplaints = useMemo(
    () => complaints
      .map((complaint) => ({ complaint, latestUpdate: latestStaffUpdate(complaint) }))
      .sort((first, second) => {
        const firstTimestamp = first.latestUpdate.timestamp ||
          new Date(first.complaint.updatedAt || first.complaint.createdAt || 0).getTime() || 0;
        const secondTimestamp = second.latestUpdate.timestamp ||
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
    ].some((value) => String(value || "").toLowerCase().includes(query));
  });

  useEffect(() => {
    if (!currentComplaint) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape" && !saving) setViewingComplaintId("");
    };
    document.addEventListener("keydown", closeOnEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = "";
    };
  }, [currentComplaint, saving]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const handlePhotoChange = async (field, event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFormError("");
    setUploadingPhoto(field);
    try {
      const uploaded = await uploadDashboardPhoto(file);
      setFormData((previous) => ({ ...previous, [field]: uploaded.publicUrl }));
    } catch (error) {
      setFormError(error.message || "Unable to upload the inspection photograph.");
    } finally {
      setUploadingPhoto("");
      event.target.value = "";
    }
  };

  const openComplaint = (complaint) => {
    setFormData(createInspectionForm(complaint));
    setViewingComplaintId(complaint.id);
    setFormError("");
    setSuccessMessage("");
  };

  const closeDetails = () => {
    if (saving) return;
    setViewingComplaintId("");
    setFormError("");
    setSuccessMessage("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!currentComplaint) return;
    setSaving(true);
    setFormError("");
    setSuccessMessage("");
    try {
      await onSaveInspection?.(currentComplaint.id, formData);
      setSuccessMessage("Inspection record saved successfully.");
    } catch (error) {
      setFormError(error.message || "Unable to save the inspection record.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pi-shell">
      <header className="pi-header">
        <button className="pi-back-btn" type="button" onClick={onBack}>
          ← Back to Dashboard
        </button>
        <div>
          <span className="pi-eyebrow">Staff workspace</span>
          <h2>Physical Inspection</h2>
          <p>Review assigned complaints and record inspection findings, work progress, and evidence.</p>
        </div>
      </header>

      <main className="pi-container">
        <section className="pi-table-card" aria-label="Assigned complaints for physical inspection">
          <div className="pi-table-heading">
            <div>
              <span className="pi-eyebrow">Assigned workload</span>
              <h3>Complaints for Inspection</h3>
              <p>Open a complaint to review its report and update inspection details.</p>
            </div>
            <span className="pi-count">{complaints.length} complaints</span>
          </div>
          <label className="pi-search">
            <span>Search complaints</span>
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Complaint number, issue, location, or status..."
            />
          </label>
          <div className="pi-table-wrap">
            <table className="pi-table">
              <thead>
                <tr>
                  <th>Complaint</th>
                  <th>Issue & Location</th>
                  <th>Status</th>
                  <th>Latest Staff Update</th>
                  <th>Last Updated</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredComplaints.length ? filteredComplaints.map(({ complaint, latestUpdate }) => (
                  <tr key={complaint.id}>
                    <td>
                      <b className="pi-complaint-number">{complaint.complaintNumber || "Complaint"}</b>
                      <span className="pi-cell-note">{complaint.citizenName || "Citizen not available"}</span>
                    </td>
                    <td>
                      <b>{complaint.issue || complaint.category || "Issue not specified"}</b>
                      <span className="pi-cell-note">{complaint.location || "Location not recorded"}</span>
                    </td>
                    <td><span className="pi-status-badge">{complaint.status || "Not recorded"}</span></td>
                    <td className="pi-update-summary">
                      {latestUpdate.entry?.text || complaint.inspection?.actionTaken || "No staff update recorded"}
                    </td>
                    <td>
                      {latestUpdate.entry?.time
                        ? new Date(latestUpdate.entry.time).toLocaleString()
                        : complaint.updatedAt
                          ? new Date(complaint.updatedAt).toLocaleString()
                          : "Not updated"}
                    </td>
                    <td>
                      <button className="pi-view-btn" type="button" onClick={() => openComplaint(complaint)}>
                        View Details
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td className="pi-empty" colSpan="6">
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
      </main>

      {currentComplaint && (
        <div className="pi-modal-overlay" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeDetails();
        }}>
          <section className="pi-modal" role="dialog" aria-modal="true" aria-label={`Inspection details for ${currentComplaint.complaintNumber}`}>
            <header className="pi-modal-header">
              <div>
                <span className="pi-eyebrow">Inspection record</span>
                <h3>{currentComplaint.complaintNumber || "Complaint details"}</h3>
              </div>
              <button className="pi-modal-close" type="button" onClick={closeDetails} aria-label="Close details">×</button>
            </header>

            <div className="pi-modal-body">
              <div className="pi-detail-layout">
                <section className="pi-information-panel">
                  <header className="pi-panel-heading">
                    <h4>Complaint Information</h4>
                    <span className="pi-status-badge">{currentComplaint.status || "Not recorded"}</span>
                  </header>
                  <div className="pi-complaint-information">
                    <StaffComplaintDetails
                      complaint={currentComplaint}
                      layout="complaint-only"
                      showActivity={false}
                    />
                  </div>
                </section>

                <form className="pi-form-card" onSubmit={handleSubmit}>
                  <header className="pi-panel-heading">
                    <div>
                      <span className="pi-eyebrow">Staff record</span>
                      <h4>Inspection & Work Update</h4>
                    </div>
                  </header>
                  <div className="pi-form-content">
                    {successMessage && <p className="pi-success" role="status">{successMessage}</p>}
                    {formError && <p className="pi-form-error" role="alert">{formError}</p>}

                    <div className="pi-grid-2">
                      <div className="pi-field">
                        <label htmlFor="pi-inspection-date">Inspection Date & Time</label>
                        <input
                          id="pi-inspection-date"
                          name="inspectionDate"
                          type="datetime-local"
                          value={formData.inspectionDate}
                          onChange={handleChange}
                          required
                        />
                      </div>
                      <div className="pi-field">
                        <label htmlFor="pi-completion-date">Work Completion Date & Time</label>
                        <input
                          id="pi-completion-date"
                          name="completionDate"
                          type="datetime-local"
                          value={formData.completionDate}
                          onChange={handleChange}
                        />
                      </div>
                    </div>

                    <div className="pi-field">
                      <label htmlFor="pi-status">Inspection Status</label>
                      <select
                        id="pi-status"
                        name="newStage"
                        value={formData.newStage}
                        onChange={(event) => setFormData((previous) => ({
                          ...previous,
                          newStage: Number(event.target.value),
                        }))}
                      >
                        {stageLabels.map((label, index) => (
                          <option key={label} value={index}>{label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="pi-field">
                      <label htmlFor="pi-remarks">Inspection Remarks</label>
                      <textarea
                        id="pi-remarks"
                        name="remarks"
                        rows="3"
                        value={formData.remarks}
                        onChange={handleChange}
                        placeholder="Describe your inspection findings..."
                        required
                      />
                    </div>
                    <div className="pi-field">
                      <label htmlFor="pi-action-taken">Action Taken / Work Remarks</label>
                      <textarea
                        id="pi-action-taken"
                        name="actionTaken"
                        rows="3"
                        value={formData.actionTaken}
                        onChange={handleChange}
                        placeholder="Describe the repair or action carried out..."
                      />
                    </div>

                    <div className="pi-photo-fields">
                      {[
                        ["sitePhoto", "Before-Work / Site Photograph"],
                        ["completionPhoto", "After-Work / Completion Photograph"],
                      ].map(([field, label]) => (
                        <div className="pi-field" key={field}>
                          <label htmlFor={`pi-${field}`}>{label}</label>
                          <div className="pi-photo-upload">
                            <span>
                              {uploadingPhoto === field
                                ? "Uploading..."
                                : formData[field] ? "Replace photograph" : "Choose photograph"}
                            </span>
                            <input
                              id={`pi-${field}`}
                              type="file"
                              accept="image/*"
                              disabled={Boolean(uploadingPhoto) || saving}
                              onChange={(event) => handlePhotoChange(field, event)}
                            />
                          </div>
                          {formData[field] && (
                            <img
                              className="pi-photo-preview"
                              src={toMediaUrl(formData[field])}
                              alt={label}
                            />
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="pi-form-actions">
                      <button className="pi-btn-outline" type="button" onClick={closeDetails} disabled={saving}>
                        Close
                      </button>
                      <button className="pi-btn-primary" type="submit" disabled={saving || Boolean(uploadingPhoto)}>
                        {saving ? "Saving..." : "Save Inspection"}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default PhysicalInspection;
