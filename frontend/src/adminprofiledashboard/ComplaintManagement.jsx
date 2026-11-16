import React, { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next"; // ✅ ADDED
import "./ComplaintManagement.css";
import { API_BASE_URL, fetchDashboard, getStoredUser, getUserId, updateDashboardComplaint } from "../utils/dashboardApi";

const STATUS_OPTIONS = ["New", "Pending", "Under Verification", "Under Action", "Resolved"];
const PRIORITY_OPTIONS = ["Critical", "Urgent", "Normal"];

const ComplaintManagement = ({ onBack }) => {
  const { t } = useTranslation(); // ✅ ADDED

  // State
  const [complaints, setComplaints] = useState([]);
  const [staffOptions, setStaffOptions] = useState([]);
  const [verifierOptions, setVerifierOptions] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterPriority, setFilterPriority] = useState("All");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  
  // Modal State
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError("");
    Promise.all([
      fetchDashboard("admin", getUserId(getStoredUser())),
      fetch(`${API_BASE_URL}/users?role=staff,verifier`).then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.success === false) {
          throw new Error(data.message || t('complaint_management.error_load_users'));
        }
        return data;
      }),
    ])
      .then(([dashboard, usersResult]) => {
        if (!active) return;
        setComplaints(dashboard.complaints || []);
        const users = usersResult.users || [];
        setStaffOptions(users.filter((user) => user.role === "staff"));
        setVerifierOptions(users.filter((user) => user.role === "verifier"));
      })
      .catch((error) => {
        if (!active) return;
        console.error("Failed to load complaints:", error);
        setLoadError(error.message || t('complaint_management.error_load'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [t]);

  // Filter Logic
  const filteredComplaints = useMemo(() => {
    return complaints.filter(c => {
      const search = searchTerm.toLowerCase();
      const matchesSearch = String(c.complaintNumber || "").toLowerCase().includes(search) ||
                            String(c.issue || "").toLowerCase().includes(search) ||
                            String(c.location || "").toLowerCase().includes(search);
      const matchesStatus = filterStatus === "All" || c.status === filterStatus;
      const matchesPriority = filterPriority === "All" || c.priority === filterPriority;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [complaints, searchTerm, filterStatus, filterPriority]);

  // Stats Calculation
  const stats = useMemo(() => ({
    total: complaints.length,
    new: complaints.filter(c => c.status === "New").length,
    inProgress: complaints.filter(c => ["Under Action", "Under Verification"].includes(c.status)).length,
    resolved: complaints.filter(c => c.status === "Resolved").length,
  }), [complaints]);

  // --- Actions ---
  const handleOpenDetails = (complaint) => {
    setSelectedComplaint({
      ...complaint,
      complaintNumber: complaint.complaintNumber || complaint.id || t('complaint_management.complaint'),
      citizenName: complaint.citizenName || t('complaint_management.not_available'),
      category: complaint.category || t('complaint_management.not_available'),
      location: complaint.location || t('complaint_management.location_pending'),
      description: complaint.description || t('complaint_management.no_description'),
      photos: Array.isArray(complaint.citizenPhotos || complaint.photos)
        ? (complaint.citizenPhotos || complaint.photos).length
        : complaint.photos || t('complaint_management.none'),
      priority: complaint.priority || t('complaint_management.normal'),
      status: complaint.status || t('complaint_management.new'),
      assignedStaff: complaint.assignedStaff || "",
      assignedStaffId: complaint.assignedStaffId || "",
      assignedVerifier: complaint.assignedVerifier || "",
    });
    setShowModal(true);
  };

  const handleSaveChanges = async () => {
    if (!selectedComplaint?.id) return;
    try {
      setSaving(true);
      const data = await updateDashboardComplaint(selectedComplaint.id, {
        status: selectedComplaint.status,
        priority: selectedComplaint.priority,
        assignedStaff: selectedComplaint.assignedStaff,
        assignedStaffId: selectedComplaint.assignedStaffId,
        assignedVerifier: selectedComplaint.assignedVerifier,
      });
      setComplaints((current) => current.map(c => c.id === selectedComplaint.id ? data.complaint : c));
      setShowModal(false);
      setSelectedComplaint(null);
    } catch (error) {
      console.error("Failed to save complaint changes:", error);
      setLoadError(error.message || t('complaint_management.error_save'));
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = { "New": "navy", "Pending": "amber", "Under Verification": "orange", "Under Action": "orange", "Resolved": "green" };
    return colors[status] || "navy";
  };

  const getPriorityColor = (priority) => {
    const colors = { "Critical": "red", "Urgent": "amber", "Normal": "green" };
    return colors[priority] || "navy";
  };

  return (
    <div className="cm-shell">
      {/* Header */}
      <div className="cm-header">
        <button className="cm-back-btn" onClick={onBack}>{t('complaint_management.back_to_dashboard')}</button>
        <div>
          <h2>{t('complaint_management.title')}</h2>
          <p>{t('complaint_management.subtitle')}</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="cm-stats-row">
        <div className="cm-stat-card"><h3>{t('complaint_management.stats.total')}</h3><p>{stats.total}</p></div>
        <div className="cm-stat-card new"><h3>{t('complaint_management.stats.new')}</h3><p>{stats.new}</p></div>
        <div className="cm-stat-card progress"><h3>{t('complaint_management.stats.in_progress')}</h3><p>{stats.inProgress}</p></div>
        <div className="cm-stat-card resolved"><h3>{t('complaint_management.stats.resolved')}</h3><p>{stats.resolved}</p></div>
      </div>

      {/* Search & Filters */}
      <div className="cm-toolbar">
        <div className="cm-search-box">
          <span>🔍</span>
          <input 
            type="text" 
            placeholder={t('complaint_management.search_placeholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="All">{t('complaint_management.all_statuses')}</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
          <option value="All">{t('complaint_management.all_priorities')}</option>
          {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Complaints Table */}
      <div className="cm-table-container">
        {loadError && <div className="cm-error" role="alert">{loadError}</div>}
        {loading ? (
          <div className="cm-empty">{t('complaint_management.loading')}</div>
        ) : (
        <table className="cm-table">
          <thead>
            <tr>
              <th>{t('complaint_management.col_id')}</th>
              <th>{t('complaint_management.col_issue_category')}</th>
              <th>{t('complaint_management.col_location')}</th>
              <th>{t('complaint_management.col_priority')}</th>
              <th>{t('complaint_management.col_status')}</th>
              <th>{t('complaint_management.col_assigned_to')}</th>
              <th>{t('complaint_management.col_date')}</th>
              <th>{t('complaint_management.col_actions')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredComplaints.length === 0 ? (
              <tr><td colSpan="8" className="cm-empty">{t('complaint_management.empty')}</td></tr>
            ) : (
              filteredComplaints.map(c => (
                <tr key={c.id}>
                  <td className="cm-mono">{c.complaintNumber}</td>
                  <td><strong>{c.issue}</strong><br/><small>{c.category}</small></td>
                  <td>{c.location}</td>
                  <td><span className={`cm-badge cm-priority-${getPriorityColor(c.priority)}`}>{c.priority}</span></td>
                  <td><span className={`cm-badge cm-status-${getStatusColor(c.status)}`}>{c.status}</span></td>
                  <td>{c.assignedStaff || <span className="cm-unassigned">{t('complaint_management.unassigned')}</span>}</td>
                  <td className="cm-mono">{c.date}</td>
                  <td>
                    <button className="cm-btn-view" onClick={() => handleOpenDetails(c)}>{t('complaint_management.btn_view_manage')}</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        )}
      </div>

      {/* Details & Action Modal */}
      {showModal && selectedComplaint && (
        <div className="cm-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="cm-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="cm-modal-header">
              <h3>{t('complaint_management.modal_title', { number: selectedComplaint.complaintNumber })}</h3>
              <button className="cm-close-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>
            
            <div className="cm-modal-body">
              {/* Left: Details */}
              <div className="cm-modal-section">
                <h4>{t('complaint_management.modal_issue_details')}</h4>
                <p><strong>{t('complaint_management.modal_citizen')}</strong> {selectedComplaint.citizenName}</p>
                <p><strong>{t('complaint_management.modal_category')}</strong> {selectedComplaint.category}</p>
                <p><strong>{t('complaint_management.modal_location')}</strong> {selectedComplaint.location}</p>
                <p><strong>{t('complaint_management.modal_description')}</strong> {selectedComplaint.description}</p>
                <p><strong>{t('complaint_management.modal_photos')}</strong> {selectedComplaint.photos}</p>
              </div>

              {/* Right: Actions */}
              <div className="cm-modal-section cm-actions-section">
                <h4>{t('complaint_management.modal_management_actions')}</h4>
                
                <div className="cm-form-group">
                  <label>{t('complaint_management.modal_set_priority')}</label>
                  <select value={selectedComplaint.priority} onChange={(e) => setSelectedComplaint({...selectedComplaint, priority: e.target.value})}>
                    {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                <div className="cm-form-group">
                  <label>{t('complaint_management.modal_update_status')}</label>
                  <select value={selectedComplaint.status} onChange={(e) => setSelectedComplaint({...selectedComplaint, status: e.target.value})}>
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="cm-form-group">
                  <label>{t('complaint_management.modal_assign_staff')}</label>
                  <select
                    value={selectedComplaint.assignedStaffId || staffOptions.find((staff) => staff.name === selectedComplaint.assignedStaff)?._id || ""}
                    onChange={(e) => {
                      const staff = staffOptions.find((item) => item._id === e.target.value);
                      setSelectedComplaint({
                        ...selectedComplaint,
                        assignedStaff: staff?.name || "",
                        assignedStaffId: staff?._id || "",
                      });
                    }}
                  >
                    <option value="">{t('complaint_management.modal_unassigned')}</option>
                    {staffOptions.map((staff) => (
                      <option key={staff._id} value={staff._id}>{staff.name} · {staff.staffId || staff.email}</option>
                    ))}
                  </select>
                </div>

                <div className="cm-form-group">
                  <label>{t('complaint_management.modal_assign_verifier')}</label>
                  <select value={selectedComplaint.assignedVerifier} onChange={(e) => setSelectedComplaint({...selectedComplaint, assignedVerifier: e.target.value})}>
                    <option value="">{t('complaint_management.modal_unassigned')}</option>
                    {verifierOptions.map(v => <option key={v._id} value={v.name}>{v.name}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="cm-modal-footer">
              <button className="cm-btn-cancel" onClick={() => setShowModal(false)}>{t('complaint_management.modal_cancel')}</button>
              <button className="cm-btn-save" onClick={handleSaveChanges} disabled={saving}>
                {saving ? t('complaint_management.modal_saving') : t('complaint_management.modal_save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplaintManagement;