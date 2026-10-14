import React, { useState } from "react";
import "./TrackComplaint.css";

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

// ✅ HARDCODED MOCK DATA FOR TRACKING
const mockTrackData = [
  {
    id: "1",
    complaintNumber: "MRI-882910",
    category: "Road Issues",
    issue: "Large Pothole",
    date: "2026-10-01",
    location: "Camp Road Bus Stop",
    stage: 3, // Action Initiated
    description: "A massive pothole near the bus stop is causing traffic jams.",
    updates: [
      { time: "2 hours ago", text: "Staff has initiated repair work and requested asphalt materials." },
      { time: "1 day ago", text: "Complaint assigned to Field Officer R. Deshmukh." },
      { time: "2 days ago", text: "Complaint verified by the ward supervisor." },
    ],
  },
  {
    id: "2",
    complaintNumber: "MRI-773820",
    category: "Sanitation",
    issue: "Overflowing Garbage Bin",
    date: "2026-09-25",
    location: "Market Yard Junction",
    stage: 5, // Verification
    description: "Community bin overflowing for three days.",
    updates: [
      { time: "5 hours ago", text: "Work completed. Awaiting verifier approval." },
      { time: "1 day ago", text: "Extra pickup scheduled twice a week for this junction." },
    ],
  },
  {
    id: "3",
    complaintNumber: "MRI-119283",
    category: "Drinking Water Issues",
    issue: "Pipeline Leakage",
    date: "2026-09-15",
    location: "Riverside Ward Pipeline",
    stage: 6, // Closed
    description: "Water leaking continuously from an underground pipeline joint.",
    updates: [
      { time: "2 days ago", text: "Complaint successfully closed. Citizen notified." },
      { time: "3 days ago", text: "Verifier approved the completed repair work." },
    ],
  },
];

const TrackComplaint = ({ onBack }) => {
  const [trackId, setTrackId] = useState("");
  const [trackedComplaint, setTrackedComplaint] = useState(null);
  const [error, setError] = useState("");
  const [showDetails, setShowDetails] = useState(false);

  const handleTrack = (e) => {
    e.preventDefault();
    setError("");
    setTrackedComplaint(null);
    setShowDetails(false);

    const found = mockTrackData.find(
      (c) => c.complaintNumber.toLowerCase() === trackId.trim().toLowerCase()
    );

    if (found) {
      setTrackedComplaint(found);
    } else {
      setError("Complaint not found. Please check the ID and try again.");
    }
  };

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
              placeholder="Enter Complaint ID (e.g., MRI-882910)"
              value={trackId}
              onChange={(e) => setTrackId(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="cdp-tc-track-btn">
            Track Status
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