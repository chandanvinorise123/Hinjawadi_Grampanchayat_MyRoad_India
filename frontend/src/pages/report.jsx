import React, { useState } from "react";
import "./report.css";

const categories = [
  {
    title: "Road Issues",
    icon: "🛣️",
    issues: ["Road Potholes", "Damaged Road", "Road Cracks", "Waterlogging", "Other Road Issue"],
  },
  {
    title: "Sewerage & Drain Issues",
    icon: "🚰",
    issues: ["Sewerage Choked", "Broken Sewerage", "Sewage Overflow", "Broken Manhole"],
  },
  {
    title: "Drinking Water Issues",
    icon: "💧",
    issues: ["Pipeline Leakage", "Low Water Pressure", "Contaminated Water", "No Tap Water"],
  },
  {
    title: "Streetlight Issues",
    icon: "💡",
    issues: ["Light Not Working", "Damaged Pole", "Broken Light", "Missing Streetlight"],
  },
  {
    title: "Road Safety Issues",
    icon: "🚧",
    issues: ["Damaged Signboards", "Speed Breaker Issues", "Dangerous Turn / Curve"],
  },
  {
    title: "Bridge & Culvert Issues",
    icon: "🌉",
    issues: ["Bridge Damage", "Culvert Damage", "Damaged Railing"],
  },
];

const stepLabels = [
  "Select Category",
  "Description",
  "Location",
  "Photograph",
  "Review",
  "Submit",
];

const ReportIssue = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [complaintNumber, setComplaintNumber] = useState(null);

  const [selectedCategory, setSelectedCategory] = useState(0);
  const [selectedIssue, setSelectedIssue] = useState(0);
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState({ lat: "", lng: "", address: "" });
  const [locationStatus, setLocationStatus] = useState("idle"); // idle | loading | captured | error
  const [photos, setPhotos] = useState([]);

  const goNext = () => setCurrentStep((s) => Math.min(s + 1, stepLabels.length - 1));
  const goBack = () => setCurrentStep((s) => Math.max(s - 1, 0));

  const handleCategorySelect = (i) => {
    setSelectedCategory(i);
    setSelectedIssue(0);
  };

  const handleCaptureGPS = () => {
    setLocationStatus("loading");
    if (!navigator.geolocation) {
      setLocationStatus("error");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude.toFixed(5),
          lng: position.coords.longitude.toFixed(5),
          address: location.address,
        });
        setLocationStatus("captured");
      },
      () => setLocationStatus("error")
    );
  };

  const handleAddressChange = (e) => {
    setLocation({ ...location, address: e.target.value });
  };

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files || []);
    const newPhotos = files.map((file) => ({
      name: file.name,
      url: URL.createObjectURL(file),
    }));
    setPhotos([...photos, ...newPhotos]);
  };

  const removePhoto = (index) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleSubmitComplaint = () => {
    const number = `MRI-${Math.floor(100000 + Math.random() * 900000)}`;
    setComplaintNumber(number);
    setCurrentStep(stepLabels.length);
  };

  const currentCategory = categories[selectedCategory];

  const resetForm = () => {
    setCurrentStep(0);
    setComplaintNumber(null);
    setSelectedCategory(0);
    setSelectedIssue(0);
    setDescription("");
    setLocation({ lat: "", lng: "", address: "" });
    setLocationStatus("idle");
    setPhotos([]);
  };

  return (
    <main className="report-page">
      {/* ================= PAGE HERO ================= */}
      <section className="page-hero">
        <div className="hero-glow"></div>
        <div className="page-hero-inner">
          <div className="breadcrumb">
            Home / <b>Report an Issue</b>
          </div>
          <p className="eyebrow eyebrow-light">Citizen Reporting</p>
          <h1>Report an issue in a few simple steps</h1>
          <p className="hero-lead">
            Select a category, describe the problem, mark its location, and
            attach a photo — we'll take it from there.
          </p>
        </div>
      </section>

      {/* ================= STEP PROGRESS ================= */}
      {complaintNumber === null && (
        <section className="section">
          <div className="step-track">
            {stepLabels.map((label, i) => (
              <div
                className={`step-item ${
                  i < currentStep ? "done" : i === currentStep ? "now" : "pend"
                }`}
                key={i}
              >
                <div className="step-dot">{i < currentStep ? "✓" : i + 1}</div>
                <span>{label}</span>
              </div>
            ))}
          </div>

          {/* ---------------- STEP CONTENT ---------------- */}
          <div className="wizard-shell">
            {/* STEP 1: SELECT CATEGORY */}
            {currentStep === 0 && (
              <div className="step-panel">
                <h3>Select Category</h3>
                <div className="category-grid">
                  {categories.map((cat, i) => (
                    <button
                      key={i}
                      type="button"
                      className={`category-tile ${selectedCategory === i ? "active" : ""}`}
                      onClick={() => handleCategorySelect(i)}
                    >
                      <span className="category-tile-icon">{cat.icon}</span>
                      {cat.title}
                    </button>
                  ))}
                </div>

                <h4 className="sub-heading">Select Specific Issue</h4>
                <div className="issue-chip-grid">
                  {currentCategory.issues.map((issue, i) => (
                    <button
                      key={i}
                      type="button"
                      className={`issue-chip ${selectedIssue === i ? "active" : ""}`}
                      onClick={() => setSelectedIssue(i)}
                    >
                      {issue}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 2: DESCRIPTION */}
            {currentStep === 1 && (
              <div className="step-panel">
                <h3>Enter Description</h3>
                <div className="form-field">
                  <label htmlFor="description">Describe the issue</label>
                  <textarea
                    id="description"
                    rows="6"
                    placeholder="What is the problem, how severe is it, and how long has it persisted?"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  ></textarea>
                </div>
              </div>
            )}

            {/* STEP 3: LOCATION */}
            {currentStep === 2 && (
              <div className="step-panel">
                <h3>Capture Location</h3>
                <p className="step-note">Use GPS for accuracy, or enter the location manually.</p>

                <button className="secondary-btn" type="button" onClick={handleCaptureGPS}>
                  📍 Capture GPS Location
                </button>

                {locationStatus === "loading" && (
                  <p className="location-status">Fetching your current location...</p>
                )}
                {locationStatus === "captured" && (
                  <p className="location-status success">
                    Location captured: {location.lat}, {location.lng}
                  </p>
                )}
                {locationStatus === "error" && (
                  <p className="location-status error">
                    Couldn't fetch GPS location — please enter the address manually below.
                  </p>
                )}

                <div className="form-field">
                  <label htmlFor="address">Address / Landmark (Manual Entry)</label>
                  <input
                    id="address"
                    type="text"
                    placeholder="e.g. Near Gram Panchayat Office, Main Road"
                    value={location.address}
                    onChange={handleAddressChange}
                  />
                </div>
              </div>
            )}

            {/* STEP 4: PHOTOGRAPH */}
            {currentStep === 3 && (
              <div className="step-panel">
                <h3>Upload Photograph / Media</h3>
                <label className="upload-dropzone">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    hidden
                  />
                  <span className="upload-icon">📷</span>
                  <span>Click to upload photos</span>
                </label>

                {photos.length > 0 && (
                  <div className="photo-grid">
                    {photos.map((photo, i) => (
                      <div className="photo-thumb" key={i}>
                        <img src={photo.url} alt={photo.name} />
                        <button
                          type="button"
                          className="photo-remove"
                          onClick={() => removePhoto(i)}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* STEP 5: REVIEW */}
            {currentStep === 4 && (
              <div className="step-panel">
                <h3>Review Complaint</h3>
                <div className="review-grid">
                  <div className="review-item">
                    <span className="review-label">Category</span>
                    <span className="review-value">{currentCategory.title}</span>
                  </div>
                  <div className="review-item">
                    <span className="review-label">Specific Issue</span>
                    <span className="review-value">{currentCategory.issues[selectedIssue]}</span>
                  </div>
                  <div className="review-item full">
                    <span className="review-label">Description</span>
                    <span className="review-value">
                      {description || "No description provided"}
                    </span>
                  </div>
                  <div className="review-item">
                    <span className="review-label">Location</span>
                    <span className="review-value">
                      {locationStatus === "captured"
                        ? `${location.lat}, ${location.lng}`
                        : location.address || "Not provided"}
                    </span>
                  </div>
                  <div className="review-item">
                    <span className="review-label">Photographs</span>
                    <span className="review-value">
                      {photos.length > 0 ? `${photos.length} photo(s) attached` : "None attached"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 6: SUBMIT */}
            {currentStep === 5 && (
              <div className="step-panel center">
                <h3>Submit Complaint</h3>
                <p className="step-note">
                  Everything looks good? Submit your complaint to generate a
                  complaint number you can use to track it.
                </p>
                <button className="primary-btn" type="button" onClick={handleSubmitComplaint}>
                  Submit Complaint <span>→</span>
                </button>
              </div>
            )}

            {/* NAVIGATION */}
            {currentStep < 5 && (
              <div className="wizard-nav">
                <button
                  className="secondary-btn"
                  type="button"
                  onClick={goBack}
                  disabled={currentStep === 0}
                >
                  ← Back
                </button>
                <button className="primary-btn" type="button" onClick={goNext}>
                  Continue <span>→</span>
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ================= COMPLAINT NUMBER / TRACK ================= */}
      {complaintNumber !== null && (
        <section className="section">
          <div className="result-shell">
            <span className="result-icon">✓</span>
            <p className="eyebrow center">Complaint Number</p>
            <h2>{complaintNumber}</h2>
            <p className="result-note">
              Your complaint has been registered successfully. Save this
              number to track its status anytime.
            </p>
            <div className="result-actions">
              <button className="primary-btn" type="button">
                Track Complaint <span>→</span>
              </button>
              <button className="secondary-btn" type="button" onClick={resetForm}>
                Report Another Issue
              </button>
            </div>
          </div>
        </section>
      )}
    </main>
  );
};

export default ReportIssue;