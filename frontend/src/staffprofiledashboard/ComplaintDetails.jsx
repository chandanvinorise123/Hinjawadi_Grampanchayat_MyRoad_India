import React from "react";
import "./ComplaintDetails.css";

const ComplaintDetails = ({ complaint, onBack }) => {
  if (!complaint) return null;

  const stageLabels = [
    "Action Initiated",
    "Work In Progress",
    "Work Completed",
    "After-Repair Upload",
    "Verification",
    "Work Resolved / Closed",
  ];

  const priorityTone = { High: "red", Medium: "amber", Low: "green" };
  const stageTone = ["amber", "orange", "orange", "orange", "amber", "green"];

  const getCategoryColor = (category) => {
    const mapColors = ["#e07b1c", "#2e6cb0", "#1d8a5c", "#c1900a", "#cf4438", "#7a5c9e"];
    let hash = 0;
    for (let i = 0; i < category.length; i++) hash = category.charCodeAt(i) + ((hash << 5) - hash);
    return mapColors[Math.abs(hash) % mapColors.length];
  };

  // Fallback coordinates for the map if not explicitly provided
  const mapLat = complaint.lat || 18.5912;
  const mapLng = complaint.lng || 73.7389;

  return (
    <div className="cd-shell">
      {/* Header with Back Button */}
      <div className="cd-header">
        <button className="cd-back-btn" onClick={onBack}>
          ← Back to Dashboard
        </button>
        <h2>Complaint Details</h2>
      </div>

      <div className="cd-container">
        {/* Top Info Bar: Number, Category, Priority, Status */}
        <div className="cd-info-bar">
          <div className="cd-info-item">
            <span>Complaint Number</span>
            <b className="cd-mono">{complaint.complaintNumber}</b>
          </div>
          <div className="cd-info-item">
            <span>Category</span>
            <b>
              <span className="cd-cat-dot" style={{ background: getCategoryColor(complaint.category) }}></span>
              {complaint.category}
            </b>
          </div>
          <div className="cd-info-item">
            <span>Priority</span>
            <span className={`cd-badge cd-badge-${priorityTone[complaint.priority]}`}>{complaint.priority}</span>
          </div>
          <div className="cd-info-item">
            <span>Status</span>
            <span className={`cd-badge cd-badge-${stageTone[complaint.stage]}`}>{stageLabels[complaint.stage]}</span>
          </div>
        </div>

        <div className="cd-grid">
          {/* Left Column: Citizen Info, Description, Navigation */}
          <div className="cd-column">
            <div className="cd-card">
              <h3>👤 Citizen Information</h3>
              <div className="cd-detail-row">
                <span>Name:</span>
                <b>{complaint.citizenName}</b>
              </div>
              <div className="cd-detail-row">
                <span>Contact:</span>
                <b>{complaint.citizenContact}</b>
              </div>
            </div>

            <div className="cd-card">
              <h3>📝 Description</h3>
              <p className="cd-description">{complaint.description}</p>
            </div>

            <div className="cd-card">
              <h3>📍 Location & Navigation</h3>
              <p className="cd-location-text">{complaint.location}</p>
              <a 
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(complaint.location)}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="cd-nav-btn"
              >
                🗺️ Navigate to Location
              </a>
            </div>
          </div>

          {/* Right Column: Map & Photographs */}
          <div className="cd-column">
            <div className="cd-card cd-map-card">
              <h3>🗺️ Location Map</h3>
              <div className="cd-map-embed">
                <iframe 
                  width="100%" 
                  height="100%" 
                  frameBorder="0" 
                  scrolling="no" 
                  marginHeight="0" 
                  marginWidth="0" 
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=73.70%2C18.55%2C73.80%2C18.65&layer=mapnik&marker=${mapLat},${mapLng}`}
                  title="Complaint Location Map"
                ></iframe>
              </div>
            </div>

            <div className="cd-card">
              <h3>📷 Photographs</h3>
              <div className="cd-photos-section">
                <h4>Citizen Uploaded</h4>
                <div className="cd-photo-grid">
                  {complaint.citizenPhotos && complaint.citizenPhotos.length > 0 ? (
                    complaint.citizenPhotos.map((photo, idx) => (
                      <div key={idx} className="cd-photo-item">📷 {photo}</div>
                    ))
                  ) : (
                    <p className="cd-empty">No photos uploaded by citizen.</p>
                  )}
                </div>

                {/* Show inspection photos if they exist */}
                {complaint.inspection && (complaint.inspection.sitePhoto || complaint.inspection.completionPhoto) && (
                  <>
                    <h4 style={{ marginTop: "24px" }}>Staff Inspection Photos</h4>
                    <div className="cd-photo-grid">
                      {complaint.inspection.sitePhoto && (
                        <div className="cd-photo-item">📍 Site: {complaint.inspection.sitePhoto}</div>
                      )}
                      {complaint.inspection.completionPhoto && (
                        <div className="cd-photo-item">✅ Completion: {complaint.inspection.completionPhoto}</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComplaintDetails;