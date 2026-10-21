import React, { useMemo, useState } from "react";
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

const formatSubmittedDate = (complaint) => {
  const timestamp = getSubmissionTime(complaint);
  return timestamp ? new Date(timestamp).toLocaleString() : "Date unavailable";
};

const getBeforeWorkPhoto = (complaint) =>
  complaint.photos?.site || complaint.photos?.before;

const WorkVerification = ({ complaints, loadError, onBack, onVerify }) => {
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
      setError("Add verification remarks before submitting your decision.");
      return;
    }
    if (!verificationDateTime) {
      setError("Record the verification date and time.");
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
      setError(saveError.message || "Unable to save the verification decision.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="wv-shell">
      <header className="wv-page-header">
        <button className="wv-back-button" type="button" onClick={onBack}>
          ← Back to Dashboard
        </button>
        <div>
          <span className="wv-eyebrow">Verifier workspace</span>
          <h1>Work Verification</h1>
          <p>Review staff-submitted work, compare evidence, and record a decision.</p>
        </div>
      </header>

      {loadError && <div className="wv-alert" role="alert">{loadError}</div>}

      <section className="wv-panel" aria-label="Staff completed work awaiting verification">
        <div className="wv-panel-header">
          <div>
            <span className="wv-eyebrow">Pending review</span>
            <h2>Completed work submissions</h2>
          </div>
          <span className="wv-count">{completedWork.length} awaiting verification</span>
        </div>
        <div className="wv-table-wrap">
          <table className="wv-table">
            <thead>
              <tr>
                <th>Complaint</th>
                <th>Issue</th>
                <th>Assigned Staff</th>
                <th>Work Completed</th>
                <th>Evidence</th>
                <th>Review</th>
              </tr>
            </thead>
            <tbody>
              {completedWork.length ? completedWork.map((complaint) => (
                <tr key={complaint.id}>
                  <td>
                    <b className="wv-complaint-number">{complaint.complaintNumber || "—"}</b>
                    <span className="wv-cell-subtitle">{complaint.citizenName || "Citizen not available"}</span>
                  </td>
                  <td>
                    <b>{complaint.issue || complaint.category || "Issue not specified"}</b>
                    <span className="wv-cell-subtitle">{complaint.location || "Location pending"}</span>
                  </td>
                  <td>{complaint.assignedStaff || "Not assigned"}</td>
                  <td>{formatSubmittedDate(complaint)}</td>
                  <td>
                    <span className={`wv-evidence-badge ${getBeforeWorkPhoto(complaint) && complaint.photos?.after ? "complete" : ""}`}>
                      {getBeforeWorkPhoto(complaint) && complaint.photos?.after ? "Before & after" : "Evidence incomplete"}
                    </span>
                  </td>
                  <td>
                    <button className="wv-details-button" type="button" onClick={() => openDetails(complaint)}>
                      View Details
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td className="wv-empty" colSpan="6">
                    {loadError ? "Work submissions could not be loaded." : "No completed staff work is awaiting verification."}
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
                <span className="wv-eyebrow">Staff work submission</span>
                <h2 id="wv-modal-title">{selectedComplaint.complaintNumber || "Complaint details"}</h2>
              </div>
              <button type="button" className="wv-close-button" aria-label="Close details" onClick={closeDetails}>
                ×
              </button>
            </header>
            <div className="wv-modal-body">
              <VerifierComplaintDetails complaint={selectedComplaint} />

              <section className="wv-comparison">
                <div className="wv-section-heading">
                  <div>
                    <span className="wv-eyebrow">Review evidence</span>
                    <h3>Before and after comparison</h3>
                  </div>
                  <span className="wv-submitted-date">Submitted {formatSubmittedDate(selectedComplaint)}</span>
                </div>
                <div className="wv-photo-grid">
                  <figure>
                    <figcaption>Before repair</figcaption>
                    {getBeforeWorkPhoto(selectedComplaint)
                      ? <ComplaintImage src={getBeforeWorkPhoto(selectedComplaint)} alt="Before repair" />
                      : <div className="wv-photo-empty">No before photo provided</div>}
                  </figure>
                  <figure>
                    <figcaption>After repair</figcaption>
                    {selectedComplaint.photos?.after
                      ? <ComplaintImage src={selectedComplaint.photos.after} alt="After repair" />
                      : <div className="wv-photo-empty">No after photo provided</div>}
                  </figure>
                  {selectedComplaint.photos?.site && (
                    <figure>
                      <figcaption>Staff site photo</figcaption>
                      <ComplaintImage src={selectedComplaint.photos.site} alt="Staff site inspection" />
                    </figure>
                  )}
                </div>
              </section>

              <section className="wv-decision">
                <div className="wv-section-heading">
                  <div>
                    <span className="wv-eyebrow">Verifier decision</span>
                    <h3>Record your review</h3>
                  </div>
                </div>
                {error && <p className="wv-alert" role="alert">{error}</p>}
                <label htmlFor="wv-remarks">Verification remarks <span>*</span></label>
                <textarea
                  id="wv-remarks"
                  rows="3"
                  value={remarks}
                  onChange={(event) => setRemarks(event.target.value)}
                  placeholder="Describe whether the submitted work meets the requirement."
                  disabled={saving}
                />
                <label htmlFor="wv-date-time">Verification date and time <span>*</span></label>
                <input
                  id="wv-date-time"
                  type="datetime-local"
                  value={verificationDateTime}
                  onChange={(event) => setVerificationDateTime(event.target.value)}
                  disabled={saving}
                />
                <div className="wv-decision-actions">
                  <button type="button" className="wv-reject-button" disabled={saving} onClick={() => submitDecision("reject")}>
                    {saving ? "Saving..." : "Reject and Return"}
                  </button>
                  <button type="button" className="wv-approve-button" disabled={saving} onClick={() => submitDecision("approve")}>
                    {saving ? "Saving..." : "Approve Completed Work"}
                  </button>
                </div>
              </section>
            </div>
            <footer className="wv-modal-footer">
              <button type="button" className="wv-back-button" onClick={closeDetails} disabled={saving}>Close</button>
            </footer>
          </section>
        </div>
      )}
    </main>
  );
};

export default WorkVerification;
