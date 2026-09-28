
import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import "./report.css";
import bannerImage from "../assets/ri.png";

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

const ReportIssue = () => {
  const location = useLocation();

  const [complaintNumber, setComplaintNumber] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");

  const [locationMode, setLocationMode] = useState("url");
  const [locationUrl, setLocationUrl] = useState("");
  const [liveLocation, setLiveLocation] = useState({
    lat: "",
    lng: "",
  });
  const [locationStatus, setLocationStatus] = useState("idle");

  const [category, setCategory] = useState(
    location.state?.category || ""
  );
  const [issueType, setIssueType] = useState(
    location.state?.issueType || ""
  );
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (location.state?.category) {
      setCategory(location.state.category);
    }

    if (location.state?.issueType) {
      setIssueType(location.state.issueType);
    }
  }, [location.state]);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");

    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setFullName(user.name || "");
        setMobile(user.mobile || "");
        setEmail(user.email || "");
      } catch {
        console.error("Unable to read logged-in user");
      }
    }
  }, []);

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

    const newPhotos = fileList
      .filter((file) => file.type.startsWith("image/"))
      .map((file) => ({
        file,
        name: file.name,
        url: URL.createObjectURL(file),
      }));

    setPhotos((prev) => [...prev, ...newPhotos]);
  };

  const handlePhotoUpload = (e) => {
    addPhotos(e.target.files);
    e.target.value = "";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    addPhotos(e.dataTransfer.files);
  };

  const removePhoto = (index) => {
    setPhotos((prev) => {
      const photoToRemove = prev[index];

      if (photoToRemove?.url) {
        URL.revokeObjectURL(photoToRemove.url);
      }

      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    let user;

    try {
      user = JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      user = null;
    }

    if (!user?.id && !user?._id) {
      setErrorMessage("Please log in before submitting a complaint.");
      return;
    }

    if (!category || !issueType) {
      setErrorMessage("Please select a complaint category and issue type.");
      return;
    }

    if (!description.trim()) {
      setErrorMessage("Please enter a description.");
      return;
    }

    if (locationMode === "url" && !locationUrl.trim()) {
      setErrorMessage("Please enter the location URL.");
      return;
    }

    if (
      locationMode === "live" &&
      locationStatus !== "captured"
    ) {
      setErrorMessage("Please capture your live location or enter a location URL.");
      return;
    }

    const formData = new FormData();

    formData.append("citizenId", user.id || user._id);
    formData.append("category", category);
    formData.append("issueType", issueType);
    formData.append("description", description.trim());

    formData.append(
      "location",
      locationMode === "live"
        ? `${liveLocation.lat}, ${liveLocation.lng}`
        : locationUrl.trim()
    );

    if (locationMode === "live") {
      formData.append(
        "coordinates",
        JSON.stringify({
          latitude: Number(liveLocation.lat),
          longitude: Number(liveLocation.lng),
        })
      );
    }

    photos.forEach((photo) => {
      formData.append("images", photo.file);
    });

    setLoading(true);

    try {
      const response = await fetch(
        "http://localhost:3200/api/complaints",
        {
          method: "POST",
          body: formData,
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Failed to register complaint."
        );
      }

      const savedComplaint = result.data || result.complaint || {};

      setComplaintNumber(
        savedComplaint.complaintNumber || savedComplaint._id
      );
    } catch (error) {
      console.error("Complaint submission error:", error);
      setErrorMessage(
        error.message || "Unable to connect to the server."
      );
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    photos.forEach((photo) => URL.revokeObjectURL(photo.url));

    setComplaintNumber(null);
    setLocationMode("url");
    setLocationUrl("");
    setLiveLocation({ lat: "", lng: "" });
    setLocationStatus("idle");
    setDescription("");
    setPhotos([]);
    setErrorMessage("");
    setIssueType("");
    setCategory("");
  };

  return (
    <main className="report-page">
      <section
        className="page-hero"
        id="home"
        style={{ backgroundImage: `url(${bannerImage})` }}
      >
        <div className="hero-scrim"></div>
        <div className="page-hero-inner"></div>
      </section>

      <section className="section">
        {complaintNumber === null ? (
          <div className="report-shell">
            <div className="report-shell-header">
              <h2>Report an Issue</h2>
              <p className="step-note">
                Your report helps improve public infrastructure.
              </p>
            </div>

            <form
              className="report-grid"
              onSubmit={handleSubmitReport}
            >
              <div className="report-col">
                <div className="form-field">
                  <label htmlFor="fullName">Full Name</label>
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter Your Name"
                    required
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="mobile">Enter Mobile Number</label>
                  <input
                    id="mobile"
                    type="tel"
                    maxLength={10}
                    value={mobile}
                    onChange={(e) =>
                      setMobile(e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="10-digit Mobile Number"
                    required
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="email">Email Address</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter Email Address"
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="category">Issue Category</label>
                  <select
                    id="category"
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      setIssueType("");
                    }}
                    required
                  >
                    <option value="" disabled>
                      Select Category
                    </option>

                    {categories.map((cat) => (
                      <option key={cat.title} value={cat.title}>
                        {cat.title}
                      </option>
                    ))}
                  </select>
                </div>

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
                    <label htmlFor="locationUrl">Location URL</label>
                    <input
                      id="locationUrl"
                      type="text"
                      placeholder="Enter location URL"
                      value={locationUrl}
                      onChange={(e) => setLocationUrl(e.target.value)}
                      required
                    />
                  </div>
                ) : (
                  <div className="form-field">
                    <label>Live Location</label>

                    {locationStatus === "loading" && (
                      <p className="location-status">
                        Fetching your current location...
                      </p>
                    )}

                    {locationStatus === "captured" && (
                      <p className="location-status success">
                        Location captured: {liveLocation.lat},{" "}
                        {liveLocation.lng}
                      </p>
                    )}

                    {locationStatus === "error" && (
                      <p className="location-status error">
                        Could not fetch GPS location. Try again or enter a URL.
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
                    <option value="" disabled>
                      Select Issue Type
                    </option>

                    {categories
                      .filter((cat) => cat.title === category)
                      .map((cat) =>
                        cat.issues.map((issue) => (
                          <option key={issue} value={issue}>
                            {issue}
                          </option>
                        ))
                      )}
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
                    required
                  />
                </div>
              </div>

              <div className="report-col">
                <div className="form-field upload-field">
                  <label>Upload Images</label>

                  <label
                    className={`upload-dropzone ${
                      isDragging ? "dragging" : ""
                    }`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
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
                        <div className="photo-thumb" key={photo.url}>
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

              <div className="report-submit-row">
                {errorMessage && (
                  <p className="location-status error">
                    {errorMessage}
                  </p>
                )}

                <button
                  className="primary-btn"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? "Submitting..." : "Submit Report"}
                  {!loading && <span> →</span>}
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
              Your complaint has been registered successfully.
              Save this number to track its status.
            </p>

            <div className="result-actions">
              <button className="primary-btn" type="button">
                Track Complaint <span>→</span>
              </button>

              <button
                className="secondary-btn"
                type="button"
                onClick={resetForm}
              >
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