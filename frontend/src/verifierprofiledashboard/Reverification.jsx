import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next"; // ✅ ADDED
import "./Reverification.css";
import VerifierComplaintDetails from "./VerifierComplaintDetails";
import ComplaintImage from "./ComplaintImage";

const Reverification = ({ complaints, loadError, onBack, onReverify }) => {
  const { t } = useTranslation(); // ✅ ADDED

  const [selectedItem, setSelectedItem] = useState(null);
  const [remarks, setRemarks] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // 1. Filter only "Re-verification" items
  const reverifyQueue = useMemo(() => {
    return complaints.filter((c) => c.queue === "Re-verification");
  }, [complaints]);

  const handleSelect = (item) => {
    setSelectedItem(item);
    setRemarks("");
    // Set default date/time to now
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setDateTime(now.toISOString().slice(0, 16));
  };

  // 2. Handle Approve or Reject Again
  const handleAction = async (action) => {
    if (!remarks.trim()) {
      alert(t('reverification.error_remarks_required'));
      return;
    }
    if (!dateTime) {
      alert(t('reverification.error_datetime_required'));
      return;
    }

    setSaving(true);
    setError("");
    try {
      await onReverify(selectedItem.id, action, remarks, dateTime);
      setSelectedItem(null);
    } catch (saveError) {
      setError(saveError.message || t('reverification.error_save_decision'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rv-shell">
      {/* Header */}
      <div className="rv-header">
        <button className="rv-back-btn" onClick={onBack}>{t('reverification.back_to_dashboard')}</button>
        <h2>{t('reverification.title')}</h2>
      </div>

      <div className="rv-container">
        {loadError && <div className="rv-save-error" role="alert">{loadError}</div>}
        {/* Summary */}
        <div className="rv-summary">
          <span>{t('reverification.summary', { count: reverifyQueue.length })}</span>
        </div>

        <div className="rv-layout">
          {/* LEFT: Re-verification Queue List */}
          <div className="rv-list-panel">
            <h3>{t('reverification.resubmitted_work')}</h3>
            {reverifyQueue.length === 0 ? (
              <div className="rv-empty">{t('reverification.empty_queue')}</div>
            ) : (
              <div className="rv-list">
                {reverifyQueue.map((item) => (
                  <div 
                    key={item.id} 
                    className={`rv-list-item ${selectedItem?.id === item.id ? "active" : ""}`}
                    onClick={() => handleSelect(item)}
                  >
                    <div className="rv-item-header">
                      <span className="rv-item-number">{item.complaintNumber}</span>
                      <span className="rv-status-badge rv-status-red">{t('reverification.needs_review')}</span>
                    </div>
                    <div className="rv-item-details">
                      <p><b>{t('reverification.issue_label')}:</b> {item.issue}</p>
                      <p><b>{t('reverification.location_label')}:</b> {item.location}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: Detailed Comparison & Action Form */}
          <div className="rv-detail-panel">
            {selectedItem ? (
              <>
                <div className="rv-detail-header">
                  <h3>{t('reverification.reverifying', { complaintNumber: selectedItem.complaintNumber })}</h3>
                  <span className="rv-category-tag">{selectedItem.category}</span>
                </div>
                <VerifierComplaintDetails complaint={selectedItem} />

                {/* Requirement 2: View Previous Rejection Remarks */}
                <div className="rv-section rv-alert-box">
                  <h4>{t('reverification.previous_rejection_reason')}</h4>
                  <p className="rv-previous-remarks">
                    {selectedItem.previousRemarks || selectedItem.remarks || t('reverification.no_previous_remarks')}
                  </p>
                  <small>{t('reverification.staff_resubmitted_claim')}</small>
                </div>

                {/* Requirement 3 & 4: Review & Compare Updated Evidence */}
                <div className="rv-section">
                  <h4>{t('reverification.updated_work_evidence')}</h4>
                  <div className="rv-comparison-grid">
                    <div className="rv-photo-card">
                      <span className="rv-photo-label">{t('reverification.before_repair_original')}</span>
                      <div className="rv-photo-placeholder">
                        {selectedItem.photos?.before
                          ? <ComplaintImage src={selectedItem.photos.before} alt={t('reverification.before_repair_original')} fallbackClassName="rv-photo-fallback" />
                          : t('reverification.no_photo')}
                      </div>
                    </div>
                    <div className="rv-photo-arrow">➡️</div>
                    <div className="rv-photo-card rv-photo-updated">
                      <span className="rv-photo-label">{t('reverification.updated_after_repair')}</span>
                      <div className="rv-photo-placeholder">
                        {selectedItem.photos?.after
                          ? <ComplaintImage src={selectedItem.photos.after} alt={t('reverification.updated_after_repair')} fallbackClassName="rv-photo-fallback" />
                          : t('reverification.no_photo')}
                      </div>
                    </div>
                    {selectedItem.photos?.site && (
                      <div className="rv-site-photo">
                        <span className="rv-photo-label">{t('reverification.site_inspection_photo')}</span>
                        <div className="rv-photo-placeholder">
                          <ComplaintImage src={selectedItem.photos.site} alt={t('reverification.site_inspection_photo')} fallbackClassName="rv-photo-fallback" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Requirement 5: Verify Corrections via Staff Log */}
                <div className="rv-section">
                  <h4>{t('reverification.staff_correction_log')}</h4>
                  <ul className="rv-log-list">
                    {(Array.isArray(selectedItem.log) ? selectedItem.log : []).map((entry, idx) => (
                      <li key={idx}>
                        <span className="rv-log-text">{entry.text}</span> 
                        <span className="rv-log-time">{entry.time}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Requirement 6, 7, 8: Action Form (Remarks, Date, Approve/Reject) */}
                <div className="rv-section rv-action-form">
                  {error && <p className="rv-save-error" role="alert">{error}</p>}
                  <h4>{t('reverification.reverification_decision')}</h4>
                  
                  <div className="rv-form-group">
                    <label htmlFor="rv-remarks">{t('reverification.reverification_remarks_required')}</label>
                    <textarea
                      id="rv-remarks"
                      rows="3"
                      placeholder={t('reverification.remarks_placeholder')}
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                    ></textarea>
                  </div>

                  <div className="rv-form-group">
                    <label htmlFor="rv-datetime">{t('reverification.reverification_datetime_required')}</label>
                    <input
                      id="rv-datetime"
                      type="datetime-local"
                      value={dateTime}
                      onChange={(e) => setDateTime(e.target.value)}
                    />
                  </div>

                  <div className="rv-action-buttons">
                    <button className="rv-btn rv-btn-reject-again" disabled={saving} onClick={() => handleAction("reject_again")}>
                      {t('reverification.reject_again')}
                    </button>
                    <button className="rv-btn rv-btn-approve" disabled={saving} onClick={() => handleAction("approve")}>
                      {t('reverification.approve_corrected_work')}
                    </button>
                  </div>
                  <p className="rv-notify-note">{t('reverification.notify_note')}</p>
                </div>
              </>
            ) : (
              <div className="rv-empty-selection">
                <div className="rv-empty-icon">🔍</div>
                <h4>{t('reverification.select_resubmitted_complaint')}</h4>
                <p>{t('reverification.choose_item_to_verify')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reverification;