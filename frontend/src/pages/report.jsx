import React, { useState } from "react";
import "./report.css";
import bannerImage from "../assets/ri.png";

const categories = [
  {
    title: "Road Issues",
    issues: ["Road Potholes", "Damaged Road", "Road Cracks", "Waterlogging", "Other Road Issue"],
  },
  {
    title: "Sewerage & Drain Issues",
    issues: ["Sewerage Choked", "Broken Sewerage", "Sewage Overflow", "Broken Manhole"],
  },
  {
    title: "Drinking Water Issues",
    issues: ["Pipeline Leakage", "Low Water Pressure", "Contaminated Water", "No Tap Water"],
  },
  {
    title: "Streetlight Issues",
    issues: ["Light Not Working", "Damaged Pole", "Broken Light", "Missing Streetlight"],
  },
  {
    title: "Road Safety Issues",
    issues: ["Damaged Signboards", "Speed Breaker Issues", "Dangerous Turn / Curve"],
  },
  {
    title: "Bridge & Culvert Issues",
    issues: ["Bridge Damage", "Culvert Damage", "Damaged Railing"],
  },
];

const ReportIssue = () => {
  const [complaintNumber, setComplaintNumber] = useState(null);

  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");

  const [locationMode, setLocationMode] = useState("url"); // "url" | "live"
  const [locationUrl, setLocationUrl] = useState("");
  const [liveLocation, setLiveLocation] = useState({ lat: "", lng: "" });
  const [locationStatus, setLocationStatus] = useState("idle"); // idle | loading | captured | error

  const [issueType, setIssueType] = useState("");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  const handleUseLiveLocation = () => {
    setLocationMode("live");
    setLocationStatus("loading");

    if (!navigator.geolocation) {
      setLocationStatus("error");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLiveLocation({
          lat: position.coords.latitude.toFixed(5),
          lng: position.coords.longitude.toFixed(5),
        });
        setLocationStatus("captured");
      },
      () => setLocationStatus("error")
    );
  };

  const addPhotos = (files) => {
    const fileList = Array.from(files || []);
    const newPhotos = fileList.map((file) => ({
      name: file.name,
      url: URL.createObjectURL(file),
    }));
    setPhotos((prev) => [...prev, ...newPhotos]);
  };

  const handlePhotoUpload = (e) => addPhotos(e.target.files);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    addPhotos(e.dataTransfer.files);
  };

  const removePhoto = (index) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleSubmitReport = (e) => {
    e.preventDefault();
    const number = `MRI-${Math.floor(100000 + Math.random() * 900000)}`;
    setComplaintNumber(number);
  };

  const resetForm = () => {
    setComplaintNumber(null);
    setFullName("");
    setMobile("");
    setEmail("");
    setLocationMode("url");
    setLocationUrl("");
    setLiveLocation({ lat: "", lng: "" });
    setLocationStatus("idle");
    setIssueType("");
    setDescription("");
    setPhotos([]);
  };

  return (
    <main className="report-page">
      {/* ================= PAGE HERO — banner as full-cover background ================= */}
      <section
        className="page-hero"
        id="home"
        style={{ backgroundImage: `url(${bannerImage})` }}
      >
        <div className="hero-scrim"></div>
        <div className="page-hero-inner">
          {/* <div className="breadcrumb">
            Home / <b>Report an Issue</b>
          </div>
          <p className="eyebrow eyebrow-light">Citizen Reporting</p>
          <h1>Report an issue in a few simple steps</h1>
          <p className="hero-lead">
            Fill in your details, describe the problem, mark its location,
            and attach a photo — we'll take it from there.
          </p> */}
        </div>
      </section>

      <section className="section">
        {complaintNumber === null ? (
          <div className="report-shell">
            <div className="report-shell-header">
              <h2>Report a Road Safety Issue</h2>
              <p className="step-note">Your report helps keep roads safe. All info is confidential.</p>
            </div>

            <form className="report-grid" onSubmit={handleSubmitReport}>
              {/* ---------------- LEFT COLUMN ---------------- */}
              <div className="report-col">
                <div className="form-field">
                  <label htmlFor="fullName">Full Name</label>
                  <input
                    id="fullName"
                    type="text"
                    placeholder="Enter Your Name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="mobile">Enter Mobile Number</label>
                  <div className="input-with-icon">
                    <input
                      id="mobile"
                      type="tel"
                      placeholder="10-digit Mobile Number"
                      maxLength={10}
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                      required
                    />
                    <span className="field-icon">📱</span>
                  </div>
                </div>

                <div className="form-field">
                  <label htmlFor="email">Email Address</label>
                  <div className="input-with-icon">
                    <input
                      id="email"
                      type="email"
                      placeholder="Enter Email Address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                    <span className="field-icon">✉️</span>
                  </div>
                </div>

                {/* Location mode toggle */}
                <div className="segmented-toggle">
                  <button
                    type="button"
                    className={locationMode === "url" ? "active" : ""}
                    onClick={() => setLocationMode("url")}
                  >
                    Enter Location url
                  </button>
                  <button
                    type="button"
                    className={locationMode === "live" ? "active" : ""}
                    onClick={handleUseLiveLocation}
                  >
                    Use Live Location
                  </button>
                </div>

                {locationMode === "url" ? (
                  <div className="form-field">
                    <label htmlFor="locationUrl">Location (Enter url)</label>
                    <input
                      id="locationUrl"
                      type="text"
                      placeholder="Enter location url manually"
                      value={locationUrl}
                      onChange={(e) => setLocationUrl(e.target.value)}
                    />
                  </div>
                ) : (
                  <div className="form-field">
                    <label>Live Location</label>
                    {locationStatus === "loading" && (
                      <p className="location-status">Fetching your current location...</p>
                    )}
                    {locationStatus === "captured" && (
                      <p className="location-status success">
                        Location captured: {liveLocation.lat}, {liveLocation.lng}
                      </p>
                    )}
                    {locationStatus === "error" && (
                      <p className="location-status error">
                        Couldn't fetch GPS location. Try again or switch to URL entry.
                      </p>
                    )}
                  </div>
                )}

                <div className="form-field">
                  <label htmlFor="issueType">Issue Type</label>
                  <select
                    id="issueType"
                    value={issueType}
                    onChange={(e) => setIssueType(e.target.value)}
                    required
                  >
                    <option value="" disabled>Select Issue Type</option>
                    {categories.map((cat) => (
                      <optgroup key={cat.title} label={cat.title}>
                        {cat.issues.map((issue) => (
                          <option key={issue} value={issue}>{issue}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="description">Description</label>
                  <textarea
                    id="description"
                    rows="4"
                    placeholder="Tell us more about the issue..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  ></textarea>
                </div>
              </div>

              {/* ---------------- RIGHT COLUMN: UPLOAD ---------------- */}
              <div className="report-col">
                <div className="form-field upload-field">
                  <label>Upload Image</label>
                  <label
                    className={`upload-dropzone ${isDragging ? "dragging" : ""}`}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoUpload}
                      hidden
                    />
                    <span className="upload-icon">📷</span>
                    <span className="upload-text">
                      Click to upload or drag and drop
                      <br />
                      PNG, JPG, GIF up to 10MB
                    </span>
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
              </div>

              {/* ---------------- SUBMIT ---------------- */}
              <div className="report-submit-row">
                <button className="primary-btn" type="submit">
                  Submit Report <span>→</span>
                </button>
              </div>
            </form>
          </div>
        ) : (
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
        )}
      </section>
    </main>
  );
};

export default ReportIssue;