import React, { useEffect, useState, useMemo } from "react";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import "./ViewLocation.css";
import VerifierComplaintDetails from "./VerifierComplaintDetails";
import ComplaintImage from "./ComplaintImage";
import ComplaintMapInfoWindow from "../components/maps/ComplaintMapInfoWindow";
import { getComplaintMapMarkerIcon } from "../components/maps/complaintMapMarker";
import VerifierDecisionForm from "./VerifierDecisionForm";
import NotificationComplaintActions from "./NotificationComplaintActions";

const getMapPosition = (complaint) => {
  const latitudeValue = complaint?.coordinates?.latitude ?? complaint?.coordinates?.lat;
  const longitudeValue = complaint?.coordinates?.longitude ?? complaint?.coordinates?.lng;
  if (latitudeValue === "" || latitudeValue === null || latitudeValue === undefined) return null;
  if (longitudeValue === "" || longitudeValue === null || longitudeValue === undefined) return null;
  const latitude = Number(latitudeValue);
  const longitude = Number(longitudeValue);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) return null;
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) return null;
  return { lat: latitude, lng: longitude };
};

const ViewLocation = ({
  complaints,
  staffOptions,
  onBack,
  onVerify,
  onAcceptAssign,
  onReject,
  onAssign,
}) => {
  const [selectedId, setSelectedId] = useState(complaints[0]?.id || null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showMapInfo, setShowMapInfo] = useState(false);
  const [mapInstance, setMapInstance] = useState(null);
  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries: ["places"],
  });

  // Filter complaints based on search
  const filteredComplaints = useMemo(() => {
    return complaints.filter((c) =>
      String(c.complaintNumber || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(c.location || "").toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [complaints, searchTerm]);

  const selectedItem = complaints.find((c) => c.id === selectedId) || complaints[0];
  const mappedComplaints = useMemo(
    () => filteredComplaints
      .map((complaint) => ({ complaint, position: getMapPosition(complaint) }))
      .filter((item) => item.position),
    [filteredComplaints]
  );
  const coords = getMapPosition(selectedItem);
  const mapCenter = coords || mappedComplaints[0]?.position;

  useEffect(() => {
    if (!mapInstance || !mappedComplaints.length || !window.google?.maps) return;
    const bounds = new window.google.maps.LatLngBounds();
    mappedComplaints.forEach(({ position }) => bounds.extend(position));
    if (mappedComplaints.length === 1) {
      mapInstance.setCenter(mappedComplaints[0].position);
      mapInstance.setZoom(16);
    } else {
      mapInstance.fitBounds(bounds, 40);
    }
  }, [mapInstance, mappedComplaints]);
  
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
                  onClick={() => {
                    setSelectedId(c.id);
                    setShowMapInfo(false);
                  }}
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
                  {externalMapUrl ? (
                    <a
                      href={externalMapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="vl-external-map-btn"
                    >
                      📍 Open in Google Maps
                    </a>
                  ) : (
                    <span className="vl-external-map-btn vl-map-unavailable">No map coordinates</span>
                  )}
                </div>
                <div className="vl-map-container">
                  {mappedComplaints.length > 0 ? (
                    loadError ? (
                      <div>No map could be loaded. Check the Google Maps API key and network connection.</div>
                    ) : !isLoaded ? (
                      <div>Loading map...</div>
                    ) : (
                      <GoogleMap
                        mapContainerStyle={{ width: "100%", height: "100%" }}
                        center={mapCenter}
                        zoom={mappedComplaints.length === 1 ? 16 : 12}
                        onLoad={setMapInstance}
                        onUnmount={() => setMapInstance(null)}
                        options={{
                          streetViewControl: false,
                          mapTypeControl: false,
                          fullscreenControl: true,
                        }}
                      >
                        {mappedComplaints.map(({ complaint, position }) => (
                          <Marker
                            key={complaint.id}
                            position={position}
                            icon={getComplaintMapMarkerIcon(complaint)}
                            title={`${complaint.complaintNumber} — ${complaint.location || "Complaint location"}`}
                            onClick={() => {
                              setSelectedId(complaint.id);
                              setShowMapInfo(true);
                            }}
                          />
                        ))}
                        {showMapInfo && selectedItem && coords && (
                          <ComplaintMapInfoWindow
                            complaint={selectedItem}
                            position={coords}
                            onClose={() => setShowMapInfo(false)}
                          />
                        )}
                      </GoogleMap>
                    )
                  ) : (
                    <div>No complaints with valid coordinates match this search.</div>
                  )}
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
                    {coords ? (
                      <a
                        className="vl-mono"
                        href={externalMapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {coords.lat.toFixed(6)}
                      </a>
                    ) : (
                      <b className="vl-mono">Not available</b>
                    )}
                  </div>
                  <div className="vl-detail-row">
                    <span>Longitude:</span>
                    {coords ? (
                      <a
                        className="vl-mono"
                        href={externalMapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {coords.lng.toFixed(6)}
                      </a>
                    ) : (
                      <b className="vl-mono">Not available</b>
                    )}
                  </div>
                  <div className="vl-detail-row">
                    <span>Nearby Landmarks:</span>
                    <b>{selectedItem.landmark || "Not provided"}</b>
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
                    <div className="vl-crosscheck-photos">
                      {[
                        ["Before Repair", selectedItem.photos?.before],
                        ["Site Inspection", selectedItem.photos?.site],
                        ["After Repair", selectedItem.photos?.after],
                      ].filter(([, photo]) => photo).map(([label, photo]) => (
                        <div className="vl-crosscheck-photo" key={label}>
                          <span>{label}</span>
                          <ComplaintImage
                            key={`${selectedItem.id}-crosscheck-${label}`}
                            src={photo}
                            alt={`${label} cross-check evidence`}
                            fallbackClassName="vl-crosscheck-photo-fallback"
                          />
                        </div>
                      ))}
                      {!selectedItem.photos?.before && !selectedItem.photos?.site && !selectedItem.photos?.after && (
                        <p className="vl-photo-note">No complaint or work photographs are available to cross-check.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <VerifierComplaintDetails complaint={selectedItem} />
              <div className="vl-card vl-evidence-card">
                <h4>Complaint & Work Evidence</h4>
                <div className="vl-evidence-grid">
                  {[
                    ["Before Repair", selectedItem.photos?.before],
                    ["Site Inspection", selectedItem.photos?.site],
                    ["After Repair", selectedItem.photos?.after],
                  ].map(([label, photo]) => (
                    <div className="vl-evidence-item" key={label}>
                      <span>{label}</span>
                      {photo
                        ? <ComplaintImage key={`${selectedItem.id}-${label}`} src={photo} alt={`${label} photograph`} fallbackClassName="vl-evidence-image-fallback" />
                        : <p>Not available</p>}
                    </div>
                  ))}
                </div>
              </div>
              <VerifierDecisionForm complaint={selectedItem} onVerify={onVerify} />
              <NotificationComplaintActions
                key={`${selectedItem.id}-${selectedItem.status}`}
                complaint={selectedItem}
                staffOptions={staffOptions}
                onAcceptAssign={onAcceptAssign}
                onReject={onReject}
                onAssign={onAssign}
              />
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