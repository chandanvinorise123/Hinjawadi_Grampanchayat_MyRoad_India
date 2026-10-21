import React, { useState, useMemo, useEffect, useRef } from "react";
import "./Notifications.css";
import StaffComplaintDetails from "./StaffComplaintDetails";

const formatNotificationTime = (value) => {
  if (!value) return "Time not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
};

const Notifications = ({
  notifications = [],
  initialSelectedNotification = null,
  onInitialSelectionHandled,
  onBack,
  onMarkAsRead,
  onMarkAllRead,
}) => {
  const [filterType, setFilterType] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [selectedNotif, setSelectedNotif] = useState(initialSelectedNotification);
  const [actionError, setActionError] = useState("");
  const modalRef = useRef(null);

  // Notification Type Config
  const typeConfig = {
    "New Assignment": { icon: "🗂️", color: "notif-navy", label: "NEW ASSIGNMENT" },
    "Staff Assigned": { icon: "👷", color: "notif-purple", label: "STAFF ASSIGNED" },
    "Work Updated": { icon: "🛠️", color: "notif-green", label: "WORK UPDATED" },
    "Work Completed": { icon: "✅", color: "notif-green", label: "WORK COMPLETED" },
    "Complaint Registered": { icon: "📝", color: "notif-navy", label: "COMPLAINT REGISTERED" },
    "Complaint Status Updated": { icon: "🔔", color: "notif-amber", label: "STATUS UPDATED" },
    "Verifier Decision": { icon: "🔎", color: "notif-amber", label: "VERIFIER DECISION" },
    "Critical Priority": { icon: "🚨", color: "notif-red", label: "CRITICAL PRIORITY" },
    "Reassignment": { icon: "🔄", color: "notif-purple", label: "REASSIGNMENT" },
    "Pending Reminder": { icon: "⏰", color: "notif-amber", label: "PENDING REMINDER" },
    "Verification Required": { icon: "✅", color: "notif-green", label: "VERIFICATION REQUIRED" },
    "Verification Rejected": { icon: "❌", color: "notif-red", label: "CORRECTION REQUESTED" },
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

  useEffect(() => {
    if (initialSelectedNotification) onInitialSelectionHandled?.();
  }, [initialSelectedNotification, onInitialSelectionHandled]);

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
    }).sort((first, second) => {
      const firstTime = new Date(first.time || 0).getTime();
      const secondTime = new Date(second.time || 0).getTime();
      return (Number.isFinite(secondTime) ? secondTime : 0) -
        (Number.isFinite(firstTime) ? firstTime : 0);
    });
  }, [notifications, filterType, filterStatus]);

  const notificationTypes = useMemo(
    () => ["All", ...new Set(notifications.map((notification) => notification.type).filter(Boolean))],
    [notifications]
  );

  const handleMarkRead = async (id) => {
    setActionError("");
    try {
      await onMarkAsRead?.(id);
      setSelectedNotif(null);
    } catch (error) {
      setActionError(error.message || "Unable to update notification.");
    }
  };

  const handleMarkAllRead = async () => {
    setActionError("");
    try {
      await onMarkAllRead?.();
    } catch (error) {
      setActionError(error.message || "Unable to update notifications.");
    }
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
        {actionError && <p role="alert" className="nt-action-error">{actionError}</p>}
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
              {notificationTypes.map((type) => (
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
                    const config = typeConfig[notif.type] || {
                      icon: "📋",
                      color: "notif-navy",
                      label: String(notif.type || "NOTIFICATION").toUpperCase(),
                    };
                    return (
                      <tr
                        key={notif.id}
                        className={`nt-row ${!notif.isRead ? "nt-unread" : ""}`}
                        onClick={() => setSelectedNotif(notif)}
                      >
                        <td>
                          {!notif.isRead && <span className="nt-unread-dot"></span>}
                        </td>
                        <td className="nt-mono">{formatNotificationTime(notif.time)}</td>
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
                          <button
                            className="nt-view-details-btn"
                            type="button"
                            onClick={() => setSelectedNotif(notif)}
                          >
                            View Details
                          </button>
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
                  {typeConfig[selectedNotif.type]?.label || String(selectedNotif.type || "NOTIFICATION").toUpperCase()}
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
              <div className="nt-detail-layout">
                <section className="nt-detail-panel" aria-label="Complaint information">
                  <header className="nt-detail-panel-heading">
                    <span className="nt-detail-eyebrow">Related report</span>
                    <h4>Complaint Information</h4>
                  </header>
                  <div className="nt-detail-panel-content">
                    {selectedNotif.complaint ? (
                      <StaffComplaintDetails
                        complaint={selectedNotif.complaint}
                        layout="complaint-only"
                        showMap={false}
                        showActivity={false}
                      />
                    ) : (
                      <p className="nt-detail-empty">
                        No linked complaint details are available for this notification.
                      </p>
                    )}
                  </div>
                </section>

                <section className="nt-detail-panel" aria-label="Notification information">
                  <header className="nt-detail-panel-heading">
                    <span className="nt-detail-eyebrow">Alert details</span>
                    <h4>Notification Information</h4>
                  </header>
                  <div className="nt-detail-panel-content">
                    <dl className="nt-notification-facts">
                      <div>
                        <dt>Complaint Number</dt>
                        <dd className="nt-mono">{selectedNotif.complaintNumber || "N/A"}</dd>
                      </div>
                      <div>
                        <dt>Received At</dt>
                        <dd>{formatNotificationTime(selectedNotif.time)}</dd>
                      </div>
                      <div>
                        <dt>Read Status</dt>
                        <dd className="nt-read-status-display">
                          {selectedNotif.isRead ? "✅ Read" : "🔴 Unread"}
                        </dd>
                      </div>
                    </dl>
                    <div className="nt-modal-message-section">
                      <span className="nt-modal-label">Full Message</span>
                      <div className="nt-modal-message-box">
                        {selectedNotif.text || "No message provided."}
                      </div>
                    </div>
                  </div>
                </section>
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