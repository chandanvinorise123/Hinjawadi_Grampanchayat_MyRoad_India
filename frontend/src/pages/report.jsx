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
  const [searchQuery, setSearchQuery] = useState("");
  const [searchStatus, setSearchStatus] = useState("idle");
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [mapTypeId, setMapTypeId] = useState("roadmap");
  const [map, setMap] = useState(null);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const geocodeRequestId = useRef(0);
  const searchRequestId = useRef(0);
  const locationRequestId = useRef(0);
  const gpsAutoCentered = useRef(false);
  const livePlaceRequestId = useRef(0);
  const liveLocationRef = useRef(liveLocation);

  // Issue state
  const [issueType, setIssueType] = useState(
    location.state?.issueType || ""
  );

  const [description, setDescription] = useState("");

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
            setErrorMessage("Getting your location timed out. Please retry.");
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
    searchRequestId.current += 1;
    setSearchSuggestions([]);
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

  const selectSearchSuggestion = (feature) => {
    const coordinates = feature.geometry?.coordinates;
    if (
      !Array.isArray(coordinates) ||
      coordinates.length < 2 ||
      !coordinates.every(Number.isFinite)
    ) {
      setSearchStatus("error");
      setErrorMessage("The selected search result has invalid coordinates. Try another location.");
      return;
    }

    const [lng, lat] = coordinates;
    const address = getPhotonFeatureLabel(feature.properties) || searchQuery.trim();
    selectIssueLocation(lat, lng, address);
    setSearchQuery(address);
    setSearchStatus("idle");
    setSearchSuggestions([]);
    map?.setView([lat, lng], 18);
  };

  const handleSearchLocation = async () => {
    const query = searchQuery.trim();
    if (!query) {
      setSearchStatus("error");
      setErrorMessage("Enter a landmark, road, or nearby place to search.");
      return;
    }

    if (!map) {
      setSearchStatus("error");
      setErrorMessage("The map is not ready yet. Please try the search again.");
      return;
    }

    const requestId = ++searchRequestId.current;
    setSearchStatus("loading");
    setSearchSuggestions([]);
    setErrorMessage("");

    try {
      const mapCenter = map.getCenter();
      const params = new URLSearchParams({
        q: query,
        lat: String(mapCenter.lat),
        lon: String(mapCenter.lng),
        limit: "5",
        lang: "en",
      });
      const response = await fetch(`${PHOTON_API_URL}/api/?${params}`);
      if (!response.ok) {
        throw new Error(`Location search failed (${response.status})`);
      }
      const result = await response.json();
      if (requestId !== searchRequestId.current) return;

      const features = (Array.isArray(result.features) ? result.features : [])
        .filter((feature) => {
          const countryCode = String(feature.properties?.countrycode || "").toLowerCase();
          return !countryCode || countryCode === "in";
        })
        .filter((feature) => {
          const coordinates = feature.geometry?.coordinates;
          return Array.isArray(coordinates) &&
            coordinates.length >= 2 &&
            coordinates.every(Number.isFinite);
        });

      if (features.length === 0) {
        setSearchStatus("error");
        setErrorMessage("No matching location found. Try a nearby landmark or road name.");
        return;
      }

      setSearchSuggestions(features);
      setSearchStatus("idle");
      selectSearchSuggestion(features[0]);
      setSearchSuggestions(features);
    } catch (error) {
      if (requestId !== searchRequestId.current) return;
      console.error("Landmark search failed:", error);
      setSearchStatus("error");
      setErrorMessage("Landmark search failed. Check your internet connection and try again.");
    }
  };

  // Switch back to map selection mode.
  const handleMapMode = () => {
    setLocationMode("map");
    setErrorMessage("");
  };

  // Request the device's live location.
  const handleUseLiveLocation = () => {
    const requestId = ++locationRequestId.current;
    setLocationMode("live");
    setLocationStatus("loading");
    setErrorMessage("");
    setLiveLocation({ lat: "", lng: "" });
    setLiveLocationAccuracy(null);

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
            setErrorMessage(
              "Getting your location timed out. Please try again."
            );
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

    if (verifiedPhotosData.length === 0) {
      alert(t("report.uploadVerifyPhoto"));
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

    if (!description.trim()) {
      setErrorMessage("Please enter a description.");
      return;
    }

    if (selectedLocation.lat === null || selectedLocation.lng === null) {
      setErrorMessage(
        "Please select the issue location on the map. Your live location is only a reference."
      );
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
      setErrorMessage("Please select valid geographic coordinates.");
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
    complaintData.append("description", description.trim());
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
    searchRequestId.current += 1;
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
    setDescription("");
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
              <p className="step-note">
                {t("report.subtitle")}
              </p>
            </div>

            <form
              className="report-grid"
              onSubmit={handleSubmitReport}
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

                <div className="segmented-toggle">
                  <button
                    type="button"
                    className={
                      locationMode === "map" ? "active" : ""
                    }
                    onClick={handleMapMode}
                  >
                    Select on Map
                  </button>

                  <button
                    type="button"
                    className={
                      locationMode === "live" ? "active" : ""
                    }
                    onClick={handleUseLiveLocation}
                  >
                    Use Live Location
                  </button>
                </div>

                <div className="form-field">
                  <label>Select Issue Location</label>

                  <>
                    <div className="map-search-row">
                      <input
                        type="text"
                        placeholder="Search for a landmark or road..."
                        className="map-search-input"
                        aria-label="Search for an issue location"
                        aria-controls="report-location-search-results"
                        aria-expanded={searchSuggestions.length > 0}
                        value={searchQuery}
                        onChange={(event) => {
                          setSearchQuery(event.target.value);
                          setSearchSuggestions([]);
                          setSearchStatus("idle");
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            if (searchSuggestions.length > 0) {
                              selectSearchSuggestion(searchSuggestions[0]);
                            } else {
                              handleSearchLocation();
                            }
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="map-search-button"
                        onClick={handleSearchLocation}
                        disabled={searchStatus === "loading"}
                      >
                        {searchStatus === "loading" ? "Searching..." : "Search"}
                      </button>
                    </div>
                    {searchSuggestions.length > 0 && (
                      <div
                        className="report-location-search-results"
                        id="report-location-search-results"
                        role="listbox"
                        aria-label="Location search results"
                      >
                        {searchSuggestions.map((feature, index) => {
                          const label = getPhotonFeatureLabel(feature.properties);
                          const featureKey = `${feature.properties?.osm_type || "place"}-${feature.properties?.osm_id || index}`;
                          return (
                            <button
                              key={featureKey}
                              type="button"
                              role="option"
                              aria-selected={label === selectedAddress}
                              onClick={() => selectSearchSuggestion(feature)}
                            >
                              {label || "Unnamed location"}
                            </button>
                          );
                        })}
                      </div>
                    )}

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

                      <div className="location-legend" aria-label="Map marker legend">
                        <span><i className="gps-legend-dot" /> Your GPS location</span>
                        <span><i className="issue-legend-pin" /> Issue location (draggable)</span>
                      </div>

                      <p className="location-help">
                        Search for a landmark or click the map to place the issue marker. GPS shows your location only; it is not selected as the issue location.
                      </p>

                      {locationStatus === "loading" && (
                        <p className="location-status">
                          {t("report.fetchingLocation")}
                        </p>
                      )}

                      {locationStatus === "captured" && (
                        <div className="location-status success">
                          <p>Current location: {liveLocation.lat}, {liveLocation.lng}</p>
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

                <div className="form-field">
                  <label htmlFor="description">
                    {t("report.description")}
                  </label>

                  <textarea
                    id="description"
                    rows="4"
                    placeholder={t("report.descriptionPlaceholder")}
                    value={description}
                    onChange={(event) =>
                      setDescription(event.target.value)
                    }
                    required
                  />
                </div>
              </div>

              {/* Right column: Photo Upload & Verification */}
              <div className="report-col">
                {/* Direct Upload / Capture Functionality */}
                <div className="form-field">
                  <label htmlFor="photoUpload">
                    Upload or Capture Photo
                  </label>
                  <input
                    id="photoUpload"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                    onChange={handlePhotoCapture}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '12px',
                      border: '2px dashed #cbd5e1',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      marginBottom: '10px',
                      backgroundColor: '#f8fafc'
                    }}
                  />
                  
                  {/* Photo Previews */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px' }}>
                    {selectedPhotos.map((photo, index) => (
                      <div key={index} style={{ position: 'relative', width: '100px', height: '100px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                        <img 
                          src={photo.preview} 
                          alt={`Preview ${index}`} 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        />
                        <button 
                          type="button" 
                          onClick={() => removePhoto(index)}
                          style={{ 
                            position: 'absolute', 
                            top: '4px', 
                            right: '4px', 
                            background: 'rgba(220, 38, 38, 0.9)', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '50%', 
                            width: '24px', 
                            height: '24px', 
                            cursor: 'pointer', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            fontSize: '14px',
                            fontWeight: 'bold'
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Existing Photo Detection Component */}
                <PhotoDetection
                  onPhotoVerified={handlePhotoVerified}
                  onPhotoRejected={handlePhotoRejected}
                  existingPhotos={[]}
                  maxPhotos={5}
                  required={true}
                  category={issueType}
                  onPhotosUpdate={setVerifiedPhotosData}
                  onLocationUpdate={setCapturedLocation}
                />
              </div>

              {/* Submit */}
              <div className="report-submit-row">
                <button
                  className="primary-btn"
                  type="submit"
                  disabled={loading}
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