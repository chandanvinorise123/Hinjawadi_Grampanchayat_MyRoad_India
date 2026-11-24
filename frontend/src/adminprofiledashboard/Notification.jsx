import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next"; // ✅ ADDED
import "./Notification.css";
import { API_BASE_URL } from "../utils/dashboardApi";

const NotificationMonitoring = ({
  onBack,
  onOpenComplaint,
  initialNotification = null,
}) => {
  const { t } = useTranslation(); // ✅ ADDED
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNotif, setSelectedNotif] = useState(initialNotification);
  const [filterType, setFilterType] = useState("All");

  // ✅ Helper to translate notification types while keeping internal logic intact
  const getTypeLabel = (type) => {
    const map = {
      "Complaint Registered": t('notification_monitoring.type_complaint_registered'),
      "Complaint Verified": t('notification_monitoring.type_complaint_verified'),
      "Staff Assigned": t('notification_monitoring.type_staff_assigned'),
      "Action Initiated": t('notification_monitoring.type_action_initiated'),
      "Work Completed": t('notification_monitoring.type_work_completed'),
      "Complaint Resolved": t('notification_monitoring.type_complaint_resolved'),
      "Complaint Closed": t('notification_monitoring.type_complaint_closed'),
      "Rework Required": t('notification_monitoring.type_rework_required'),
    };
    return map[type] || type;
  };

  // Fetch notifications dynamically from backend
  useEffect(() => {
    let active = true;
    const fetchNotifications = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_BASE_URL}/notifications`, {
          headers: {
            "Content-Type": "application/json",
            "Authorization": token ? `Bearer ${token}` : "",
          },
        });
        const data = await response.json();
        
        if (response.ok && data.success) {
          const normalized = data.notifications.map((n) => ({
            ...n,
            id: n.id || n._id,
          }));
          if (active) setNotifications(normalized);
        } else {
          if (active) console.error("Failed to fetch notifications:", data.message);
        }
      } catch (err) {
        if (active) console.error("Fetch error:", err);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchNotifications();
    const refreshTimer = window.setInterval(fetchNotifications, 30000);
    return () => {
      active = false;
      window.clearInterval(refreshTimer);
    };
  }, [t]);

  // Filter notifications by type
  const filteredNotifications = filterType === "All" 
    ? notifications 
    : notifications.filter((n) => n.type === filterType);

  const notificationTypes = ["All", ...new Set(notifications.map((n) => n.type))];

  const getToneClass = (type) => {
    const tones = {
      "Complaint Registered": "navy",
      "Complaint Verified": "amber",
      "Staff Assigned": "orange",
      "Action Initiated": "orange",
      "Work Completed": "green",
      "Complaint Resolved": "green",
      "Complaint Closed": "green",
      "Rework Required": "red",
    };
    return tones[type] || "navy";
  };

  const getShortMessage = (notif) => {
    const shortMessages = {
      "Complaint Registered": "Complaint registered",
      "Complaint Verified": "Complaint verified",
      "Staff Assigned": "Staff assigned",
      "Action Initiated": "Action started",
      "Work Completed": "Work submitted",
      "Complaint Resolved": "Complaint resolved",
      "Complaint Closed": "Complaint closed",
      "Rework Required": "Correction required",
    };

    return shortMessages[notif.type] ||
      (notif.text || notif.message || "").replace(
        /^(.{0,42}).*$/,
        "$1"
      ).trim();
  };

  const getShortComplaintNumber = (complaintNumber) => {
    const value = String(complaintNumber || "").trim();
    return value;
  };

  // ✅ Updated to use browser's active locale for better i18n support
  const formatDate = (dateString) => {
    if (!dateString) return t('notification_monitoring.na');
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return t('notification_monitoring.na');
    return date.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const formatRelativeDate = (dateString) => {
    if (!dateString) return t('notification_monitoring.na');
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return t('notification_monitoring.na');

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const notificationDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayDifference = Math.round((today - notificationDay) / 86400000);
    const time = date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

    if (dayDifference <= 0) return `Today · ${time}`;
    if (dayDifference === 1) return `Yesterday · ${time}`;
    if (dayDifference < 7) return `${dayDifference} days ago · ${time}`;
    return date.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
  };

  if (loading) {
    return <div className="nm-full-page-loading">{t('notification_monitoring.loading')}</div>;
  }

  return (
    <div className="nm-full-page">
      <div className="nm-page-container">
        {/* Header */}
        <div className="nm-header">
          <div className="nm-header-info">
            <button className="nm-back-btn" onClick={onBack}>
              {t('notification_monitoring.back_to_dashboard')}
            </button>
            <div>
              <h2>{t('notification_monitoring.title')}</h2>
            </div>
          </div>
          <div className="nm-header-actions">
            <select 
              className="nm-filter-select"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              {notificationTypes.map((type) => (
                <option key={type} value={type}>
                  {type === "All" ? t('notification_monitoring.all_types') : getTypeLabel(type)}
                </option>
              ))}
            </select>
            <span className="nm-count-badge">{filteredNotifications.length} {t('notification_monitoring.total')}</span>
          </div>
        </div>

        {/* Table View */}
        <div className="nm-table-container">
          {filteredNotifications.length === 0 ? (
            <div className="nm-empty-state">
              <p>{t('notification_monitoring.empty_state')}</p>
            </div>
          ) : (
            <table className="nm-table">
              <thead>
                <tr>
                  <th>{t('notification_monitoring.col_date_time')}</th>
                  <th>{t('notification_monitoring.col_type')}</th>
                  <th>{t('notification_monitoring.col_message')}</th>
                  <th>{t('notification_monitoring.col_complaint_subject')}</th>
                  <th>{t('notification_monitoring.col_status')}</th>
                  <th>{t('notification_monitoring.col_action')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredNotifications.map((notif) => (
                  <tr key={notif.id} className={!notif.isRead ? "nm-unread" : ""}>
                    <td className="nm-mono" title={formatDate(notif.createdAt || notif.time)}>
                      {formatRelativeDate(notif.createdAt || notif.time)}
                    </td>
                    <td>
                      <span className={`nm-badge nm-badge-${getToneClass(notif.type)}`}>
                        {getTypeLabel(notif.type)}
                      </span>
                    </td>
                    <td className="nm-message-text">
                      {!notif.isRead && <span className="nm-unread-dot"></span>}
                      {notif.contactMessage?.subject
                        ? notif.contactMessage.subject
                        : getShortMessage(notif)}
                    </td>
                    <td className="nm-mono">
                      {notif.contactMessage ? (
                        notif.contactMessage.subject
                      ) : notif.complaintNumber ? (
                        <button
                          className="nm-complaint-link"
                          type="button"
                          onClick={() => onOpenComplaint?.(notif)}
                          title={t('notification_monitoring.open_complaint_details')}
                        >
                          {getShortComplaintNumber(notif.complaintNumber)}
                        </button>
                      ) : notif.complaintId || t('notification_monitoring.na')}
                    </td>
                    <td>
                      <span className={`nm-status ${notif.isRead ? "read" : "unread"}`}>
                        {notif.isRead ? t('notification_monitoring.status_read') : t('notification_monitoring.status_new')}
                      </span>
                    </td>
                    <td>
                      <button 
                        className="nm-view-btn"
                        onClick={() => setSelectedNotif(notif)}
                      >
                        {t('notification_monitoring.view_details')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Overlay Modal for Full Details */}
      {selectedNotif && (
        <div className="nm-modal-overlay" onClick={() => setSelectedNotif(null)}>
          <div className="nm-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="nm-modal-header">
              <div>
                <span className={`nm-badge nm-badge-${getToneClass(selectedNotif.type)}`}>
                  {getTypeLabel(selectedNotif.type)}
                </span>
                <h3>{t('notification_monitoring.modal_title')}</h3>
              </div>
              <button className="nm-modal-close" onClick={() => setSelectedNotif(null)}>✕</button>
            </div>

            <div className="nm-modal-body">
              <div className="nm-detail-section">
                <h4>{selectedNotif.contactMessage ? t('notification_monitoring.citizen_message') : t('notification_monitoring.full_message')}</h4>
                <p className="nm-full-message">
                  {selectedNotif.contactMessage?.message ||
                    selectedNotif.text ||
                    selectedNotif.message}
                </p>
              </div>

              <div className="nm-detail-grid">
                <div className="nm-detail-item">
                  <span>{t('notification_monitoring.date_time')}</span>
                  <b className="nm-mono">
                    {formatDate(selectedNotif.contactMessage?.createdAt || selectedNotif.createdAt || selectedNotif.time)}
                  </b>
                </div>
                {selectedNotif.contactMessage ? (
                  <>
                    <div className="nm-detail-item">
                      <span>{t('notification_monitoring.citizen_name')}</span>
                      <b>{selectedNotif.contactMessage.name}</b>
                    </div>
                    <div className="nm-detail-item">
                      <span>{t('notification_monitoring.email')}</span>
                      <b>{selectedNotif.contactMessage.email}</b>
                    </div>
                    <div className="nm-detail-item">
                      <span>{t('notification_monitoring.mobile')}</span>
                      <b>{selectedNotif.contactMessage.mobile}</b>
                    </div>
                    <div className="nm-detail-item">
                      <span>{t('notification_monitoring.subject')}</span>
                      <b>{selectedNotif.contactMessage.subject}</b>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="nm-detail-item">
                      <span>{t('notification_monitoring.complaint_number')}</span>
                      <b className="nm-mono">{selectedNotif.complaintNumber || t('notification_monitoring.na')}</b>
                    </div>
                  </>
                )}
                <div className="nm-detail-item">
                  <span>{t('notification_monitoring.read_status')}</span>
                  <b className={selectedNotif.isRead ? "nm-text-success" : "nm-text-warning"}>
                    {selectedNotif.isRead ? t('notification_monitoring.text_read') : t('notification_monitoring.text_unread')}
                  </b>
                </div>
              </div>
            </div>

            <div className="nm-modal-footer">
              {(selectedNotif.complaintId || selectedNotif.complaintNumber) && onOpenComplaint && (
                <button
                  className="nm-view-btn"
                  type="button"
                  onClick={() => {
                    setSelectedNotif(null);
                    onOpenComplaint(selectedNotif);
                  }}
                >
                  {t('notification_monitoring.view_complaint_details')}
                </button>
              )}
              <button className="nm-modal-close-btn" onClick={() => setSelectedNotif(null)}>
                {t('notification_monitoring.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationMonitoring;