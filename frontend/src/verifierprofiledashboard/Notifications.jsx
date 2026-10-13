import React, { useState, useMemo } from "react";
import "./Notifications.css";

const Notifications = ({ notifications, onBack, onMarkAsRead, onMarkAllRead }) => {
  const [selectedNotif, setSelectedNotif] = useState(null);
  const [filterCategory, setFilterCategory] = useState("All");

  // Helper to get badge colors based on category
  const getCategoryStyle = (category) => {
    switch (category) {
      case "Work Submitted": return "type-submitted";
      case "Verification Required": return "type-verification";
      case "Reassignment": return "type-reassignment";
      case "Pending Reminder": return "type-reminder";
      default: return "type-general";
    }
  };

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    if (filterCategory === "All") return notifications;
    return notifications.filter((n) => n.category === filterCategory);
  }, [notifications, filterCategory]);

  const handleMarkRead = (id) => {
    if (onMarkAsRead) onMarkAsRead(id);
    setSelectedNotif(null);
  };

  return (
    <div className="notif-shell">
      {/* Header */}
      <div className="notif-header">
        <button className="notif-back-btn" onClick={onBack}>← Back to Dashboard</button>
        <h2>🔔 Notifications Center</h2>
      </div>

      <div className="notif-container">
        {/* Summary Stats */}
        <div className="notif-stats">
          <div className="notif-stat-card">
            <span className="notif-stat-num">{notifications.filter((n) => !n.isRead).length}</span>
            <span className="notif-stat-label">Unread</span>
          </div>
          <div className="notif-stat-card">
            <span className="notif-stat-num">{notifications.filter((n) => n.category === "Work Submitted").length}</span>
            <span className="notif-stat-label">Work Submitted</span>
          </div>
          <div className="notif-stat-card">
            <span className="notif-stat-num">{notifications.filter((n) => n.category === "Pending Reminder").length}</span>
            <span className="notif-stat-label">Pending Reminders</span>
          </div>
        </div>

        {/* Filters */}
        <div className="notif-filters">
          {["All", "Work Submitted", "Verification Required", "Reassignment", "Pending Reminder"].map((cat) => (
            <button
              key={cat}
              className={`notif-filter-btn ${filterCategory === cat ? "active" : ""}`}
              onClick={() => setFilterCategory(cat)}
            >
              {cat}
            </button>
          ))}
          <button className="notif-mark-all-btn" onClick={onMarkAllRead}>
            ✓ Mark All as Read
          </button>
        </div>

        {/* Notifications Table */}
        <div className="notif-table-container">
          {filteredNotifications.length === 0 ? (
            <div className="notif-empty-state">
              <div className="notif-empty-icon">📭</div>
              <h4>No Notifications Found</h4>
              <p>Try changing your filter or check back later.</p>
            </div>
          ) : (
            <table className="notif-table">
              <thead>
                <tr>
                  <th style={{ width: "40px" }}></th>
                  <th>Time</th>
                  <th>Category</th>
                  <th>Complaint No.</th>
                  <th>Notification</th>
                  <th>Status</th>
                  <th style={{ width: "120px" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredNotifications.map((notif) => (
                  <tr 
                    key={notif.id} 
                    className={`notif-row ${!notif.isRead ? "notif-unread" : ""}`}
                    onClick={() => setSelectedNotif(notif)}
                  >
                    <td>
                      {!notif.isRead && <span className="notif-unread-dot"></span>}
                    </td>
                    <td className="notif-mono">{notif.time}</td>
                    <td>
                      <span className={`notif-type-badge ${getCategoryStyle(notif.category)}`}>
                        {notif.category}
                      </span>
                    </td>
                    <td className="notif-mono notif-link">{notif.complaintNumber}</td>
                    <td className="notif-message">{notif.title}</td>
                    <td>
                      <span className={`notif-status-badge ${notif.isRead ? "status-read" : "status-unread"}`}>
                        {notif.isRead ? "Read" : "Unread"}
                      </span>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <button className="notif-view-btn" onClick={() => setSelectedNotif(notif)}>
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

      {/* ✅ OVERLAY MODAL for Notification Details */}
      {selectedNotif && (
        <div className="notif-modal-overlay" onClick={() => setSelectedNotif(null)}>
          <div className="notif-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="notif-modal-header">
              <div>
                <span className={`notif-modal-badge ${getCategoryStyle(selectedNotif.category)}`}>
                  {selectedNotif.category.toUpperCase()}
                </span>
                <h3>{selectedNotif.title}</h3>
              </div>
              <button className="notif-modal-close" onClick={() => setSelectedNotif(null)}>✕</button>
            </div>

            <div className="notif-modal-body">
              <div className="notif-modal-info-grid">
                <div className="notif-info-item">
                  <span>Complaint Number</span>
                  <b className="notif-mono">{selectedNotif.complaintNumber}</b>
                </div>
                <div className="notif-info-item">
                  <span>Received At</span>
                  <b>{selectedNotif.time}</b>
                </div>
                <div className="notif-info-item">
                  <span>Read Status</span>
                  <b>{selectedNotif.isRead ? "✅ Read" : "🔴 Unread"}</b>
                </div>
              </div>

              <div className="notif-modal-section">
                <span className="notif-section-label">Full Message</span>
                <p className="notif-modal-message">{selectedNotif.message}</p>
              </div>
            </div>

            <div className="notif-modal-footer">
              {!selectedNotif.isRead && (
                <button className="notif-modal-action-btn" onClick={() => handleMarkRead(selectedNotif.id)}>
                  ✓ Mark as Read
                </button>
              )}
              <button className="notif-modal-close-btn" onClick={() => setSelectedNotif(null)}>
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