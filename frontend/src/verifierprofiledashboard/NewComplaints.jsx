import React, { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next"; // ✅ ADDED
import "./NewComplaints.css";
import VerifierComplaintDetails from "./VerifierComplaintDetails";
import ComplaintImage from "./ComplaintImage";

// Helper function for category colors (matches dashboard)
const getCategoryColor = (category) => {
  const mapColors = ["#e07b1c", "#2e6cb0", "#1d8a5c", "#c1900a", "#cf4438", "#7a5c9e"];
  let hash = 0;
  const value = String(category || "");
  for (let i = 0; i < value.length; i++) hash = value.charCodeAt(i) + ((hash << 5) - hash);
  return mapColors[Math.abs(hash) % mapColors.length];
};

const NewComplaints = ({ complaints, staffOptions = [], onAction, onBack }) => {
  const { t } = useTranslation(); // ✅ ADDED

  const [searchTerm, setSearchTerm] = useState("");
  const [filterPriority, setFilterPriority] = useState("All");
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [assignedStaffId, setAssignedStaffId] = useState("");
  const [verifierRemarks, setVerifierRemarks] = useState("");
  const [savingAction, setSavingAction] = useState(false);
  const [actionError, setActionError] = useState("");

  // 1. Filter only "New Complaints"
  const newComplaints = useMemo(() => {
    return complaints.filter((c) => c.queue === "New Complaints");
  }, [complaints]);

  // 2. Apply Search and Priority Filters
  const filteredComplaints = useMemo(() => {
    return newComplaints.filter((c) => {
      const matchesSearch =
        String(c.complaintNumber || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(c.category || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(c.location || "").toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesPriority = filterPriority === "All" || c.priority === filterPriority;
      
      return matchesSearch && matchesPriority;
    });
  }, [newComplaints, searchTerm, filterPriority]);

  // Helper for badge colors
  const getPriorityTone = (priority) => {
    if (priority === "High" || priority === "Critical") return "red";
    if (priority === "Medium" || priority === "Urgent") return "amber";
    return "green";
  };

  // ✅ Moved inside component to safely use `t`
  const getStatusLabel = (status) => {
    const labels = {
      pending: t('new_complaints.status_pending'),
      in_review: t('new_complaints.status_in_review'),
      verified: t('new_complaints.status_verified'),
      rejected: t('new_complaints.status_rejected'),
    };
    return labels[status] || status;
  };

  const getStatusTone = (status) => {
    const tones = {
      pending: "amber",
      in_review: "orange",
      verified: "green",
      rejected: "red",
    };
    return tones[status] || "navy";
  };

  const selectComplaint = (complaint) => {
    setSelectedComplaint(complaint);
    setAssignedStaffId(
      complaint.assignedStaffId ||
      staffOptions.find((staff) => staff.name === complaint.assignedStaff)?._id ||
      ""
    );
    setVerifierRemarks("");
    setActionError("");
  };

  const handleAction = async (action) => {
    if (action === "accept" && !assignedStaffId) {
      setActionError(t('new_complaints.error_select_staff'));
      return;
    }
    if (action === "reject" && !verifierRemarks.trim()) {
      setActionError(t('new_complaints.error_add_remarks'));
      return;
    }

    setSavingAction(true);
    setActionError("");
    try {
      await onAction(selectedComplaint.id, action, {
        staffId: assignedStaffId,
        remarks: verifierRemarks.trim(),
      });
      setSelectedComplaint(null);
    } catch (error) {
      setActionError(error.message || t('new_complaints.error_save_decision'));
    } finally {
      setSavingAction(false);
    }
  };

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") setSelectedComplaint(null);
    };
    if (selectedComplaint) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "auto";
    };
  }, [selectedComplaint]);

  return (
    <div className="nc-shell">
      {/* Header */}
      <div className="nc-header">
        <button className="nc-back-btn" onClick={onBack}>
          {t('new_complaints.back_to_dashboard')}
        </button>
        <h2>{t('new_complaints.title')}</h2>
      </div>

      <div className="nc-container">
        {/* ✅ Summary Cards (Two Distinct Cards) */}
        <div className="nc-summary-cards">
          <div className="nc-summary-card">
            <span className="nc-summary-label">{t('new_complaints.total_new_complaints')}</span>
            <span className="nc-summary-value">{newComplaints.length}</span>
          </div>
          <div className="nc-summary-card">
            <span className="nc-summary-label">{t('new_complaints.filtered_results')}</span>
            <span className="nc-summary-value">{filteredComplaints.length}</span>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="nc-controls">
          <div className="nc-search">
            <span>🔍</span>
            <input
              type="text"
              placeholder={t('new_complaints.search_placeholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="nc-filter">
            <label>{t('new_complaints.priority_label')}:</label>
            <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
              <option value="All">{t('new_complaints.all_priorities')}</option>
              <option value="Critical">{t('new_complaints.critical')}</option>
              <option value="Urgent">{t('new_complaints.urgent')}</option>
              <option value="Normal">{t('new_complaints.normal')}</option>
            </select>
          </div>
        </div>

        {/* Complaints Table */}
        <div className="nc-table-container">
          {filteredComplaints.length === 0 ? (
            <div className="nc-empty-state">
              <div className="nc-empty-icon">📭</div>
              <h4>{t('new_complaints.empty_title')}</h4>
              <p>{t('new_complaints.empty_desc')}</p>
            </div>
          ) : (
            <table className="nc-table">
              <thead>
                <tr>
                  <th>{t('new_complaints.col_complaint_no')}</th>
                  <th>{t('new_complaints.col_category')}</th>
                  <th>{t('new_complaints.col_priority')}</th>
                  <th>{t('new_complaints.col_location')}</th>
                  <th>{t('new_complaints.col_status')}</th>
                  <th>{t('new_complaints.col_action')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredComplaints.map((c) => (
                  <tr key={c.id} className="nc-row">
                    <td className="nc-mono">{c.complaintNumber}</td>
                    <td>
                      <div className="nc-category">
                        <span className="nc-cat-dot" style={{ background: getCategoryColor(c.category) }}></span>
                        {c.category}
                      </div>
                    </td>
                    <td>
                      <span className={`nc-badge nc-badge-${getPriorityTone(c.priority)}`}>
                        {c.priority}
                      </span>
                    </td>
                    <td>{c.location}</td>
                    <td>
                      <span className={`nc-badge nc-badge-${getStatusTone(c.status)}`}>
                        {getStatusLabel(c.status)}
                      </span>
                    </td>
                    <td>
                      <button 
                        className="nc-view-btn"
                        onClick={() => selectComplaint(c)}
                      >
                        {t('new_complaints.view_details')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ✅ OVERLAY MODAL for Complete Complaint Details */}
      {selectedComplaint && (
        <div className="nc-modal-overlay" onClick={() => setSelectedComplaint(null)}>
          <div className="nc-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="nc-modal-header">
              <div>
                <span className="nc-modal-badge">{t('new_complaints.modal_title')}</span>
                <h3>{selectedComplaint.complaintNumber}</h3>
              </div>
              <button className="nc-modal-close" onClick={() => setSelectedComplaint(null)}>✕</button>
            </div>

            <div className="nc-modal-body">
              {/* Top Info Grid */}
              <div className="nc-modal-info-grid">
                <div className="nc-info-item">
                  <span>{t('new_complaints.modal_category')}</span>
                  <b>{selectedComplaint.category}</b>
                </div>
                <div className="nc-info-item">
                  <span>{t('new_complaints.modal_priority')}</span>
                  <b className={`nc-text-${getPriorityTone(selectedComplaint.priority)}`}>
                    {selectedComplaint.priority}
                  </b>
                </div>
                <div className="nc-info-item">
                  <span>{t('new_complaints.modal_location')}</span>
                  <b>{selectedComplaint.location}</b>
                </div>
                <div className="nc-info-item">
                  <span>{t('new_complaints.modal_status')}</span>
                  <b>{getStatusLabel(selectedComplaint.status)}</b>
                </div>
              </div>

              {/* Citizen Info */}
              <div className="nc-modal-section">
                <h4>{t('new_complaints.citizen_info')}</h4>
                <div className="nc-citizen-row">
                  <div><span>{t('new_complaints.citizen_name')}</span> <b>{selectedComplaint.citizenName}</b></div>
                  <div><span>{t('new_complaints.citizen_contact')}</span> <b>{selectedComplaint.citizenContact}</b></div>
                </div>
              </div>

              {/* Description */}
              <div className="nc-modal-section">
                <h4>{t('new_complaints.description')}</h4>
                <p className="nc-description">{selectedComplaint.description}</p>
              </div>
              <VerifierComplaintDetails complaint={selectedComplaint} />

              {/* Photos */}
              <div className="nc-modal-section">
                <h4>{t('new_complaints.attached_photos')}</h4>
                <div className="nc-photos-grid">
                  {selectedComplaint.photos?.before && (
                    <div className="nc-photo-box">
                      <span className="nc-photo-label">{t('new_complaints.before_repair')}</span>
                      <div className="nc-photo-placeholder">
                        <ComplaintImage key={`${selectedComplaint.id}-before`} src={selectedComplaint.photos.before} alt={t('new_complaints.before_repair')} fallbackClassName="nc-photo-load-error" />
                      </div>
                    </div>
                  )}
                  {!selectedComplaint.photos?.before && !selectedComplaint.photos?.site && !selectedComplaint.photos?.after && (
                    <p>{t('new_complaints.no_photos_attached')}</p>
                  )}
                  {selectedComplaint.photos?.site && (
                    <div className="nc-photo-box">
                      <span className="nc-photo-label">{t('new_complaints.site_photo')}</span>
                      <div className="nc-photo-placeholder">
                        <ComplaintImage key={`${selectedComplaint.id}-site`} src={selectedComplaint.photos.site} alt={t('new_complaints.site_photo')} fallbackClassName="nc-photo-load-error" />
                      </div>
                    </div>
                  )}
                  {selectedComplaint.photos?.after && (
                    <div className="nc-photo-box">
                      <span className="nc-photo-label">{t('new_complaints.after_repair')}</span>
                      <div className="nc-photo-placeholder">
                        <ComplaintImage key={`${selectedComplaint.id}-after`} src={selectedComplaint.photos.after} alt={t('new_complaints.after_repair')} fallbackClassName="nc-photo-load-error" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {["pending", "in_action"].includes(selectedComplaint.status) && (
              <div className="nc-review-actions">
                {actionError && <p className="nc-review-error" role="alert">{actionError}</p>}
                <label htmlFor="nc-assigned-staff">{t('new_complaints.assign_staff')}</label>
                <select
                  id="nc-assigned-staff"
                  value={assignedStaffId}
                  disabled={savingAction}
                  onChange={(event) => setAssignedStaffId(event.target.value)}
                >
                  <option value="">{t('new_complaints.select_staff_member')}</option>
                  {staffOptions.map((staff) => (
                    <option key={staff._id} value={staff._id}>
                      {staff.name}{staff.staffId ? ` · ${staff.staffId}` : ""}
                    </option>
                  ))}
                </select>
                <label htmlFor="nc-verifier-remarks">{t('new_complaints.rejection_remarks')}</label>
                <textarea
                  id="nc-verifier-remarks"
                  rows="3"
                  value={verifierRemarks}
                  disabled={savingAction}
                  onChange={(event) => setVerifierRemarks(event.target.value)}
                  placeholder={t('new_complaints.rejection_placeholder')}
                />
                <div className="nc-review-buttons">
                  <button type="button" disabled={savingAction} onClick={() => handleAction("reject")}>
                    {t('new_complaints.reject_complaint')}
                  </button>
                  <button type="button" disabled={savingAction} onClick={() => handleAction("accept")}>
                    {savingAction ? t('new_complaints.saving') : t('new_complaints.accept_assign')}
                  </button>
                </div>
              </div>
            )}

            <div className="nc-modal-footer">
              <button className="nc-modal-close-btn" onClick={() => setSelectedComplaint(null)}>
                {t('new_complaints.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewComplaints;