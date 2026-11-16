import React, { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next"; // ✅ ADDED
import "./Notifications.css";
import { fetchDashboard, getStoredUser, getUserId, toMediaUrl } from "../utils/dashboardApi";

// ⚠️ KEEP IN ENGLISH: Used for internal logic/status mapping
const typeBadgeMap = {
  "Registered": "navy",
  "Complaint Registered": "navy",
  "Verified": "amber",
  "Complaint Verified": "amber",
  "Assigned": "orange",
  "Staff Assigned": "orange",
  "Action Initiated": "orange",
  "Work Completed": "amber",
  "Complaint Status Updated": "orange",
  "Resolved/Closed": "green",
  "Complaint Resolved": "green",
};

const typeFilterMap = {
  Registered: ["Registered", "Complaint Registered"],
  Verified: ["Verified", "Complaint Verified"],
  Assigned: ["Assigned", "Staff Assigned"],
  "Action Initiated": ["Action Initiated"],
  "Work Completed": ["Work Completed"],
  "Status Updated": ["Complaint Status Updated"],
  "Resolved/Closed": ["Resolved/Closed", "Complaint Resolved"],
};

const isResolutionNotification = (notification) =>
  ["Complaint Resolved", "Resolved/Closed"].includes(notification.type) ||
  (notification.type === "Complaint Status Updated" &&
    /\b(resolved|closed)\b/i.test(notification.message || ""));

const Notifications = ({ onBack }) => {
  const { t } = useTranslation(); // ✅ ADDED

  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    fetchDashboard("citizen", getUserId(getStoredUser()))
      .then(({ notifications: loaded = [] }) => setNotifications(loaded.map((notification) => ({
        ...notification,
        complaintNumber: notification.complaintNumber || "",
        title: notification.title || notification.type,
        date: notification.createdAt ? new Date(notification.createdAt).toLocaleString() : notification.time,
        details: notification.details || { category: "", issue: "", location: "" },
        photos: notification.photos || {},
      }))))
      .catch((error) => console.error("Failed to load citizen notifications:", error));
  }, []);

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      const matchesSearch =
        (n.complaintNumber || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (n.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (n.message || "").toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = filterType === "All" || typeFilterMap[filterType]?.includes(n.type);
      return matchesSearch && matchesType;
    });
  }, [notifications, searchTerm, filterType]);

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") setSelectedNotification(null);
    };
    if (selectedNotification) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "auto";
    };
  }, [selectedNotification]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="cdp-notif-page">
      {/* Header */}
      <div className="cdp-notif-header">
        <button className="cdp-back-btn" onClick={onBack}>← {t('notifications.back_to_dashboard')}</button>
        <h1>{t('notifications.title')}</h1>
      </div>

      <div className="cdp-notif-content">
        <p className="cdp-notif-subtitle">
          {t('notifications.subtitle', { count: unreadCount })}
        </p>

        {/* Search and Filter Bar */}
        <div className="cdp-notif-controls">
          <div className="cdp-notif-search">
            <span className="cdp-notif-search-icon">🔍</span>
            <input
              type="text"
              placeholder={t('notifications.search_placeholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="cdp-notif-filter">
            <label>{t('notifications.filter_label')}:</label>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="All">{t('notifications.filter_all')}</option>
              <option value="Registered">{t('notifications.filter_registered')}</option>
              <option value="Verified">{t('notifications.filter_verified')}</option>
              <option value="Assigned">{t('notifications.filter_assigned')}</option>
              <option value="Action Initiated">{t('notifications.filter_action_initiated')}</option>
              <option value="Work Completed">{t('notifications.filter_work_completed')}</option>
              <option value="Status Updated">{t('notifications.filter_status_updated')}</option>
              <option value="Resolved/Closed">{t('notifications.filter_resolved_closed')}</option>
            </select>
          </div>
        </div>

        {/* Notifications Table */}
        <div className="cdp-notif-table-container">
          {filteredNotifications.length === 0 ? (
            <div className="cdp-notif-empty-state">
              <div className="cdp-notif-empty-icon">🔔</div>
              <h4>{t('notifications.empty_title')}</h4>
              <p>{t('notifications.empty_desc')}</p>
            </div>
          ) : (
            <table className="cdp-notif-table">
              <thead>
                <tr>
                  <th>{t('notifications.col_status')}</th>
                  <th>{t('notifications.col_complaint_no')}</th>
                  <th>{t('notifications.col_message')}</th>
                  <th>{t('notifications.col_datetime')}</th>
                  <th>{t('notifications.col_action')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredNotifications.map((n) => (
                  <tr key={n.id} className={`cdp-notif-row ${!n.isRead ? "cdp-notif-unread" : ""}`}>
                    <td>
                      <span className={`cdp-notif-badge cdp-notif-badge-${typeBadgeMap[n.type]}`}>
                        {n.type}
                      </span>
                    </td>
                    <td className="cdp-notif-mono">{n.complaintNumber}</td>
                    <td className="cdp-notif-message">
                      {!n.isRead && <span className="cdp-notif-unread-dot"></span>}
                      {n.title}: {n.message}
                    </td>
                    <td className="cdp-notif-mono">{n.date}</td>
                    <td>
                      <button 
                        className="cdp-notif-view-btn"
                        onClick={() => setSelectedNotification(n)}
                      >
                        {t('notifications.view_details')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ✅ OVERLAY MODAL for Complete Notification Details */}
      {selectedNotification && (
        <div className="cdp-notif-modal-overlay" onClick={() => setSelectedNotification(null)}>
          <div className="cdp-notif-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="cdp-notif-modal-header">
              <div>
                <span className={`cdp-notif-modal-badge cdp-notif-badge-${typeBadgeMap[selectedNotification.type]}`}>
                  {selectedNotification.type}
                </span>
                <h3>{selectedNotification.title}</h3>
              </div>
              <button className="cdp-notif-modal-close" onClick={() => setSelectedNotification(null)}>✕</button>
            </div>

            <div className="cdp-notif-modal-body">
              {/* Full Message */}
              <div className="cdp-notif-modal-section">
                <h4>📢 {t('notifications.modal_message_title')}</h4>
                <p className="cdp-notif-modal-full-message">{selectedNotification.message}</p>
              </div>

              {/* Complaint Details Context */}
              <div className="cdp-notif-modal-section">
                <h4>ℹ️ {t('notifications.modal_related_details')}</h4>
                <div className="cdp-notif-context-grid">
                  <div className="cdp-notif-context-item">
                    <span>{t('notifications.modal_complaint_no')}</span>
                    <b className="cdp-notif-mono">{selectedNotification.complaintNumber}</b>
                  </div>
                  <div className="cdp-notif-context-item">
                    <span>{t('notifications.modal_category')}</span>
                    <b>{selectedNotification.details.category}</b>
                  </div>
                  <div className="cdp-notif-context-item">
                    <span>{t('notifications.modal_specific_issue')}</span>
                    <b>{selectedNotification.details.issue}</b>
                  </div>
                  <div className="cdp-notif-context-item">
                    <span>{t('notifications.modal_location')}</span>
                    <b>📍 {selectedNotification.details.location}</b>
                  </div>
                </div>
              </div>

              {/* Photographic Evidence */}
              {(selectedNotification.photos?.before ||
                (isResolutionNotification(selectedNotification) && selectedNotification.photos?.after)) && (
                <div className="cdp-notif-modal-section">
                  <h4>📷 {t('notifications.modal_photo_evidence')}</h4>
                  <div className="cdp-notif-photo-grid">
                    {selectedNotification.photos.before && (
                      <div className="cdp-notif-photo-card">
                        <span className="cdp-notif-photo-label">{t('notifications.photo_before')}</span>
                        <img className="cdp-notif-photo-image" src={toMediaUrl(selectedNotification.photos.before)} alt={t('notifications.photo_before')} />
                      </div>
                    )}
                    {isResolutionNotification(selectedNotification) && selectedNotification.photos?.after && (
                      <div className="cdp-notif-photo-card">
                        <span className="cdp-notif-photo-label">{t('notifications.photo_after')}</span>
                        <img className="cdp-notif-photo-image" src={toMediaUrl(selectedNotification.photos.after)} alt={t('notifications.photo_after')} />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Timestamp */}
              <div className="cdp-notif-modal-section">
                <h4>🕘 {t('notifications.modal_sent_title')}</h4>
                <p className="cdp-notif-timestamp">{selectedNotification.date}</p>
              </div>
            </div>

            <div className="cdp-notif-modal-footer">
              <button className="cdp-notif-modal-close-btn" onClick={() => setSelectedNotification(null)}>
                {t('notifications.modal_close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;