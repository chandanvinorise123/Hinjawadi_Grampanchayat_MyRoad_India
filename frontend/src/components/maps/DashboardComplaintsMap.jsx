import React, { useEffect, useMemo, useState } from "react";
import HomeLeafletComplaintsMap from "./HomeLeafletComplaintsMap";
import { isWithinReportedRange } from "./homeComplaintMapFilters";

const DEFAULT_CENTER = { lat: 18.5913, lng: 73.7389 };

const normalizeCoordinates = (complaint) => {
  const latitudeValue = complaint.lat ??
    complaint.coordinates?.latitude ??
    complaint.coordinates?.lat;
  const longitudeValue = complaint.lng ??
    complaint.coordinates?.longitude ??
    complaint.coordinates?.lng;
  const lat = Number(latitudeValue);
  const lng = Number(longitudeValue);

  if (
    latitudeValue === null ||
    latitudeValue === undefined ||
    latitudeValue === "" ||
    longitudeValue === null ||
    longitudeValue === undefined ||
    longitudeValue === "" ||
    !Number.isFinite(lat) ||
    lat < -90 ||
    lat > 90 ||
    !Number.isFinite(lng) ||
    lng < -180 ||
    lng > 180
  ) {
    return null;
  }

  return { ...complaint, lat, lng };
};

const DashboardComplaintsMap = ({
  complaints = [],
  center,
  translate = (key) => key,
  selectedComplaintId = null,
  onMapClick,
  onComplaintSelect,
  onComplaintClose,
  onVisibleComplaintsChange,
  largePopup = false,
  renderPopupActions,
  highlightVerificationRequests = false,
  highlightReworkRequests = false,
}) => {
  const [boundaryGeoJson, setBoundaryGeoJson] = useState(null);
  const [boundaryError, setBoundaryError] = useState(false);
  const [reportedRange, setReportedRange] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const locatedComplaints = useMemo(
    () => complaints.map(normalizeCoordinates).filter(Boolean),
    [complaints]
  );
  const categories = useMemo(
    () => [...new Set(locatedComplaints.map((complaint) => complaint.category).filter(Boolean))].sort(),
    [locatedComplaints]
  );
  const statuses = useMemo(
    () => [...new Set(locatedComplaints.map((complaint) => complaint.status).filter(Boolean))].sort(),
    [locatedComplaints]
  );
  const priorities = useMemo(
    () => [...new Set(locatedComplaints.map((complaint) => complaint.priority).filter(Boolean))].sort(),
    [locatedComplaints]
  );
  const statusOptions = [
    { value: "all", label: translate("home.mapAllStatuses") },
    ...statuses.map((status) => ({ value: status, label: status })),
  ];

  const visibleComplaints = useMemo(
    () => locatedComplaints.filter((complaint) =>
      isWithinReportedRange(complaint, reportedRange) &&
      (statusFilter === "all" || complaint.status === statusFilter) &&
      (categoryFilter === "all" || complaint.category === categoryFilter) &&
      (priorityFilter === "all" || complaint.priority === priorityFilter)
    ),
    [categoryFilter, locatedComplaints, priorityFilter, reportedRange, statusFilter]
  );

  useEffect(() => {
    if (!onVisibleComplaintsChange) return;
    onVisibleComplaintsChange(visibleComplaints);
  }, [onVisibleComplaintsChange, visibleComplaints]);

  useEffect(() => {
    let active = true;

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

        if (active) {
          setBoundaryGeoJson(boundary);
          setBoundaryError(false);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard map boundary:", error);
        if (active) setBoundaryError(true);
      }
    };

    fetchBoundary();
    return () => {
      active = false;
    };
  }, []);

  const resetFilters = () => {
    setReportedRange("all");
    setStatusFilter("all");
    setCategoryFilter("all");
    setPriorityFilter("all");
  };
  const mapCenter = center ||
    (locatedComplaints[0]
      ? { lat: locatedComplaints[0].lat, lng: locatedComplaints[0].lng }
      : DEFAULT_CENTER);

  return (
    <>
      {boundaryError && (
        <p className="home-map-message" role="alert">
          {translate("home.mapBoundaryError")}
        </p>
      )}
      <HomeLeafletComplaintsMap
        complaints={locatedComplaints}
        visibleComplaints={visibleComplaints}
        center={mapCenter}
        boundaryGeoJson={boundaryGeoJson}
        mapClassName="dashboard-complaints-map home-live-complaints-map"
        translate={translate}
        selectedComplaintId={selectedComplaintId}
        onMapClick={onMapClick}
        onComplaintSelect={onComplaintSelect}
        onComplaintClose={onComplaintClose}
        largePopup={largePopup}
        renderPopupActions={renderPopupActions}
        highlightVerificationRequests={highlightVerificationRequests}
        highlightReworkRequests={highlightReworkRequests}
        persistSelectedComplaint={false}
        fullscreenFitBoundaryOnly
        showZoomControl={false}
        reportedRange={reportedRange}
        onReportedRangeChange={setReportedRange}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        statusOptions={statusOptions}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        categories={categories}
        priorityFilter={priorityFilter}
        onPriorityFilterChange={setPriorityFilter}
        priorityOptions={priorities}
        onResetFilters={resetFilters}
      />
    </>
  );
};

export default DashboardComplaintsMap;
