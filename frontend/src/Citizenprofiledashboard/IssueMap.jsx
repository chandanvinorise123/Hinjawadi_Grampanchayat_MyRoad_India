import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "./IssueMap.css";

// ✅ Fix for default Leaflet marker icons in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Helper component to fly to a marker when clicked from the list
function FlyToLocation({ position }) {
  const map = useMap();
  if (position) {
    map.flyTo(position, 15, { duration: 1.5 });
  }
  return null;
}

// ✅ HARDCODED MOCK DATA WITH COORDINATES
const mockMapComplaints = [
  {
    id: "1",
    complaintNumber: "MRI-882910",
    category: "Road Issues",
    issue: "Large Pothole",
    date: "2026-10-01",
    location: "Camp Road Bus Stop",
    status: "Work Completed",
    lat: 18.5127,
    lng: 73.8700,
    description: "A massive pothole near the bus stop is causing traffic jams and damaging vehicles.",
    photos: { before: "pothole-before.jpg", after: "pothole-after.jpg", site: "pothole-site.jpg" },
    history: [
      { time: "Oct 01, 10:00 AM", action: "Complaint Registered", remarks: "Submitted by citizen." },
      { time: "Oct 03, 11:15 AM", action: "Work Completed", remarks: "Pothole filled with cold mix asphalt." }
    ],
    resolutionDetails: { resolvedBy: "R. Deshmukh", resolutionDate: "2026-10-03", remarks: "Successfully repaired." }
  },
  {
    id: "2",
    complaintNumber: "MRI-773820",
    category: "Sanitation",
    issue: "Overflowing Garbage Bin",
    date: "2026-09-25",
    location: "Market Yard Junction",
    status: "Complaint Closed",
    lat: 18.5074,
    lng: 73.8760,
    description: "Community bin overflowing for three days, needs urgent clearing.",
    photos: { before: "bin-before.jpg", after: "bin-after.jpg" },
    history: [
      { time: "Sep 25, 08:00 AM", action: "Complaint Registered", remarks: "Submitted by citizen." },
      { time: "Sep 26, 02:00 PM", action: "Complaint Closed", remarks: "Verified by supervisor." }
    ],
    resolutionDetails: { resolvedBy: "Sanitation Dept.", resolutionDate: "2026-09-26", remarks: "Bin cleared and area hosed down." }
  },
  {
    id: "3",
    complaintNumber: "MRI-119283",
    category: "Drinking Water Issues",
    issue: "Pipeline Leakage",
    date: "2026-09-15",
    location: "Riverside Ward Pipeline",
    status: "Verification",
    lat: 18.5350,
    lng: 73.8400,
    description: "Water leaking continuously from an underground pipeline joint.",
    photos: { before: "leak-before.jpg", after: "leak-after.jpg" },
    history: [
      { time: "Sep 15, 09:30 AM", action: "Complaint Registered", remarks: "Submitted by citizen." },
      { time: "Sep 16, 11:00 AM", action: "Work Completed", remarks: "Joint resealed and pressure tested." }
    ],
    resolutionDetails: { resolvedBy: "Water Works Engineer", resolutionDate: "2026-09-16", remarks: "Leak fixed. Ready for verifier inspection." }
  }
];

const statusToneMap = {
  "Complaint Registered": "amber",
  "Complaint Verified": "amber",
  "Assigned to Staff/Officer": "orange",
  "Action Initiated": "orange",
  "Work Completed": "orange",
  "Verification": "amber",
  "Complaint Closed": "green"
};

const IssueMap = ({ onBack }) => {
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [activeMarker, setActiveMarker] = useState(null);

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
    setActiveMarker([complaint.lat, complaint.lng]);
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
            <h3>Reported Issues ({mockMapComplaints.length})</h3>
            <div className="cdp-im-list">
              {mockMapComplaints.map((c) => (
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
            <MapContainer center={[18.5204, 73.8567]} zoom={13} scrollWheelZoom={true}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {activeMarker && <FlyToLocation position={activeMarker} />}
              
              {mockMapComplaints.map((c) => (
                <Marker 
                  key={c.id} 
                  position={[c.lat, c.lng]}
                  eventHandlers={{
                    click: () => handleMarkerClick(c),
                  }}
                >
                  <Popup className="cdp-im-popup">
                    <div className="cdp-im-popup-content">
                      <span className={`cdp-im-badge cdp-im-badge-${statusToneMap[c.status]}`}>{c.status}</span>
                      <h4>{c.complaintNumber}</h4>
                      <p><strong>{c.category}:</strong> {c.issue}</p>
                      <p>📍 {c.location}</p>
                      <button className="cdp-im-popup-btn" onClick={() => handleMarkerClick(c)}>
                        View Full Details
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
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