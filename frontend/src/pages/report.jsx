import React, { useState } from "react";
import "./report.css";
import bannerImage from "../assets/ri.png";
import PhotoDetection from "../components/PhotoDetection";

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

  // ✅ State for verified photos and captured location
  const [verifiedPhotosData, setVerifiedPhotosData] = useState([]);
  const [capturedLocation, setCapturedLocation] = useState(null);

  const handleUseLiveLocation = () => {
    setLocationMode("live");
    setLocationStatus("loading");

    if (!navigator.geolocation) {
      setLocationStatus("error");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc = {
          lat: position.coords.latitude.toFixed(5),
          lng: position.coords.longitude.toFixed(5),
        };
        setLiveLocation(loc);
        // Also update the capturedLocation state for final submission
        setCapturedLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setLocationStatus("captured");
      },
      () => setLocationStatus("error")
    );
  };

  // ✅ Handle photo verification callbacks from PhotoDetection component
  const handlePhotoVerified = (photoId, aiResult) => {
    console.log("Photo verified:", photoId, aiResult);
  };

  const handlePhotoRejected = (photoId, reason) => {
    console.log("Photo rejected:", photoId, reason);
    alert(`Photo rejected: ${reason}`);
  };

  // ✅ UPDATED: Submit report using verified data and real backend API
  const handleSubmitReport = async (e) => {
    e.preventDefault();

    // Check if we have verified photos
    if (verifiedPhotosData.length === 0) {
      alert("Please upload and verify at least one photo");
      return;
    }

    // ✅ FIXED: Payload structure now perfectly matches backend expectations
    const complaintData = {
      fullName,
      mobile,
      email,
      issueType,
      description,
      locationUrl: locationMode === "url" ? locationUrl : "GPS Captured Location",
      latitude: capturedLocation?.latitude,
      longitude: capturedLocation?.longitude,
      photoVerifications: verifiedPhotosData, // Backend expects this exact key
    };

    try {
      // Send to backend
      const response = await fetch("http://localhost:3200/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(complaintData),
      });

      if (response.ok) {
        const data = await response.json();
        setComplaintNumber(data.complaintNumber || `MRI-${Math.floor(100000 + Math.random() * 900000)}`);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to submit complaint");
      }
    } catch (error) {
      console.error("Submission error:", error);
      alert(`Error: ${error.message}`);
    }
  };

  const resetForm = () => {
    setComplaintNumber(null);
    setFullName("");
    setMobile("");
    setEmail("");
    setLocationMode("url");
    setLocationUrl("");
    setLiveLocation({ lat: "", lng: "" });
    setCapturedLocation(null); // ✅ Reset new state
    setLocationStatus("idle");
    setIssueType("");
    setDescription("");
    setVerifiedPhotosData([]); // ✅ Reset new state
  };

  return (
    <main className="report-page">
      {/* ================= PAGE HERO — banner as full-cover background ================= */}


  <section className="page-hero-section">
  <div
    className="page-hero"
    id="home"
    style={{
      backgroundImage: `url("${bannerImage}")`,
    }}
  >
    <div className="hero-scrim"></div>

    <div className="page-hero-inner">
      {/* Hero content commented out as in original */}
    </div>
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
                    Enter Location URL
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
                    <label htmlFor="locationUrl">Location (Enter URL)</label>
                    <input
                      id="locationUrl"
                      type="text"
                      placeholder="Enter location URL manually"
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

              {/* ---------------- RIGHT COLUMN: PHOTO DETECTION ---------------- */}
              <div className="report-col">
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