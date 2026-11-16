import React, { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next"; // ✅ ADDED
import "./RecentActivity.css";
import { fetchDashboard, getStoredUser, getUserId } from "../utils/dashboardApi";

// ⚠️ KEEP IN ENGLISH: Used for internal logic/status mapping
const categoryBadgeMap = {
  "Complaints": "navy",
  "Account": "orange",
  "Tracking": "amber",
  "Security": "green"
};

const RecentActivity = ({ onBack }) => {
  const { t } = useTranslation(); // ✅ ADDED

  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    fetchDashboard("citizen", getUserId(getStoredUser()))
      .then(({ complaints = [] }) => setActivities(complaints.flatMap((complaint) =>
        (complaint.statusHistory || []).map((entry) => ({
          id: `${complaint.id}-${entry.updatedAt}`,
          timestamp: entry.updatedAt ? new Date(entry.updatedAt).toLocaleString() : "",
          action: entry.status,
          category: "Complaints",
          complaintNumber: complaint.complaintNumber,
          description: entry.remarks || t('recent_activity.status_changed', { status: entry.status }),
          device: "MyRoad India",
          status: "Success",
        }))
      )))
      .catch((error) => console.error("Failed to load citizen activity:", error));
  }, [t]); // ✅ Added t to dependency array

  const filteredActivities = useMemo(() => {
    return activities.filter((a) => {
      const matchesSearch =
        (a.action || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.description || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.complaintNumber && a.complaintNumber.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesCategory = filterCategory === "All" || a.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [activities, searchTerm, filterCategory]);

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") setSelectedActivity(null);
    };
    if (selectedActivity) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "auto";
    };
  }, [selectedActivity]);

  return (
    <div className="cdp-ra-page">
      {/* Header */}
      <div className="cdp-ra-header">
        <button className="cdp-back-btn" onClick={onBack}>← {t('recent_activity.back_to_dashboard')}</button>
        <h1>{t('recent_activity.title')}</h1>
      </div>

      <div className="cdp-ra-content">
        <p className="cdp-ra-subtitle">
          {t('recent_activity.subtitle')}
        </p>

        {/* Search and Filter Bar */}
        <div className="cdp-ra-controls">
          <div className="cdp-ra-search">
            <span className="cdp-ra-search-icon">🔍</span>
            <input
              type="text"
              placeholder={t('recent_activity.search_placeholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="cdp-ra-filter">
            <label>{t('recent_activity.filter_label')}:</label>
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
              <option value="All">{t('recent_activity.filter_all')}</option>
              <option value="Complaints">{t('recent_activity.filter_complaints')}</option>
              <option value="Tracking">{t('recent_activity.filter_tracking')}</option>
              <option value="Account">{t('recent_activity.filter_account')}</option>
              <option value="Security">{t('recent_activity.filter_security')}</option>
            </select>
          </div>
        </div>

        {/* Activity Table */}
        <div className="cdp-ra-table-container">
          {filteredActivities.length === 0 ? (
            <div className="cdp-ra-empty-state">
              <div className="cdp-ra-empty-icon">📜</div>
              <h4>{t('recent_activity.empty_title')}</h4>
              <p>{t('recent_activity.empty_desc')}</p>
            </div>
          ) : (
            <table className="cdp-ra-table">
              <thead>
                <tr>
                  <th>{t('recent_activity.col_datetime')}</th>
                  <th>{t('recent_activity.col_action')}</th>
                  <th>{t('recent_activity.col_category')}</th>
                  <th>{t('recent_activity.col_related_complaint')}</th>
                  <th>{t('recent_activity.col_status')}</th>
                  <th>{t('recent_activity.col_action_btn')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredActivities.map((a) => (
                  <tr key={a.id} className="cdp-ra-row">
                    <td className="cdp-ra-mono">{a.timestamp}</td>
                    <td className="cdp-ra-action-text">{a.action}</td>
                    <td>
                      <span className={`cdp-ra-badge cdp-ra-badge-${categoryBadgeMap[a.category]}`}>
                        {a.category}
                      </span>
                    </td>
                    <td className="cdp-ra-mono">
                      {a.complaintNumber || <span className="cdp-ra-na">{t('recent_activity.na')}</span>}
                    </td>
                    <td>
                      <span className="cdp-ra-status-success">✓ {a.status}</span>
                    </td>
                    <td>
                      <button 
                        className="cdp-ra-view-btn"
                        onClick={() => setSelectedActivity(a)}
                      >
                        {t('recent_activity.view_details')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ✅ OVERLAY MODAL for Complete Activity Details */}
      {selectedActivity && (
        <div className="cdp-ra-modal-overlay" onClick={() => setSelectedActivity(null)}>
          <div className="cdp-ra-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="cdp-ra-modal-header">
              <div>
                <span className={`cdp-ra-modal-badge cdp-ra-badge-${categoryBadgeMap[selectedActivity.category]}`}>
                  {selectedActivity.category}
                </span>
                <h3>{selectedActivity.action}</h3>
              </div>
              <button className="cdp-ra-modal-close" onClick={() => setSelectedActivity(null)}>✕</button>
            </div>

            <div className="cdp-ra-modal-body">
              {/* Full Description */}
              <div className="cdp-ra-modal-section">
                <h4>📝 {t('recent_activity.modal_activity_desc')}</h4>
                <p className="cdp-ra-modal-full-desc">{selectedActivity.description}</p>
              </div>

              {/* Context Grid */}
              <div className="cdp-ra-modal-section">
                <h4>ℹ️ {t('recent_activity.modal_session_details')}</h4>
                <div className="cdp-ra-context-grid">
                  <div className="cdp-ra-context-item">
                    <span>{t('recent_activity.modal_timestamp')}</span>
                    <b className="cdp-ra-mono">{selectedActivity.timestamp}</b>
                  </div>
                  <div className="cdp-ra-context-item">
                    <span>{t('recent_activity.modal_device')}</span>
                    <b>{selectedActivity.device}</b>
                  </div>
                  <div className="cdp-ra-context-item">
                    <span>{t('recent_activity.modal_execution_status')}</span>
                    <b className="cdp-ra-status-success">✓ {selectedActivity.status}</b>
                  </div>
                  <div className="cdp-ra-context-item">
                    <span>{t('recent_activity.modal_related_complaint')}</span>
                    <b className="cdp-ra-mono">{selectedActivity.complaintNumber || t('recent_activity.modal_none')}</b>
                  </div>
                </div>
              </div>
            </div>

            <div className="cdp-ra-modal-footer">
              <button className="cdp-ra-modal-close-btn" onClick={() => setSelectedActivity(null)}>
                {t('recent_activity.modal_close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecentActivity;