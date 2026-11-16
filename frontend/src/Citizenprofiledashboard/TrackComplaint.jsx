
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import "./TrackComplaint.css";
import { API_BASE_URL } from "../utils/dashboardApi";

const lifecycleStages = [
  "Registered",
  "Verified",
  "Assigned",
  "Action Initiated",
  "Work Completed",
  "Verification",
  "Closed",
];

const stageTone = [
  "amber",
  "amber",
  "orange",
  "orange",
  "orange",
  "amber",
  "green",
];

const getStageFromStatus = (status) => {
  const statusMap = {
    new: 0,
    pending: 0,
    submitted: 0,
    "under review": 0,
    registered: 0,
    "complaint registered": 0,
    "under verification": 1,
    verified: 1,
    "complaint verified": 1,
    assigned: 2,
    "assigned to staff/officer": 2,
    "assigned to staff": 2,
    "assigned to officer": 2,
    "action initiated": 3,
    "under action": 3,
    "in progress": 3,
    "work completed": 4,
    completed: 4,
    verification: 5,
    resolved: 5,
    closed: 6,
    "complaint closed": 6,
  };

  return (
    statusMap[String(status || "").trim().toLowerCase()] ?? 0
  );
};

const TrackComplaint = ({
  onBack,
  initialComplaintId = "",
}) => {
  const { t, i18n } = useTranslation();

  const [trackId, setTrackId] = useState(initialComplaintId);
  const [trackedComplaint, setTrackedComplaint] = useState(null);
  const [error, setError] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(false);

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

  const formatDate = (date) => {
    if (!date) return "";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return date;
    }

    return parsedDate.toLocaleDateString(
      localeMap[language] || "en-IN"
    );
  };

  const formatDateTime = (date) => {
    if (!date) return "";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "";
    }

    return parsedDate.toLocaleString(
      localeMap[language] || "en-IN"
    );
  };

  const getStageLabel = (stage) => {
    const stageKeys = [
      "registered",
      "verified",
      "assigned",
      "actionInitiated",
      "workCompleted",
      "verification",
      "closed",
    ];

    return t(`trackComplaint.stages.${stageKeys[stage]}`);
  };

  const translateStatus = (status) => {
    const normalized = String(status || "")
      .trim()
      .toLowerCase();

    const statusKeys = {
      new: "registered",
      pending: "registered",
      submitted: "registered",
      "under review": "registered",
      registered: "registered",
      "complaint registered": "registered",

      "under verification": "verified",
      verified: "verified",
      "complaint verified": "verified",

      assigned: "assigned",
      "assigned to staff/officer": "assigned",
      "assigned to staff": "assigned",
      "assigned to officer": "assigned",

      "action initiated": "actionInitiated",
      "under action": "actionInitiated",
      "in progress": "actionInitiated",

      "work completed": "workCompleted",
      completed: "workCompleted",

      verification: "verification",
      resolved: "verification",

      closed: "closed",
      "complaint closed": "closed",
    };

    const key = statusKeys[normalized];

    return key
      ? t(`trackComplaint.stages.${key}`)
      : status || t("trackComplaint.unknownStatus");
  };

  const trackComplaint = async (complaintNumber) => {
    if (!complaintNumber.trim()) {
      setError(t("trackComplaint.enterComplaintId"));
      setTrackedComplaint(null);
      setShowDetails(false);
      return;
    }

    setError("");
    setTrackedComplaint(null);
    setShowDetails(false);
    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/complaints/track/${encodeURIComponent(
          complaintNumber.trim()
        )}`
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            t("trackComplaint.complaintNotFound")
        );
      }

      const complaint = result.data;

      setTrackedComplaint({
        ...complaint,
        issue:
          complaint.issue ||
          complaint.issueType ||
          t("trackComplaint.generalIssue"),
        stage: getStageFromStatus(complaint.status),
        date:
          complaint.date ||
          (complaint.createdAt
            ? new Date(complaint.createdAt)
                .toISOString()
                .slice(0, 10)
            : ""),
        updates: (complaint.statusHistory || []).map(
          (entry) => ({
            time: entry.updatedAt
              ? formatDateTime(entry.updatedAt)
              : "",
            text:
              entry.remarks ||
              t("trackComplaint.statusChanged", {
                status: translateStatus(entry.status),
              }),
          })
        ),
      });
    } catch (trackError) {
      setError(
        trackError.message ||
          t("trackComplaint.trackError")
      );
    } finally {
      setLoading(false);
    }
  };

  const handleTrack = (event) => {
    event.preventDefault();
    trackComplaint(trackId);
  };

  useEffect(() => {
    setTrackId(initialComplaintId);

    if (initialComplaintId.trim()) {
      trackComplaint(initialComplaintId);
    }
  }, [initialComplaintId]);

  // Close modal on Escape key.
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setShowDetails(false);
      }
    };

    if (showDetails) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "auto";
    };
  }, [showDetails]);

  return (
    <div className="cdp-tc-page">
      <div className="cdp-tc-header">
        <button
          className="cdp-back-btn"
          onClick={onBack}
        >
          ← {t("trackComplaint.backToDashboard")}
        </button>

        <h1>{t("trackComplaint.title")}</h1>
      </div>

      <div className="cdp-tc-content">
        <p className="cdp-tc-subtitle">
          {t("trackComplaint.subtitle")}
        </p>

        <form
          className="cdp-tc-search-form"
          onSubmit={handleTrack}
        >
          <div className="cdp-tc-input-wrapper">
            <span className="cdp-tc-search-icon">🔍</span>

            <input
              type="text"
              placeholder={t(
                "trackComplaint.complaintIdPlaceholder"
              )}
              value={trackId}
              onChange={(event) =>
                setTrackId(event.target.value)
              }
              required
            />
          </div>

          <button
            type="submit"
            className="cdp-tc-track-btn"
            disabled={loading}
          >
            {loading
              ? t("trackComplaint.tracking")
              : t("trackComplaint.trackStatus")}
          </button>
        </form>

        {error && (
          <div className="cdp-tc-error">{error}</div>
        )}

        {trackedComplaint && !showDetails && (
          <div className="cdp-tc-result-card">
            <div className="cdp-tc-result-header">
              <div>
                <span className="cdp-tc-label">
                  {t("trackComplaint.complaintId")}
                </span>

                <h3>{trackedComplaint.complaintNumber}</h3>
              </div>

              <span
                className={`cdp-tc-badge cdp-tc-badge-${
                  stageTone[trackedComplaint.stage]
                }`}
              >
                {getStageLabel(trackedComplaint.stage)}
              </span>
            </div>

            <div className="cdp-tc-lifecycle">
              {lifecycleStages.map((stage, index) => (
                <div
                  className="cdp-tc-lc-item"
                  key={stage}
                >
                  <div
                    className={`cdp-tc-lc-dot ${
                      index < trackedComplaint.stage
                        ? "done"
                        : index === trackedComplaint.stage
                        ? "current"
                        : "pending"
                    }`}
                  >
                    {index < trackedComplaint.stage
                      ? "✓"
                      : index + 1}
                  </div>

                  <span className="cdp-tc-lc-label">
                    {getStageLabel(index)}
                  </span>

                  {index < lifecycleStages.length - 1 && (
                    <div
                      className={`cdp-tc-lc-line ${
                        index < trackedComplaint.stage
                          ? "done"
                          : "pending"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="cdp-tc-result-actions">
              <button
                className="cdp-tc-view-btn"
                onClick={() => setShowDetails(true)}
              >
                {t("trackComplaint.viewFullDetails")}
              </button>
            </div>
          </div>
        )}
      </div>

      {showDetails && trackedComplaint && (
        <div
          className="cdp-tc-modal-overlay"
          onClick={() => setShowDetails(false)}
        >
          <div
            className="cdp-tc-modal-content"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="cdp-tc-modal-header">
              <div>
                <span className="cdp-tc-modal-badge">
                  {t("trackComplaint.trackingDetails")}
                </span>

                <h3>{trackedComplaint.complaintNumber}</h3>
              </div>

              <button
                className="cdp-tc-modal-close"
                aria-label={t("trackComplaint.closeDetails")}
                onClick={() => setShowDetails(false)}
              >
                ✕
              </button>
            </div>

            <div className="cdp-tc-modal-body">
              <div className="cdp-tc-modal-info-grid">
                <div className="cdp-tc-info-item">
                  <span>{t("trackComplaint.category")}</span>
                  <b>
                    {trackedComplaint.category ||
                      t("trackComplaint.notAvailable")}
                  </b>
                </div>

                <div className="cdp-tc-info-item">
                  <span>{t("trackComplaint.specificIssue")}</span>
                  <b>{trackedComplaint.issue}</b>
                </div>

                <div className="cdp-tc-info-item">
                  <span>{t("trackComplaint.location")}</span>
                  <b>
                    {trackedComplaint.location ||
                      t("trackComplaint.notAvailable")}
                  </b>
                </div>

                <div className="cdp-tc-info-item">
                  <span>{t("trackComplaint.dateSubmitted")}</span>
                  <b>{formatDate(trackedComplaint.date)}</b>
                </div>
              </div>

              <div className="cdp-tc-modal-section">
                <h4>
                  📝 {t("trackComplaint.issueDescription")}
                </h4>

                <p className="cdp-tc-modal-desc">
                  {trackedComplaint.description ||
                    t("trackComplaint.noDescription")}
                </p>
              </div>

              <div className="cdp-tc-modal-section">
                <h4>
                  🕘 {t("trackComplaint.latestUpdates")}
                </h4>

                <div className="cdp-tc-updates-list">
                  {trackedComplaint.updates &&
                  trackedComplaint.updates.length > 0 ? (
                    trackedComplaint.updates.map(
                      (update, index) => (
                        <div
                          className="cdp-tc-update-item"
                          key={index}
                        >
                          <div className="cdp-tc-update-dot" />

                          <div className="cdp-tc-update-content">
                            <span className="cdp-tc-update-time">
                              {update.time}
                            </span>

                            <p className="cdp-tc-update-text">
                              {update.text}
                            </p>
                          </div>
                        </div>
                      )
                    )
                  ) : (
                    <p className="cdp-tc-no-updates">
                      {t("trackComplaint.noUpdates")}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="cdp-tc-modal-footer">
              <button
                className="cdp-tc-modal-close-btn"
                onClick={() => setShowDetails(false)}
              >
                {t("trackComplaint.closeDetails")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrackComplaint;
