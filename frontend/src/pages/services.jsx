import React, { useState } from "react";
import "./services.css";
import bannerImage from "../assets/se.png";

// Realistic full-colour icons (emoji style)
const Emoji = ({ symbol }) => (
  <span className="emoji-icon" role="img" aria-hidden="true">
    {symbol}
  </span>
);

const icons = {
  report: <Emoji symbol="📍" />,
  track: <Emoji symbol="🔍" />,
  map: <Emoji symbol="🗺️" />,
  field: <Emoji symbol="👷" />,
  admin: <Emoji symbol="🛡️" />,
  analytics: <Emoji symbol="📊" />,
};

const coreServices = [
  {
    num: "01",
    icon: icons.report,
    title: "Report & Register Issues",
    summary:
      "Report road and public infrastructure issues through the online portal.",
    features: [
      "Select issue category",
      "Add issue description",
      "Upload photographs",
      "Capture GPS location",
      "Generate complaint number",
      "QR-code-based registration",
      "Mobile-based registration",
    ],
  },
  {
    num: "02",
    icon: icons.track,
    title: "Complaint Tracking Service",
    summary:
      "Track any complaint end-to-end using its complaint number.",
    features: [
      "Track using complaint number",
      "View complaint status",
      "View complaint history",
      "View all registered complaints",
      "Receive status update notifications",
      "Follow complete complaint lifecycle",
    ],
  },
  {
    num: "03",
    icon: icons.map,
    title: "Location & Map Service",
    summary:
      "Every issue is pinned precisely — with priority-coded map markers.",
    features: [
      "Automatic GPS location capture",
      "Latitude & longitude recording",
      "Exact issue location on map",
      "View reported issues on map",
      "Category/location-based identification",
      "Criticality-based map indicators",
    ],
  },
  {
    num: "04",
    icon: icons.field,
    title: "Field Staff Service",
    summary:
      "Tools for field officers to inspect, act on, and close assigned complaints.",
    features: [
      "View assigned complaints",
      "View complaint location",
      "Conduct physical inspection",
      "Upload site photographs",
      "Record action taken",
      "Update work status & remarks",
      "Maintain before/after repair records",
    ],
  },
  {
    num: "05",
    icon: icons.admin,
    title: "Admin & Complaint Management",
    summary:
      "Manage and resolve complaints, users and system settings.",
    features: [
      "Centralized administrative dashboard",
      "View total, new & pending complaints",
      "Verify complaints",
      "Assign complaints to staff",
      "Set complaint priority",
      "Monitor progress by category/location",
      "Manage complete complaint lifecycle",
    ],
  },
  {
    num: "06",
    icon: icons.analytics,
    title: "Reports, Notifications & Analytics",
    summary:
      "Get insights through reports, alerts and real-time analytics.",
    features: [
      "Registration & verification notifications",
      "Assignment & action-started alerts",
      "Work-completed & resolution alerts",
      "Daily, weekly & monthly reports",
      "Category-wise & area-wise reports",
      "Priority-wise & action-taken reports",
      "Infrastructure issue analytics",
    ],
  },
];

const lifecycleSteps = [
  { label: "Registered", state: "done" },
  { label: "Verified", state: "done" },
  { label: "Assigned", state: "done" },
  { label: "Action", state: "now" },
  { label: "Completed", state: "pend" },
  { label: "Closed", state: "pend" },
];

const priorityLegend = [
  { color: "red", label: "Critical / Urgent" },
  { color: "orange", label: "Action Required" },
  { color: "amber", label: "Inspection Required" },
  { color: "green", label: "Resolved" },
];

const Services = () => {
  const [activeService, setActiveService] = useState(0);

  return (
    <main className="services-page">
      {/* ================= PAGE HERO — Bright Banner ================= */}

  <section className="page-hero-section">
  <div
    className="page-hero"
    style={{ backgroundImage: `url("${bannerImage}")` }}
  >
    <div className="hero-scrim"></div>
  

    <div className="page-hero-inner">
      {/*
      <div className="breadcrumb">
        Home / <b>Services</b>
      </div>
      */}

      


      {/* Hidden text for SEO — banner image already has the heading */}
      <h1 className="sr-only">Our Services</h1>

      <p className="sr-only">
        Citizen-centric services for safer, smarter and better roads in India.
      </p>
    </div>
  </div>
</section>









      {/* ================= SERVICES GRID ================= */}
      <section className="section">
        <div className="section-heading">
          <p className="eyebrow">Core Services</p>
          {/* <h2>
            Everything the platform does, organized into 6 services
          </h2> */}
        </div>

        <div className="services-grid">
          {coreServices.map((service, i) => (
            <button
              key={service.num}
              type="button"
              className={`service-card ${
                activeService === i ? "active" : ""
              }`}
              onClick={() => setActiveService(i)}
              aria-pressed={activeService === i}
            >
              {/* Icon */}
              <div className="service-icon">{service.icon}</div>

              {/* Title */}
              <h4>{service.title}</h4>

              {/* Description */}
              <p>{service.summary}</p>
            </button>
          ))}
        </div>
      </section>

      {/* ================= ACTIVE SERVICE DETAIL ================= */}
      <section className="section surface">
        <div className="detail-shell">
          <div className="detail-heading">
            <span className="service-number lg">
              {coreServices[activeService].num}
            </span>

            <div>
              <p className="eyebrow">Service Detail</p>
              <h3>{coreServices[activeService].title}</h3>
            </div>
          </div>

          <div className="detail-grid">
            {coreServices[activeService].features.map((feat, i) => (
              <div className="feature-pill" key={i}>
                <span className="check">✓</span>
                {feat}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= COMPLAINT LIFECYCLE ================= */}
      <section className="section">
        <div className="section-heading center">
          <p className="eyebrow center">Complaint Lifecycle</p>
          <h2>Every complaint follows the same transparent path</h2>
        </div>

        <div className="lifecycle-track">
          {lifecycleSteps.map((step, i) => (
            <div className={`lifecycle-step ${step.state}`} key={i}>
              <div className="lifecycle-dot"></div>
              <span>{step.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ================= MAP PRIORITY LEGEND ================= */}
      <section className="section surface">
        <div className="legend-shell">
          <div>
            <p className="eyebrow">Location & Map Service</p>
            <h3>Priority-coded map markers</h3>
            <p className="hero-lead-dark">
              Every issue on the public map is color-coded by urgency, so
              citizens and staff can see what needs attention first.
            </p>
          </div>

          <div className="legend-grid">
            {priorityLegend.map((item, i) => (
              <div className="legend-card" key={i}>
                <span className={`legend-dot dot-${item.color}`}></span>
                {item.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= CTA ================= */}
      <section className="section cta-section">
        <div className="cta-shell">
          <div>
            <h3>Ready to report an issue?</h3>
            <p>
              It takes less than two minutes — photo, location, and a few details.
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

export default Services;