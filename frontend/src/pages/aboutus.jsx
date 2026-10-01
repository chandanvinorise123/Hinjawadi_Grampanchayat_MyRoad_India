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

/* ================= HINJEWADI GRAM PANCHAYAT DATA ================= */

const hinjewadiProfile = [
  {
    label: "Location",
    value: "Hinjewadi, Mulshi Taluka, Pune District, Maharashtra",
  },
  { label: "PIN Code", value: "411057" },
  { label: "Gram Panchayat Established", value: "25 February 1970" },
  {
    label: "Main Economic Activity",
    value: "IT, services, commercial activities and agriculture",
  },
  { label: "Major Development", value: "Rajiv Gandhi Infotech Park" },
  { label: "Main Water Source", value: "Mula River" },
];

const hinjewadiStats = [
  { icon: "👥", value: "11,459", label: "Population", note: "2011" },
  { icon: "🏠", value: "3,122", label: "Households", note: "2011" },
  { icon: "🏢", value: "104", label: "Companies", note: "Reported" },
  {
    icon: "🚶",
    value: "~1 Lakh",
    label: "Floating Population",
    note: "Reported 2025",
  },
];

const hinjewadiAmenities = [
  { icon: "💡", value: "7,942", label: "Street Lights" },
  { icon: "☀️", value: "14", label: "Solar Poles" },
  { icon: "⛽", value: "5", label: "Petrol Pumps" },
  { icon: "🔌", value: "3", label: "EV Charging Points" },
  { icon: "🚛", value: "8", label: "Garbage Collection Vehicles" },
];

const roadConnections = ["Dange Chowk", "Wakad", "Maan", "Marunji"];

const roadIndiaPoints = [
  {
    num: "01",
    title: "Rapid Urbanisation",
    text: "Hinjewadi has changed from an agricultural village into a major IT and commercial centre.",
  },
  {
    num: "02",
    title: "Rajiv Gandhi Infotech Park",
    text: "The IT park is the main driver of economic and infrastructure growth.",
  },
  {
    num: "03",
    title: "Road Connectivity",
    text: "Important connections lead toward Dange Chowk, Wakad, Maan and Marunji.",
  },
  {
    num: "04",
    title: "Traffic Pressure",
    text: "Large numbers of employees, residents and vehicles travel through the area, creating significant demand for road and transport infrastructure.",
  },
  {
    num: "05",
    title: "Infrastructure Needs",
    text: "The key areas to study are:",
    tags: [
      "Traffic management",
      "Road maintenance",
      "Pedestrian safety",
      "Public transport",
      "Parking",
      "Drainage",
    ],
  },
  {
    num: "06",
    title: "Future Mobility",
    text: "The presence of 3 reported EV charging points provides a useful point for discussing the transition toward electric transportation.",
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

      {/* ================= HINJEWADI — AT A GLANCE ================= */}
      <section className="section" id="hinjewadi">

        <div className="section-heading center">

          <p className="eyebrow center">
            Our Focus Area
          </p>

          <h2>
            Hinjewadi Gram Panchayat at a glance
          </h2>

          <p className="hj-lead">
            MyRoad India is rooted in Hinjewadi — a fast-growing Gram
            Panchayat in Mulshi Taluka, Pune District, home to the Rajiv
            Gandhi Infotech Park.
          </p>

        </div>

        <div className="hj-overview">

          {/* Profile */}
          <div className="hj-profile">

            <h4 className="hj-card-title">
              Gram Panchayat Profile
            </h4>

            <dl className="hj-profile-list">
              {hinjewadiProfile.map((row, i) => (
                <div className="hj-profile-row" key={i}>
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>

          </div>

          {/* Key numbers */}
          <div className="hj-stats">
            {hinjewadiStats.map((stat, i) => (
              <div className="hj-card" key={i}>
                <span className="hj-icon">{stat.icon}</span>
                <span className="hj-value">{stat.value}</span>
                <span className="hj-label">{stat.label}</span>
                <span className="hj-tag-note">{stat.note}</span>
              </div>
            ))}
          </div>

        </div>

        <p className="hj-note">
          Population and household figures are for 2011. Companies and
          floating population are as reported.
        </p>

      </section>

      {/* ================= HINJEWADI — INFRASTRUCTURE & ROADS ================= */}
      <section className="section surface">

        <div className="section-heading center">

          <p className="eyebrow center">
            On the Ground
          </p>

          <h2>
            Infrastructure and road connections
          </h2>

        </div>

        <div className="hj-amenities">
          {hinjewadiAmenities.map((item, i) => (
            <div className="hj-card" key={i}>
              <span className="hj-icon">{item.icon}</span>
              <span className="hj-value">{item.value}</span>
              <span className="hj-label">{item.label}</span>
            </div>
          ))}
        </div>

        <div className="hj-roads">

          <h4 className="hj-card-title">
            Major Road Connections
          </h4>

          <div className="hj-roads-row">

            <span className="hj-hub">
              📍 Hinjewadi
            </span>

            <span className="hj-hub-arrow">→</span>

            <ul className="hj-road-chips">
              {roadConnections.map((place, i) => (
                <li className="hj-road-chip" key={i}>
                  {place}
                </li>
              ))}
            </ul>

          </div>

        </div>

      </section>

      {/* ================= HINJEWADI — KEY POINTS FOR ROAD INDIA ================= */}
      <section className="section">

        <div className="section-heading center">

          <p className="eyebrow center">
            Why It Matters
          </p>

          <h2>
            Key points for the Road India project
          </h2>

        </div>

        <div className="hj-points">
          {roadIndiaPoints.map((point, i) => (
            <div className="hj-point" key={i}>

              <span className="hj-point-num">
                {point.num}
              </span>

              <h4>{point.title}</h4>

              <p>{point.text}</p>

              {point.tags && (
                <div className="hj-tags">
                  {point.tags.map((tag, j) => (
                    <span className="hj-tag" key={j}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}

            </div>
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