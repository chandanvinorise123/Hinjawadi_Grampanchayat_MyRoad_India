import React, { useEffect, useState } from "react";
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

  const [selectedCategory, setSelectedCategory] = useState(null);

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

  useEffect(() => {
    if (!selectedCategory) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setSelectedCategory(null);
    };
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [selectedCategory]);

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
          {issueCategories.map((category) => (
            <button
              key={category.num}
              type="button"
              className="category-card"
              onClick={() => setSelectedCategory(category)}
              aria-haspopup="dialog"
              aria-label={t("Select issues in {{category}}", {
                category: t(category.title),
                defaultValue: `Select issues in ${t(category.title)}`,
              })}
            >
              <div className="category-icon">{category.icon}</div>

              <h4>{t(category.title)}</h4>
            </button>
          ))}
        </div>
      </section>

      {selectedCategory && (
        <div
          className="category-issues-backdrop"
          role="presentation"
          onClick={() => setSelectedCategory(null)}
        >
          <section
            className="category-issues-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="category-issues-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="category-issues-header">
              <div>
                <p className="eyebrow">{t("Select an issue")}</p>
                <h2 id="category-issues-title">
                  {t(selectedCategory.title)}
                </h2>
              </div>
              <button
                className="category-issues-close"
                type="button"
                aria-label={t("Close")}
                onClick={() => setSelectedCategory(null)}
                autoFocus
              >
                ×
              </button>
            </header>

            <div className="category-issues-list">
              {selectedCategory.issues.map((issue) => (
                <button
                  className="category-issue-option"
                  key={issue}
                  type="button"
                  onClick={() =>
                    navigate(REPORT_ROUTE, { state: { issueType: issue } })
                  }
                >
                  {t(issue)}
                  <span aria-hidden="true">→</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
    </main>
  );
};

export default IssueCategory;