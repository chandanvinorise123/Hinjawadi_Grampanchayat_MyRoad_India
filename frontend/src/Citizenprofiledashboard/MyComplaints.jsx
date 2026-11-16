import React, { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next"; // ✅ ADDED
import "./MyComplaints.css";

// ⚠️ KEEP IN ENGLISH: Used for internal logic/status mapping
const lifecycleStages = [
  "Complaint Registered",
  "Complaint Verified",
  "Assigned to Staff/Officer",
  "Action Initiated",
  "Work Completed",
  "Verification",
  "Complaint Closed",
];

const stageTone = ["amber", "amber", "orange", "orange", "orange", "amber", "green"];

const colorForCategory = (category = "") => {
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  const mapColors = ["#e07b1c", "#2e6cb0", "#1d8a5c", "#c1900a", "#cf4438", "#7a5c9e"];
  return mapColors[Math.abs(hash) % mapColors.length];
};

const MyComplaints = ({ complaints, onBack, onDelete }) => {
  const { t } = useTranslation(); // ✅ ADDED
  const stages = t('lifecycle.stages', { returnObjects: true }); // ✅ ADDED for lifecycle translation

  const initialData = complaints || [];
  const [localComplaints, setLocalComplaints] = useState(initialData);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  
  const [selectedIds, setSelectedIds] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const getFilterStatus = (stage) => {
    if (stage <= 1) return "Pending";
    if (stage >= 2 && stage <= 4) return "Under Process";
    if (stage === 5) return "Resolved";
    if (stage === 6) return "Closed";
    return "Unknown";
  };

  const filteredComplaints = useMemo(() => {
    return localComplaints.filter((c) => {
      const matchesSearch =
        c.complaintNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.category || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.location || "").toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = filterStatus === "All" || getFilterStatus(c.stage) === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [localComplaints, searchTerm, filterStatus]);

  const toggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredComplaints.map(c => c.id));
    } else {
      setSelectedIds([]);
    }
  };

  const toggleSelect = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(itemId => itemId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleDeleteClick = (target) => {
    setDeleteTarget(target);
    setShowDeleteConfirm(true);
    setSelectedComplaint(null);
  };

  const confirmDelete = async () => {
    const idsToDelete = deleteTarget === 'bulk' ? selectedIds : [deleteTarget];
    if (onDelete) {
      const results = await Promise.all(idsToDelete.map((id) => onDelete(id)));
      if (results.some((result) => result === false)) return;
    }
    const updatedComplaints = localComplaints.filter(c => !idsToDelete.includes(c.id));
    
    setLocalComplaints(updatedComplaints);
    setSelectedIds([]);
    setShowDeleteConfirm(false);
    setDeleteTarget(null);
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setDeleteTarget(null);
  };

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        setSelectedComplaint(null);
        if (showDeleteConfirm) cancelDelete();
      }
    };
    if (selectedComplaint || showDeleteConfirm) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "auto";
    };
  }, [selectedComplaint, showDeleteConfirm]);

  const isAllSelected = filteredComplaints.length > 0 && selectedIds.length === filteredComplaints.length;
  const isIndeterminate = selectedIds.length > 0 && selectedIds.length < filteredComplaints.length;

  return (
    <div className="cdp-mc-page">
      <div className="cdp-mc-header">
        <button className="cdp-back-btn" onClick={onBack}>← {t('my_complaints.back_to_dashboard')}</button>
        <h1>{t('my_complaints.title')}</h1>
      </div>

      <div className="cdp-mc-content">
        <p className="cdp-mc-subtitle">{t('my_complaints.subtitle')}</p>

        <div className="cdp-mc-controls">
          <div className="cdp-mc-search">
            <span className="cdp-mc-search-icon">🔍</span>
            <input
              type="text"
              placeholder={t('my_complaints.search_placeholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="cdp-mc-filter">
            <label>{t('my_complaints.status_label')}:</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="All">{t('status.all')}</option>
              <option value="Pending">{t('status.pending')}</option>
              <option value="Under Process">{t('status.under_process')}</option>
              <option value="Resolved">{t('status.resolved')}</option>
              <option value="Closed">{t('status.closed')}</option>
            </select>
          </div>
        </div>

        {selectedIds.length > 0 && (
          <div className="cdp-mc-bulk-bar">
            <span className="cdp-mc-bulk-text">{t('my_complaints.selected_count', { count: selectedIds.length })}</span>
            <button className="cdp-mc-bulk-delete-btn" onClick={() => handleDeleteClick('bulk')}>
              🗑️ {t('my_complaints.delete_selected')}
            </button>
          </div>
        )}

        <div className="cdp-mc-table-container">
          {filteredComplaints.length === 0 ? (
            <div className="cdp-mc-empty-state">
              <div className="cdp-mc-empty-icon">📭</div>
              <h4>{t('my_complaints.empty_title')}</h4>
              <p>{t('my_complaints.empty_desc')}</p>
            </div>
          ) : (
            <table className="cdp-mc-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      ref={input => { if (input) input.indeterminate = isIndeterminate; }}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th>{t('my_complaints.col_complaint_no')}</th>
                  <th>{t('my_complaints.col_category')}</th>
                  <th>{t('my_complaints.col_date')}</th>
                  <th>{t('my_complaints.col_location')}</th>
                  <th>{t('my_complaints.col_status')}</th>
                  <th>{t('my_complaints.col_action')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredComplaints.map((c) => (
                  <tr key={c.id} className={`cdp-mc-row ${selectedIds.includes(c.id) ? 'cdp-mc-row-selected' : ''}`}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(c.id)}
                        onChange={() => toggleSelect(c.id)}
                      />
                    </td>
                    <td className="cdp-mc-mono">{c.complaintNumber}</td>
                    <td>
                      <div className="cdp-mc-category">
                        <span className="cdp-mc-cat-dot" style={{ background: colorForCategory(c.category) }}></span>
                        {c.category}
                      </div>
                    </td>
                    <td className="cdp-mc-mono">{c.date}</td>
                    <td>{c.location}</td>
                    <td>
                      <span className={`cdp-mc-badge cdp-mc-badge-${stageTone[c.stage]}`}>
                        {stages[c.stage]}
                      </span>
                    </td>
                    <td>
                      <div className="cdp-mc-actions">
                        <button className="cdp-mc-view-btn" onClick={() => setSelectedComplaint(c)}>
                          {t('my_complaints.view_details')}
                        </button>
                        <button 
                          className="cdp-mc-delete-icon-btn"
                          onClick={() => handleDeleteClick(c.id)}
                          title={t('my_complaints.delete_complaint')}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selectedComplaint && (
        <div className="cdp-mc-modal-overlay" onClick={() => setSelectedComplaint(null)}>
          <div className="cdp-mc-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="cdp-mc-modal-header">
              <div>
                <span className="cdp-mc-modal-badge">{t('my_complaints.modal_title')}</span>
                <h3>{selectedComplaint.complaintNumber}</h3>
              </div>
              <button className="cdp-mc-modal-close" onClick={() => setSelectedComplaint(null)}>✕</button>
            </div>
            <div className="cdp-mc-modal-body">
              <div className="cdp-mc-modal-info-grid">
                <div className="cdp-mc-info-item"><span>{t('my_complaints.modal_category')}</span><b>{selectedComplaint.category}</b></div>
                <div className="cdp-mc-info-item"><span>{t('my_complaints.modal_date_submitted')}</span><b>{selectedComplaint.date}</b></div>
                <div className="cdp-mc-info-item"><span>{t('my_complaints.modal_location')}</span><b>{selectedComplaint.location}</b></div>
                <div className="cdp-mc-info-item">
                  <span>{t('my_complaints.modal_current_status')}</span>
                  <b className={`cdp-mc-text-${stageTone[selectedComplaint.stage]}`}>{stages[selectedComplaint.stage]}</b>
                </div>
              </div>
              <div className="cdp-mc-modal-section">
                <h4>📝 {t('my_complaints.modal_issue_desc')}</h4>
                <p className="cdp-mc-modal-description">{selectedComplaint.description || t('my_complaints.no_desc')}</p>
              </div>
              {(selectedComplaint.photos?.before || selectedComplaint.photos?.site || selectedComplaint.photos?.after) && (
                <div className="cdp-mc-modal-section">
                  <h4>📷 {t('my_complaints.modal_photos')}</h4>
                  <div className="cdp-mc-photos-grid">
                    {selectedComplaint.photos.before && (
                      <div className="cdp-mc-photo-box"><span className="cdp-mc-photo-label">{t('my_complaints.photo_before')}</span><div className="cdp-mc-photo-placeholder">📷 {selectedComplaint.photos.before}</div></div>
                    )}
                    {selectedComplaint.photos.site && (
                      <div className="cdp-mc-photo-box"><span className="cdp-mc-photo-label">{t('my_complaints.photo_site')}</span><div className="cdp-mc-photo-placeholder">📷 {selectedComplaint.photos.site}</div></div>
                    )}
                    {selectedComplaint.photos.after && (
                      <div className="cdp-mc-photo-box"><span className="cdp-mc-photo-label">{t('my_complaints.photo_after')}</span><div className="cdp-mc-photo-placeholder">📷 {selectedComplaint.photos.after}</div></div>
                    )}
                  </div>
                </div>
              )}
              <div className="cdp-mc-modal-section">
                <h4>ℹ️ {t('my_complaints.modal_additional')}</h4>
                <div className="cdp-mc-detail-row">
                  <span>{t('my_complaints.modal_specific_issue')}:</span>
                  <strong>{selectedComplaint.issue || selectedComplaint.issueType || t('my_complaints.general_issue')}</strong>
                </div>
              </div>
            </div>
            <div className="cdp-mc-modal-footer">
              <button className="cdp-mc-modal-close-btn" onClick={() => setSelectedComplaint(null)}>{t('my_complaints.close_details')}</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="cdp-mc-modal-overlay" onClick={cancelDelete}>
          <div className="cdp-mc-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cdp-mc-confirm-header">
              <h3>⚠️ {t('delete.confirm_title')}</h3>
              <button className="cdp-mc-modal-close" onClick={cancelDelete}>✕</button>
            </div>
            <div className="cdp-mc-confirm-body">
              <p>
                {deleteTarget === 'bulk' 
                  ? t('delete.confirm_bulk', { count: selectedIds.length })
                  : t('delete.confirm_single')}
              </p>
            </div>
            <div className="cdp-mc-confirm-footer">
              <button className="cdp-mc-confirm-cancel-btn" onClick={cancelDelete}>{t('common.cancel')}</button>
              <button className="cdp-mc-confirm-delete-btn" onClick={confirmDelete}>{t('common.yes_delete')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyComplaints;