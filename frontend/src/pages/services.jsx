import React, { useState } from "react";
import "./services.css";
import bannerImage from "../assets/banner.png";

/* ================= REALISTIC LINE ICONS (no emoji) ================= */
const Icon = {
  Report: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 11v2a2 2 0 002 2h1l2 5h2l-1-5h6l5 3V6l-5 3H8L6 9H5a2 2 0 00-2 2z" />
    </svg>
  ),
  Track: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  ),
  Map: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 21s7-6.5 7-11a7 7 0 10-14 0c0 4.5 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.4" />
    </svg>
  ),
  Field: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="9" width="18" height="11" rx="2" />
      <path d="M8 9V6a4 4 0 018 0v3" />
    </svg>
  ),
  Admin: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" />
      <path d="M9.5 12l1.8 1.8L15 10" />
    </svg>
  ),
  Analytics: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </svg>
  ),
  Arrow: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  ),
  Shield: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" />
    </svg>
  ),
  Layers: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3l9 5-9 5-9-5 9-5z" />
      <path d="M3 13l9 5 9-5" />
    </svg>
  ),
  Alert: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3l10 18H2z" />
      <path d="M12 10v4M12 17h.01" />
    </svg>
  ),
  Check: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
      <path d="M5 13l4 4L19 7" />
    </svg>
  ),
};

const coreServices = [
  {
    num: "01",
    icon: Icon.Report,
    title: "Report & Register Issues",
    summary: "Report road and public infrastructure issues via website, mobile, or QR code.",
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
    icon: Icon.Track,
    title: "Complaint Tracking Service",
    summary: "Track any complaint end-to-end using its complaint number.",
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
    icon: Icon.Map,
    title: "Location & Map Service",
    summary: "Every issue is pinned precisely — with priority-coded map markers.",
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
    icon: Icon.Field,
    title: "Field Staff Service",
    summary: "Tools for field officers to inspect, act on, and close assigned complaints.",
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
    icon: Icon.Admin,
    title: "Admin & Complaint Management",
    summary: "Centralized oversight of every complaint, staff member, and category.",
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
    icon: Icon.Analytics,
    title: "Reports, Notifications & Analytics",
    summary: "Stay informed at every step, and analyze trends across the system.",
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
  { color: "red", label: "Critical / Urgent", icon: Icon.Alert },
  { color: "orange", label: "Action Required", icon: Icon.Shield },
  { color: "amber", label: "Inspection Required", icon: Icon.Track },
  { color: "green", label: "Resolved", icon: Icon.Check },
];

/* card accent cycles through these 6 tones, matching each service in order */
const accentTones = ["blue", "green", "purple", "orange", "teal", "pink"];

const Services = () => {
  const [activeService, setActiveService] = useState(0);

  return (




    <main className="services-page">













      {/* ================= PAGE HERO (medium banner, real photo) ================= */}
      <section
        className="page-hero"
        id="home"
        style={{ backgroundImage: `url(${bannerImage})` }}
      >

      </section>





      

      {/* ================= SERVICES GRID ================= */}
      <section className="section" id="services">
        <div className="section-heading">
          <p className="eyebrow">Core Services</p>
          <h2>Everything the platform does, organized into 6 services</h2>
        </div>

        <div className="services-grid">
          {coreServices.map((service, i) => {
            const ServiceIcon = service.icon;
            const tone = accentTones[i % accentTones.length];
            return (
              <button
                key={i}
                type="button"
                className={`service-card ${activeService === i ? "active" : ""}`}
                onClick={() => setActiveService(i)}
              >
                <div className="service-top">
                  <span className={`service-icon-badge tone-${tone}`}>
                    <ServiceIcon />
                  </span>
                  <span className="service-number">{service.num}</span>
                </div>
                <h4>{service.title}</h4>
                <p>{service.summary}</p>
                <div className="service-card-bottom">
                  <span className={`service-link tone-text-${tone}`}>
                    {activeService === i ? "Viewing details" : "View details"}
                  </span>
                  <span className={`service-arrow tone-${tone}`}>
                    <Icon.Arrow />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ================= ACTIVE SERVICE DETAIL ================= */}
      <section className="section surface">
        <div className="detail-shell">
          <div className="detail-heading">
            <span className="service-number lg">{coreServices[activeService].num}</span>
            <div>
              <p className="eyebrow">Service Detail</p>
              <h3>{coreServices[activeService].title}</h3>
            </div>
          </div>

          <div className="detail-grid">
            {coreServices[activeService].features.map((feat, i) => (
              <div className="feature-pill" key={i}>
                <span className="check">
                  <Icon.Check />
                </span>
                {feat}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= COMPLAINT LIFECYCLE (numbered process) ================= */}
      <section className="section" id="lifecycle">
        <div className="section-heading center">
          <p className="eyebrow center">Complaint Lifecycle</p>
          <h2>Every complaint follows the same transparent path</h2>
        </div>

        <div className="lifecycle-track">
          {lifecycleSteps.map((step, i) => (
            <React.Fragment key={i}>
              <div className={`lifecycle-step ${step.state}`}>
                <div className="lifecycle-dot">{i + 1}</div>
                <span>{step.label}</span>
              </div>
              {i < lifecycleSteps.length - 1 && <div className="lifecycle-connector"></div>}
            </React.Fragment>
          ))}
        </div>
      </section>

      {/* ================= MAP PRIORITY LEGEND (icon feature row) ================= */}
      <section className="section surface" id="map">
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
            {priorityLegend.map((item, i) => {
              const LegendIcon = item.icon;
              return (
                <div className="legend-card" key={i}>
                  <span className={`legend-icon-badge dot-${item.color}`}>
                    <LegendIcon />
                  </span>
                  {item.label}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= CTA ================= */}
      <section className="section cta-section" id="contact">
        <div className="cta-overlay"></div>
        <div className="cta-shell">
          <div>
            <h3>Ready to report an issue?</h3>
            <p>It takes less than two minutes — photo, location, and a few details.</p>
          </div>
          <button className="primary-btn" type="button">
            Report an Issue <Icon.Arrow />
          </button>
        </div>
      </section>
    </main>
  );
};

export default Services;