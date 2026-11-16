
import React, { useState, useMemo, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import "./ComplaintHistory.css";
import StaffComplaintDetails from "./StaffComplaintDetails";
import { toMediaUrl } from "../utils/dashboardApi";

const ComplaintHistory = ({ complaints = [], onBack }) => {
  const { t, i18n } = useTranslation();

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [filterType, setFilterType] = useState("All");
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

  const formatDate = (dateValue) => {
    if (!dateValue) {
      return t("complaintHistory.timeNotRecorded");
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return t("complaintHistory.timeNotRecorded");
    }

    return date.toLocaleString(dateLocale);
  };

  // Translate known activity types while preserving their original values
  // for filtering and history data.
  const translateEventType = (type) => {
    const typeKeys = {
      Assignment: "typeAssignment",
      "Admin Update": "typeAdminUpdate",
      Verification: "typeVerification",
      "Work Update": "typeWorkUpdate",
      Submitted: "typeSubmitted",
      "Status Change": "typeStatusChange",
      Inspection: "typeInspection",
      "Action Taken": "typeActionTaken",
    };

    const key = typeKeys[type];

    return key ? t(`complaintHistory.${key}`) : type;
  };

  const translateStatus = (status) => {
    if (!status) {
      return t("complaintHistory.notRecorded");
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

    return key ? t(`complaintHistory.${key}`) : status;
  };

  // Close the modal when Escape is pressed.
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setSelectedEvent(null);
      }
    };

    if (selectedEvent) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [selectedEvent]);

  // Close the modal when clicking outside.
  const handleBackdropClick = (event) => {
    if (
      modalRef.current &&
      !modalRef.current.contains(event.target)
    ) {
      setSelectedEvent(null);
    }
  };

  // 1. Calculate overview statistics.
  const stats = useMemo(
    () => ({
      totalAssigned: complaints.length,
      solved: complaints.filter((complaint) => complaint.stage === 5).length,
      inProgress: complaints.filter(
        (complaint) => complaint.stage > 0 && complaint.stage < 5
      ).length,
      pending: complaints.filter((complaint) => complaint.stage === 0).length,
    }),
    [complaints]
  );

  // 2. Generate the flattened history log from complaints.
  const historyLog = useMemo(() => {
    const log = [];

    complaints.forEach((complaint) => {
      const events = Array.isArray(complaint.log)
        ? complaint.log
        : [];

      if (!events.length) {
        const timestamp = complaint.createdAt
          ? new Date(complaint.createdAt).getTime()
          : 0;

        log.push({
          id: `${complaint.id || complaint._id}-submitted`,
          complaintNumber: complaint.complaintNumber,
          issue: complaint.issue,
          type: "Submitted",
          date: formatDate(complaint.createdAt),
          timestamp: Number.isFinite(timestamp) ? timestamp : 0,
          description: t("complaintHistory.submittedDescription", {
            location:
              complaint.location ||
              t("complaintHistory.recordedLocation"),
          }),
          complaintRef: complaint,
        });

        return;
      }

      events.forEach((event, index) => {
        const actor = String(
          event.actor || "Dashboard"
        );

        const normalizedActor = actor.toLowerCase();

        const type = normalizedActor.includes("admin")
          ? "Admin Update"
          : normalizedActor.includes("verifier")
            ? "Verification"
            : normalizedActor.includes("staff")
              ? "Work Update"
              : "Status Change";

        const timestamp = event.time
          ? new Date(event.time).getTime()
          : 0;

        log.push({
          id: `${complaint.id || complaint._id}-event-${index}`,
          complaintNumber: complaint.complaintNumber,
          issue: complaint.issue,
          actor,
          type,
          date: formatDate(event.time),
          timestamp: Number.isFinite(timestamp) ? timestamp : 0,
          description:
            event.text ||
            t("complaintHistory.activityUpdated"),
          complaintRef: complaint,
        });
      });
    });

    return log.sort((first, second) => second.timestamp - first.timestamp);
  }, [complaints, dateLocale, language, t]);

  const filteredLog =
    filterType === "All"
      ? historyLog
      : historyLog.filter((event) => event.type === filterType);

  const getTypeBadgeClass = (type) => {
    switch (type) {
      case "Assignment":
      case "Admin Update":
      case "Submitted":
        return "ch-badge-navy";

      case "Verification":
        return "ch-badge-red";

      case "Work Update":
      case "Inspection":
        return "ch-badge-blue";

      case "Status Change":
        return "ch-badge-amber";

      case "Action Taken":
        return "ch-badge-green";

      default:
        return "ch-badge-gray";
    }
  };

  const filterTypes = [
    "All",
    "Submitted",
    "Admin Update",
    "Status Change",
    "Work Update",
    "Verification",
  ];

  const evidencePhotos = selectedEvent
    ? [
        [
          "beforeSite",
          selectedEvent.complaintRef.inspection?.sitePhoto ||
            selectedEvent.complaintRef.photos?.site,
        ],
        [
          "afterWork",
          selectedEvent.complaintRef.inspection?.completionPhoto ||
            selectedEvent.complaintRef.photos?.after,
        ],
      ].filter(([, photo]) => photo)
    : [];

  return (
    <div className="ch-shell">
      {/* Header */}
      <div className="ch-header">
        <button className="ch-back-btn" onClick={onBack}>
          ← {t("complaintHistory.backToDashboard")}
        </button>

        <h2>{t("complaintHistory.title")}</h2>
      </div>

      <div className="ch-container">
        {/* Overview cards */}
        <div className="ch-stats-row">
          <div className="ch-stat-card ch-stat-navy">
            <div className="ch-stat-num">{stats.totalAssigned}</div>
            <div className="ch-stat-label">
              {t("complaintHistory.totalAssigned")}
            </div>
          </div>

          <div className="ch-stat-card ch-stat-green">
            <div className="ch-stat-num">{stats.solved}</div>
            <div className="ch-stat-label">
              {t("complaintHistory.solvedClosed")}
            </div>
          </div>

          <div className="ch-stat-card ch-stat-orange">
            <div className="ch-stat-num">{stats.inProgress}</div>
            <div className="ch-stat-label">
              {t("complaintHistory.inProgress")}
            </div>
          </div>

          <div className="ch-stat-card ch-stat-amber">
            <div className="ch-stat-num">{stats.pending}</div>
            <div className="ch-stat-label">
              {t("complaintHistory.pendingAction")}
            </div>
          </div>
        </div>

        {/* Activity history table */}
        <div className="ch-table-card">
          <div className="ch-table-header">
            <h3>{t("complaintHistory.activityHistoryLog")}</h3>

            <div className="ch-filters">
              {filterTypes.map((type) => (
                <button
                  key={type}
                  className={`ch-filter-btn ${
                    filterType === type ? "active" : ""
                  }`}
                  onClick={() => setFilterType(type)}
                >
                  {type === "All"
                    ? t("complaintHistory.filterAll")
                    : translateEventType(type)}
                </button>
              ))}
            </div>
          </div>

          <div className="ch-table-wrap">
            <table className="ch-table">
              <thead>
                <tr>
                  <th>{t("complaintHistory.date")}</th>
                  <th>{t("complaintHistory.complaintNumber")}</th>
                  <th>{t("complaintHistory.updateType")}</th>
                  <th>{t("complaintHistory.updatedBy")}</th>
                  <th>{t("complaintHistory.descriptionRemarks")}</th>
                  <th>{t("complaintHistory.action")}</th>
                </tr>
              </thead>

              <tbody>
                {filteredLog.length > 0 ? (
                  filteredLog.map((event) => (
                    <tr key={event.id}>
                      <td className="ch-mono">{event.date}</td>

                      <td className="ch-mono ch-complaint-link">
                        {event.complaintNumber ||
                          t("complaintHistory.notAvailable")}
                      </td>

                      <td>
                        <span
                          className={`ch-badge ${getTypeBadgeClass(
                            event.type
                          )}`}
                        >
                          {translateEventType(event.type)}
                        </span>
                      </td>

                      <td>
                        {event.actor ||
                          t("complaintHistory.dashboard")}
                      </td>

                      <td className="ch-desc">{event.description}</td>

                      <td>
                        <button
                          className="ch-view-btn"
                          onClick={(eventClick) => {
                            eventClick.stopPropagation();
                            setSelectedEvent(event);
                          }}
                        >
                          {t("complaintHistory.viewDetails")}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="ch-empty-row" colSpan="6">
                      {t("complaintHistory.noMatchingHistory")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Complaint history details modal */}
      {selectedEvent && (
        <div
          className="ch-modal-overlay"
          onClick={handleBackdropClick}
        >
          <div className="ch-modal-content" ref={modalRef}>
            {/* Modal header */}
            <div className="ch-modal-header">
              <h3>
                {t("complaintHistory.detailsHeading", {
                  number:
                    selectedEvent.complaintNumber ||
                    t("complaintHistory.notAvailable"),
                  issue:
                    selectedEvent.issue ||
                    t("complaintHistory.notAvailable"),
                })}
              </h3>

              <button
                className="ch-modal-close"
                onClick={() => setSelectedEvent(null)}
                aria-label={t("complaintHistory.closeModal")}
              >
                ✕
              </button>
            </div>

            {/* Modal body */}
            <div className="ch-modal-body">
              <div className="ch-detail-layout">
                <section className="ch-detail-panel">
                  <header className="ch-detail-panel-heading">
                    <span className="ch-eyebrow">
                      {t("complaintHistory.originalReport")}
                    </span>

                    <h4>
                      {t("complaintHistory.complaintInformation")}
                    </h4>
                  </header>

                  <div className="ch-complaint-information">
                    <StaffComplaintDetails
                      complaint={selectedEvent.complaintRef}
                      layout="complaint-only"
                      showActivity={false}
                    />
                  </div>
                </section>

                <section className="ch-detail-panel">
                  <header className="ch-detail-panel-heading">
                    <span className="ch-eyebrow">
                      {t("complaintHistory.timelineEntry")}
                    </span>

                    <h4>
                      {translateEventType(selectedEvent.type)}{" "}
                      {t("complaintHistory.detailsSuffix")}
                    </h4>
                  </header>

                  <div className="ch-event-information">
                    <dl className="ch-event-facts">
                      <div>
                        <dt>{t("complaintHistory.recordedBy")}</dt>
                        <dd>
                          {selectedEvent.actor ||
                            t("complaintHistory.dashboard")}
                        </dd>
                      </div>

                      <div>
                        <dt>{t("complaintHistory.dateRecorded")}</dt>
                        <dd>{selectedEvent.date}</dd>
                      </div>

                      <div>
                        <dt>
                          {t("complaintHistory.currentComplaintStatus")}
                        </dt>
                        <dd>
                          {translateStatus(
                            selectedEvent.complaintRef.status
                          )}
                        </dd>
                      </div>

                      <div className="ch-event-wide">
                        <dt>{t("complaintHistory.historyUpdate")}</dt>
                        <dd>{selectedEvent.description}</dd>
                      </div>

                      <div className="ch-event-wide">
                        <dt>{t("complaintHistory.staffWorkPerformed")}</dt>
                        <dd>
                          {selectedEvent.complaintRef.inspection
                            ?.actionTaken ||
                            t("complaintHistory.noStaffWorkDetails")}
                        </dd>
                      </div>

                      <div className="ch-event-wide">
                        <dt>{t("complaintHistory.staffRemarks")}</dt>
                        <dd>
                          {selectedEvent.complaintRef.inspection?.remarks ||
                            t("complaintHistory.noStaffRemarks")}
                        </dd>
                      </div>

                      <div>
                        <dt>{t("complaintHistory.inspectionDate")}</dt>
                        <dd>
                          {selectedEvent.complaintRef.inspection
                            ?.inspectionDate
                            ? formatDate(
                                selectedEvent.complaintRef.inspection
                                  .inspectionDate
                              )
                            : t("complaintHistory.notRecorded")}
                        </dd>
                      </div>

                      <div>
                        <dt>{t("complaintHistory.completionDate")}</dt>
                        <dd>
                          {selectedEvent.complaintRef.inspection
                            ?.completionDate
                            ? formatDate(
                                selectedEvent.complaintRef.inspection
                                  .completionDate
                              )
                            : t("complaintHistory.notRecorded")}
                        </dd>
                      </div>
                    </dl>

                    {/* Work evidence */}
                    <div className="ch-event-evidence">
                      <h5>{t("complaintHistory.workEvidence")}</h5>

                      {evidencePhotos.length > 0 ? (
                        <div className="ch-event-photos">
                          {evidencePhotos.map(([labelKey, photo]) => {
                            const photoUrl = toMediaUrl(photo);

                            return (
                              <a
                                href={photoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                key={labelKey}
                              >
                                <img
                                  src={photoUrl}
                                  alt={t(
                                    `complaintHistory.${labelKey}`
                                  )}
                                  loading="lazy"
                                />

                                <span>
                                  {t(`complaintHistory.${labelKey}`)}
                                </span>
                              </a>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="ch-event-no-evidence">
                          {t("complaintHistory.noWorkPhotos")}
                        </p>
                      )}
                    </div>
                  </div>
                </section>
              </div>
            </div>

            {/* Modal footer */}
            <div className="ch-modal-footer">
              <button
                className="ch-modal-close-btn"
                onClick={() => setSelectedEvent(null)}
              >
                {t("complaintHistory.close")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplaintHistory;
