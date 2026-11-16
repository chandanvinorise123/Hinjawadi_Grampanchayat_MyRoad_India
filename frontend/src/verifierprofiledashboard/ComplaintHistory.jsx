import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next"; // ✅ ADDED
import "./ComplaintHistory.css";
import ComplaintImage from "./ComplaintImage";
import VerifierDecisionForm from "./VerifierDecisionForm";

const formatDateTime = (value, notRecordedText = "Not recorded") => {
  if (!value) return notRecordedText;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
};

const getTimestamp = (value) => {
  const timestamp = new Date(value || 0).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const getStatusTone = (status) => {
  const normalized = String(status || "").toLowerCase().replace(/[_-]+/g, " ");
  if (normalized.includes("reject")) return "red";
  if (["verified", "resolved", "closed", "notified"].includes(normalized)) return "green";
  if (normalized.includes("verif") || normalized.includes("review")) return "orange";
  if (normalized.includes("pending")) return "amber";
  return "navy";
};

const getComplaintPhotos = (complaint, t) => {
  const citizenPhotos = Array.isArray(complaint.citizenPhotos)
    ? complaint.citizenPhotos
    : Array.isArray(complaint.images) ? complaint.images : [];
  const photos = complaint.photos && typeof complaint.photos === "object"
    ? complaint.photos
    : {};
  return [
    ...citizenPhotos.map((photo, index) => ({ 
      label: t('complaint_history.citizen_evidence', { index: index + 1 }), 
      photo 
    })),
    { label: t('complaint_history.before_site'), photo: complaint.inspection?.sitePhoto || photos.site || photos.before },
    { label: t('complaint_history.after_work'), photo: complaint.inspection?.completionPhoto || photos.after },
    { label: t('complaint_history.verification'), photo: complaint.inspection?.verificationPhoto || photos.verification },
  ].filter(({ photo }) => typeof photo === "string" && photo.trim());
};

const ComplaintHistory = ({ complaints = [], onBack, onVerify }) => {
  const { t } = useTranslation(); // ✅ ADDED
  const notRecorded = t('complaint_history.not_recorded');

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  const sortedComplaints = useMemo(() => [...complaints].sort((left, right) => (
    getTimestamp(right.updatedAt || right.createdAt) -
    getTimestamp(left.updatedAt || left.createdAt)
  )), [complaints]);

  const filteredComplaints = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return sortedComplaints.filter((complaint) => [
      complaint.complaintNumber,
      complaint.category,
      complaint.issue,
      complaint.location,
      complaint.citizenName,
      complaint.citizenContact,
      complaint.status,
      complaint.assignedStaff,
      complaint.assignedVerifier,
    ].some((value) => String(value || "").toLowerCase().includes(query)));
  }, [sortedComplaints, searchTerm]);

  const selectedItem = sortedComplaints.find(
    (complaint) => String(complaint.id) === String(selectedId)
  );
  const backAction = selectedItem
    ? () => setSelectedId(null)
    : onBack;

  return (
    <main className="vch-shell">
      <header className="vch-header">
        <button className="vch-back-btn" type="button" onClick={backAction}>
          {selectedItem ? t('complaint_history.back_to_history') : t('complaint_history.back_to_dashboard')}
        </button>
        <div>
          <span className="vch-eyebrow">{t('complaint_history.verifier_records')}</span>
          <h2>📜 {t('complaint_history.title')}</h2>
          {selectedItem && <p>{selectedItem.complaintNumber}</p>}
        </div>
      </header>

      {selectedItem ? (
        <div className="vch-detail-layout">
          <section className="vch-detail-panel">
            <header className="vch-detail-heading">
              <span className="vch-eyebrow">{t('complaint_history.original_report')}</span>
              <h3>{t('complaint_history.complaint_information')}</h3>
            </header>
            <dl className="vch-detail-facts">
              <div><dt>{t('complaint_history.complaint_number')}</dt><dd>{selectedItem.complaintNumber || notRecorded}</dd></div>
              <div><dt>{t('complaint_history.citizen')}</dt><dd>{selectedItem.citizenName || t('complaint_history.guest')}</dd></div>
              <div><dt>{t('complaint_history.contact')}</dt><dd>{selectedItem.citizenContact || notRecorded}</dd></div>
              <div><dt>{t('complaint_history.email')}</dt><dd>{selectedItem.citizenEmail || selectedItem.citizenProfile?.email || notRecorded}</dd></div>
              <div><dt>{t('complaint_history.department')}</dt><dd>{selectedItem.department || t('complaint_history.not_assigned')}</dd></div>
              <div><dt>{t('complaint_history.category')}</dt><dd>{selectedItem.category || notRecorded}</dd></div>
              <div><dt>{t('complaint_history.issue')}</dt><dd>{selectedItem.issue || notRecorded}</dd></div>
              <div><dt>{t('complaint_history.priority')}</dt><dd>{selectedItem.priority || t('complaint_history.normal')}</dd></div>
              <div><dt>{t('complaint_history.location')}</dt><dd>{selectedItem.location || t('complaint_history.location_pending')}</dd></div>
              <div><dt>{t('complaint_history.landmark')}</dt><dd>{selectedItem.landmark || notRecorded}</dd></div>
              <div><dt>{t('complaint_history.submitted')}</dt><dd>{formatDateTime(selectedItem.createdAt || selectedItem.date, notRecorded)}</dd></div>
              <div><dt>{t('complaint_history.assigned_staff')}</dt><dd>{selectedItem.assignedStaff || t('complaint_history.not_assigned')}</dd></div>
              <div><dt>{t('complaint_history.assigned_verifier')}</dt><dd>{selectedItem.assignedVerifier || t('complaint_history.not_assigned')}</dd></div>
              <div className="vch-detail-wide"><dt>{t('complaint_history.description')}</dt><dd>{selectedItem.description || t('complaint_history.no_description_provided')}</dd></div>
            </dl>
            <div className="vch-detail-evidence">
              <h4>{t('complaint_history.complaint_evidence')}</h4>
              {getComplaintPhotos(selectedItem, t).length ? (
                <div className="vch-detail-photos">
                  {getComplaintPhotos(selectedItem, t).map(({ label, photo }) => (
                    <figure key={`${label}-${photo}`}>
                      <ComplaintImage src={photo} alt={label} fallbackClassName="vch-photo-fallback" />
                      <figcaption>{label}</figcaption>
                    </figure>
                  ))}
                </div>
              ) : <p className="vch-empty-text">{t('complaint_history.no_images_attached')}</p>}
            </div>
          </section>

          <section className="vch-detail-panel">
            <header className="vch-detail-heading">
              <span className="vch-eyebrow">{t('complaint_history.work_verification')}</span>
              <h3>{t('complaint_history.work_information')}</h3>
            </header>
            <dl className="vch-detail-facts">
              <div><dt>{t('complaint_history.current_status')}</dt><dd><span className={`vch-status-badge vch-status-${getStatusTone(selectedItem.status)}`}>{selectedItem.status || t('complaint_history.pending')}</span></dd></div>
              <div><dt>{t('complaint_history.queue')}</dt><dd>{selectedItem.queue || notRecorded}</dd></div>
              <div><dt>{t('complaint_history.inspection_date')}</dt><dd>{formatDateTime(selectedItem.inspection?.inspectionDate, notRecorded)}</dd></div>
              <div><dt>{t('complaint_history.completion_date')}</dt><dd>{formatDateTime(selectedItem.inspection?.completionDate, notRecorded)}</dd></div>
              <div className="vch-detail-wide"><dt>{t('complaint_history.staff_inspection_remarks')}</dt><dd>{selectedItem.inspection?.remarks || t('complaint_history.no_staff_inspection_remarks')}</dd></div>
              <div className="vch-detail-wide"><dt>{t('complaint_history.action_taken_by_staff')}</dt><dd>{selectedItem.inspection?.actionTaken || t('complaint_history.no_work_action_recorded')}</dd></div>
              <div className="vch-detail-wide"><dt>{t('complaint_history.verifier_feedback')}</dt><dd>{selectedItem.verifierRemarks || selectedItem.previousRemarks || t('complaint_history.no_verifier_feedback_recorded')}</dd></div>
            </dl>
            <div className="vch-detail-evidence">
              <h4>{t('complaint_history.verifier_decision')}</h4>
              <VerifierDecisionForm complaint={selectedItem} onVerify={onVerify} />
            </div>
          </section>
        </div>
      ) : (
        <section className="vch-table-section">
          <div className="vch-table-header">
            <div>
              <h3>{t('complaint_history.all_complaints')}</h3>
              <p>{t('complaint_history.browse_records_subtitle')}</p>
            </div>
            <div className="vch-table-controls">
              <span className="vch-table-count">{t('complaint_history.complaints_count', { count: filteredComplaints.length })}</span>
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={t('complaint_history.search_placeholder')}
                aria-label={t('complaint_history.search_aria')}
              />
            </div>
          </div>
          <div className="vch-table-container">
            <table className="vch-complaints-table">
              <thead>
                <tr>
                  <th>{t('complaint_history.col_complaint_no')}</th>
                  <th>{t('complaint_history.col_citizen')}</th>
                  <th>{t('complaint_history.col_issue')}</th>
                  <th>{t('complaint_history.col_location')}</th>
                  <th>{t('complaint_history.col_status')}</th>
                  <th>{t('complaint_history.col_last_updated')}</th>
                  <th>{t('complaint_history.col_action')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredComplaints.length ? filteredComplaints.map((complaint) => (
                  <tr key={complaint.id}>
                    <td className="vch-mono">{complaint.complaintNumber || t('complaint_history.na')}</td>
                    <td>{complaint.citizenName || t('complaint_history.guest')}</td>
                    <td>{complaint.issue || complaint.category || notRecorded}</td>
                    <td>{complaint.location || t('complaint_history.location_pending')}</td>
                    <td><span className={`vch-status-badge vch-status-${getStatusTone(complaint.status)}`}>{complaint.status || t('complaint_history.pending')}</span></td>
                    <td>{formatDateTime(complaint.updatedAt || complaint.createdAt || complaint.date, notRecorded)}</td>
                    <td>
                      <button
                        className="vch-view-details-btn"
                        type="button"
                        onClick={() => setSelectedId(String(complaint.id))}
                      >
                        {t('complaint_history.view_details')}
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr><td className="vch-empty-row" colSpan="7">{t('complaint_history.no_match_search')}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
};

export default ComplaintHistory;