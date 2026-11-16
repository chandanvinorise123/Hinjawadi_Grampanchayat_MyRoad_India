import React, { useState } from "react";
import { useTranslation } from "react-i18next"; // ✅ ADDED
import "./VerifierDecisionForm.css";

const VerifierDecisionForm = ({ complaint, onVerify, onComplete }) => {
  const { t } = useTranslation(); // ✅ ADDED

  const [remarks, setRemarks] = useState("");
  const [dateTime, setDateTime] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const status = String(complaint?.status || "").trim().toLowerCase();
  const isAwaitingVerification = [
    "in_review",
    "in review",
    "under review",
    "under verification",
    "work submitted",
    "completed work",
  ].includes(status);
  const nextStatus = status === "verified"
    ? "Resolved"
    : status === "resolved"
      ? "Closed"
      : null;
  if (!complaint || (!isAwaitingVerification && !nextStatus)) return null;

  const submitDecision = async (status) => {
    if (!remarks.trim()) {
      setError(t('verifier_decision_form.error_remarks_required'));
      return;
    }
    if (!dateTime) {
      setError(t('verifier_decision_form.error_datetime_required'));
      return;
    }

    setSaving(true);
    setError("");
    try {
      const updatedComplaint = await onVerify(complaint, status, remarks.trim(), dateTime);
      setRemarks("");
      onComplete?.(updatedComplaint);
    } catch (saveError) {
      setError(saveError.message || t('verifier_decision_form.error_save_decision'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="vdf-panel" aria-label={t('verifier_decision_form.aria_label')}>
      <h4>
        {isAwaitingVerification
          ? t('verifier_decision_form.title_awaiting')
          : nextStatus === "Resolved"
            ? t('verifier_decision_form.title_resolved')
            : t('verifier_decision_form.title_closed')}
      </h4>
      {error && <p className="vdf-error" role="alert">{error}</p>}
      <label>
        {isAwaitingVerification ? t('verifier_decision_form.label_remarks_awaiting') : t('verifier_decision_form.label_remarks_completion')}
        <textarea
          rows="3"
          value={remarks}
          onChange={(event) => setRemarks(event.target.value)}
          placeholder={isAwaitingVerification
            ? t('verifier_decision_form.placeholder_awaiting')
            : t('verifier_decision_form.placeholder_completion')}
        />
      </label>
      <label>
        {isAwaitingVerification ? t('verifier_decision_form.label_datetime_awaiting') : t('verifier_decision_form.label_datetime_completion')}
        <input
          type="datetime-local"
          value={dateTime}
          onChange={(event) => setDateTime(event.target.value)}
        />
      </label>
      <div className="vdf-actions">
        {isAwaitingVerification ? (
          <>
            <button type="button" disabled={saving} onClick={() => submitDecision("Rejected")}>
              {saving ? t('verifier_decision_form.saving') : t('verifier_decision_form.btn_reject')}
            </button>
            <button type="button" disabled={saving} onClick={() => submitDecision("Verified")}>
              {saving ? t('verifier_decision_form.saving') : t('verifier_decision_form.btn_verify')}
            </button>
          </>
        ) : (
          <button type="button" disabled={saving} onClick={() => submitDecision(nextStatus)}>
            {saving ? t('verifier_decision_form.saving') : (nextStatus === "Resolved" ? t('verifier_decision_form.btn_resolve') : t('verifier_decision_form.btn_close'))}
          </button>
        )}
      </div>
    </section>
  );
};

export default VerifierDecisionForm;