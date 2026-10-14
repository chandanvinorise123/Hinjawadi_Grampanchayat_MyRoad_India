import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import "./issuecategory.css";
const REPORT_ROUTE = "/reportissue";

// Language-specific banner images
import bannerImageEn from "../assets/ic.png";
import bannerImageHi from "../assets/ic-hi.png";
import bannerImageMr from "../assets/ic-mr.jpeg";

// Realistic full-colour icons (emoji style)
const Emoji = ({ symbol }) => (
  <span className="emoji-icon" role="img" aria-hidden="true">
    {symbol}
  </span>
);

const icons = {
  road: <Emoji symbol="🛣️" />,
  drain: <Emoji symbol="🕳️" />,
  water: <Emoji symbol="🚰" />,
  light: <Emoji symbol="💡" />,
  safety: <Emoji symbol="⚠️" />,
  bridge: <Emoji symbol="🌉" />,
};

const issueCategories = [
  {
    num: "01",
    icon: icons.road,
    title: "Road Issues",
    summary: "Potholes, cracks, and other problems affecting road surfaces.",
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
    num: "02",
    icon: icons.drain,
    title: "Sewerage & Drain Issues",
    summary: "Blocked drains, sewage overflow, and related infrastructure faults.",
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
    num: "03",
    icon: icons.water,
    title: "Drinking Water Issues",
    summary: "Supply, quality, and pipeline issues affecting drinking water access.",
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
    num: "04",
    icon: icons.light,
    title: "Streetlight Issues",
    summary: "Non-functional or damaged streetlights and related electrical faults.",
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
    num: "05",
    icon: icons.safety,
    title: "Road Safety Issues",
    summary: "Signage, markings, and safety hazards along roads.",
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
    num: "06",
    icon: icons.bridge,
    title: "Bridge & Culvert Issues",
    summary: "Structural and drainage issues affecting bridges and culverts.",
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

const IssueCategory = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [activeCategory, setActiveCategory] = useState(0);
  const [activeIssue, setActiveIssue] = useState(0);

  // Detect the currently selected language
  const currentLanguage = (
    i18n.resolvedLanguage || i18n.language || "en"
  ).split("-")[0];

  // Select the corresponding banner
  const bannerImage =
    {
      en: bannerImageEn,
      hi: bannerImageHi,
      mr: bannerImageMr,
    }[currentLanguage] || bannerImageEn;

  const handleCategorySelect = (index) => {
    setActiveCategory(index);
    setActiveIssue(0);
  };

  const currentCategory = issueCategories[activeCategory];
  const currentIssue = currentCategory.issues[activeIssue];

  return (
    <main className="issue-category-page">
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
            {/* Hidden SEO content */}
            <h1 className="sr-only">
              {t("Select a category to report your issue")}
            </h1>

            <p className="sr-only">
              {t(
                "Choose the category that best matches the problem, then pick the specific issue to see guidance before you submit your report."
              )}
            </p>
          </div>
        </div>
      </section>

      {/* ================= CATEGORY GRID ================= */}
      <section className="section">
        <div className="section-heading">
          <p className="eyebrow">{t("Step 1")}</p>
          <h2>{t("Select the main issue category")}</h2>
        </div>

        <div className="category-grid">
          {issueCategories.map((category, i) => (
            <button
              key={i}
              type="button"
              className={`category-card ${
                activeCategory === i ? "active" : ""
              }`}
              onClick={() => handleCategorySelect(i)}
              aria-pressed={activeCategory === i}
            >
              <div className="category-icon">{category.icon}</div>

              <h4>{t(category.title)}</h4>

              <p>{t(category.summary)}</p>
            </button>
          ))}
        </div>
      </section>

      {/* ================= SUB-ISSUE SELECTION ================= */}
      <section className="section surface">
        <div className="detail-shell">
          <div className="detail-heading">
            <span className="category-number lg">
              {currentCategory.num}
            </span>

            <div>
              <p className="eyebrow">{t("Step 2")}</p>
              <h3>
                {t("Select a specific issue in {{category}}", {
                  category: t(currentCategory.title),
                })}
              </h3>
            </div>
          </div>

          <div className="issue-chip-grid">
            {currentCategory.issues.map((issue, i) => (
              <button
                key={i}
                type="button"
                className={`issue-chip ${
                  activeIssue === i ? "active" : ""
                }`}
                onClick={() => setActiveIssue(i)}
                aria-pressed={activeIssue === i}
              >
                <span className="check">
                  {activeIssue === i ? "✓" : ""}
                </span>
                {t(issue)}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ================= ISSUE INFORMATION ================= */}
      <section className="section">
        <div className="section-heading">
          <p className="eyebrow">{t("Step 3")}</p>
          <h2>{t("Issue information")}</h2>
        </div>

        <div className="info-shell">
          <div className="info-card">
            <span className="info-label">{t("Issue Name")}</span>
            <h3>{t(currentIssue)}</h3>
          </div>

          <div className="info-card">
            <span className="info-label">{t("Issue Description")}</span>
            <p>
              {t(
                'Provide a short description of the "{{issue}}" problem — what you observed, its extent, and how long it has persisted.',
                { issue: t(currentIssue) }
              )}
            </p>
          </div>

          <div className="info-card">
            <span className="info-label">{t("Related Guidance")}</span>
            <ul className="guidance-list">
              <li>
                {t("Add clear photographs from more than one angle")}
              </li>
              <li>{t("Capture GPS location at the exact site")}</li>
              <li>
                {t("Mention nearby landmarks for easier identification")}
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ================= CTA ================= */}
      <section className="section cta-section">
        <div className="cta-shell">
          <div>
            <h3>
              {t('Ready to report "{{issue}}"?', {
                issue: t(currentIssue),
              })}
            </h3>

            <p>
              {t(
                "Confirm the category and issue, then continue to submit your report."
              )}
            </p>
          </div>

          <button
            className="primary-btn"
            type="button"
            onClick={() => navigate(REPORT_ROUTE)}
          >
            {t("Continue to Report")} <span>→</span>
          </button>
        </div>
      </section>
    </main>
  );
};

export default IssueCategory;