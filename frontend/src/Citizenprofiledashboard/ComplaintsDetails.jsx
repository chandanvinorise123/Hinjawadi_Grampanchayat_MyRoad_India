import React, { useState, useMemo } from "react";
import "./ComplaintsDetails.css";

// ✅ HARDCODED MOCK DATA WITH FULL DETAILS
const mockComplaintDetails = [
  {
    id: "1",
    complaintNumber: "MRI-882910",
    category: "Road Issues",
    issue: "Large Pothole",
    date: "2026-10-01",
    location: "Camp Road Bus Stop",
    priority: "High",
    status: "Work Completed",
    description: "A massive pothole near the bus stop is causing traffic jams and damaging vehicles during the monsoon.",
    photos: { before: "pothole-before.jpg", after: "pothole-after.jpg", site: "pothole-site.jpg" },
    history: [
      { time: "Oct 01, 10:00 AM", action: "Complaint Registered", remarks: "Submitted by citizen via portal." },
      { time: "Oct 01, 02:30 PM", action: "Complaint Verified", remarks: "Verified by ward supervisor. Approved for action." },
      { time: "Oct 02, 09:00 AM", action: "Assigned to Staff", remarks: "Assigned to Field Officer R. Deshmukh." },
      { time: "Oct 03, 11:15 AM", action: "Work Completed", remarks: "Pothole filled with cold mix asphalt." }
    ],
    resolutionDetails: {
      resolvedBy: "R. Deshmukh (Field Officer)",
      resolutionDate: "2026-10-03",
      remarks: "Successfully repaired. Traffic flow restored. Awaiting final verification."
    }
  },
  {
    id: "2",
    complaintNumber: "MRI-773820",
    category: "Sanitation",
    issue: "Overflowing Garbage Bin",
    date: "2026-09-25",
    location: "Market Yard Junction",
    priority: "Medium",
    status: "Complaint Closed",
    description: "Community bin overflowing for three days, needs urgent clearing. Bad smell affecting nearby shops.",
    photos: { before: "bin-before.jpg", after: "bin-after.jpg", site: "bin-site.jpg" },
    history: [
      { time: "Sep 25, 08:00 AM", action: "Complaint Registered", remarks: "Submitted by citizen." },
      { time: "Sep 25, 04:00 PM", action: "Action Initiated", remarks: "Sanitation crew dispatched." },
      { time: "Sep 26, 10:00 AM", action: "Work Completed", remarks: "Bin cleared and area hosed down." },
      { time: "Sep 26, 02:00 PM", action: "Complaint Closed", remarks: "Verified by supervisor. Citizen notified." }
    ],
    resolutionDetails: {
      resolvedBy: "Sanitation Dept. Team B",
      resolutionDate: "2026-09-26",
      remarks: "Extra pickup scheduled twice a week for this junction to prevent future overflow."
    }
  },
  {
    id: "3",
    complaintNumber: "MRI-119283",
    category: "Drinking Water Issues",
    issue: "Pipeline Leakage",
    date: "2026-09-15",
    location: "Riverside Ward Pipeline",
    priority: "High",
    status: "Verification",
    description: "Water leaking continuously from an underground pipeline joint, wasting resources.",
    photos: { before: "leak-before.jpg", after: "leak-after.jpg" },
    history: [
      { time: "Sep 15, 09:30 AM", action: "Complaint Registered", remarks: "Submitted by citizen." },
      { time: "Sep 15, 01:00 PM", action: "Action Initiated", remarks: "Water supply temporarily halted for repair." },
      { time: "Sep 16, 11:00 AM", action: "Work Completed", remarks: "Joint resealed and pressure tested." }
    ],
    resolutionDetails: {
      resolvedBy: "Water Works Engineer",
      resolutionDate: "2026-09-16",
      remarks: "Leak fixed. Pressure normalized. Ready for verifier inspection."
    }
  }
];

const priorityTone = { High: "red", Medium: "amber", Low: "green" };
const statusToneMap = {
  "Complaint Registered": "amber",
  "Complaint Verified": "amber",
  "Assigned to Staff/Officer": "orange",
  "Action Initiated": "orange",
  "Work Completed": "orange",
  "Verification": "amber",
  "Complaint Closed": "green"
};

const ComplaintsDetails = ({ onBack }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedComplaint, setSelectedComplaint] = useState(null);

  const filteredComplaints = useMemo(() => {
    return mockComplaintDetails.filter((c) =>
      c.complaintNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.location.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  // Close modal on Escape key
  React.useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") setSelectedComplaint(null);
    };
    if (selectedComplaint) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "auto";
    };
  }, [selectedComplaint]);

  return (
    <div className="cdp-cd-page">
      {/* Header */}
      <div className="cdp-cd-header">
        <button className="cdp-back-btn" onClick={onBack}>← Back to Dashboard</button>
        <h1>Complaint Details</h1>
      </div>

      <div className="cdp-cd-content">
        <p className="cdp-cd-subtitle">View comprehensive information, history, and resolution details of your complaints.</p>

        {/* Search Bar */}
        <div className="cdp-cd-controls">
          <div className="cdp-cd-search">
            <span className="cdp-cd-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by complaint number, category, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Complaints Table */}
        <div className="cdp-cd-table-container">
          {filteredComplaints.length === 0 ? (
            <div className="cdp-cd-empty-state">
              <div className="cdp-cd-empty-icon">📭</div>
              <h4>No Complaints Found</h4>
              <p>Try adjusting your search criteria.</p>
            </div>
          ) : (
            <table className="cdp-cd-table">
              <thead>
                <tr>
                  <th>Complaint No.</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredComplaints.map((c) => (
                  <tr key={c.id} className="cdp-cd-row">
                    <td className="cdp-cd-mono">{c.complaintNumber}</td>
                    <td>{c.category}</td>
                    <td>
                      <span className={`cdp-cd-badge cdp-cd-badge-${priorityTone[c.priority]}`}>
                        {c.priority}
                      </span>
                    </td>
                    <td>{c.location}</td>
                    <td>
                      <span className={`cdp-cd-badge cdp-cd-badge-${statusToneMap[c.status]}`}>
                        {c.status}
                      </span>
                    </td>
                    <td>
                      <button className="cdp-cd-view-btn" onClick={() => setSelectedComplaint(c)}>
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

      {/* ✅ OVERLAY MODAL for Complete Complaint Details */}
      {selectedComplaint && (
        <div className="cdp-cd-modal-overlay" onClick={() => setSelectedComplaint(null)}>
          <div className="cdp-cd-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="cdp-cd-modal-header">
              <div>
                <span className="cdp-cd-modal-badge">Comprehensive Details</span>
                <h3>{selectedComplaint.complaintNumber}</h3>
              </div>
              <button className="cdp-cd-modal-close" onClick={() => setSelectedComplaint(null)}>✕</button>
            </div>

            <div className="cdp-cd-modal-body">
              {/* 1. Basic Info Grid */}
              <div className="cdp-cd-info-grid">
                <div className="cdp-cd-info-item"><span>Category</span><b>{selectedComplaint.category}</b></div>
                <div className="cdp-cd-info-item"><span>Priority</span><b className={`cdp-cd-text-${priorityTone[selectedComplaint.priority]}`}>{selectedComplaint.priority}</b></div>
                <div className="cdp-cd-info-item"><span>Current Status</span><b className={`cdp-cd-text-${statusToneMap[selectedComplaint.status]}`}>{selectedComplaint.status}</b></div>
                <div className="cdp-cd-info-item"><span>Date Submitted</span><b>{selectedComplaint.date}</b></div>
                <div className="cdp-cd-info-item" style={{ gridColumn: "1 / -1" }}><span>Location</span><b>📍 {selectedComplaint.location}</b></div>
              </div>

              {/* 2. Map Section */}
              <div className="cdp-cd-section">
                <h4>🗺️ Complaint Location</h4>
                <div className="cdp-cd-map-container">
                  <iframe 
                    width="100%" 
                    height="100%" 
                    frameBorder="0" 
                    scrolling="no" 
                    src="https://www.openstreetmap.org/export/embed.html?bbox=73.70%2C18.55%2C73.80%2C18.65&layer=mapnik&marker=18.5912%2C73.7389"
                    title="Complaint Location Map"
                  ></iframe>
                </div>
              </div>

              {/* 3. Description */}
              <div className="cdp-cd-section">
                <h4>📝 Issue Description</h4>
                <p className="cdp-cd-description">{selectedComplaint.description}</p>
              </div>

              {/* 4. Photo Gallery (Before/After/Site) */}
              {(selectedComplaint.photos?.before || selectedComplaint.photos?.after || selectedComplaint.photos?.site) && (
                <div className="cdp-cd-section">
                  <h4>📷 Photographic Evidence</h4>
                  <div className="cdp-cd-photo-grid">
                    {selectedComplaint.photos.before && (
                      <div className="cdp-cd-photo-card">
                        <span className="cdp-cd-photo-label">Before Repair</span>
                        <div className="cdp-cd-photo-placeholder">📷 {selectedComplaint.photos.before}</div>
                      </div>
                    )}
                    {selectedComplaint.photos.site && (
                      <div className="cdp-cd-photo-card">
                        <span className="cdp-cd-photo-label">Site Inspection</span>
                        <div className="cdp-cd-photo-placeholder">📷 {selectedComplaint.photos.site}</div>
                      </div>
                    )}
                    {selectedComplaint.photos.after && (
                      <div className="cdp-cd-photo-card">
                        <span className="cdp-cd-photo-label">After Repair</span>
                        <div className="cdp-cd-photo-placeholder">📷 {selectedComplaint.photos.after}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 5. History Timeline */}
              <div className="cdp-cd-section">
                <h4>🕘 Complaint History & Timeline</h4>
                <div className="cdp-cd-timeline">
                  {selectedComplaint.history.map((log, idx) => (
                    <div className="cdp-cd-timeline-item" key={idx}>
                      <div className="cdp-cd-timeline-dot"></div>
                      <div className="cdp-cd-timeline-content">
                        <div className="cdp-cd-timeline-header">
                          <span className="cdp-cd-timeline-action">{log.action}</span>
                          <span className="cdp-cd-timeline-time">{log.time}</span>
                        </div>
                        <p className="cdp-cd-timeline-remarks">{log.remarks}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 6. Resolution Details */}
              {selectedComplaint.resolutionDetails && (
                <div className="cdp-cd-section cdp-cd-resolution-section">
                  <h4>✅ Resolution Details</h4>
                  <div className="cdp-cd-resolution-grid">
                    <div><span>Resolved By:</span><strong>{selectedComplaint.resolutionDetails.resolvedBy}</strong></div>
                    <div><span>Resolution Date:</span><strong>{selectedComplaint.resolutionDetails.resolutionDate}</strong></div>
                    <div style={{ gridColumn: "1 / -1" }}><span>Final Remarks:</span><strong>{selectedComplaint.resolutionDetails.remarks}</strong></div>
                  </div>
                </div>
              )}
            </div>

            <div className="cdp-cd-modal-footer">
              <button className="cdp-cd-modal-close-btn" onClick={() => setSelectedComplaint(null)}>
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplaintsDetails;