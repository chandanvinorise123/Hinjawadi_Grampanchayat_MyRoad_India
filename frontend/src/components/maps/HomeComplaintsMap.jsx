import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import HomeGoogleComplaintsMap from "./HomeGoogleComplaintsMap";
import "./ComplaintLocationMap.css";
import { API_BASE_URL, toMediaUrl } from "../../utils/dashboardApi";
import { getHomeComplaintMapPinType } from "./homeComplaintMapPinType";

const DEFAULT_CENTER = { lat: 18.5913, lng: 73.7389 };

const HomeComplaintsMap = ({ t, fullPage = false }) => {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [boundaryGeoJson, setBoundaryGeoJson] = useState(null);
  const [boundaryError, setBoundaryError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchBoundary = async () => {
      try {
        const response = await fetch("/boundaries/hinjavadi.geojson");
        const boundary = await response.json();
        if (
          !response.ok ||
          boundary?.type !== "FeatureCollection" ||
          !Array.isArray(boundary.features) ||
          !boundary.features.some((feature) =>
            ["Polygon", "MultiPolygon"].includes(feature?.geometry?.type)
          )
        ) {
          throw new Error("Unable to load the Hinjawadi boundary GeoJSON");
        }

        if (isMounted) {
          setBoundaryGeoJson(boundary);
          setBoundaryError(false);
        }
      } catch (error) {
        console.error("Failed to fetch home map boundary:", error);
        if (isMounted) setBoundaryError(true);
      }
    };

    fetchBoundary();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchComplaints = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/map/complaints?includeUnlocated=true`,
          { cache: "no-store" }
        );
        const result = await response.json();
        if (!response.ok || !result.success || !Array.isArray(result.complaints)) {
          throw new Error(result.message || "Unable to load mapped complaints");
        }

        if (isMounted) {
          setComplaints(result.complaints);
          setLoadError(false);
        }
      } catch (error) {
        console.error("Failed to fetch home map complaints:", error);
        if (isMounted) setLoadError(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchComplaints();
    const interval = window.setInterval(fetchComplaints, 15 * 1000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, []);

  const locatedComplaints = useMemo(
    () => complaints.filter((complaint) => {
      if (complaint.lat === null || complaint.lng === null) return false;
      const latitude = Number(complaint.lat);
      const longitude = Number(complaint.lng);
      return Number.isFinite(latitude) && latitude >= -90 && latitude <= 90 &&
        Number.isFinite(longitude) && longitude >= -180 && longitude <= 180;
    }),
    [complaints]
  );
  const unlocatedComplaints = useMemo(
    () => complaints.filter((complaint) => !locatedComplaints.includes(complaint)),
    [complaints, locatedComplaints]
  );

  const center = useMemo(() => {
    if (locatedComplaints.length === 0) return DEFAULT_CENTER;
    const firstLocatedComplaint = [...locatedComplaints].sort((first, second) =>
      Number(first.lat) - Number(second.lat) ||
      Number(first.lng) - Number(second.lng)
    )[0];
    return {
      lat: Number(firstLocatedComplaint.lat),
      lng: Number(firstLocatedComplaint.lng),
    };
  }, [locatedComplaints]);

  const pinCounts = locatedComplaints.reduce(
    (counts, complaint) => {
      counts[getHomeComplaintMapPinType(complaint)] += 1;
      return counts;
    },
    { open: 0, assigned: 0, resolved: 0 }
  );

  const complaintLocation = (complaint) =>
    typeof complaint.location === "string"
      ? complaint.location
      : complaint.location?.address || complaint.location?.name || "";

  const complaintPhotos = (complaint) => {
    const images = Array.isArray(complaint.images) ? complaint.images : [];
    return [
      ...(complaint.inspection?.sitePhoto
        ? [{ label: t("home.mapBeforePhoto"), url: complaint.inspection.sitePhoto }]
        : images[0]
          ? [{ label: t("home.mapBeforePhoto"), url: images[0] }]
          : []),
      ...(complaint.inspection?.completionPhoto
        ? [{ label: t("home.mapAfterPhoto"), url: complaint.inspection.completionPhoto }]
        : []),
    ];
  };

  const mapPanel = (
    <aside
      className={`home-map-panel${fullPage ? " home-map-panel-full" : ""}`}
      aria-label={t("home.liveComplaintMap")}
    >
      <div className="home-map-heading">
        <h2>{t("home.liveComplaintMap")}</h2>
        <div className="home-map-legend">
          <span>
            <i className="home-map-legend-pin open" />
            {t("home.mapOpenIssues")} ({pinCounts.open})
          </span>
          <span>
            <i className="home-map-legend-pin assigned" />
            {t("home.mapAssignedIssues")} ({pinCounts.assigned})
          </span>
          <span>
            <i className="home-map-legend-pin resolved" />
            {t("home.mapResolvedIssues")} ({pinCounts.resolved})
          </span>
        </div>
      </div>
      {loadError && (
        <p className="home-map-message" role="alert">
          {t("home.mapLoadError")}
        </p>
      )}
      {boundaryError && (
        <p className="home-map-message" role="alert">
          {t("home.mapBoundaryError")}
        </p>
      )}
      {!loading && !loadError && locatedComplaints.length === 0 && (
        <p className="home-map-message">{t("home.mapNoComplaints")}</p>
      )}
      {loading && locatedComplaints.length === 0 && (
        <p className="home-map-message" role="status">
          {t("home.mapLoading")}
        </p>
      )}

      <HomeGoogleComplaintsMap
        complaints={locatedComplaints}
        center={center}
        boundaryGeoJson={boundaryGeoJson}
        mapClassName="home-live-complaints-map"
        translate={t}
        showSatelliteToggle
      />
      {unlocatedComplaints.length > 0 && (
        <details className="home-map-unlocated">
          <summary>
            {t("home.mapUnlocatedList", { count: unlocatedComplaints.length })}
          </summary>
          <ul>
            {unlocatedComplaints.map((complaint) => (
              <li key={complaint.id || complaint._id}>
                <details>
                  <summary>
                    <span>{complaint.complaintNumber || t("home.mapComplaint")}</span>
                    <span className={`home-map-status ${getHomeComplaintMapPinType(complaint)}`}>
                      {complaint.status || t("home.mapStatusUnavailable")}
                    </span>
                  </summary>
                  <p>
                    {complaint.issue || complaint.issueType || t("home.mapIssueUnavailable")}
                    {complaint.category ? ` · ${complaint.category}` : ""}
                  </p>
                  <p>{complaintLocation(complaint) || t("home.mapLocationUnavailable")}</p>
                  {complaint.description && <p>{complaint.description}</p>}
                  {complaint.assignedStaff && (
                    <p>{t("home.mapAssignedStaff", { name: complaint.assignedStaff })}</p>
                  )}
                  {complaintPhotos(complaint).length > 0 && (
                    <div className="home-map-unlocated-photos">
                      {complaintPhotos(complaint).map((photo) => (
                        <a
                          href={toMediaUrl(photo.url)}
                          key={`${photo.label}-${photo.url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <img src={toMediaUrl(photo.url)} alt={photo.label} loading="lazy" />
                          <span>{photo.label}</span>
                        </a>
                      ))}
                    </div>
                  )}
                  {getHomeComplaintMapPinType(complaint) === "resolved" &&
                    !complaint.inspection?.completionPhoto && (
                      <p>{t("home.mapPhotoUnavailable")}</p>
                    )}
                </details>
              </li>
            ))}
          </ul>
        </details>
      )}
    </aside>
  );

  if (!fullPage) return mapPanel;

  return (
    <main className="home-map-page">
      <header className="home-map-page-header">
        <button
          className="home-map-back-button"
          type="button"
          onClick={() => navigate("/")}
          aria-label={t("home.mapBackHome")}
          title={t("home.mapBackHome")}
        >
          ×
        </button>
        <h1>{t("home.mapPageTitle")}</h1>
      </header>
      {mapPanel}
    </main>
  );
};

export default HomeComplaintsMap;
