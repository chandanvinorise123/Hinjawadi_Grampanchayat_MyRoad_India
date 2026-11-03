import React, { useEffect, useMemo, useRef, useState } from "react";
import { divIcon, geoJSON, latLngBounds } from "leaflet";
import {
  GeoJSON,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  ZoomControl,
  useMap,
} from "react-leaflet";
import { getComplaintMapMarkerSvg } from "./complaintMapMarker";
import { getHomeComplaintMapPinType } from "./homeComplaintMapPinType";
import { HomeComplaintPopup } from "./HomeGoogleComplaintsMap";
import "leaflet/dist/leaflet.css";

const DEFAULT_CENTER = { lat: 18.5913, lng: 73.7389 };

const MapBounds = ({
  complaints,
  center,
  boundaryGeoJson,
  fitBoundaryOnly,
  fullscreenFitBoundaryOnly,
  isFullscreen,
}) => {
  const map = useMap();
  const coordinatesKey = useMemo(
    () => complaints
      .map((complaint) => `${Number(complaint.lat)},${Number(complaint.lng)}`)
      .sort()
      .join("|"),
    [complaints]
  );

  useEffect(() => {
    map.invalidateSize();

    const shouldFitBoundary =
      fitBoundaryOnly || (isFullscreen && fullscreenFitBoundaryOnly);
    // Leaflet reads zoomSnap from its mutable options during fitBounds.
    // eslint-disable-next-line react/immutability
    map.options.zoomSnap = shouldFitBoundary ? 0.05 : 1;
    let bounds = null;

    if (boundaryGeoJson) {
      const boundaryBounds = geoJSON(boundaryGeoJson).getBounds();
      if (boundaryBounds.isValid()) bounds = boundaryBounds;
    }

    if ((!shouldFitBoundary || !bounds) && coordinatesKey) {
      const complaintBounds = latLngBounds(
        coordinatesKey.split("|").map((coordinate) =>
          coordinate.split(",").map(Number)
        )
      );
      if (bounds) bounds.extend(complaintBounds);
      else bounds = complaintBounds;
    }

    if (bounds?.isValid()) {
      map.fitBounds(bounds, { padding: shouldFitBoundary ? [16, 16] : [32, 32] });
    } else {
      map.setView([center.lat, center.lng], 12);
    }
  }, [
    boundaryGeoJson,
    center.lat,
    center.lng,
    coordinatesKey,
    fitBoundaryOnly,
    fullscreenFitBoundaryOnly,
    isFullscreen,
    map,
  ]);

  return null;
};

const HeatMapLayer = ({ complaints }) => {
  const map = useMap();

  useEffect(() => {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Unable to initialize the complaint heat map canvas");
    }

    canvas.style.position = "absolute";
    canvas.style.inset = "0";
    canvas.style.zIndex = "450";
    canvas.style.pointerEvents = "none";
    canvas.setAttribute("aria-hidden", "true");
    map.getContainer().appendChild(canvas);

    const drawHeatMap = () => {
      const { x: width, y: height } = map.getSize();
      const pixelRatio = window.devicePixelRatio || 1;
      canvas.width = width * pixelRatio;
      canvas.height = height * pixelRatio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, width, height);

      const radius = Math.max(18, Math.min(42, 30 + map.getZoom() - 12));
      complaints.forEach((complaint) => {
        const point = map.latLngToContainerPoint([
          Number(complaint.lat),
          Number(complaint.lng),
        ]);
        if (
          point.x < -radius ||
          point.y < -radius ||
          point.x > width + radius ||
          point.y > height + radius
        ) {
          return;
        }

        const gradient = context.createRadialGradient(
          point.x,
          point.y,
          0,
          point.x,
          point.y,
          radius
        );
        gradient.addColorStop(0, "rgba(220, 38, 38, 0.72)");
        gradient.addColorStop(0.28, "rgba(249, 115, 22, 0.55)");
        gradient.addColorStop(0.58, "rgba(250, 204, 21, 0.3)");
        gradient.addColorStop(1, "rgba(34, 197, 94, 0)");
        context.fillStyle = gradient;
        context.fillRect(
          point.x - radius,
          point.y - radius,
          radius * 2,
          radius * 2
        );
      });
    };

    drawHeatMap();
    map.on("moveend zoomend resize", drawHeatMap);

    return () => {
      map.off("moveend zoomend resize", drawHeatMap);
      canvas.remove();
    };
  }, [complaints, map]);

  return null;
};

const LeafletMapControls = ({
  translate,
  isSatellite,
  onToggleSatellite,
  isHeatmap,
  onToggleHeatmap,
  reportedRange,
  onReportedRangeChange,
  statusFilter,
  onStatusFilterChange,
  isFullscreen,
  onFullscreenChange,
}) => {
  const map = useMap();
  const [isViewMenuOpen, setIsViewMenuOpen] = useState(false);
  const viewMenuRef = useRef(null);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const filterMenuRef = useRef(null);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const fullscreen = document.fullscreenElement === map.getContainer();
      onFullscreenChange(fullscreen);
      window.setTimeout(() => map.invalidateSize(), 300);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [map, onFullscreenChange]);

  useEffect(() => {
    const closeViewMenu = (event) => {
      if (event.type === "keydown" && event.key !== "Escape") return;
      if (
        event.type === "pointerdown" &&
        (viewMenuRef.current?.contains(event.target) ||
          filterMenuRef.current?.contains(event.target))
      ) {
        return;
      }
      setIsViewMenuOpen(false);
      setIsFilterMenuOpen(false);
    };

    document.addEventListener("pointerdown", closeViewMenu);
    document.addEventListener("keydown", closeViewMenu);
    return () => {
      document.removeEventListener("pointerdown", closeViewMenu);
      document.removeEventListener("keydown", closeViewMenu);
    };
  }, []);

  const toggleFullscreen = async (event) => {
    event.stopPropagation();
    try {
      if (document.fullscreenElement === map.getContainer()) {
        await document.exitFullscreen();
      } else {
        await map.getContainer().requestFullscreen();
      }
    } catch (error) {
      console.error("Unable to toggle complaint map fullscreen:", error);
    }
  };

  return (
    <>
      <div className="leaflet-top leaflet-left home-leaflet-map-controls">
        <div className="leaflet-control">
          <div className="home-leaflet-view-menu" ref={viewMenuRef}>
            <button
              className="home-leaflet-map-type-button home-leaflet-view-menu-toggle"
              type="button"
              aria-expanded={isViewMenuOpen}
              aria-controls="home-leaflet-view-menu-options"
              onClick={(event) => {
                event.stopPropagation();
                setIsViewMenuOpen((open) => !open);
              }}
            >
              {translate("home.mapViewMenu")}
              <span aria-hidden="true">{isViewMenuOpen ? "▴" : "▾"}</span>
            </button>
            {isViewMenuOpen && (
              <div
                className="home-leaflet-view-menu-options"
                id="home-leaflet-view-menu-options"
                role="group"
                aria-label={translate("home.mapViewMenu")}
              >
                <button
                  className="home-leaflet-map-type-button"
                  type="button"
                  aria-pressed={isSatellite}
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleSatellite();
                    setIsViewMenuOpen(false);
                  }}
                >
                  {translate(
                    isSatellite ? "home.mapRoadmapView" : "home.mapSatelliteView"
                  )}
                </button>
                <button
                  className={`home-leaflet-map-type-button home-leaflet-heatmap-button${isHeatmap ? " is-active" : ""}`}
                  type="button"
                  aria-pressed={isHeatmap}
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleHeatmap();
                    setIsViewMenuOpen(false);
                  }}
                >
                  {translate(
                    isHeatmap ? "home.mapMarkersView" : "home.mapHeatmapView"
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="leaflet-control">
          <div className="home-leaflet-view-menu" ref={filterMenuRef}>
            <button
              className={`home-leaflet-map-type-button home-leaflet-view-menu-toggle${reportedRange !== "all" || statusFilter !== "all" ? " is-active" : ""}`}
              type="button"
              aria-expanded={isFilterMenuOpen}
              aria-controls="home-leaflet-filter-menu-options"
              onClick={(event) => {
                event.stopPropagation();
                setIsFilterMenuOpen((open) => !open);
              }}
            >
              {translate("home.mapFilter")}
              <span aria-hidden="true">{isFilterMenuOpen ? "▴" : "▾"}</span>
            </button>
            {isFilterMenuOpen && (
              <div
                className="home-leaflet-view-menu-options home-leaflet-filter-menu-options"
                id="home-leaflet-filter-menu-options"
                role="group"
                aria-label={translate("home.mapFilter")}
                onClick={(event) => event.stopPropagation()}
              >
                <label>
                  {translate("home.mapReportedOn")}
                  <select
                    value={reportedRange}
                    onChange={(event) =>
                      onReportedRangeChange(event.target.value)
                    }
                  >
                    <option value="all">{translate("home.mapAnyTime")}</option>
                    <option value="15days">{translate("home.map15Days")}</option>
                    <option value="1month">{translate("home.map1Month")}</option>
                    <option value="3months">{translate("home.map3Months")}</option>
                    <option value="6months">{translate("home.map6Months")}</option>
                  </select>
                </label>
                <label>
                  {translate("home.mapStatus")}
                  <select
                    value={statusFilter}
                    onChange={(event) =>
                      onStatusFilterChange(event.target.value)
                    }
                  >
                    <option value="all">
                      {translate("home.mapAllStatuses")}
                    </option>
                    <option value="open">
                      {translate("home.mapStatusNew")}
                    </option>
                    <option value="assigned">
                      {translate("home.mapStatusAssigned")}
                    </option>
                    <option value="resolved">
                      {translate("home.mapStatusResolved")}
                    </option>
                  </select>
                </label>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="leaflet-top leaflet-right home-leaflet-map-controls">
        <div className="leaflet-control">
          <button
            className="home-leaflet-fullscreen-button"
            type="button"
            aria-label={translate("home.mapViewFull")}
            aria-pressed={isFullscreen}
            onClick={toggleFullscreen}
          >
            {isFullscreen ? "×" : "⛶"}
          </button>
        </div>
      </div>
      {isHeatmap && (
        <div className="leaflet-bottom leaflet-left home-leaflet-heatmap-legend">
          <div
            role="img"
            aria-label={`${translate("home.mapDensityLow")} to ${translate("home.mapDensityHigh")}`}
          >
            <span>{translate("home.mapDensityLow")}</span>
            <span className="home-leaflet-heatmap-gradient" />
            <span>{translate("home.mapDensityHigh")}</span>
          </div>
        </div>
      )}
    </>
  );
};

const HomeComplaintMarker = ({
  complaint,
  position,
  icon,
  clientId,
  translate,
  isFullscreen,
  popupExpanded,
  selectedComplaintId,
  onSelectComplaint,
  onCloseComplaint,
}) => {
  const markerRef = useRef(null);
  const complaintId = String(complaint.id || complaint._id || "");

  useEffect(() => {
    if (
      (popupExpanded || isFullscreen) &&
      selectedComplaintId &&
      selectedComplaintId === complaintId
    ) {
      const timeout = window.setTimeout(
        () => markerRef.current?.openPopup(),
        isFullscreen && !popupExpanded ? 350 : 0
      );
      return () => window.clearTimeout(timeout);
    }
  }, [complaintId, isFullscreen, popupExpanded, selectedComplaintId]);

  return (
    <Marker
      ref={markerRef}
      position={[position.lat, position.lng]}
      icon={icon}
      title={`${complaint.complaintNumber || "Complaint"} - ${complaint.issue || complaint.issueType || "Reported issue"}`}
      eventHandlers={{
        click: () => onSelectComplaint(complaintId),
      }}
    >
      <Popup
        maxWidth={900}
        minWidth={320}
        className={`home-map-popup${
          popupExpanded || isFullscreen ? " home-map-popup-expanded" : ""
        }`}
      >
        <HomeComplaintPopup
          clientId={clientId}
          complaint={complaint}
          onClose={() => {
            onCloseComplaint(complaintId);
            markerRef.current?.closePopup();
          }}
          translate={translate}
          isMapFullscreen={popupExpanded || isFullscreen}
        />
      </Popup>
    </Marker>
  );
};

const HomeLeafletComplaintsMap = ({
  complaints,
  visibleComplaints,
  center,
  boundaryGeoJson,
  mapClassName,
  translate,
  clientId,
  fitBoundaryOnly = false,
  fullscreenFitBoundaryOnly = false,
  popupExpanded = false,
  selectedComplaintId = null,
  reportedRange,
  onReportedRangeChange,
  statusFilter,
  onStatusFilterChange,
}) => {
  const [isSatellite, setIsSatellite] = useState(false);
  const [isHeatmap, setIsHeatmap] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeComplaintId, setActiveComplaintId] = useState(selectedComplaintId);
  const handleSelectComplaint = (complaintId) => {
    setActiveComplaintId(complaintId);
    try {
      window.sessionStorage.setItem("homeMapSelectedComplaintId", complaintId);
    } catch (error) {
      console.error("Unable to save selected map complaint:", error);
    }
  };
  const handleCloseComplaint = (complaintId) => {
    setActiveComplaintId((activeId) =>
      activeId === complaintId ? null : activeId
    );
    try {
      window.sessionStorage.removeItem("homeMapSelectedComplaintId");
    } catch (error) {
      console.error("Unable to clear selected map complaint:", error);
    }
  };
  const markersByLocation = useMemo(
    () => visibleComplaints.reduce((groups, complaint) => {
      const key = `${Number(complaint.lat)},${Number(complaint.lng)}`;
      groups.set(key, [...(groups.get(key) || []), complaint.id || complaint._id]);
      return groups;
    }, new Map()),
    [visibleComplaints]
  );
  const mapCenter = center || DEFAULT_CENTER;

  return (
    <MapContainer
      className={mapClassName}
      center={[mapCenter.lat, mapCenter.lng]}
      zoom={12}
      zoomControl={false}
      scrollWheelZoom
    >
      <ZoomControl position="bottomright" />
      {isSatellite ? (
        <>
          <TileLayer
            attribution="Tiles &copy; Esri"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
          <TileLayer
            attribution="Labels &copy; Esri"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
          />
        </>
      ) : (
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
      )}
      <MapBounds
        complaints={complaints}
        center={mapCenter}
        boundaryGeoJson={boundaryGeoJson}
        fitBoundaryOnly={fitBoundaryOnly}
        fullscreenFitBoundaryOnly={fullscreenFitBoundaryOnly}
        isFullscreen={isFullscreen}
      />
      {isHeatmap && <HeatMapLayer complaints={visibleComplaints} />}
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
      {!isHeatmap && visibleComplaints.map((complaint) => {
        const position = {
          lat: Number(complaint.lat),
          lng: Number(complaint.lng),
        };
        const locationIds = markersByLocation.get(
          `${position.lat},${position.lng}`
        ) || [];
        const locationIndex = locationIds.indexOf(
          complaint.id || complaint._id
        );
        const markerPosition = locationIds.length > 1
          ? {
              lat: position.lat +
                (locationIndex - (locationIds.length - 1) / 2) * 0.00018,
              lng: position.lng,
            }
          : position;
        const markerIcon = divIcon({
          className: "scm-marker",
          html: getComplaintMapMarkerSvg(
            complaint,
            getHomeComplaintMapPinType(complaint),
            true,
            0.72
          ),
          iconSize: [38, 48],
          iconAnchor: [19, 46],
          popupAnchor: [0, -42],
        });

        return (
          <HomeComplaintMarker
            key={complaint.id || complaint._id}
            complaint={complaint}
            position={markerPosition}
            icon={markerIcon}
            clientId={clientId}
            translate={translate}
            isFullscreen={isFullscreen}
            popupExpanded={popupExpanded}
            selectedComplaintId={activeComplaintId}
            onSelectComplaint={handleSelectComplaint}
            onCloseComplaint={handleCloseComplaint}
          />
        );
      })}
      {visibleComplaints.length === 0 &&
        (reportedRange !== "all" || statusFilter !== "all") && (
          <div className="home-leaflet-empty-filter-results" role="status">
            {translate("home.mapNoFilteredComplaints")}
          </div>
        )}
      <LeafletMapControls
        translate={translate}
        isSatellite={isSatellite}
        onToggleSatellite={() => setIsSatellite((current) => !current)}
        isHeatmap={isHeatmap}
        onToggleHeatmap={() => setIsHeatmap((current) => !current)}
        reportedRange={reportedRange}
        onReportedRangeChange={onReportedRangeChange}
        statusFilter={statusFilter}
        onStatusFilterChange={onStatusFilterChange}
        isFullscreen={isFullscreen}
        onFullscreenChange={setIsFullscreen}
      />
    </MapContainer>
  );
};

export default HomeLeafletComplaintsMap;
