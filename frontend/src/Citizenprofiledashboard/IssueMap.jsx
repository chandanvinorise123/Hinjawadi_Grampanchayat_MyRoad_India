import React, { useState, useEffect } from "react";
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from "@react-google-maps/api";
import { toMediaUrl } from "../utils/dashboardApi";
import { getComplaintMapMarkerIcon } from "../components/maps/complaintMapMarker";
import "./IssueMap.css";

const GOOGLE_MAPS_LIBRARIES = ["places"];

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
    .filter((complaint) => {
      const latitude = complaint.coordinates?.latitude;
      const longitude = complaint.coordinates?.longitude;
      return latitude !== null &&
        latitude !== undefined &&
        latitude !== "" &&
        longitude !== null &&
        longitude !== undefined &&
        longitude !== "" &&
        Number.isFinite(Number(latitude)) &&
        Number.isFinite(Number(longitude)) &&
        Number(latitude) >= -90 &&
        Number(latitude) <= 90 &&
        Number(longitude) >= -180 &&
        Number(longitude) <= 180;
    })
    .map((complaint) => ({
      ...complaint,
      lat: Number(complaint.coordinates.latitude),
      lng: Number(complaint.coordinates.longitude),
      history: (complaint.statusHistory || []).map((entry) => ({
        time: entry.updatedAt ? new Date(entry.updatedAt).toLocaleString() : "",
        action: entry.status,
        remarks: entry.remarks || "",
      })),
      photos: {
        before: complaint.photos?.before || complaint.images?.[0] || "",
        site: complaint.photos?.site || complaint.inspection?.sitePhoto || "",
        after:
          complaint.photos?.after ||
          complaint.inspection?.completionPhoto ||
          "",
      },
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
                  role="button"
                  tabIndex={0}
                  onClick={() => handleMarkerClick(c)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleMarkerClick(c);
                    }
                  }}
                >
                  <div className="cdp-im-list-header">
                    <span className="cdp-im-list-number">{c.complaintNumber}</span>
                    <span className={`cdp-im-badge cdp-im-badge-${statusToneMap[c.status]}`}>{c.status}</span>
                  </div>
                  <div className="cdp-im-list-details">
                    <p className="cdp-im-list-issue">{c.issue} <span className="cdp-im-list-cat">({c.category})</span></p>
                    <p className="cdp-im-list-loc">📍 {c.location}</p>
                  </div>
                  <span className="cdp-im-view-btn">
                    View Details
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ✅ 2. Interactive Map (NOW ON THE RIGHT) */}
          <div className="cdp-im-map-container">
            {loadError ? <div>Google Maps could not be loaded.</div> : !isLoaded ? <div>Loading map...</div> : mapComplaints.length === 0 ? <div>No complaint coordinates are available.</div> : (
              <GoogleMap
                mapContainerStyle={{ width: "100%", height: "100%" }}
                center={selectedComplaint
                  ? { lat: selectedComplaint.lat, lng: selectedComplaint.lng }
                  : { lat: mapCenter[0], lng: mapCenter[1] }}
                zoom={13}
                onClick={() => setSelectedComplaint(null)}
              >
                {mapComplaints.map((c) => (
                  <Marker
                    key={c.id}
                    position={{ lat: c.lat, lng: c.lng }}
                    icon={getComplaintMapMarkerIcon(c)}
                    title={`${c.complaintNumber || "Complaint"} — ${c.issue || c.issueType || ""}`}
                    onClick={() => handleMarkerClick(c)}
                  />
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
              <div className="cdp-im-info-item"><span>Issue</span><b>{selectedComplaint.issue || selectedComplaint.issueType}</b></div>
              <div className="cdp-im-info-item"><span>Current Status</span><b className={`cdp-im-text-${statusToneMap[selectedComplaint.status]}`}>{selectedComplaint.status}</b></div>
              <div className="cdp-im-info-item"><span>Date Submitted</span><b>{selectedComplaint.createdAt ? new Date(selectedComplaint.createdAt).toLocaleString() : selectedComplaint.date}</b></div>
              <div className="cdp-im-info-item" style={{ gridColumn: "1 / -1" }}>
                <span>Location</span>
                <b>📍 {selectedComplaint.location}</b>
                <a
                  className="cdp-im-coordinate-link"
                  href={`https://www.google.com/maps/search/?api=1&query=${selectedComplaint.lat},${selectedComplaint.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {selectedComplaint.lat.toFixed(6)}, {selectedComplaint.lng.toFixed(6)} · Open exact location
                </a>
              </div>
              </div>

              {/* Description */}
              <div className="cdp-im-section">
                <h4>📝 Issue Description</h4>
                <p className="cdp-im-description">{selectedComplaint.description}</p>
              </div>

              {/* Photo Gallery */}
              {(selectedComplaint.photos?.before || selectedComplaint.photos?.after || selectedComplaint.photos?.site || selectedComplaint.images?.length > 0) && (
                <div className="cdp-im-section">
                  <h4>📷 Photographic Evidence</h4>
                  <div className="cdp-im-photo-grid">
                    {selectedComplaint.photos.before && (
                      <a className="cdp-im-photo-card" href={toMediaUrl(selectedComplaint.photos.before)} target="_blank" rel="noopener noreferrer">
                        <span className="cdp-im-photo-label">Before Repair</span>
                        <img className="cdp-im-photo-image" src={toMediaUrl(selectedComplaint.photos.before)} alt="Complaint before repair" loading="lazy" />
                      </a>
                    )}
                    {selectedComplaint.photos.site &&
                      selectedComplaint.photos.site !== selectedComplaint.photos.before && (
                      <a className="cdp-im-photo-card" href={toMediaUrl(selectedComplaint.photos.site)} target="_blank" rel="noopener noreferrer">
                        <span className="cdp-im-photo-label">Site Inspection</span>
                        <img className="cdp-im-photo-image" src={toMediaUrl(selectedComplaint.photos.site)} alt="Complaint site inspection" loading="lazy" />
                      </a>
                    )}
                    {selectedComplaint.photos.after && (
                      <a className="cdp-im-photo-card" href={toMediaUrl(selectedComplaint.photos.after)} target="_blank" rel="noopener noreferrer">
                        <span className="cdp-im-photo-label">After Repair</span>
                        <img className="cdp-im-photo-image" src={toMediaUrl(selectedComplaint.photos.after)} alt="Complaint after repair" loading="lazy" />
                      </a>
                    )}
                    {[...new Set(selectedComplaint.images || [])]
                      .filter((image) => image &&
                        image !== selectedComplaint.photos.before &&
                        image !== selectedComplaint.photos.site &&
                        image !== selectedComplaint.photos.after)
                      .map((image, index) => (
                        <a className="cdp-im-photo-card" href={toMediaUrl(image)} target="_blank" rel="noopener noreferrer" key={`${image}-${index}`}>
                          <span className="cdp-im-photo-label">Complaint Photo {index + 1}</span>
                          <img className="cdp-im-photo-image" src={toMediaUrl(image)} alt={`Complaint evidence ${index + 1}`} loading="lazy" />
                        </a>
                      ))}
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