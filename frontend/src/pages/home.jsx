
import React, { useEffect, useRef, useState } from "react";
import VisitorsOverview from "../components/dashboard/VisitorsOverview";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import "./home.css";
const REPORT_ROUTE = "/reportissue";

// Hero background slider images
import heroImage1 from "../assets/r1.jpg";
import heroImage2 from "../assets/r2.jpg";
import heroImage3 from "../assets/r3.jpg";
import heroImage4 from "../assets/r4.png";
import heroImage5 from "../assets/r5.jpg";

// TV preview video
import tvDemoVideo from "../assets/myRoadvideo.mp4";

// Gallery images
import gallery1 from "../assets/r1.jpg";
import gallery2 from "../assets/r2.jpg";
import gallery3 from "../assets/r3.jpg";
import gallery4 from "../assets/r4.png";

// Gram Panchayat team photos
import sarpanchPhoto1 from "../assets/avtar.jpg";
import upsarpanchPhoto2 from "../assets/avtar.jpg";


const heroImages = [
  heroImage1,
  heroImage2,
  heroImage3,
  heroImage4,
  heroImage5,
];

const quickActions = [
  {
    icon: "📍",
    title: "reportIssue",
    desc: "submitPhoto",
  },
  {
    icon: "🔍",
    title: "trackComplaint",
    desc: "checkStatus",
  },
  {
    icon: "🗺️",
    title: "issuesOnMap",
    desc: "viewNearby",
  },
  {
    icon: "📷",
    title: "scanQRCode",
    desc: "reportQR",
  },
  {
    icon: "⚠️",
    title: "roadSafety",
    desc: "guidelinesAlerts",
  },
];

const liveStats = [
  {
    value: "17,438",
    label: "totalReported",
    trend: "+4.2%",
    color: "blue",
  },
  {
    value: "1,742",
    label: "underVerification",
    trend: "-1.1%",
    color: "amber",
  },
  {
    value: "2,317",
    label: "actionRequired",
    trend: "+2.6%",
    color: "orange",
  },
  {
    value: "1,987",
    label: "underRepair",
    trend: "+6.8%",
    color: "saffron",
  },
  {
    value: "15,932",
    label: "resolved",
    trend: "+9.3%",
    color: "green",
  },
];

const categories = [
  {
    icon: "🛣️",
    title: "roadIssues",
    desc: "roadIssuesDesc",
    count: "4,812",
  },
  {
    icon: "🌊",
    title: "sewerageDrainage",
    desc: "sewerageDesc",
    count: "2,145",
  },
  {
    icon: "💧",
    title: "drinkingWater",
    desc: "waterDesc",
    count: "1,760",
  },
  {
    icon: "💡",
    title: "streetlights",
    desc: "streetlightsDesc",
    count: "3,398",
  },
  {
    icon: "⚠️",
    title: "roadSafetyCategory",
    desc: "roadSafetyDesc",
    count: "1,204",
  },
  {
    icon: "🌉",
    title: "bridgesCulverts",
    desc: "bridgesDesc",
    count: "419",
  },
];

const steps = [
  {
    num: "01",
    title: "reportStep",
    desc: "reportStepDesc",
  },
  {
    num: "02",
    title: "captureLocation",
    desc: "captureLocationDesc",
  },
  {
    num: "03",
    title: "verification",
    desc: "verificationDesc",
  },
  {
    num: "04",
    title: "staffAssignment",
    desc: "staffAssignmentDesc",
  },
  {
    num: "05",
    title: "repairEvidence",
    desc: "repairEvidenceDesc",
  },
  {
    num: "06",
    title: "resolutionClosure",
    desc: "resolutionClosureDesc",
  },
];

const trustItems = [
  {
    icon: "👥",
    title: "citizenParticipation",
    desc: "citizenParticipationDesc",
  },
  {
    icon: "🔍",
    title: "transparentTracking",
    desc: "transparentTrackingDesc",
  },
  {
    icon: "📍",
    title: "gpsReporting",
    desc: "gpsReportingDesc",
  },
  {
    icon: "📷",
    title: "digitalEvidence",
    desc: "digitalEvidenceDesc",
  },
  {
    icon: "✅",
    title: "accountableResolution",
    desc: "accountableResolutionDesc",
  },
  {
    icon: "📊",
    title: "dataDrivenPlanning",
    desc: "dataDrivenPlanningDesc",
  },
];

const galleryImages = [
  {
    src: gallery1,
    caption: "nationalHighway",
  },
  {
    src: gallery2,
    caption: "expresswayFlyover",
  },
  {
    src: gallery3,
    caption: "urbanJunction",
  },
  {
    src: gallery4,
    caption: "greenCorridor",
  },
];

const teamMembers = [
  {
    // name: "Shri. Amol Mahadev Gholwe",
    role: "sarpanchRole",
    photo: sarpanchPhoto1,
  },
  {
    // name: "Sau. Shubhangi Suraj Sakhare",
    role: "upsarpanchRole",
    photo: upsarpanchPhoto2,
  },
];

const trackTimeline = [
  {
    label: "complaintRegistered",
    time: "18 Aug, 10:42 AM",
    state: "done",
  },
  {
    label: "verified",
    time: "18 Aug, 3:10 PM",
    state: "done",
  },
  {
    label: "assignedToStaff",
    time: "19 Aug, 9:05 AM",
    state: "done",
  },
  {
    label: "repairInProgress",
    time: "21 Aug, 11:20 AM",
    state: "now",
  },
  {
    label: "resolutionVerified",
    time: "pending",
    state: "pend",
  },
  {
    label: "closed",
    time: "pending",
    state: "pend",
  },
];

const Home = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [currentSlide, setCurrentSlide] = useState(0);
  const [tvPlaying, setTvPlaying] = useState(true);
  const videoRef = useRef(null);

  // Gallery lightbox
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const lightboxOpen = lightboxIndex !== null;

  const openLightbox = (index) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);

  const showPrevImage = () =>
    setLightboxIndex((i) =>
      i === 0 ? galleryImages.length - 1 : i - 1
    );

  const showNextImage = () =>
    setLightboxIndex((i) =>
      i === galleryImages.length - 1 ? 0 : i + 1
    );

  // Automatic hero background slider
  useEffect(() => {
    if (heroImages.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) =>
        prev === heroImages.length - 1 ? 0 : prev + 1
      );
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const nextSlide = () =>
    setCurrentSlide((prev) =>
      prev === heroImages.length - 1 ? 0 : prev + 1
    );

  const previousSlide = () =>
    setCurrentSlide((prev) =>
      prev === 0 ? heroImages.length - 1 : prev - 1
    );

  const goToSlide = (index) => setCurrentSlide(index);

  // TV video play / pause toggle
  const toggleTvPlayback = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.muted = false;
      video.volume = 0.2;
      video.play();
      setTvPlaying(true);
    } else {
      video.pause();
      setTvPlaying(false);
    }
  };

  // Record a visit every time the home page mounts
  useEffect(() => {
    const recordVisit = async () => {
      try {
        await fetch("http://localhost:3200/api/stats/visit", {
          method: "POST",
        });
      } catch (err) {
        console.error("Failed to record visit", err);
      }
    };

    recordVisit();
  }, []);

  // Lightbox keyboard controls and scroll locking
  useEffect(() => {
    if (!lightboxOpen) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") showPrevImage();
      if (e.key === "ArrowRight") showNextImage();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [lightboxOpen]);

  return (
    <main className="home-page">
      {/* ================= HERO SECTION ================= */}
      <section className="hero-section">
        <div className="hero-slider">
          {heroImages.map((image, index) => (
            <div
              key={index}
              className={`hero-slide ${
                index === currentSlide ? "active" : ""
              }`}
              style={{ backgroundImage: `url(${image})` }}
            />
          ))}
        </div>

        <div className="hero-scrim"></div>

        <div className="hero-content">
          <div className="hero-badge">
            <span className="live-dot"></span>
            {t("home.liveNetwork")}
          </div>

          <h1>
            {t("home.heroTitle")}{" "}
            <span>{t("home.heroTitleHighlight")}</span>
          </h1>

          <p className="hero-description">
            {t("home.heroDescription")}
          </p>

          <div className="hero-buttons">
            <button
              className="primary-btn"
              type="button"
              onClick={() => navigate(REPORT_ROUTE)}
            >
              {t("home.reportIssue")} <span>→</span>
            </button>
          </div>
        </div>

        {/* Slider dots */}
        {heroImages.length > 1 && (
          <div className="slider-dots">
            {heroImages.map((_, index) => (
              <button
                key={index}
                type="button"
                className={`slider-dot ${
                  index === currentSlide ? "active" : ""
                }`}
                onClick={() => goToSlide(index)}
                aria-label={t("home.goToSlide", {
                  number: index + 1,
                })}
              />
            ))}
          </div>
        )}

        {/* TV preview panel */}
        <div className="tv-unit">
          <div className={`tv-frame ${!tvPlaying ? "tv-paused" : ""}`}>
            <div className="tv-topbar">
              <div className="tv-live">
                <span className="dot"></span>{" "}
                {t("home.livePreview")}
              </div>

              <div className="tv-brand">MYROAD · DEMO</div>
            </div>

            <div className="tv-screen">
              <video ref={videoRef} autoPlay muted loop playsInline>
                <source src={tvDemoVideo} type="video/mp4" />
              </video>

              <div className="tv-overlay-top">
                <span className="dot"></span>{" "}
                {t("home.reportingPothole")}
              </div>

              <button
                className="tv-play-btn"
                onClick={toggleTvPlayback}
                aria-label={t("home.playPausePreview")}
              >
                {tvPlaying ? "❚❚" : "▶"}
              </button>

              <div className="tv-overlay-bottom">
                <b>#MRI-2026-08341</b>
                <span>{t("home.underRepair")}</span>
              </div>
            </div>

            <div className="tv-bottombar">
              {Array.from({ length: 6 }).map((_, i) => (
                <span key={i} className="speaker-dot"></span>
              ))}
            </div>
          </div>

          <div className="tv-stand-neck"></div>
          <div className="tv-stand-base"></div>
        </div>
      </section>

      {/* ================= QUICK ACTIONS ================= */}
      <section className="quick-actions-section">
        <div className="section-heading">
          <p className="section-label">
            {t("home.citizenServices")}
          </p>
          <h2>{t("home.whatWouldYouLikeToDo")}</h2>
        </div>

        <div className="quick-actions-grid">
          {quickActions.map((item, i) => (
            <button className="qa-card" key={i} type="button">
              <div className="qa-icon">{item.icon}</div>
              <h4>{t(`home.${item.title}`)}</h4>
            </button>
          ))}
        </div>
      </section>

      {/* ================= LIVE STATS ================= */}
      <section className="stats-section">
        <div className="section-heading">
          <p className="section-label">
            {t("home.statsUpdated")}
          </p>
          <h2>{t("home.liveStatistics")}</h2>
        </div>

        <div className="stats-bar">
          {liveStats.map((stat, i) => (
            <div className="stat-cell" key={i}>
              <div className="stat-top">
                <span className={`stat-dot dot-${stat.color}`}></span>
                <span className="stat-trend">{stat.trend}</span>
              </div>

              <div className="stat-num">{stat.value}</div>

              <div className="stat-label">
                {t(`home.${stat.label}`)}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ================= CATEGORIES ================= */}
      <section className="categories-section">
        <div className="section-heading">
          <p className="section-label">
            {t("home.browseByCategory")}
          </p>
          <h2>{t("home.whatToReport")}</h2>
        </div>

        <div className="categories-grid">
          {categories.map((cat, i) => (
            <div className="cat-card" key={i}>
              <div className="cat-top">
                <div className="cat-icon">{cat.icon}</div>

                {/* <span className="cat-count">
                  {cat.count} {t("home.issues")}
                </span> */}
              </div>

              <h4>{t(`home.${cat.title}`)}</h4>

              {/* <span className="cat-link">
                {t("home.viewIssues")} →
              </span> */}
            </div>
          ))}
        </div>
      </section>

      {/* ================= HOW IT WORKS ================= */}
      <section className="steps-section">
        <div className="section-heading center">
          <p className="section-label">{t("home.process")}</p>
          <h2>{t("home.howItWorks")}</h2>
        </div>

        <div className="steps-track">
          {steps.map((step, i) => (
            <div
              className={`step ${i < 3 ? "done" : ""}`}
              key={i}
            >
              <div className="step-num">{step.num}</div>
              <h5>{t(`home.${step.title}`)}</h5>
              <p>{t(`home.${step.desc}`)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ================= TRACK COMPLAINT ================= */}
      <section className="track-section">
        <div className="track-shell">
          {/* Left card: search */}
          <div className="track-card track-form-card">
            <div className="track-icon">🔍</div>

            <h3>{t("home.trackYourComplaint")}</h3>
            <p>{t("home.trackDescription")}</p>

            <form
              className="track-form"
              onSubmit={(e) => {
                e.preventDefault();
                // Connect your existing tracking API here.
              }}
            >
              <label htmlFor="track-id" className="sr-only">
                {t("home.complaintNumber")}
              </label>

              <input
                id="track-id"
                type="text"
                placeholder={t("home.complaintPlaceholder")}
              />

              <button
                className="primary-btn track-btn"
                type="submit"
              >
                {t("home.trackStatus")}
              </button>
            </form>
          </div>

          {/* Right card: timeline */}
          <div className="track-card timeline-card">
            <div className="tl-head">
              <b>#MRI-2026-08341</b>
              <span>{t("home.onTrack")}</span>
            </div>

            {trackTimeline.map((item, i) => (
              <div className="tl-item" key={i}>
                <div className={`tl-dot ${item.state}`}></div>

                <div className="tl-body">
                  <b>{t(`home.${item.label}`)}</b>

                  <span>
                    {item.time === "pending"
                      ? t("home.pending")
                      : item.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= GALLERY ================= */}
      <section className="gallery-section">
        <div className="section-heading center">
          <p className="section-label">
            {t("home.infrastructureInFocus")}
          </p>

          <h2>{t("home.roadGallery")}</h2>

          <p className="section-sub">
            {t("home.galleryDescription")}
          </p>
        </div>

        <div className="gallery-grid">
          {galleryImages.map((img, i) => (
            <div
              className="gallery-item"
              key={i}
              role="button"
              tabIndex={0}
              aria-label={t("home.viewImage", {
                caption: t(`home.${img.caption}`),
              })}
              onClick={() => openLightbox(i)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openLightbox(i);
                }
              }}
            >
              <img
                src={img.src}
                alt={t(`home.${img.caption}`)}
              />

              <span>{t(`home.${img.caption}`)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ================= TRUST ================= */}
      <section className="trust-section">
        <div className="section-heading center">
          <p className="section-label">
            {t("home.whyMyRoad")}
          </p>

          <h2>{t("home.builtForTrust")}</h2>
        </div>

        <div className="trust-grid">
          {trustItems.map((item, i) => (
            <div className="trust-card" key={i}>
              <div className="t-ic">{item.icon}</div>
              <h5>{t(`home.${item.title}`)}</h5>
              {/* <p>{t(`home.${item.desc}`)}</p> */}
            </div>
          ))}
        </div>
      </section>

      {/* ================= GRAM PANCHAYAT TEAM ================= */}
      <section className="team-section">
        <div className="section-heading center">
          <p className="section-label">
            {t("home.localGovernance")}
          </p>

          <h2>{t("home.gramPanchayatTeam")}</h2>
        </div>

        <div className="team-grid">
          {teamMembers.map((member, i) => (
            <div className="team-member" key={i}>
              <div className="team-avatar">
                {member.photo ? (
                  <img
                    src={member.photo}
                    alt={t("home.teamMemberAlt", {
                      name: member.name,
                      role: t(`home.${member.role}`),
                    })}
                  />
                ) : (
                  "👤"
                )}
              </div>

              <h4>{member.name}</h4>
              <span>{t(`home.${member.role}`)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ================= GALLERY LIGHTBOX ================= */}
      {lightboxOpen && (
        <div
          className="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={t(`home.${galleryImages[lightboxIndex].caption}`)}
          onClick={closeLightbox}
        >
          <button
            className="lightbox-close"
            type="button"
            aria-label={t("home.closeImage")}
            onClick={closeLightbox}
            autoFocus
          >
            ✕
          </button>

          <button
            className="lightbox-nav prev"
            type="button"
            aria-label={t("home.previousImage")}
            onClick={(e) => {
              e.stopPropagation();
              showPrevImage();
            }}
          >
            ‹
          </button>

          <figure
            className="lightbox-figure"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={galleryImages[lightboxIndex].src}
              alt={t(`home.${galleryImages[lightboxIndex].caption}`)}
            />

            <figcaption>
              {t(`home.${galleryImages[lightboxIndex].caption}`)}

              <span>
                {lightboxIndex + 1} / {galleryImages.length}
              </span>
            </figcaption>
          </figure>

          <button
            className="lightbox-nav next"
            type="button"
            aria-label={t("home.nextImage")}
            onClick={(e) => {
              e.stopPropagation();
              showNextImage();
            }}
          >
            ›
          </button>
        </div>
      )}
    </main>
  );
};

export default Home;
