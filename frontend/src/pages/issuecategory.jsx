import React, { useState } from "react";
import "./issuecategory.css";
import bannerImage from "../assets/ic.png";

// Refined line icons (deep burgundy via currentColor) — consistent 24px set
const Svg = ({ children }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

const icons = {
  road: (
    <Svg>
      <path d="M8 3 5 21M16 3l3 18M12 4v3M12 10.5v3M12 17v3" />
    </Svg>
  ),
  drain: (
    <Svg>
      <rect x="3.5" y="5" width="17" height="14" rx="2" />
      <path d="M8 5v14M12 5v14M16 5v14" />
    </Svg>
  ),
  water: (
    <Svg>
      <path d="M12 3.5s6 6.2 6 10.5a6 6 0 0 1-12 0c0-4.3 6-10.5 6-10.5z" />
      <path d="M9.5 14.5a2.7 2.7 0 0 0 2.5 2" />
    </Svg>
  ),
  light: (
    <Svg>
      <path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1.1 1.2 1.1 2v.2h5v-.2c0-.8.5-1.5 1.1-2A6 6 0 0 0 12 3z" />
      <path d="M10 19h4M10.8 21.5h2.4" />
    </Svg>
  ),
  safety: (
    <Svg>
      <path d="M12 4 21 19.5H3L12 4z" />
      <path d="M12 10v4.2M12 16.8v.2" />
    </Svg>
  ),
  bridge: (
    <Svg>
      <path d="M2.5 18h19M4 18V9M20 18V9M4 9c3 0 5 5.5 8 5.5S17 9 20 9M8 18v-3.5M16 18v-3.5" />
    </Svg>
  ),
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
  const [activeCategory, setActiveCategory] = useState(0);
  const [activeIssue, setActiveIssue] = useState(0);

  const handleCategorySelect = (index) => {
    setActiveCategory(index);
    setActiveIssue(0);
  };

  const currentCategory = issueCategories[activeCategory];
  const currentIssue = currentCategory.issues[activeIssue];

  return (
    <main className="issue-category-page">
      {/* ================= PAGE HERO ================= */}
      <section
        className="page-hero"
        style={{ backgroundImage: `url(${bannerImage})` }}
      >
        <div className="hero-scrim"></div>
        <div className="page-hero-inner">
          {/* <div className="breadcrumb">
            Home / Services / <b>Issue Category</b>
          </div>
          <p className="eyebrow eyebrow-light">Report an Issue</p>
          <h1>Select a category to report your issue</h1>
          <p className="hero-lead">
            Choose the category that best matches the problem, then pick the
            specific issue to see guidance before you submit your report.
          </p> */}
        </div>
      </section>

      {/* ================= CATEGORY GRID ================= */}
      <section className="section">
        <div className="section-heading">
          <p className="eyebrow">Step 1</p>
          <h2>Select the main issue category</h2>
        </div>

        <div className="category-grid">
          {issueCategories.map((category, i) => (
            <button
              key={i}
              type="button"
              className={`category-card ${activeCategory === i ? "active" : ""}`}
              onClick={() => handleCategorySelect(i)}
              aria-pressed={activeCategory === i}
            >
              {/* Icon */}
              <div className="category-icon">{category.icon}</div>

              {/* Title */}
              <h4>{category.title}</h4>

              {/* Description */}
              <p>{category.summary}</p>
            </button>
          ))}
        </div>
      </section>

      {/* ================= SUB-ISSUE SELECTION ================= */}
      <section className="section surface">
        <div className="detail-shell">
          <div className="detail-heading">
            <span className="category-number lg">{currentCategory.num}</span>
            <div>
              <p className="eyebrow">Step 2</p>
              <h3>Select a specific issue in {currentCategory.title}</h3>
            </div>
          </div>

          <div className="issue-chip-grid">
            {currentCategory.issues.map((issue, i) => (
              <button
                key={i}
                type="button"
                className={`issue-chip ${activeIssue === i ? "active" : ""}`}
                onClick={() => setActiveIssue(i)}
              >
                <span className="check">{activeIssue === i ? "✓" : ""}</span>
                {issue}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ================= ISSUE INFORMATION ================= */}
      <section className="section">
        <div className="section-heading">
          <p className="eyebrow">Step 3</p>
          <h2>Issue information</h2>
        </div>

        <div className="info-shell">
          <div className="info-card">
            <span className="info-label">Issue Name</span>
            <h3>{currentIssue}</h3>
          </div>
          <div className="info-card">
            <span className="info-label">Issue Description</span>
            <p>
              Provide a short description of the “{currentIssue}” problem —
              what you observed, its extent, and how long it has persisted.
            </p>
          </div>
          <div className="info-card">
            <span className="info-label">Related Guidance</span>
            <ul className="guidance-list">
              <li>Add clear photographs from more than one angle</li>
              <li>Capture GPS location at the exact site</li>
              <li>Mention nearby landmarks for easier identification</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ================= CTA ================= */}
      <section className="section cta-section">
        <div className="cta-shell">
          <div>
            <h3>Ready to report “{currentIssue}”?</h3>
            <p>Confirm the category and issue, then continue to submit your report.</p>
          </div>
          <button className="primary-btn" type="button">
            Continue to Report <span>→</span>
          </button>
        </div>
      </section>
    </main>
  );
};

export default IssueCategory;