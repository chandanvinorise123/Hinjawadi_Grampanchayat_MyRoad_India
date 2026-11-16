import React, { useEffect, useRef } from "react";
import { DomEvent, divIcon, geoJSON } from "leaflet";
import {
  Circle,
  GeoJSON,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { getComplaintMapMarkerSvg } from "./complaintMapMarker";
import "leaflet/dist/leaflet.css";

const ReportMapContents = ({
  boundary,
  liveLocation,
  liveLocationAccuracy,
  showLiveLocationInfo,
  liveLocationAddress,
  liveLocationPhoto,
  liveLocationDetailsLoading,
  selectedLocation,
  issueType,
  mapTypeId,
  isFullscreen,
  onMapReady,
  onMapClick,
  onMarkerDragEnd,
  onLiveLocationMarkerClick,
  onLiveLocationPopupClose,
  onMapTypeToggle,
  onFullscreenChange,
}) => {
  const map = useMap();
  const liveMarkerRef = useRef(null);

  useMapEvents({
    click: onMapClick,
  });

  useEffect(() => {
    onMapReady(map);
    return () => onMapReady(null);
  }, [map, onMapReady]);

  useEffect(() => {
    let resizeTimeout;
    const handleFullscreenChange = () => {
      const fullscreen = document.fullscreenElement === map.getContainer();
      onFullscreenChange(fullscreen);
      window.clearTimeout(resizeTimeout);
      resizeTimeout = window.setTimeout(() => {
        map.invalidateSize();
        // Leaflet reads zoomSnap from its mutable options during fitBounds.
        // eslint-disable-next-line react/immutability
        map.options.zoomSnap = fullscreen ? 0.05 : 1;
        if (!boundary) return;

        const bounds = geoJSON(boundary).getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, {
            padding: fullscreen ? [16, 16] : [28, 28],
          });
        }
      }, 300);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      window.clearTimeout(resizeTimeout);
    };
  }, [boundary, map, onFullscreenChange]);

  useEffect(() => {
    const controls = map.getContainer().querySelectorAll(
      ".report-leaflet-controls .leaflet-control"
    );
    controls.forEach((control) => {
      DomEvent.disableClickPropagation(control);
      DomEvent.disableScrollPropagation(control);
    });

    return () => {
      controls.forEach((control) => {
        DomEvent.off(control);
      });
    };
  }, [map]);

  useEffect(() => {
    if (showLiveLocationInfo) liveMarkerRef.current?.openPopup();
    else liveMarkerRef.current?.closePopup();
  }, [showLiveLocationInfo]);

  const livePosition = liveLocation.lat !== "" && liveLocation.lng !== ""
    ? [Number(liveLocation.lat), Number(liveLocation.lng)]
    : null;
  const liveIcon = divIcon({
    className: "report-gps-marker",
    html: '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="52" viewBox="0 0 40 52" aria-hidden="true"><path d="M20 1C9.5 1 1 9.5 1 20c0 14.2 19 31 19 31s19-16.8 19-31C39 9.5 30.5 1 20 1Z" fill="#4285F4" stroke="#fff" stroke-width="2"/><circle cx="20" cy="20" r="7" fill="#fff"/></svg>',
    iconSize: [40, 52],
    iconAnchor: [20, 51],
  });
  const issueIcon = divIcon({
    className: "scm-marker",
    html: getComplaintMapMarkerSvg({ issue: issueType }),
    iconSize: [44, 56],
    iconAnchor: [22, 54],
  });

  return (
    <>
      <TileLayer
        attribution={mapTypeId === "satellite"
          ? "Tiles &copy; Esri"
          : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}
        url={mapTypeId === "satellite"
          ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"}
      />
      {boundary && (
        <GeoJSON
          data={boundary}
          style={{
            fillOpacity: 0,
            color: "#d21919",
            opacity: 1,
            weight: 3,
          }}
          interactive={false}
        />
      )}
      {livePosition && (
        <>
          {liveLocationAccuracy !== null && (
            <Circle
              center={livePosition}
              radius={liveLocationAccuracy}
              pathOptions={{
                color: "#4285F4",
                opacity: 0.45,
                weight: 1,
                fillColor: "#4285F4",
                fillOpacity: 0.12,
              }}
              interactive={false}
            />
          )}
          <Marker
            ref={liveMarkerRef}
            position={livePosition}
            icon={liveIcon}
            title="Your current location"
            zIndexOffset={1000}
            eventHandlers={{
              click: onLiveLocationMarkerClick,
            }}
          >
            <Popup
              eventHandlers={{
                remove: onLiveLocationPopupClose,
              }}
            >
              <div className="live-location-info">
                {liveLocationPhoto && (
                  <img src={liveLocationPhoto} alt="Nearby location" />
                )}
                <strong>
                  {liveLocationAddress || (
                    liveLocationDetailsLoading
                      ? "Finding nearby location..."
                      : "Your current location"
                  )}
                </strong>
                <p>
                  {Number(liveLocation.lat).toFixed(6)},{" "}
                  {Number(liveLocation.lng).toFixed(6)}
                </p>
                {liveLocationAccuracy !== null && (
                  <small>GPS accuracy: ±{Math.round(liveLocationAccuracy)} m</small>
                )}
              </div>
            </Popup>
          </Marker>
        </>
      )}
      {selectedLocation.lat !== null && selectedLocation.lng !== null && (
        <Marker
          position={[Number(selectedLocation.lat), Number(selectedLocation.lng)]}
          icon={issueIcon}
          draggable
          eventHandlers={{
            dragend: onMarkerDragEnd,
          }}
        />
      )}
      {mapTypeId === "satellite" && (
        <TileLayer
          attribution="Labels &copy; Esri"
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
        />
      )}
      <div className="leaflet-top leaflet-left report-leaflet-controls">
        <div className="leaflet-control">
          <button
            className="report-map-type-button"
            type="button"
            aria-label={mapTypeId === "satellite" ? "Map" : "Satellite"}
            aria-pressed={mapTypeId === "satellite"}
            onClick={(event) => {
              event.stopPropagation();
              onMapTypeToggle();
            }}
          >
            {mapTypeId === "satellite" ? "Map" : "Satellite"}
          </button>
        </div>
      </div>
      <div className="leaflet-top leaflet-right report-leaflet-controls">
        <div className="leaflet-control">
          <button
            className="report-map-fullscreen-button"
            type="button"
            aria-label="Toggle fullscreen map"
            aria-pressed={isFullscreen}
            onClick={async (event) => {
              event.stopPropagation();
              try {
                if (document.fullscreenElement === map.getContainer()) {
                  await document.exitFullscreen();
                } else {
                  await map.getContainer().requestFullscreen();
                }
              } catch (error) {
                console.error("Unable to toggle report map fullscreen:", error);
              }
            }}
          >
            {isFullscreen ? "×" : "⛶"}
          </button>
        </div>
      </div>
    </>
  );
};

const ReportLeafletMap = ({
  boundary,
  liveLocation,
  liveLocationAccuracy,
  showLiveLocationInfo,
  liveLocationAddress,
  liveLocationPhoto,
  liveLocationDetailsLoading,
  selectedLocation,
  issueType,
  mapTypeId,
  isFullscreen,
  onMapReady,
  onMapClick,
  onMarkerDragEnd,
  onLiveLocationMarkerClick,
  onLiveLocationPopupClose,
  onMapTypeToggle,
  onFullscreenChange,
}) => (
  <MapContainer
    className="report-leaflet-map"
    center={[18.494, 73.76]}
    zoom={15}
    zoomControl={false}
    scrollWheelZoom
  >
    <ReportMapContents
      boundary={boundary}
      liveLocation={liveLocation}
      liveLocationAccuracy={liveLocationAccuracy}
      showLiveLocationInfo={showLiveLocationInfo}
      liveLocationAddress={liveLocationAddress}
      liveLocationPhoto={liveLocationPhoto}
      liveLocationDetailsLoading={liveLocationDetailsLoading}
      selectedLocation={selectedLocation}
      issueType={issueType}
      mapTypeId={mapTypeId}
      isFullscreen={isFullscreen}
      onMapReady={onMapReady}
      onMapClick={onMapClick}
      onMarkerDragEnd={onMarkerDragEnd}
      onLiveLocationMarkerClick={onLiveLocationMarkerClick}
      onLiveLocationPopupClose={onLiveLocationPopupClose}
      onMapTypeToggle={onMapTypeToggle}
      onFullscreenChange={onFullscreenChange}
    />
  </MapContainer>
);

export default ReportLeafletMap;
