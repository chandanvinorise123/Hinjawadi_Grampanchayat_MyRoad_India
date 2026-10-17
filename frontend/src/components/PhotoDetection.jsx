import React, { useState, useRef, useEffect } from "react";
import "./PhotoDetection.css";
import { API_BASE_URL } from "../utils/dashboardApi";

const PhotoDetection = ({
  onPhotoVerified,
  onPhotoRejected,
  onPhotosUpdate,
  onLocationUpdate,
  existingPhotos = [],
  maxPhotos = 5,
  required = true,
  category,
}) => {
  const [photos, setPhotos] = useState([]);
  const [verificationStatus, setVerificationStatus] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState("");
  const [cameraError, setCameraError] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const fileInputRef = useRef(null);
  const cameraVideoRef = useRef(null);
  const cameraCanvasRef = useRef(null);
  const cameraStreamRef = useRef(null);

  const VALID_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  const MAX_SIZE_MB = 10;
  const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

  // ✅ Notify parent whenever photos, verification status, or location changes
  useEffect(() => {
    if (onPhotosUpdate) onPhotosUpdate(getVerifiedPhotosData());
    if (onLocationUpdate && location) onLocationUpdate(location);
  }, [photos, verificationStatus, location, onPhotosUpdate, onLocationUpdate]);

  useEffect(() => {
    if (existingPhotos.length > 0) {
      setPhotos(existingPhotos.map((photo, index) => ({
        id: `existing-${index}`, file: null, preview: photo.url || photo,
        name: photo.name || "Existing Photo", isExisting: true, verified: true,
      })));
    }
  }, [existingPhotos]);

  // Capture GPS location
  const captureLocation = () => {
    setLocationError("");
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      return null;
    }
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date(position.timestamp).toISOString(),
          };
          setLocation(loc);
          resolve(loc);
        },
        (error) => {
          let errorMsg = "Unable to retrieve your location";
          switch (error.code) {
            case error.PERMISSION_DENIED: errorMsg = "Location permission denied. Please enable location services."; break;
            case error.POSITION_UNAVAILABLE: errorMsg = "Location information is unavailable."; break;
            case error.TIMEOUT: errorMsg = "Location request timed out."; break;
            default: break;
          }
          setLocationError(errorMsg);
          reject(error);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  // ✅ ADDED: Reverse Geocoding to get readable address from coordinates
  const getAddressFromCoords = async (lat, lng) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
      const data = await response.json();
      return data.display_name || "Address not found";
    } catch (error) {
      return "Address service unavailable";
    }
  };

  // Validate image file
  const validateImage = (file) => {
    const errors = [];
    if (!file) { errors.push("No file provided"); return { valid: false, errors }; }
    if (!VALID_TYPES.includes(file.type)) { errors.push(`Invalid file type. Allowed: JPG, PNG, WEBP`); }
    if (file.size > MAX_SIZE_BYTES) { errors.push(`File size exceeds ${MAX_SIZE_MB}MB limit`); }
    if (!file.type.startsWith("image/")) { errors.push("File is not a valid image"); }
    return { valid: errors.length === 0, errors };
  };

  // Kept for the optional AI workflow. Normal report capture does not call it.
  const verifyImageWithAI = async (photoId, file, capturedLocation = location) => {
    setIsProcessing(true);
    setVerificationStatus((prev) => ({
      ...prev,
      [photoId]: { status: "verifying", message: "AI is analyzing the image..." },
    }));

    try {
      const formData = new FormData();
      formData.append("image", file);
      if (category) formData.append("category", category);

      // ✅ Send location data to backend
      if (capturedLocation) {
        formData.append("latitude", capturedLocation.latitude);
        formData.append("longitude", capturedLocation.longitude);
        formData.append("accuracy", capturedLocation.accuracy);
      }

      const response = await fetch(`${API_BASE_URL}/photos/verify-image`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("AI verification failed");
      const result = await response.json();

      const updateStatus = (status, roadRelated, message) => {
        setVerificationStatus((prev) => ({
          ...prev,
          [photoId]: {
            status, roadRelated, confidence: result.confidence, detectedIssue: result.detectedIssue, message,
            verificationId: result.verificationId, publicUrl: result.publicUrl,
          },
        }));
      };

      if (result.requiresReview) {
        updateStatus("review", true, result.message || "Image requires manual review");
        onPhotoVerified && onPhotoVerified(photoId, { ...result, requiresReview: true });
      } else if (result.confidence >= 80 && result.roadRelated) {
        updateStatus("verified", true, result.message || "Image verified successfully");
        onPhotoVerified && onPhotoVerified(photoId, result);
      } else if (result.confidence >= 50 && result.roadRelated) {
        updateStatus("review", true, result.message || "Image requires manual review");
        onPhotoVerified && onPhotoVerified(photoId, { ...result, requiresReview: true });
      } else if (!result.roadRelated) {
        updateStatus("rejected", false, result.message || "Image is not road/infrastructure related");
        onPhotoRejected && onPhotoRejected(photoId, "Image is not road/infrastructure related");
      } else {
        updateStatus("rejected", true, result.message || "Image quality too low. Please upload a clearer photo.");
        onPhotoRejected && onPhotoRejected(photoId, "Image quality too low. Please upload a clearer photo.");
      }
      return result;
    } catch (error) {
      console.error("AI Verification Error:", error);
      setVerificationStatus((prev) => ({
        ...prev,
        [photoId]: { status: "error", message: "AI verification failed. Please try again." },
      }));
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  const stopRearCamera = () => {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    if (cameraVideoRef.current) cameraVideoRef.current.srcObject = null;
    setCameraOpen(false);
  };

  useEffect(() => stopRearCamera, []);

  useEffect(() => {
    if (!cameraOpen || !cameraVideoRef.current || !cameraStreamRef.current) return;
    cameraVideoRef.current.srcObject = cameraStreamRef.current;
    cameraVideoRef.current.play().catch((error) => {
      console.error("Rear camera preview error:", error);
      setCameraError("Unable to start the rear camera preview.");
    });
  }, [cameraOpen]);

  const openRearCamera = async () => {
    setCameraError("");

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Your device does not support camera selection. Please use the back camera only.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { exact: "environment" } },
        audio: false,
      });
      const [track] = stream.getVideoTracks();
      const facingMode = track?.getSettings?.().facingMode;
      if (facingMode && facingMode !== "environment") {
        stream.getTracks().forEach((cameraTrack) => cameraTrack.stop());
        throw new Error("The active camera is not the rear camera.");
      }
      cameraStreamRef.current = stream;
      setCameraOpen(true);
    } catch (error) {
      console.error("Rear camera access error:", error);
      setCameraError("Please allow and use the back camera only. Front camera is not supported for complaint photos.");
    }
  };

  const captureRearPhoto = async () => {
    const video = cameraVideoRef.current;
    const canvas = cameraCanvasRef.current;
    if (!video || !canvas || !video.videoWidth || !video.videoHeight) {
      setCameraError("The rear camera is not ready. Please try again.");
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(async (blob) => {
      if (!blob) {
        setCameraError("Unable to capture the photo. Please try again.");
        return;
      }
      await processPhotoFile(new File([blob], `road-issue-${Date.now()}.jpg`, { type: "image/jpeg" }));
      stopRearCamera();
    }, "image/jpeg", 0.92);
  };

  const uploadNormalPhoto = async (photoId, file, capturedLocation) => {
    const formData = new FormData();
    formData.append("image", file);
    const response = await fetch(`${API_BASE_URL}/photos/upload`, {
      method: "POST",
      body: formData,
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) {
      throw new Error(result.message || "Photo upload failed");
    }

    setVerificationStatus((prev) => ({
      ...prev,
      [photoId]: {
        status: "verified",
        roadRelated: true,
        confidence: 100,
        message: "Photo captured successfully.",
        verificationId: result.verificationId,
        publicUrl: result.publicUrl,
        location: capturedLocation,
      },
    }));
  };

  // Handle camera capture
  const processPhotoFile = async (file) => {
    if (!file) return;

    if (photos.length >= maxPhotos) {
      alert(`Maximum ${maxPhotos} photos allowed`);
      return;
    }

    const validation = validateImage(file);
    if (!validation.valid) {
      alert(`Invalid image: ${validation.errors.join(", ")}`);
      return;
    }

    // 1. Capture location for the first new photo
    let currentLocation = location;
    if (!currentLocation) {
      try { currentLocation = await captureLocation(); } catch (err) { console.error("Location capture failed:", err); }
    }

    // 2. ✅ Fetch readable address for the Geo-Tag Stamp
    let address = "Location Pending...";
    if (currentLocation) {
      address = await getAddressFromCoords(currentLocation.latitude, currentLocation.longitude);
    }

    // 3. Create photo object with Geo-Tag Data
    const photoId = `photo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const photo = {
      id: photoId,
      file,
      preview: URL.createObjectURL(file),
      name: file.name,
      size: file.size,
      type: file.type,
      isExisting: false,
      verified: false,
      location: currentLocation || null,
      // ✅ ADDED: Geo-Tag Data attached to the photo
      geoData: {
        companyName: "MyRoad India",
        coordinates: currentLocation ? `${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}` : "N/A",
        address: address,
        timestamp: new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }),
        accuracy: currentLocation ? `±${Math.round(currentLocation.accuracy)}m` : "N/A"
      }
    };

    // Add to state and verify
    setPhotos((prev) => [...prev, photo]);
    try {
      await uploadNormalPhoto(photoId, file, currentLocation);
    } catch (error) {
      console.error("Normal photo upload error:", error);
      setVerificationStatus((prev) => ({
        ...prev,
        [photoId]: { status: "error", message: error.message || "Photo upload failed." },
      }));
    }
  };

  const handleCameraCapture = async (e) => {
    await processPhotoFile(e.target.files?.[0]);
    e.target.value = "";
  };

  // Remove photo
  const removePhoto = (index) => {
    const photo = photos[index];
    if (!photo.isExisting && photo.preview) URL.revokeObjectURL(photo.preview);
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setVerificationStatus((prev) => {
      const newStatus = { ...prev };
      delete newStatus[photo.id];
      return newStatus;
    });
  };

  // Retry verification
  const retryVerification = async (photo) => {
    if (photo.file) {
      try {
        await uploadNormalPhoto(photo.id, photo.file, photo.location);
      } catch (error) {
        console.error("Normal photo upload retry error:", error);
      }
    }
  };

  // Get verification badge
  const getVerificationBadge = (photoId) => {
    const status = verificationStatus[photoId];
    if (!status) return null;
    if (status.status === "verifying") return <span className="pd-badge pd-badge-verifying"> Verifying...</span>;
    if (status.status === "error") return <span className="pd-badge pd-badge-error">❌ {status.message}</span>;
    if (!status.roadRelated) return <span className="pd-badge pd-badge-rejected"> Not Road Related</span>;
    if (status.confidence >= 80) return <span className="pd-badge pd-badge-success">✅ {status.detectedIssue || "Road Issue"} ({Math.round(status.confidence)}%)</span>;
    if (status.confidence >= 50) return <span className="pd-badge pd-badge-warning">⚠️ {status.detectedIssue || "Road Issue"} ({Math.round(status.confidence)}% - Review)</span>;
    return <span className="pd-badge pd-badge-low">⚠️ Low Confidence ({Math.round(status.confidence)}%)</span>;
  };

  const getVerifiedPhotosData = () => {
    return photos.map((photo) => {
      const status = verificationStatus[photo.id];
      return {
        id: photo.id, name: photo.name, preview: photo.preview,
        verificationId: status?.verificationId || null,
        publicUrl: status?.publicUrl || photo.preview,
        verified: photo.isExisting || (status?.status === "verified" && status.roadRelated),
        requiresReview: status?.status === "review",
        aiResult: status || null,
        location: photo.location || location || null,
      };
    });
  };

  const allPhotosValidForSubmission = photos.length > 0 && 
    photos.every((photo) => photo.isExisting || verificationStatus[photo.id]?.status === "verified" || verificationStatus[photo.id]?.status === "review");

  return (
    <div className="photo-detection-container">
      <div className="pd-header">
        <h3>📸 Capture Road Issue Photo</h3>
        <p className="pd-subtitle">Use your rear camera to capture the issue. A normal photo is required.</p>
      </div>

      <div className="pd-requirements">
        <div className="pd-req-item">✓ JPG, PNG, WEBP</div>
        <div className="pd-req-item">✓ Max {MAX_SIZE_MB}MB</div>
        <div className="pd-req-item">✓ Max {maxPhotos} photos</div>
        <div className="pd-req-item">✓ Rear camera required</div>
      </div>

      {location && (
        <div className="pd-location-info">
          <span className="pd-location-icon"></span>
          <div>
            <strong>Location Captured:</strong>
            <p>{location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}<br/><small>Accuracy: ±{Math.round(location.accuracy)}m</small></p>
          </div>
        </div>
      )}

      {locationError && (
        <div className="pd-error pd-location-error">
          ️ {locationError}
          <button type="button" className="pd-retry-btn" onClick={captureLocation}>Retry Location</button>
        </div>
      )}

      {photos.length < maxPhotos && (
        <div className={`pd-camera-zone ${isProcessing ? "pd-processing" : ""}`}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment" 
            onChange={handleCameraCapture}
            disabled={isProcessing || photos.length >= maxPhotos}
            className="pd-file-input"
          />
          <div className="pd-camera-content">
            <div className="pd-camera-icon"></div>
            <button type="button" className="pd-camera-text" onClick={openRearCamera} disabled={isProcessing}>
              Tap to open rear camera
            </button>
            <p className="pd-camera-hint">Point camera at the road issue and take a clear photo</p>
          </div>
        </div>
      )}

      {cameraError && <div className="pd-error pd-camera-error">{cameraError}</div>}
      {cameraOpen && (
        <div className="pd-camera-preview">
          <video ref={cameraVideoRef} autoPlay playsInline muted aria-label="Rear camera preview" />
          <canvas ref={cameraCanvasRef} hidden />
          <div className="pd-camera-actions">
            <button type="button" className="pd-capture-btn" onClick={captureRearPhoto}>Capture Photo</button>
            <button type="button" className="pd-cancel-btn" onClick={stopRearCamera}>Cancel</button>
          </div>
        </div>
      )}

      {photos.length > 0 && (
        <div className="pd-photo-grid">
          {photos.map((photo, index) => (
            <div key={photo.id} className={`pd-photo-card ${verificationStatus[photo.id]?.status || ""}`}>
              <div className="pd-photo-wrapper">
                <img src={photo.preview} alt={photo.name} className="pd-photo-preview" />
                <button type="button" className="pd-remove-btn" onClick={() => removePhoto(index)} title="Remove photo">✕</button>
                {verificationStatus[photo.id]?.status === "error" && (
                  <button type="button" className="pd-retry-verify-btn" onClick={() => retryVerification(photo)}> Retry</button>
                )}
              </div>

              {/* ✅ ADDED: Visible Geo-Tag Stamp Below Image */}
              <div className="pd-geo-stamp">
                <div className="pd-stamp-header">
                  <strong>{photo.geoData.companyName}</strong>
                  <span className="pd-stamp-time">🕒 {photo.geoData.timestamp}</span>
                </div>
                <div className="pd-stamp-body">
                  <p className="pd-stamp-address">📍 {photo.geoData.address}</p>
                  <div className="pd-stamp-coords">
                    <span>Lat: {photo.geoData.coordinates.split(',')[0]}</span>
                    <span>Lng: {photo.geoData.coordinates.split(',')[1]}</span>
                  </div>
                  <p className="pd-stamp-accuracy">Accuracy: {photo.geoData.accuracy}</p>
                </div>
              </div>

              <div className="pd-photo-info">
                <p className="pd-photo-name">{photo.name}</p>
                <p className="pd-photo-size">{(photo.size / 1024 / 1024).toFixed(2)} MB</p>
                {verificationStatus[photo.id]?.detectedIssue && (
                  <p className="pd-detected-issue">AI Detected: <strong>{verificationStatus[photo.id].detectedIssue}</strong></p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {required && photos.length === 0 && <div className="pd-validation-message pd-required">⚠️ At least one verified photo is required</div>}
      {!allPhotosValidForSubmission && photos.length > 0 && <div className="pd-validation-message pd-pending">⏳ Uploading photo...</div>}
      {allPhotosValidForSubmission && <div className="pd-validation-message pd-success">✅ Photo captured successfully.</div>}

      <input type="hidden" name="photos" value={JSON.stringify(getVerifiedPhotosData())} readOnly />
      <input type="hidden" name="location" value={JSON.stringify(location)} readOnly />
    </div>
  );
};

export default PhotoDetection;