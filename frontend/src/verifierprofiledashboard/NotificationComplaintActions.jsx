import React, { useState } from "react";
import "./NotificationComplaintActions.css";

const NotificationComplaintActions = ({
  complaint,
  staffOptions = [],
  onAcceptAssign,
  onReject,
  onAssign,
  onComplete,
}) => {
  const status = String(complaint?.status || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ");
  const canAccept = [
    "new",
    "pending",
    "pending verification",
    "registered",
    "complaint registered",
    "submitted",
  ].includes(status);
  const canAssign = canAccept || [
    "rejected",
    "under action",
    "in action",
    "assigned",
    "in progress",
    "staff work in progress",
    "awaiting staff correction",
  ].includes(status);
  const [staffId, setStaffId] = useState("");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const currentStaffId = complaint?.assignedStaffId ||
    staffOptions.find((staff) => staff.name === complaint?.assignedStaff)?._id ||
    "";
  const selectedStaffId = staffId || currentStaffId;

  if (!complaint) return null;

  const submit = async (action) => {
    if ((action === "accept" || action === "assign") && !selectedStaffId) {
      setError("Select a staff member before continuing.");
      return;
    }
    if (!remarks.trim()) {
      setError("Add verifier remarks before saving this action.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const updated = action === "accept"
        ? await onAcceptAssign(complaint, selectedStaffId, remarks.trim())
        : action === "reject"
          ? await onReject(complaint, remarks.trim())
          : await onAssign(complaint, selectedStaffId, remarks.trim());
      onComplete?.(updated);
    } catch (saveError) {
      setError(saveError.message || "Unable to update this complaint.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="nca-panel" aria-label="Complaint action">
      <h4>
        {canAccept
          ? "Review & Assign This Complaint"
          : canAssign
            ? "Staff Assignment"
            : "Complaint Review Status"}
      </h4>
      <p className="nca-status">
        Current status: <b>{complaint.status || "Not recorded"}</b>
      </p>
      {error && <p className="nca-error" role="alert">{error}</p>}
      {canAssign && (
        <>
          <label htmlFor="nca-staff">Assign staff member *</label>
          <select
            id="nca-staff"
            value={selectedStaffId}
            disabled={saving || staffOptions.length === 0}
            onChange={(event) => setStaffId(event.target.value)}
          >
            <option value="">Select staff member</option>
            {staffOptions.map((staff) => (
              <option key={staff._id} value={staff._id}>
                {staff.name}{staff.staffId ? ` · ${staff.staffId}` : ""}
              </option>
            ))}
          </select>
        </>
      )}
      {canAccept || canAssign ? (
        <>
          <label htmlFor="nca-remarks">Verifier remarks *</label>
          <textarea
            id="nca-remarks"
            rows="3"
            value={remarks}
            disabled={saving}
            onChange={(event) => setRemarks(event.target.value)}
            placeholder="Add your review notes or explain the rejection/assignment."
          />
        </>
      ) : (
        <p className="nca-status-note">
          {["verified", "resolved", "closed"].includes(status)
            ? "This complaint has already passed verifier review. No further accept, reject, or staff-assignment action is available at this stage."
            : ["under verification", "under review", "in review"].includes(status)
              ? "Staff has submitted work for verification. Use the verification remarks and decision controls above."
              : "No assignment action is available for this status. Review the current complaint details and history above."}
        </p>
      )}
      <div className="nca-actions">
        {canAccept && (
          <button type="button" className="nca-reject" disabled={saving} onClick={() => submit("reject")}>
            Reject Complaint
          </button>
        )}
        {canAccept && (
          <button type="button" disabled={saving || !staffOptions.length} onClick={() => submit("accept")}>
            Accept & Assign Staff
          </button>
        )}
        {!canAccept && canAssign && (
          <button type="button" disabled={saving || !staffOptions.length} onClick={() => submit("assign")}>
            {saving ? "Saving..." : "Assign / Reassign Staff"}
          </button>
        )}
      </div>
    </section>
  );
};

export default NotificationComplaintActions;
