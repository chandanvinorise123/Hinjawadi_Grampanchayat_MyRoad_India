import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next"; // ✅ ADDED
import "./ComplaintStatus.css";
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

const createWorkForm = (complaint) => ({
  newStage: complaint?.stage ?? 0,
  inspectionDate: complaint?.inspection?.inspectionDate || "",
  actionTaken: complaint?.inspection?.actionTaken || "",
  remarks: complaint?.inspection?.remarks || "",
  completionDateTime: complaint?.inspection?.completionDate || "",
  beforePhoto: complaint?.inspection?.sitePhoto || "",
  afterPhoto: "",
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
  const { t } = useTranslation(); // ✅ ADDED
  const translatedStageLabels = t('complaint_status.stage_labels', { returnObjects: true }); // ✅ ADDED

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
      setUpdateError(error.message || t('complaint_status.error_upload'));
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
      setUpdateMessage(t('complaint_status.success_message'));
    } catch (error) {
      setUpdateError(error.message || t('complaint_status.error_save'));
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
          {t('complaint_status.back_to_dashboard')}
        </button>
        <div>
          <span className="cs-eyebrow">{t('complaint_status.staff_workspace')}</span>
          <h2>{currentComplaint ? t('complaint_status.status_and_work_update') : t('complaint_status.complaint_status_update')}</h2>
          <p>
            {currentComplaint
              ? t('complaint_status.review_update_complaint', { complaintNumber: currentComplaint.complaintNumber || t('complaint_status.this_complaint') })
              : t('complaint_status.monitor_assigned_subtitle')}
          </p>
        </div>
      </header>

      <main className="cs-container">
        {!currentComplaint ? (
          <section className="cs-list-panel" aria-label={t('complaint_status.aria_assigned_workload')}>
            <div className="cs-list-heading">
              <div>
                <span className="cs-eyebrow">{t('complaint_status.assigned_workload')}</span>
                <h3>{t('complaint_status.complaint_work_status')}</h3>
                <p>{t('complaint_status.latest_updates_first')}</p>
              </div>
              <span className="cs-count">{t('complaint_status.complaints_count', { count: complaints.length })}</span>
            </div>
            <label className="cs-search">
              <span>{t('complaint_status.search_complaints')}</span>
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={t('complaint_status.search_placeholder')}
              />
            </label>
            <div className="cs-table-wrap">
              <table className="cs-table">
                <thead>
                  <tr>
                    <th>{t('complaint_status.col_complaint')}</th>
                    <th>{t('complaint_status.col_issue_location')}</th>
                    <th>{t('complaint_status.col_current_status')}</th>
                    <th>{t('complaint_status.col_latest_staff_update')}</th>
                    <th>{t('complaint_status.col_updated_at')}</th>
                    <th>{t('complaint_status.col_action')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredComplaints.length ? filteredComplaints.map(({ complaint, latestStaffUpdate }) => (
                    <tr key={complaint.id}>
                      <td>
                        <b className="cs-complaint-number">{complaint.complaintNumber || t('complaint_status.col_complaint')}</b>
                        <span className="cs-cell-note">{complaint.citizenName || t('complaint_status.citizen_not_available')}</span>
                      </td>
                      <td>
                        <b>{complaint.issue || complaint.category || t('complaint_status.issue_not_specified')}</b>
                        <span className="cs-cell-note">{complaint.location || t('complaint_status.location_not_recorded')}</span>
                      </td>
                      <td><span className="cs-status-badge">{complaint.status || t('complaint_status.not_recorded')}</span></td>
                      <td className="cs-update-message">
                        {latestStaffUpdate.entry?.text || complaint.inspection?.actionTaken || t('complaint_status.awaiting_staff_update')}
                      </td>
                      <td>
                        {latestStaffUpdate.entry?.time
                          ? new Date(latestStaffUpdate.entry.time).toLocaleString()
                          : complaint.updatedAt
                            ? new Date(complaint.updatedAt).toLocaleString()
                            : t('complaint_status.not_updated')}
                      </td>
                      <td>
                        <button
                          className="cs-view-btn"
                          type="button"
                          onClick={() => selectComplaint(complaint)}
                        >
                          {t('complaint_status.view_details')}
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td className="cs-empty" colSpan="6">
                        {complaints.length ? t('complaint_status.no_match_search') : t('complaint_status.no_complaints_assigned')}
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
              {t('complaint_status.back_to_complaint_list')}
            </button>
            {updateMessage && <div className="cs-success-banner" role="status">✓ {updateMessage}</div>}
            {updateError && <div className="cs-error-banner" role="alert">{updateError}</div>}

            <div className="cs-detail-layout">
              <section className="cs-information-panel">
                <header className="cs-panel-heading">
                  <div>
                    <span className="cs-eyebrow">{t('complaint_status.original_report')}</span>
                    <h3>{t('complaint_status.complaint_information')}</h3>
                  </div>
                  <span className="cs-status-badge">{currentComplaint.status || t('complaint_status.not_recorded')}</span>
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
                    <span className="cs-eyebrow">{t('complaint_status.progress_staff_work')}</span>
                    <h3>{t('complaint_status.status_and_work_update_title')}</h3>
                  </div>
                </header>
                <div className="cs-work-content">
                  <div className="cs-status-summary">
                    <span>{t('complaint_status.current_workflow_status')}</span>
                    <b>{currentComplaint.status || translatedStageLabels[formData.newStage]}</b>
                  </div>
                  <div className="cs-stepper" aria-label={t('complaint_status.aria_workflow_stages')}>
                    {stageLabels.map((label, index) => (
                      <div
                        key={label}
                        className={`cs-step ${index < Number(formData.newStage) ? "completed" : index === Number(formData.newStage) ? "active" : "pending"}`}
                      >
                        <span className="cs-step-dot">{index < Number(formData.newStage) ? "✓" : index + 1}</span>
                        <span className="cs-step-label">{translatedStageLabels[index]}</span>
                      </div>
                    ))}
                  </div>
                  <div className="cs-form-fields">
                    <div className="cs-field">
                      <label htmlFor="cs-stage">{t('complaint_status.update_work_status')}</label>
                      <select
                        id="cs-stage"
                        name="newStage"
                        value={formData.newStage}
                        onChange={handleFieldChange}
                      >
                        {translatedStageLabels.map((label, index) => (
                          <option key={label} value={index}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="cs-field">
                      <label htmlFor="cs-inspection-time">{t('complaint_status.inspection_datetime')}</label>
                      <input
                        id="cs-inspection-time"
                        name="inspectionDate"
                        type="datetime-local"
                        value={formData.inspectionDate}
                        onChange={handleFieldChange}
                      />
                    </div>
                    <div className="cs-field">
                      <label htmlFor="cs-completion-time">{t('complaint_status.work_completion_datetime')}</label>
                      <input
                        id="cs-completion-time"
                        name="completionDateTime"
                        type="datetime-local"
                        value={formData.completionDateTime}
                        onChange={handleFieldChange}
                      />
                    </div>
                    <div className="cs-field">
                      <label htmlFor="cs-action-taken">{t('complaint_status.work_performed')}</label>
                      <textarea
                        id="cs-action-taken"
                        name="actionTaken"
                        rows="4"
                        value={formData.actionTaken}
                        onChange={handleFieldChange}
                        placeholder={t('complaint_status.describe_repairs_placeholder')}
                      />
                    </div>
                    <div className="cs-field">
                      <label htmlFor="cs-remarks">{t('complaint_status.work_remarks')}</label>
                      <textarea
                        id="cs-remarks"
                        name="remarks"
                        rows="3"
                        value={formData.remarks}
                        onChange={handleFieldChange}
                        placeholder={t('complaint_status.add_observations_placeholder')}
                      />
                    </div>
                    <div className="cs-photo-fields">
                      {[
                        ["beforePhoto", t('complaint_status.before_work_photo')],
                        ["afterPhoto", t('complaint_status.after_work_photo')],
                      ].map(([field, label]) => (
                        <div className="cs-field" key={field}>
                          <label htmlFor={`cs-${field}`}>{label}</label>
                          <div className="cs-photo-upload">
                            <span>
                              {uploadingPhoto === field
                                ? t('complaint_status.uploading')
                                : formData[field] ? t('complaint_status.replace_photo') : t('complaint_status.choose_photo')}
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
                        {t('complaint_status.back_to_list')}
                      </button>
                      <button
                        className="cs-btn-primary"
                        type="submit"
                        disabled={saving || Boolean(uploadingPhoto)}
                      >
                        {saving ? t('complaint_status.saving') : t('complaint_status.save_status_work')}
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