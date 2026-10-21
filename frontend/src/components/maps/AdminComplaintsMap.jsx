import React, { useEffect } from "react";
import { divIcon, geoJSON, latLngBounds } from "leaflet";
import {
  GeoJSON,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import { toMediaUrl } from "../../utils/dashboardApi";
import {
  getComplaintMapMarkerSvg,
  getComplaintMapPinType,
} from "./complaintMapMarker";
import "./ComplaintLocationMap.css";
import "leaflet/dist/leaflet.css";

const MapBounds = ({ complaints, center, boundaryGeoJson }) => {
  const map = useMap();
  const coordinatesKey = complaints.length
    ? [...new Set(complaints.map((complaint) =>
        `${Number(complaint.lat)},${Number(complaint.lng)}`
      ))]
        .sort()
        .join("|")
    : "";

  useEffect(() => {
    let bounds = null;

    if (boundaryGeoJson) {
      const boundaryBounds = geoJSON(boundaryGeoJson).getBounds();
      if (boundaryBounds.isValid()) bounds = boundaryBounds;
    }

    if (coordinatesKey) {
      const complaintBounds = latLngBounds(
        coordinatesKey.split("|").map((coordinate) =>
          coordinate.split(",").map(Number)
        )
      );
      if (bounds) bounds.extend(complaintBounds);
      else bounds = complaintBounds;
    }

    if (bounds?.isValid()) {
      map.fitBounds(bounds, {
        padding: [32, 32],
        maxZoom: 14,
      });
    } else {
      map.setView([center.lat, center.lng], 12);
    }
  }, [boundaryGeoJson, center.lat, center.lng, coordinatesKey, map]);

  return null;
};

const AdminComplaintsMap = ({
  complaints,
  center,
  boundaryGeoJson = null,
  mapClassName = "ad-complaints-map",
  detailedHomePopups = false,
  translate = (key) => key,
}) => {
  const markersByLocation = complaints.reduce((groups, complaint) => {
    const key = `${Number(complaint.lat)},${Number(complaint.lng)}`;
    groups.set(key, [...(groups.get(key) || []), complaint.id || complaint._id]);
    return groups;
  }, new Map());

  return (
    <MapContainer
      className={mapClassName}
      center={center}
      zoom={12}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapBounds
        complaints={complaints}
        center={center}
        boundaryGeoJson={boundaryGeoJson}
      />
      {boundaryGeoJson && (
        <GeoJSON
          data={boundaryGeoJson}
          style={{
            color: "#d21919",
            weight: 3,
            opacity: 1,
            fillOpacity: 0,
          }}
          interactive={false}
        />
      )}
      {complaints.map((complaint) => {
        const position = {
          lat: Number(complaint.lat),
          lng: Number(complaint.lng),
        };
        const sameLocationIds = markersByLocation.get(
          `${position.lat},${position.lng}`
        );
        const sameLocationIndex = sameLocationIds.indexOf(
          complaint.id || complaint._id
        );
        const markerPosition =
          detailedHomePopups && sameLocationIds.length > 1
            ? {
                lat: position.lat + (sameLocationIndex - (sameLocationIds.length - 1) / 2) * 0.00018,
                lng: position.lng,
              }
            : position;
        const location = typeof complaint.location === "string"
          ? complaint.location
          : complaint.location?.address || complaint.location?.name || "";
        const images = [
          ...(Array.isArray(complaint.images) ? complaint.images : []),
          ...(Array.isArray(complaint.citizenPhotos) ? complaint.citizenPhotos : []),
        ].filter((photo, index, allPhotos) => photo && allPhotos.indexOf(photo) === index);
        const pinType = getComplaintMapPinType(complaint);
        const beforePhoto = detailedHomePopups && pinType === "open"
          ? images[0] || complaint.photos?.before || ""
          : complaint.inspection?.sitePhoto ||
            complaint.photos?.site ||
            complaint.photos?.before ||
            images[0] ||
            "";
        const afterPhoto =
          complaint.inspection?.completionPhoto ||
          complaint.photos?.after ||
          "";
        const isResolved = pinType === "resolved";
        const popupPhotos = detailedHomePopups
          ? pinType === "open"
            ? beforePhoto
              ? [{ label: translate("home.mapBeforePhoto"), url: beforePhoto }]
              : []
            : [
                ...(!isResolved && beforePhoto
                  ? [{ label: translate("home.mapBeforePhoto"), url: beforePhoto }]
                  : []),
                ...(!isResolved && afterPhoto
                  ? [{ label: translate("home.mapAfterPhoto"), url: afterPhoto }]
                  : []),
                ...images
                  .filter((photo) => photo !== beforePhoto && photo !== afterPhoto)
                  .map((url, index) => ({
                    label: `Complaint photo ${index + 1}`,
                    url,
                  })),
              ]
          : images.map((url, index) => ({
              label: `Complaint photo ${index + 1}`,
              url,
            }));
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
            position={markerPosition}
            icon={markerIcon}
            title={`${complaint.complaintNumber || "Complaint"} - ${complaint.issue || complaint.issueType || "Reported issue"}`}
          >
            <Popup
              maxWidth={detailedHomePopups ? 430 : 300}
              minWidth={detailedHomePopups ? 300 : 0}
              className={detailedHomePopups ? "home-map-popup" : undefined}
            >
              <div className="scm-popup">
                <div className="home-map-popup-heading">
                  <strong>{complaint.complaintNumber || "Complaint"}</strong>
                  {detailedHomePopups && (
                    <span className={`home-map-status ${pinType}`}>
                      {complaint.status || "Status unavailable"}
                    </span>
                  )}
                </div>
                <p><b>Issue:</b> {complaint.issue || complaint.issueType || "Reported issue"}</p>
                <p><b>Category:</b> {complaint.category || "Not available"}</p>
                {!detailedHomePopups && (
                  <p><b>Status:</b> {complaint.status || "Status unavailable"}</p>
                )}
                <p><b>Location:</b> {location || "Address not provided"}</p>
                {complaint.landmark && <p><b>Landmark:</b> {complaint.landmark}</p>}
                <p><b>Reported:</b> {reportDate}</p>
                {complaint.citizenName && (
                  <p><b>Reported by:</b> {complaint.citizenName}</p>
                )}
                {complaint.assignedStaff && (
                  <p><b>Assigned staff:</b> {complaint.assignedStaff}</p>
                )}
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
                {detailedHomePopups && isResolved && (
                  <div className="home-map-resolution-photos">
                    {[
                      {
                        label: translate("home.mapBeforePhoto"),
                        url: beforePhoto,
                      },
                      {
                        label: translate("home.mapAfterPhoto"),
                        url: afterPhoto,
                      },
                    ].map((photo) => (
                      <div key={photo.label}>
                        <strong>{photo.label}</strong>
                        {photo.url ? (
                          <a
                            href={toMediaUrl(photo.url)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <img src={toMediaUrl(photo.url)} alt={photo.label} loading="lazy" />
                          </a>
                        ) : (
                          <p>{translate("home.mapPhotoUnavailable")}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {popupPhotos.length > 0 && (
                  <div className="scm-popup-photos">
                    {popupPhotos.map((photo, index) => (
                      <a
                        href={toMediaUrl(photo.url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        key={`${photo.url}-${index}`}
                      >
                        <img
                          src={toMediaUrl(photo.url)}
                          alt={photo.label}
                          loading="lazy"
                        />
                        <span>{photo.label}</span>
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
