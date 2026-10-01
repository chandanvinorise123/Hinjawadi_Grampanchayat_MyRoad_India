import React, { useState, useRef, useEffect } from "react";
import "./PhotoDetection.css";

const PhotoDetection = ({
  onPhotoVerified,
  onPhotoRejected,
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
  const fileInputRef = useRef(null);

  // Valid image types and max size
  const VALID_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  const MAX_SIZE_MB = 10;
  const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

  // Initialize with existing photos
  useEffect(() => {
    if (existingPhotos.length > 0) {
      setPhotos(existingPhotos.map((photo, index) => ({
        id: `existing-${index}`,
        file: null,
        preview: photo.url || photo,
        name: photo.name || "Existing Photo",
        isExisting: true,
        verified: true,
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
            case error.PERMISSION_DENIED:
              errorMsg = "Location permission denied. Please enable location services.";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMsg = "Location information is unavailable.";
              break;
            case error.TIMEOUT:
              errorMsg = "Location request timed out.";
              break;
            default:
              break;
          }
          setLocationError(errorMsg);
          reject(error);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
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

  // Verify image with AI backend
  const verifyImageWithAI = async (photoId, file) => {
    setIsProcessing(true);
    setVerificationStatus((prev) => ({
      ...prev,
      [photoId]: { status: "verifying", message: "AI is analyzing the image..." },
    }));

    try {
      const formData = new FormData();
      formData.append("image", file);
      if (category) formData.append("category", category);

      const response = await fetch("http://localhost:3200/api/photos/verify-image", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("AI verification failed");
      const result = await response.json();

      setVerificationStatus((prev) => ({
        ...prev,
        [photoId]: {
          status: "verified",
          roadRelated: result.roadRelated,
          confidence: result.confidence,
          detectedIssue: result.detectedIssue,
          message: result.message || "Image verified successfully",
        },
      }));

      if (result.confidence >= 80 && result.roadRelated) {
        onPhotoVerified && onPhotoVerified(photoId, result);
        return result;
      } else if (result.confidence >= 50 && result.roadRelated) {
        onPhotoVerified && onPhotoVerified(photoId, { ...result, requiresReview: true });
        return result;
      } else if (!result.roadRelated) {
        onPhotoRejected && onPhotoRejected(photoId, "Image is not road/infrastructure related");
        return result;
      } else {
        onPhotoRejected && onPhotoRejected(photoId, "Image quality too low. Please upload a clearer photo.");
        return result;
      }
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

  // Handle camera capture
  const handleCameraCapture = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0]; // Only take the first captured image

    if (photos.length >= maxPhotos) {
      alert(`Maximum ${maxPhotos} photos allowed`);
      e.target.value = "";
      return;
    }

    // Validate
    const validation = validateImage(file);
    if (!validation.valid) {
      alert(`Invalid image: ${validation.errors.join(", ")}`);
      e.target.value = "";
      return;
    }

    // Create photo object
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
    };

    // Capture location for the first new photo
    if (photos.length === 0 && !location) {
      try { await captureLocation(); } catch (err) { console.error("Location capture failed:", err); }
    }

    // Add to state and verify
    setPhotos((prev) => [...prev, photo]);
    await verifyImageWithAI(photoId, file);

    // Reset input so the same photo can be captured again if needed
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
    if (photo.file) await verifyImageWithAI(photo.id, photo.file);
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
    return photos.map((photo) => ({
      id: photo.id,
      name: photo.name,
      preview: photo.preview,
      verified: verificationStatus[photo.id]?.status === "verified" && verificationStatus[photo.id].roadRelated,
      aiResult: verificationStatus[photo.id],
      location: location,
    }));
  };

  const allPhotosVerified = photos.length > 0 && 
    photos.every((photo) => photo.isExisting || (verificationStatus[photo.id]?.status === "verified" && verificationStatus[photo.id].roadRelated));

  return (
    <div className="photo-detection-container">
      <div className="pd-header">
        <h3>📸 Capture Road Issue Photo</h3>
        <p className="pd-subtitle">Use your rear camera to capture the issue. AI will verify it instantly.</p>
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

      {/* Camera Capture Zone */}
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
            <p className="pd-camera-text">
              <strong>Tap to open rear camera</strong>
            </p>
            <p className="pd-camera-hint">
              Point camera at the road issue and take a clear photo
            </p>
          </div>
        </div>
      )}

      {/* Photo Grid */}
      {photos.length > 0 && (
        <div className="pd-photo-grid">
          {photos.map((photo, index) => (
            <div key={photo.id} className={`pd-photo-card ${verificationStatus[photo.id]?.status || ""}`}>
              <div className="pd-photo-wrapper">
                <img src={photo.preview} alt={photo.name} className="pd-photo-preview" />
                <div className="pd-verification-overlay">{getVerificationBadge(photo.id)}</div>
                <button type="button" className="pd-remove-btn" onClick={() => removePhoto(index)} title="Remove photo">✕</button>
                {verificationStatus[photo.id]?.status === "error" && (
                  <button type="button" className="pd-retry-verify-btn" onClick={() => retryVerification(photo)}> Retry</button>
                )}
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
      {!allPhotosVerified && photos.length > 0 && <div className="pd-validation-message pd-pending">⏳ Waiting for AI verification...</div>}

      <input type="hidden" name="photos" value={JSON.stringify(getVerifiedPhotosData())} readOnly />
      <input type="hidden" name="location" value={JSON.stringify(location)} readOnly />
    </div>
  );
};

export default PhotoDetection;