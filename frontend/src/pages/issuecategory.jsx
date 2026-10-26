import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import "./issuecategory.css";
const REPORT_ROUTE = "/reportissue";

// Language-specific banner images
import bannerImageEn from "../assets/ic.png";
import bannerImageHi from "../assets/ic-hi.png";
import bannerImageMr from "../assets/ic-mr.jpeg";

const CategoryIcon = ({ name }) => {
  const artwork = {
    road: (
      <>
        <path d="m6 21 3.2-18h5.6L18 21" />
        <path d="M12 5v3m0 4v3m0 4v2" />
        <path d="M4 21h16" />
      </>
    ),
    drain: (
      <>
        <path d="M3 7h18M5 7v12m14-12v12M5 19h14" />
        <path d="M8 10v6m4-6v6m4-6v6" />
        <path d="M3 4h18" />
      </>
    ),
    water: (
      <>
        <path d="M12 3s-6 7-6 11a6 6 0 0 0 12 0c0-4-6-11-6-11Z" />
        <path d="M9 15a3 3 0 0 0 3 3" />
      </>
    ),
    light: (
      <>
        <path d="M9 18h6m-5 3h4" />
        <path d="M8.5 14.5A7 7 0 1 1 15.5 14.5c-.8.7-1.2 1.5-1.4 2.5h-4.2c-.2-1-.6-1.8-1.4-2.5Z" />
        <path d="M12 1v2m9 9h-2M5 12H3m15.4-6.4L17 7M7 7 5.6 5.6" />
      </>
    ),
    safety: (
      <>
        <path d="m12 22 1.8-.8A11 11 0 0 0 20 11V5l-8-3-8 3v6a11 11 0 0 0 6.2 10.2L12 22Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    bridge: (
      <>
        <path d="M3 19h18M4 19v-5m16 5v-5M3 14h18" />
        <path d="M4 14a8 8 0 0 1 16 0M8 14v5m8-5v5" />
        <path d="M2 21h20" />
      </>
    ),
  }[name];

  return (
    <svg
      className="category-icon-svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {artwork}
    </svg>
  );
};

const icons = {
  road: <CategoryIcon name="road" />,
  drain: <CategoryIcon name="drain" />,
  water: <CategoryIcon name="water" />,
  light: <CategoryIcon name="light" />,
  safety: <CategoryIcon name="safety" />,
  bridge: <CategoryIcon name="bridge" />,
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
        <div className="section-heading center">
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