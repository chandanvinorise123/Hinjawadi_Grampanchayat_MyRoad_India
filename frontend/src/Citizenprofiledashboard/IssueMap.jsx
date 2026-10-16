import React, { useState, useEffect } from "react";
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from "@react-google-maps/api";
import "./IssueMap.css";

const GOOGLE_MAPS_LIBRARIES = ["places"];

const statusToneMap = {
  "Complaint Registered": "amber",
  "Complaint Verified": "amber",
  "Assigned to Staff/Officer": "orange",
  "Action Initiated": "orange",
  "Work Completed": "orange",
  "Verification": "amber",
  "Complaint Closed": "green"
};

const IssueMap = ({ onBack, complaints = [] }) => {
  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries: GOOGLE_MAPS_LIBRARIES,
  });
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const mapComplaints = complaints
    .filter((complaint) => complaint.coordinates?.latitude !== undefined && complaint.coordinates?.longitude !== undefined)
    .map((complaint) => ({
      ...complaint,
      lat: complaint.coordinates.latitude,
      lng: complaint.coordinates.longitude,
    }));
  const mapCenter = mapComplaints.length
    ? [mapComplaints[0].lat, mapComplaints[0].lng]
    : [20, 0];

  // Close modal on Escape key
  useEffect(() => {
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

  const handleMarkerClick = (complaint) => {
    setSelectedComplaint(complaint);
  };

  return (
    <div className="cdp-im-page">
      {/* Header */}
      <div className="cdp-im-header">
        <button className="cdp-back-btn" onClick={onBack}>← Back to Dashboard</button>
        <h1>Issues Map</h1>
      </div>

      <div className="cdp-im-content">
        <p className="cdp-im-subtitle">Explore reported issues geographically. Click on a pin or list item to view full details.</p>

        <div className="cdp-im-grid">
          {/* ✅ 1. Complaint List Sidebar (NOW ON THE LEFT) */}
          <div className="cdp-im-list-container">
            <h3>Reported Issues ({mapComplaints.length})</h3>
            <div className="cdp-im-list">
              {mapComplaints.map((c) => (
                <div 
                  key={c.id} 
                  className={`cdp-im-list-item ${selectedComplaint?.id === c.id ? "active" : ""}`}
                  onClick={() => handleMarkerClick(c)}
                >
                  <div className="cdp-im-list-header">
                    <span className="cdp-im-list-number">{c.complaintNumber}</span>
                    <span className={`cdp-im-badge cdp-im-badge-${statusToneMap[c.status]}`}>{c.status}</span>
                  </div>
                  <div className="cdp-im-list-details">
                    <p className="cdp-im-list-issue">{c.issue} <span className="cdp-im-list-cat">({c.category})</span></p>
                    <p className="cdp-im-list-loc">📍 {c.location}</p>
                  </div>
                  <button className="cdp-im-view-btn" onClick={(e) => { e.stopPropagation(); handleMarkerClick(c); }}>
                    View Details
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* ✅ 2. Interactive Map (NOW ON THE RIGHT) */}
          <div className="cdp-im-map-container">
            {loadError ? <div>Google Maps could not be loaded.</div> : !isLoaded ? <div>Loading map...</div> : mapComplaints.length === 0 ? <div>No complaint coordinates are available.</div> : (
              <GoogleMap mapContainerStyle={{ width: "100%", height: "100%" }} center={{ lat: mapCenter[0], lng: mapCenter[1] }} zoom={13}>
                {mapComplaints.map((c) => (
                  <Marker key={c.id} position={{ lat: c.lat, lng: c.lng }} onClick={() => handleMarkerClick(c)} />
                ))}
                {selectedComplaint && (
                  <InfoWindow position={{ lat: selectedComplaint.lat, lng: selectedComplaint.lng }} onCloseClick={() => setSelectedComplaint(null)}>
                    <div className="cdp-im-popup-content">
                      <span className={`cdp-im-badge cdp-im-badge-${statusToneMap[selectedComplaint.status]}`}>{selectedComplaint.status}</span>
                      <h4>{selectedComplaint.complaintNumber}</h4>
                      <p><strong>{selectedComplaint.category}:</strong> {selectedComplaint.issue}</p>
                      <p>📍 {selectedComplaint.location}</p>
                    </div>
                  </InfoWindow>
                )}
              </GoogleMap>
            )}
          </div>
        </div>
      </div>

      {/* ✅ OVERLAY MODAL for Complete Complaint Details */}
      {selectedComplaint && (
        <div className="cdp-im-modal-overlay" onClick={() => setSelectedComplaint(null)}>
          <div className="cdp-im-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="cdp-im-modal-header">
              <div>
                <span className="cdp-im-modal-badge">Comprehensive Details</span>
                <h3>{selectedComplaint.complaintNumber}</h3>
              </div>
              <button className="cdp-im-modal-close" onClick={() => setSelectedComplaint(null)}>✕</button>
            </div>

            <div className="cdp-im-modal-body">
              {/* Basic Info Grid */}
              <div className="cdp-im-info-grid">
                <div className="cdp-im-info-item"><span>Category</span><b>{selectedComplaint.category}</b></div>
                <div className="cdp-im-info-item"><span>Current Status</span><b className={`cdp-im-text-${statusToneMap[selectedComplaint.status]}`}>{selectedComplaint.status}</b></div>
                <div className="cdp-im-info-item"><span>Date Submitted</span><b>{selectedComplaint.date}</b></div>
                <div className="cdp-im-info-item" style={{ gridColumn: "1 / -1" }}><span>Location</span><b>📍 {selectedComplaint.location}</b></div>
              </div>

              {/* Description */}
              <div className="cdp-im-section">
                <h4>📝 Issue Description</h4>
                <p className="cdp-im-description">{selectedComplaint.description}</p>
              </div>

              {/* Photo Gallery */}
              {(selectedComplaint.photos?.before || selectedComplaint.photos?.after || selectedComplaint.photos?.site) && (
                <div className="cdp-im-section">
                  <h4>📷 Photographic Evidence</h4>
                  <div className="cdp-im-photo-grid">
                    {selectedComplaint.photos.before && (
                      <div className="cdp-im-photo-card"><span className="cdp-im-photo-label">Before Repair</span><div className="cdp-im-photo-placeholder">📷 {selectedComplaint.photos.before}</div></div>
                    )}
                    {selectedComplaint.photos.site && (
                      <div className="cdp-im-photo-card"><span className="cdp-im-photo-label">Site Inspection</span><div className="cdp-im-photo-placeholder">📷 {selectedComplaint.photos.site}</div></div>
                    )}
                    {selectedComplaint.photos.after && (
                      <div className="cdp-im-photo-card"><span className="cdp-im-photo-label">After Repair</span><div className="cdp-im-photo-placeholder">📷 {selectedComplaint.photos.after}</div></div>
                    )}
                  </div>
                </div>
              )}

              {/* History Timeline */}
              <div className="cdp-im-section">
                <h4>🕘 Complaint History & Timeline</h4>
                <div className="cdp-im-timeline">
                  {selectedComplaint.history.map((log, idx) => (
                    <div className="cdp-im-timeline-item" key={idx}>
                      <div className="cdp-im-timeline-dot"></div>
                      <div className="cdp-im-timeline-content">
                        <div className="cdp-im-timeline-header">
                          <span className="cdp-im-timeline-action">{log.action}</span>
                          <span className="cdp-im-timeline-time">{log.time}</span>
                        </div>
                        <p className="cdp-im-timeline-remarks">{log.remarks}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Resolution Details */}
              {selectedComplaint.resolutionDetails && (
                <div className="cdp-im-section cdp-im-resolution-section">
                  <h4>✅ Resolution Details</h4>
                  <div className="cdp-im-resolution-grid">
                    <div><span>Resolved By:</span><strong>{selectedComplaint.resolutionDetails.resolvedBy}</strong></div>
                    <div><span>Resolution Date:</span><strong>{selectedComplaint.resolutionDetails.resolutionDate}</strong></div>
                    <div style={{ gridColumn: "1 / -1" }}><span>Final Remarks:</span><strong>{selectedComplaint.resolutionDetails.remarks}</strong></div>
                  </div>
                </div>
              )}
            </div>

            <div className="cdp-im-modal-footer">
              <button className="cdp-im-modal-close-btn" onClick={() => setSelectedComplaint(null)}>Close Details</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IssueMap;