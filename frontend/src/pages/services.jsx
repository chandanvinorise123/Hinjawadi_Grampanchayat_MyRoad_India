import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import "./services.css";
const REPORT_ROUTE = "/reportissue";

import bannerImageEn from "../assets/se.png";
import bannerImageHi from "../assets/se-hi.png";
import bannerImageMr from "../assets/se-mr.png";

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

// Translation keys for core services
const coreServices = [
  {
    num: "01",
    icon: icons.report,
    titleKey: "services.items.report.title",
    summaryKey: "services.items.report.summary",
    featureKeys: [
      "services.items.report.features.category",
      "services.items.report.features.description",
      "services.items.report.features.photos",
      "services.items.report.features.gps",
      "services.items.report.features.number",
      "services.items.report.features.qr",
      "services.items.report.features.mobile",
    ],
  },
  {
    num: "02",
    icon: icons.track,
    titleKey: "services.items.track.title",
    summaryKey: "services.items.track.summary",
    featureKeys: [
      "services.items.track.features.number",
      "services.items.track.features.status",
      "services.items.track.features.history",
      "services.items.track.features.all",
      "services.items.track.features.notifications",
      "services.items.track.features.lifecycle",
    ],
  },
  {
    num: "03",
    icon: icons.map,
    titleKey: "services.items.map.title",
    summaryKey: "services.items.map.summary",
    featureKeys: [
      "services.items.map.features.gps",
      "services.items.map.features.coordinates",
      "services.items.map.features.exact",
      "services.items.map.features.view",
      "services.items.map.features.identification",
      "services.items.map.features.criticality",
    ],
  },
  {
    num: "04",
    icon: icons.field,
    titleKey: "services.items.field.title",
    summaryKey: "services.items.field.summary",
    featureKeys: [
      "services.items.field.features.assigned",
      "services.items.field.features.location",
      "services.items.field.features.inspection",
      "services.items.field.features.photos",
      "services.items.field.features.action",
      "services.items.field.features.status",
      "services.items.field.features.records",
    ],
  },
  {
    num: "05",
    icon: icons.admin,
    titleKey: "services.items.admin.title",
    summaryKey: "services.items.admin.summary",
    featureKeys: [
      "services.items.admin.features.dashboard",
      "services.items.admin.features.total",
      "services.items.admin.features.verify",
      "services.items.admin.features.assign",
      "services.items.admin.features.priority",
      "services.items.admin.features.monitor",
      "services.items.admin.features.lifecycle",
    ],
  },
  {
    num: "06",
    icon: icons.analytics,
    titleKey: "services.items.analytics.title",
    summaryKey: "services.items.analytics.summary",
    featureKeys: [
      "services.items.analytics.features.registration",
      "services.items.analytics.features.assignment",
      "services.items.analytics.features.resolution",
      "services.items.analytics.features.periodic",
      "services.items.analytics.features.category",
      "services.items.analytics.features.priority",
      "services.items.analytics.features.analytics",
    ],
  },
];

// Complaint lifecycle translation keys
const lifecycleSteps = [
  { labelKey: "services.lifecycle.registered", state: "done" },
  { labelKey: "services.lifecycle.verified", state: "done" },
  { labelKey: "services.lifecycle.assigned", state: "done" },
  { labelKey: "services.lifecycle.action", state: "now" },
  { labelKey: "services.lifecycle.completed", state: "pend" },
  { labelKey: "services.lifecycle.closed", state: "pend" },
];

// Map priority legend translation keys
const priorityLegend = [
  { color: "red", labelKey: "services.priority.critical" },
  { color: "orange", labelKey: "services.priority.action" },
  { color: "amber", labelKey: "services.priority.inspection" },
  { color: "green", labelKey: "services.priority.resolved" },
];

const Services = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [activeService, setActiveService] = useState(0);

  // Detect the current language
  const currentLanguage = (
    i18n.resolvedLanguage || i18n.language || "en"
  ).split("-")[0];

  // Select the matching banner image
  const bannerImage =
    {
      en: bannerImageEn,
      hi: bannerImageHi,
      mr: bannerImageMr,
    }[currentLanguage] || bannerImageEn;

  const activeServiceData = coreServices[activeService];

  return (
    <main className="services-page">
      {/* ================= PAGE HERO ================= */}
      <section className="page-hero-section">
        <div
          className="page-hero"
          style={{ backgroundImage: `url("${bannerImage}")` }}
        >
          <div className="hero-scrim"></div>

          <div className="page-hero-inner">
            <h1 className="sr-only">
              {t("services.hero.title")}
            </h1>

            <p className="sr-only">
              {t("services.hero.description")}
            </p>
          </div>
        </div>
      </section>

      {/* ================= SERVICES GRID ================= */}
      <section className="section">
        <div className="section-heading">
          <p className="eyebrow">
            {t("services.coreServices")}
          </p>
        </div>

        <div className="services-grid">
          {coreServices.map((service, i) => (
            <button
              key={service.num}
              type="button"
              className={`service-card ${activeService === i ? "active" : ""
                }`}
              onClick={() => setActiveService(i)}
              aria-pressed={activeService === i}
            >
              <div className="service-icon">{service.icon}</div>
              <h4>{t(service.titleKey)}</h4>
              <p>{t(service.summaryKey)}</p>
            </button>
          ))}
        </div>
      </section>

      {/* ================= ACTIVE SERVICE DETAIL ================= */}
      <section className="section surface">
        <div className="detail-shell">
          <div className="detail-heading">
            <span className="service-number lg">
              {activeServiceData.num}
            </span>

            <div>
              <p className="eyebrow">
                {t("services.serviceDetail")}
              </p>
              <h3>{t(activeServiceData.titleKey)}</h3>
            </div>
          </div>

          <div className="detail-grid">
            {activeServiceData.featureKeys.map((featureKey, i) => (
              <div className="feature-pill" key={i}>
                <span className="check">✓</span>
                {t(featureKey)}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= COMPLAINT LIFECYCLE ================= */}
      <section className="section">
        <div className="section-heading center">
          <p className="eyebrow center">
            {t("services.lifecycle.title")}
          </p>
          <h2>{t("services.lifecycle.description")}</h2>
        </div>

        <div className="lifecycle-track">
          {lifecycleSteps.map((step, i) => (
            <div
              className={`lifecycle-step ${step.state}`}
              key={i}
            >
              <div className="lifecycle-dot"></div>
              <span>{t(step.labelKey)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ================= MAP PRIORITY LEGEND ================= */}
      <section className="section surface">
        <div className="legend-shell">
          <div>
            <p className="eyebrow">
              {t("services.mapPriority.title")}
            </p>
            <h3>{t("services.mapPriority.heading")}</h3>
            <p className="hero-lead-dark">
              {t("services.mapPriority.description")}
            </p>
          </div>

          <div className="legend-grid">
            {priorityLegend.map((item, i) => (
              <div className="legend-card" key={i}>
                <span
                  className={`legend-dot dot-${item.color}`}
                ></span>
                {t(item.labelKey)}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= CTA ================= */}
      <section className="section cta-section">
        <div className="cta-shell">
          <div>
            <h3>{t("services.cta.title")}</h3>
            <p>{t("services.cta.description")}</p>
          </div>

          <button
            className="primary-btn"
            type="button"
            onClick={() => navigate(REPORT_ROUTE)}
          >
            {t("services.cta.button")} <span>→</span>
          </button>
        </div>
      </section>
    </main>
  );
};

export default Services;