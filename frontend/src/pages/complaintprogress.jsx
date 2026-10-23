import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { API_BASE_URL } from "../utils/dashboardApi";
import "./complaintprogress.css";

const fetchComplaintByNumber = async (complaintNumber) => {
  const response = await fetch(
    `${API_BASE_URL}/complaints/track/${encodeURIComponent(complaintNumber)}`
  );
  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.message || "Complaint not found. Please check the ID.");
  }
  return result.data;
};

const getStatusUpdates = (complaint) => {
  const updates = [...(complaint.statusHistory || [])];
  const firstUpdate = updates[0];

  if (firstUpdate?.status !== "New") {
    updates.unshift({
      status: "New",
      remarks: "Complaint registered",
      updatedAt: complaint.createdAt,
    });
  }

  const latestUpdate = updates[updates.length - 1];
  if (complaint.status && latestUpdate?.status !== complaint.status) {
    updates.push({
      status: complaint.status,
      remarks: complaint.remarks || "",
      updatedAt: complaint.updatedAt,
    });
  }

  return updates;
};

const ComplaintProgress = ({ isOverlay = false }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [trackId, setTrackId] = useState(
    location.state?.trackComplaintNumber || ""
  );
  const [trackedComplaint, setTrackedComplaint] = useState(null);
  const [trackError, setTrackError] = useState("");
  const [trackLoading, setTrackLoading] = useState(
    Boolean(location.state?.trackComplaintNumber)
  );

  const handleTrackComplaint = async (complaintNumber) => {
    const requestedId = String(complaintNumber || "").trim();
    if (!requestedId) {
      setTrackError("Enter a complaint number to track.");
      setTrackedComplaint(null);
      return;
    }

    setTrackId(requestedId);
    setTrackLoading(true);
    setTrackError("");
    setTrackedComplaint(null);
    try {
      setTrackedComplaint(await fetchComplaintByNumber(requestedId));
    } catch (error) {
      console.error("Track complaint error:", error);
      setTrackError(error.message || "Unable to track this complaint.");
    } finally {
      setTrackLoading(false);
    }
  };

  useEffect(() => {
    const complaintNumber = location.state?.trackComplaintNumber;
    if (!complaintNumber) return undefined;
    let isCurrentRequest = true;

    fetchComplaintByNumber(String(complaintNumber).trim())
      .then((complaint) => {
        if (isCurrentRequest) setTrackedComplaint(complaint);
      })
      .catch((error) => {
        console.error("Track complaint error:", error);
        if (isCurrentRequest) {
          setTrackError(error.message || "Unable to track this complaint.");
        }
      })
      .finally(() => {
        if (isCurrentRequest) setTrackLoading(false);
      });

    return () => {
      isCurrentRequest = false;
    };
  }, [location.state]);

  useEffect(() => {
    if (!isOverlay) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event) => {
      if (event.key === "Escape") navigate(-1);
    };
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOverlay, navigate]);

  const submitComplaintTracking = (event) => {
    event.preventDefault();
    handleTrackComplaint(trackId);
  };

  const statusUpdates = trackedComplaint
    ? getStatusUpdates(trackedComplaint)
    : [];

  return (
    <main
      className={`complaint-progress-page${isOverlay ? " is-overlay" : ""}`}
      role={isOverlay ? "dialog" : undefined}
      aria-modal={isOverlay ? "true" : undefined}
      aria-label={isOverlay ? "Complaint progress" : undefined}
    >
      <header className="complaint-progress-header">
        <h1>Complaint Progress</h1>
        <button
          className="complaint-progress-close"
          type="button"
          aria-label={isOverlay ? "Close complaint progress" : "Return to home"}
          onClick={() =>
            isOverlay ? navigate(-1) : navigate("/", { replace: true })
          }
        >
          ×
        </button>
      </header>
      <div className={`complaint-progress-shell${isOverlay ? " is-status-only" : ""}`}>
        {!isOverlay && (
          <section className="complaint-progress-card complaint-progress-form-card">
            <div className="complaint-progress-icon" aria-hidden="true">🔍</div>
            <h2>{t("home.trackYourComplaint")}</h2>
            <p>{t("home.trackDescription")}</p>
            <form className="complaint-progress-form" onSubmit={submitComplaintTracking}>
              <label className="sr-only" htmlFor="progress-track-id">
                {t("home.complaintNumber")}
              </label>
              <input
                id="progress-track-id"
                type="text"
                placeholder={t("home.complaintPlaceholder")}
                value={trackId}
                onChange={(event) => {
                  setTrackId(event.target.value);
                  setTrackError("");
                }}
                required
              />
              <button type="submit" disabled={trackLoading}>
                {trackLoading ? "Tracking..." : t("home.trackStatus")}
              </button>
            </form>
            <button
              className="complaint-progress-guest-button"
              type="button"
              onClick={() => navigate("/guest-details")}
            >
              {t("home.guestDetailsButton")}
            </button>
            {trackError && <p className="complaint-progress-error" role="alert">{trackError}</p>}
          </section>
        )}

        <section className="complaint-progress-card complaint-progress-result-card">
          {trackedComplaint ? (
            <>
              <div className="complaint-progress-result-heading">
                <strong>{trackedComplaint.complaintNumber}</strong>
                <span>{trackedComplaint.status || "New"}</span>
              </div>
              <p>{trackedComplaint.category} · {trackedComplaint.issueType}</p>
              <p>{trackedComplaint.location}</p>
              <div className="complaint-progress-updates">
                <strong>Work updates</strong>
                {statusUpdates.length > 0 ? (
                  statusUpdates.map((update, index) => (
                    <div
                      className={`complaint-progress-update${index === statusUpdates.length - 1 ? " is-current" : ""}`}
                      key={`${update.updatedAt || update.status}-${index}`}
                    >
                      <span className="complaint-progress-dot" />
                      <div>
                        <strong>{update.status}</strong>
                        {update.updatedAt && (
                          <span>{new Date(update.updatedAt).toLocaleString()}</span>
                        )}
                        {update.remarks && <span>{update.remarks}</span>}
                      </div>
                    </div>
                  ))
                ) : (
                  <p>No status updates are available yet.</p>
                )}
              </div>
            </>
          ) : (
            <div className="complaint-progress-result-heading">
              <strong>Complaint progress</strong>
              <span>{trackLoading ? "Loading updates..." : "Enter a complaint number to view updates"}</span>
            </div>
          )}
        </section>
      </div>
    </main>
  );
};

export default ComplaintProgress;
