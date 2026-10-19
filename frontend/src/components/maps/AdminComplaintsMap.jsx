import React, { useEffect } from "react";
import { divIcon, latLngBounds } from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { toMediaUrl } from "../../utils/dashboardApi";
import { getComplaintMapMarkerSvg } from "./complaintMapMarker";
import "./ComplaintLocationMap.css";
import "leaflet/dist/leaflet.css";

const MapBounds = ({ complaints, center }) => {
  const map = useMap();
  const coordinatesKey = complaints
    .map((complaint) => `${complaint.lat},${complaint.lng}`)
    .join("|");

  useEffect(() => {
    if (complaints.length === 0) {
      map.setView(center, 12);
      return;
    }

    const bounds = latLngBounds(
      complaints.map((complaint) => [
        Number(complaint.lat),
        Number(complaint.lng),
      ])
    );
    map.fitBounds(bounds, {
      padding: [32, 32],
      maxZoom: 14,
    });
  }, [center, complaints, coordinatesKey, map]);

  return null;
};

const AdminComplaintsMap = ({ complaints, center }) => {
  return (
    <MapContainer
      className="ad-complaints-map"
      center={center}
      zoom={12}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapBounds complaints={complaints} center={center} />
      {complaints.map((complaint) => {
        const position = {
          lat: Number(complaint.lat),
          lng: Number(complaint.lng),
        };
        const location = typeof complaint.location === "string"
          ? complaint.location
          : complaint.location?.address || complaint.location?.name || "";
        const photos = [
          ...(Array.isArray(complaint.images) ? complaint.images : []),
          ...(Array.isArray(complaint.citizenPhotos) ? complaint.citizenPhotos : []),
        ].filter((photo, index, allPhotos) => photo && allPhotos.indexOf(photo) === index);
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
          <Marker
            key={complaint.id || complaint._id}
            position={position}
            icon={markerIcon}
            title={`${complaint.complaintNumber || "Complaint"} - ${complaint.issue || complaint.issueType || "Reported issue"}`}
          >
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
                        href={toMediaUrl(photo)}
                        target="_blank"
                        rel="noopener noreferrer"
                        key={`${photo}-${index}`}
                      >
                        <img
                          src={toMediaUrl(photo)}
                          alt={`Complaint photo ${index + 1}`}
                          loading="lazy"
                        />
                        <span>Complaint photo {index + 1}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
};

export default AdminComplaintsMap;
