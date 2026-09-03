import React from "react";
import "./aboutus.css";

const pillars = [
  {
    num: "01",
    icon: "🎯",
    title: "Purpose",
    items: [
      "Citizen participation",
      "Identify issues",
      "Improve infrastructure",
      "Better planning",
    ],
  },
  {
    num: "02",
    icon: "⚙️",
    title: "What We Do",
    items: [
      "Complaint Registration",
      "Location Mapping",
      "Staff Assignment",
      "Work Monitoring",
      "Resolution Tracking",
    ],
  },
  {
    num: "03",
    icon: "✅",
    title: "Key Benefits",
    items: [
      "Transparency",
      "Faster Response",
      "Digital Records",
      "Better Monitoring",
      "Data & Analytics",
    ],
  },
];

const flowSteps = ["Citizen", "Panchayat", "Staff", "Resolution"];

const AboutUs = () => {
  return (
    <main className="about-page">
      {/* ================= PAGE HERO ================= */}
      <section className="page-hero">
        <div className="hero-glow"></div>
        <div className="page-hero-inner">
          <div className="breadcrumb">
            Home / <b>About Us</b>
          </div>
          <p className="eyebrow eyebrow-light">About MyRoad India</p>
          <h1>A digital road & public infrastructure platform</h1>
          <p className="hero-lead">
            MyRoad India connects citizens, panchayats, and field staff on one
            transparent system — turning every reported issue into a tracked,
            resolved outcome.
          </p>
        </div>
      </section>

      {/* ================= INTRO ================= */}
      <section className="section">
        <div className="intro-shell">
          <p className="eyebrow">Who We Are</p>
          <h2>About MyRoad India</h2>
          <p className="intro-lead">
            A digital platform built to give citizens a direct voice in the
            condition of their roads and public infrastructure — connecting
            reports to real, monitored action.
          </p>
        </div>
      </section>

      {/* ================= PILLARS GRID ================= */}
      <section className="section surface">
        <div className="section-heading center">
          <p className="eyebrow center">Our Foundation</p>
          <h2>Why the platform exists, and what it delivers</h2>
        </div>

        <div className="pillars-grid">
          {pillars.map((pillar, i) => (
            <div className="pillar-card" key={i}>
              <div className="pillar-top">
                <span className="pillar-number">{pillar.num}</span>
                <span className="pillar-icon">{pillar.icon}</span>
              </div>
              <h4>{pillar.title}</h4>
              <ul className="pillar-list">
                {pillar.items.map((item, j) => (
                  <li key={j}>
                    <span className="check">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ================= PROCESS FLOW ================= */}
      <section className="section">
        <div className="section-heading center">
          <p className="eyebrow center">How It Works</p>
          <h2>From citizen report to resolved issue</h2>
        </div>

        <div className="flow-track">
          {flowSteps.map((step, i) => (
            <React.Fragment key={i}>
              <div className="flow-step">
                <div className="flow-dot">{i + 1}</div>
                <span>{step}</span>
              </div>
              {i < flowSteps.length - 1 && <div className="flow-arrow">→</div>}
            </React.Fragment>
          ))}
        </div>
      </section>

      {/* ================= OUTCOME BANNER ================= */}
      <section className="section cta-section">
        <div className="cta-shell">
          <div>
            <h3>Better road & public infrastructure</h3>
            <p>
              Every complaint, every inspection, every resolution — building
              towards infrastructure the community can rely on.
            </p>
          </div>
          <button className="primary-btn" type="button">
            Report an Issue <span>→</span>
          </button>
        </div>
      </section>
    </main>
  );
};

export default AboutUs;