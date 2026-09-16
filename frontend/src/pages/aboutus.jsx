
import React from "react";
import "./aboutus.css";
import bannerImage from "../assets/au.png";

const missionPoints = [
  "Every complaint is logged with a photo, location, and timestamp — nothing gets lost in a register.",
  "Field staff and verifiers work off the same live queue, so nothing sits unassigned.",
  "Citizens can track their complaint from registration to closure, in real time.",
];

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

const flowSteps = [
  {
    label: "Citizen",
    detail: "Reports an issue with photo & location",
  },
  {
    label: "Panchayat",
    detail: "Verifies and prioritizes the complaint",
  },
  {
    label: "Staff",
    detail: "Assigned field officer takes action",
  },
  {
    label: "Resolution",
    detail: "Work verified and complaint closed",
  },
];

const AboutUs = () => {
  return (
    <main className="about-page">

      {/* ================= PAGE HERO ================= */}
      <section
        className="page-hero"
        id="home"
        style={{ backgroundImage: `url(${bannerImage})` }}
      >
        <div className="hero-scrim"></div>

        <div className="page-hero-inner">

          <div className="hero-cta-row">
            <button className="primary-btn" type="button">
              Report an Issue <span>→</span>
            </button>

            {/* <a href="#mission" className="secondary-btn">
              Our Mission
            </a> */}
          </div>

        </div>
      </section>

      {/* ================= INTRO ================= */}
      <section className="section">
        <div className="intro-shell">

          <p className="eyebrow">
            Who We Are
          </p>

          <h2>
            About MyRoad India
          </h2>

          <p className="intro-lead">
            A digital platform built to give citizens a direct voice in the
            condition of their roads and public infrastructure — connecting
            reports to real, monitored action.
          </p>

        </div>
      </section>

      {/* ================= MISSION ================= */}
      <section className="section surface" id="mission">

        <div className="mission-shell">

          <div className="mission-copy">

            <p className="eyebrow">
              Our Mission
            </p>

            <h2>
              Closing the gap between a report and a repair
            </h2>

            <p className="mission-lead">
              Most civic complaints disappear into a register and are never
              seen again. MyRoad India replaces that register with a system
              every stakeholder can see into — citizen, staff, verifier, and
              administrator alike.
            </p>

            <ul className="mission-points">
              {missionPoints.map((point, i) => (
                <li key={i}>
                  <span className="mission-point-dot"></span>
                  {point}
                </li>
              ))}
            </ul>

          </div>

        </div>

      </section>

      {/* ================= PILLARS GRID ================= */}
      <section className="section">

        <div className="section-heading center">

          <p className="eyebrow center">
            Our Foundation
          </p>

          <h2>
            Why the platform exists, and what it delivers
          </h2>

        </div>

        <div className="pillars-grid">

          {pillars.map((pillar, i) => (
            <div className="pillar-card" key={i}>

              <div className="pillar-top">

                <span className="pillar-number">
                  {pillar.num}
                </span>

                <span className="pillar-icon">
                  {pillar.icon}
                </span>

              </div>

              <h4>
                {pillar.title}
              </h4>

              <ul className="pillar-list">

                {pillar.items.map((item, j) => (
                  <li key={j}>

                    <span className="check">
                      ✓
                    </span>

                    {item}

                  </li>
                ))}

              </ul>

            </div>
          ))}

        </div>

      </section>

      {/* ================= PROCESS FLOW ================= */}
      <section className="section surface">

        <div className="section-heading center">

          <p className="eyebrow center">
            How It Works
          </p>

          <h2>
            From citizen report to resolved issue
          </h2>

        </div>

        <div className="flow-track">

          {flowSteps.map((step, i) => (
            <React.Fragment key={i}>

              <div className="flow-step">

                <div className="flow-dot">
                  {i + 1}
                </div>

                <span className="flow-step-label">
                  {step.label}
                </span>

                <span className="flow-step-detail">
                  {step.detail}
                </span>

              </div>

              {i < flowSteps.length - 1 && (
                <div className="flow-arrow">
                  →
                </div>
              )}

            </React.Fragment>
          ))}

        </div>

      </section>

      {/* ================= OUTCOME BANNER ================= */}
      <section className="section cta-section">

        <div className="cta-shell">

          <div>

            <h3>
              Better road & public infrastructure
            </h3>

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


//You can also remove any `.stats-strip`, `.stats-shell`, `.stat-item`, `.stat-value`, and `.stat-label` CSS from `aboutus.css` if those styles are now unused.
