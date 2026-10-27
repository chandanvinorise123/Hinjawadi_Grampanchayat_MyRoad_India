
import React, { useEffect, useRef, useState } from "react";
import VisitorsOverview from "../components/visitoroverview/VisitorsOverview";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import "./home.css";
import { API_BASE_URL } from "../utils/dashboardApi";
import HomeComplaintsMap from "../components/maps/HomeComplaintsMap";
const REPORT_ROUTE = "/reportissue";


// Hero background slider images
import heroImage1 from "../assets/r1.jpg";
import heroImage2 from "../assets/r2.jpg";
import heroImage3 from "../assets/r3.jpg";
import heroImage4 from "../assets/r4.png";
import heroImage5 from "../assets/r5.jpg";

// TV preview video
// import tvDemoVideo from "../assets/myRoadvideo.mp4";

// Gallery images
import gallery1 from "../assets/r1.jpg";
import gallery2 from "../assets/r2.jpg";
import gallery3 from "../assets/r3.jpg";
import gallery4 from "../assets/r4.png";

// Gram Panchayat team photos
import sarpanchPhoto1 from "../assets/committee_photo2.JPG";
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
    icon: "pin",
    title: "reportIssue",
    destination: REPORT_ROUTE,
  },

  {
    icon: "search",
    title: "trackComplaint",
    action: "track",
  },

  {
    icon: "map",
    title: "issuesOnMap",
    destination: "/complaint-map",
  },

  {
    icon: "warning",
    title: "roadSafety",
    destination: "/issues-category",
  },
];

const liveStats = [
  {
    key: "totalReportedIssues",
    label: "totalReported",
    color: "blue",
  },
  {
    key: "underVerification",
    label: "underVerification",
    color: "amber",
  },
  {
    key: "actionRequired",
    label: "actionRequired",
    color: "orange",
  },
  {
    key: "underRepair",
    label: "underRepair",
    color: "saffron",
  },
  {
    key: "resolved",
    label: "resolved",
    color: "green",
  },
];

const categories = [
  {
    icon: "road",
    title: "roadIssues",
    desc: "roadIssuesDesc",
    count: "4,812",
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
    icon: "drain",
    title: "sewerageDrainage",
    desc: "sewerageDesc",
    count: "2,145",
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
    icon: "water",
    title: "drinkingWater",
    desc: "waterDesc",
    count: "1,760",
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
    icon: "light",
    title: "streetlights",
    desc: "streetlightsDesc",
    count: "3,398",
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
    icon: "safety",
    title: "roadSafetyCategory",
    desc: "roadSafetyDesc",
    count: "1,204",
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
    icon: "bridge",
    title: "bridgesCulverts",
    desc: "bridgesDesc",
    count: "419",
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

const quickReportCategories = [
  "roadIssues",
  "streetlights",
  "sewerageDrainage",
  "bridgesCulverts",
  "footpath",
  "drinkingWater",
  "undergroundDrainage",
  "roadSafetyCategory",
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
    icon: "people",
    title: "citizenParticipation",
    desc: "citizenParticipationDesc",
  },
  {
    icon: "search",
    title: "transparentTracking",
    desc: "transparentTrackingDesc",
  },
  {
    icon: "pin",
    title: "gpsReporting",
    desc: "gpsReportingDesc",
  },
  {
    icon: "camera",
    title: "digitalEvidence",
    desc: "digitalEvidenceDesc",
  },
  {
    icon: "check",
    title: "accountableResolution",
    desc: "accountableResolutionDesc",
  },
  {
    icon: "chart",
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
    name: "sarpanchName",
    role: "sarpanchRole",
    photo: sarpanchPhoto1,
  },
  {
    // name: "Sau. Shubhangi Suraj Sakhare",
    role: "upsarpanchRole",
    photo: upsarpanchPhoto2,
  },
];

const HomeIcon = ({ name, className = "" }) => {
  const artwork = {
    pin: (
      <>
        <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    search: (
      <>
        <circle cx="10.8" cy="10.8" r="6.8" />
        <path d="m16 16 4.5 4.5" />
      </>
    ),
    map: (
      <>
        <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z" />
        <path d="M9 3v15m6-12v15" />
        <path d="M5.5 9.5h1m10-1h1" />
      </>
    ),
    warning: (
      <>
        <path d="m10.3 3.9-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3.1l-8-14a2 2 0 0 0-3.4 0Z" />
        <path d="M12 9v4m0 4h.01" />
      </>
    ),
    road: (
      <>
        <path d="M5 21 9 3m10 18L15 3" />
        <path d="M12 4v3m0 4v3m0 4v3" />
        <path d="M3 21h18" />
      </>
    ),
    drain: (
      <>
        <path d="M3 7h18M5 7v12m14-12v12M5 19h14" />
        <path d="M8 10v6m4-6v6m4-6v6" />
        <path d="M3 4h18" />
      </>
    ),
    water: (
      <>
        <path d="M12 3s-6 7-6 11a6 6 0 0 0 12 0c0-4-6-11-6-11Z" />
        <path d="M9 15a3 3 0 0 0 3 3" />
      </>
    ),
    light: (
      <>
        <path d="M9 18h6m-5 3h4" />
        <path d="M8.5 14.5A7 7 0 1 1 15.5 14.5c-.8.7-1.2 1.5-1.4 2.5h-4.2c-.2-1-.6-1.8-1.4-2.5Z" />
        <path d="M12 1v2m9 9h-2M5 12H3m15.4-6.4L17 7M7 7 5.6 5.6" />
      </>
    ),
    safety: (
      <>
        <path d="m12 22 1.8-.8A11 11 0 0 0 20 11V5l-8-3-8 3v6a11 11 0 0 0 6.2 10.2L12 22Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    bridge: (
      <>
        <path d="M3 19h18M4 19v-5m16 5v-5M3 14h18" />
        <path d="M4 14a8 8 0 0 1 16 0M8 14v5m8-5v5" />
        <path d="M2 21h20" />
      </>
    ),
    people: (
      <>
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 5a3.5 3.5 0 0 1 0 6.8m1.5 2a6 6 0 0 1 4 5.7" />
      </>
    ),
    camera: (
      <>
        <path d="M4 7h3l1.5-2h7L17 7h3a2 2 0 0 1 2 2v10H2V9a2 2 0 0 1 2-2Z" />
        <circle cx="12" cy="13" r="3.5" />
      </>
    ),
    check: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12 2.5 2.5L16.5 9" />
      </>
    ),
    chart: (
      <>
        <path d="M4 20V10m5 10V4m6 16v-7m5 7V7" />
        <path d="M2 20h20" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
  }[name];

  return (
    <svg
      className={`home-icon-svg ${className}`.trim()}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {artwork}
    </svg>
  );
};


const Home = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const [trackId, setTrackId] = useState("");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [tvPlaying, setTvPlaying] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [complaintStats, setComplaintStats] = useState(null);
  const [animatedComplaintStats, setAnimatedComplaintStats] = useState(null);
  const [complaintStatsError, setComplaintStatsError] = useState(false);
  const [statsSectionVisible, setStatsSectionVisible] = useState(false);
  const [activeProcessStep, setActiveProcessStep] = useState(
    prefersReducedMotion ? steps.length - 1 : 0
  );
  const videoRef = useRef(null);
  const statsSectionRef = useRef(null);

  // Gallery lightbox
  const [lightboxIndex, setLightboxIndex] = useState(null);

  useEffect(() => {
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timers = [];
    let currentStep = motionPreference.matches ? steps.length - 1 : 0;

    const clearTimers = () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      timers = [];
    };

    const startCycle = () => {
      currentStep = 0;
      setActiveProcessStep(currentStep);
      scheduleNextStep();
    };

    const scheduleNextStep = () => {
      if (currentStep < steps.length - 1) {
        timers.push(window.setTimeout(() => {
          currentStep += 1;
          setActiveProcessStep(currentStep);
          scheduleNextStep();
        }, 1056));
      } else {
        timers.push(window.setTimeout(startCycle, 720));
      }
    };

    const handleMotionPreferenceChange = () => {
      clearTimers();
      if (motionPreference.matches) {
        setActiveProcessStep(steps.length - 1);
      } else {
        startCycle();
      }
    };

    if (!motionPreference.matches) scheduleNextStep();

    motionPreference.addEventListener("change", handleMotionPreferenceChange);
    return () => {
      clearTimers();
      motionPreference.removeEventListener("change", handleMotionPreferenceChange);
    };
  }, []);
  const lightboxOpen = lightboxIndex !== null;

  const submitComplaintTracking = (event) => {
    event.preventDefault();
    const requestedId = trackId.trim();
    if (!requestedId) return;
    navigate("/complaint-progress", {
      state: {
        trackComplaintNumber: requestedId,
        backgroundLocation: location,
      },
    });
  };

  useEffect(() => {
    if (!selectedCategory) return undefined;

    const closeOnEscape = (event) => {
      if (event.key === "Escape") setSelectedCategory(null);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [selectedCategory]);

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

  useEffect(() => {
    let isMounted = true;

    const fetchComplaintStats = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/stats/overview`);
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.message || "Unable to load complaint statistics");
        }

        const fetchedStats = {
          totalReportedIssues: result.data?.totalReportedIssues,
          ...result.data?.complaintStatusCounts,
        };
        if (!liveStats.every(({ key }) => Number.isFinite(fetchedStats[key]))) {
          throw new Error("The complaint statistics response is incomplete");
        }

        if (isMounted) {
          setComplaintStats(fetchedStats);
          setComplaintStatsError(false);
        }
      } catch (error) {
        console.error("Failed to fetch home complaint statistics:", error);
        if (isMounted) setComplaintStatsError(true);
      }
    };

    fetchComplaintStats();
    const interval = window.setInterval(fetchComplaintStats, 5 * 60 * 1000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const statsSection = statsSectionRef.current;
    if (!statsSection || !("IntersectionObserver" in window)) {
      const animationFrame = window.requestAnimationFrame(() =>
        setStatsSectionVisible(true)
      );
      return () => window.cancelAnimationFrame(animationFrame);
    }

    let visibilityTimer;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
        window.clearTimeout(visibilityTimer);
        visibilityTimer = window.setTimeout(() => {
          setStatsSectionVisible(true);
        }, 300);
        } else {
        window.clearTimeout(visibilityTimer);
        setStatsSectionVisible(false);
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(statsSection);
    return () => {
      window.clearTimeout(visibilityTimer);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!statsSectionVisible || !complaintStats) return undefined;

    if (prefersReducedMotion) return undefined;

    const duration = 1400;
    let animationFrame;
    let startTime;
    const animateStats = (time) => {
      if (startTime === undefined) startTime = time;
      const progress = Math.min((time - startTime) / duration, 1);
      const easedProgress = 1 - (1 - progress) ** 4;
      setAnimatedComplaintStats(
        Object.fromEntries(
          liveStats.map(({ key }) => [
            key,
            Math.round(complaintStats[key] * easedProgress),
          ])
        )
      );
      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(animateStats);
      }
    };

    animationFrame = window.requestAnimationFrame(animateStats);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [complaintStats, prefersReducedMotion, statsSectionVisible]);

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

        <div className="hero-main-layout">
          <div className="hero-content">
            <button
              className="hero-badge"
              type="button"
              onClick={() => navigate(REPORT_ROUTE)}
            >
              <span className="live-dot"></span>
              {t("home.liveNetwork")}
            </button>

            <h1>
              {t("home.heroTitle")}{" "}
              <span>{t("home.heroTitleHighlight")}</span>
            </h1>

            <p className="hero-description">
              {t("home.heroDescription")}
            </p>
          </div>
          <div className="hero-feature-layout">
            <section className="home-report-panel" aria-labelledby="home-report-title">
              <div className="home-report-panel-body">
                <h2 id="home-report-title">
                  {t("home.selectIssueCategory", { defaultValue: "Select Issue Category" })}
                </h2>
                <div className="home-report-category-grid">
                  {quickReportCategories.map((category) => (
                    <button
                      className="home-report-category"
                      key={category}
                      type="button"
                      onClick={() => navigate(REPORT_ROUTE)}
                    >
                      <span aria-hidden="true" />
                      {t(`home.${category}`)}
                    </button>
                  ))}
                </div>
                <button
                  className="home-report-panel-header"
                  type="button"
                  onClick={() => navigate(REPORT_ROUTE)}
                >
                  <span className="home-report-icon" aria-hidden="true">📣</span>
                  <span>{t("home.reportIssue")}</span>
                  <span className="home-report-arrow" aria-hidden="true">→</span>
                </button>
              </div>
            </section>
            <HomeComplaintsMap t={t} />
          </div>
          <nav className="home-hero-social" aria-label="MyRoad India social media and contact links">
            <h2 className="home-hero-social-heading">{t("home.followUsOn")}</h2>
            <div className="home-hero-social-links">
              <a
                href="https://share.google/HsIlui1qbOCUediGM"
                className="home-hero-social-link instagram"
                aria-label="Instagram"
                target="_blank"
                rel="noreferrer"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.2" cy="6.8" r="0.9" fill="currentColor" stroke="none" />
                </svg>
              </a>
              <a
                href="mailto:grampanchayat.hinjawadi@gmail.com"
                className="home-hero-social-link email"
                aria-label="Email grampanchayat.hinjawadi@gmail.com"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="m4 7 8 6 8-6" />
                </svg>
              </a>
              <a
                href="https://share.google/06M6t0lK3LVaspijN"
                className="home-hero-social-link website"
                aria-label="Website"
                target="_blank"
                rel="noreferrer"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
                </svg>
              </a>
              <a
                href="https://share.google/znXEMLnf71s7vCaPG"
                className="home-hero-social-link facebook"
                aria-label="Facebook"
                target="_blank"
                rel="noreferrer"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M13.5 21v-8h2.7l.4-3.1h-3.1v-2c0-.9.3-1.5 1.6-1.5h1.7V3.6c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.1H7.3V13h2.8v8z" />
                </svg>
              </a>
              <a
                href="https://wa.me/919834206559"
                className="home-hero-social-link whatsapp"
                aria-label="WhatsApp"
                target="_blank"
                rel="noreferrer"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d="M12 3a9 9 0 00-7.8 13.5L3 21l4.7-1.2A9 9 0 1012 3z" />
                  <path d="M8.4 7.6c.2-.5.5-.5.7-.5h.5c.2 0 .4 0 .6.4.2.5.7 1.7.7 1.8.1.1.1.3 0 .4-.1.2-.2.3-.3.4l-.4.5c-.1.1-.2.2-.1.5.2.4.8 1.3 1.7 2.1 1.1 1 1.1 1 1.4.9.2 0 .4-.2.5-.3l.5-.6c.2-.2.3-.2.5-.1l1.7.8c.2.1.3.2.4.3.1.2.1 1-.3 1.5-.3.5-1.4 1-2 1-.5 0-1.7-.2-3.5-1.7-2.1-1.8-2.9-3.4-3.1-3.9-.2-.5-.7-1.6-.5-2.6.1-.6.4-1 .6-1.2z" />
                </svg>
              </a>
            </div>
          </nav>
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














{/* 
        
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
 */}





      </section>











      {/* ================= QUICK ACTIONS ================= */}
      <section className="quick-actions-section">
        <div className="section-heading center">
          <p className="section-label">
            {t("home.citizenServices")}
          </p>
          <h2>{t("home.whatWouldYouLikeToDo")}</h2>
        </div>

        <div className="quick-actions-grid">
          {quickActions.map((item) => (
            <button
              className="qa-card"
              key={item.title}
              type="button"
              onClick={() => {
                if (item.action === "track") {
                  navigate("/complaint-progress");
                  return;
                }
                navigate(item.destination);
              }}
            >
              <div className="qa-icon"><HomeIcon name={item.icon} /></div>
              <h4>{t(`home.${item.title}`)}</h4>
            </button>
          ))}
        </div>
      </section>

      {/* ================= LIVE STATS ================= */}
      <section className="stats-section" ref={statsSectionRef}>
        <div className="section-heading center">
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
              </div>

              <div className="stat-num">
                {complaintStats
                  ? (prefersReducedMotion
                      ? complaintStats[stat.key]
                      : animatedComplaintStats?.[stat.key] ?? 0
                    ).toLocaleString()
                  : "—"}
              </div>

              <div className="stat-label">
                {t(`home.${stat.label}`)}
              </div>
            </div>
          ))}
        </div>
        {complaintStatsError && (
          <p className="stats-error" role="alert">
            {t("home.statsLoadError")}
          </p>
        )}
      </section>

      {/* ================= CATEGORIES ================= */}
      <section className="categories-section">
        <div className="section-heading center">
          <p className="section-label">
            {t("home.browseByCategory")}
          </p>
          <h2>{t("home.whatToReport")}</h2>
        </div>

        <div className="categories-grid">
          {categories.map((cat) => (
            <button
              className="cat-card"
              key={cat.title}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              aria-haspopup="dialog"
            >
              <div className="cat-top">
                <div className="cat-icon"><HomeIcon name={cat.icon} /></div>

                {/* <span className="cat-count">
                  {cat.count} {t("home.issues")}
                </span> */}
              </div>

              <h4>{t(`home.${cat.title}`)}</h4>

              {/* <span className="cat-link">
                {t("home.viewIssues")} →
              </span> */}
            </button>
          ))}
        </div>
      </section>

      {selectedCategory && (
        <div
          className="category-issues-overlay"
          onClick={() => setSelectedCategory(null)}
        >
          <section
            className="category-issues-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={t(`home.${selectedCategory.title}`)}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="category-issues-close"
              type="button"
              aria-label={t("Close", { defaultValue: "Close" })}
              onClick={() => setSelectedCategory(null)}
            >
              ×
            </button>
            <h2 className="category-issues-title">
              {t(`home.${selectedCategory.title}`)}
            </h2>
            <ul className="category-issues-list">
              {selectedCategory.issues.map((issue) => (
                <li key={issue}>
                  <button
                    type="button"
                    onClick={() => navigate(REPORT_ROUTE, { state: { issueType: issue } })}
                  >
                    {t(issue)}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      {/* ================= HOW IT WORKS ================= */}
      <section className="steps-section">
        <div className="section-heading center">
          <p className="section-label">{t("home.process")}</p>
          <h2>{t("home.howItWorks")}</h2>
        </div>

        <div className="steps-track">
          {steps.map((step, i) => (
            <div
              className={`step ${i < activeProcessStep ? "done" : ""} ${
                i === activeProcessStep ? "current" : ""
              }`}
              key={i}
              aria-current={i === activeProcessStep ? "step" : undefined}
            >
              <div className="step-num">{step.num}</div>
              <h5>{t(`home.${step.title}`)}</h5>
              <p>{t(`home.${step.desc}`)}</p>
            </div>
          ))}
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

      {/* ================= TRACK COMPLAINT ================= */}
      <section className="track-section" id="home-complaint-tracker">
        <div className="track-shell track-shell-single">
          <div className="track-card track-form-card track-card-featured">
            <div className="track-icon" aria-hidden="true"><HomeIcon name="search" /></div>
            <h3>{t("home.trackYourComplaint")}</h3>
            <p>{t("home.trackDescription")}</p>
            <form className="track-form" onSubmit={submitComplaintTracking}>
              <label htmlFor="home-track-id" className="sr-only">
                {t("home.complaintNumber")}
              </label>
              <input
                id="home-track-id"
                type="text"
                placeholder={t("home.complaintPlaceholder")}
                value={trackId}
                onChange={(event) => setTrackId(event.target.value)}
                required
              />
              <button className="primary-btn track-btn" type="submit">
                {t("home.trackStatus")}
              </button>
            </form>
            <button
              className="guest-details-btn"
              type="button"
              onClick={() => navigate("/guest-details")}
            >
              {t("home.guestDetailsButton")}
            </button>
          </div>
        </div>
      </section>



      {/* ================= TRUST ================= */}
      {/* <section className="trust-section">
        <div className="section-heading center">
          <p className="section-label">
            {t("home.whyMyRoad")}
          </p>

          <h2>{t("home.builtForTrust")}</h2>
        </div>

        <div className="trust-grid">
          {trustItems.map((item, i) => (
            <div className="trust-card" key={i}>
              <div className="t-ic"><HomeIcon name={item.icon} /></div>
              <h5>{t(`home.${item.title}`)}</h5>
            
            </div>
          ))}
        </div>
      </section> */}





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
                      name: member.name ? t(`home.${member.name}`) : "",
                      role: t(`home.${member.role}`),
                    })}
                  />
                ) : (
                  <HomeIcon name="user" />
                )}
              </div>

              {member.name && <h4>{t(`home.${member.name}`)}</h4>}
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
