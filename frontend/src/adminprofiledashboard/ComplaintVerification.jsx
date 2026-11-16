import React, { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next"; // ✅ ADDED
import "./ComplaintVerification.css";
import { fetchDashboard, getStoredUser, getUserId, toMediaUrl, updateDashboardComplaint } from "../utils/dashboardApi";

// ✅ Keep as translation keys to safely translate UI while preserving internal logic
const WORKFLOW_STEP_KEYS = ["work_started", "under_working", "under_verification", "verified", "work_completed"];

const ComplaintVerification = ({ onBack }) => {
  const { t } = useTranslation(); // ✅ ADDED

  const [complaints, setComplaints] = useState([]);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [verifierRemarks, setVerifierRemarks] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });
  const [savingAction, setSavingAction] = useState(false);

  useEffect(() => {
    fetchDashboard("admin", getUserId(getStoredUser()))
      .then(({ complaints: loaded = [] }) => setComplaints(loaded
        .filter((complaint) => ["Under Verification", "Verified", "Resolved", "Closed", "Rejected"].includes(complaint.status))
        .map((complaint) => {
          const inspection = complaint.inspection || {};
          const images = (complaint.images || []).map((image) =>
            typeof image === "string" ? image : image?.url
          ).filter(Boolean);
          const evidence = [
            ...images.map((url, index) => ({ url, label: t('complaint_verification.evidence_photo', { index: index + 1 }) })),
            ...(inspection.sitePhoto
              ? [{ url: inspection.sitePhoto, label: t('complaint_verification.evidence_before_site') }]
              : []),
            ...(inspection.completionPhoto
              ? [{ url: inspection.completionPhoto, label: t('complaint_verification.evidence_after_completion') }]
              : []),
          ].filter((photo, index, all) =>
            all.findIndex((candidate) => candidate.url === photo.url) === index
          );
          return {
            ...complaint,
            currentStep: { "Under Action": 1, "Under Verification": 3, Verified: 4, Resolved: 5, Closed: 5, Rejected: 2 }[complaint.status] || 0,
            issue: complaint.issue || complaint.issueType,
            staffName: complaint.assignedStaff || t('complaint_verification.unassigned'),
            workDetails: complaint.inspection?.actionTaken || complaint.description,
            evidence,
          };
        })))
      .catch((error) => console.error("Failed to load verification queue:", error));
  }, [t]);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 3000);
  };

  // Stats
  const stats = useMemo(() => ({
    pending: complaints.filter(c => c.currentStep === 3).length,
    verified: complaints.filter(c => c.currentStep === 4).length,
    completed: complaints.filter(c => c.currentStep === 5).length,
    returned: complaints.filter(c => c.status === "Rejected" || c.status === "Under Action").length
  }), [complaints]);

  const openVerificationModal = (complaint) => {
    setSelectedComplaint({ ...complaint });
    setVerifierRemarks(complaint.remarks || "");
    setIsModalOpen(true);
  };

  // Action: Verify and Close
  const handleVerifyAndClose = async () => {
    if (!selectedComplaint?.id || savingAction) return;
    if (!verifierRemarks.trim()) {
      showMessage("error", t('complaint_verification.msg_closure_remarks_required'));
      return;
    }
    setSavingAction(true);
    try {
      const result = await updateDashboardComplaint(selectedComplaint.id, {
        status: "Closed",
        remarks: verifierRemarks.trim(),
      });
      const updatedComplaint = result.complaint;
      setComplaints((current) => current.map((complaint) =>
        complaint.id === selectedComplaint.id
          ? {
              ...complaint,
              ...updatedComplaint,
              currentStep: 5,
              remarks: verifierRemarks.trim(),
            }
          : complaint
      ));
    } catch (error) {
      console.error("Failed to close complaint:", error);
      showMessage("error", error.message || t('complaint_verification.msg_unable_verify_close'));
      return;
    } finally {
      setSavingAction(false);
    }
    setIsModalOpen(false);
    showMessage("success", t('complaint_verification.msg_verified_closed_success'));
  };

  // Action: Return for Additional Action
  const handleReturnForAction = async () => {
    if (!selectedComplaint?.id || savingAction) return;
    if (!verifierRemarks.trim()) {
      showMessage("error", t('complaint_verification.msg_return_remarks_required'));
      return;
    }
    setSavingAction(true);
    try {
      await updateDashboardComplaint(selectedComplaint.id, {
        status: "Under Action",
        remarks: verifierRemarks.trim(),
      });
    } catch (error) {
      console.error("Failed to return complaint:", error);
      showMessage("error", error.message || t('complaint_verification.msg_unable_return'));
      return;
    } finally {
      setSavingAction(false);
    }
    setComplaints((current) => current.map((complaint) =>
      complaint.id === selectedComplaint.id
        ? {
            ...complaint,
            currentStep: 2,
            remarks: `${t('complaint_verification.returned_prefix')}: ${verifierRemarks.trim()}`,
            status: "Under Action",
          }
        : complaint
    ));
    setIsModalOpen(false);
    showMessage("success", t('complaint_verification.msg_returned_success'));
  };

  return (
    <div className="cv-shell">
      <div className="cv-header">
        <button className="cv-back-btn" onClick={onBack}>{t('complaint_verification.back_to_dashboard')}</button>
        <div>
          <h2>{t('complaint_verification.title')}</h2>
          <p>{t('complaint_verification.subtitle')}</p>
        </div>
      </div>

      {message.text && <div className={`cv-message ${message.type}`}>{message.text}</div>}

      {/* Stats */}
      <div className="cv-stats-row">
        <div className="cv-stat-card pending"><h3>{t('complaint_verification.stats.pending')}</h3><p>{stats.pending}</p></div>
        <div className="cv-stat-card verified"><h3>{t('complaint_verification.stats.verified')}</h3><p>{stats.verified}</p></div>
        <div className="cv-stat-card completed"><h3>{t('complaint_verification.stats.completed')}</h3><p>{stats.completed}</p></div>
        <div className="cv-stat-card returned"><h3>{t('complaint_verification.stats.returned')}</h3><p>{stats.returned}</p></div>
      </div>

      {/* Verification Queue Table */}
      <div className="cv-table-container">
        <h3 className="cv-section-title">{t('complaint_verification.verification_queue')}</h3>
        <table className="cv-table">
          <thead>
            <tr>
              <th>{t('complaint_verification.col_complaint_id')}</th>
              <th>{t('complaint_verification.col_issue_location')}</th>
              <th>{t('complaint_verification.col_assigned_staff')}</th>
              <th>{t('complaint_verification.col_workflow_stage')}</th>
              <th>{t('complaint_verification.col_actions')}</th>
            </tr>
          </thead>
          <tbody>
            {complaints.map(c => (
              <tr key={c.id}>
                <td className="cv-mono">{c.complaintNumber}</td>
                <td><strong>{c.issue}</strong><br/><small className="cv-subtext">{c.location}</small></td>
                <td>{c.staffName}</td>
                <td>
                  <div className="cv-mini-tracker">
                    {WORKFLOW_STEP_KEYS.map((stepKey, idx) => (
                      <div key={idx} className={`cv-mini-step ${idx + 1 <= c.currentStep ? "active" : ""}`} title={t(`complaint_verification.workflow.${stepKey}`)}>
                        {idx + 1 <= c.currentStep ? "✓" : "○"}
                      </div>
                    ))}
                  </div>
                  <small className="cv-step-label">{t(`complaint_verification.workflow.${WORKFLOW_STEP_KEYS[c.currentStep - 1]}`)}</small>
                </td>
                <td>
                  <button className="cv-btn-review" onClick={() => openVerificationModal(c)}>
                    {c.currentStep >= 4 ? t('complaint_verification.btn_view_details') : t('complaint_verification.btn_review_verify')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Verification Modal */}
      {isModalOpen && selectedComplaint && (
        <div className="cv-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="cv-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="cv-modal-header">
              <h3>{t('complaint_verification.modal_title', { number: selectedComplaint.complaintNumber })}</h3>
              <button className="cv-close-btn" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>

            <div className="cv-modal-body">
              {/* 7. Track Complaint Workflow */}
              <div className="cv-workflow-tracker">
                {WORKFLOW_STEP_KEYS.map((stepKey, idx) => (
                  <div key={idx} className={`cv-tracker-step ${idx + 1 < selectedComplaint.currentStep ? "completed" : ""} ${idx + 1 === selectedComplaint.currentStep ? "current" : ""}`}>
                    <div className="cv-tracker-circle">{idx + 1 < selectedComplaint.currentStep ? "✓" : idx + 1}</div>
                    <span className="cv-tracker-label">{t(`complaint_verification.workflow.${stepKey}`)}</span>
                  </div>
                ))}
              </div>

              {/* Review Details */}
              <div className="cv-details-grid">
                <div className="cv-detail-card">
                  <h4>{t('complaint_verification.work_details_by', { name: selectedComplaint.staffName })}</h4>
                  <p>{selectedComplaint.workDetails}</p>
                </div>
                <div className="cv-detail-card">
                  <h4>{t('complaint_verification.evidence_photos')}</h4>
                  {selectedComplaint.evidence.length > 0 ? (
                    <div className="cv-photo-grid">
                      {selectedComplaint.evidence.map((photo) => (
                        <figure className="cv-evidence-item" key={`${photo.label}-${photo.url}`}>
                          <img src={toMediaUrl(photo.url)} alt={photo.label} />
                          <figcaption>{photo.label}</figcaption>
                        </figure>
                      ))}
                    </div>
                  ) : (
                    <p className="cv-empty">{t('complaint_verification.no_photos_uploaded')}</p>
                  )}
                </div>
              </div>

              {/* Record Closure Remarks */}
              <div className="cv-remarks-section">
                <h4>{t('complaint_verification.verifier_remarks_title')}</h4>
                <textarea 
                  value={verifierRemarks} 
                  onChange={(e) => setVerifierRemarks(e.target.value)}
                  placeholder={t('complaint_verification.verifier_remarks_placeholder')}
                  rows="4"
                ></textarea>
              </div>
            </div>

            <div className="cv-modal-footer">
              {["Under Verification", "Verified"].includes(selectedComplaint.status) ? (
                <>
                  <button
                    className="cv-btn-return"
                    onClick={handleReturnForAction}
                    disabled={savingAction}
                  >
                    {t('complaint_verification.btn_return_action')}
                  </button>
                  <button
                    className="cv-btn-verify"
                    onClick={handleVerifyAndClose}
                    disabled={savingAction}
                  >
                    {savingAction ? t('complaint_verification.btn_saving') : t('complaint_verification.btn_verify_close')}
                  </button>
                </>
              ) : (
                <span className="cv-empty">{t('complaint_verification.already_status', { status: selectedComplaint.status.toLowerCase() })}</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplaintVerification;