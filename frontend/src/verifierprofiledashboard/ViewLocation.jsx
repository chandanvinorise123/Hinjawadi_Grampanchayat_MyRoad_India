import React, { useState, useMemo } from "react";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import "./ViewLocation.css";

const GOOGLE_MAPS_LIBRARIES = ["places"];

const ViewLocation = ({ complaints, onBack }) => {
  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries: GOOGLE_MAPS_LIBRARIES,
  });
  const [selectedId, setSelectedId] = useState(complaints[0]?.id || null);
  const [searchTerm, setSearchTerm] = useState("");

  const selectedItem = complaints.find((c) => c.id === selectedId) || complaints[0];

  // Filter complaints based on search
  const filteredComplaints = useMemo(() => {
    return complaints.filter((c) =>
      String(c.complaintNumber || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(c.location || "").toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [complaints, searchTerm]);

  const coords = selectedItem?.coordinates
    ? { lat: selectedItem.coordinates.latitude, lng: selectedItem.coordinates.longitude }
    : null;
  
  const externalMapUrl = coords
    ? `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`
    : "";

  return (
    <div className="vl-shell">
      {/* Header */}
      <div className="vl-header">
        <button className="vl-back-btn" onClick={onBack}>← Back to Dashboard</button>
        <h2>🗺️ View Location & Verify</h2>
      </div>

      <div className="vl-container">
        {/* LEFT: Complaint List */}
        <div className="vl-sidebar">
          <div className="vl-search-box">
            <span>🔍</span>
            <input
              type="text"
              placeholder="Search by complaint or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="vl-list">
            {filteredComplaints.length === 0 ? (
              <div className="vl-empty">No locations found.</div>
            ) : (
              filteredComplaints.map((c) => (
                <div
                  key={c.id}
                  className={`vl-list-item ${selectedItem?.id === c.id ? "active" : ""}`}
                  onClick={() => setSelectedId(c.id)}
                >
                  <div className="vl-item-number">{c.complaintNumber}</div>
                  <div className="vl-item-location">📍 {c.location}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT: Map and Verification Details */}
        <div className="vl-main">
          {selectedItem ? (
            <>
              {/* 1. Interactive Map (Now more compact) */}
              <div className="vl-map-section">
                <div className="vl-map-header">
                  <h3>Interactive Map View</h3>
                  <a 
                    href={externalMapUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="vl-external-map-btn"
                  >
                    📍 Open in Google Maps
                  </a>
                </div>
                <div className="vl-map-container">
                  {loadError ? <div>Google Maps could not be loaded.</div> : !isLoaded ? <div>Loading map...</div> : coords ? (
                    <GoogleMap mapContainerStyle={{ width: "100%", height: "100%" }} center={coords} zoom={15}>
                      <Marker position={coords} title={selectedItem.complaintNumber} />
                    </GoogleMap>
                  ) : <div>No coordinates available for this complaint.</div>}
                </div>
              </div>

              {/* 2. Location Details & Verification Cross-Check */}
              <div className="vl-details-grid">
                {/* GPS & Address Details */}
                <div className="vl-card vl-location-card">
                  <h4>📌 Exact Location Details</h4>
                  <div className="vl-detail-row">
                    <span>Reported Address:</span>
                    <b>{selectedItem.location}</b>
                  </div>
                  <div className="vl-detail-row">
                    <span>Latitude:</span>
                    <b className="vl-mono">{coords.lat.toFixed(6)}</b>
                  </div>
                  <div className="vl-detail-row">
                    <span>Longitude:</span>
                    <b className="vl-mono">{coords.lng.toFixed(6)}</b>
                  </div>
                  <div className="vl-detail-row">
                    <span>Nearby Landmarks:</span>
                    <b>{selectedItem.category} area, {selectedItem.location} vicinity</b>
                  </div>
                </div>

                {/* Verification Cross-Check */}
                <div className="vl-card vl-verify-card">
                  <h4>🔍 Location Verification Cross-Check</h4>
                  <p className="vl-verify-instruction">
                    Verify that the mapped location aligns with the reported issue and photographic evidence.
                  </p>
                  
                  <div className="vl-verify-section">
                    <span>Reported Description:</span>
                    <p className="vl-description-text">"{selectedItem.description}"</p>
                  </div>

                  <div className="vl-verify-section">
                    <span>Photographic Evidence:</span>
                    <div className="vl-photo-badges">
                      {selectedItem.photos?.before && <span className="vl-photo-badge">📷 Before Repair</span>}
                      {selectedItem.photos?.site && <span className="vl-photo-badge">📷 Site Photo</span>}
                      {selectedItem.photos?.after && <span className="vl-photo-badge">📷 After Repair</span>}
                    </div>
                    <p className="vl-photo-note">
                      Review the photos in the dashboard to ensure the background, landmarks, and issue match the mapped coordinates.
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="vl-empty-main">
              <h4>Select a complaint to view its location</h4>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewLocation;