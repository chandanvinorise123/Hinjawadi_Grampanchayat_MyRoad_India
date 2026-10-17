import React, { useState, useMemo } from "react";
import "./ComplaintsDetails.css";
import { toMediaUrl } from "../utils/dashboardApi";


const priorityTone = {
  Critical: "red",
  Urgent: "amber",
  Normal: "green",
  High: "red",
  Medium: "amber",
  Low: "green",
};
const statusToneMap = {
  New: "amber",
  Pending: "amber",
  Submitted: "amber",
  "Under Review": "amber",
  Verified: "amber",
  "Under Verification": "amber",
  Assigned: "orange",
  "Under Action": "orange",
  "In Progress": "orange",
  Resolved: "green",
  Closed: "green",
  "Complaint Registered": "amber",
  "Complaint Verified": "amber",
  "Assigned to Staff/Officer": "orange",
  "Action Initiated": "orange",
  "Work Completed": "orange",
  "Verification": "amber",
  "Complaint Closed": "green",
};

const ComplaintsDetails = ({ onBack, complaints = [] }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const complaintDetails = complaints.map((complaint) => ({
    ...complaint,
    imageUrls: Array.from(new Set([
      ...(Array.isArray(complaint.images) ? complaint.images : []),
      ...(Array.isArray(complaint.citizenPhotos) ? complaint.citizenPhotos : []),
      ...(complaint.photos && typeof complaint.photos === "object"
        ? Object.values(complaint.photos)
        : []),
    ].filter((image) => typeof image === "string" && image.trim()))),
    history: (complaint.statusHistory || []).map((entry) => ({
      time: entry.updatedAt ? new Date(entry.updatedAt).toLocaleString() : "",
      action: entry.status,
      remarks: entry.remarks || "",
    })),
  }));

  const filteredComplaints = useMemo(() => {
    return complaintDetails.filter((c) =>
      c.complaintNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.location.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [complaints, searchTerm]);

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
                    src={selectedComplaint.coordinates
                      ? `https://www.openstreetmap.org/export/embed.html?bbox=${selectedComplaint.coordinates.longitude - 0.02}%2C${selectedComplaint.coordinates.latitude - 0.02}%2C${selectedComplaint.coordinates.longitude + 0.02}%2C${selectedComplaint.coordinates.latitude + 0.02}&layer=mapnik&marker=${selectedComplaint.coordinates.latitude}%2C${selectedComplaint.coordinates.longitude}`
                      : undefined}
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
              {selectedComplaint.imageUrls.length > 0 && (
                <div className="cdp-cd-section">
                  <h4>📷 Photographic Evidence</h4>
                  <div className="cdp-cd-photo-grid">
                    {selectedComplaint.imageUrls.map((image, index) => (
                      <div className="cdp-cd-photo-card" key={image}>
                        <span className="cdp-cd-photo-label">Complaint Photo {index + 1}</span>
                        <img
                          className="cdp-cd-photo-image"
                          src={toMediaUrl(image)}
                          alt={`Complaint evidence ${index + 1}`}
                          loading="lazy"
                        />
                      </div>
                    ))}
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