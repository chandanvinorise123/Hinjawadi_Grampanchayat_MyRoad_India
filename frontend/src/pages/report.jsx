import React, { useCallback, useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import * as turf from "@turf/turf";
import ReportLeafletMap from "../components/maps/ReportLeafletMap";

import "./report.css";
import PhotoDetection from "../components/PhotoDetection";
import { API_BASE_URL } from "../utils/dashboardApi";

const categories = [
  {
    title: "Road Issues",
    issues: [
      "Road Potholes",
      "Damaged Road",
      "Road Cracks",
      "Damaged Surface",
      "Damaged Road Edges",
      "Waterlogging",
      "Uneven Surface",
      "Road Obstruction",
      "Traffic Obstruction",
      "Accident-Prone Area",
      "Other Road Issue",
    ],
  },
  {
    title: "Sewerage & Drain Issues",
    issues: [
      "Sewerage Choked",
      "Broken Sewerage",
      "Improper Water Flow",
      "Sewage Overflow",
      "Rainwater Waterlogging",
      "Drainage Issues",
      "Damaged Covers",
      "Damaged Culvert",
      "Leaking Pipeline",
      "Cleaning Required",
      "Bad Odour / Mosquito",
      "New Drain Required",
      "Broken Manhole",
    ],
  },
  {
    title: "Drinking Water Issues",
    issues: [
      "Pipeline Leakage",
      "New Pipeline",
      "Low Water Pressure",
      "Irregular Supply",
      "Water Disruption",
      "Contaminated Water",
      "Bad Odour",
      "Broken Pipeline",
      "No Tap Water",
      "Supply Timing",
      "Insufficient Supply",
      "New Water Connection",
      "Damaged Public Tap",
      "Water Quality Testing",
    ],
  },
  {
    title: "Streetlight Issues",
    issues: [
      "Light Not Working",
      "Damaged Pole",
      "Broken Light",
      "Missing Streetlight",
      "Electrical Issue",
      "Other Streetlight Issue",
    ],
  },
  {
    title: "Road Safety Issues",
    issues: [
      "Damaged Signboards",
      "Missing Signboards",
      "Speed Breaker Issues",
      "Road Marking Issues",
      "Pedestrian Signage",
      "Safety Barrier Issues",
      "Dangerous Turn / Curve",
      "Accident-Prone Area",
      "Other Safety Issue",
    ],
  },
  {
    title: "Bridge & Culvert Issues",
    issues: [
      "Bridge Damage",
      "Culvert Damage",
      "Damaged Railing",
      "Water Flow Issues",
      "Drainage Issues",
      "Obstruction Around Bridge/Culvert",
      "Other Bridge Issue",
    ],
  },
  {
    title: "Footpath Issues",
    issues: [
      "Damaged Footpath",
      "Broken Footpath Tiles",
      "Footpath Encroachment",
      "Blocked Footpath",
      "Uneven Footpath",
      "Illegal Parking on Footpath",
      "Footpath Obstruction",
      "Other Footpath Issue",
    ],
  },
  {
    title: "Garbage Issues",
    issues: [
      "Garbage Accumulation",
      "Overflowing Dustbins",
      "Illegal Garbage Dumping",
      "Uncollected Garbage",
    ],
  },
];

const defaultCenter = {
  lat: 18.494,
  lng: 73.760,
};

const INITIAL_LIVE_LOCATION_ZOOM = 15;

const BOUNDARY_URL = "/boundaries/hinjavadi.geojson";
const PHOTON_API_URL = "https://photon.komoot.io";

const getPhotonFeatureLabel = (properties = {}) =>
  [...new Set([
    properties.name,
    [properties.street, properties.housenumber].filter(Boolean).join(" "),
    properties.city || properties.town || properties.village || properties.district,
    properties.state,
  ].filter(Boolean))]
    .join(", ");

const ReportIssue = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  // Google Maps API key and loader are disabled; the report map uses Leaflet.

  // Complaint state
  const [complaintNumber, setComplaintNumber] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Hinjawadi boundary state
  const [boundaryLoading, setBoundaryLoading] = useState(true);
  const [hinjawadiBoundary, setHinjawadiBoundary] = useState(null);

  // Citizen details
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");

  // Location state: map is open by default
  const [locationMode, setLocationMode] = useState("map");

  const [selectedLocation, setSelectedLocation] = useState({
    lat: null,
    lng: null,
  });
  const [selectedAddress, setSelectedAddress] = useState("");

  const [liveLocation, setLiveLocation] = useState({
    lat: "",
    lng: "",
  });
  const [liveLocationAccuracy, setLiveLocationAccuracy] = useState(null);
  const [showLiveLocationInfo, setShowLiveLocationInfo] = useState(false);
  const [liveLocationAddress, setLiveLocationAddress] = useState("");
  const [liveLocationPhoto, setLiveLocationPhoto] = useState("");
  const [liveLocationDetailsLoading, setLiveLocationDetailsLoading] = useState(false);

  const [locationStatus, setLocationStatus] = useState("idle");
  const [mapTypeId, setMapTypeId] = useState("roadmap");
  const [map, setMap] = useState(null);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const geocodeRequestId = useRef(0);
  const locationRequestId = useRef(0);
  const gpsAutoCentered = useRef(false);
  const livePlaceRequestId = useRef(0);
  const liveLocationRef = useRef(liveLocation);

  // Issue state
  const [issueType, setIssueType] = useState(
    location.state?.issueType || ""
  );

  // Photo verification state
  const [verifiedPhotosData, setVerifiedPhotosData] = useState([]);
  const [capturedLocation, setCapturedLocation] = useState(null);

  // Direct Photo Upload / Capture State
  const [selectedPhotos, setSelectedPhotos] = useState([]);

  // Load the selected issue type passed through navigation.
  useEffect(() => {
    if (location.state?.issueType) {
      setIssueType(location.state.issueType);
    }
  }, [location.state]);

  // Start live GPS tracking whenever the report page opens.
  useEffect(() => {
    setLocationMode("live");
    setLocationStatus("loading");

    if (!navigator.geolocation) {
      setLocationStatus("error");
      setErrorMessage("This browser does not support location. Use a current browser and allow location access.");
      return undefined;
    }

    if (!window.isSecureContext) {
      setLocationStatus("error");
      setErrorMessage("Browser location requires HTTPS or localhost. Open this site using a secure connection.");
      return undefined;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const nextLocation = {
          lat: position.coords.latitude.toFixed(6),
          lng: position.coords.longitude.toFixed(6),
        };
        liveLocationRef.current = nextLocation;
        setLiveLocation(nextLocation);
        setLiveLocationAccuracy(position.coords.accuracy);
        setLocationStatus("captured");
        setErrorMessage("");
      },
      (error) => {
        console.error("Automatic geolocation error:", error);
        setLocationStatus("error");

        switch (error.code) {
          case 1:
            setErrorMessage("Location permission denied. Allow location access in your browser settings, then retry.");
            break;
          case 2:
            setErrorMessage("Your current location is unavailable. Check your device location settings.");
            break;
          case 3:
            setErrorMessage("");
            break;
          default:
            setErrorMessage("Could not fetch your live location. Please retry.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 5000,
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Load citizen details from localStorage.
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user");
      if (!storedUser) return;

      const user = JSON.parse(storedUser);

      setFullName(user.name || "");
      setMobile(user.mobile || "");
    } catch (error) {
      console.error("Unable to read logged-in user:", error);
    }
  }, []);

  // Load the Hinjawadi boundary GeoJSON.
  useEffect(() => {
    let cancelled = false;

    const loadBoundary = async () => {
      setBoundaryLoading(true);

      try {
        const response = await fetch(BOUNDARY_URL);

        if (!response.ok) {
          throw new Error(
            `Boundary request failed: ${response.status}`
          );
        }

        const boundary = await response.json();

        if (
          boundary?.type !== "FeatureCollection" ||
          !Array.isArray(boundary.features) ||
          boundary.features.length === 0
        ) {
          throw new Error("Invalid boundary GeoJSON.");
        }

        const validFeatures = boundary.features.filter(
          (feature) =>
            feature?.geometry &&
            ["Polygon", "MultiPolygon"].includes(
              feature.geometry.type
            )
        );

        if (validFeatures.length === 0) {
          throw new Error(
            "GeoJSON has no valid Polygon or MultiPolygon features."
          );
        }

        const validatedBoundary = {
          ...boundary,
          features: validFeatures,
        };

        const bbox = turf.bbox(validatedBoundary);

        if (
          bbox.length !== 4 ||
          !bbox.every(Number.isFinite) ||
          bbox[0] > bbox[2] ||
          bbox[1] > bbox[3]
        ) {
          throw new Error("Invalid boundary coordinates.");
        }

        if (!cancelled) {
          setHinjawadiBoundary(validatedBoundary);
          setErrorMessage("");
        }
      } catch (error) {
        console.error("Boundary loading error:", error);

        if (!cancelled) {
          setHinjawadiBoundary(null);
          setErrorMessage(
            "Unable to load the Hinjawadi boundary. Check public/boundaries/hinjavadi.geojson."
          );
        }
      } finally {
        if (!cancelled) {
          setBoundaryLoading(false);
        }
      }
    };

    loadBoundary();

    return () => {
      cancelled = true;
    };
  }, []);

  // Save the Leaflet map instance and initialize its position.
  const handleMapLoad = useCallback((mapInstance) => {
    setMap(mapInstance);

    if (!mapInstance) return;
    if (liveLocationRef.current.lat !== "" && liveLocationRef.current.lng !== "") {
      mapInstance.setView(
        [Number(liveLocationRef.current.lat), Number(liveLocationRef.current.lng)],
        INITIAL_LIVE_LOCATION_ZOOM
      );
    } else {
      mapInstance.setView([defaultCenter.lat, defaultCenter.lng], INITIAL_LIVE_LOCATION_ZOOM);
    }
    gpsAutoCentered.current =
      liveLocationRef.current.lat !== "" && liveLocationRef.current.lng !== "";
  }, []);

  const changeMapZoom = (amount) => {
    if (!map) return;

    const currentZoom = map.getZoom() ?? INITIAL_LIVE_LOCATION_ZOOM;
    map.setZoom(Math.min(21, Math.max(3, currentZoom + amount)));
  };

  const selectIssueLocation = (lat, lng, address = "") => {
    setLocationMode("map");
    setSelectedLocation({ lat, lng });
    setSelectedAddress(address);
    setErrorMessage("");

    const requestId = ++geocodeRequestId.current;
    if (address) return;

    fetch(
      `${PHOTON_API_URL}/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&lang=en`
    )
      .then((response) => {
        if (!response.ok) throw new Error(`Reverse geocoding failed (${response.status})`);
        return response.json();
      })
      .then((result) => {
        if (requestId !== geocodeRequestId.current) return;
        setSelectedAddress(getPhotonFeatureLabel(result?.features?.[0]?.properties));
      })
      .catch((error) => {
        if (requestId !== geocodeRequestId.current) return;
        console.error("Reverse geocoding failed:", error);
        setSelectedAddress("");
      });
  };

  // Fit the loaded boundary in the Leaflet map.
  useEffect(() => {
    if (!map || !hinjawadiBoundary) return;

    try {
      const [minLng, minLat, maxLng, maxLat] = turf.bbox(hinjawadiBoundary);
      map.fitBounds(
        [[minLat, minLng], [maxLat, maxLng]],
        { padding: [28, 28] }
      );
      gpsAutoCentered.current = true;
    } catch (error) {
      console.error("Error fitting the Hinjawadi boundary:", error);

      setErrorMessage(
        "The Hinjawadi boundary could not be displayed on the map."
      );
    }
  }, [map, hinjawadiBoundary]);

  useEffect(() => {
    if (
      !map ||
      gpsAutoCentered.current ||
      liveLocation.lat === "" ||
      liveLocation.lng === ""
    ) {
      return;
    }

    map.setView(
      [Number(liveLocation.lat), Number(liveLocation.lng)],
      INITIAL_LIVE_LOCATION_ZOOM
    );
    gpsAutoCentered.current = true;
  }, [map, liveLocation.lat, liveLocation.lng]);

  useEffect(() => {
    if (!map) return;

    if (selectedLocation.lat !== null && selectedLocation.lng !== null) {
      map.setView([selectedLocation.lat, selectedLocation.lng], 18);
    }
  }, [map, selectedLocation, locationMode]);

  const handleLiveLocationMarkerClick = async () => {
    setShowLiveLocationInfo(true);

    if (!liveLocation.lat || !liveLocation.lng) {
      return;
    }

    const requestId = ++livePlaceRequestId.current;
    const latitude = Number(liveLocation.lat);
    const longitude = Number(liveLocation.lng);
    setLiveLocationDetailsLoading(true);
    setLiveLocationAddress("");
    setLiveLocationPhoto("");

    try {
      const response = await fetch(
        `${PHOTON_API_URL}/reverse?lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}&lang=en`
      );
      if (!response.ok) {
        throw new Error(`Current-location lookup failed (${response.status})`);
      }
      const result = await response.json();
      if (requestId !== livePlaceRequestId.current) return;
      setLiveLocationAddress(
        getPhotonFeatureLabel(result?.features?.[0]?.properties)
      );
    } catch (error) {
      if (requestId !== livePlaceRequestId.current) return;
      console.error("Current-location reverse geocoding failed:", error);
    } finally {
      if (requestId === livePlaceRequestId.current) {
        setLiveLocationDetailsLoading(false);
      }
    }
  };

  // Click the map to select the complaint location.
  const handleMapClick = (event) => {
    if (!event.latlng) return;
    selectIssueLocation(event.latlng.lat, event.latlng.lng);
  };

  // Update the selected issue location after the marker is dragged.
  const handleMarkerDragEnd = (event) => {
    const position = event.target?.getLatLng?.();
    if (!position) return;
    selectIssueLocation(position.lat, position.lng);
  };

  // Request the device's live location.
  const handleUseLiveLocation = () => {
    const requestId = ++locationRequestId.current;
    setLocationMode("live");
    setLocationStatus("loading");
    setErrorMessage("");

    if (liveLocationRef.current.lat !== "" && liveLocationRef.current.lng !== "") {
      setSelectedLocation({
        lat: Number(liveLocationRef.current.lat),
        lng: Number(liveLocationRef.current.lng),
      });
    }

    if (!navigator.geolocation) {
      setLocationStatus("error");
      setErrorMessage(
        "This browser does not support location. Use a current browser and allow location access."
      );
      return;
    }

    if (!window.isSecureContext) {
      setLocationStatus("error");
      setErrorMessage(
        "Browser location requires a secure connection. Open this site with HTTPS or on localhost."
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (requestId !== locationRequestId.current) return;

        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        const nextLocation = {
          lat: latitude.toFixed(6),
          lng: longitude.toFixed(6),
        };
        liveLocationRef.current = nextLocation;
        setLiveLocation(nextLocation);
        setSelectedLocation({
          lat: latitude,
          lng: longitude,
        });
        setLiveLocationAccuracy(position.coords.accuracy);

        setLocationStatus("captured");
        setErrorMessage("");
      },
      (error) => {
        if (requestId !== locationRequestId.current) return;
        console.error("Geolocation error:", error);
        setLocationStatus("error");

        switch (error.code) {
          case 1:
            setErrorMessage(
              "Location permission denied. Allow location access in your browser settings."
            );
            break;
          case 2:
            setErrorMessage(
              "Your current location is unavailable. Check your device location settings."
            );
            break;
          case 3:
            setErrorMessage("");
            break;
          default:
            setErrorMessage(
              "Could not fetch your live location. Please try again."
            );
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
      }
    );
  };

  // Handle Photo Upload / Capture
  const handlePhotoCapture = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      const newPhotos = files.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
        name: file.name,
      }));

      setSelectedPhotos((prev) => [...prev, ...newPhotos]);

      // Update verifiedPhotosData to satisfy existing form validation
      const newVerifiedData = newPhotos.map((photo, index) => ({
        publicUrl: photo.preview, // In a real app, this would be the uploaded URL
        file: photo.file,
        verificationId: `upload-${Date.now()}-${index}`,
        verified: true,
        requiresReview: false,
        location: selectedLocation.lat
          ? { latitude: selectedLocation.lat, longitude: selectedLocation.lng }
          : null,
      }));

      setVerifiedPhotosData((prev) => [...prev, ...newVerifiedData]);
    }
    // Reset input value to allow selecting the same file again if needed
    e.target.value = "";
  };

  // Remove a selected photo
  const removePhoto = (index) => {
    setSelectedPhotos((prev) => prev.filter((_, i) => i !== index));
    setVerifiedPhotosData((prev) => prev.filter((_, i) => i !== index));
  };

  // Photo verification callbacks.
  const handlePhotoVerified = (photoId, aiResult) => {
    console.log("Photo verified:", photoId, aiResult);
  };

  const handlePhotoRejected = (photoId, reason) => {
    console.log("Photo rejected:", photoId, reason);
    alert(`${t("report.photoRejected")}: ${reason}`);
  };

  // Submit report.
  const handleSubmitReport = async (event) => {
    event.preventDefault();
    setErrorMessage("");

    if (selectedPhotos.length === 0) {
      setErrorMessage("Please upload or capture at least one complaint photo.");
      return;
    }

    if (!fullName.trim()) {
      setErrorMessage("Please enter your full name.");
      return;
    }

    if (!/^\d{10}$/.test(mobile)) {
      setErrorMessage("Please enter a valid 10-digit mobile number.");
      return;
    }

    if (!issueType) {
      setErrorMessage("Please select an issue type.");
      return;
    }

    if (selectedLocation.lat === null || selectedLocation.lng === null) {
      alert("Please select the issue location on the map or click Use Live Location.");
      return;
    }

    const latitude = Number(selectedLocation.lat);
    const longitude = Number(selectedLocation.lng);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      alert("Please select valid geographic coordinates.");
      return;
    }

    // ✅ REMOVED: Strict photo location matching validation. 
    // Users can now capture/upload photos from anywhere (inside or outside Hinjawadi).

    // Include citizen ID if a logged-in user is available.
    let user = null;

    try {
      user = JSON.parse(localStorage.getItem("user") || "null");
    } catch (error) {
      console.error("Unable to parse user:", error);
    }

    const complaintData = new FormData();
    complaintData.append(
      "category",
      categories.find((category) => category.issues.includes(issueType))?.title || ""
    );
    complaintData.append("citizenName", fullName.trim());
    complaintData.append("mobile", mobile);
    complaintData.append("issueType", issueType);
    complaintData.append("description", "");
    complaintData.append("location", `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
    complaintData.append("locationUrl", "Map selected location");
    complaintData.append("landmark", selectedAddress.trim());
    complaintData.append("coordinates", JSON.stringify({ latitude, longitude }));
    if (user?.id || user?._id) {
      complaintData.append("citizenId", user.id || user._id);
    }

    selectedPhotos.forEach(({ file }) => {
      if (file) complaintData.append("images", file);
    });

    const photoVerifications = verifiedPhotosData
      .filter((photo) => photo.verified || photo.requiresReview)
      .map(({ publicUrl, verificationId, verified, requiresReview, location }) => ({
        publicUrl,
        verificationId,
        verified,
        requiresReview,
        location,
      }))
      .filter((photo) =>
        photo.publicUrl &&
        !photo.publicUrl.startsWith("blob:") &&
        !photo.publicUrl.startsWith("data:") &&
        photo.location
      );
    if (photoVerifications.length > 0) {
      complaintData.append("photoVerifications", JSON.stringify(photoVerifications));
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/complaints`,
        {
          method: "POST",
          body: complaintData,
        }
      );

      let data = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
        throw new Error(
          data.message || t("report.submitFailed")
        );
      }

      const submittedComplaintNumber = data.complaintNumber || data.data?.complaintNumber;
      if (!submittedComplaintNumber) {
        throw new Error(
          t("report.missingComplaintNumber")
        );
      }

      setComplaintNumber(submittedComplaintNumber);
    } catch (error) {
      console.error("Submission error:", error);

      setErrorMessage(
        `${t("report.error")}: ${error.message}`
      );
    } finally {
      setLoading(false);
    }
  };

  // Reset form after successful submission.
  const resetForm = () => {
    geocodeRequestId.current += 1;
    locationRequestId.current += 1;
    setComplaintNumber(null);
    setFullName("");
    setMobile("");
    setLocationMode("live");
    setSelectedLocation({ lat: null, lng: null });
    setSelectedAddress("");
    setLocationStatus(
      liveLocation.lat !== "" && liveLocation.lng !== "" ? "captured" : "loading"
    );
    setShowLiveLocationInfo(false);
    setLiveLocationAddress("");
    setLiveLocationPhoto("");
    gpsAutoCentered.current = false;
    setIssueType("");
    setVerifiedPhotosData([]);
    setSelectedPhotos([]);
    setCapturedLocation(null);
    setErrorMessage("");

    if (map) {
      if (hinjawadiBoundary) {
        const [minLng, minLat, maxLng, maxLat] = turf.bbox(hinjawadiBoundary);
        map.fitBounds(
          [[minLat, minLng], [maxLat, maxLng]],
          { padding: [28, 28] }
        );
        gpsAutoCentered.current = true;
      } else if (liveLocation.lat !== "" && liveLocation.lng !== "") {
        map.setView(
          [Number(liveLocation.lat), Number(liveLocation.lng)],
          INITIAL_LIVE_LOCATION_ZOOM
        );
        gpsAutoCentered.current = true;
      } else {
        map.setView(
          [defaultCenter.lat, defaultCenter.lng],
          INITIAL_LIVE_LOCATION_ZOOM
        );
      }
    }
  };

  return (
    <main className="report-page">
      <section className="section">
        {complaintNumber === null ? (
          <div className="report-shell">
            <div className="report-shell-header">
              <h2>{t("report.title")}</h2>
            </div>

            <form
              className="report-grid"
              onSubmit={handleSubmitReport}
              noValidate
            >
              {/* Left column: citizen details and report information */}
              <div className="report-col">
                <div className="form-field">
                  <label htmlFor="fullName">
                    {t("report.fullName")}
                  </label>

                  <input
                    id="fullName"
                    type="text"
                    placeholder={t("report.namePlaceholder")}
                    value={fullName}
                    onChange={(event) =>
                      setFullName(event.target.value)
                    }
                    required
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="mobile">
                    {t("report.mobile")}
                  </label>

                  <div className="input-with-icon">
                    <input
                      id="mobile"
                      type="tel"
                      placeholder={t("report.mobilePlaceholder")}
                      maxLength={10}
                      pattern="[0-9]{10}"
                      value={mobile}
                      onChange={(event) =>
                        setMobile(
                          event.target.value.replace(/\D/g, "")
                        )
                      }
                      required
                    />

                    <span className="field-icon">📱</span>
                  </div>
                </div>

                <div className="form-field">
                  <label htmlFor="issueType">
                    {t("report.issueType")}
                  </label>

                  <select
                    id="issueType"
                    value={issueType}
                    onChange={(event) =>
                      setIssueType(event.target.value)
                    }
                    required
                  >
                    <option value="" disabled>
                      {t("report.selectIssueType")}
                    </option>

                    {categories.map((category) => (
                      <optgroup
                        key={category.title}
                        label={t(category.title, { defaultValue: category.title })}
                      >
                        {category.issues.map((issue) => (
                          <option key={issue} value={issue}>
                            {t(issue, {
                              defaultValue: issue,
                            })}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                <div className="form-field report-location-section">
                  <>
                    <div className="report-map-container">
                      <ReportLeafletMap
                        boundary={hinjawadiBoundary}
                        liveLocation={liveLocation}
                        liveLocationAccuracy={liveLocationAccuracy}
                        showLiveLocationInfo={showLiveLocationInfo}
                        liveLocationAddress={liveLocationAddress}
                        liveLocationPhoto={liveLocationPhoto}
                        liveLocationDetailsLoading={liveLocationDetailsLoading}
                        selectedLocation={selectedLocation}
                        issueType={issueType}
                        mapTypeId={mapTypeId}
                        isFullscreen={isMapFullscreen}
                        onMapReady={handleMapLoad}
                        onMapClick={handleMapClick}
                        onMarkerDragEnd={handleMarkerDragEnd}
                        onLiveLocationMarkerClick={handleLiveLocationMarkerClick}
                        onLiveLocationPopupClose={() => setShowLiveLocationInfo(false)}
                        onMapTypeToggle={() => setMapTypeId((currentType) =>
                          currentType === "satellite" ? "roadmap" : "satellite"
                        )}
                        onFullscreenChange={setIsMapFullscreen}
                        onUseLiveLocation={handleUseLiveLocation}
                      />
                        <div className="map-zoom-controls" aria-label="Map zoom controls">
                          <button
                            type="button"
                            aria-label="Zoom in"
                            title="Zoom in"
                            onClick={() => changeMapZoom(1)}
                            disabled={!map || (map.getZoom() ?? INITIAL_LIVE_LOCATION_ZOOM) >= 21}
                          >
                            +
                          </button>
                          <button
                            type="button"
                            aria-label="Zoom out"
                            title="Zoom out"
                            onClick={() => changeMapZoom(-1)}
                            disabled={!map || (map.getZoom() ?? INITIAL_LIVE_LOCATION_ZOOM) <= 3}
                          >
                            −
                          </button>
                    </div>
                      </div>

                      <div className="live-location-summary">
                        <button
                          type="button"
                          className="use-live-location-button"
                          onClick={handleUseLiveLocation}
                        >
                          <span aria-hidden="true">⌖</span>
                          Use Live Location
                        </button>

                        {locationStatus === "loading" && (
                          <p className="location-status">
                            {t("report.fetchingLocation")}
                          </p>
                        )}

                        {locationStatus === "captured" && (
                          <div className="location-status success">
                            <p>
                              <span>Current location:</span>
                              <strong>{liveLocation.lat}, {liveLocation.lng}</strong>
                            </p>
                          </div>
                        )}

                        {locationStatus === "error" && (
                          <div className="location-status error">
                            <button
                              type="button"
                              className="location-retry-button"
                              onClick={handleUseLiveLocation}
                            >
                              Try again
                            </button>
                          </div>
                        )}
                      </div>

                      {boundaryLoading && (
                        <p className="location-status">Loading Hinjawadi boundary...</p>
                      )}

                  </>
                </div>

                {errorMessage && (
                  <p className="location-status error" role="alert">
                    {errorMessage}
                  </p>
                )}

                <PhotoDetection
                  onPhotoVerified={handlePhotoVerified}
                  onPhotoRejected={handlePhotoRejected}
                  existingPhotos={[]}
                  maxPhotos={2}
                  required={false}
                  category={issueType}
                  fallbackLocation={
                    selectedLocation.lat != null && selectedLocation.lng != null
                      ? { lat: selectedLocation.lat, lng: selectedLocation.lng }
                      : liveLocation.lat !== "" && liveLocation.lng !== ""
                        ? { lat: liveLocation.lat, lng: liveLocation.lng }
                        : null
                  }
                  onPhotosUpdate={(photos) => {
                    setVerifiedPhotosData(photos);
                    setSelectedPhotos(
                      photos
                        .filter((photo) => photo.file)
                        .map((photo) => ({
                          file: photo.file,
                          preview: photo.preview,
                          name: photo.name,
                        }))
                    );
                  }}
                  onLocationUpdate={setCapturedLocation}
                />
              </div>

              {/* Submit */}
              <div className="report-submit-row">
                <button
                  className="primary-btn"
                  type="submit"
                  disabled={
                    loading ||
                    verifiedPhotosData.some(
                      (photo) => photo.aiResult?.status === "verifying"
                    )
                  }
                >
                  {loading
                    ? "Submitting..."
                    : t("report.submit")}

                  {!loading && <span> →</span>}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="result-shell">
            <span className="result-icon">✓</span>

            <p className="eyebrow center">
              {t("report.complaintNumber")}
            </p>

            <h2>{complaintNumber}</h2>

            <p className="result-note">
              {t("report.successMessage")}
            </p>

            <div className="result-actions">
              <button
                className="primary-btn"
                type="button"
                onClick={() => {
                  let user = null;
                  try {
                    user = JSON.parse(localStorage.getItem("user") || "null");
                  } catch (error) {
                    console.error("Unable to parse user:", error);
                  }

                  if (String(user?.role || "").toLowerCase() === "citizen") {
                    navigate("/citizendashboard", {
                      state: {
                        openTrack: true,
                        trackComplaintNumber: complaintNumber,
                      },
                    });
                    return;
                  }

                  navigate("/", {
                    state: { trackComplaintNumber: complaintNumber },
                  });
                }}
              >
                {t("report.trackComplaint")} <span> →</span>
              </button>

              <button
                className="secondary-btn"
                type="button"
                onClick={resetForm}
              >
                {t("report.reportAnother")}
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
};

export default ReportIssue;