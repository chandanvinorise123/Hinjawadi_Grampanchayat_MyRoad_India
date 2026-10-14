import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import "./helpfaq.css";
const CONTACT_ROUTE = "/contactus";
// import bannerImage from "../assets/hf.png";
import bannerImageEn from "../assets/hf.png";
import bannerImageHi from "../assets/hf-hi.png";
import bannerImageMr from "../assets/hf-mr.jpeg"

const faqCategories = [
  {
    key: "reportIssue",
    icon: "📝",
    questions: [
      { key: "reportRoadIssue" },
      { key: "reportWithoutAccount" },
      { key: "reportDetails" },
      { key: "multipleIssues" },
    ],
  },
  {
    key: "trackComplaint",
    icon: "🔍",
    questions: [
      { key: "trackStatus" },
      { key: "complaintStatuses" },
      { key: "statusNotifications" },
      { key: "viewComplaints" },
    ],
  },
  {
    key: "mobileApp",
    icon: "📱",
    questions: [
      { key: "mobileAvailability" },
      { key: "scanQrCode" },
      { key: "offlineAccess" },
      { key: "fieldStaffUpdates" },
    ],
  },
];

const citizenGuidance = [
  {
    num: "01",
    icon: "📝",
    key: "reportIssue",
  },
  {
    num: "02",
    icon: "📊",
    key: "complaintStatus",
  },
  {
    num: "03",
    icon: "📍",
    key: "locationPhoto",
  },
  {
    num: "04",
    icon: "🔢",
    key: "complaintNumber",
  },
];

const HelpFaq = () => {
const { t, i18n } = useTranslation();
const navigate = useNavigate();

const currentLanguage = (
  i18n.resolvedLanguage || i18n.language || "en"
).split("-")[0];

const bannerImage =
  {
    en: bannerImageEn,
    hi: bannerImageHi,
    mr: bannerImageMr,
  }[currentLanguage] || bannerImageEn;

  const [activeCategory, setActiveCategory] = useState(0);
  const [openIndex, setOpenIndex] = useState(0);

  const handleCategorySelect = (index) => {
    setActiveCategory(index);
    setOpenIndex(0);
  };

  const toggleQuestion = (index) => {
    setOpenIndex((currentIndex) =>
      currentIndex === index ? -1 : index
    );
  };

  return (
    <main className="help-page">
      {/* ================= PAGE HERO ================= */}
      <section className="page-hero-section">
        <div
          className="page-hero"
          style={{
            backgroundImage: `url("${bannerImage}")`,
          }}
        >
          <div className="hero-scrim"></div>

          <div className="page-hero-inner">
            {/* Existing hero content remains hidden */}
          </div>
        </div>
      </section>

      {/* ================= FAQ CATEGORIES ================= */}
      <section className="section">
        <div className="section-heading center">
          <p className="eyebrow center">
            {t("helpFaq.faqHeading")}
          </p>
          <h2>{t("helpFaq.browseByTopic")}</h2>
        </div>

        <div className="faq-tabs">
          {faqCategories.map((category, i) => (
            <button
              key={category.key}
              type="button"
              className={`faq-tab ${
                activeCategory === i ? "active" : ""
              }`}
              onClick={() => handleCategorySelect(i)}
            >
              <span className="faq-tab-icon">
                {category.icon}
              </span>
              {t(`helpFaq.categories.${category.key}`)}
            </button>
          ))}
        </div>

        <div className="faq-accordion">
          {faqCategories[activeCategory].questions.map(
            (item, i) => (
              <div
                className={`faq-item ${
                  openIndex === i ? "open" : ""
                }`}
                key={item.key}
              >
                <button
                  type="button"
                  className="faq-question"
                  onClick={() => toggleQuestion(i)}
                  aria-expanded={openIndex === i}
                >
                  {t(`helpFaq.questions.${item.key}.question`)}

                  <span className="faq-toggle">
                    {openIndex === i ? "−" : "+"}
                  </span>
                </button>

                {openIndex === i && (
                  <p className="faq-answer">
                    {t(`helpFaq.questions.${item.key}.answer`)}
                  </p>
                )}
              </div>
            )
          )}
        </div>
      </section>

      {/* ================= CITIZEN GUIDANCE ================= */}
      <section className="section surface">
        <div className="section-heading">
          <p className="eyebrow">
            {t("helpFaq.citizenGuidance")}
          </p>
          <h2>{t("helpFaq.quickReference")}</h2>
        </div>

        <div className="guidance-grid">
          {citizenGuidance.map((item) => (
            <div className="guidance-card" key={item.key}>
              <div className="guidance-top">
                <span className="guidance-number">
                  {item.num}
                </span>

                <span className="guidance-icon">
                  {item.icon}
                </span>
              </div>

              <h4>
                {t(`helpFaq.guidance.${item.key}.title`)}
              </h4>

              <p>
                {t(`helpFaq.guidance.${item.key}.summary`)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ================= STILL NEED HELP / CONTACT ================= */}
      <section className="section cta-section">
        <div className="cta-shell">
          <div>
            <h3>{t("helpFaq.stillNeedHelp")}</h3>
            <p>{t("helpFaq.supportDescription")}</p>
          </div>

          <button
            className="primary-btn"
            type="button"
            onClick={() => navigate(CONTACT_ROUTE)}
          >
            {t("helpFaq.contactUs")} <span>→</span>
          </button>
        </div>
      </section>
    </main>
  );
};

export default HelpFaq;