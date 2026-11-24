
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "./AssignedComplaints.css";
import StaffComplaintDetails from "./StaffComplaintDetails";
import { toMediaUrl, uploadDashboardPhoto } from "../utils/dashboardApi";

const AssignedComplaints = ({
  complaints = [],
  staffId = "",
  staffName = "",
  staffUserId = "",
  onBack,
  allAssigned = false,
  newAssignments = false,
  rejectedMode = false,
  onResubmitRejected,
  submissionMode = false,
  onSubmitWork,
  loadError = "",
}) => {
  const { t } = useTranslation();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterPriority, setFilterPriority] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [viewingComplaint, setViewingComplaint] = useState(null);
  const [reworkAfterPhoto, setReworkAfterPhoto] = useState("");
  const [reworkActionTaken, setReworkActionTaken] = useState("");
  const [reworkUploading, setReworkUploading] = useState(false);
  const [reworkSaving, setReworkSaving] = useState(false);
  const [reworkError, setReworkError] = useState("");

  const normalizedStaffName = String(staffName || "").trim().toLowerCase();
  const normalizedStaffId = String(staffId || "").trim().toLowerCase();
  const normalizedUserId = String(staffUserId || "").trim().toLowerCase();

  const canSubmitForVerification = (complaint) =>
    !["under verification", "under review", "submitted", "verified", "approved", "resolved", "closed"]
      .includes(String(complaint.status || "").trim().toLowerCase());

  const isAssignedToStaff = (complaint) => {
    const assignedStaffId = String(
      complaint.assignedStaffId || ""
    ).trim().toLowerCase();

    if (assignedStaffId) {
      return assignedStaffId === normalizedUserId;
    }

    const assignee = String(
      complaint.assignedStaff || ""
    ).trim().toLowerCase();

    return Boolean(
      assignee &&
        [
          normalizedStaffName,
          normalizedStaffId,
          normalizedUserId,
        ].includes(assignee)
    );
  };

  const hasStaffAssignment = (complaint) => {
    const assignedStaffId = String(
      complaint.assignedStaffId || ""
    ).trim().toLowerCase();

    const assignedStaff = String(
      complaint.assignedStaff || ""
    ).trim().toLowerCase();

    const unassignedValues = [
      "unassigned",
      "not assigned",
      "none",
      "null",
    ];

    return Boolean(
      (assignedStaffId && !unassignedValues.includes(assignedStaffId)) ||
        (assignedStaff && !unassignedValues.includes(assignedStaff))
    );
  };

  const isAvailableForStaff = (complaint) => {
    const status = String(complaint.status || "").trim().toLowerCase();

    if (["new", "pending"].includes(status)) {
      return !hasStaffAssignment(complaint);
    }

    if (status === "rejected") {
      return isAssignedToStaff(complaint);
    }

    return status === "under action" && isAssignedToStaff(complaint);
  };

  const staffComplaints = allAssigned
    ? complaints.filter(hasStaffAssignment)
    : newAssignments
      ? complaints.filter(isAvailableForStaff)
      : complaints.filter(isAssignedToStaff);

  const visibleComplaints = newAssignments
    ? staffComplaints.filter((complaint) =>
        [
          "new",
          "pending",
          "assigned",
          "under action",
          "rejected",
        ].includes(String(complaint.status || "").trim().toLowerCase())
      )
    : staffComplaints;

  const assignmentTime = (complaint) => {
    if (newAssignments) {
      const createdTimestamp = new Date(
        complaint.createdAt || complaint.date || 0
      ).getTime();

      return Number.isFinite(createdTimestamp) ? createdTimestamp : 0;
    }

    const latestAssignment = (complaint.log || []).reduce(
      (latest, entry) => {
        if (!/assigned/i.test(entry.text || "")) {
          return latest;
        }

        const timestamp = new Date(entry.time || 0).getTime();

        return Number.isFinite(timestamp)
          ? Math.max(latest, timestamp)
          : latest;
      },
      0
    );

    if (latestAssignment) {
      return latestAssignment;
    }

    const timestamp = new Date(
      complaint.updatedAt || complaint.createdAt || 0
    ).getTime();

    return Number.isFinite(timestamp) ? timestamp : 0;
  };

  const sortedComplaints = [...visibleComplaints].sort(
    (first, second) => assignmentTime(second) - assignmentTime(first)
  );

  const statuses = [
    ...new Set(
      sortedComplaints.map((complaint) => complaint.status).filter(Boolean)
    ),
  ];

  const filteredComplaints = sortedComplaints.filter((complaint) => {
    const search = searchTerm.toLowerCase();

    const matchesSearch =
      String(complaint.complaintNumber || "").toLowerCase().includes(search) ||
      String(complaint.issue || "").toLowerCase().includes(search) ||
      String(complaint.location || "").toLowerCase().includes(search) ||
      String(complaint.citizenName || "").toLowerCase().includes(search) ||
      String(complaint.assignedStaff || "").toLowerCase().includes(search) ||
      String(complaint.assignedStaffId || "").toLowerCase().includes(search) ||
      String(complaint.assignedVerifier || "").toLowerCase().includes(search);

    const matchesPriority =
      filterPriority === "All" || complaint.priority === filterPriority;

    const matchesStatus =
      filterStatus === "All" || complaint.status === filterStatus;

    return matchesSearch && matchesPriority && matchesStatus;
  });

  const priorityTone = {
    Critical: "red",
    Urgent: "amber",
    Normal: "green",
    High: "red",
    Medium: "amber",
    Low: "green",
  };

  const translateStatus = (status) => {
    if (!status) {
      return t("assignedComplaints.unknown");
    }

    const statusKeys = {
      new: "statusNew",
      pending: "statusPending",
      assigned: "statusAssigned",
      "under action": "statusUnderAction",
      rejected: "statusRejected",
      verified: "statusVerified",
      resolved: "statusResolved",
      closed: "statusClosed",
      "in progress": "statusInProgress",
      "under review": "statusUnderReview",
      "work completed": "statusWorkCompleted",
      "action initiated": "statusActionInitiated",
      "complaint registered": "statusComplaintRegistered",
      "complaint verified": "statusComplaintVerified",
      "assigned to staff": "statusAssignedToStaff",
      "assigned to officer": "statusAssignedToOfficer",
      "under verification": "statusUnderVerification",
      "complaint closed": "statusComplaintClosed",
    };

    const key = statusKeys[String(status).trim().toLowerCase()];

    return key
      ? t(`assignedComplaints.${key}`)
      : status;
  };

  const translatePriority = (priority) => {
    if (!priority) {
      return t("assignedComplaints.unknown");
    }

    const priorityKeys = {
      critical: "priorityCritical",
      urgent: "priorityUrgent",
      normal: "priorityNormal",
      high: "priorityHigh",
      medium: "priorityMedium",
      low: "priorityLow",
    };

    const key = priorityKeys[String(priority).trim().toLowerCase()];

    return key
      ? t(`assignedComplaints.${key}`)
      : priority;
  };

  // Close the details modal when Escape is pressed.
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setViewingComplaint(null);
      }
    };

    if (viewingComplaint) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [viewingComplaint]);

  const openComplaintDetails = (complaint) => {
    setViewingComplaint(complaint);
    setReworkAfterPhoto("");
    setReworkActionTaken(complaint.inspection?.actionTaken || "");
    setReworkError("");
  };

  const handleReworkPhotoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setReworkUploading(true);
    setReworkError("");
    try {
      const uploaded = await uploadDashboardPhoto(file);
      setReworkAfterPhoto(uploaded.publicUrl);
    } catch (error) {
      setReworkError(error.message || "Could not upload the after-work photo.");
    } finally {
      setReworkUploading(false);
      event.target.value = "";
    }
  };

  const submitRework = async () => {
    if (!viewingComplaint) return;
    if (!reworkAfterPhoto) {
      setReworkError("Upload an after-work photo before resubmitting.");
      return;
    }
    setReworkSaving(true);
    setReworkError("");
    try {
      const workData = {
        afterPhoto: reworkAfterPhoto,
        actionTaken: reworkActionTaken,
      };
      if (rejectedMode) {
        await onResubmitRejected?.(viewingComplaint.id, workData);
      } else if (submissionMode) {
        await onSubmitWork?.(viewingComplaint.id, workData);
      }
      setViewingComplaint(null);
      setReworkAfterPhoto("");
    } catch (error) {
      setReworkError(error.message || "Could not resubmit the complaint for verification.");
    } finally {
      setReworkSaving(false);
    }
  };

  const pageTitle = allAssigned
    ? t("assignedComplaints.complaintAssigned")
    : newAssignments
      ? t("assignedComplaints.newComplaints")
      : rejectedMode
        ? t("staff_dashboard.rejected_complaints", "Rejected Complaints")
      : t("assignedComplaints.myAssignedComplaints");

  const pageDescription = newAssignments
    ? t("assignedComplaints.newAssignmentsDescription", {
        count: visibleComplaints.length,
      })
    : t("assignedComplaints.assignedDescription", {
        count: staffComplaints.length,
        target: allAssigned
          ? t("assignedComplaints.assignedToStaff")
          : t("assignedComplaints.assignedToYou"),
      });

  const emptyMessage =
    visibleComplaints.length === 0
      ? allAssigned
        ? t("assignedComplaints.noStaffAssignments")
        : newAssignments
          ? t("assignedComplaints.noNewAssignments")
          : t("assignedComplaints.noPersonalAssignments")
      : t("assignedComplaints.noMatchingComplaints");

  return (
    <div className="ac-shell">
      {/* Header */}
      <div className="ac-header">
        <button className="ac-back-btn" onClick={onBack}>
          ← {t("assignedComplaints.backToDashboard")}
        </button>

        <div>
          <h2>{pageTitle}</h2>
          <p
            style={{
              fontSize: "13px",
              color: "var(--ink-soft)",
              margin: "4px 0 0 0",
            }}
          >
            {pageDescription}
          </p>
        </div>
      </div>

      {loadError && (
        <p className="ac-load-error" role="alert">
          {loadError}
        </p>
      )}

      {/* Search and filters */}
      <div className="ac-controls">
        <div className="ac-search">
          <span>🔍</span>
          <input
            type="text"
            placeholder={t("assignedComplaints.searchPlaceholder")}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        <div className="ac-filters">
          <select
            value={filterPriority}
            onChange={(event) => setFilterPriority(event.target.value)}
            aria-label={t("assignedComplaints.filterByPriority")}
          >
            <option value="All">
              {t("assignedComplaints.allPriorities")}
            </option>
            <option value="Critical">
              {t("assignedComplaints.priorityCritical")}
            </option>
            <option value="Urgent">
              {t("assignedComplaints.priorityUrgent")}
            </option>
            <option value="Normal">
              {t("assignedComplaints.priorityNormal")}
            </option>
            <option value="High">
              {t("assignedComplaints.priorityHigh")}
            </option>
            <option value="Medium">
              {t("assignedComplaints.priorityMedium")}
            </option>
            <option value="Low">
              {t("assignedComplaints.priorityLow")}
            </option>
          </select>

          <select
            value={filterStatus}
            onChange={(event) => setFilterStatus(event.target.value)}
            aria-label={t("assignedComplaints.filterByStatus")}
          >
            <option value="All">
              {t("assignedComplaints.allStatuses")}
            </option>

            {statuses.map((status) => (
              <option key={status} value={status}>
                {translateStatus(status)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Complaints table */}
      <div className="ac-table-container">
        <table className="ac-table">
          <thead>
            <tr>
              <th>{t("assignedComplaints.complaintNumber")}</th>
              <th>{t("assignedComplaints.categoryAndIssue")}</th>
              <th>{t("assignedComplaints.location")}</th>
              <th>{t("assignedComplaints.priority")}</th>
              <th>{t("assignedComplaints.status")}</th>
              <th>{t("assignedComplaints.assignedStaff")}</th>
              <th>{t("assignedComplaints.action")}</th>
            </tr>
          </thead>

          <tbody>
            {filteredComplaints.length === 0 ? (
              <tr>
                <td colSpan="7" className="ac-empty">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              filteredComplaints.map((complaint) => (
                <React.Fragment
                  key={
                    complaint.id ||
                    complaint._id ||
                    complaint.complaintNumber
                  }
                >
                  <tr
                    className={
                      selectedComplaint?.id === complaint.id
                        ? "ac-row-active"
                        : ""
                    }
                    onClick={() => setSelectedComplaint(complaint)}
                  >
                    <td className="ac-mono">
                      {complaint.complaintNumber ||
                        t("assignedComplaints.notAvailable")}
                    </td>

                    <td>
                      <div className="ac-category">
                        <span
                          className="ac-cat-dot"
                          style={{
                            background: getCategoryColor(complaint.category),
                          }}
                        />
                        {complaint.issue ||
                          complaint.category ||
                          t("assignedComplaints.notAvailable")}
                      </div>
                    </td>

                    <td>
                      {complaint.location ||
                        t("assignedComplaints.notAvailable")}
                    </td>

                    <td>
                      <span
                        className={`ac-badge ac-badge-${
                          priorityTone[complaint.priority] || "orange"
                        }`}
                      >
                        {translatePriority(complaint.priority)}
                      </span>
                    </td>

                    <td>
                      <span className="ac-badge ac-badge-orange">
                        {translateStatus(complaint.status)}
                      </span>
                    </td>

                    <td>
                      {complaint.assignedStaff || complaint.assignedStaffId
                        ? `${
                            complaint.assignedStaff ||
                            complaint.assignedStaffId
                          }${
                            isAssignedToStaff(complaint)
                              ? ` (${t("assignedComplaints.you")})`
                              : ""
                          }`
                        : t("assignedComplaints.notAssigned")}
                    </td>

                    <td>
                      <button
                        className="ac-view-btn"
                        onClick={(event) => {
                          event.stopPropagation();
                          openComplaintDetails(complaint);
                        }}
                      >
                        {rejectedMode
                          ? t("staff_dashboard.rejected_complaint", "Rejected Complaint")
                          : t("assignedComplaints.viewDetails")}
                      </button>
                    </td>
                  </tr>
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Complaint details modal */}
      {viewingComplaint && (
        <div
          className="ac-modal-overlay"
          onClick={() => setViewingComplaint(null)}
        >
          <div
            className="ac-modal-content"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="ac-modal-header">
              <h3>
                {t("assignedComplaints.completeComplaintDetails", {
                  number:
                    viewingComplaint.complaintNumber ||
                    t("assignedComplaints.notAvailable"),
                })}
              </h3>

              <button
                className="ac-modal-close"
                onClick={() => setViewingComplaint(null)}
                aria-label={t("assignedComplaints.close")}
              >
                ✕
              </button>
            </div>

            <div className="ac-modal-body">
              <StaffComplaintDetails
                complaint={viewingComplaint}
                layout="split"
                showActivity={false}
              />
              {(rejectedMode || (submissionMode && canSubmitForVerification(viewingComplaint))) && (
                <section className="ac-rework-form" aria-label="Resubmit rejected complaint">
                  <h4>{rejectedMode
                    ? "Send Completed Work for Verification"
                    : "Send Completed Work for Verification"}</h4>
                  {reworkError && <p className="ac-rework-error" role="alert">{reworkError}</p>}
                  <label htmlFor="ac-rework-action">Work Performed</label>
                  <textarea
                    id="ac-rework-action"
                    rows="3"
                    value={reworkActionTaken}
                    onChange={(event) => setReworkActionTaken(event.target.value)}
                    disabled={reworkSaving}
                  />
                  <label htmlFor="ac-rework-photo">After-Work Photo</label>
                  <input
                    id="ac-rework-photo"
                    type="file"
                    accept="image/*"
                    onChange={handleReworkPhotoUpload}
                    disabled={reworkUploading || reworkSaving}
                  />
                  {reworkAfterPhoto && (
                    <img
                      className="ac-rework-photo-preview"
                      src={toMediaUrl(reworkAfterPhoto)}
                      alt="After-work rework evidence"
                    />
                  )}
                  <div className="ac-rework-actions">
                    <button
                      type="button"
                      className="ac-modal-close-btn"
                      onClick={() => setViewingComplaint(null)}
                      disabled={reworkSaving}
                    >
                      {t("assignedComplaints.close")}
                    </button>
                    <button
                      type="button"
                      className="ac-rework-submit"
                      onClick={submitRework}
                      disabled={reworkUploading || reworkSaving}
                    >
                      {reworkSaving ? "Submitting..." : "Send for Verification"}
                    </button>
                  </div>
                </section>
              )}
            </div>

            <div className="ac-modal-footer">
              <button
                className="ac-modal-close-btn"
                onClick={() => setViewingComplaint(null)}
              >
                {t("assignedComplaints.close")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function for category colors.
const getCategoryColor = (category = "") => {
  const mapColors = [
    "#e07b1c",
    "#2e6cb0",
    "#1d8a5c",
    "#c1900a",
    "#cf4438",
    "#7a5c9e",
  ];

  let hash = 0;

  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }

  return mapColors[Math.abs(hash) % mapColors.length];
};

export default AssignedComplaints;
