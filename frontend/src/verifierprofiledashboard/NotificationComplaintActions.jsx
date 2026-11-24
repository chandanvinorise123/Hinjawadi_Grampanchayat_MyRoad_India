import React, { useState } from "react";
import { useTranslation } from "react-i18next"; // ✅ ADDED
import "./NotificationComplaintActions.css";

const NotificationComplaintActions = ({
  complaint,
  staffOptions = [],
  staffOptionsLoading = false,
  staffLoadError = "",
  onAcceptAssign,
  onReject,
  onAssign,
  onComplete,
  idPrefix = "nca",
}) => {
  const { t } = useTranslation(); // ✅ ADDED

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
  const [isAssignmentEditing, setIsAssignmentEditing] = useState(false);
  
  const currentStaffId = complaint?.assignedStaffId ||
    staffOptions.find((staff) => staff.name === complaint?.assignedStaff)?._id ||
    "";
  const selectedStaffId = isAssignmentEditing ? staffId : currentStaffId;

  if (!complaint) return null;

  const submit = async (action) => {
    if ((action === "accept" || action === "assign") && !selectedStaffId) {
      setError(t('notification_complaint_actions.error_select_staff'));
      return;
    }
    if (!remarks.trim()) {
      setError(t('notification_complaint_actions.error_add_remarks'));
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
      if (action === "accept" || action === "assign") {
        setIsAssignmentEditing(false);
        setStaffId("");
      }
    } catch (saveError) {
      setError(saveError.message || t('notification_complaint_actions.error_update'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="nca-panel" aria-label={t('notification_complaint_actions.aria_complaint_action')}>
      <h4>
        {canAccept
          ? t('notification_complaint_actions.review_assign_title')
          : canAssign
            ? t('notification_complaint_actions.staff_assignment_title')
            : t('notification_complaint_actions.review_status_title')}
      </h4>
      <p className="nca-status">
        {t('notification_complaint_actions.current_status')}: <b>{complaint.status || t('notification_complaint_actions.not_recorded')}</b>
      </p>
      {error && <p className="nca-error" role="alert">{error}</p>}
      {canAssign && (
        <>
          <label htmlFor={`${idPrefix}-staff`}>{t('notification_complaint_actions.assign_staff_label')}</label>
          <select
            id={`${idPrefix}-staff`}
            value={selectedStaffId}
            disabled={!isAssignmentEditing || saving || staffOptions.length === 0}
            onChange={(event) => setStaffId(event.target.value)}
          >
            <option value="">{t('notification_complaint_actions.select_staff_member')}</option>
            {staffOptions.map((staff) => (
              <option key={staff._id} value={staff._id}>
                {staff.name}{staff.staffId ? ` · ${staff.staffId}` : ""}
              </option>
            ))}
          </select>
          {staffOptions.length === 0 && !staffOptionsLoading && (
            <p
              className="nca-staff-options-feedback"
              role={staffLoadError ? "alert" : "status"}
            >
              {staffLoadError ||
                t('notification_complaint_actions.no_staff_available')}
            </p>
          )}
        </>
      )}
      {canAccept || canAssign ? (
        <>
          <label htmlFor={`${idPrefix}-remarks`}>{t('notification_complaint_actions.verifier_remarks_label')}</label>
          <textarea
            id={`${idPrefix}-remarks`}
            rows="3"
            value={remarks}
            disabled={saving}
            onChange={(event) => setRemarks(event.target.value)}
            placeholder={t('notification_complaint_actions.remarks_placeholder')}
          />
        </>
      ) : (
        <p className="nca-status-note">
          {["verified", "resolved", "closed"].includes(status)
            ? t('notification_complaint_actions.status_verified_note')
            : ["under verification", "under review", "in review"].includes(status)
              ? t('notification_complaint_actions.status_under_verification_note')
              : t('notification_complaint_actions.status_default_note')}
        </p>
      )}
      <div className="nca-actions">
        {canAccept && (
          <button type="button" className="nca-reject" disabled={saving || isAssignmentEditing} onClick={() => submit("reject")}>
            {t('notification_complaint_actions.reject_complaint')}
          </button>
        )}
        {canAssign && !isAssignmentEditing && (
          <button
            type="button"
            disabled={saving || staffOptions.length === 0}
            onClick={() => {
              setStaffId(currentStaffId);
              setError("");
              setIsAssignmentEditing(true);
            }}
          >
            {t('notification_complaint_actions.edit_assignment')}
          </button>
        )}
        {canAssign && isAssignmentEditing && (
          <>
            <button
              type="button"
              disabled={saving || !staffOptions.length}
              onClick={() => submit(canAccept ? "accept" : "assign")}
            >
              {saving
                ? t('notification_complaint_actions.saving')
                : t('notification_complaint_actions.save_assignment')}
            </button>
            <button
              type="button"
              className="nca-secondary"
              disabled={saving}
              onClick={() => {
                setIsAssignmentEditing(false);
                setStaffId("");
                setError("");
              }}
            >
              {t('notification_complaint_actions.cancel_assignment')}
            </button>
          </>
        )}
      </div>
    </section>
  );
};

export default NotificationComplaintActions;