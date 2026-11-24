import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next"; // ✅ ADDED
import "./CompletedWork.css";
import ComplaintImage from "./ComplaintImage";
import { isApprovedCompletedWork } from "../utils/completedWork";

const formatDate = (value, notRecordedText = "Not recorded") => {
  if (!value) return notRecordedText;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
};

const CompletedWork = ({ complaints, loadError, onBack }) => {
  const { t } = useTranslation(); // ✅ ADDED
  const notRecorded = t('completed_work.not_recorded');

  const [selectedItem, setSelectedItem] = useState(null);

  const completedItems = useMemo(() => {
    return complaints
      .filter(isApprovedCompletedWork)
      .sort((left, right) =>
        new Date(right.updatedAt || right.inspection?.completionDate || 0).getTime() -
        new Date(left.updatedAt || left.inspection?.completionDate || 0).getTime()
      );
  }, [complaints]);

  const handleSelectItem = (item) => setSelectedItem(item);
  const closeDetails = () => setSelectedItem(null);

  const getStatusLabel = (status) => {
    const normalizedStatus = String(status || "").trim().toLowerCase();
    if (["verified", "approved"].includes(normalizedStatus)) return t("completed_work.approved");
    if (normalizedStatus === "resolved") return t("completed_work.resolved");
    return t("completed_work.closed");
  };

  return (
    <div className="cw-shell">
      {/* Header */}
      <div className="cw-header">
        <button className="cw-back-btn" onClick={onBack}>← {t('completed_work.back_to_dashboard')}</button>
        <h2>🛠️ {t('completed_work.title')}</h2>
      </div>

      <div className="cw-container">
        {loadError && <div className="cw-save-error" role="alert">{loadError}</div>}
        {/* Summary */}
        <div className="cw-summary">
          <span>{t('completed_work.total_approved', { count: completedItems.length })}</span>
        </div>

        <section className="cw-table-panel" aria-label={t('completed_work.aria_approved_work')}>
          <div className="cw-table-wrap">
            <table className="cw-table">
              <thead>
                <tr>
                  <th>{t('completed_work.col_complaint')}</th>
                  <th>{t('completed_work.col_issue_location')}</th>
                  <th>{t('completed_work.col_assigned_staff')}</th>
                  <th>{t('completed_work.col_work_completed')}</th>
                  <th>{t('completed_work.col_status')}</th>
                  <th>{t('completed_work.col_details')}</th>
                </tr>
              </thead>
              <tbody>
                {completedItems.length ? completedItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <b className="cw-table-number">{item.complaintNumber || "—"}</b>
                      <span className="cw-table-subtitle">{item.citizenName || t('completed_work.citizen_not_available')}</span>
                    </td>
                    <td>
                      <b>{item.issue || item.category || t('completed_work.issue_not_specified')}</b>
                      <span className="cw-table-subtitle">{item.location || t('completed_work.location_pending')}</span>
                    </td>
                    <td>{item.assignedStaff || t('completed_work.not_assigned')}</td>
                    <td>{formatDate(item.inspection?.completionDate || item.updatedAt, notRecorded)}</td>
                    <td>
                      <span className="cw-status-badge cw-status-green">{getStatusLabel(item.status)}</span>
                    </td>
                    <td>
                      <button className="cw-view-button" type="button" onClick={() => handleSelectItem(item)}>
                        {t('completed_work.view_details')}
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td className="cw-empty" colSpan="6">
                      {loadError ? t('completed_work.load_error') : t('completed_work.no_completed_work')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {selectedItem && (
        <div className="cw-modal-backdrop" onClick={closeDetails}>
          <section
            className="cw-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cw-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="cw-modal-header">
              <div>
                <span className="cw-modal-eyebrow">{t('completed_work.modal_eyebrow')}</span>
                <h2 id="cw-modal-title">{selectedItem.complaintNumber || t('completed_work.complaint_details')}</h2>
              </div>
              <button type="button" className="cw-modal-close" aria-label={t('completed_work.close_details_aria')} onClick={closeDetails}>×</button>
            </header>

            <div className="cw-modal-body">
              <section className="cw-modal-section">
                <h3>{t('completed_work.citizen_complaint_details')}</h3>
                <div className="cw-modal-detail-grid">
                  <div><span>{t('completed_work.citizen')}</span><b>{selectedItem.citizenName || t('completed_work.not_available')}</b></div>
                  <div><span>{t('completed_work.citizen_contact')}</span><b>{selectedItem.citizenContact || t('completed_work.not_available')}</b></div>
                  <div><span>{t('completed_work.citizen_email')}</span><b>{selectedItem.citizenProfile?.email || t('completed_work.not_available')}</b></div>
                  <div><span>{t('completed_work.department')}</span><b>{selectedItem.department || t('completed_work.not_assigned')}</b></div>
                  <div><span>{t('completed_work.assigned_staff')}</span><b>{selectedItem.assignedStaff || t('completed_work.not_assigned')}</b></div>
                  <div><span>{t('completed_work.assigned_verifier')}</span><b>{selectedItem.assignedVerifier || t('completed_work.not_assigned')}</b></div>
                  <div><span>{t('completed_work.priority')}</span><b>{selectedItem.priority || t('completed_work.normal')}</b></div>
                  <div><span>{t('completed_work.submitted')}</span><b>{formatDate(selectedItem.createdAt || selectedItem.date, notRecorded)}</b></div>
                  <div><span>{t('completed_work.last_updated')}</span><b>{formatDate(selectedItem.updatedAt, notRecorded)}</b></div>
                  <div><span>{t('completed_work.landmark')}</span><b>{selectedItem.landmark || t('completed_work.not_provided')}</b></div>
                  <div className="cw-modal-detail-wide"><span>{t('completed_work.reported_description')}</span><b>{selectedItem.description || t('completed_work.no_description_provided')}</b></div>
                  <div className="cw-modal-detail-wide"><span>{t('completed_work.complaint_location')}</span><b>{selectedItem.location || t('completed_work.location_pending')}</b></div>
                  {selectedItem.coordinates?.latitude != null && selectedItem.coordinates?.longitude != null && (
                    <div className="cw-modal-detail-wide">
                      <span>{t('completed_work.gps_coordinates')}</span>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${selectedItem.coordinates.latitude},${selectedItem.coordinates.longitude}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {selectedItem.coordinates.latitude}, {selectedItem.coordinates.longitude} · {t('completed_work.open_map')}
                      </a>
                    </div>
                  )}
                </div>
              </section>

              <section className="cw-modal-section">
                <h3>{t('completed_work.inspection_action_details')}</h3>
                <div className="cw-modal-detail-grid">
                  <div><span>{t('completed_work.inspection_date')}</span><b>{formatDate(selectedItem.inspection?.inspectionDate, notRecorded)}</b></div>
                  <div><span>{t('completed_work.work_completion_date')}</span><b>{formatDate(selectedItem.inspection?.completionDate, notRecorded)}</b></div>
                  <div className="cw-modal-detail-wide"><span>{t('completed_work.staff_inspection_remarks')}</span><b>{selectedItem.inspection?.remarks || selectedItem.remarks || t('completed_work.no_staff_inspection_remarks')}</b></div>
                  <div className="cw-modal-detail-wide"><span>{t('completed_work.action_taken_by_staff')}</span><b>{selectedItem.inspection?.actionTaken || selectedItem.actionTaken || t('completed_work.no_work_action_recorded')}</b></div>
                  {selectedItem.verifierRemarks && (
                    <div className="cw-modal-detail-wide"><span>{t('completed_work.latest_verifier_feedback')}</span><b>{selectedItem.verifierRemarks}</b></div>
                  )}
                </div>

                <div className="cw-modal-comparison">
                  <h4>{t('completed_work.before_after_work_photos')}</h4>
                  <div className="cw-comparison-grid">
                    <div className="cw-photo-card">
                      <span className="cw-photo-label">{t('completed_work.before_repair')}</span>
                      <div className="cw-photo-placeholder">
                        {selectedItem.photos?.before
                          ? <ComplaintImage src={selectedItem.photos.before} alt={t('completed_work.before_repair')} fallbackClassName="cw-photo-fallback" />
                          : t('completed_work.no_photo_available')}
                      </div>
                    </div>
                    <div className="cw-photo-card">
                      <span className="cw-photo-label">{t('completed_work.after_repair')}</span>
                      <div className="cw-photo-placeholder">
                        {selectedItem.photos?.after
                          ? <ComplaintImage src={selectedItem.photos.after} alt={t('completed_work.after_repair')} fallbackClassName="cw-photo-fallback" />
                          : t('completed_work.no_photo_available')}
                      </div>
                    </div>
                  </div>
                </div>

                {Array.isArray(selectedItem.log) && selectedItem.log.length > 0 && (
                  <div className="cw-modal-log">
                    <h4>{t('completed_work.activity_log')}</h4>
                    <ul className="cw-log-list">
                      {selectedItem.log.map((entry, idx) => (
                        <li key={`${entry.time || "log"}-${idx}`}>{entry.text} <span className="cw-log-time">({entry.time})</span></li>
                      ))}
                    </ul>
                  </div>
                )}

              </section>
            </div>

            <footer className="cw-modal-footer">
              <button className="cw-back-btn" type="button" onClick={closeDetails}>{t('completed_work.close')}</button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
};

export default CompletedWork;