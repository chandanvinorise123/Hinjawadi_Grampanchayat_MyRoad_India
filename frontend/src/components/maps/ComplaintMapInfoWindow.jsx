import React from "react";
import { InfoWindow } from "@react-google-maps/api";
import { toMediaUrl } from "../../utils/dashboardApi";
import "./ComplaintMapInfoWindow.css";

const ComplaintMapInfoWindow = ({ complaint, position, onClose }) => {
  if (!complaint || !position) return null;

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
    (url) => url && url !== beforePhoto && url !== afterPhoto
  );
  const media = [
    ...(beforePhoto ? [{ label: "Before / site", url: beforePhoto }] : []),
    ...(afterPhoto ? [{ label: "After work", url: afterPhoto }] : []),
    ...evidencePhotos.map((url, index) => ({
      label: `Complaint photo ${index + 1}`,
      url,
    })),
  ];
  const location =
    typeof complaint.location === "string"
      ? complaint.location
      : complaint.location?.address || complaint.location?.name || "";
  const issue = complaint.issue || complaint.issueType || "Reported issue";
  const coordinateQuery = `${position.lat},${position.lng}`;
  const createdAt = complaint.createdAt || complaint.date;
  const dateLabel = createdAt
    ? new Date(createdAt).toLocaleString()
    : "Not available";

  return (
    <InfoWindow position={position} onCloseClick={onClose}>
      <div className="complaint-map-info">
        <div className="complaint-map-info-heading">
          <strong>{complaint.complaintNumber || "Complaint"}</strong>
          <span>{complaint.status || "Status unavailable"}</span>
        </div>
        <p><b>Issue:</b> {issue}</p>
        <p><b>Category:</b> {complaint.category || "Not available"}</p>
        <p><b>Location:</b> {location || "Address not provided"}</p>
        {complaint.landmark && <p><b>Landmark:</b> {complaint.landmark}</p>}
        <p><b>Reported:</b> {dateLabel}</p>
        {complaint.citizenName && <p><b>Reported by:</b> {complaint.citizenName}</p>}
        {complaint.description && (
          <p className="complaint-map-info-description">{complaint.description}</p>
        )}
        <p className="complaint-map-info-coordinates">
          <b>Coordinates:</b>{" "}
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coordinateQuery)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {Number(position.lat).toFixed(6)}, {Number(position.lng).toFixed(6)}
          </a>
        </p>
        {media.length > 0 && (
          <div className="complaint-map-info-photos">
            {media.map((photo, index) => (
              <a
                href={toMediaUrl(photo.url)}
                target="_blank"
                rel="noopener noreferrer"
                key={`${photo.url}-${index}`}
                aria-label={`Open ${photo.label}`}
              >
                <img src={toMediaUrl(photo.url)} alt={photo.label} loading="lazy" />
                <span>{photo.label}</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </InfoWindow>
  );
};

export default ComplaintMapInfoWindow;
