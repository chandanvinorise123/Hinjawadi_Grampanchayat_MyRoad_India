import React, { useState, useMemo, useEffect, useRef } from "react";
import "./Notifications.css";

const Notifications = ({ notifications, onBack, onMarkAsRead, onMarkAllRead }) => {
  const [filterType, setFilterType] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [selectedNotif, setSelectedNotif] = useState(null);
  const modalRef = useRef(null);

  // Notification Type Config
  const typeConfig = {
    "New Assignment": { icon: "", color: "notif-navy", label: "NEW ASSIGNMENT" },
    "Critical Priority": { icon: "🚨", color: "notif-red", label: "CRITICAL PRIORITY" },
    "Reassignment": { icon: "🔄", color: "notif-purple", label: "REASSIGNMENT" },
    "Pending Reminder": { icon: "⏰", color: "notif-amber", label: "PENDING REMINDER" },
    "Verification Required": { icon: "✅", color: "notif-green", label: "VERIFICATION REQUIRED" },
  };

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") setSelectedNotif(null);
    };
    if (selectedNotif) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "auto";
    };
  }, [selectedNotif]);

  // Close modal when clicking outside
  const handleBackdropClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      setSelectedNotif(null);
    }
  };

  // 1. Overview Stats
  const stats = useMemo(() => ({
    total: notifications.length,
    unread: notifications.filter((n) => !n.isRead).length,
    critical: notifications.filter((n) => n.type === "Critical Priority").length,
    pending: notifications.filter((n) => n.type === "Pending Reminder").length,
  }), [notifications]);

  // 2. Filtered Notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      const matchesType = filterType === "All" || n.type === filterType;
      const matchesStatus =
        filterStatus === "All" ||
        (filterStatus === "Unread" && !n.isRead) ||
        (filterStatus === "Read" && n.isRead);
      return matchesType && matchesStatus;
    });
  }, [notifications, filterType, filterStatus]);

  const handleMarkRead = (id) => {
    if (onMarkAsRead) onMarkAsRead(id);
    setSelectedNotif(null);
  };

  const handleMarkAllRead = () => {
    if (onMarkAllRead) onMarkAllRead();
  };

  return (
    <div className="nt-shell">
      {/* Header */}
      <div className="nt-header">
        <button className="nt-back-btn" onClick={onBack}>
          ← Back to Dashboard
        </button>
        <h2>🔔 Notifications Center</h2>
      </div>

      <div className="nt-container">
        {/* 1. Stats Row */}
        <div className="nt-stats-row">
          <div className="nt-stat-card nt-stat-navy">
            <div className="nt-stat-icon">📬</div>
            <div className="nt-stat-info">
              <div className="nt-stat-num">{stats.total}</div>
              <div className="nt-stat-label">Total Notifications</div>
            </div>
          </div>
          <div className="nt-stat-card nt-stat-red">
            <div className="nt-stat-icon"></div>
            <div className="nt-stat-info">
              <div className="nt-stat-num">{stats.unread}</div>
              <div className="nt-stat-label">Unread</div>
            </div>
          </div>
          <div className="nt-stat-card nt-stat-amber">
            <div className="nt-stat-icon">🚨</div>
            <div className="nt-stat-info">
              <div className="nt-stat-num">{stats.critical}</div>
              <div className="nt-stat-label">Critical Alerts</div>
            </div>
          </div>
          <div className="nt-stat-card nt-stat-orange">
            <div className="nt-stat-icon">⏰</div>
            <div className="nt-stat-info">
              <div className="nt-stat-num">{stats.pending}</div>
              <div className="nt-stat-label">Pending Reminders</div>
            </div>
          </div>
        </div>

        {/* 2. Controls: Filters + Actions */}
        <div className="nt-controls">
          <div className="nt-filter-group">
            <span className="nt-filter-label">Type:</span>
            <div className="nt-filter-buttons">
              {["All", "New Assignment", "Critical Priority", "Reassignment", "Pending Reminder", "Verification Required"].map((type) => (
                <button
                  key={type}
                  className={`nt-filter-btn ${filterType === type ? "active" : ""}`}
                  onClick={() => setFilterType(type)}
                >
                  {type === "All" ? "All Types" : type}
                </button>
              ))}
            </div>
          </div>

          <div className="nt-filter-group">
            <span className="nt-filter-label">Status:</span>
            <div className="nt-filter-buttons">
              {["All", "Unread", "Read"].map((status) => (
                <button
                  key={status}
                  className={`nt-filter-btn nt-status-btn ${filterStatus === status ? "active" : ""}`}
                  onClick={() => setFilterStatus(status)}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <button className="nt-mark-all-btn" onClick={handleMarkAllRead}>
            ✓ Mark All as Read
          </button>
        </div>

        {/* 3. Notifications Table */}
        <div className="nt-table-card">
          <div className="nt-table-header">
            <h3>Notification Log</h3>
            <span className="nt-table-count">{filteredNotifications.length} notification(s)</span>
          </div>

          <div className="nt-table-wrap">
            {filteredNotifications.length === 0 ? (
              <div className="nt-empty-state">
                <div className="nt-empty-icon">📭</div>
                <h4>No Notifications Found</h4>
                <p>Try changing your filters or check back later.</p>
              </div>
            ) : (
              <table className="nt-table">
                <thead>
                  <tr>
                    <th style={{ width: "40px" }}></th>
                    <th>Date / Time</th>
                    <th>Type</th>
                    <th>Complaint No.</th>
                    <th>Message</th>
                    <th>Status</th>
                    <th style={{ width: "120px" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredNotifications.map((notif) => {
                    const config = typeConfig[notif.type] || typeConfig["New Assignment"];
                    return (
                      <tr
                        key={notif.id}
                        className={`nt-row ${!notif.isRead ? "nt-unread" : ""}`}
                        onClick={() => setSelectedNotif(notif)}
                      >
                        <td>
                          {!notif.isRead && <span className="nt-unread-dot"></span>}
                        </td>
                        <td className="nt-mono">{notif.time}</td>
                        <td>
                          <span className={`nt-type-badge ${config.color}`}>
                            <span className="nt-type-icon">{config.icon}</span>
                            {config.label}
                          </span>
                        </td>
                        <td className="nt-mono nt-complaint-link">{notif.complaintNumber || "-"}</td>
                        <td className="nt-message">{notif.text}</td>
                        <td>
                          <span className={`nt-status-badge ${notif.isRead ? "nt-read" : "nt-unread-status"}`}>
                            {notif.isRead ? "Read" : "Unread"}
                          </span>
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          {!notif.isRead && (
                            <button
                              className="nt-mark-read-btn"
                              onClick={() => handleMarkRead(notif.id)}
                            >
                              Mark Read
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* ✅ OVERLAY MODAL - Matches the reference image design */}
      {selectedNotif && (
        <div className="nt-modal-overlay" onClick={handleBackdropClick}>
          <div className="nt-modal-content" ref={modalRef}>
            {/* Modal Header with Type Badge */}
            <div className="nt-modal-header">
              <div className="nt-modal-header-left">
                <span className={`nt-modal-type-badge ${typeConfig[selectedNotif.type]?.color || "notif-navy"}`}>
                  <span className="nt-modal-type-icon">
                    {typeConfig[selectedNotif.type]?.icon || "📋"}
                  </span>
                  {typeConfig[selectedNotif.type]?.label || "NOTIFICATION"}
                </span>
              </div>
              <button
                className="nt-modal-close-btn"
                onClick={() => setSelectedNotif(null)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {/* Modal Title */}
            <div className="nt-modal-title-section">
              <h3>{selectedNotif.text}</h3>
            </div>

            {/* Modal Body */}
            <div className="nt-modal-body">
              {/* 3-Column Info Row */}
              <div className="nt-modal-info-row">
                <div className="nt-modal-info-item">
                  <span className="nt-modal-label">Complaint Number</span>
                  <b className="nt-mono">{selectedNotif.complaintNumber || "N/A"}</b>
                </div>
                <div className="nt-modal-info-item">
                  <span className="nt-modal-label">Received At</span>
                  <b>{selectedNotif.time}</b>
                </div>
                <div className="nt-modal-info-item">
                  <span className="nt-modal-label">Read Status</span>
                  <b className="nt-read-status-display">
                    {selectedNotif.isRead ? "✅ Read" : "🔴 Unread"}
                  </b>
                </div>
              </div>

              {/* Full Message Section */}
              <div className="nt-modal-message-section">
                <span className="nt-modal-label">Full Message</span>
                <div className="nt-modal-message-box">
                  {selectedNotif.text}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="nt-modal-footer">
              {!selectedNotif.isRead && (
                <button
                  className="nt-modal-action-btn nt-modal-mark-read"
                  onClick={() => handleMarkRead(selectedNotif.id)}
                >
                  ✓ Mark as Read
                </button>
              )}
              <button
                className="nt-modal-action-btn nt-modal-close-footer"
                onClick={() => setSelectedNotif(null)}
              >
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