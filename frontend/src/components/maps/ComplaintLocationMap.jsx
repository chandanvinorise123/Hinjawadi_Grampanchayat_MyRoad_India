import React from "react";
import { divIcon } from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import { toMediaUrl } from "../../utils/dashboardApi";
import { getComplaintMapMarkerSvg } from "./complaintMapMarker";
import "./ComplaintLocationMap.css";
import "leaflet/dist/leaflet.css";

const ComplaintLocationMap = ({ complaint, position }) => {
  const images = Array.isArray(complaint.images)
    ? complaint.images
    : Array.isArray(complaint.citizenPhotos)
      ? complaint.citizenPhotos
      : [];
  const beforePhoto =
    complaint.inspection?.sitePhoto ||
    complaint.photos?.site ||
    complaint.photos?.before ||
    images[0] ||
    "";
  const afterPhoto =
    complaint.inspection?.completionPhoto ||
    complaint.photos?.after ||
    "";
  const evidencePhotos = [...new Set(images)].filter(
    (photo) => photo && photo !== beforePhoto && photo !== afterPhoto
  );
  const photos = [
    ...(beforePhoto ? [{ label: "Before / site", url: beforePhoto }] : []),
    ...(afterPhoto ? [{ label: "After work", url: afterPhoto }] : []),
    ...evidencePhotos.map((url, index) => ({
      label: `Complaint photo ${index + 1}`,
      url,
    })),
  ];
  const location = typeof complaint.location === "string"
    ? complaint.location
    : complaint.location?.address || complaint.location?.name || "";
  const reportedAt = complaint.createdAt || complaint.date;
  const parsedReportedAt = reportedAt ? new Date(reportedAt) : null;
  const reportDate = parsedReportedAt && !Number.isNaN(parsedReportedAt.getTime())
    ? parsedReportedAt.toLocaleString()
    : "Not available";
  const markerIcon = divIcon({
    className: "scm-marker",
    html: getComplaintMapMarkerSvg(complaint),
    iconSize: [44, 56],
    iconAnchor: [22, 54],
    popupAnchor: [0, -50],
  });

  return (
    <MapContainer
      className="scd-map"
      center={position}
      zoom={14}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={position} icon={markerIcon}>
        <Popup>
          <div className="scm-popup">
            <strong>{complaint.complaintNumber || "Complaint"}</strong>
            <p><b>Issue:</b> {complaint.issue || complaint.issueType || "Reported issue"}</p>
            <p><b>Category:</b> {complaint.category || "Not available"}</p>
            <p><b>Status:</b> {complaint.status || "Status unavailable"}</p>
            <p><b>Location:</b> {location || "Address not provided"}</p>
            <p><b>Reported:</b> {reportDate}</p>
            <p>
              <b>Coordinates:</b>{" "}
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${position.lat},${position.lng}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
              </a>
            </p>
            {complaint.description && <p>{complaint.description}</p>}
            {photos.length > 0 && (
              <div className="scm-popup-photos">
                {photos.map((photo, index) => (
                  <a
                    href={toMediaUrl(photo.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    key={`${photo.url}-${index}`}
                  >
                    <img src={toMediaUrl(photo.url)} alt={photo.label} loading="lazy" />
                    <span>{photo.label}</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </Popup>
      </Marker>
    </MapContainer>
  );
};

export default ComplaintLocationMap;
