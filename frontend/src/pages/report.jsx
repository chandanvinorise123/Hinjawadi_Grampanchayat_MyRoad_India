import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import * as turf from "@turf/turf";

import {
  GoogleMap,
  Marker,
  InfoWindow,
  Circle,
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

const libraries = ["places"];

const mapContainerStyle = {
  width: "100%",
  height: "350px",
};

const defaultCenter = {
  lat: 18.494,
  lng: 73.760,
};

const INITIAL_LIVE_LOCATION_ZOOM = 15;

const BOUNDARY_URL = "/boundaries/hinjavadi.geojson";

const ReportIssue = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() || "";

  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey,
    libraries,
  });

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
  const [showSelectedLocationInfo, setShowSelectedLocationInfo] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState("");
  const [manualAddress, setManualAddress] = useState("");
  const [addressStatus, setAddressStatus] = useState("idle");
  const [locationConfirmed, setLocationConfirmed] = useState(false);

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
  const [mapTypeId, setMapTypeId] = useState("roadmap");
  const [map, setMap] = useState(null);
  const mapTypeButtonRef = useRef(null);
  const [autocomplete, setAutocomplete] = useState(null);
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

  // Save Google Maps instance and initialize its position.
  const handleMapLoad = (mapInstance) => {
    setMap(mapInstance);

    if (liveLocationRef.current.lat !== "" && liveLocationRef.current.lng !== "") {
      mapInstance.setCenter({
        lat: Number(liveLocationRef.current.lat),
        lng: Number(liveLocationRef.current.lng),
      });
    } else {
      mapInstance.setCenter(defaultCenter);
    }
    mapInstance.setZoom(INITIAL_LIVE_LOCATION_ZOOM);
    gpsAutoCentered.current =
      liveLocationRef.current.lat !== "" && liveLocationRef.current.lng !== "";
  };

  useEffect(() => {
    if (!map) return undefined;

    const controlContainer = document.createElement("div");
    const button = document.createElement("button");
    const controls = map.controls[window.google.maps.ControlPosition.TOP_LEFT];
    const handleClick = () => {
      setMapTypeId((currentType) => {
        const nextType = currentType === "satellite" ? "roadmap" : "satellite";
        map.setMapTypeId(nextType);
        return nextType;
      });
    };

    button.className = "report-map-type-button";
    button.type = "button";
    button.addEventListener("click", handleClick);
    controlContainer.appendChild(button);
    controls.push(controlContainer);
    mapTypeButtonRef.current = button;

    return () => {
      button.removeEventListener("click", handleClick);
      button.remove();
      const controlArray = controls?.getArray?.();
      const controlIndex = controlArray?.indexOf(controlContainer);
      if (typeof controlIndex === "number" && controlIndex !== -1) {
        controls.removeAt(controlIndex);
      }
      mapTypeButtonRef.current = null;
    };
  }, [map]);

  useEffect(() => {
    const button = mapTypeButtonRef.current;
    if (!button) return;

    const label = t(
      mapTypeId === "satellite"
        ? "home.mapRoadmapView"
        : "home.mapSatelliteView"
    );
    button.textContent = label;
    button.setAttribute("aria-label", label);
    button.setAttribute("aria-pressed", String(mapTypeId === "satellite"));
  }, [map, mapTypeId, t]);

  const changeMapZoom = (amount) => {
    if (!map) return;

    const currentZoom = map.getZoom() ?? 14;
    map.setZoom(Math.min(21, Math.max(3, currentZoom + amount)));
  };

  const selectIssueLocation = (lat, lng, address = "") => {
    searchRequestId.current += 1;
    setLocationMode("map");
    setSelectedLocation({ lat, lng });
    setShowSelectedLocationInfo(true);
    setSelectedAddress(address);
    setManualAddress("");
    setAddressStatus(address ? "found" : "loading");
    setLocationConfirmed(false);
    setErrorMessage("");

    const requestId = ++geocodeRequestId.current;
    if (address) return;

    const geocoder = new window.google.maps.Geocoder();

    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (requestId !== geocodeRequestId.current) return;

      if (status === window.google.maps.GeocoderStatus.OK && results?.[0]) {
        setSelectedAddress(results[0].formatted_address);
        setAddressStatus("found");
        return;
      }

      if (status !== window.google.maps.GeocoderStatus.ZERO_RESULTS) {
        console.error("Reverse geocoding failed:", status);
      }
      setSelectedAddress("");
      setAddressStatus("unavailable");
    });
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

      const [minLng, minLat, maxLng, maxLat] = turf.bbox(hinjawadiBoundary);
      const boundaryBounds = new window.google.maps.LatLngBounds(
        { lat: minLat, lng: minLng },
        { lat: maxLat, lng: maxLng }
      );

      map.fitBounds(boundaryBounds, 28);
      gpsAutoCentered.current = true;
    } catch (error) {
      console.error("Error drawing boundary:", error);

      setErrorMessage(
        "The Hinjawadi boundary could not be displayed on the map."
      );
    }
  }, [map, hinjawadiBoundary, isLoaded]);

  useEffect(() => {
    if (
      !map ||
      gpsAutoCentered.current ||
      liveLocation.lat === "" ||
      liveLocation.lng === ""
    ) {
      return;
    }

    map.panTo({
      lat: Number(liveLocation.lat),
      lng: Number(liveLocation.lng),
    });
    map.setZoom(INITIAL_LIVE_LOCATION_ZOOM);
    gpsAutoCentered.current = true;
  }, [map, liveLocation.lat, liveLocation.lng]);

  useEffect(() => {
    if (!map) return;

    if (selectedLocation.lat !== null && selectedLocation.lng !== null) {
      map.panTo(selectedLocation);
      map.setZoom(18);
    }
  }, [map, selectedLocation, locationMode]);

  const handleLiveLocationMarkerClick = () => {
    setShowLiveLocationInfo(true);

    if (!map || !window.google?.maps?.places || !liveLocation.lat || !liveLocation.lng) {
      return;
    }

    const requestId = ++livePlaceRequestId.current;
    const position = {
      lat: Number(liveLocation.lat),
      lng: Number(liveLocation.lng),
    };
    setLiveLocationDetailsLoading(true);
    setLiveLocationAddress("");
    setLiveLocationPhoto("");

    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: position }, (results, status) => {
      if (requestId !== livePlaceRequestId.current) return;

      if (status === window.google.maps.GeocoderStatus.OK && results?.[0]) {
        setLiveLocationAddress(results[0].formatted_address);
      } else if (status !== window.google.maps.GeocoderStatus.ZERO_RESULTS) {
        console.error("Current-location reverse geocoding failed:", status);
      }
      setLiveLocationDetailsLoading(false);
    });

    const placesService = new window.google.maps.places.PlacesService(map);
    placesService.nearbySearch(
      { location: position, radius: 100 },
      (places, status) => {
        if (requestId !== livePlaceRequestId.current) return;

        if (
          status === window.google.maps.places.PlacesServiceStatus.OK &&
          places?.[0]
        ) {
          const nearestPlace = places[0];
          if (nearestPlace.name) {
            setLiveLocationAddress((currentAddress) =>
              currentAddress ||
              [nearestPlace.name, nearestPlace.vicinity].filter(Boolean).join(", ")
            );
          }
          const photo = nearestPlace.photos?.[0]?.getUrl({
            maxWidth: 320,
            maxHeight: 180,
          });
          if (photo) setLiveLocationPhoto(photo);
        } else if (status !== window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
          console.error("Nearby-place lookup failed:", status);
        }
      }
    );
  };

  // Click the map to select the complaint location.
  const handleMapClick = (event) => {
    if (!event.latLng) return;

    const lat = event.latLng.lat();
    const lng = event.latLng.lng();

    selectIssueLocation(lat, lng);
  };

  // Allow marker dragging only within the boundary.
  const handleMarkerDragEnd = (event) => {
    if (!event.latLng) return;

    const lat = event.latLng.lat();
    const lng = event.latLng.lng();

    selectIssueLocation(lat, lng);
  };

  // Location search autocomplete.
  const handleAutocompleteLoad = (instance) => {
    setAutocomplete(instance);
  };

  const handlePlaceChanged = () => {
    if (!autocomplete) return;

    const place = autocomplete.getPlace();

    if (!place.geometry?.location) {
      setSearchStatus("error");
      setErrorMessage("Choose a suggested place or use Search to find the typed landmark.");
      return;
    }

    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();

    setSearchQuery(place.formatted_address || place.name || "");
    setSearchStatus("idle");
    selectIssueLocation(lat, lng, place.formatted_address || place.name || "");

    if (map) {
      map.panTo({ lat, lng });
      map.setZoom(18);
    }
  };

  const handleSearchLocation = () => {
    const query = searchQuery.trim();
    if (!query) {
      setSearchStatus("error");
      setErrorMessage("Enter a landmark, road, or nearby place to search.");
      return;
    }

    if (!isLoaded || !map || !window.google?.maps?.places?.AutocompleteService) {
      setSearchStatus("error");
      setErrorMessage("Google Maps Places search is unavailable. Check that the Maps JavaScript API and Places API are enabled for this key.");
      return;
    }

    const requestId = ++searchRequestId.current;
    setSearchStatus("loading");
    setErrorMessage("");

    const autocompleteService = new window.google.maps.places.AutocompleteService();
    autocompleteService.getPlacePredictions(
      {
        input: query,
        componentRestrictions: { country: "IN" },
        locationBias: map.getBounds(),
      },
      (predictions, status) => {
        if (requestId !== searchRequestId.current) return;

        if (
          status !== window.google.maps.places.PlacesServiceStatus.OK ||
          !predictions?.[0]?.place_id
        ) {
          setSearchStatus("error");
          if (status !== window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
            console.error("Landmark search failed:", status);
          }
          setErrorMessage(
            status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS
              ? "No matching location found. Try a nearby landmark or road name."
              : "Landmark search failed. Check that the Google Maps Places API is enabled for this key."
          );
          return;
        }

        new window.google.maps.places.PlacesService(map).getDetails(
          {
            placeId: predictions[0].place_id,
            fields: ["geometry", "formatted_address", "name"],
          },
          (place, detailsStatus) => {
            if (requestId !== searchRequestId.current) return;

            if (
              detailsStatus !== window.google.maps.places.PlacesServiceStatus.OK ||
              !place?.geometry?.location
            ) {
              console.error("Landmark details lookup failed:", detailsStatus);
              setSearchStatus("error");
              setErrorMessage("Could not load that place. Try another nearby landmark or check the Google Maps Places API configuration.");
              return;
            }

            const position = place.geometry.location;
            const address = place.formatted_address || place.name || query;
            selectIssueLocation(position.lat(), position.lng(), address);
            setSearchQuery(address);
            setSearchStatus("idle");
            map.panTo(position);
            map.setZoom(18);
          }
        );
      }
    );
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

    if (!locationConfirmed) {
      setErrorMessage("Please confirm the selected issue location before submitting.");
      return;
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
    complaintData.append("landmark", manualAddress.trim() || selectedAddress.trim());
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
    setShowSelectedLocationInfo(false);
    setSelectedAddress("");
    setManualAddress("");
    setAddressStatus("idle");
    setLocationConfirmed(false);
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
          new window.google.maps.LatLngBounds(
            { lat: minLat, lng: minLng },
            { lat: maxLat, lng: maxLng }
          ),
          28
        );
        gpsAutoCentered.current = true;
      } else if (liveLocation.lat !== "" && liveLocation.lng !== "") {
        map.panTo({
          lat: Number(liveLocation.lat),
          lng: Number(liveLocation.lng),
        });
        map.setZoom(INITIAL_LIVE_LOCATION_ZOOM);
        gpsAutoCentered.current = true;
      } else {
        map.setCenter(defaultCenter);
        map.setZoom(INITIAL_LIVE_LOCATION_ZOOM);
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

                  {(!googleMapsApiKey || loadError) && (
                    <p className="location-status error">
                      {!googleMapsApiKey
                        ? "Google Maps is not configured. Add VITE_GOOGLE_MAPS_API_KEY to the frontend environment and restart the app."
                        : "Google Maps could not load. Check the key's website restrictions, billing, and Maps JavaScript API access."}
                    </p>
                  )}

                  {googleMapsApiKey && !isLoaded && !loadError && (
                    <p className="location-status">Loading Google Maps...</p>
                  )}

                  {googleMapsApiKey && isLoaded && !loadError && (
                    <>
                      <div className="map-search-row">
                        <Autocomplete
                          onLoad={handleAutocompleteLoad}
                          onPlaceChanged={handlePlaceChanged}
                          fields={["geometry", "formatted_address", "name"]}
                          options={{
                            componentRestrictions: { country: "in" },
                            strictBounds: false,
                          }}
                        >
                          <input
                            type="text"
                            placeholder="Search for a landmark or road..."
                            className="map-search-input"
                            aria-label="Search for an issue location"
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                handleSearchLocation();
                              }
                            }}
                          />
                        </Autocomplete>
                        <button
                          type="button"
                          className="map-search-button"
                          onClick={handleSearchLocation}
                          disabled={searchStatus === "loading"}
                        >
                          {searchStatus === "loading" ? "Searching..." : "Search"}
                        </button>
                      </div>

                      <div className="google-map-container">
                        <GoogleMap
                          mapContainerStyle={mapContainerStyle}
                          defaultCenter={defaultCenter}
                          defaultZoom={INITIAL_LIVE_LOCATION_ZOOM}
                          onLoad={handleMapLoad}
                          onClick={handleMapClick}
                          options={{
                            streetViewControl: false,
                            mapTypeControl: false,
                            mapTypeId,
                            fullscreenControl: true,
                            zoomControl: false,
                          }}
                        >
                          {liveLocation.lat !== "" && liveLocation.lng !== "" && (
                            <>
                              {liveLocationAccuracy !== null && (
                                <Circle
                                  center={{
                                    lat: Number(liveLocation.lat),
                                    lng: Number(liveLocation.lng),
                                  }}
                                  radius={liveLocationAccuracy}
                                  options={{
                                    fillColor: "#4285F4",
                                    fillOpacity: 0.12,
                                    strokeColor: "#4285F4",
                                    strokeOpacity: 0.45,
                                    strokeWeight: 1,
                                    clickable: false,
                                  }}
                                />
                              )}
                              <Marker
                                position={{
                                  lat: Number(liveLocation.lat),
                                  lng: Number(liveLocation.lng),
                                }}
                                title="Your current location"
                                onClick={handleLiveLocationMarkerClick}
                                zIndex={2}
                                icon={{
                                  url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
                                    '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="52" viewBox="0 0 40 52"><path d="M20 1C9.5 1 1 9.5 1 20c0 14.2 19 31 19 31s19-16.8 19-31C39 9.5 30.5 1 20 1Z" fill="#4285F4" stroke="#fff" stroke-width="2"/><circle cx="20" cy="20" r="7" fill="#fff"/></svg>'
                                  )}`,
                                  scaledSize: new window.google.maps.Size(40, 52),
                                  anchor: new window.google.maps.Point(20, 51),
                                }}
                              />
                            </>
                          )}

                          {showLiveLocationInfo &&
                            liveLocation.lat !== "" &&
                            liveLocation.lng !== "" && (
                              <InfoWindow
                                position={{
                                  lat: Number(liveLocation.lat),
                                  lng: Number(liveLocation.lng),
                                }}
                                onCloseClick={() => setShowLiveLocationInfo(false)}
                              >
                                <div className="live-location-info">
                                  {liveLocationPhoto && (
                                    <img
                                      src={liveLocationPhoto}
                                      alt="Nearby location"
                                    />
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
                                    <small>
                                      GPS accuracy: ±{Math.round(liveLocationAccuracy)} m
                                    </small>
                                  )}
                                </div>
                              </InfoWindow>
                            )}

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
                                  <strong>Selected issue location</strong>
                                  <p>
                                    {selectedAddress || `${selectedLocation.lat.toFixed(6)}, ${selectedLocation.lng.toFixed(6)}`}
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
                        <div className="map-zoom-controls" aria-label="Map zoom controls">
                          <button
                            type="button"
                            aria-label="Zoom in"
                            title="Zoom in"
                            onClick={() => changeMapZoom(1)}
                            disabled={!map || (map.getZoom() ?? 14) >= 21}
                          >
                            +
                          </button>
                          <button
                            type="button"
                            aria-label="Zoom out"
                            title="Zoom out"
                            onClick={() => changeMapZoom(-1)}
                            disabled={!map || (map.getZoom() ?? 14) <= 3}
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
                          <p>GPS accuracy radius: ±{Math.round(liveLocationAccuracy)} m</p>
                          <button
                            type="button"
                            className="location-retry-button"
                            onClick={handleUseLiveLocation}
                          >
                            Retry GPS location
                          </button>
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

                      {selectedLocation.lat !== null &&
                        selectedLocation.lng !== null && (
                          <div className="location-review">
                            <p className="location-review-heading">
                              {addressStatus === "loading"
                                ? "Finding the nearest address..."
                                : selectedAddress || manualAddress || "No address found for this point"}
                            </p>
                            <p className="location-coordinates">
                              {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                            </p>

                            {addressStatus === "unavailable" && (
                              <div className="manual-address-field">
                                <label htmlFor="manualLocationAddress">
                                  Add a nearby landmark or directions (optional)
                                </label>
                                <input
                                  id="manualLocationAddress"
                                  type="text"
                                  value={manualAddress}
                                  onChange={(event) => setManualAddress(event.target.value)}
                                  placeholder="e.g. Near Wipro Circle, Hinjawadi"
                                />
                              </div>
                            )}

                            {liveLocationAccuracy !== null && (
                              <p className="location-gps-accuracy">
                                Your GPS reference accuracy: ±{Math.round(liveLocationAccuracy)} m
                              </p>
                            )}

                            {!locationConfirmed ? (
                              <button
                                type="button"
                                className="confirm-location-button"
                                onClick={() => setLocationConfirmed(true)}
                                disabled={addressStatus === "loading"}
                              >
                                Confirm Location
                              </button>
                            ) : (
                              <div className="location-confirmed">
                                <span>Location confirmed</span>
                                <button
                                  type="button"
                                  className="location-retry-button"
                                  onClick={() => {
                                    setLocationConfirmed(false);
                                    setLocationMode("map");
                                  }}
                                >
                                  Change Location
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                    </>
                  )}
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