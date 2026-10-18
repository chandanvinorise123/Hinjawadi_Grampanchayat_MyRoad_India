import React, { useState, useMemo } from "react";
import "./Notifications.css";
import VerifierComplaintDetails from "./VerifierComplaintDetails";
import ComplaintImage from "./ComplaintImage";
import VerifierDecisionForm from "./VerifierDecisionForm";
import NotificationComplaintActions from "./NotificationComplaintActions";

const displayCategory = (category) => {
  const normalized = String(category || "").trim().toLowerCase();
  if (normalized.includes("work completed") || normalized.includes("work submitted")) return "Work Submitted";
  if (normalized.includes("verification")) return "Verification Required";
  if (normalized.includes("assigned") || normalized.includes("reassignment")) return "Reassignment";
  if (normalized.includes("reminder")) return "Pending Reminder";
  if (normalized.includes("resolved") || normalized.includes("status")) return "Status Update";
  return category || "Other";
};

const Notifications = ({
  notifications,
  complaints = [],
  staffOptions,
  onBack,
  onMarkAsRead,
  onMarkAllRead,
  onVerify,
  onAcceptAssign,
  onReject,
  onAssign,
  onComplaintUpdated,
}) => {
  const [selectedNotif, setSelectedNotif] = useState(null);
  const [filterCategory, setFilterCategory] = useState("All");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Helper to get badge colors based on category
  const getCategoryStyle = (category) => {
    switch (displayCategory(category)) {
      case "Work Submitted": return "type-submitted";
      case "Verification Required": return "type-verification";
      case "Reassignment": return "type-reassignment";
      case "Pending Reminder": return "type-reminder";
      default: return "type-general";
    }
  };

  const normalizedNotifications = useMemo(
    () => notifications.map((notification) => ({
      ...notification,
      category: displayCategory(notification.category || notification.type),
    })),
    [notifications]
  );
  const categories = useMemo(
    () => ["All", ...new Set(normalizedNotifications.map((notification) => notification.category))],
    [normalizedNotifications]
  );

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    if (filterCategory === "All") return normalizedNotifications;
    return normalizedNotifications.filter((n) => n.category === filterCategory);
  }, [normalizedNotifications, filterCategory]);

  const handleMarkRead = async (id) => {
    setSaving(true);
    setError("");
    try {
      await onMarkAsRead(id);
      setSelectedNotif(null);
    } catch (saveError) {
      setError(saveError.message || "Unable to mark the notification as read.");
    } finally {
      setSaving(false);
    }
  };

  const handleMarkAllRead = async () => {
    setSaving(true);
    setError("");
    try {
      await onMarkAllRead();
    } catch (saveError) {
      setError(saveError.message || "Unable to mark all notifications as read.");
    } finally {
      setSaving(false);
    }
  };

  const handleComplaintUpdated = (updatedComplaint) => {
    if (!updatedComplaint) return;
    setSelectedNotif((current) => current ? {
      ...current,
      complaint: updatedComplaint,
      complaintNumber: updatedComplaint.complaintNumber,
    } : current);
    onComplaintUpdated?.(updatedComplaint);
  };

  const selectedComplaint = selectedNotif
    ? selectedNotif.complaint || complaints.find((complaint) => (
        complaint.id === selectedNotif.complaintId ||
        complaint.complaintNumber === selectedNotif.complaintNumber
      ))
    : null;

  return (
    <div className="notif-shell">
      {/* Header */}
      <div className="notif-header">
        <button className="notif-back-btn" onClick={onBack}>← Back to Dashboard</button>
        <h2>🔔 Notifications Center</h2>
      </div>

      <div className="notif-container">
        {error && <div className="notif-error" role="alert">{error}</div>}
        {/* Summary Stats */}
        <div className="notif-stats">
          <div className="notif-stat-card">
            <span className="notif-stat-num">{notifications.filter((n) => !n.isRead).length}</span>
            <span className="notif-stat-label">Unread</span>
          </div>
          <div className="notif-stat-card">
            <span className="notif-stat-num">{normalizedNotifications.filter((n) => n.category === "Work Submitted").length}</span>
            <span className="notif-stat-label">Work Submitted</span>
          </div>
          <div className="notif-stat-card">
            <span className="notif-stat-num">{normalizedNotifications.filter((n) => n.category === "Pending Reminder").length}</span>
            <span className="notif-stat-label">Pending Reminders</span>
          </div>
        </div>

        {/* Filters */}
        <div className="notif-filters">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`notif-filter-btn ${filterCategory === cat ? "active" : ""}`}
              onClick={() => setFilterCategory(cat)}
            >
              {cat}
            </button>
          ))}
          <button className="notif-mark-all-btn" disabled={saving} onClick={handleMarkAllRead}>
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
                    <td className="notif-mono">{notif.time && !Number.isNaN(new Date(notif.time).getTime()) ? new Date(notif.time).toLocaleString() : "—"}</td>
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
                  <b>{selectedNotif.time && !Number.isNaN(new Date(selectedNotif.time).getTime()) ? new Date(selectedNotif.time).toLocaleString() : "—"}</b>
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
              {selectedComplaint ? (
                <>
                  <VerifierComplaintDetails complaint={selectedComplaint} />
                  <div className="notif-evidence-grid">
                    {[
                      ["Before Repair", selectedComplaint.photos?.before],
                      ["Site Inspection", selectedComplaint.photos?.site],
                      ["After Repair", selectedComplaint.photos?.after],
                    ].map(([label, photo]) => photo && (
                      <div key={label}>
                        <span>{label}</span>
                        <ComplaintImage src={photo} alt={`${label} evidence`} fallbackClassName="notif-evidence-fallback" />
                      </div>
                    ))}
                  </div>
                  <VerifierDecisionForm
                    complaint={selectedComplaint}
                    onVerify={onVerify}
                    onComplete={handleComplaintUpdated}
                  />
                  <NotificationComplaintActions
                    key={`${selectedComplaint.id}-${selectedComplaint.status}`}
                    complaint={selectedComplaint}
                    staffOptions={staffOptions}
                    onAcceptAssign={onAcceptAssign}
                    onReject={onReject}
                    onAssign={onAssign}
                    onComplete={handleComplaintUpdated}
                  />
                </>
              ) : (
                <p className="notif-error" role="alert">
                  Complaint details could not be matched to this notification. Refresh the dashboard and try again.
                </p>
              )}
            </div>

            <div className="notif-modal-footer">
              {!selectedNotif.isRead && (
                <button className="notif-modal-action-btn" disabled={saving} onClick={() => handleMarkRead(selectedNotif.id)}>
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