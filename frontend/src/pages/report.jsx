import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import "./report.css";
// import bannerImageEn from "../assets/ri.png";
// import bannerImageHi from "../assets/ri-hi.png";
// import bannerImageMr from "../assets/ri-mr.png";
import PhotoDetection from "../components/PhotoDetection";

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
  const { t, i18n } = useTranslation();

  /* 
  // Banner image logic commented out
  const currentLanguage = (
    i18n.resolvedLanguage || i18n.language || "en"
  ).split("-")[0];

  const bannerImage =
    {
      en: bannerImageEn,
      hi: bannerImageHi,
      mr: bannerImageMr,
    }[currentLanguage] || bannerImageEn;
  */

  const [complaintNumber, setComplaintNumber] = useState(null);

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

  const [issueType, setIssueType] = useState("");
  const [description, setDescription] = useState("");

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

  const handlePhotoVerified = (photoId, aiResult) => {
    console.log("Photo verified:", photoId, aiResult);
  };

  const handlePhotoRejected = (photoId, reason) => {
    console.log("Photo rejected:", photoId, reason);
    alert(`${t("report.photoRejected")}: ${reason}`);
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();

    if (verifiedPhotosData.length === 0) {
      alert(t("report.uploadVerifyPhoto"));
      return;
    }

    if (
      locationMode === "live" &&
      locationStatus !== "captured"
    ) {
      alert(t("report.captureLocationFirst"));
      return;
    }

    const complaintData = {
      fullName,
      mobile,
      email,
      issueType,
      description,
      locationUrl:
        locationMode === "url"
          ? locationUrl
          : "GPS Captured Location",
      latitude: capturedLocation?.latitude,
      longitude: capturedLocation?.longitude,
      photoVerifications: verifiedPhotosData,
    };

    try {
      const response = await fetch(
        "http://localhost:3200/api/complaints",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(complaintData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || t("report.submitFailed")
        );
      }

      const data = await response.json();

      if (!data.complaintNumber) {
        throw new Error(t("report.missingComplaintNumber"));
      }

      setComplaintNumber(data.complaintNumber);
    } catch (error) {
      console.error("Submission error:", error);
      alert(`${t("report.error")}: ${error.message}`);
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
    setCapturedLocation(null);
    setLocationStatus("idle");
    setIssueType("");
    setDescription("");
    setVerifiedPhotosData([]);
  };

  return (
    <main className="report-page">
      {/* Page banner section commented out 
      <section className="page-hero-section">
        <div
          className="page-hero"
          id="home"
          style={{
            backgroundImage: `url("${bannerImage}")`,
          }}
        >
          <div className="hero-scrim" />
          <div className="page-hero-inner" />
        </div>
      </section>
      */}

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
              {/* Left column */}
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
                    onChange={(e) => setFullName(e.target.value)}
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
                      onChange={(e) =>
                        setMobile(
                          e.target.value.replace(/\D/g, "")
                        )
                      }
                      required
                    />
                    <span className="field-icon">📱</span>
                  </div>
                </div>

                <div className="form-field">
                  <label htmlFor="email">
                    {t("report.email")}
                  </label>
                  <div className="input-with-icon">
                    <input
                      id="email"
                      type="email"
                      placeholder={t("report.emailPlaceholder")}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                    <span className="field-icon">✉️</span>
                  </div>
                </div>

                {/* Location mode */}
                <div className="segmented-toggle">
                  <button
                    type="button"
                    className={
                      locationMode === "url" ? "active" : ""
                    }
                    onClick={() => setLocationMode("url")}
                  >
                    {t("report.enterLocationUrl")}
                  </button>

                  <button
                    type="button"
                    className={
                      locationMode === "live" ? "active" : ""
                    }
                    onClick={handleUseLiveLocation}
                  >
                    {t("report.useLiveLocation")}
                  </button>
                </div>

                {locationMode === "url" ? (
                  <div className="form-field">
                    <label htmlFor="locationUrl">
                      {t("report.locationUrl")}
                    </label>
                    <input
                      id="locationUrl"
                      type="text"
                      placeholder={t("report.locationPlaceholder")}
                      value={locationUrl}
                      onChange={(e) =>
                        setLocationUrl(e.target.value)
                      }
                    />
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
                        {t("report.locationError")}
                      </p>
                    )}
                  </div>
                )}

                <div className="form-field">
                  <label htmlFor="issueType">
                    {t("report.issueType")}
                  </label>
                  <select
                    id="issueType"
                    value={issueType}
                    onChange={(e) => setIssueType(e.target.value)}
                    required
                  >
                    <option value="" disabled>
                      {t("report.selectIssueType")}
                    </option>

                    {categories.map((cat) => (
                      <optgroup
                        key={cat.title}
                        label={t(`issueCategories.${cat.title}`, {
                          defaultValue: cat.title,
                        })}
                      >
                        {cat.issues.map((issue) => (
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
                    onChange={(e) =>
                      setDescription(e.target.value)
                    }
                  />
                </div>
              </div>

              {/* Right column: Photo verification */}
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

              {/* Submit */}
              <div className="report-submit-row">
                <button className="primary-btn" type="submit">
                  {t("report.submit")} <span>→</span>
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
                onClick={() =>
                  window.location.assign(
                    `/track-complaint?complaintNumber=${encodeURIComponent(
                      complaintNumber
                    )}`
                  )
                }
              >
                {t("report.trackComplaint")} <span>→</span>
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