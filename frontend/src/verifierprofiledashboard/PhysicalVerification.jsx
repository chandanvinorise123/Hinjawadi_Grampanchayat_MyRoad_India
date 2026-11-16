import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next"; // ✅ ADDED
import "./PhysicalVerification.css";
import VerifierComplaintDetails from "./VerifierComplaintDetails";
import ComplaintImage from "./ComplaintImage";
import { toMediaUrl, uploadDashboardPhoto } from "../utils/dashboardApi";

const PhysicalVerification = ({ complaints, loadError, onBack, onSubmitVerification }) => {
  const { t } = useTranslation(); // ✅ ADDED

  const [selectedItem, setSelectedItem] = useState(null);
  const [decision, setDecision] = useState("approve"); // 'approve' or 'reject'
  const [remarks, setRemarks] = useState("");
  const [verificationPhoto, setVerificationPhoto] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [dateTime, setDateTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // 1. Filter items ready for Physical Verification
  const verificationQueue = useMemo(() => {
    return complaints.filter((c) => ["Completed Work", "Re-verification"].includes(c.queue));
  }, [complaints]);

  const handleSelect = (item) => {
    setSelectedItem(item);
    setDecision("approve");
    setRemarks("");
    setVerificationPhoto(item.photos?.verification || "");
    // Auto-set current date/time
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setDateTime(now.toISOString().slice(0, 16));
  };

  const handlePhotoChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    setUploadingPhoto(true);
    try {
      const uploaded = await uploadDashboardPhoto(file);
      setVerificationPhoto(uploaded.publicUrl);
    } catch (uploadError) {
      setError(uploadError.message || t('physical_verification.error_upload_photo'));
    } finally {
      setUploadingPhoto(false);
      event.target.value = "";
    }
  };

  // 2. Submit Verification Result
  const handleSubmit = async () => {
    if (!remarks.trim()) {
      alert(t('physical_verification.error_remarks_required'));
      return;
    }
    if (!dateTime) {
      alert(t('physical_verification.error_datetime_required'));
      return;
    }
    if (!verificationPhoto) {
      setError(t('physical_verification.error_photo_required'));
      return;
    }

    setSaving(true);
    setError("");
    try {
      await onSubmitVerification(selectedItem.id, decision, remarks, dateTime, verificationPhoto);
      setSelectedItem(null);
    } catch (saveError) {
      setError(saveError.message || t('physical_verification.error_save_decision'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pv-shell">
      {/* Header */}
      <div className="pv-header">
        <button className="pv-back-btn" onClick={onBack}>{t('physical_verification.back_to_dashboard')}</button>
        <h2>🔍 {t('physical_verification.title')}</h2>
      </div>

      <div className="pv-container">
        {loadError && <div className="pv-save-error" role="alert">{loadError}</div>}
        {/* Summary */}
        <div className="pv-summary">
          <span>{t('physical_verification.summary', { count: verificationQueue.length })}</span>
        </div>

        <div className="pv-layout">
          {/* LEFT: Queue List */}
          <div className="pv-list-panel">
            <h3>{t('physical_verification.verification_queue')}</h3>
            {verificationQueue.length === 0 ? (
              <div className="pv-empty">{t('physical_verification.empty_queue')}</div>
            ) : (
              <div className="pv-list">
                {verificationQueue.map((item) => (
                  <div 
                    key={item.id} 
                    className={`pv-list-item ${selectedItem?.id === item.id ? "active" : ""}`}
                    onClick={() => handleSelect(item)}
                  >
                    <div className="pv-item-header">
                      <span className="pv-item-number">{item.complaintNumber}</span>
                      <span className="pv-status-dot"></span>
                    </div>
                    <div className="pv-item-details">
                      <p className="pv-issue">{item.issue}</p>
                      <p className="pv-location">📍 {item.location}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: Verification Workspace */}
          <div className="pv-workspace">
            {selectedItem ? (
              <>
                <div className="pv-workspace-header">
                  <div>
                    <h3>{t('physical_verification.verifying', { complaintNumber: selectedItem.complaintNumber })}</h3>
                    <p className="pv-subtitle">{selectedItem.category} • {selectedItem.citizenName}</p>
                  </div>
                </div>
                <VerifierComplaintDetails complaint={selectedItem} />

                {/* Quick Info & Photos */}
                <div className="pv-info-grid">
                  <div className="pv-info-card">
                    <span>{t('physical_verification.issue_description')}</span>
                    <p>{selectedItem.description}</p>
                  </div>
                  <div className="pv-info-card">
                    <span>{t('physical_verification.staff_remarks')}</span>
                    <p>{selectedItem.remarks || t('physical_verification.no_remarks')}</p>
                  </div>
                  <div className="pv-info-card pv-photos-card">
                    <span>{t('physical_verification.evidence_photos')}</span>
                    <div className="pv-photo-row">
                      <div className="pv-mini-photo">
                        <span>{t('physical_verification.before')}</span>
                        <div>
                          {selectedItem.photos?.before
                            ? <ComplaintImage src={selectedItem.photos.before} alt={t('physical_verification.before')} fallbackClassName="pv-photo-fallback" />
                            : t('physical_verification.na')}
                        </div>
                      </div>
                      <div className="pv-mini-photo">
                        <span>{t('physical_verification.after')}</span>
                        <div>
                          {selectedItem.photos?.after
                            ? <ComplaintImage src={selectedItem.photos.after} alt={t('physical_verification.after')} fallbackClassName="pv-photo-fallback" />
                            : t('physical_verification.na')}
                        </div>
                      </div>
                      <div className="pv-mini-photo">
                        <span>{t('physical_verification.site')}</span>
                        <div>
                          {selectedItem.photos?.site
                            ? <ComplaintImage src={selectedItem.photos.site} alt={t('physical_verification.site')} fallbackClassName="pv-photo-fallback" />
                            : t('physical_verification.na')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Verification Action Form */}
                <div className="pv-action-form">
                  {error && <p className="pv-save-error" role="alert">{error}</p>}
                  <h4>{t('physical_verification.submit_verification_result')}</h4>
                  
                  {/* Decision Toggle */}
                  <div className="pv-decision-toggle">
                    <button 
                      type="button" 
                      className={`pv-toggle-btn pv-approve ${decision === 'approve' ? 'active' : ''}`}
                      onClick={() => setDecision('approve')}
                    >
                      ✅ {t('physical_verification.approve_verify_work')}
                    </button>
                    <button 
                      type="button" 
                      className={`pv-toggle-btn pv-reject ${decision === 'reject' ? 'active' : ''}`}
                      onClick={() => setDecision('reject')}
                    >
                      ❌ {t('physical_verification.reject_send_for_correction')}
                    </button>
                  </div>

                  {/* Remarks */}
                  <div className="pv-form-group">
                    <label>{t('physical_verification.verification_remarks_required')}</label>
                    <textarea
                      rows="3"
                      placeholder={decision === 'approve' 
                        ? t('physical_verification.approve_placeholder') 
                        : t('physical_verification.reject_placeholder')}
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                    ></textarea>
                  </div>

                  {/* Date & Time */}
                  <div className="pv-form-group">
                    <label>{t('physical_verification.verification_datetime_required')}</label>
                    <input
                      type="datetime-local"
                      value={dateTime}
                      onChange={(e) => setDateTime(e.target.value)}
                    />
                  </div>

                  <div className="pv-form-group">
                    <label htmlFor="pv-verification-photo">{t('physical_verification.physical_verification_photo_required')}</label>
                    <input
                      id="pv-verification-photo"
                      type="file"
                      accept="image/*"
                      disabled={saving || uploadingPhoto}
                      onChange={handlePhotoChange}
                    />
                    {uploadingPhoto && <p>{t('physical_verification.uploading_photo')}</p>}
                    {verificationPhoto && (
                      <img
                        className="pv-verification-photo-preview"
                        src={toMediaUrl(verificationPhoto)}
                        alt={t('physical_verification.physical_verification_photo_alt')}
                      />
                    )}
                  </div>

                  {/* Submit Button */}
                  <button className="pv-submit-btn" disabled={saving || uploadingPhoto} onClick={handleSubmit}>
                    {saving ? t('physical_verification.saving') : (decision === 'approve' ? t('physical_verification.verify_work') : t('physical_verification.reject_reverification'))}
                  </button>
                </div>
              </>
            ) : (
              <div className="pv-empty-workspace">
                <div className="pv-empty-icon">🔍</div>
                <h4>{t('physical_verification.select_item_to_verify')}</h4>
                <p>{t('physical_verification.choose_complaint_to_verify')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhysicalVerification;