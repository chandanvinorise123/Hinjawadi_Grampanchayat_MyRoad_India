import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next"; // ✅ ADDED
import ComplaintImage from "./ComplaintImage";
import VerifierComplaintDetails from "./VerifierComplaintDetails";
import "./WorkVerification.css";

const getSubmissionTime = (complaint) => {
  const statusTimestamps = (Array.isArray(complaint.statusHistory) ? complaint.statusHistory : [])
    .filter((entry) =>
      String(entry.status || "").trim().toLowerCase().replace(/[_-]+/g, " ") === "under verification"
    )
    .map((entry) => new Date(entry.updatedAt).getTime())
    .filter(Number.isFinite);
  if (statusTimestamps.length) return Math.max(...statusTimestamps);

  const logTimestamps = (Array.isArray(complaint.log) ? complaint.log : [])
    .filter((entry) => /work completed|completed work|submitted.*verification|under verification/i.test(entry.text || ""))
    .map((entry) => new Date(entry.time).getTime())
    .filter(Number.isFinite);
  if (logTimestamps.length) return Math.max(...logTimestamps);

  const fallback = new Date(
    complaint.updatedAt || complaint.inspection?.completionDate || complaint.createdAt || 0
  ).getTime();
  return Number.isFinite(fallback) ? fallback : 0;
};

const formatSubmittedDate = (complaint, t) => {
  const timestamp = getSubmissionTime(complaint);
  return timestamp ? new Date(timestamp).toLocaleString() : (t ? t('work_verification.date_unavailable') : "Date unavailable");
};

const getBeforeWorkPhoto = (complaint) =>
  complaint.photos?.site || complaint.photos?.before;

const WorkVerification = ({ complaints, loadError, onBack, onVerify }) => {
  const { t } = useTranslation(); // ✅ ADDED

  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [remarks, setRemarks] = useState("");
  const [verificationDateTime, setVerificationDateTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const completedWork = useMemo(
    () => complaints
      .filter((complaint) => complaint.queue === "Completed Work")
      .sort((left, right) => getSubmissionTime(right) - getSubmissionTime(left)),
    [complaints]
  );

  const openDetails = (complaint) => {
    setSelectedComplaint(complaint);
    setRemarks("");
    setError("");
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setVerificationDateTime(now.toISOString().slice(0, 16));
  };

  const closeDetails = () => {
    if (saving) return;
    setSelectedComplaint(null);
    setError("");
  };

  const submitDecision = async (decision) => {
    if (!remarks.trim()) {
      setError(t('work_verification.error_remarks_required'));
      return;
    }
    if (!verificationDateTime) {
      setError(t('work_verification.error_datetime_required'));
      return;
    }

    setSaving(true);
    setError("");
    try {
      await onVerify(
        selectedComplaint.id,
        decision,
        remarks.trim(),
        verificationDateTime
      );
      setSelectedComplaint(null);
      setRemarks("");
    } catch (saveError) {
      setError(saveError.message || t('work_verification.error_save_decision'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="wv-shell">
      <header className="wv-page-header">
        <button className="wv-back-button" type="button" onClick={onBack}>
          {t('work_verification.back_to_dashboard')}
        </button>
        <div>
          <span className="wv-eyebrow">{t('work_verification.verifier_workspace')}</span>
          <h1>{t('work_verification.title')}</h1>
          <p>{t('work_verification.subtitle')}</p>
        </div>
      </header>

      {loadError && <div className="wv-alert" role="alert">{loadError}</div>}

      <section className="wv-panel" aria-label={t('work_verification.aria_pending_review')}>
        <div className="wv-panel-header">
          <div>
            <span className="wv-eyebrow">{t('work_verification.pending_review')}</span>
            <h2>{t('work_verification.completed_work_submissions')}</h2>
          </div>
          <span className="wv-count">{t('work_verification.awaiting_verification_count', { count: completedWork.length })}</span>
        </div>
        <div className="wv-table-wrap">
          <table className="wv-table">
            <thead>
              <tr>
                <th>{t('work_verification.col_complaint')}</th>
                <th>{t('work_verification.col_issue')}</th>
                <th>{t('work_verification.col_assigned_staff')}</th>
                <th>{t('work_verification.col_work_completed')}</th>
                <th>{t('work_verification.col_evidence')}</th>
                <th>{t('work_verification.col_review')}</th>
              </tr>
            </thead>
            <tbody>
              {completedWork.length ? completedWork.map((complaint) => (
                <tr key={complaint.id}>
                  <td>
                    <b className="wv-complaint-number">{complaint.complaintNumber || "—"}</b>
                    <span className="wv-cell-subtitle">{complaint.citizenName || t('work_verification.citizen_not_available')}</span>
                  </td>
                  <td>
                    <b>{complaint.issue || complaint.category || t('work_verification.issue_not_specified')}</b>
                    <span className="wv-cell-subtitle">{complaint.location || t('work_verification.location_pending')}</span>
                  </td>
                  <td>{complaint.assignedStaff || t('work_verification.not_assigned')}</td>
                  <td>{formatSubmittedDate(complaint, t)}</td>
                  <td>
                    <span className={`wv-evidence-badge ${getBeforeWorkPhoto(complaint) && complaint.photos?.after ? "complete" : ""}`}>
                      {getBeforeWorkPhoto(complaint) && complaint.photos?.after 
                        ? t('work_verification.evidence_complete') 
                        : t('work_verification.evidence_incomplete')}
                    </span>
                  </td>
                  <td>
                    <button className="wv-details-button" type="button" onClick={() => openDetails(complaint)}>
                      {t('work_verification.view_details')}
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td className="wv-empty" colSpan="6">
                    {loadError ? t('work_verification.load_error') : t('work_verification.no_completed_work')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selectedComplaint && (
        <div className="wv-backdrop" onClick={closeDetails}>
          <section
            className="wv-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="wv-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="wv-modal-header">
              <div>
                <span className="wv-eyebrow">{t('work_verification.staff_work_submission')}</span>
                <h2 id="wv-modal-title">{selectedComplaint.complaintNumber || t('work_verification.complaint_details')}</h2>
              </div>
              <button type="button" className="wv-close-button" aria-label={t('work_verification.close_details_aria')} onClick={closeDetails}>
                ×
              </button>
            </header>
            <div className="wv-modal-body">
              <VerifierComplaintDetails complaint={selectedComplaint} />

              <section className="wv-comparison">
                <div className="wv-section-heading">
                  <div>
                    <span className="wv-eyebrow">{t('work_verification.review_evidence')}</span>
                    <h3>{t('work_verification.before_after_comparison')}</h3>
                  </div>
                  <span className="wv-submitted-date">{t('work_verification.submitted_on', { date: formatSubmittedDate(selectedComplaint, t) })}</span>
                </div>
                <div className="wv-photo-grid">
                  <figure>
                    <figcaption>{t('work_verification.before_repair')}</figcaption>
                    {getBeforeWorkPhoto(selectedComplaint)
                      ? <ComplaintImage src={getBeforeWorkPhoto(selectedComplaint)} alt={t('work_verification.before_repair')} />
                      : <div className="wv-photo-empty">{t('work_verification.no_before_photo')}</div>}
                  </figure>
                  <figure>
                    <figcaption>{t('work_verification.after_repair')}</figcaption>
                    {selectedComplaint.photos?.after
                      ? <ComplaintImage src={selectedComplaint.photos.after} alt={t('work_verification.after_repair')} />
                      : <div className="wv-photo-empty">{t('work_verification.no_after_photo')}</div>}
                  </figure>
                </div>
              </section>

              <section className="wv-decision">
                <div className="wv-section-heading">
                  <div>
                    <span className="wv-eyebrow">{t('work_verification.verifier_decision')}</span>
                    <h3>{t('work_verification.record_your_review')}</h3>
                  </div>
                </div>
                {error && <p className="wv-alert" role="alert">{error}</p>}
                <label htmlFor="wv-remarks">{t('work_verification.verification_remarks')} <span>*</span></label>
                <textarea
                  id="wv-remarks"
                  rows="3"
                  value={remarks}
                  onChange={(event) => setRemarks(event.target.value)}
                  placeholder={t('work_verification.verification_remarks_placeholder')}
                  disabled={saving}
                />
                <label htmlFor="wv-date-time">{t('work_verification.verification_datetime')} <span>*</span></label>
                <input
                  id="wv-date-time"
                  type="datetime-local"
                  value={verificationDateTime}
                  onChange={(event) => setVerificationDateTime(event.target.value)}
                  disabled={saving}
                />
                <div className="wv-decision-actions">
                  <button type="button" className="wv-reject-button" disabled={saving} onClick={() => submitDecision("reject")}>
                    {saving ? t('work_verification.saving') : t('work_verification.reject_and_return')}
                  </button>
                  <button type="button" className="wv-approve-button" disabled={saving} onClick={() => submitDecision("approve")}>
                    {saving ? t('work_verification.saving') : t('work_verification.approve_completed_work')}
                  </button>
                </div>
              </section>
            </div>
            <footer className="wv-modal-footer">
              <button type="button" className="wv-back-button" onClick={closeDetails} disabled={saving}>{t('work_verification.close')}</button>
            </footer>
          </section>
        </div>
      )}
    </main>
  );
};

export default WorkVerification;