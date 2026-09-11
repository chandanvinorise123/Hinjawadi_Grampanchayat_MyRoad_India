import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import "./home.css";

// ---- Hero background slider images (replace with your real assets) ----
import heroImage1 from "../assets/r1.jpg";
import heroImage2 from "../assets/r2.jpg";
import heroImage3 from "../assets/r3.jpg";
import heroImage4 from "../assets/r4.png";
import heroImage5 from "../assets/r5.jpg";


// ---- TV preview video (replace with your real demo clip) ----
import tvDemoVideo from "../assets/myRoadvideo.mp4";

// ---- Gallery images (reuse hero images or add separate ones) ----
import gallery1 from "../assets/r1.jpg";
import gallery2 from "../assets/r2.jpg";
import gallery3 from "../assets/r3.jpg";
import gallery4 from "../assets/r4.png";


const heroImages = [heroImage1, heroImage2, heroImage3, heroImage4, heroImage5];

const quickActions = [
  { icon: "📍", title: "Report an Issue", desc: "Submit a photo, location & description" },
  { icon: "🔍", title: "Track Complaint", desc: "Check status with your complaint ID" },
  { icon: "🗺️", title: "Issues on Map", desc: "View reported issues near you" },
  { icon: "📷", title: "Scan QR Code", desc: "Report from a roadside QR sign" },
  { icon: "⚠️", title: "Road Safety", desc: "Guidelines & alerts for citizens" },
];

const liveStats = [
  { value: "17,438", label: "Total Reported Issues", trend: "+4.2%", color: "blue" },
  { value: "1,742", label: "Under Verification", trend: "-1.1%", color: "amber" },
  { value: "2,317", label: "Action Required", trend: "+2.6%", color: "orange" },
  { value: "1,987", label: "Under Repair", trend: "+6.8%", color: "saffron" },
  { value: "15,932", label: "Resolved", trend: "+9.3%", color: "green" },
];

const categories = [
  { icon: "🛣️", title: "Road Issues", desc: "Potholes, cracked surfaces, damaged shoulders.", count: "4,812" },
  { icon: "🌊", title: "Sewerage & Drainage", desc: "Blocked drains, overflowing sewers.", count: "2,145" },
  { icon: "💧", title: "Drinking Water", desc: "Pipeline leakage, contaminated supply.", count: "1,760" },
  { icon: "💡", title: "Streetlights", desc: "Non-functional or flickering lights.", count: "3,398" },
  { icon: "⚠️", title: "Road Safety", desc: "Missing signage, hazardous junctions.", count: "1,204" },
  { icon: "🌉", title: "Bridges & Culverts", desc: "Structural damage, erosion.", count: "419" },
];

const steps = [
  { num: "01", title: "Report Issue", desc: "Describe the problem with photos" },
  { num: "02", title: "Capture Location", desc: "GPS pinpoints the exact spot" },
  { num: "03", title: "Verification", desc: "Panchayat staff review the report" },
  { num: "04", title: "Staff Assignment", desc: "A field officer is assigned" },
  { num: "05", title: "Repair & Evidence", desc: "Work done, before/after logged" },
  { num: "06", title: "Resolution & Closure", desc: "Citizen confirms, complaint closes" },
];

const trustItems = [
  { icon: "👥", title: "Citizen Participation", desc: "Every resident can report and follow up." },
  { icon: "🔍", title: "Transparent Tracking", desc: "Full visibility from registration to closure." },
  { icon: "📍", title: "GPS-Based Reporting", desc: "Exact location tagging for field teams." },
  { icon: "📷", title: "Digital Evidence", desc: "Before/after photos verify every repair." },
  { icon: "✅", title: "Accountable Resolution", desc: "Named staff and timelines for closures." },
  { icon: "📊", title: "Data-Driven Planning", desc: "Ward-level analytics guide planning." },
];

const galleryImages = [
  { src: gallery1, caption: "National Highway Interchange" },
  { src: gallery2, caption: "Expressway Flyover" },
  { src: gallery3, caption: "Urban Cloverleaf Junction" },
  { src: gallery4, caption: "Green Corridor Overpass" },
];

const teamMembers = [
  { name: "Full Name", role: "Sarpanch · Village Head" },
  { name: "Full Name", role: "Gram Sevak · Secretary" },
];

const Home = () => {
  const { t } = useTranslation();
  
  const [currentSlide, setCurrentSlide] = useState(0);
  const [tvPlaying, setTvPlaying] = useState(true);
  const videoRef = useRef(null);

  // Automatic hero background slider
  useEffect(() => {
    if (heroImages.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev === heroImages.length - 1 ? 0 : prev + 1));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const nextSlide = () =>
    setCurrentSlide((prev) => (prev === heroImages.length - 1 ? 0 : prev + 1));

  const previousSlide = () =>
    setCurrentSlide((prev) => (prev === 0 ? heroImages.length - 1 : prev - 1));

  const goToSlide = (index) => setCurrentSlide(index);

  // TV video play / pause toggle
  const toggleTvPlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.muted = false;   // 🔊 Turn audio ON
      video.volume = 0.2;    // 🔉 20% volume
      video.play();
      setTvPlaying(true);
    } else {
      video.pause();
      setTvPlaying(false);
    }
  };







  return (
    <main className="home-page">
      {/* ================= HERO SECTION ================= */}
      <section className="hero-section">
        <div className="hero-slider">
          {heroImages.map((image, index) => (
            <div
              key={index}
              className={`hero-slide ${index === currentSlide ? "active" : ""}`}
              style={{ backgroundImage: `url(${image})` }}
            />
          ))}
        </div>

        <div className="hero-scrim"></div>



        <div className="hero-content">
          <div className="hero-badge">
            <span className="live-dot"></span>
            Live Civic Reporting Network — Gram Panchayat
          </div>

          <h1>
            Report Road &amp; Public <span>Infrastructure Issues</span>
          </h1>




          <p className="hero-description">
            Photograph the problem, share your location, and get a complaint
            number in seconds. Track every step — from verification to repair —
            until it's resolved.
          </p>

          <div className="hero-buttons">
            <button className="primary-btn" type="button">
              Report an Issue <span>→</span>
            </button>
            <button className="secondary-btn" type="button">
              Track Complaint
            </button>
          </div>

          <div className="hero-trust">
            <div>
              <b>17,438</b>
              <span>Issues reported</span>
            </div>
            <div>
              <b>91.4%</b>
              <span>Resolution rate</span>
            </div>
            <div>
              <b>4.2 days</b>
              <span>Avg. resolution time</span>
            </div>
          </div>
        </div>







        {/* Slider dots (hero background) */}
        {heroImages.length > 1 && (
          <div className="slider-dots">
            {heroImages.map((_, index) => (
              <button
                key={index}
                type="button"
                className={`slider-dot ${index === currentSlide ? "active" : ""}`}
                onClick={() => goToSlide(index)}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}




        {/* TV preview panel with actual video + play/pause */}
        <div className="tv-unit">
          <div className={`tv-frame ${!tvPlaying ? "tv-paused" : ""}`}>
            <div className="tv-topbar">
              <div className="tv-live">
                <span className="dot"></span> Live Preview
              </div>
              <div className="tv-brand">MYROAD · DEMO</div>
            </div>

            <div className="tv-screen">


              <video ref={videoRef} autoPlay muted loop playsInline>
                <source src={tvDemoVideo} type="video/mp4" />
              </video>






              <div className="tv-overlay-top">
                <span className="dot"></span> Reporting a Pothole
              </div>

              <button
                className="tv-play-btn"
                onClick={toggleTvPlayback}
                aria-label="Play or pause preview"
              >
                {tvPlaying ? "❚❚" : "▶"}
              </button>

              <div className="tv-overlay-bottom">
                <b>#MRI-2026-08341</b>
                <span>Under Repair</span>
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
          <p className="section-label">Citizen Services</p>
          <h2>What would you like to do?</h2>
        </div>

        <div className="quick-actions-grid">
          {quickActions.map((item, i) => (
            <button className="qa-card" key={i} type="button">
              <div className="qa-icon">{item.icon}</div>
              <h4>{item.title}</h4>
              <p>{item.desc}</p>
            </button>
          ))}
        </div>
      </section>

      {/* ================= LIVE STATS ================= */}
      <section className="stats-section">
        <div className="section-heading">
          <p className="section-label">Real-time · Updated every 5 minutes</p>
          <h2>Live civic complaint statistics</h2>
        </div>

        <div className="stats-bar">
          {liveStats.map((stat, i) => (
            <div className="stat-cell" key={i}>
              <div className="stat-top">
                <span className={`stat-dot dot-${stat.color}`}></span>
                <span className="stat-trend">{stat.trend}</span>
              </div>
              <div className="stat-num">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ================= CATEGORIES ================= */}
      <section className="categories-section">
        <div className="section-heading">
          <p className="section-label">Browse by Category</p>
          <h2>What do you want to report?</h2>
        </div>

        <div className="categories-grid">
          {categories.map((cat, i) => (
            <div className="cat-card" key={i}>
              <div className="cat-top">
                <div className="cat-icon">{cat.icon}</div>
                <span className="cat-count">{cat.count} issues</span>
              </div>
              <h4>{cat.title}</h4>
              <p>{cat.desc}</p>
              <span className="cat-link">View Issues →</span>
            </div>
          ))}
        </div>
      </section>

      {/* ================= HOW IT WORKS ================= */}
      <section className="steps-section">
        <div className="section-heading center">
          <p className="section-label">Process</p>
          <h2>How it works</h2>
        </div>

        <div className="steps-track">
          {steps.map((step, i) => (
            <div className={`step ${i < 3 ? "done" : ""}`} key={i}>
              <div className="step-num">{step.num}</div>
              <h5>{step.title}</h5>
              <p>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ================= TRACK COMPLAINT ================= */}
      <section className="track-section">
        <div className="track-shell">
          <div className="track-left">
            <h3>Track your complaint</h3>
            <p>Enter your complaint number to see real-time progress.</p>
            <div className="track-input-row">
              <input type="text" placeholder="Enter Complaint Number, e.g. MRI-2026-08341" />
              <button className="primary-btn" type="button">
                Track Status
              </button>
            </div>
          </div>

          <div className="timeline-card">
            <div className="tl-head">
              <b>#MRI-2026-08341</b>
              <span>On Track</span>
            </div>
            {[
              { label: "Complaint Registered", time: "18 Aug, 10:42 AM", state: "done" },
              { label: "Verified", time: "18 Aug, 3:10 PM", state: "done" },
              { label: "Assigned to Staff", time: "19 Aug, 9:05 AM", state: "done" },
              { label: "Repair Work in Progress", time: "21 Aug, 11:20 AM", state: "now" },
              { label: "Resolution Verified", time: "Pending", state: "pend" },
              { label: "Closed", time: "Pending", state: "pend" },
            ].map((item, i) => (
              <div className="tl-item" key={i}>
                <div className={`tl-dot ${item.state}`}></div>
                <div className="tl-body">
                  <b>{item.label}</b>
                  <span>{item.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= GALLERY ================= */}
      <section className="gallery-section">
        <div className="section-heading center">
          <p className="section-label">Infrastructure in Focus</p>
          <h2>Road Infrastructure Gallery</h2>
          <p className="section-sub">
            A look at the national and regional road networks that connect our
            villages and cities.
          </p>
        </div>

        <div className="gallery-grid">
          {galleryImages.map((img, i) => (
            <div className="gallery-item" key={i}>
              <img src={img.src} alt={img.caption} />
              <span>{img.caption}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ================= TRUST ================= */}
      <section className="trust-section">
        <div className="section-heading center">
          <p className="section-label">Why MyRoad India</p>
          <h2>Built for public trust</h2>
        </div>

        <div className="trust-grid">
          {trustItems.map((item, i) => (
            <div className="trust-card" key={i}>
              <div className="t-ic">{item.icon}</div>
              <h5>{item.title}</h5>
              <p>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ================= GRAM PANCHAYAT TEAM ================= */}
      <section className="team-section">
        <div className="section-heading center">
          <p className="section-label">Local Governance</p>
          <h2>Gram Panchayat Team</h2>
        </div>

        <div className="team-grid">
          {teamMembers.map((member, i) => (
            <div className="team-member" key={i}>
              <div className="team-avatar">👤</div>
              <h4>{member.name}</h4>
              <span>{member.role}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
};

export default Home;