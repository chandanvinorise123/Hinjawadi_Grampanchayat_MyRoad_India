import React, { useState } from "react";
import "./helpfaq.css";

const faqCategories = [
  {
    icon: "📝",
    title: "Report Issue Questions",
    questions: [
      {
        q: "How do I report a road or infrastructure issue?",
        a: "Open the Report Issue section, select a category and specific issue, add a description and photographs, then submit — your location is captured automatically.",
      },
      {
        q: "Can I report an issue without creating an account?",
        a: "You can register a complaint using the QR-code or mobile-based registration flow; a complaint number is generated for you to track it afterward.",
      },
      {
        q: "What details should I include in my report?",
        a: "Include a clear description, at least one photograph, and make sure your device location is enabled so the issue is pinned accurately on the map.",
      },
      {
        q: "Can I report more than one issue at a time?",
        a: "Yes, each issue should be submitted as a separate report so it gets its own complaint number and can be tracked individually.",
      },
    ],
  },
  {
    icon: "🔍",
    title: "Track Complaint Questions",
    questions: [
      {
        q: "How do I track the status of my complaint?",
        a: "Use your complaint number in the Track Complaint section to view its current status, history, and complete lifecycle.",
      },
      {
        q: "What do the different complaint statuses mean?",
        a: "Complaints move through Registered, Verified, Assigned, Action, Completed, and Closed — each stage reflects where your complaint is in the resolution process.",
      },
      {
        q: "Will I be notified when my complaint status changes?",
        a: "Yes, you'll receive notifications at registration, verification, assignment, and when the work is completed or resolved.",
      },
      {
        q: "Where can I see all my registered complaints?",
        a: "All complaints you've submitted are listed together in the tracking section, along with their current status and location.",
      },
    ],
  },
  {
    icon: "📱",
    title: "Mobile App Questions",
    questions: [
      {
        q: "Is MyRoad India available as a mobile app?",
        a: "Yes, issues can be reported and tracked directly through the mobile-based registration flow in addition to the website.",
      },
      {
        q: "Can I scan a QR code to report an issue?",
        a: "Yes, QR-code-based registration lets you report an issue quickly by scanning a code at the location of the problem.",
      },
      {
        q: "Does the app work without an internet connection?",
        a: "An active connection is needed to submit a report and capture your GPS location and photographs accurately.",
      },
      {
        q: "Can field staff use the same app to update complaints?",
        a: "Field staff use the same platform to view assigned complaints, upload site photographs, and update work status and remarks.",
      },
    ],
  },
];

const citizenGuidance = [
  {
    num: "01",
    icon: "📝",
    title: "How to Report Issue",
    summary: "Select a category, add a description and photos, then submit your report.",
  },
  {
    num: "02",
    icon: "📊",
    title: "Complaint Status",
    summary: "Follow your complaint through Registered, Verified, Assigned, Action, and Closed.",
  },
  {
    num: "03",
    icon: "📍",
    title: "Location / Photo",
    summary: "Enable GPS and attach clear photographs so your issue is pinned accurately.",
  },
  {
    num: "04",
    icon: "🔢",
    title: "Complaint Number",
    summary: "Save your complaint number to track status and history at any time.",
  },
];

const HelpFaq = () => {
  const [activeCategory, setActiveCategory] = useState(0);
  const [openIndex, setOpenIndex] = useState(0);

  const handleCategorySelect = (index) => {
    setActiveCategory(index);
    setOpenIndex(0);
  };

  const toggleQuestion = (index) => {
    setOpenIndex(openIndex === index ? -1 : index);
  };

  return (
    <main className="help-page">
      {/* ================= PAGE HERO ================= */}
      <section className="page-hero">
        <div className="hero-glow"></div>
        <div className="page-hero-inner">
          <div className="breadcrumb">
            Home / <b>Help / FAQ</b>
          </div>
          <p className="eyebrow eyebrow-light">Help Center</p>
          <h1>Frequently asked questions</h1>
          <p className="hero-lead">
            Answers to common questions about reporting issues, tracking
            complaints, and using the MyRoad India mobile app.
          </p>
        </div>
      </section>

      {/* ================= FAQ CATEGORIES ================= */}
      <section className="section">
        <div className="section-heading center">
          <p className="eyebrow center">Frequently Asked Questions</p>
          <h2>Browse by topic</h2>
        </div>

        <div className="faq-tabs">
          {faqCategories.map((category, i) => (
            <button
              key={i}
              type="button"
              className={`faq-tab ${activeCategory === i ? "active" : ""}`}
              onClick={() => handleCategorySelect(i)}
            >
              <span className="faq-tab-icon">{category.icon}</span>
              {category.title}
            </button>
          ))}
        </div>

        <div className="faq-accordion">
          {faqCategories[activeCategory].questions.map((item, i) => (
            <div
              className={`faq-item ${openIndex === i ? "open" : ""}`}
              key={i}
            >
              <button
                type="button"
                className="faq-question"
                onClick={() => toggleQuestion(i)}
              >
                {item.q}
                <span className="faq-toggle">{openIndex === i ? "−" : "+"}</span>
              </button>
              {openIndex === i && <p className="faq-answer">{item.a}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* ================= CITIZEN GUIDANCE ================= */}
      <section className="section surface">
        <div className="section-heading">
          <p className="eyebrow">Citizen Guidance</p>
          <h2>Quick reference for using the platform</h2>
        </div>

        <div className="guidance-grid">
          {citizenGuidance.map((item, i) => (
            <div className="guidance-card" key={i}>
              <div className="guidance-top">
                <span className="guidance-number">{item.num}</span>
                <span className="guidance-icon">{item.icon}</span>
              </div>
              <h4>{item.title}</h4>
              <p>{item.summary}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ================= STILL NEED HELP / CONTACT ================= */}
      <section className="section cta-section">
        <div className="cta-shell">
          <div>
            <h3>Still need help?</h3>
            <p>Reach out to our support team for anything not covered here.</p>
          </div>
          <button className="primary-btn" type="button">
            Contact Us <span>→</span>
          </button>
        </div>
      </section>
    </main>
  );
};

export default HelpFaq;