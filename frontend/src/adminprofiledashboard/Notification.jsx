import React, { useState, useEffect } from "react";
import "./Notification.css";
import { API_BASE_URL } from "../utils/dashboardApi";

const NotificationMonitoring = ({ onBack, onOpenComplaint }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNotif, setSelectedNotif] = useState(null);
  const [filterType, setFilterType] = useState("All");

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
  }, []);

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

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "N/A";
    return date.toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  if (loading) {
    return <div className="nm-full-page-loading">Loading Notifications...</div>;
  }

  return (
    <div className="nm-full-page">
      <div className="nm-page-container">
        {/* Header */}
        <div className="nm-header">
          <div className="nm-header-info">
            <button className="nm-back-btn" onClick={onBack}>
              ← Back to Dashboard
            </button>
            <div>
              <h2>Notification Monitoring</h2>
              <p>MyRoad India · Admin Portal</p>
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
                  {type === "All" ? "All Types" : type}
                </option>
              ))}
            </select>
            <span className="nm-count-badge">{filteredNotifications.length} Total</span>
          </div>
        </div>

        {/* Table View */}
        <div className="nm-table-container">
          {filteredNotifications.length === 0 ? (
            <div className="nm-empty-state">
              <p>No notifications found for the selected filter.</p>
            </div>
          ) : (
            <table className="nm-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Type</th>
                  <th>Message</th>
                  <th>Complaint ID</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredNotifications.map((notif) => (
                  <tr key={notif.id} className={!notif.isRead ? "nm-unread" : ""}>
                    <td className="nm-mono">{formatDate(notif.createdAt || notif.time)}</td>
                    <td>
                      <span className={`nm-badge nm-badge-${getToneClass(notif.type)}`}>
                        {notif.type}
                      </span>
                    </td>
                    <td className="nm-message-text">
                      {!notif.isRead && <span className="nm-unread-dot"></span>}
                      {notif.text || notif.message}
                    </td>
                    <td className="nm-mono">
                      {notif.complaintNumber ? (
                        <button
                          className="nm-complaint-link"
                          type="button"
                          onClick={() => onOpenComplaint?.(notif)}
                          title="Open complaint details"
                        >
                          {notif.complaintNumber}
                        </button>
                      ) : notif.complaintId || "N/A"}
                    </td>
                    <td>
                      <span className={`nm-status ${notif.isRead ? "read" : "unread"}`}>
                        {notif.isRead ? "Read" : "New"}
                      </span>
                    </td>
                    <td>
                      <button 
                        className="nm-view-btn"
                        onClick={() => setSelectedNotif(notif)}
                      >
                        View Details
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
                  {selectedNotif.type}
                </span>
                <h3>Notification Details</h3>
              </div>
              <button className="nm-modal-close" onClick={() => setSelectedNotif(null)}>✕</button>
            </div>

            <div className="nm-modal-body">
              <div className="nm-detail-section">
                <h4>📢 Full Message</h4>
                <p className="nm-full-message">{selectedNotif.text || selectedNotif.message}</p>
              </div>

              <div className="nm-detail-grid">
                <div className="nm-detail-item">
                  <span>Date & Time</span>
                  <b className="nm-mono">{formatDate(selectedNotif.createdAt || selectedNotif.time)}</b>
                </div>
                <div className="nm-detail-item">
                  <span>Complaint Number</span>
                  <b className="nm-mono">{selectedNotif.complaintNumber || "N/A"}</b>
                </div>
                <div className="nm-detail-item">
                  <span>Complaint ID (Internal)</span>
                  <b className="nm-mono">{selectedNotif.complaintId || "N/A"}</b>
                </div>
                <div className="nm-detail-item">
                  <span>Recipient ID</span>
                  <b className="nm-mono">{selectedNotif.recipientId || "N/A"}</b>
                </div>
                <div className="nm-detail-item">
                  <span>Read Status</span>
                  <b className={selectedNotif.isRead ? "nm-text-success" : "nm-text-warning"}>
                    {selectedNotif.isRead ? "✓ Read" : "⚠ Unread"}
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
                  View Complaint Details
                </button>
              )}
              <button className="nm-modal-close-btn" onClick={() => setSelectedNotif(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationMonitoring;