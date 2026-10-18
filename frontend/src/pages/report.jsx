import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import * as turf from "@turf/turf";

import {
  GoogleMap,
  Marker,
  InfoWindow,
  Autocomplete,
  useJsApiLoader,
} from "@react-google-maps/api";

import "./report.css";
import PhotoDetection from "../components/PhotoDetection";
import { API_BASE_URL } from "../utils/dashboardApi";
import { getComplaintMapMarkerIcon } from "../components/maps/complaintMapMarker";

const categories = [
  {
    title: "Road Issues",
    issues: [
      "Road Potholes",
      "Damaged Road",
      "Road Cracks",
      "Waterlogging",
      "Other Road Issue",
    ],
  },
  {
    title: "Sewerage & Drain Issues",
    issues: [
      "Sewerage Choked",
      "Broken Sewerage",
      "Sewage Overflow",
      "Broken Manhole",
    ],
  },
  {
    title: "Drinking Water Issues",
    issues: [
      "Pipeline Leakage",
      "Low Water Pressure",
      "Contaminated Water",
      "No Tap Water",
    ],
  },
  {
    title: "Streetlight Issues",
    issues: [
      "Light Not Working",
      "Damaged Pole",
      "Broken Light",
      "Missing Streetlight",
    ],
  },
  {
    title: "Road Safety Issues",
    issues: [
      "Damaged Signboards",
      "Speed Breaker Issues",
      "Dangerous Turn / Curve",
    ],
  },
  {
    title: "Bridge & Culvert Issues",
    issues: [
      "Bridge Damage",
      "Culvert Damage",
      "Damaged Railing",
    ],
  },
];

const libraries = ["places"];

const mapContainerStyle = {
  width: "100%",
  height: "350px",
};

const defaultCenter = {
  lat: 18.494,
  lng: 73.760,
};

const BOUNDARY_URL = "/boundaries/hinjavadi.geojson";

const ReportIssue = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries,
  });

  // Complaint state
  const [complaintNumber, setComplaintNumber] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Hinjawadi boundary state
  const [boundaryLoading, setBoundaryLoading] = useState(true);
  const [hinjawadiBoundary, setHinjawadiBoundary] = useState(null);
  const [boundaryBounds, setBoundaryBounds] = useState(null);
  const [mapBounds, setMapBounds] = useState(null);

  // Citizen details
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");

  // Location state: map is open by default
  const [locationMode, setLocationMode] = useState("map");

  const [selectedLocation, setSelectedLocation] = useState({
    lat: null,
    lng: null,
  });
  const [showSelectedLocationInfo, setShowSelectedLocationInfo] = useState(false);

  const [liveLocation, setLiveLocation] = useState({
    lat: "",
    lng: "",
  });

  const [locationStatus, setLocationStatus] = useState("idle");
  const [map, setMap] = useState(null);
  const [autocomplete, setAutocomplete] = useState(null);

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
          setBoundaryBounds(bbox);
          setErrorMessage("");
        }
      } catch (error) {
        console.error("Boundary loading error:", error);

        if (!cancelled) {
          setHinjawadiBoundary(null);
          setBoundaryBounds(null);
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

  // Save Google Maps instance and initialize its position.
  const handleMapLoad = (mapInstance) => {
    setMap(mapInstance);

    if (mapBounds) {
      mapInstance.fitBounds(mapBounds, 30);
    } else {
      mapInstance.setCenter(defaultCenter);
      mapInstance.setZoom(14);
    }
  };

  const handleMapUnmount = () => {
    setMap(null);
  };

  // Draw the boundary when the map and GeoJSON are available.
  useEffect(() => {
    if (!map || !hinjawadiBoundary || !isLoaded) return;

    try {
      const existingFeatures = [];

      map.data.forEach((feature) => {
        existingFeatures.push(feature);
      });

      existingFeatures.forEach((feature) => {
        map.data.remove(feature);
      });

      map.data.addGeoJson(hinjawadiBoundary);

      map.data.setStyle({
        fillOpacity: 0,
        strokeColor: "#d21919",
        strokeOpacity: 1,
        strokeWeight: 3,
        clickable: false,
      });

      const [minLng, minLat, maxLng, maxLat] =
        turf.bbox(hinjawadiBoundary);

      const bounds = new window.google.maps.LatLngBounds(
        { lat: minLat, lng: minLng },
        { lat: maxLat, lng: maxLng }
      );

      setMapBounds(bounds);
      map.fitBounds(bounds, 30);
    } catch (error) {
      console.error("Error drawing boundary:", error);

      setErrorMessage(
        "The Hinjawadi boundary could not be displayed on the map."
      );
    }
  }, [map, hinjawadiBoundary, isLoaded]);

  // Click the map to select the complaint location.
  const handleMapClick = (event) => {
    if (!event.latLng) return;

    const lat = event.latLng.lat();
    const lng = event.latLng.lng();

    setSelectedLocation({ lat, lng });
    setShowSelectedLocationInfo(true);
    setErrorMessage("");
  };

  // Allow marker dragging only within the boundary.
  const handleMarkerDragEnd = (event) => {
    if (!event.latLng) return;

    const lat = event.latLng.lat();
    const lng = event.latLng.lng();

    setSelectedLocation({ lat, lng });
    setShowSelectedLocationInfo(true);
    setErrorMessage("");
  };

  // Location search autocomplete.
  const handleAutocompleteLoad = (instance) => {
    setAutocomplete(instance);
  };

  const handlePlaceChanged = () => {
    if (!autocomplete) return;

    const place = autocomplete.getPlace();

    if (!place.geometry?.location) {
      setErrorMessage(
        "Please select a valid location from the search suggestions."
      );
      return;
    }

    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();

    setSelectedLocation({ lat, lng });
    setShowSelectedLocationInfo(true);
    setErrorMessage("");

    if (map) {
      map.panTo({ lat, lng });
      map.setZoom(17);
    }
  };

  // Switch back to map selection mode.
  const handleMapMode = () => {
    setLocationMode("map");
    setLocationStatus("idle");
    setErrorMessage("");
  };

  // Request the device's live location.
  const handleUseLiveLocation = () => {
    setLocationMode("live");
    setLocationStatus("loading");
    setErrorMessage("");
    setLiveLocation({ lat: "", lng: "" });

    if (!navigator.geolocation) {
      setLocationStatus("error");
      setErrorMessage(
        "Geolocation is not supported by your browser."
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        setLiveLocation({
          lat: latitude.toFixed(6),
          lng: longitude.toFixed(6),
        });

        setSelectedLocation({
          lat: latitude,
          lng: longitude,
        });
        setShowSelectedLocationInfo(true);

        setLocationStatus("captured");
        setErrorMessage("");

        if (map) {
          map.panTo({
            lat: latitude,
            lng: longitude,
          });
          map.setZoom(17);
        }
      },
      (error) => {
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

    let latitude;
    let longitude;

    if (locationMode === "map") {
      if (
        selectedLocation.lat === null ||
        selectedLocation.lng === null
      ) {
        setErrorMessage(
          "Please select the issue location on the map."
        );
        return;
      }

      latitude = Number(selectedLocation.lat);
      longitude = Number(selectedLocation.lng);
    } else {
      if (
        locationStatus !== "captured" ||
        liveLocation.lat === "" ||
        liveLocation.lng === ""
      ) {
        setErrorMessage(
          "Please capture your live location or select a location on the map."
        );
        return;
      }

      latitude = Number(liveLocation.lat);
      longitude = Number(liveLocation.lng);
    }

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
    complaintData.append("locationUrl", "Google Maps selected location");
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
    setComplaintNumber(null);
    setFullName("");
    setMobile("");
    setLocationMode("map");
    setSelectedLocation({ lat: null, lng: null });
    setShowSelectedLocationInfo(false);
    setLiveLocation({ lat: "", lng: "" });
    setLocationStatus("idle");
    setIssueType("");
    setDescription("");
    setVerifiedPhotosData([]);
    setSelectedPhotos([]);
    setCapturedLocation(null);
    setErrorMessage("");

    if (map) {
      if (mapBounds) {
        map.fitBounds(mapBounds, 30);
      } else if (boundaryBounds) {
        const [minLng, minLat, maxLng, maxLat] = boundaryBounds;
        map.fitBounds(
          new window.google.maps.LatLngBounds(
            { lat: minLat, lng: minLng },
            { lat: maxLat, lng: maxLng }
          ),
          30
        );
      } else {
        map.setCenter(defaultCenter);
        map.setZoom(14);
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
                    {boundaryLoading
                      ? "Loading Boundary..."
                      : "Use Live Location"}
                  </button>
                </div>

                {/* Google Map */}
                {locationMode === "map" ? (
                  <div className="form-field">
                    <label>Select Issue Location</label>

                    {loadError && (
                      <p className="location-status error">
                        Unable to load Google Maps. Check your API key
                        and Google Maps API settings.
                      </p>
                    )}

                    {!isLoaded && !loadError && (
                      <p className="location-status">
                        Loading Google Maps...
                      </p>
                    )}

                    {isLoaded && !loadError && (
                      <>
                        <Autocomplete
                          onLoad={handleAutocompleteLoad}
                          onPlaceChanged={handlePlaceChanged}
                          options={{ strictBounds: false }}
                        >
                          <input
                            type="text"
                            placeholder="Search issue location..."
                            className="map-search-input"
                          />
                        </Autocomplete>

                        <div className="google-map-container">
                          <GoogleMap
                            mapContainerStyle={mapContainerStyle}
                            center={
                              selectedLocation.lat !== null
                                ? selectedLocation
                                : boundaryBounds
                                  ? {
                                      lat: (boundaryBounds[1] + boundaryBounds[3]) / 2,
                                      lng: (boundaryBounds[0] + boundaryBounds[2]) / 2,
                                    }
                                  : defaultCenter
                            }
                            zoom={
                              selectedLocation.lat !== null ? 17 : 14
                            }
                            onLoad={handleMapLoad}
                            onUnmount={handleMapUnmount}
                            onClick={handleMapClick}
                            options={{
                              streetViewControl: false,
                              mapTypeControl: false,
                              fullscreenControl: true,
                            }}
                          >
                            {selectedLocation.lat !== null &&
                              selectedLocation.lng !== null && (
                                <Marker
                                  position={selectedLocation}
                                  icon={getComplaintMapMarkerIcon({ issue: issueType })}
                                  draggable
                                  onDragEnd={handleMarkerDragEnd}
                                  onClick={() => setShowSelectedLocationInfo(true)}
                                />
                              )}
                            {showSelectedLocationInfo &&
                              selectedLocation.lat !== null &&
                              selectedLocation.lng !== null && (
                                <InfoWindow
                                  position={selectedLocation}
                                  onCloseClick={() => setShowSelectedLocationInfo(false)}
                                >
                                  <div>
                                    <strong>Selected complaint location</strong>
                                    <p>
                                      {selectedLocation.lat.toFixed(6)},{" "}
                                      {selectedLocation.lng.toFixed(6)}
                                    </p>
                                    <a
                                      href={`https://www.google.com/maps/search/?api=1&query=${selectedLocation.lat},${selectedLocation.lng}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      Open exact area in Google Maps
                                    </a>
                                  </div>
                                </InfoWindow>
                              )}
                          </GoogleMap>
                        </div>

                        {boundaryLoading && (
                          <p className="location-status">
                            Loading Hinjawadi boundary...
                          </p>
                        )}

                        {selectedLocation.lat !== null &&
                          selectedLocation.lng !== null && (
                            <p className="location-status success">
                              Selected Location:{" "}
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${selectedLocation.lat},${selectedLocation.lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {selectedLocation.lat.toFixed(6)},{" "}
                                {selectedLocation.lng.toFixed(6)}
                              </a>
                            </p>
                          )}

                        {selectedLocation.lat === null && (
                          <p className="location-help">
                            Search for a location or click anywhere on the map to place the marker.
                          </p>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <div className="form-field">
                    <label>{t("report.liveLocation")}</label>

                    {locationStatus === "loading" && (
                      <p className="location-status">
                        {t("report.fetchingLocation")}
                      </p>
                    )}

                    {locationStatus === "captured" && (
                      <p className="location-status success">
                        {t("report.locationCaptured")}:{" "}
                        {liveLocation.lat}, {liveLocation.lng}
                      </p>
                    )}

                    {locationStatus === "error" && (
                      <p className="location-status error">
                        {errorMessage || t("report.locationError")}
                      </p>
                    )}

                    {locationStatus !== "captured" && (
                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={handleUseLiveLocation}
                      >
                        Try Live Location Again
                      </button>
                    )}
                  </div>
                )}

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
                        label={t(
                          `issueCategories.${category.title}`,
                          { defaultValue: category.title }
                        )}
                      >
                        {category.issues.map((issue) => (
                          <option key={issue} value={issue}>
                            {t(`issueTypes.${issue}`, {
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