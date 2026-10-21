import React, { useState, useMemo, useEffect, useRef } from "react";
import "./ComplaintHistory.css";
import StaffComplaintDetails from "./StaffComplaintDetails";
import { toMediaUrl } from "../utils/dashboardApi";

const ComplaintHistory = ({ complaints, onBack }) => {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [filterType, setFilterType] = useState("All");
  const modalRef = useRef(null);

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") setSelectedEvent(null);
    };
    if (selectedEvent) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden"; // Prevent background scrolling
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "auto";
    };
  }, [selectedEvent]);

  // Close modal when clicking outside
  const handleBackdropClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      setSelectedEvent(null);
    }
  };

  // 1. Calculate Overview Stats
  const stats = useMemo(() => ({
    totalAssigned: complaints.length,
    solved: complaints.filter((c) => c.stage === 5).length,
    inProgress: complaints.filter((c) => c.stage > 0 && c.stage < 5).length,
    pending: complaints.filter((c) => c.stage === 0).length,
  }), [complaints]);

  // 2. Generate Flat History Log from Complaints
  const historyLog = useMemo(() => {
    const log = [];
    complaints.forEach((c) => {
      const events = Array.isArray(c.log) ? c.log : [];
      if (!events.length) {
        log.push({
          id: `${c.id}-submitted`,
          complaintNumber: c.complaintNumber,
          issue: c.issue,
          type: "Submitted",
          date: c.createdAt ? new Date(c.createdAt).toLocaleString() : "Time not recorded",
          timestamp: c.createdAt ? new Date(c.createdAt).getTime() : 0,
          description: `Complaint submitted for ${c.location || "the recorded location"}.`,
          complaintRef: c,
        });
        return;
      }
      events.forEach((event, index) => {
        const actor = String(event.actor || "Dashboard");
        const normalizedActor = actor.toLowerCase();
        const type = normalizedActor.includes("admin")
          ? "Admin Update"
          : normalizedActor.includes("verifier")
            ? "Verification"
            : normalizedActor.includes("staff")
              ? "Work Update"
              : "Status Change";
        const timestamp = event.time ? new Date(event.time).getTime() : 0;
        log.push({
          id: `${c.id}-event-${index}`,
          complaintNumber: c.complaintNumber,
          issue: c.issue,
          actor,
          type,
          date: timestamp ? new Date(timestamp).toLocaleString() : "Time not recorded",
          timestamp,
          description: event.text || "Complaint activity updated.",
          complaintRef: c,
        });
      });
    });
    return log.sort((a, b) => b.timestamp - a.timestamp);
  }, [complaints]);

  const filteredLog = filterType === "All" 
    ? historyLog 
    : historyLog.filter((e) => e.type === filterType);

  const getTypeBadgeClass = (type) => {
    switch (type) {
      case "Assignment": return "ch-badge-navy";
      case "Admin Update": return "ch-badge-navy";
      case "Verification": return "ch-badge-red";
      case "Work Update": return "ch-badge-blue";
      case "Submitted": return "ch-badge-navy";
      case "Status Change": return "ch-badge-amber";
      case "Inspection": return "ch-badge-blue";
      case "Action Taken": return "ch-badge-green";
      default: return "ch-badge-gray";
    }
  };

  return (
    <div className="ch-shell">
      {/* Header */}
      <div className="ch-header">
        <button className="ch-back-btn" onClick={onBack}>← Back to Dashboard</button>
        <h2>Complaint History & Logs</h2>
      </div>

      <div className="ch-container">
        {/* Overview cards stay above the history table. */}
        <div className="ch-stats-row">
          <div className="ch-stat-card ch-stat-navy">
            <div className="ch-stat-num">{stats.totalAssigned}</div>
            <div className="ch-stat-label">Total Assigned</div>
          </div>
          <div className="ch-stat-card ch-stat-green">
            <div className="ch-stat-num">{stats.solved}</div>
            <div className="ch-stat-label">Solved / Closed</div>
          </div>
          <div className="ch-stat-card ch-stat-orange">
            <div className="ch-stat-num">{stats.inProgress}</div>
            <div className="ch-stat-label">In Progress</div>
          </div>
          <div className="ch-stat-card ch-stat-amber">
            <div className="ch-stat-num">{stats.pending}</div>
            <div className="ch-stat-label">Pending Action</div>
          </div>
        </div>

        {/* 2. History Table */}
        <div className="ch-table-card">
          <div className="ch-table-header">
            <h3>Activity History Log</h3>
            <div className="ch-filters">
              {["All", "Submitted", "Admin Update", "Status Change", "Work Update", "Verification"].map((type) => (
                <button
                  key={type}
                  className={`ch-filter-btn ${filterType === type ? "active" : ""}`}
                  onClick={() => setFilterType(type)}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="ch-table-wrap">
            <table className="ch-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Complaint No.</th>
                  <th>Update Type</th>
                  <th>Updated By</th>
                  <th>Description / Remarks</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredLog.length ? filteredLog.map((event) => (
                  <tr key={event.id}>
                    <td className="ch-mono">{event.date}</td>
                    <td className="ch-mono ch-complaint-link">{event.complaintNumber}</td>
                    <td>
                      <span className={`ch-badge ${getTypeBadgeClass(event.type)}`}>
                        {event.type}
                      </span>
                    </td>
                    <td>{event.actor || "Dashboard"}</td>
                    <td className="ch-desc">{event.description}</td>
                    <td>
                      <button 
                        className="ch-view-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvent(event);
                        }}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td className="ch-empty-row" colSpan="6">No complaint history matches this filter.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ✅ 3. OVERLAY MODAL - Shows when View Details is clicked */}
      {selectedEvent && (
        <div className="ch-modal-overlay" onClick={handleBackdropClick}>
          <div className="ch-modal-content" ref={modalRef}>
            {/* Modal Header */}
            <div className="ch-modal-header">
              <h3>
                Details: {selectedEvent.complaintNumber} - {selectedEvent.issue}
              </h3>
              <button 
                className="ch-modal-close" 
                onClick={() => setSelectedEvent(null)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="ch-modal-body">
              <div className="ch-detail-layout">
                <section className="ch-detail-panel">
                  <header className="ch-detail-panel-heading">
                    <span className="ch-eyebrow">Original report</span>
                    <h4>Complaint Information</h4>
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
                    <span className="ch-eyebrow">Timeline entry</span>
                    <h4>{selectedEvent.type} Details</h4>
                  </header>
                  <div className="ch-event-information">
                    <dl className="ch-event-facts">
                      <div><dt>Recorded by</dt><dd>{selectedEvent.actor || "Dashboard"}</dd></div>
                      <div><dt>Date recorded</dt><dd>{selectedEvent.date}</dd></div>
                      <div><dt>Current complaint status</dt><dd>{selectedEvent.complaintRef.status || "Not recorded"}</dd></div>
                      <div className="ch-event-wide"><dt>History update</dt><dd>{selectedEvent.description}</dd></div>
                      <div className="ch-event-wide"><dt>Staff work performed</dt><dd>{selectedEvent.complaintRef.inspection?.actionTaken || "No staff work details recorded."}</dd></div>
                      <div className="ch-event-wide"><dt>Staff remarks</dt><dd>{selectedEvent.complaintRef.inspection?.remarks || "No staff remarks recorded."}</dd></div>
                      <div><dt>Inspection date</dt><dd>{selectedEvent.complaintRef.inspection?.inspectionDate ? new Date(selectedEvent.complaintRef.inspection.inspectionDate).toLocaleString() : "Not recorded"}</dd></div>
                      <div><dt>Completion date</dt><dd>{selectedEvent.complaintRef.inspection?.completionDate ? new Date(selectedEvent.complaintRef.inspection.completionDate).toLocaleString() : "Not recorded"}</dd></div>
                    </dl>
                    <div className="ch-event-evidence">
                      <h5>Work Evidence</h5>
                      {[
                        ["Before / Site", selectedEvent.complaintRef.inspection?.sitePhoto || selectedEvent.complaintRef.photos?.site],
                        ["After Work", selectedEvent.complaintRef.inspection?.completionPhoto || selectedEvent.complaintRef.photos?.after],
                      ].some(([, photo]) => photo) ? (
                        <div className="ch-event-photos">
                          {[
                            ["Before / Site", selectedEvent.complaintRef.inspection?.sitePhoto || selectedEvent.complaintRef.photos?.site],
                            ["After Work", selectedEvent.complaintRef.inspection?.completionPhoto || selectedEvent.complaintRef.photos?.after],
                          ].filter(([, photo]) => photo).map(([label, photo]) => (
                            <a href={toMediaUrl(photo)} target="_blank" rel="noopener noreferrer" key={label}>
                              <img src={toMediaUrl(photo)} alt={label} loading="lazy" />
                              <span>{label}</span>
                            </a>
                          ))}
                        </div>
                      ) : <p className="ch-event-no-evidence">No staff work photographs attached.</p>}
                    </div>
                  </div>
                </section>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="ch-modal-footer">
              <button 
                className="ch-modal-close-btn" 
                onClick={() => setSelectedEvent(null)}
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

export default ComplaintHistory;