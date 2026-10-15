import React from "react";
import { useTranslation } from "react-i18next";
import "./aboutus.css";

// import bannerImage from "../assets/au.png";
import bannerImageEn from "../assets/au.png";
import bannerImageHi from "../assets/au-hi.png";
import bannerImageMr from "../assets/au-mr.png";
import sarpanchPhoto from "../assets/avtar.jpg";
import upsarpanchPhoto from "../assets/avtar.jpg";
import committee_photo from "../assets/avtar.jpg";
import committee_photo1 from "../assets/avtar.jpg";
import committee_photo2 from "../assets/avtar.jpg";
import committee_photo3 from "../assets/avtar.jpg";
import committee_photo4 from "../assets/avtar.jpg";
import committee_photo5 from "../assets/avtar.jpg";
import committee_photo6 from "../assets/avtar.jpg";
import committee_photo7 from "../assets/avtar.jpg";
import committee_photo8 from "../assets/avtar.jpg";

const missionPoints = [
  "Every complaint is logged with a photo, location, and timestamp — nothing gets lost in a register.",
  "Field staff and verifiers work off the same live queue, so nothing sits unassigned.",
  "Citizens can track their complaint from registration to closure, in real time.",
];

const pillars = [
  {
    num: "01",
    icon: "🎯",
    title: "Purpose",
    items: [
      "Citizen participation",
      "Identify issues",
      "Improve infrastructure",
      "Better planning",
    ],
  },
  {
    num: "02",
    icon: "⚙️",
    title: "What We Do",
    items: [
      "Complaint Registration",
      "Location Mapping",
      "Staff Assignment",
      "Work Monitoring",
      "Resolution Tracking",
    ],
  },
  {
    num: "03",
    icon: "✅",
    title: "Key Benefits",
    items: [
      "Transparency",
      "Faster Response",
      "Digital Records",
      "Better Monitoring",
      "Data & Analytics",
    ],
  },
];

const flowSteps = [
  {
    label: "Citizen",
    detail: "Reports an issue with photo & location",
  },
  {
    label: "Panchayat",
    detail: "Verifies and prioritizes the complaint",
  },
  {
    label: "Staff",
    detail: "Assigned field officer takes action",
  },
  {
    label: "Resolution",
    detail: "Work verified and complaint closed",
  },
];

const hinjewadiProfile = [
  {
    label: "Location",
    value: "Hinjewadi, Mulshi Taluka, Pune District, Maharashtra",
  },
  { label: "PIN Code", value: "411057" },
  { label: "Gram Panchayat Established", value: "25 February 1970" },
  {
    label: "Main Economic Activity",
    value: "IT, services, commercial activities and agriculture",
  },
  { label: "Major Development", value: "Rajiv Gandhi Infotech Park" },
  { label: "Main Water Source", value: "Mula River" },
];

const hinjewadiStats = [
  { icon: "👥", value: "11,459", label: "Population", note: "2011" },
  { icon: "🏠", value: "3,122", label: "Households", note: "2011" },
  { icon: "🏢", value: "104", label: "Companies", note: "Reported" },
  {
    icon: "🚶",
    value: "~1 Lakh",
    label: "Floating Population",
    note: "Reported 2025",
  },
];

const hinjewadiAmenities = [
  { icon: "💡", value: "7,942", label: "Street Lights" },
  { icon: "☀️", value: "14", label: "Solar Poles" },
  { icon: "⛽", value: "5", label: "Petrol Pumps" },
  { icon: "🔌", value: "3", label: "EV Charging Points" },
  { icon: "🚛", value: "8", label: "Garbage Collection Vehicles" },
];

const roadConnections = ["Dange Chowk", "Wakad", "Maan", "Marunji"];

const roadIndiaPoints = [
  {
    num: "01",
    title: "Rapid Urbanisation",
    text: "Hinjewadi has changed from an agricultural village into a major IT and commercial centre.",
  },
  {
    num: "02",
    title: "Rajiv Gandhi Infotech Park",
    text: "The IT park is the main driver of economic and infrastructure growth.",
  },
  {
    num: "03",
    title: "Road Connectivity",
    text: "Important connections lead toward Dange Chowk, Wakad, Maan and Marunji.",
  },
  {
    num: "04",
    title: "Traffic Pressure",
    text: "Large numbers of employees, residents and vehicles travel through the area, creating significant demand for road and transport infrastructure.",
  },
  {
    num: "05",
    title: "Infrastructure Needs",
    text: "The key areas to study are:",
    tags: [
      "Traffic management",
      "Road maintenance",
      "Pedestrian safety",
      "Public transport",
      "Parking",
      "Drainage",
    ],
  },
  {
    num: "06",
    title: "Future Mobility",
    text: "The presence of 3 reported EV charging points provides a useful point for discussing the transition toward electric transportation.",
  },
];

/* ================= GRAM PANCHAYAT LEADERS & MEMBERS ================= */

const gpLeaders = [
  {
    // name: "Shri. Amol Mahadev Gholwe",
    designation: "Gram Panchayat Officer (ग्रामपंचायत अधिकारी)",
    photo: committee_photo2,
  },
  {
    // name: "Shri. Amol Mahadev Gholwe",
    designation: "Sadasya (सदस्य)",
    photo: committee_photo2,
  },
  {
    // name: "Shri. Ganesh Jambhulkar",
    designation: "Sarpanch (सरपंच)",
    photo: sarpanchPhoto,
  },
  {
    // name: "Sau. Shubhangi Suraj Sakhare",
    designation: "Upsarpanch (उपसरपंच)",
    photo: upsarpanchPhoto,
  },
];

const gpMembers = [
  {
    // name: "Shri. Mayur Rajendra Sakhare",
    designation: "Sadasya (सदस्य)",
    photo: committee_photo,
  },
  {
    // name: "Sau. Manisha Jaysingh Hulawale",
    designation: "Sadasya (सदस्य)",
    photo: committee_photo1,
  },
  {
    // name: "Mr. Sachin Namdev Jambhulkar",
    designation: "Sadasya (सदस्य)",
    photo: committee_photo8,
  },
  {
    // name: "Mrs. Aishwarya Prashant Waghmare",
    designation: "Sadasya (सदस्य)",
    photo: committee_photo3,
  },
  {
    // name: "Mr. Vishal Laxman Sakhare",
    designation: "Sadasya (सदस्य)",
    photo: committee_photo4,
  },
  {
    // name: "Sai. Pratiksha Shivaji Ghotkule",
    designation: "Sadasya (सदस्य)",
    photo: committee_photo5,
  },
  {
    // name: "Mr. Vikram Vasant Sakhare",
    designation: "Sadasya (सदस्य)",
    photo: committee_photo6,
  },
  {
    // name: "Ms. Deepali Sharad Jambhulkar",
    designation: "Sadasya (सदस्य)",
    photo: committee_photo7,
  },
];

const GpPhoto = ({ photo, name }) =>
  photo ? (
    <img className="gp-photo" src={photo} alt={name} loading="lazy" />
  ) : (
    <div className="gp-photo gp-photo-empty" aria-hidden="true">
      👤
    </div>
  );

/* ================= OFFICIAL CONTACT DATA ================= */

const gpContact = [
  {
    icon: "📍",
    label: "Office Address",
    value:
      "Shri Chhatrapati Shivaji Maharaj Chowk, Hinjawadi, Taluka-Mulshi, District Pune – 411057",
    href: "",
    wide: true,
  },
  {
    icon: "📞",
    label: "Phone Number",
    value: "9834206559",
    href: "tel:+919834206559",
  },
  {
    icon: "✉️",
    label: "Email Address",
    value: "grampanchayat.hinjawadi@gmail.com",
    href: "mailto:grampanchayat.hinjawadi@gmail.com",
  },
];

const AboutUs = () => {
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
  return (
    <main className="about-page">
      {/* ================= PAGE HERO ================= */}


      <section className="page-hero-section">
        <div
          className="page-hero"
          id="home"
          style={{ backgroundImage: `url("${bannerImage}")` }}
        >
          <div className="hero-scrim"></div>

          <div className="page-hero-inner">
            <div className="hero-cta-row">
              {/* Existing hero buttons intentionally remain unchanged */}
            </div>
          </div>
        </div>
      </section>


      

      {/* ================= INTRO ================= */}
      <section className="section">
        <div className="intro-shell">
          <p className="eyebrow">{t("Who We Are")}</p>

          <h2>{t("About MyRoad India")}</h2>

          <p className="intro-lead">
            {t(
              "A digital platform built to give citizens a direct voice in the condition of their roads and public infrastructure — connecting reports to real, monitored action."
            )}
          </p>
        </div>
      </section>

      {/* ================= MISSION ================= */}
      <section className="section surface" id="mission">
        <div className="mission-shell">
          <div className="mission-copy">
            <p className="eyebrow">{t("Our Mission")}</p>

            <h2>{t("Closing the gap between a report and a repair")}</h2>

            <p className="mission-lead">
              {t(
                "Most civic complaints disappear into a register and are never seen again. MyRoad India replaces that register with a system every stakeholder can see into — citizen, staff, verifier, and administrator alike."
              )}
            </p>

            <ul className="mission-points">
              {missionPoints.map((point, i) => (
                <li key={i}>
                  <span className="mission-point-dot"></span>
                  {t(point)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ================= PILLARS GRID ================= */}
      <section className="section">
        <div className="section-heading center">
          <p className="eyebrow center">{t("Our Foundation")}</p>

          <h2>
            {t("Why the platform exists, and what it delivers")}
          </h2>
        </div>

        <div className="pillars-grid">
          {pillars.map((pillar) => (
            <div className="pillar-card" key={pillar.num}>
              <div className="pillar-top">
                <span className="pillar-number">{pillar.num}</span>
                <span className="pillar-icon">{pillar.icon}</span>
              </div>

              <h4>{t(pillar.title)}</h4>

              <ul className="pillar-list">
                {pillar.items.map((item) => (
                  <li key={item}>
                    <span className="check">✓</span>
                    {t(item)}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ================= PROCESS FLOW ================= */}
      <section className="section surface">
        <div className="section-heading center">
          <p className="eyebrow center">{t("How It Works")}</p>
          <h2>{t("From citizen report to resolved issue")}</h2>
        </div>

        <div className="flow-track">
          {flowSteps.map((step, i) => (
            <React.Fragment key={step.label}>
              <div className="flow-step">
                <div className="flow-dot">{i + 1}</div>
                <span className="flow-step-label">{t(step.label)}</span>
                <span className="flow-step-detail">{t(step.detail)}</span>
              </div>

              {i < flowSteps.length - 1 && (
                <div className="flow-arrow">→</div>
              )}
            </React.Fragment>
          ))}
        </div>
      </section>

      {/* ================= HINJEWADI — AT A GLANCE ================= */}
      <section className="section" id="hinjewadi">
        <div className="section-heading center">
          <p className="eyebrow center">{t("Our Focus Area")}</p>

          <h2>{t("Hinjewadi Gram Panchayat at a glance")}</h2>

          <p className="hj-lead">
            {t(
              "MyRoad India is rooted in Hinjewadi — a fast-growing Gram Panchayat in Mulshi Taluka, Pune District, home to the Rajiv Gandhi Infotech Park."
            )}
          </p>
        </div>

        <div className="hj-overview">
          <div className="hj-profile">
            <h4 className="hj-card-title">{t("Gram Panchayat Profile")}</h4>

            <dl className="hj-profile-list">
              {hinjewadiProfile.map((row) => (
                <div className="hj-profile-row" key={row.label}>
                  <dt>{t(row.label)}</dt>
                  <dd>{t(row.value)}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="hj-stats">
            {hinjewadiStats.map((stat) => (
              <div className="hj-card" key={stat.label}>
                <span className="hj-icon">{stat.icon}</span>
                <span className="hj-value">{stat.value}</span>
                <span className="hj-label">{t(stat.label)}</span>
                <span className="hj-tag-note">{t(stat.note)}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="hj-note">
          {t(
            "Population and household figures are for 2011. Companies and floating population are as reported."
          )}
        </p>
      </section>

      {/* ================= INFRASTRUCTURE & ROADS ================= */}
      <section className="section surface">
        <div className="section-heading center">
          <p className="eyebrow center">{t("On the Ground")}</p>
          <h2>{t("Infrastructure and road connections")}</h2>
        </div>

        <div className="hj-amenities">
          {hinjewadiAmenities.map((item) => (
            <div className="hj-card" key={item.label}>
              <span className="hj-icon">{item.icon}</span>
              <span className="hj-value">{item.value}</span>
              <span className="hj-label">{t(item.label)}</span>
            </div>
          ))}
        </div>

        <div className="hj-roads">
          <h4 className="hj-card-title">{t("Major Road Connections")}</h4>

          <div className="hj-roads-row">
            <span className="hj-hub">📍 {t("Hinjewadi")}</span>
            <span className="hj-hub-arrow">→</span>

            <ul className="hj-road-chips">
              {roadConnections.map((place) => (
                <li className="hj-road-chip" key={place}>
                  {t(place)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ================= ROAD INDIA PROJECT POINTS ================= */}
      <section className="section">
        <div className="section-heading center">
          <p className="eyebrow center">{t("Why It Matters")}</p>
          <h2>{t("Key points for the Road India project")}</h2>
        </div>

        <div className="hj-points">
          {roadIndiaPoints.map((point) => (
            <div className="hj-point" key={point.num}>
              <span className="hj-point-num">{point.num}</span>

              <h4>{t(point.title)}</h4>
              <p>{t(point.text)}</p>

              {point.tags && (
                <div className="hj-tags">
                  {point.tags.map((tag) => (
                    <span className="hj-tag" key={tag}>
                      {t(tag)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ================= GRAM PANCHAYAT LEADERS ================= */}
      <section className="section surface" id="gp-leaders">
        <div className="section-heading center">
          <p className="eyebrow center">{t("Our Leadership")}</p>
          <h2>{t("Gram Panchayat Leaders")}</h2>
        </div>

        <div className="gp-leaders-grid">
          {gpLeaders.map((person, i) => (
            <article className="gp-person gp-person-leader" key={i}>
              <GpPhoto photo={person.photo} name={person.name} />
              <h4 className="gp-name">{person.name}</h4>
              <span className="gp-designation">
                {t(person.designation)}
              </span>
            </article>
          ))}
        </div>
      </section>

      {/* ================= GRAM PANCHAYAT MEMBERS ================= */}
      <section className="section" id="gp-members">
        <div className="section-heading center">
          <p className="eyebrow center">{t("Our Members")}</p>
          <h2>{t("Gram Panchayat Members")}</h2>
        </div>

        <div className="gp-members-grid">
          {gpMembers.map((person, i) => (
            <article className="gp-person gp-person-member" key={i}>
              <GpPhoto photo={person.photo} name={person.name} />
              <h4 className="gp-name">{person.name}</h4>
              <span className="gp-designation">
                {t(person.designation)}
              </span>
            </article>
          ))}
        </div>
      </section>

      {/* ================= GRAM PANCHAYAT CONTACT ================= */}
      <section className="section surface" id="gp-contact">
        <div className="section-heading center">
          <p className="eyebrow center">{t("Contact Us")}</p>
          <h2>{t("Official Contact Details")}</h2>

          <p className="hj-lead">
            {t(
              "If you need official documents, certificates, or recent administrative updates, you can connect directly with the local office."
            )}
          </p>
        </div>

        <div className="gp-contact-grid">
          {gpContact.map((item, i) => (
            <div
              className={`gp-contact-card ${
                item.wide ? "gp-contact-wide" : ""
              }`}
              key={i}
            >
              <span className="hj-icon">{item.icon}</span>

              <div className="gp-contact-body">
                <span className="gp-contact-label">{t(item.label)}</span>

                {item.href ? (
                  <a className="gp-contact-value" href={item.href}>
                    {item.value}
                  </a>
                ) : (
                  <span className="gp-contact-value">
                    {t(item.value)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
};

export default AboutUs;