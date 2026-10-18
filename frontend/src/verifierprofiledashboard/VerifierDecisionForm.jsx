import React, { useState } from "react";
import "./VerifierDecisionForm.css";

const VerifierDecisionForm = ({ complaint, onVerify, onComplete }) => {
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
      setError("Add remarks before saving your decision.");
      return;
    }
    if (!dateTime) {
      setError("Record the verification date and time.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const updatedComplaint = await onVerify(complaint, status, remarks.trim(), dateTime);
      setRemarks("");
      onComplete?.(updatedComplaint);
    } catch (saveError) {
      setError(saveError.message || "Unable to save the verification decision.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="vdf-panel" aria-label="Verifier decision">
      <h4>
        {isAwaitingVerification
          ? "Verifier Decision"
          : nextStatus === "Resolved"
            ? "Complaint Resolution"
            : "Complaint Closure"}
      </h4>
      {error && <p className="vdf-error" role="alert">{error}</p>}
      <label>
        {isAwaitingVerification ? "Verification remarks *" : "Completion remarks *"}
        <textarea
          rows="3"
          value={remarks}
          onChange={(event) => setRemarks(event.target.value)}
          placeholder={isAwaitingVerification
            ? "Record your observations and reasons for this decision."
            : "Record why the complaint is being marked complete."}
        />
      </label>
      <label>
        {isAwaitingVerification ? "Verification date and time *" : "Completion date and time *"}
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
              {saving ? "Saving..." : "Reject / Send for Re-verification"}
            </button>
            <button type="button" disabled={saving} onClick={() => submitDecision("Verified")}>
              {saving ? "Saving..." : "Verify Work"}
            </button>
          </>
        ) : (
          <button type="button" disabled={saving} onClick={() => submitDecision(nextStatus)}>
            {saving ? "Saving..." : nextStatus === "Resolved" ? "Mark Resolved / Work Complete" : "Close Completed Complaint"}
          </button>
        )}
      </div>
    </section>
  );
};

export default VerifierDecisionForm;
