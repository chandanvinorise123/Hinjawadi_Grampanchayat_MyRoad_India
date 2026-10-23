
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import "./contactus.css";
import { API_BASE_URL } from "../utils/dashboardApi";
// import bannerImage from "../assets/cu.png";
import bannerImageEn from "../assets/cu.png";
import bannerImageHi from "../assets/cu-hi.png";
import bannerImageMr from "../assets/cu-mr.jpeg";

// Office details
const OFFICE_ADDRESS_LINES = [
  "Shri Chhatrapati Shivaji Maharaj Chowk,",
  "Hinjawadi, Taluka-Mulshi,",
  "District Pune – 411057",
];

const OFFICE_ADDRESS_TEXT = OFFICE_ADDRESS_LINES.join(" ");
const OFFICE_PHONE = "9834206559";
const OFFICE_EMAIL = "grampanchayat.hinjawadi@gmail.com";

const MAP_QUERY =
  "Shri Chhatrapati Shivaji Maharaj Chowk, Hinjawadi, Taluka Mulshi, Pune, Maharashtra 411057";

const MAP_EMBED_URL = `https://www.google.com/maps?q=${encodeURIComponent(
  MAP_QUERY
)}&output=embed`;

// Issue options use stable values so changing language
// does not change the value stored in the form.
const issueOptions = [
  { value: "pothole", label: "Pothole / Road Damage" },
  { value: "safety", label: "Road Safety Concern" },
  { value: "waterlogging", label: "Waterlogging / Drainage" },
  { value: "streetlight", label: "Street Light Issue" },
  { value: "maintenance", label: "Road Maintenance Request" },
  { value: "tracking", label: "Complaint Status / Tracking" },
  { value: "project", label: "Road Project Information" },
  { value: "gis", label: "GIS Mapping / Map Data Query" },
  { value: "technical", label: "Website / Technical Support" },
  { value: "other", label: "Other" },
];

const initialForm = {
  name: "",
  email: "",
  mobile: "",
  subject: "",
  message: "",
};

const ContactUs = () => {
const { t, i18n } = useTranslation();

const currentLanguage = (
  i18n.resolvedLanguage || i18n.language || "en"
).split("-")[0];

const bannerImage =
  {
    en: bannerImageEn,
    hi: bannerImageHi,
    mr: bannerImageMr,
  }[currentLanguage] || bannerImageEn;
  
  const [formData, setFormData] = useState(initialForm);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError("");

    try {
      const response = await fetch(`${API_BASE_URL}/contact-messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to send your message.");
      }
      setSubmitted(true);
    } catch (error) {
      console.error("Contact form submission error:", error);
      setSubmitError(error.message || "Unable to send your message. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const contactCards = [
    {
      icon: "📍",
      label: t("contact.officeAddress"),
      value: OFFICE_ADDRESS_TEXT,
      wide: true,
    },
    {
      icon: "📞",
      label: t("contact.phoneNumber"),
      value: OFFICE_PHONE,
      href: `tel:${OFFICE_PHONE}`,
    },
    {
      icon: "✉️",
      label: t("contact.emailAddress"),
      value: OFFICE_EMAIL,
      href: `mailto:${OFFICE_EMAIL}`,
    },
  ];

  return (
    <main className="contact-page">
      {/* ================= PAGE HERO ================= */}
      <section className="page-hero-section">
        <div
          className="page-hero"
          id="home"
          style={{
            backgroundImage: `url("${bannerImage}")`,
          }}
        >
          <div className="hero-scrim"></div>

          <div className="page-hero-inner">
            <div className="hero-cta-row"></div>
          </div>
        </div>
      </section>

      {/* ================= GET IN TOUCH + CONTACT FORM ================= */}
      <section className="section surface">
        <div className="touch-layout">
          {/* ---------- Left: Get in Touch ---------- */}
          <div className="touch-left">
            <div className="section-heading">
              <span className="heading-bar"></span>

              <h2>{t("contact.getInTouch")}</h2>

              <p className="section-sub">
                {t("contact.supportDescription")}
              </p>
            </div>

            <div className="contact-info-grid">
              {contactCards.map((item, i) => (
                <div
                  className={`contact-info-card${item.wide ? " wide" : ""}`}
                  key={i}
                >
                  <span className="contact-info-icon">{item.icon}</span>

                  <div className="contact-info-body">
                    <span className="contact-label">{item.label}</span>

                    {item.href ? (
                      <a className="contact-value" href={item.href}>
                        {item.value}
                      </a>
                    ) : (
                      <p className="contact-value">{item.value}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ---------- Right: Send Us a Message ---------- */}
          <div className="touch-right" id="contact-form">
            <div className="form-shell">
              {submitted ? (
                <div className="response-card">
                  <span className="response-icon">✓</span>

                  <h3>{t("contact.responseHelp")}</h3>

                  <p>{t("contact.thankYou")}</p>

                  <button
                    className="secondary-btn"
                    type="button"
                    onClick={() => {
                      setSubmitted(false);
                      setFormData(initialForm);
                    }}
                  >
                    {t("contact.sendAnother")}
                  </button>
                </div>
              ) : (
                <>
                  <h2 className="form-title">
                    {t("contact.sendMessage")}
                  </h2>

                  <p className="form-sub">
                    {t("contact.formDescription")}
                  </p>

                  <form className="contact-form" onSubmit={handleSubmit}>
                    {/* Full Name */}
                    <div className="form-field">
                      <label htmlFor="name">
                        {t("contact.fullName")} *
                      </label>

                      <input
                        id="name"
                        name="name"
                        type="text"
                        placeholder={t("contact.namePlaceholder")}
                        value={formData.name}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    {/* Email */}
                    <div className="form-field">
                      <label htmlFor="email">
                        {t("contact.email")} *
                      </label>

                      <input
                        id="email"
                        name="email"
                        type="email"
                        placeholder={t("contact.emailPlaceholder")}
                        value={formData.email}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    {/* Mobile */}
                    <div className="form-field">
                      <label htmlFor="mobile">
                        {t("contact.mobile")} *
                      </label>

                      <input
                        id="mobile"
                        name="mobile"
                        type="tel"
                        placeholder={t("contact.mobilePlaceholder")}
                        value={formData.mobile}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    {/* Issue */}
                    <div className="form-field">
                      <label htmlFor="subject">
                        {t("contact.issue")} *
                      </label>

                      <select
                        id="subject"
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        required
                      >
                        <option value="">
                          {t("contact.selectIssue")}
                        </option>

                        {issueOptions.map((opt) => (
                          <option value={opt.value} key={opt.value}>
                            {t(`contact.issues.${opt.value}`, {
                              defaultValue: opt.label,
                            })}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Message */}
                    <div className="form-field">
                      <label htmlFor="message">
                        {t("contact.message")} *
                      </label>

                      <textarea
                        id="message"
                        name="message"
                        rows="5"
                        placeholder={t("contact.messagePlaceholder")}
                        value={formData.message}
                        onChange={handleChange}
                        required
                      ></textarea>
                    </div>

                    {/* Submit */}
                    {submitError && (
                      <p className="contact-submit-error" role="alert">
                        {submitError}
                      </p>
                    )}
                    <button
                      className="primary-btn submit-btn"
                      type="submit"
                      disabled={submitting}
                    >
                      {submitting ? "Sending..." : t("contact.submit")}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ================= MAP + OFFICE LOCATION ================= */}
      <section className="section surface map-section" id="location-map">
        <div className="map-layout">
          <div className="map-frame">
            <iframe
              title={t("contact.mapTitle")}
              src={MAP_EMBED_URL}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            ></iframe>
          </div>

          <div className="office-card">
            {/* Office address */}
            <div className="office-block">
              <span className="office-icon">📍</span>

              <div>
                <h3>{t("contact.officeLocation")}</h3>

                {OFFICE_ADDRESS_LINES.map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </div>

            <div className="office-divider"></div>

            {/* Working hours */}
            <div className="office-block">
              <span className="office-icon">🕘</span>

              <div>
                <h3>{t("contact.workingHours")}</h3>

                <p>{t("contact.workingDays")}</p>

                <p>{t("contact.governmentHolidays")}</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default ContactUs;
