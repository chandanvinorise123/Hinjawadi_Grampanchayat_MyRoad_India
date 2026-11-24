import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next"; // ✅ ADDED
import "./ActionWorkManagement.css";
import StaffComplaintDetails from "./StaffComplaintDetails";
import { toMediaUrl, uploadDashboardPhoto } from "../utils/dashboardApi";

const createFormData = (complaint) => ({
  actionTaken: complaint?.inspection?.actionTaken || "",
  remarks: complaint?.inspection?.remarks || "",
  newStage: [0, 1, 4].includes(Number(complaint?.stage)) ? String(complaint.stage) : "0",
  afterPhoto: "",
  completionDateTime: complaint?.inspection?.completionDate || "",
});

const ActionWorkManagement = ({ complaints, onBack, onUpdateWork }) => {
  const { t } = useTranslation(); // ✅ ADDED
  const stageLabels = t('action_work.stage_labels', { returnObjects: true });
  const allowedStageOptions = [
    { value: "0", label: stageLabels[0] },
    { value: "1", label: stageLabels[1] },
    { value: "4", label: stageLabels[4] },
  ];

  const [currentComplaintId, setCurrentComplaintId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  
  const currentComplaint = complaints.find((complaint) =>
    String(complaint.id) === String(currentComplaintId)
  ) || null;
  const beforeWorkPhotos = Array.isArray(currentComplaint?.citizenPhotos) && currentComplaint.citizenPhotos.length
    ? currentComplaint.citizenPhotos
    : Array.isArray(currentComplaint?.images)
      ? currentComplaint.images
      : [];

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
      setFormError(error.message || t('action_work.error_upload'));
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
      setFormError(error.message || t('action_work.error_save'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="awm-shell">
      {/* Header */}
      <div className="awm-header">
        <button className="awm-back-btn" type="button" onClick={onBack}>
          {t('action_work.back_to_dashboard')}
        </button>
        <div>
          <span className="awm-eyebrow">{t('action_work.staff_workspace')}</span>
          <h2>{currentComplaint ? t('action_work.update_assigned_work') : t('action_work.action_work_management')}</h2>
          <p>
            {currentComplaint
              ? t('action_work.review_update_complaint', { complaintNumber: currentComplaint.complaintNumber || t('action_work.this_assigned_complaint') })
              : t('action_work.review_assigned_progress')}
          </p>
        </div>
      </div>

      <div className="awm-container">
        {!currentComplaint && (
        <section className="awm-table-card" aria-label={t('action_work.aria_assigned_complaints')}>
          <div className="awm-table-heading">
            <div>
              <span className="awm-eyebrow">{t('action_work.your_workload')}</span>
              <h3>{t('action_work.assigned_complaints')}</h3>
              <p>{t('action_work.choose_complaint_review')}</p>
            </div>
            <span className="awm-count">{t('action_work.assigned_count', { count: complaints.length })}</span>
          </div>
          <label className="awm-search">
            <span>{t('action_work.search_complaints')}</span>
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={t('action_work.search_placeholder')}
            />
          </label>
          <div className="awm-table-wrap">
            <table className="awm-table">
              <thead>
                <tr>
                  <th>{t('action_work.col_complaint')}</th>
                  <th>{t('action_work.col_issue_location')}</th>
                  <th>{t('action_work.col_status')}</th>
                  <th>{t('action_work.col_last_updated')}</th>
                  <th>{t('action_work.col_action')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredComplaints.length ? filteredComplaints.map((complaint) => (
                  <tr key={complaint.id}>
                    <td>
                      <b className="awm-complaint-number">{complaint.complaintNumber || t('action_work.col_complaint')}</b>
                      <span className="awm-cell-note">{complaint.citizenName || t('action_work.citizen_not_available')}</span>
                    </td>
                    <td>
                      <b>{complaint.issue || complaint.category || t('action_work.issue_not_specified')}</b>
                      <span className="awm-cell-note">{complaint.location || t('action_work.location_pending')}</span>
                    </td>
                    <td><span className="awm-status-badge">
                      {String(complaint.status || "").trim().toLowerCase() === "under action"
                        ? t('staff_dashboard.assigned_status', 'Assigned')
                        : complaint.status || t('action_work.status_unavailable')}
                    </span></td>
                    <td>{complaint.updatedAt ? new Date(complaint.updatedAt).toLocaleString() : t('action_work.not_updated')}</td>
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
                        {t('action_work.update_work_btn')}
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td className="awm-empty" colSpan="5">
                      {complaints.length ? t('action_work.no_match_search') : t('action_work.no_complaints_assigned')}
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
              {t('action_work.back_to_assigned')}
            </button>
            <div className="awm-update-layout">
              <section className="awm-details-card">
                <div className="awm-section-heading">
                  <div>
                    <span className="awm-eyebrow">{t('action_work.complaint_information')}</span>
                    <h3>{currentComplaint.complaintNumber}</h3>
                  </div>
                  <span className="awm-status-badge">
                    {String(currentComplaint.status || "").trim().toLowerCase() === "under action"
                      ? t('staff_dashboard.assigned_status', 'Assigned')
                      : currentComplaint.status || t('action_work.status_unavailable')}
                  </span>
                </div>
                <StaffComplaintDetails complaint={currentComplaint} showActivity={false} hideEvidence />
              </section>

              <form className="awm-form-card" onSubmit={handleSubmit}>
                <div className="awm-form-header">
                  <span className="awm-eyebrow">{t('action_work.work_update')}</span>
                  <h3>{t('action_work.update_assigned_work_title')}</h3>
                  <p>{t('action_work.record_work_performed')}</p>
                </div>
                {formError && <p className="awm-form-error" role="alert">{formError}</p>}

                <div className="awm-grid-2">
                  <div className="awm-field">
                    <label htmlFor="completionDateTime">{t('action_work.work_completion_datetime')}</label>
                    <input
                      id="completionDateTime"
                      name="completionDateTime"
                      type="datetime-local"
                      value={formData.completionDateTime}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="awm-field">
                    <label htmlFor="newStage">{t('action_work.work_status')}</label>
                    <select
                      id="newStage"
                      name="newStage"
                      value={formData.newStage}
                      onChange={handleChange}
                      className="awm-status-select"
                    >
                      {allowedStageOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="awm-field awm-full-width">
                  <label htmlFor="actionTaken">{t('action_work.work_performed')}</label>
                  <textarea
                    id="actionTaken"
                    name="actionTaken"
                    rows="4"
                    placeholder={t('action_work.describe_repairs_placeholder')}
                    value={formData.actionTaken}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="awm-field awm-full-width">
                  <label htmlFor="remarks">{t('action_work.work_remarks')}</label>
                  <textarea
                    id="remarks"
                    name="remarks"
                    rows="3"
                    placeholder={t('action_work.add_observations_placeholder')}
                    value={formData.remarks}
                    onChange={handleChange}
                  />
                </div>

                <div className="awm-photo-grid awm-work-photo-grid">
                  <div className="awm-field">
                    <label>{t('action_work.before_work_photo')}</label>
                    {beforeWorkPhotos.length ? (
                      <div className="awm-before-photo-list">
                        {beforeWorkPhotos.map((photo, index) => (
                          <a key={`${photo}-${index}`} href={toMediaUrl(photo)} target="_blank" rel="noopener noreferrer">
                            <img className="awm-photo-preview" src={toMediaUrl(photo)} alt={`${t('action_work.complaint_photo', { index: index + 1 })}`} />
                            <span>{t('action_work.complaint_photo', { index: index + 1 })}</span>
                          </a>
                        ))}
                      </div>
                    ) : (
                      <p className="awm-no-photo">{t('action_work.no_before_work_photo')}</p>
                    )}
                  </div>
                  <div className="awm-field">
                    <label>{t('action_work.after_work_photo')}</label>
                    <div className="awm-photo-upload">
                      <span>
                        {uploadingPhoto === "afterPhoto" 
                          ? t('action_work.uploading') 
                          : formData.afterPhoto 
                            ? t('action_work.replace_after_photo') 
                            : t('action_work.choose_after_photo')}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={Boolean(uploadingPhoto) || saving}
                        onChange={(event) => handlePhotoChange("afterPhoto", event)}
                      />
                    </div>
                    {formData.afterPhoto && (
                      <img className="awm-photo-preview" src={toMediaUrl(formData.afterPhoto)} alt={t('action_work.after_work_evidence')} />
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
                    {t('action_work.back_to_assigned')}
                  </button>
                  <button type="submit" className="awm-btn-primary" disabled={saving || Boolean(uploadingPhoto)}>
                    {saving ? t('action_work.saving_update') : t('action_work.save_work_update')}
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