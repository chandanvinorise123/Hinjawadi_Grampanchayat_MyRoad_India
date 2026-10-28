import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  GoogleMap,
  InfoWindow,
  Marker,
  useJsApiLoader,
} from "@react-google-maps/api";
import { toMediaUrl } from "../../utils/dashboardApi";
import {
  getComplaintMapMarkerIcon,
} from "./complaintMapMarker";
import { getHomeComplaintMapPinType } from "./homeComplaintMapPinType";

const libraries = ["places"];
const defaultCenter = { lat: 18.5913, lng: 73.7389 };
const MARKER_BASE_ZOOM = 15;
const getMarkerScale = (zoom) =>
  Math.min(1.5, Math.max(0.22, 1.25 ** (zoom - MARKER_BASE_ZOOM)));
const mapOptions = {
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
  zoomControl: true,
  scrollwheel: true,
  gestureHandling: "greedy",
};

const formatDate = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleString()
    : "Not available";
};

const HomeGoogleComplaintsMap = ({
  complaints,
  center,
  boundaryGeoJson,
  mapClassName,
  translate,
  showSatelliteToggle,
  fullscreenFitBoundaryOnly = false,
}) => {
  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });
  const [map, setMap] = useState(null);
  const [mapTypeControlContainer, setMapTypeControlContainer] = useState(null);
  const [selectedComplaintId, setSelectedComplaintId] = useState(null);
  const [zoom, setZoom] = useState(12);
  const [mapTypeId, setMapTypeId] = useState("roadmap");
  const fallbackLat = center?.lat ?? defaultCenter.lat;
  const fallbackLng = center?.lng ?? defaultCenter.lng;
  const wasMapFullscreen = useRef(false);
  const fullscreenFitTimeout = useRef(null);

  const toggleMapType = () => {
    const nextMapTypeId = mapTypeId === "satellite" ? "roadmap" : "satellite";
    setMapTypeId(nextMapTypeId);
    map?.setMapTypeId(nextMapTypeId);
  };

  const handleMapLoad = (loadedMap) => {
    setMap(loadedMap);

    if (showSatelliteToggle) {
      const controlContainer = document.createElement("div");
      loadedMap.controls[window.google.maps.ControlPosition.TOP_LEFT].push(
        controlContainer
      );
      setMapTypeControlContainer(controlContainer);
    }
  };

  const handleMapUnmount = (unmountedMap) => {
    if (mapTypeControlContainer) {
      const controlPosition = window.google?.maps?.ControlPosition?.TOP_LEFT;
      const controls = controlPosition === undefined
        ? null
        : unmountedMap.controls?.[controlPosition];
      const controlArray = controls?.getArray?.();
      const controlIndex = controlArray?.indexOf(mapTypeControlContainer);
      if (typeof controlIndex === "number" && controlIndex !== -1) {
        controls.removeAt(controlIndex);
      }
    }

    setMapTypeControlContainer(null);
    setMap(null);
  };

  const coordinatesKey = useMemo(
    () => complaints
      .map((complaint) => `${Number(complaint.lat)},${Number(complaint.lng)}`)
      .sort()
      .join("|"),
    [complaints]
  );

  const markersByLocation = useMemo(
    () => complaints.reduce((groups, complaint) => {
      const key = `${Number(complaint.lat)},${Number(complaint.lng)}`;
      groups.set(key, [...(groups.get(key) || []), complaint.id || complaint._id]);
      return groups;
    }, new Map()),
    [complaints]
  );

  const fitMapToContent = useCallback(() => {
    if (!map) return;

    const bounds = new window.google.maps.LatLngBounds();
    let hasBounds = false;

    map.data.forEach((feature) => {
      const geometry = feature.getGeometry();
      if (!geometry) return;
      geometry.forEachLatLng((point) => {
        bounds.extend(point);
        hasBounds = true;
      });
    });
    coordinatesKey.split("|").filter(Boolean).forEach((coordinate) => {
      const [lat, lng] = coordinate.split(",").map(Number);
      bounds.extend({ lat, lng });
      hasBounds = true;
    });

    if (hasBounds) {
      map.fitBounds(bounds, 32);
    } else {
      map.setCenter({ lat: fallbackLat, lng: fallbackLng });
      map.setZoom(12);
    }
  }, [map, coordinatesKey, fallbackLat, fallbackLng]);

  const fitMapToBoundary = useCallback(() => {
    if (!map) return;

    const bounds = new window.google.maps.LatLngBounds();
    let hasBounds = false;

    map.data.forEach((feature) => {
      const geometry = feature.getGeometry();
      if (!geometry) return;
      geometry.forEachLatLng((point) => {
        bounds.extend(point);
        hasBounds = true;
      });
    });

    if (hasBounds) {
      map.fitBounds(bounds, 32);
    } else {
      fitMapToContent();
    }
  }, [map, fitMapToContent]);

  useEffect(() => {
    if (!map || !boundaryGeoJson) return;

    const existingFeatures = [];
    map.data.forEach((feature) => existingFeatures.push(feature));
    existingFeatures.forEach((feature) => map.data.remove(feature));
    map.data.addGeoJson(boundaryGeoJson);
    map.data.setStyle({
      fillOpacity: 0,
      strokeColor: "#d21919",
      strokeOpacity: 1,
      strokeWeight: 3,
      clickable: false,
    });
  }, [map, boundaryGeoJson]);

  useEffect(() => {
    if (!map) return undefined;

    const updateZoom = () => {
      const currentZoom = map.getZoom();
      if (typeof currentZoom === "number") setZoom(currentZoom);
    };
    updateZoom();
    const listener = map.addListener("zoom_changed", updateZoom);

    return () => listener?.remove();
  }, [map]);

  useEffect(() => {
    fitMapToContent();
  }, [fitMapToContent, boundaryGeoJson]);

  useEffect(() => {
    if (!map) return undefined;

    const mapElement = map.getDiv();
    const handleFullscreenChange = () => {
      const fullscreenElement = document.fullscreenElement;
      const isMapFullscreen = Boolean(
        fullscreenElement &&
          (
            fullscreenElement === mapElement ||
            mapElement.contains(fullscreenElement) ||
            fullscreenElement.contains(mapElement)
          )
      );

      if (wasMapFullscreen.current !== isMapFullscreen) {
        wasMapFullscreen.current = isMapFullscreen;
        window.clearTimeout(fullscreenFitTimeout.current);
        fullscreenFitTimeout.current = window.setTimeout(() => {
          window.google.maps.event.trigger(map, "resize");
          window.requestAnimationFrame(
            isMapFullscreen && fullscreenFitBoundaryOnly
              ? fitMapToBoundary
              : fitMapToContent
          );
        }, 300);
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      window.clearTimeout(fullscreenFitTimeout.current);
    };
  }, [map, fitMapToContent, fitMapToBoundary, fullscreenFitBoundaryOnly]);

  if (loadError) {
    return (
      <div className={mapClassName} role="alert">
        {translate("home.mapLoadError")}
      </div>
    );
  }

  if (!isLoaded) {
    return <div className={mapClassName} role="status">{translate("home.mapLoading")}</div>;
  }

  return (
    <div className="home-google-map-shell">
      {mapTypeControlContainer && createPortal(
        <button
          className="home-google-map-type-button"
          type="button"
          aria-label={translate(
            mapTypeId === "satellite" ? "home.mapRoadmapView" : "home.mapSatelliteView"
          )}
          aria-pressed={mapTypeId === "satellite"}
          onClick={toggleMapType}
        >
          {translate(
            mapTypeId === "satellite" ? "home.mapRoadmapView" : "home.mapSatelliteView"
          )}
        </button>,
        mapTypeControlContainer
      )}
      <GoogleMap
        mapContainerClassName={mapClassName}
        center={center || defaultCenter}
        zoom={12}
        options={{ ...mapOptions, mapTypeId }}
        onLoad={handleMapLoad}
        onUnmount={handleMapUnmount}
      >
      {complaints.map((complaint) => {
        const id = complaint.id || complaint._id;
        const position = {
          lat: Number(complaint.lat),
          lng: Number(complaint.lng),
        };
        const sameLocationIds =
          markersByLocation.get(`${position.lat},${position.lng}`) || [];
        const sameLocationIndex = sameLocationIds.indexOf(id);
        const markerPosition = sameLocationIds.length > 1
          ? {
              lat: position.lat +
                (sameLocationIndex - (sameLocationIds.length - 1) / 2) * 0.00018,
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
        const pinType = getHomeComplaintMapPinType(complaint);
        const markerScale = getMarkerScale(zoom);
        const scaledMarkerIcon = getComplaintMapMarkerIcon(
          complaint,
          undefined,
          pinType,
          true,
          markerScale
        );
        const beforePhoto = pinType === "open"
          ? images[0] || complaint.photos?.before || ""
          : complaint.inspection?.sitePhoto ||
            complaint.photos?.site ||
            complaint.photos?.before ||
            images[0] ||
            "";
        const afterPhoto =
          complaint.inspection?.completionPhoto || complaint.photos?.after || "";
        const isResolved = pinType === "resolved";
        const popupPhotos = pinType === "open"
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
            ];

        return (
          <React.Fragment key={id}>
            <Marker
              position={markerPosition}
              icon={scaledMarkerIcon}
              title={`${complaint.complaintNumber || "Complaint"} - ${complaint.issue || complaint.issueType || "Reported issue"}`}
              onClick={() => setSelectedComplaintId(id)}
            />
            {selectedComplaintId === id && (
              <InfoWindow
                position={markerPosition}
                onCloseClick={() => setSelectedComplaintId(null)}
              >
                <div className="scm-popup home-map-google-popup">
                  <div className="home-map-popup-heading">
                    <strong>{complaint.complaintNumber || "Complaint"}</strong>
                    <span className={`home-map-status ${pinType}`}>
                      {complaint.status || "Status unavailable"}
                    </span>
                  </div>
                  <p><b>Issue:</b> {complaint.issue || complaint.issueType || "Reported issue"}</p>
                  <p><b>Category:</b> {complaint.category || "Not available"}</p>
                  <p><b>Location:</b> {location || "Address not provided"}</p>
                  {complaint.landmark && <p><b>Landmark:</b> {complaint.landmark}</p>}
                  <p><b>Reported:</b> {formatDate(complaint.createdAt || complaint.date)}</p>
                  {complaint.citizenName && <p><b>Reported by:</b> {complaint.citizenName}</p>}
                  {complaint.assignedStaff && <p><b>Assigned staff:</b> {complaint.assignedStaff}</p>}
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
                  {isResolved && (
                    <div className="home-map-resolution-photos">
                      {[
                        { label: translate("home.mapBeforePhoto"), url: beforePhoto },
                        { label: translate("home.mapAfterPhoto"), url: afterPhoto },
                      ].map((photo) => (
                        <div key={photo.label}>
                          <strong>{photo.label}</strong>
                          {photo.url ? (
                            <a href={toMediaUrl(photo.url)} target="_blank" rel="noopener noreferrer">
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
                          <img src={toMediaUrl(photo.url)} alt={photo.label} loading="lazy" />
                          <span>{photo.label}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </InfoWindow>
            )}
          </React.Fragment>
        );
      })}
      </GoogleMap>
    </div>
  );
};

export default HomeGoogleComplaintsMap;
