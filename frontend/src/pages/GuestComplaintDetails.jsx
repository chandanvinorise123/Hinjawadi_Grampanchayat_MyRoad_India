import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { API_BASE_URL, toMediaUrl } from "../utils/dashboardApi";
import ComplaintMapInfoWindow from "../components/maps/ComplaintMapInfoWindow";
import { getComplaintMapMarkerIcon } from "../components/maps/complaintMapMarker";
import "./GuestComplaintDetails.css";

const GOOGLE_MAPS_LIBRARIES = ["places"];
const guestMapContainerStyle = { width: "100%", height: "340px" };

const formatDateTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
};

const GuestComplaintDetails = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isLoaded: isMapLoaded, loadError: mapLoadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries: GOOGLE_MAPS_LIBRARIES,
  });
  const [complaintNumber, setComplaintNumber] = useState("");
  const [complaint, setComplaint] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showMapInfo, setShowMapInfo] = useState(false);

  const findComplaint = async (event) => {
    event.preventDefault();
    const requestedNumber = complaintNumber.trim();
    if (!requestedNumber) {
      setError(t("guestDetails.enterComplaintId"));
      return;
    }

    setLoading(true);
    setError("");
    setComplaint(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/complaints/track/${encodeURIComponent(requestedNumber)}`
      );
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || t("guestDetails.lookupFailed"));
      }
      setComplaint(result.data);
      setComplaintNumber(requestedNumber);
    } catch (lookupError) {
      console.error("Guest complaint lookup error:", lookupError);
      setError(lookupError.message || t("guestDetails.lookupFailed"));
    } finally {
      setLoading(false);
    }
  };

  const coordinates = complaint?.coordinates;
  const rawLatitude = coordinates?.latitude;
  const rawLongitude = coordinates?.longitude;
  const hasCoordinates =
    rawLatitude !== null &&
    rawLatitude !== undefined &&
    rawLatitude !== "" &&
    rawLongitude !== null &&
    rawLongitude !== undefined &&
    rawLongitude !== "" &&
    Number.isFinite(Number(rawLatitude)) &&
    Number.isFinite(Number(rawLongitude)) &&
    Number(rawLatitude) >= -90 &&
    Number(rawLatitude) <= 90 &&
    Number(rawLongitude) >= -180 &&
    Number(rawLongitude) <= 180;
  const latitude = hasCoordinates ? Number(rawLatitude) : null;
  const longitude = hasCoordinates ? Number(rawLongitude) : null;
  const images = Array.isArray(complaint?.images) ? complaint.images : [];
  const beforeImage =
    complaint?.inspection?.sitePhoto ||
    complaint?.photos?.site ||
    images[0] ||
    "";
  const afterImage =
    complaint?.inspection?.completionPhoto ||
    complaint?.photos?.after ||
    "";
  const registeredAt = complaint?.createdAt || complaint?.date;
  const statusHistory = Array.isArray(complaint?.statusHistory)
    ? [...complaint.statusHistory].sort(
        (first, second) =>
          new Date(second.updatedAt || 0).getTime() -
          new Date(first.updatedAt || 0).getTime()
      )
    : [];

  return (
    <main className="guest-details-page">
      <div className="guest-details-container">
        <button
          className="guest-details-back"
          type="button"
          onClick={() => navigate("/")}
        >
          ← {t("guestDetails.backHome")}
        </button>

        <header className="guest-details-heading">
          <span className="guest-details-eyebrow">{t("guestDetails.eyebrow")}</span>
          <h1>{t("guestDetails.title")}</h1>
          <p>{t("guestDetails.description")}</p>
        </header>

        <section className="guest-lookup-card" aria-labelledby="guest-lookup-title">
          <h2 id="guest-lookup-title">{t("guestDetails.lookupTitle")}</h2>
          <form className="guest-lookup-form" onSubmit={findComplaint}>
            <label htmlFor="guest-complaint-number">
              {t("guestDetails.complaintId")}
            </label>
            <div className="guest-lookup-controls">
              <input
                id="guest-complaint-number"
                type="text"
                autoComplete="off"
                placeholder={t("guestDetails.complaintPlaceholder")}
                value={complaintNumber}
                onChange={(event) => {
                  setComplaintNumber(event.target.value);
                  setError("");
                  setComplaint(null);
                }}
                required
              />
              <button type="submit" disabled={loading}>
                {loading ? t("guestDetails.searching") : t("guestDetails.viewDetails")}
              </button>
            </div>
          </form>
          {error && <p className="guest-lookup-error" role="alert">{error}</p>}
        </section>

        {complaint && (
          <article className="guest-complaint-details">
            <section className="guest-details-summary">
              <div>
                <span className="guest-details-label">{t("guestDetails.complaintId")}</span>
                <h2>{complaint.complaintNumber || complaint._id}</h2>
              </div>
              <span className="guest-status-badge">{complaint.status || "New"}</span>
            </section>

            <section className="guest-details-grid" aria-label={t("guestDetails.complaintInformation")}>
              <div className="guest-info-item">
                <span>{t("guestDetails.registeredAt")}</span>
                <b>{formatDateTime(registeredAt) || t("guestDetails.notAvailable")}</b>
              </div>
              <div className="guest-info-item">
                <span>{t("guestDetails.reportedBy")}</span>
                <b>{complaint.citizenName || t("guestDetails.notAvailable")}</b>
              </div>
              <div className="guest-info-item">
                <span>{t("guestDetails.category")}</span>
                <b>{complaint.category || t("guestDetails.notAvailable")}</b>
              </div>
              <div className="guest-info-item">
                <span>{t("guestDetails.issueType")}</span>
                <b>{complaint.issueType || t("guestDetails.notAvailable")}</b>
              </div>
              <div className="guest-info-item guest-info-location">
                <span>{t("guestDetails.location")}</span>
                <b>{complaint.location || t("guestDetails.notAvailable")}</b>
                {complaint.landmark && <small>{t("guestDetails.landmark")}: {complaint.landmark}</small>}
              </div>
              <div className="guest-info-item guest-info-description">
                <span>{t("guestDetails.descriptionLabel")}</span>
                <p>{complaint.description || t("guestDetails.notAvailable")}</p>
              </div>
            </section>

            <section className="guest-details-section">
              <div className="guest-section-heading">
                <h3>{t("guestDetails.locationMap")}</h3>
                {hasCoordinates && (
                  <span>
                    {latitude}, {longitude}
                  </span>
                )}
              </div>
              {hasCoordinates && mapLoadError ? (
              <p className="guest-details-empty">{t("guestDetails.mapLoadError")}</p>
              ) : hasCoordinates && !isMapLoaded ? (
              <p className="guest-details-empty">{t("guestDetails.mapLoading")}</p>
              ) : hasCoordinates ? (
              <>
                <div className="guest-location-map">
                  <GoogleMap
                    mapContainerStyle={guestMapContainerStyle}
                    center={{ lat: latitude, lng: longitude }}
                    zoom={16}
                    options={{
                      streetViewControl: false,
                      mapTypeControl: false,
                      fullscreenControl: true,
                    }}
                  >
                    <Marker
                      position={{ lat: latitude, lng: longitude }}
                      icon={getComplaintMapMarkerIcon(complaint)}
                      title={`${complaint.complaintNumber || "Complaint"} — ${complaint.issueType || complaint.category || ""}`}
                      onClick={() => setShowMapInfo(true)}
                    />
                    {showMapInfo && (
                      <ComplaintMapInfoWindow
                        complaint={complaint}
                        position={{ lat: latitude, lng: longitude }}
                        onClose={() => setShowMapInfo(false)}
                      />
                    )}
                  </GoogleMap>
                </div>
                  <a
                    className="guest-map-link"
                    href={`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t("guestDetails.openMap")}
                  </a>
                </>
              ) : (
                <p className="guest-details-empty">{t("guestDetails.noCoordinates")}</p>
              )}
            </section>

            <section className="guest-details-section">
              <h3>{t("guestDetails.workPhotos")}</h3>
              <div className="guest-photo-grid">
                <div className="guest-photo-card">
                  <h4>{t("guestDetails.beforeWork")}</h4>
                  {beforeImage ? (
                    <img src={toMediaUrl(beforeImage)} alt={t("guestDetails.beforeAlt")} />
                  ) : (
                    <p>{t("guestDetails.noBeforePhoto")}</p>
                  )}
                </div>
                <div className="guest-photo-card">
                  <h4>{t("guestDetails.afterWork")}</h4>
                  {afterImage ? (
                    <img src={toMediaUrl(afterImage)} alt={t("guestDetails.afterAlt")} />
                  ) : (
                    <p>{t("guestDetails.afterPhotoPending")}</p>
                  )}
                </div>
              </div>
            </section>

            <section className="guest-details-section">
              <h3>{t("guestDetails.updates")}</h3>
              {statusHistory.length > 0 ? (
                <ol className="guest-update-list">
                  {statusHistory.map((update, index) => (
                    <li key={`${update.updatedAt || update.status}-${index}`}>
                      <span className="guest-update-dot" />
                      <div>
                        <b>{update.status}</b>
                        <time>{formatDateTime(update.updatedAt)}</time>
                        {update.remarks && <p>{update.remarks}</p>}
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="guest-details-empty">{t("guestDetails.noUpdates")}</p>
              )}
            </section>
          </article>
        )}
      </div>
    </main>
  );
};

export default GuestComplaintDetails;
