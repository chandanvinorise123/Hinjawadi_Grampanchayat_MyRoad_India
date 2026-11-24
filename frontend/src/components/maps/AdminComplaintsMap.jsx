import React, { useEffect, useRef, useState } from "react";
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
  getComplaintRejectionActor,
  getComplaintMapMarkerScale,
  getComplaintMapMarkerSvg,
  getComplaintMapPinType,
  isComplaintAwaitingVerification,
  isComplaintReworkRequested,
} from "./complaintMapMarker";
import { HeatMapLayer } from "./HomeLeafletComplaintsMap";
import ComplaintMapPdfActions from "./ComplaintMapPdfActions";
import VerifierDecisionForm from "../../verifierprofiledashboard/VerifierDecisionForm";
import "./ComplaintLocationMap.css";
import "leaflet/dist/leaflet.css";

const statusOptionTranslationKeys = {
  New: "admin_dashboard.map_pin_new",
  Assigned: "admin_dashboard.map_pin_assigned",
  "Under Verification": "admin_dashboard.map_pin_verification",
  Resolved: "admin_dashboard.map_pin_resolved",
  Rejected: "admin_dashboard.map_pin_rejected",
};

const getPhotoPath = (photo) =>
  typeof photo === "string"
    ? photo
    : photo?.url || photo?.path || photo?.imageUrl || "";

const firstPhotoPath = (...photos) =>
  photos.map(getPhotoPath).find(Boolean) || "";

const MapStaffAssignment = ({
  complaint,
  staffOptions,
  staffLoading,
  staffLoadError,
  assignmentSavingKey,
  onAssignStaff,
  translate,
}) => {
  const assignedStaffId = complaint.assignedStaffId ||
    staffOptions.find((staff) => staff.name === complaint.assignedStaff)?.id ||
    "";
  const hasAssignedStaff = Boolean(assignedStaffId || complaint.assignedStaff);
  const [isEditing, setIsEditing] = useState(!hasAssignedStaff);
  const [draftStaffId, setDraftStaffId] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const staffSelectRef = useRef(null);
  const isSaving = assignmentSavingKey === String(complaint.id);

  const startEditing = (event) => {
    event.stopPropagation();
    setDraftStaffId(assignedStaffId);
    setSaveError("");
    setIsEditing(true);
    const staffSelect = staffSelectRef.current;
    if (!staffSelect) return;
    staffSelect.disabled = false;
    staffSelect.focus();
    if (typeof staffSelect.showPicker === "function") {
      try {
        staffSelect.showPicker();
      } catch (error) {
        if (error?.name !== "NotAllowedError") throw error;
      }
    }
  };

  const saveAssignment = async (event) => {
    event.stopPropagation();
    setSaveError("");
    try {
      await onAssignStaff(complaint, draftStaffId);
      setIsEditing(false);
      setSaveSuccess(true);
    } catch (error) {
      setSaveError(error.message || translate("admin_dashboard.map_assignment_save_error"));
    }
  };

  return (
    <div className="map-staff-assignment">
      <label htmlFor={`map-staff-${complaint.id || complaint._id}`}>
        {translate("admin_dashboard.map_assign_staff_heading")}
      </label>
      <select
        ref={staffSelectRef}
        id={`map-staff-${complaint.id || complaint._id}`}
        value={isEditing ? draftStaffId : assignedStaffId}
        disabled={!isEditing || staffLoading || isSaving}
        onChange={(event) => setDraftStaffId(event.target.value)}
        onClick={(event) => event.stopPropagation()}
      >
        <option value="">Unassigned</option>
        {staffOptions.map((staff) => (
          <option key={staff.id} value={staff.id}>
            {staff.name}
          </option>
        ))}
      </select>
      {!isEditing && (hasAssignedStaff || saveSuccess) && (
        <div className="map-staff-assignment-actions map-staff-assignment-action-right">
          <button
            type="button"
            disabled={staffLoading || staffOptions.length === 0 || isSaving}
            onClick={startEditing}
          >
            {translate("admin_dashboard.map_reassign_staff")}
          </button>
        </div>
      )}
      {!staffLoading && staffOptions.length === 0 && (
        <small
          className="map-staff-options-feedback"
          role={staffLoadError ? "alert" : "status"}
        >
          {staffLoadError ||
            translate("admin_dashboard.map_no_staff_options")}
        </small>
      )}
      {isEditing && (
        <div className="map-staff-assignment-actions">
          <button
            type="button"
            disabled={staffLoading || staffOptions.length === 0 || isSaving}
            onClick={saveAssignment}
          >
            {isSaving
              ? translate("admin_dashboard.map_saving_assignment")
              : translate("admin_dashboard.map_save_assignment")}
          </button>
          {(hasAssignedStaff || saveSuccess) && (
            <button
              type="button"
              className="map-staff-assignment-cancel"
              disabled={isSaving}
              onClick={(event) => {
                event.stopPropagation();
                setIsEditing(false);
                setDraftStaffId("");
                setSaveError("");
              }}
            >
              {translate("admin_dashboard.map_cancel_assignment")}
            </button>
          )}
        </div>
      )}
      {saveSuccess && !isEditing && (
        <small
          className="map-staff-assignment-success"
          role="status"
          aria-label={translate("admin_dashboard.map_assignment_saved")}
        >
          <span aria-hidden="true">✓</span>
          {translate("admin_dashboard.map_assignment_saved")}
        </small>
      )}
      {saveError && (
        <small className="map-staff-assignment-error" role="alert">
          {saveError}
        </small>
      )}
    </div>
  );
};

const MapZoomScale = ({ onZoomChange }) => {
  const map = useMap();

  useEffect(() => {
    const updateZoom = () => onZoomChange(map.getZoom());
    updateZoom();
    map.on("zoomend", updateZoom);
    return () => map.off("zoomend", updateZoom);
  }, [map, onZoomChange]);

  return null;
};

const AdminLeafletMapControls = ({
  translate,
  isSatellite,
  onToggleSatellite,
  isHeatmap,
  onToggleHeatmap,
  reportedRange,
  onReportedRangeChange,
  statusFilter,
  onStatusFilterChange,
  statusOptions,
  onResetFilters,
  complaints,
  isFullscreen,
  onFullscreenChange,
}) => {
  const map = useMap();
  const [isViewMenuOpen, setIsViewMenuOpen] = useState(false);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const viewMenuRef = useRef(null);
  const filterMenuRef = useRef(null);
  const hasActiveFilters = reportedRange !== "all" ||
    statusFilter !== "All";
  const pinIndicators = [
    { type: "all", label: "admin_dashboard.map_pin_all", status: "All" },
    { type: "open", label: "admin_dashboard.map_pin_new", status: "New" },
    { type: "assigned", label: "admin_dashboard.map_pin_assigned", status: "Assigned" },
    { type: "verification", label: "admin_dashboard.map_pin_verification", status: "Under Verification" },
    { type: "rework", label: "admin_dashboard.map_pin_rejected", status: "Rejected" },
    { type: "resolved", label: "admin_dashboard.map_pin_resolved", status: "Resolved" },
  ];

  useEffect(() => {
    const closeMenus = (event) => {
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

    document.addEventListener("pointerdown", closeMenus);
    document.addEventListener("keydown", closeMenus);
    return () => {
      document.removeEventListener("pointerdown", closeMenus);
      document.removeEventListener("keydown", closeMenus);
    };
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const fullscreen = document.fullscreenElement === map.getContainer();
      onFullscreenChange(fullscreen);
      window.setTimeout(() => map.invalidateSize(), 300);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [map, onFullscreenChange]);

  const toggleFullscreen = async (event) => {
    event.stopPropagation();
    try {
      if (document.fullscreenElement === map.getContainer()) {
        await document.exitFullscreen();
      } else {
        await map.getContainer().requestFullscreen();
      }
    } catch (error) {
      console.error("Unable to toggle admin complaint map fullscreen:", error);
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
              aria-controls="admin-leaflet-view-menu-options"
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
                id="admin-leaflet-view-menu-options"
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
              className={`home-leaflet-map-type-button home-leaflet-view-menu-toggle home-leaflet-filter-menu-toggle${hasActiveFilters ? " is-active" : ""}`}
              type="button"
              aria-expanded={isFilterMenuOpen}
              aria-controls="admin-leaflet-filter-menu-options"
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
                id="admin-leaflet-filter-menu-options"
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
                    <option value="1day">{translate("home.map1Day")}</option>
                    <option value="7days">{translate("home.map7Days")}</option>
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
                    <option value="All">
                      {translate("home.mapAllStatuses")}
                    </option>
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {translate(statusOptionTranslationKeys[status] || status)}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className="home-leaflet-map-type-button"
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onResetFilters();
                  }}
                >
                  Reset filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="leaflet-top leaflet-right home-leaflet-map-controls admin-map-right-controls">
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
        <div
          className="leaflet-control admin-map-pin-indicators"
          role="group"
          aria-label={translate("admin_dashboard.map_pin_legend_label")}
        >
          {pinIndicators.map((indicator) => (
            <button
              type="button"
              className={`admin-map-pin-indicator ${statusFilter === indicator.status ? "is-active" : ""}`}
              key={indicator.type}
              aria-pressed={statusFilter === indicator.status}
              onClick={(event) => {
                event.stopPropagation();
                onStatusFilterChange(indicator.status);
                setIsFilterMenuOpen(false);
              }}
            >
              <span
                className={`admin-map-pin-indicator-icon ${indicator.type}`}
                aria-hidden="true"
              />
              <span>{translate(indicator.label)}</span>
            </button>
          ))}
        </div>
      </div>
      {isHeatmap && (
        <div className="leaflet-bottom leaflet-left home-leaflet-heatmap-legend">
          <div>
            <span>{translate("home.mapDensityLow")}</span>
            <span className="home-leaflet-heatmap-gradient" aria-hidden="true" />
            <span>{translate("home.mapDensityHigh")}</span>
          </div>
        </div>
      )}
      {complaints.length === 0 && hasActiveFilters && (
        <div className="home-leaflet-empty-filter-results" role="status">
          {translate("home.mapNoFilteredComplaints")}
        </div>
      )}
    </>
  );
};

const MapBounds = ({ complaints, center, boundaryGeoJson, isFullscreen }) => {
  const map = useMap();
  const previousFullscreen = useRef(isFullscreen);
  const coordinatesKey = complaints.length
    ? [...new Set(complaints.map((complaint) =>
        `${Number(complaint.lat)},${Number(complaint.lng)}`
      ))]
        .sort()
        .join("|")
    : "";

  useEffect(() => {
    const fitMap = () => {
      map.invalidateSize();
      const shouldFitBoundary = isFullscreen;
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
        map.fitBounds(bounds, {
          padding: shouldFitBoundary ? [16, 16] : [32, 32],
          ...(shouldFitBoundary ? {} : { maxZoom: 14 }),
        });
      } else {
        map.setView([center.lat, center.lng], 12);
      }
    };

    const fullscreenChanged = previousFullscreen.current !== isFullscreen;
    previousFullscreen.current = isFullscreen;
    if (fullscreenChanged) {
      const timeout = window.setTimeout(fitMap, 300);
      return () => window.clearTimeout(timeout);
    }

    fitMap();
  }, [boundaryGeoJson, center.lat, center.lng, coordinatesKey, isFullscreen, map]);

  return null;
};

const AdminComplaintsMap = ({
  complaints,
  center,
  boundaryGeoJson = null,
  mapClassName = "ad-complaints-map",
  detailedHomePopups = false,
  translate = (key) => key,
  reportedRange,
  onReportedRangeChange,
  mapStatusFilter,
  onMapStatusFilterChange,
  statusOptions,
  onResetFilters,
  staffOptions = [],
  staffLoadError = "",
  onAssignStaff,
  assignmentSavingKey = "",
  staffLoading = false,
  onGeneratePdf,
  onShareMarathiPdf,
  pdfGeneratingId = "",
  onVerifyComplaint,
  renderPopupActions,
}) => {
  const [isSatellite, setIsSatellite] = useState(false);
  const [isHeatmap, setIsHeatmap] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeComplaintId, setActiveComplaintId] = useState(null);
  const [zoom, setZoom] = useState(12);
  const [imagePreview, setImagePreview] = useState(null);
  const imagePreviewCloseButtonRef = useRef(null);
  const markerRefs = useRef(new Map());
  const markerScale = getComplaintMapMarkerScale(zoom);
  const markersByLocation = complaints.reduce((groups, complaint) => {
    const key = `${Number(complaint.lat)},${Number(complaint.lng)}`;
    groups.set(key, [...(groups.get(key) || []), complaint.id || complaint._id]);
    return groups;
  }, new Map());

  useEffect(() => {
    if (!imagePreview) return undefined;
    const closeOnEscape = (event) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      setImagePreview(null);
    };
    document.addEventListener("keydown", closeOnEscape);
    imagePreviewCloseButtonRef.current?.focus();
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [imagePreview]);

  useEffect(() => {
    if (!activeComplaintId || !isFullscreen) return undefined;
    const timeout = window.setTimeout(
      () => markerRefs.current.get(activeComplaintId)?.openPopup(),
      350
    );
    return () => window.clearTimeout(timeout);
  }, [activeComplaintId, isFullscreen]);

  return (
    <MapContainer
      className={mapClassName}
      center={center}
      zoom={12}
      zoomSnap={0.05}
      zoomControl={false}
      scrollWheelZoom
      touchZoom
    >
      <MapZoomScale onZoomChange={setZoom} />
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
        center={center}
        boundaryGeoJson={boundaryGeoJson}
        isFullscreen={isFullscreen}
      />
      {isHeatmap && <HeatMapLayer complaints={complaints} />}
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
      {!isHeatmap && complaints.map((complaint) => {
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
          sameLocationIds.length > 1
            ? {
                lat: position.lat + (sameLocationIndex - (sameLocationIds.length - 1) / 2) * 0.00018,
                lng: position.lng,
              }
            : position;
        const location = typeof complaint.location === "string"
          ? complaint.location
          : complaint.location?.address || complaint.location?.name || "";
        const photosRecord =
          complaint.photos && typeof complaint.photos === "object"
            ? complaint.photos
            : {};
        const photoSources = [
          ...(Array.isArray(complaint.images) ? complaint.images : []),
          ...(Array.isArray(complaint.citizenPhotos) ? complaint.citizenPhotos : []),
          ...(Array.isArray(photosRecord)
            ? photosRecord
            : Object.values(photosRecord)),
        ];
        const images = [...new Set(photoSources
          .map(getPhotoPath)
          .filter(Boolean))];
        const pinType = isComplaintReworkRequested(complaint)
          ? "rework"
          : isComplaintAwaitingVerification(complaint)
            ? "verification"
            : getComplaintMapPinType(complaint);
        const beforePhoto = detailedHomePopups && pinType === "open"
          ? firstPhotoPath(
              images[0],
              complaint.beforePhoto,
              photosRecord.before,
              complaint.sitePhoto,
              complaint.inspection?.sitePhoto
            )
          : firstPhotoPath(
              complaint.inspection?.sitePhoto,
              complaint.sitePhoto,
              complaint.beforePhoto,
              photosRecord.site,
              photosRecord.before,
              images[0]
            );
        const afterPhoto = firstPhotoPath(
          complaint.inspection?.completionPhoto,
          complaint.completionPhoto,
          complaint.afterPhoto,
          photosRecord.after
        );
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
          : [
              ...(beforePhoto ? [{ label: "Before / site", url: beforePhoto }] : []),
              ...(afterPhoto ? [{ label: "After work", url: afterPhoto }] : []),
              ...images
                .filter((photo) => photo !== beforePhoto && photo !== afterPhoto)
                .map((url, index) => ({
                  label: `Complaint photo ${index + 1}`,
                  url,
                })),
            ];
        const reportedAt = complaint.createdAt || complaint.date;
        const parsedReportedAt = reportedAt ? new Date(reportedAt) : null;
        const reportDate = parsedReportedAt && !Number.isNaN(parsedReportedAt.getTime())
          ? parsedReportedAt.toLocaleString()
          : "Not available";
        const markerIcon = divIcon({
          className: "scm-marker",
          html: getComplaintMapMarkerSvg(complaint, pinType, true, markerScale),
          iconSize: [52 * markerScale, 66 * markerScale],
          iconAnchor: [26 * markerScale, 63 * markerScale],
          popupAnchor: [0, -50 * markerScale],
        });
        const isResolvedComplaint = ["resolved", "closed"].includes(
          String(complaint.status || "").trim().toLowerCase()
        );
        const hasAssignedStaff = Boolean(
          complaint.assignedStaff || complaint.assignedStaffId
        );
        const canAssignStaff = onAssignStaff &&
          !isResolvedComplaint &&
          pinType !== "verification" &&
          !(pinType === "rework" && hasAssignedStaff);

        return (
          <Marker
            key={complaint.id || complaint._id}
            ref={(marker) => {
              const complaintId = String(complaint.id || complaint._id || "");
              if (marker) markerRefs.current.set(complaintId, marker);
              else markerRefs.current.delete(complaintId);
            }}
            position={markerPosition}
            icon={markerIcon}
            title={`${complaint.complaintNumber || translate("admin_dashboard.map_popup_complaint_fallback")} - ${complaint.issue || complaint.issueType || translate("admin_dashboard.map_popup_reported_issue_fallback")}`}
            eventHandlers={{
              click: () => setActiveComplaintId(
                String(complaint.id || complaint._id || "")
              ),
              popupopen: () => setActiveComplaintId(
                String(complaint.id || complaint._id || "")
              ),
            }}
          >
            <Popup
              maxWidth={560}
              minWidth={320}
              className={`admin-map-complaint-popup${detailedHomePopups ? " home-map-popup" : ""}${isFullscreen ? " home-map-popup-expanded" : ""}`}
              eventHandlers={{
                popupclose: () => {
                  if (!isFullscreen) {
                    setActiveComplaintId((selectedId) =>
                      String(selectedId) === String(complaint.id || complaint._id)
                        ? null
                        : selectedId
                    );
                  }
                },
              }}
            >
              <div className="scm-popup">
                {pinType === "rework" && (
                  <div className="map-rework-notice" role="status">
                    {translate("admin_dashboard.map_rejected_reassign_notice", {
                      actor: getComplaintRejectionActor(complaint) ||
                        translate("admin_dashboard.map_rejected_by_unknown"),
                    })}
                  </div>
                )}
                <div className="home-map-popup-heading">
                  <strong>{complaint.complaintNumber || translate("admin_dashboard.map_popup_complaint_fallback")}</strong>
                  {detailedHomePopups && (
                    <span className={`home-map-status ${pinType}`}>
                      {complaint.status
                        ? translate(complaint.status, { defaultValue: complaint.status })
                        : translate("admin_dashboard.map_popup_status_unavailable")}
                    </span>
                  )}
                </div>
                <p>
                  <b>{translate("admin_dashboard.map_popup_issue_label")}:</b>{" "}
                  {complaint.issue || complaint.issueType
                    ? translate(complaint.issue || complaint.issueType, {
                        defaultValue: complaint.issue || complaint.issueType,
                      })
                    : translate("admin_dashboard.map_popup_reported_issue_fallback")}
                </p>
                <p>
                  <b>{translate("admin_dashboard.map_popup_category_label")}:</b>{" "}
                  {complaint.category
                    ? translate(complaint.category, { defaultValue: complaint.category })
                    : translate("admin_dashboard.map_popup_category_unavailable")}
                </p>
                {!detailedHomePopups && (
                  <p>
                    <b>{translate("admin_dashboard.map_popup_status_label")}:</b>{" "}
                    {complaint.status
                      ? translate(complaint.status, { defaultValue: complaint.status })
                      : translate("admin_dashboard.map_popup_status_unavailable")}
                  </p>
                )}
                <p><b>{translate("admin_dashboard.map_popup_location_label")}:</b> {location || translate("admin_dashboard.map_popup_address_unprovided")}</p>
                {complaint.landmark && <p><b>{translate("admin_dashboard.map_popup_landmark_label")}:</b> {complaint.landmark}</p>}
                <p><b>{translate("admin_dashboard.map_popup_reported_label")}:</b> {reportDate}</p>
                {complaint.citizenName && (
                  <p><b>{translate("admin_dashboard.map_popup_reported_by_label")}:</b> {complaint.citizenName}</p>
                )}
                {complaint.assignedStaff && (
                  <p><b>{translate("admin_dashboard.map_popup_assigned_staff_label")}:</b> {complaint.assignedStaff}</p>
                )}
                <p>
                  <b>{translate("admin_dashboard.map_popup_coordinates_label")}:</b>{" "}
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
                          <button
                            className="admin-map-image-preview-trigger"
                            type="button"
                            aria-label={`Preview ${photo.label}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              setImagePreview({
                                url: toMediaUrl(photo.url),
                                label: photo.label,
                              });
                            }}
                          >
                            <img src={toMediaUrl(photo.url)} alt={photo.label} loading="lazy" />
                          </button>
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
                      <button
                        className="admin-map-image-preview-trigger"
                        type="button"
                        aria-label={`Preview ${photo.label}`}
                        key={`${photo.url}-${index}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          setImagePreview({
                            url: toMediaUrl(photo.url),
                            label: photo.label,
                          });
                        }}
                      >
                        <img
                          src={toMediaUrl(photo.url)}
                          alt={photo.label}
                          loading="lazy"
                        />
                        <span>{photo.label}</span>
                      </button>
                    ))}
                  </div>
                )}
                {canAssignStaff ||
                onGeneratePdf ||
                renderPopupActions ||
                (onVerifyComplaint &&
                  (pinType === "verification" ||
                    String(complaint.status || "").trim().toLowerCase() === "verified")) ? (
                  <div className="admin-map-popup-actions">
                    {renderPopupActions?.(complaint)}
                    {onVerifyComplaint &&
                      (pinType === "verification" ||
                        String(complaint.status || "").trim().toLowerCase() === "verified") && (
                        <VerifierDecisionForm
                          complaint={complaint}
                          onVerify={onVerifyComplaint}
                        />
                      )}
                    {canAssignStaff && (
                      <MapStaffAssignment
                        complaint={complaint}
                        staffOptions={staffOptions}
                        staffLoading={staffLoading}
                        staffLoadError={staffLoadError}
                        assignmentSavingKey={assignmentSavingKey}
                        onAssignStaff={onAssignStaff}
                        translate={translate}
                      />
                    )}
                    <ComplaintMapPdfActions
                      complaint={complaint}
                      onGeneratePdf={onGeneratePdf}
                      onShareMarathiPdf={onShareMarathiPdf}
                      generatingId={pdfGeneratingId}
                      translate={translate}
                    />
                  </div>
                ) : null}
              </div>
            </Popup>
          </Marker>
        );
      })}
      <AdminLeafletMapControls
        translate={translate}
        isSatellite={isSatellite}
        onToggleSatellite={() => setIsSatellite((current) => !current)}
        isHeatmap={isHeatmap}
        onToggleHeatmap={() => setIsHeatmap((current) => !current)}
        reportedRange={reportedRange}
        onReportedRangeChange={onReportedRangeChange}
        statusFilter={mapStatusFilter}
        onStatusFilterChange={onMapStatusFilterChange}
        statusOptions={statusOptions}
        onResetFilters={onResetFilters}
        complaints={complaints}
        isFullscreen={isFullscreen}
        onFullscreenChange={setIsFullscreen}
      />
      {imagePreview && (
        <div
          className="admin-map-image-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`${imagePreview.label} preview`}
          onClick={() => setImagePreview(null)}
        >
          <button
            ref={imagePreviewCloseButtonRef}
            className="admin-map-image-lightbox-close"
            type="button"
            aria-label="Close image preview"
            onClick={(event) => {
              event.stopPropagation();
              setImagePreview(null);
            }}
          >
            ×
          </button>
          <img
            src={imagePreview.url}
            alt={imagePreview.label}
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </MapContainer>
  );
};

export default AdminComplaintsMap;
