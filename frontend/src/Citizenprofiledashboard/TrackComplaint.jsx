import React, { useState } from "react";
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

const stageTone = ["amber", "amber", "orange", "orange", "orange", "amber", "green"];

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
  return statusMap[String(status || "").trim().toLowerCase()] ?? 0;
};

const TrackComplaint = ({ onBack, initialComplaintId = "" }) => {
  const [trackId, setTrackId] = useState(initialComplaintId);
  const [trackedComplaint, setTrackedComplaint] = useState(null);
  const [error, setError] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(false);

  const trackComplaint = async (complaintNumber) => {
    setError("");
    setTrackedComplaint(null);
    setShowDetails(false);
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/complaints/track/${encodeURIComponent(complaintNumber.trim())}`);
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Complaint not found");
      const complaint = result.data;
      setTrackedComplaint({
        ...complaint,
        issue: complaint.issue || complaint.issueType || "General Issue",
        stage: getStageFromStatus(complaint.status),
        date: complaint.date || (complaint.createdAt ? new Date(complaint.createdAt).toISOString().slice(0, 10) : ""),
        updates: (complaint.statusHistory || []).map((entry) => ({
          time: entry.updatedAt ? new Date(entry.updatedAt).toLocaleString() : "",
          text: entry.remarks || `Complaint status changed to ${entry.status}`,
        })),
      });
    } catch (trackError) {
      setError(trackError.message || "Complaint not found. Please check the ID and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleTrack = (event) => {
    event.preventDefault();
    trackComplaint(trackId);
  };

  React.useEffect(() => {
    if (initialComplaintId.trim()) {
      trackComplaint(initialComplaintId);
    }
  }, [initialComplaintId]);

  // Close modal on Escape key
  React.useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") setShowDetails(false);
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
      {/* Header */}
      <div className="cdp-tc-header">
        <button className="cdp-back-btn" onClick={onBack}>
          ← Back to Dashboard
        </button>
        <h1>Track Complaint</h1>
      </div>

      <div className="cdp-tc-content">
        <p className="cdp-tc-subtitle">
          Enter your complaint ID below to check its real-time status and progress.
        </p>

        {/* Search Bar */}
        <form className="cdp-tc-search-form" onSubmit={handleTrack}>
          <div className="cdp-tc-input-wrapper">
            <span className="cdp-tc-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Enter complaint ID"
              value={trackId}
              onChange={(e) => setTrackId(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="cdp-tc-track-btn" disabled={loading}>
            {loading ? "Tracking..." : "Track Status"}
          </button>
        </form>

        {error && <div className="cdp-tc-error">{error}</div>}

        {/* Result Card */}
        {trackedComplaint && !showDetails && (
          <div className="cdp-tc-result-card">
            <div className="cdp-tc-result-header">
              <div>
                <span className="cdp-tc-label">Complaint ID</span>
                <h3>{trackedComplaint.complaintNumber}</h3>
              </div>
              <span className={`cdp-tc-badge cdp-tc-badge-${stageTone[trackedComplaint.stage]}`}>
                {lifecycleStages[trackedComplaint.stage]}
              </span>
            </div>

            {/* Lifecycle Progress Bar */}
            <div className="cdp-tc-lifecycle">
              {lifecycleStages.map((stage, index) => (
                <div className="cdp-tc-lc-item" key={stage}>
                  <div
                    className={`cdp-tc-lc-dot ${
                      index < trackedComplaint.stage
                        ? "done"
                        : index === trackedComplaint.stage
                        ? "current"
                        : "pending"
                    }`}
                  >
                    {index < trackedComplaint.stage ? "✓" : index + 1}
                  </div>
                  <span className="cdp-tc-lc-label">{stage}</span>
                  {index < lifecycleStages.length - 1 && (
                    <div
                      className={`cdp-tc-lc-line ${
                        index < trackedComplaint.stage ? "done" : "pending"
                      }`}
                    ></div>
                  )}
                </div>
              ))}
            </div>

            <div className="cdp-tc-result-actions">
              <button
                className="cdp-tc-view-btn"
                onClick={() => setShowDetails(true)}
              >
                View Full Details & Updates
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ✅ OVERLAY MODAL for Complete Details */}
      {showDetails && trackedComplaint && (
        <div className="cdp-tc-modal-overlay" onClick={() => setShowDetails(false)}>
          <div className="cdp-tc-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="cdp-tc-modal-header">
              <div>
                <span className="cdp-tc-modal-badge">Tracking Details</span>
                <h3>{trackedComplaint.complaintNumber}</h3>
              </div>
              <button className="cdp-tc-modal-close" onClick={() => setShowDetails(false)}>
                ✕
              </button>
            </div>

            <div className="cdp-tc-modal-body">
              {/* Info Grid */}
              <div className="cdp-tc-modal-info-grid">
                <div className="cdp-tc-info-item">
                  <span>Category</span>
                  <b>{trackedComplaint.category}</b>
                </div>
                <div className="cdp-tc-info-item">
                  <span>Specific Issue</span>
                  <b>{trackedComplaint.issue}</b>
                </div>
                <div className="cdp-tc-info-item">
                  <span>Location</span>
                  <b>{trackedComplaint.location}</b>
                </div>
                <div className="cdp-tc-info-item">
                  <span>Date Submitted</span>
                  <b>{trackedComplaint.date}</b>
                </div>
              </div>

              {/* Description */}
              <div className="cdp-tc-modal-section">
                <h4>📝 Issue Description</h4>
                <p className="cdp-tc-modal-desc">{trackedComplaint.description}</p>
              </div>

              {/* Latest Updates & Remarks */}
              <div className="cdp-tc-modal-section">
                <h4>🕘 Latest Updates & Remarks</h4>
                <div className="cdp-tc-updates-list">
                  {trackedComplaint.updates && trackedComplaint.updates.length > 0 ? (
                    trackedComplaint.updates.map((update, idx) => (
                      <div className="cdp-tc-update-item" key={idx}>
                        <div className="cdp-tc-update-dot"></div>
                        <div className="cdp-tc-update-content">
                          <span className="cdp-tc-update-time">{update.time}</span>
                          <p className="cdp-tc-update-text">{update.text}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="cdp-tc-no-updates">No recent updates available.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="cdp-tc-modal-footer">
              <button className="cdp-tc-modal-close-btn" onClick={() => setShowDetails(false)}>
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrackComplaint;