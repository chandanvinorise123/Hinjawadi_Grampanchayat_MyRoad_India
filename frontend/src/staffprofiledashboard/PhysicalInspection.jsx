import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next"; // ✅ ADDED
import "./PhysicalInspection.css";
import StaffComplaintDetails from "./StaffComplaintDetails";
import { toMediaUrl, uploadDashboardPhoto } from "../utils/dashboardApi";

// ⚠️ KEEP IN ENGLISH: Used for internal logic/index mapping
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
  const { t } = useTranslation(); // ✅ ADDED
  const translatedStageLabels = t('physical_inspection.stage_labels', { returnObjects: true }); // ✅ ADDED

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
      setFormError(error.message || t('physical_inspection.error_upload'));
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
      setSuccessMessage(t('physical_inspection.success_message'));
    } catch (error) {
      setFormError(error.message || t('physical_inspection.error_save'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pi-shell">
      <header className="pi-header">
        <button className="pi-back-btn" type="button" onClick={onBack}>
          {t('physical_inspection.back_to_dashboard')}
        </button>
        <div>
          <span className="pi-eyebrow">{t('physical_inspection.staff_workspace')}</span>
          <h2>{t('physical_inspection.title')}</h2>
          <p>{t('physical_inspection.subtitle')}</p>
        </div>
      </header>

      <main className="pi-container">
        <section className="pi-table-card" aria-label={t('physical_inspection.aria_assigned_complaints')}>
          <div className="pi-table-heading">
            <div>
              <span className="pi-eyebrow">{t('physical_inspection.assigned_workload')}</span>
              <h3>{t('physical_inspection.complaints_for_inspection')}</h3>
              <p>{t('physical_inspection.open_complaint_review')}</p>
            </div>
            <span className="pi-count">{t('physical_inspection.complaints_count', { count: complaints.length })}</span>
          </div>
          <label className="pi-search">
            <span>{t('physical_inspection.search_complaints')}</span>
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={t('physical_inspection.search_placeholder')}
            />
          </label>
          <div className="pi-table-wrap">
            <table className="pi-table">
              <thead>
                <tr>
                  <th>{t('physical_inspection.col_complaint')}</th>
                  <th>{t('physical_inspection.col_issue_location')}</th>
                  <th>{t('physical_inspection.col_status')}</th>
                  <th>{t('physical_inspection.col_latest_staff_update')}</th>
                  <th>{t('physical_inspection.col_last_updated')}</th>
                  <th>{t('physical_inspection.col_action')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredComplaints.length ? filteredComplaints.map(({ complaint, latestUpdate }) => (
                  <tr key={complaint.id}>
                    <td>
                      <b className="pi-complaint-number">{complaint.complaintNumber || t('physical_inspection.col_complaint')}</b>
                      <span className="pi-cell-note">{complaint.citizenName || t('physical_inspection.citizen_not_available')}</span>
                    </td>
                    <td>
                      <b>{complaint.issue || complaint.category || t('physical_inspection.issue_not_specified')}</b>
                      <span className="pi-cell-note">{complaint.location || t('physical_inspection.location_not_recorded')}</span>
                    </td>
                    <td><span className="pi-status-badge">{complaint.status || t('physical_inspection.not_recorded')}</span></td>
                    <td className="pi-update-summary">
                      {latestUpdate.entry?.text || complaint.inspection?.actionTaken || t('physical_inspection.no_staff_update_recorded')}
                    </td>
                    <td>
                      {latestUpdate.entry?.time
                        ? new Date(latestUpdate.entry.time).toLocaleString()
                        : complaint.updatedAt
                          ? new Date(complaint.updatedAt).toLocaleString()
                          : t('physical_inspection.not_updated')}
                    </td>
                    <td>
                      <button className="pi-view-btn" type="button" onClick={() => openComplaint(complaint)}>
                        {t('physical_inspection.view_details')}
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td className="pi-empty" colSpan="6">
                      {complaints.length
                        ? t('physical_inspection.no_match_search')
                        : t('physical_inspection.no_complaints_assigned')}
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
          <section
            className="pi-modal"
            role="dialog"
            aria-modal="true"
            aria-label={t('physical_inspection.aria_inspection_details', {
              complaintNumber: currentComplaint.complaintNumber || t('physical_inspection.col_complaint')
            })}
          >
            <header className="pi-modal-header">
              <div>
                <span className="pi-eyebrow">{t('physical_inspection.inspection_record')}</span>
                <h3>{currentComplaint.complaintNumber || t('physical_inspection.complaint_details_fallback')}</h3>
              </div>
              <button
                className="pi-modal-close"
                type="button"
                onClick={closeDetails}
                aria-label={t('physical_inspection.close_details_aria')}
              >
                ×
              </button>
            </header>

            <div className="pi-modal-body">
              <div className="pi-detail-layout">
                <section className="pi-information-panel">
                  <header className="pi-panel-heading">
                    <h4>{t('physical_inspection.complaint_information')}</h4>
                    <span className="pi-status-badge">{currentComplaint.status || t('physical_inspection.not_recorded')}</span>
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
                      <span className="pi-eyebrow">{t('physical_inspection.staff_record')}</span>
                      <h4>{t('physical_inspection.inspection_work_update')}</h4>
                    </div>
                  </header>
                  <div className="pi-form-content">
                    {successMessage && <p className="pi-success" role="status">{successMessage}</p>}
                    {formError && <p className="pi-form-error" role="alert">{formError}</p>}

                    <div className="pi-grid-2">
                      <div className="pi-field">
                        <label htmlFor="pi-inspection-date">{t('physical_inspection.inspection_datetime')}</label>
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
                        <label htmlFor="pi-completion-date">{t('physical_inspection.work_completion_datetime')}</label>
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
                      <label htmlFor="pi-status">{t('physical_inspection.inspection_status')}</label>
                      <select
                        id="pi-status"
                        name="newStage"
                        value={formData.newStage}
                        onChange={(event) => setFormData((previous) => ({
                          ...previous,
                          newStage: Number(event.target.value),
                        }))}
                      >
                        {translatedStageLabels.map((label, index) => (
                          <option key={index} value={index}>{label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="pi-field">
                      <label htmlFor="pi-remarks">{t('physical_inspection.inspection_remarks')}</label>
                      <textarea
                        id="pi-remarks"
                        name="remarks"
                        rows="3"
                        value={formData.remarks}
                        onChange={handleChange}
                        placeholder={t('physical_inspection.describe_findings_placeholder')}
                        required
                      />
                    </div>

                    <div className="pi-field">
                      <label htmlFor="pi-action-taken">{t('physical_inspection.action_taken_work_remarks')}</label>
                      <textarea
                        id="pi-action-taken"
                        name="actionTaken"
                        rows="3"
                        value={formData.actionTaken}
                        onChange={handleChange}
                        placeholder={t('physical_inspection.action_placeholder')}
                      />
                    </div>

                    <div className="pi-photo-fields">
                      {[
                        ["sitePhoto", t('physical_inspection.before_work_site_photo')],
                        ["completionPhoto", t('physical_inspection.after_work_completion_photo')],
                      ].map(([field, label]) => (
                        <div className="pi-field" key={field}>
                          <label htmlFor={`pi-${field}`}>{label}</label>
                          <div className="pi-photo-upload">
                            <span>
                              {uploadingPhoto === field
                                ? t('physical_inspection.uploading')
                                : formData[field]
                                  ? t('physical_inspection.replace_photo')
                                  : t('physical_inspection.choose_photo')}
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
                        {t('physical_inspection.close')}
                      </button>
                      <button className="pi-btn-primary" type="submit" disabled={saving || Boolean(uploadingPhoto)}>
                        {saving ? t('physical_inspection.saving') : t('physical_inspection.save_inspection')}
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