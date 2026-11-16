import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next"; // ✅ ADDED
import ComplaintImage from "./ComplaintImage";
import VerifierComplaintDetails from "./VerifierComplaintDetails";
import { uploadDashboardPhoto } from "../utils/dashboardApi";
import logo from "../assets/logo.jpeg";
import "./ComplaintAssigned.css";

const formatStatus = (status, t) => {
  const labels = {
    pending: t('complaint_assigned.status_pending'),
    in_action: t('complaint_assigned.status_in_action'),
    in_review: t('complaint_assigned.status_in_review'),
    verified: t('complaint_assigned.status_verified'),
    resolved: t('complaint_assigned.status_resolved'),
    notified: t('complaint_assigned.status_notified'),
    rejected: t('complaint_assigned.status_rejected'),
  };
  return labels[status] || status || t('complaint_assigned.status_unavailable');
};

const ComplaintAssigned = ({
  complaints,
  staffOptions,
  verifier,
  loadError,
  onBack,
  onAction,
  onAssignStaff,
  onSaveEvidence,
}) => {
  const { t } = useTranslation(); // ✅ ADDED

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [staffId, setStaffId] = useState("");
  const [remarks, setRemarks] = useState("");
  const [evidencePhoto, setEvidencePhoto] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const managedComplaints = useMemo(() => {
    const hasAssignment = (value) => {
      const assignee = typeof value === "object"
        ? value?._id || value?.name || ""
        : value;
      const normalized = String(assignee || "").trim().toLowerCase();
      return normalized !== "" &&
        !["unassigned", "not assigned", "none", "null"].includes(normalized);
    };

    const assigned = complaints.filter((complaint) =>
      hasAssignment(complaint.assignedStaffId) ||
      hasAssignment(complaint.assignedStaff) ||
      hasAssignment(complaint.assignedVerifierId) ||
      hasAssignment(complaint.assignedVerifier)
    );
    const assignmentTime = (complaint) => {
      const latestAssignmentTime = (complaint.log || []).reduce((latest, entry) => {
        if (!/assigned (staff member|verifier)|assigned to/i.test(entry.text || "")) {
          return latest;
        }
        const timestamp = new Date(entry.time || 0).getTime();
        return Number.isFinite(timestamp) ? Math.max(latest, timestamp) : latest;
      }, 0);
      if (latestAssignmentTime) return latestAssignmentTime;

      const timestamp = new Date(complaint.updatedAt || complaint.createdAt || 0).getTime();
      return Number.isFinite(timestamp) ? timestamp : 0;
    };

    return assigned.sort((first, second) =>
      assignmentTime(second) - assignmentTime(first)
    );
  }, [complaints]);

  const filteredComplaints = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return managedComplaints;
    return managedComplaints.filter((complaint) => [
      complaint.complaintNumber,
      complaint.issue,
      complaint.category,
      complaint.location,
      complaint.status,
      complaint.queue,
      complaint.assignedStaff,
      complaint.assignedVerifier,
    ].some((value) => String(value || "").toLowerCase().includes(query)));
  }, [managedComplaints, searchTerm]);

  const openComplaint = (complaint) => {
    setSelectedComplaint(complaint);
    setStaffId(
      complaint.assignedStaffId ||
      staffOptions.find((staff) => staff.name === complaint.assignedStaff)?._id ||
      ""
    );
    setRemarks("");
    setEvidencePhoto(complaint.photos?.verification || "");
    setError("");
  };

  const handleDecision = async (action) => {
    if (action === "accept" && !staffId) {
      setError(t('complaint_assigned.error_select_staff_accept'));
      return;
    }
    if (action === "reject" && !remarks.trim()) {
      setError(t('complaint_assigned.error_add_remarks_reject'));
      return;
    }

    setSaving(true);
    setError("");
    try {
      await onAction(selectedComplaint.id, action, {
        staffId,
        remarks: remarks.trim(),
      });
      setSelectedComplaint(null);
    } catch (saveError) {
      setError(saveError.message || t('complaint_assigned.error_save_decision'));
    } finally {
      setSaving(false);
    }
  };

  const handleStaffAssignment = async () => {
    if (!staffId) {
      setError(t('complaint_assigned.error_select_staff_assign'));
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onAssignStaff(selectedComplaint, staffId);
      setSelectedComplaint(null);
    } catch (saveError) {
      setError(saveError.message || t('complaint_assigned.error_assign_staff'));
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    setError("");
    try {
      const uploaded = await uploadDashboardPhoto(file);
      const updated = await onSaveEvidence(selectedComplaint.id, uploaded.publicUrl);
      setSelectedComplaint(updated);
      setEvidencePhoto(updated.photos?.verification || uploaded.publicUrl);
    } catch (uploadError) {
      setError(uploadError.message || t('complaint_assigned.error_save_verifier_image'));
    } finally {
      setUploadingPhoto(false);
      event.target.value = "";
    }
  };

  const closeDetails = () => {
    if (!saving && !uploadingPhoto) setSelectedComplaint(null);
  };

  const initials = String(verifier.name || "Verifier")
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="vd-shell">
      <aside className="vd-sidebar">
        <div className="vd-sb-brand">
          <div className="vd-sb-logo"><img src={logo} alt={t('complaint_assigned.brand')} /></div>
          <div>
            <b>{t('complaint_assigned.brand')}</b>
            <span>{t('complaint_assigned.portal')}</span>
          </div>
        </div>
        <div className="vd-sb-label">{t('complaint_assigned.overview')}</div>
        <nav className="vd-sb-nav">
          <button type="button" className="vd-sb-link" onClick={onBack}>
            📊 {t('complaint_assigned.dashboard')}
          </button>
          <button type="button" className="vd-sb-link active" aria-current="page">
            📋 {t('complaint_assigned.complaint_assigned')}
            <span className="vd-sb-badge">{managedComplaints.length}</span>
          </button>
        </nav>
        <div className="vd-sb-footer">
          <div className="vd-sb-user">
            <div className="vd-sb-avatar">{initials}</div>
            <div className="vd-sb-user-info">
              <b>{verifier.name}</b>
              <span>{verifier.staffId}</span>
            </div>
          </div>
          <div className="vd-sb-ward">{verifier.role} · {verifier.ward}</div>
        </div>
      </aside>

      <main className="vd-main ca-page">
        <header className="vd-topbar">
          <button className="vd-btn-outline" type="button" onClick={onBack}>
            ← {t('complaint_assigned.back_to_dashboard')}
          </button>
          <div className="vd-tb-user">
            <div className="vd-tb-avatar">{initials}</div>
            <div><b>{verifier.name}</b><span>{verifier.role}</span></div>
          </div>
        </header>

        <div className="vd-content">
          <div className="vd-title-row">
            <h1>{t('complaint_assigned.complaint_assigned')}</h1>
            <p>{t('complaint_assigned.review_assigned_subtitle')}</p>
          </div>
          {loadError && <div className="vd-error-message" role="alert">{loadError}</div>}
          <section className="vd-panel" aria-label={t('complaint_assigned.assigned_complaints')}>
            <div className="vd-panel-head cm-panel-head">
              <h3>{t('complaint_assigned.assigned_complaints')}</h3>
              <span className="vd-panel-link">{t('complaint_assigned.shown_assigned', { shown: filteredComplaints.length, assigned: managedComplaints.length })}</span>
            </div>
            <label className="cm-search">
              <span>{t('complaint_assigned.search_complaints')}</span>
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={t('complaint_assigned.search_placeholder')}
              />
            </label>
            <div className="vd-table-wrap">
              <table className="cm-table">
                <thead>
                  <tr>
                    <th>{t('complaint_assigned.col_complaint')}</th>
                    <th>{t('complaint_assigned.col_issue')}</th>
                    <th>{t('complaint_assigned.col_location')}</th>
                    <th>{t('complaint_assigned.col_assigned_verifier')}</th>
                    <th>{t('complaint_assigned.col_assigned_staff')}</th>
                    <th>{t('complaint_assigned.col_status')}</th>
                    <th>{t('complaint_assigned.col_details')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredComplaints.length ? filteredComplaints.map((complaint) => (
                    <tr key={complaint.id}>
                      <td className="vd-mono">{complaint.complaintNumber || "—"}</td>
                      <td>{complaint.issue || complaint.category || t('complaint_assigned.not_specified')}</td>
                      <td>{complaint.location || t('complaint_assigned.location_pending')}</td>
                      <td>{complaint.assignedVerifier || t('complaint_assigned.not_assigned')}</td>
                      <td>{complaint.assignedStaff || t('complaint_assigned.not_assigned')}</td>
                      <td><span className={`cm-status cm-status-${complaint.status}`}>{formatStatus(complaint.status, t)}</span></td>
                      <td>
                        <button
                          className="vd-verify-btn"
                          type="button"
                          onClick={() => openComplaint(complaint)}
                        >
                          {t('complaint_assigned.view_details')}
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="7" className="cm-empty">
                      {managedComplaints.length
                        ? t('complaint_assigned.no_match_search')
                        : t('complaint_assigned.no_complaints_available')}
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>

      {selectedComplaint && (
        <div className="cm-modal-backdrop" onClick={closeDetails}>
          <section
            className="cm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cm-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="cm-modal-header">
              <div>
                <span>{t('complaint_assigned.complaint_details')}</span>
                <h2 id="cm-modal-title">{selectedComplaint.complaintNumber || t('complaint_assigned.complaint')}</h2>
              </div>
              <button type="button" aria-label={t('complaint_assigned.close_details_aria')} onClick={closeDetails}>×</button>
            </header>
            <div className="cm-modal-body">
              <div className="cm-detail-column cm-detail-primary">
                <div className="cm-summary-grid">
                  <div><span>{t('complaint_assigned.issue')}</span><b>{selectedComplaint.issue || selectedComplaint.category || t('complaint_assigned.not_specified')}</b></div>
                  <div><span>{t('complaint_assigned.priority')}</span><b>{selectedComplaint.priority || t('complaint_assigned.normal')}</b></div>
                  <div><span>{t('complaint_assigned.status')}</span><b>{formatStatus(selectedComplaint.status, t)}</b></div>
                  <div><span>{t('complaint_assigned.queue')}</span><b>{selectedComplaint.queue || t('complaint_assigned.not_assigned')}</b></div>
                  <div className="cm-wide"><span>{t('complaint_assigned.description')}</span><b>{selectedComplaint.description || t('complaint_assigned.no_description_provided')}</b></div>
                </div>

                <section className="cm-evidence">
                  <div className="cm-section-heading">
                    <div>
                      <span className="cm-section-kicker">{t('complaint_assigned.visual_evidence')}</span>
                      <h3>{t('complaint_assigned.complaint_verification_images')}</h3>
                    </div>
                    <span className="cm-image-count">
                      {[
                        selectedComplaint.photos?.before,
                        selectedComplaint.photos?.site,
                        selectedComplaint.photos?.after,
                        evidencePhoto,
                      ].filter(Boolean).length} {t('complaint_assigned.photos')}
                    </span>
                  </div>
                  <div className="cm-images">
                    {[
                      [t('complaint_assigned.before_repair'), selectedComplaint.photos?.before],
                      [t('complaint_assigned.site_photo'), selectedComplaint.photos?.site],
                      [t('complaint_assigned.after_repair'), selectedComplaint.photos?.after],
                      [t('complaint_assigned.verifier_image'), evidencePhoto],
                    ].filter(([, url]) => url).map(([label, url]) => (
                      <figure key={label}>
                        <ComplaintImage src={url} alt={label} />
                        <figcaption>{label}</figcaption>
                      </figure>
                    ))}
                    {!selectedComplaint.photos?.before &&
                      !selectedComplaint.photos?.site &&
                      !selectedComplaint.photos?.after &&
                      !evidencePhoto && <p className="cm-no-images">{t('complaint_assigned.no_images_uploaded')}</p>}
                  </div>
                  <label className="cm-upload">
                    {uploadingPhoto ? t('complaint_assigned.uploading_verifier_image') : t('complaint_assigned.add_optional_verifier_image')}
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingPhoto || saving}
                      onChange={handlePhotoUpload}
                    />
                  </label>
                </section>
              </div>
              <div className="cm-detail-column cm-detail-secondary">
                <VerifierComplaintDetails complaint={selectedComplaint} />

                {["pending", "in_action", "rejected"].includes(selectedComplaint.status) && (
                  <section className="cm-actions">
                    <div className="cm-section-heading">
                      <div>
                        <span className="cm-section-kicker">{t('complaint_assigned.next_step')}</span>
                        <h3>{t('complaint_assigned.review_assignment')}</h3>
                      </div>
                    </div>
                    {error && <p className="cm-error" role="alert">{error}</p>}
                    <label htmlFor="cm-staff">{t('complaint_assigned.assign_staff')}</label>
                    <select
                      id="cm-staff"
                      value={staffId}
                      disabled={saving || uploadingPhoto}
                      onChange={(event) => setStaffId(event.target.value)}
                    >
                      <option value="">{t('complaint_assigned.select_staff_member')}</option>
                      {staffOptions.map((staff) => (
                        <option key={staff._id} value={staff._id}>
                          {staff.name}{staff.staffId ? ` · ${staff.staffId}` : ""}
                        </option>
                      ))}
                    </select>
                    {selectedComplaint.status === "pending" && (
                      <>
                        <label htmlFor="cm-remarks">{t('complaint_assigned.rejection_remarks')}</label>
                        <textarea
                          id="cm-remarks"
                          rows="3"
                          value={remarks}
                          disabled={saving || uploadingPhoto}
                          onChange={(event) => setRemarks(event.target.value)}
                          placeholder={t('complaint_assigned.explain_rejection')}
                        />
                      </>
                    )}
                    <div className="cm-action-buttons">
                      {selectedComplaint.status === "pending" ? (
                        <>
                          <button type="button" className="vd-btn-danger" disabled={saving || uploadingPhoto} onClick={() => handleDecision("reject")}>{t('complaint_assigned.reject_complaint')}</button>
                          <button type="button" className="vd-btn-primary" disabled={saving || uploadingPhoto} onClick={() => handleDecision("accept")}>{saving ? t('complaint_assigned.saving') : t('complaint_assigned.accept_assign')}</button>
                        </>
                      ) : (
                        <button type="button" className="vd-btn-primary" disabled={saving || uploadingPhoto} onClick={handleStaffAssignment}>{saving ? t('complaint_assigned.saving') : t('complaint_assigned.assign_reassign_staff')}</button>
                      )}
                    </div>
                  </section>
                )}
                {error && !["pending", "in_action", "rejected"].includes(selectedComplaint.status) && (
                  <p className="cm-error" role="alert">{error}</p>
                )}
              </div>
            </div>
            <footer className="cm-modal-footer">
              <button type="button" className="vd-btn-outline" onClick={closeDetails}>{t('complaint_assigned.close')}</button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
};

export default ComplaintAssigned;