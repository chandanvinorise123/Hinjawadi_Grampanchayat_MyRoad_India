import React, { useState, useMemo, useEffect } from "react";
import "./Notifications.css";
import { fetchDashboard, getStoredUser, getUserId } from "../utils/dashboardApi";

const typeBadgeMap = {
  "Registered": "navy",
  "Complaint Registered": "navy",
  "Verified": "amber",
  "Complaint Verified": "amber",
  "Assigned": "orange",
  "Staff Assigned": "orange",
  "Action Initiated": "orange",
  "Work Completed": "amber",
  "Resolved/Closed": "green",
  "Complaint Resolved": "green",
};

const typeFilterMap = {
  Registered: ["Registered", "Complaint Registered"],
  Verified: ["Verified", "Complaint Verified"],
  Assigned: ["Assigned", "Staff Assigned"],
  "Action Initiated": ["Action Initiated"],
  "Work Completed": ["Work Completed"],
  "Resolved/Closed": ["Resolved/Closed", "Complaint Resolved"],
};

const Notifications = ({ onBack }) => {
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
        n.complaintNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.message.toLowerCase().includes(searchTerm.toLowerCase());
      
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
        <button className="cdp-back-btn" onClick={onBack}>← Back to Dashboard</button>
        <h1>Notifications</h1>
      </div>

      <div className="cdp-notif-content">
        <p className="cdp-notif-subtitle">
          Stay updated on your complaint's progress. You have <strong>{unreadCount} unread</strong> notification(s).
        </p>

        {/* Search and Filter Bar */}
        <div className="cdp-notif-controls">
          <div className="cdp-notif-search">
            <span className="cdp-notif-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by complaint number or message..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="cdp-notif-filter">
            <label>Stage:</label>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="All">All Stages</option>
              <option value="Registered">Registered</option>
              <option value="Verified">Verified</option>
              <option value="Assigned">Assigned</option>
              <option value="Action Initiated">Action Initiated</option>
              <option value="Work Completed">Work Completed</option>
              <option value="Resolved/Closed">Resolved/Closed</option>
            </select>
          </div>
        </div>

        {/* Notifications Table */}
        <div className="cdp-notif-table-container">
          {filteredNotifications.length === 0 ? (
            <div className="cdp-notif-empty-state">
              <div className="cdp-notif-empty-icon">🔔</div>
              <h4>No Notifications Found</h4>
              <p>Try adjusting your search or filter criteria.</p>
            </div>
          ) : (
            <table className="cdp-notif-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Complaint No.</th>
                  <th>Notification Message</th>
                  <th>Date & Time</th>
                  <th>Action</th>
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
                <h4>📢 Notification Message</h4>
                <p className="cdp-notif-modal-full-message">{selectedNotification.message}</p>
              </div>

              {/* Complaint Details Context */}
              <div className="cdp-notif-modal-section">
                <h4>ℹ️ Related Complaint Details</h4>
                <div className="cdp-notif-context-grid">
                  <div className="cdp-notif-context-item">
                    <span>Complaint Number</span>
                    <b className="cdp-notif-mono">{selectedNotification.complaintNumber}</b>
                  </div>
                  <div className="cdp-notif-context-item">
                    <span>Category</span>
                    <b>{selectedNotification.details.category}</b>
                  </div>
                  <div className="cdp-notif-context-item">
                    <span>Specific Issue</span>
                    <b>{selectedNotification.details.issue}</b>
                  </div>
                  <div className="cdp-notif-context-item">
                    <span>Location</span>
                    <b>📍 {selectedNotification.details.location}</b>
                  </div>
                </div>
              </div>

              {/* ✅ NEW: Photographic Evidence (Before/After/Site) */}
              {(selectedNotification.photos?.before || selectedNotification.photos?.after || selectedNotification.photos?.site) && (
                <div className="cdp-notif-modal-section">
                  <h4>📷 Photographic Evidence</h4>
                  <div className="cdp-notif-photo-grid">
                    {selectedNotification.photos.before && (
                      <div className="cdp-notif-photo-card">
                        <span className="cdp-notif-photo-label">Before Repair</span>
                        <div className="cdp-notif-photo-placeholder">📷 {selectedNotification.photos.before}</div>
                      </div>
                    )}
                    {selectedNotification.photos.site && (
                      <div className="cdp-notif-photo-card">
                        <span className="cdp-notif-photo-label">After Repair</span>
                        <div className="cdp-notif-photo-placeholder">📷 {selectedNotification.photos.site}</div>
                      </div>
                    )}
                    {selectedNotification.photos.after && (
                      <div className="cdp-notif-photo-card">
                        <span className="cdp-notif-photo-label">After Repair</span>
                        <div className="cdp-notif-photo-placeholder">📷 {selectedNotification.photos.after}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Timestamp */}
              <div className="cdp-notif-modal-section">
                <h4>🕘 Notification Sent</h4>
                <p className="cdp-notif-timestamp">{selectedNotification.date}</p>
              </div>
            </div>

            <div className="cdp-notif-modal-footer">
              <button className="cdp-notif-modal-close-btn" onClick={() => setSelectedNotification(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;