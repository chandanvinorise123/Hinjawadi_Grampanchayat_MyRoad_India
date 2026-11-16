
import React, { useState, useMemo, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import "./Notifications.css";
import StaffComplaintDetails from "./StaffComplaintDetails";

const Notifications = ({
  notifications = [],
  initialSelectedNotification = null,
  onInitialSelectionHandled,
  onBack,
  onMarkAsRead,
  onMarkAllRead,
}) => {
  const { t, i18n } = useTranslation();

  const [filterType, setFilterType] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [selectedNotif, setSelectedNotif] = useState(
    initialSelectedNotification
  );
  const [actionError, setActionError] = useState("");
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const [markingReadId, setMarkingReadId] = useState(null);

  const modalRef = useRef(null);

  const language = (
    i18n.resolvedLanguage ||
    i18n.language ||
    "en"
  ).split("-")[0];

  const localeMap = {
    en: "en-IN",
    hi: "hi-IN",
    mr: "mr-IN",
  };

  const dateLocale = localeMap[language] || "en-IN";

  // Format notification dates using the selected language.
  const formatNotificationTime = (value) => {
    if (!value) {
      return t("notifications.timeNotRecorded");
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleString(dateLocale, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  // Notification type configuration.
  // Original type values are retained for filtering and backend compatibility.
  const typeConfig = {
    "New Assignment": {
      icon: "🗂️",
      color: "notif-navy",
      label: t("notifications.typeNewAssignment"),
    },
    "Staff Assigned": {
      icon: "👷",
      color: "notif-purple",
      label: t("notifications.typeStaffAssigned"),
    },
    "Work Updated": {
      icon: "🛠️",
      color: "notif-green",
      label: t("notifications.typeWorkUpdated"),
    },
    "Work Completed": {
      icon: "✅",
      color: "notif-green",
      label: t("notifications.typeWorkCompleted"),
    },
    "Complaint Registered": {
      icon: "📝",
      color: "notif-navy",
      label: t("notifications.typeComplaintRegistered"),
    },
    "Complaint Status Updated": {
      icon: "🔔",
      color: "notif-amber",
      label: t("notifications.typeStatusUpdated"),
    },
    "Verifier Decision": {
      icon: "🔎",
      color: "notif-amber",
      label: t("notifications.typeVerifierDecision"),
    },
    "Critical Priority": {
      icon: "🚨",
      color: "notif-red",
      label: t("notifications.typeCriticalPriority"),
    },
    Reassignment: {
      icon: "🔄",
      color: "notif-purple",
      label: t("notifications.typeReassignment"),
    },
    "Pending Reminder": {
      icon: "⏰",
      color: "notif-amber",
      label: t("notifications.typePendingReminder"),
    },
    "Verification Required": {
      icon: "✅",
      color: "notif-green",
      label: t("notifications.typeVerificationRequired"),
    },
    "Verification Rejected": {
      icon: "❌",
      color: "notif-red",
      label: t("notifications.typeCorrectionRequested"),
    },
  };

  const getTypeConfig = (type) => {
    return (
      typeConfig[type] || {
        icon: "📋",
        color: "notif-navy",
        label: String(type || t("notifications.genericNotification")).toUpperCase(),
      }
    );
  };

  const translateNotificationType = (type) => {
    return getTypeConfig(type).label;
  };

  // Close modal using Escape and prevent background scrolling.
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setSelectedNotif(null);
      }
    };

    if (selectedNotif) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [selectedNotif]);

  // Handle an incoming notification selection once.
  useEffect(() => {
    if (initialSelectedNotification) {
      setSelectedNotif(initialSelectedNotification);
      onInitialSelectionHandled?.();
    }
  }, [initialSelectedNotification, onInitialSelectionHandled]);

  // Close modal when clicking outside.
  const handleBackdropClick = (event) => {
    if (
      modalRef.current &&
      !modalRef.current.contains(event.target)
    ) {
      setSelectedNotif(null);
    }
  };

  // 1. Overview statistics.
  const stats = useMemo(
    () => ({
      total: notifications.length,
      unread: notifications.filter((notification) => !notification.isRead)
        .length,
      critical: notifications.filter(
        (notification) => notification.type === "Critical Priority"
      ).length,
      pending: notifications.filter(
        (notification) => notification.type === "Pending Reminder"
      ).length,
    }),
    [notifications]
  );

  // 2. Filter and sort notifications by date.
  const filteredNotifications = useMemo(() => {
    return notifications
      .filter((notification) => {
        const matchesType =
          filterType === "All" || notification.type === filterType;

        const matchesStatus =
          filterStatus === "All" ||
          (filterStatus === "Unread" && !notification.isRead) ||
          (filterStatus === "Read" && notification.isRead);

        return matchesType && matchesStatus;
      })
      .sort((first, second) => {
        const firstTime = new Date(first.time || 0).getTime();
        const secondTime = new Date(second.time || 0).getTime();

        return (
          (Number.isFinite(secondTime) ? secondTime : 0) -
          (Number.isFinite(firstTime) ? firstTime : 0)
        );
      });
  }, [notifications, filterType, filterStatus]);

  const notificationTypes = useMemo(
    () => [
      "All",
      ...new Set(
        notifications
          .map((notification) => notification.type)
          .filter(Boolean)
      ),
    ],
    [notifications]
  );

  const handleMarkRead = async (id) => {
    setActionError("");
    setMarkingReadId(id);

    try {
      await onMarkAsRead?.(id);
      setSelectedNotif(null);
    } catch (error) {
      setActionError(
        error?.message || t("notifications.markReadError")
      );
    } finally {
      setMarkingReadId(null);
    }
  };

  const handleMarkAllRead = async () => {
    setActionError("");
    setIsMarkingAllRead(true);

    try {
      await onMarkAllRead?.();
    } catch (error) {
      setActionError(
        error?.message || t("notifications.markAllReadError")
      );
    } finally {
      setIsMarkingAllRead(false);
    }
  };

  const selectedTypeConfig = selectedNotif
    ? getTypeConfig(selectedNotif.type)
    : null;

  return (
    <div className="nt-shell">
      {/* Header */}
      <div className="nt-header">
        <button className="nt-back-btn" onClick={onBack}>
          ← {t("notifications.backToDashboard")}
        </button>

        <h2>🔔 {t("notifications.title")}</h2>
      </div>

      <div className="nt-container">
        {actionError && (
          <p role="alert" className="nt-action-error">
            {actionError}
          </p>
        )}

        {/* Overview statistics */}
        <div className="nt-stats-row">
          <div className="nt-stat-card nt-stat-navy">
            <div className="nt-stat-icon">📬</div>
            <div className="nt-stat-info">
              <div className="nt-stat-num">{stats.total}</div>
              <div className="nt-stat-label">
                {t("notifications.totalNotifications")}
              </div>
            </div>
          </div>

          <div className="nt-stat-card nt-stat-red">
            <div className="nt-stat-icon">📩</div>
            <div className="nt-stat-info">
              <div className="nt-stat-num">{stats.unread}</div>
              <div className="nt-stat-label">
                {t("notifications.unread")}
              </div>
            </div>
          </div>

          <div className="nt-stat-card nt-stat-amber">
            <div className="nt-stat-icon">🚨</div>
            <div className="nt-stat-info">
              <div className="nt-stat-num">{stats.critical}</div>
              <div className="nt-stat-label">
                {t("notifications.criticalAlerts")}
              </div>
            </div>
          </div>

          <div className="nt-stat-card nt-stat-orange">
            <div className="nt-stat-icon">⏰</div>
            <div className="nt-stat-info">
              <div className="nt-stat-num">{stats.pending}</div>
              <div className="nt-stat-label">
                {t("notifications.pendingReminders")}
              </div>
            </div>
          </div>
        </div>

        {/* Filters and actions */}
        <div className="nt-controls">
          <div className="nt-filter-group">
            <span className="nt-filter-label">
              {t("notifications.typeLabel")}
            </span>

            <div className="nt-filter-buttons">
              {notificationTypes.map((type) => (
                <button
                  key={type}
                  className={`nt-filter-btn ${
                    filterType === type ? "active" : ""
                  }`}
                  onClick={() => setFilterType(type)}
                >
                  {type === "All"
                    ? t("notifications.allTypes")
                    : translateNotificationType(type)}
                </button>
              ))}
            </div>
          </div>

          <div className="nt-filter-group">
            <span className="nt-filter-label">
              {t("notifications.statusLabel")}
            </span>

            <div className="nt-filter-buttons">
              {["All", "Unread", "Read"].map((status) => (
                <button
                  key={status}
                  className={`nt-filter-btn nt-status-btn ${
                    filterStatus === status ? "active" : ""
                  }`}
                  onClick={() => setFilterStatus(status)}
                >
                  {t(`notifications.filter${status}`)}
                </button>
              ))}
            </div>
          </div>

          <button
            className="nt-mark-all-btn"
            onClick={handleMarkAllRead}
            disabled={isMarkingAllRead || stats.unread === 0}
          >
            ✓{" "}
            {isMarkingAllRead
              ? t("notifications.markingAllRead")
              : t("notifications.markAllAsRead")}
          </button>
        </div>

        {/* Notifications table */}
        <div className="nt-table-card">
          <div className="nt-table-header">
            <h3>{t("notifications.notificationLog")}</h3>
            <span className="nt-table-count">
              {t("notifications.notificationCount", {
                count: filteredNotifications.length,
              })}
            </span>
          </div>

          <div className="nt-table-wrap">
            {filteredNotifications.length === 0 ? (
              <div className="nt-empty-state">
                <div className="nt-empty-icon">📭</div>
                <h4>{t("notifications.noNotificationsFound")}</h4>
                <p>{t("notifications.emptyHelp")}</p>
              </div>
            ) : (
              <table className="nt-table">
                <thead>
                  <tr>
                    <th style={{ width: "40px" }}></th>
                    <th>{t("notifications.dateTime")}</th>
                    <th>{t("notifications.typeLabel")}</th>
                    <th>{t("notifications.complaintNumber")}</th>
                    <th>{t("notifications.message")}</th>
                    <th>{t("notifications.statusLabel")}</th>
                    <th style={{ width: "120px" }}>
                      {t("notifications.action")}
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredNotifications.map((notif) => {
                    const config = getTypeConfig(notif.type);

                    return (
                      <tr
                        key={notif.id}
                        className={`nt-row ${
                          !notif.isRead ? "nt-unread" : ""
                        }`}
                        onClick={() => setSelectedNotif(notif)}
                      >
                        <td>
                          {!notif.isRead && (
                            <span className="nt-unread-dot"></span>
                          )}
                        </td>

                        <td className="nt-mono">
                          {formatNotificationTime(notif.time)}
                        </td>

                        <td>
                          <span
                            className={`nt-type-badge ${config.color}`}
                          >
                            <span className="nt-type-icon">
                              {config.icon}
                            </span>
                            {config.label}
                          </span>
                        </td>

                        <td className="nt-mono nt-complaint-link">
                          {notif.complaintNumber || "-"}
                        </td>

                        <td className="nt-message">
                          {notif.text || t("notifications.noMessage")}
                        </td>

                        <td>
                          <span
                            className={`nt-status-badge ${
                              notif.isRead
                                ? "nt-read"
                                : "nt-unread-status"
                            }`}
                          >
                            {notif.isRead
                              ? t("notifications.read")
                              : t("notifications.unread")}
                          </span>
                        </td>

                        <td onClick={(event) => event.stopPropagation()}>
                          <button
                            className="nt-view-details-btn"
                            type="button"
                            onClick={() => setSelectedNotif(notif)}
                          >
                            {t("notifications.viewDetails")}
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

      {/* Notification details modal */}
      {selectedNotif && (
        <div
          className="nt-modal-overlay"
          onClick={handleBackdropClick}
        >
          <div className="nt-modal-content" ref={modalRef}>
            {/* Modal header */}
            <div className="nt-modal-header">
              <div className="nt-modal-header-left">
                <span
                  className={`nt-modal-type-badge ${selectedTypeConfig.color}`}
                >
                  <span className="nt-modal-type-icon">
                    {selectedTypeConfig.icon}
                  </span>
                  {selectedTypeConfig.label}
                </span>
              </div>

              <button
                className="nt-modal-close-btn"
                onClick={() => setSelectedNotif(null)}
                aria-label={t("notifications.closeModal")}
              >
                ✕
              </button>
            </div>

            {/* Modal title */}
            <div className="nt-modal-title-section">
              <h3>
                {selectedNotif.text || t("notifications.noMessage")}
              </h3>
            </div>

            {/* Modal body */}
            <div className="nt-modal-body">
              <div className="nt-detail-layout">
                <section
                  className="nt-detail-panel"
                  aria-label={t("notifications.complaintInformation")}
                >
                  <header className="nt-detail-panel-heading">
                    <span className="nt-detail-eyebrow">
                      {t("notifications.relatedReport")}
                    </span>
                    <h4>{t("notifications.complaintInformation")}</h4>
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
                        {t("notifications.noLinkedComplaint")}
                      </p>
                    )}
                  </div>
                </section>

                <section
                  className="nt-detail-panel"
                  aria-label={t("notifications.notificationInformation")}
                >
                  <header className="nt-detail-panel-heading">
                    <span className="nt-detail-eyebrow">
                      {t("notifications.alertDetails")}
                    </span>
                    <h4>
                      {t("notifications.notificationInformation")}
                    </h4>
                  </header>

                  <div className="nt-detail-panel-content">
                    <dl className="nt-notification-facts">
                      <div>
                        <dt>{t("notifications.complaintNumber")}</dt>
                        <dd className="nt-mono">
                          {selectedNotif.complaintNumber || "N/A"}
                        </dd>
                      </div>

                      <div>
                        <dt>{t("notifications.receivedAt")}</dt>
                        <dd>
                          {formatNotificationTime(selectedNotif.time)}
                        </dd>
                      </div>

                      <div>
                        <dt>{t("notifications.readStatus")}</dt>
                        <dd className="nt-read-status-display">
                          {selectedNotif.isRead
                            ? `✅ ${t("notifications.read")}`
                            : `🔴 ${t("notifications.unread")}`}
                        </dd>
                      </div>
                    </dl>

                    <div className="nt-modal-message-section">
                      <span className="nt-modal-label">
                        {t("notifications.fullMessage")}
                      </span>

                      <div className="nt-modal-message-box">
                        {selectedNotif.text ||
                          t("notifications.noMessage")}
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </div>

            {/* Modal footer */}
            <div className="nt-modal-footer">
              {!selectedNotif.isRead && (
                <button
                  className="nt-modal-action-btn nt-modal-mark-read"
                  disabled={markingReadId === selectedNotif.id}
                  onClick={() => handleMarkRead(selectedNotif.id)}
                >
                  ✓{" "}
                  {markingReadId === selectedNotif.id
                    ? t("notifications.markingRead")
                    : t("notifications.markAsRead")}
                </button>
              )}

              <button
                className="nt-modal-action-btn nt-modal-close-footer"
                onClick={() => setSelectedNotif(null)}
              >
                {t("notifications.close")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;
