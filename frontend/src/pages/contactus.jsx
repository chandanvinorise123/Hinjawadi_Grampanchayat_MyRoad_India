import React, { useState } from "react";
import "./contactus.css";
import bannerImage from "../assets/cu.png";

// Office details (used for the map, the contact cards and the location card)
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
const MAP_EMBED_URL = `https://www.google.com/maps?q=${encodeURIComponent(MAP_QUERY)}&output=embed`;

const contactCards = [
  {
    icon: "📍",
    label: "Office Address",
    value: OFFICE_ADDRESS_TEXT,
    wide: true,
  },
  {
    icon: "📞",
    label: "Phone Number",
    value: OFFICE_PHONE,
    href: `tel:${OFFICE_PHONE}`,
  },
  {
    icon: "✉️",
    label: "Email Address",
    value: OFFICE_EMAIL,
    href: `mailto:${OFFICE_EMAIL}`,
  },
];

// Issue dropdown options
const issueOptions = [
  "Pothole / Road Damage",
  "Road Safety Concern",
  "Waterlogging / Drainage",
  "Street Light Issue",
  "Road Maintenance Request",
  "Complaint Status / Tracking",
  "Road Project Information",
  "GIS Mapping / Map Data Query",
  "Website / Technical Support",
  "Other",
];

const initialForm = {
  name: "",
  email: "",
  mobile: "",
  subject: "", // holds the selected issue
  message: "",
};

const ContactUs = () => {
  const [formData, setFormData] = useState(initialForm);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <main className="contact-page">
      {/* ================= PAGE HERO — banner as full-cover background ================= */}


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



      {/* ================= GET IN TOUCH + SEND US A MESSAGE ================= */}
      <section className="section surface">
        <div className="touch-layout">
          {/* ---------- Left: Get in Touch ---------- */}
          <div className="touch-left">
            <div className="section-heading">
              <span className="heading-bar"></span>
              <h2>Get in Touch</h2>
              <p className="section-sub">
                You can reach us through the following channels. We are
                committed to providing timely and helpful support to all
                citizens.
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
                  <h3>Response / Help</h3>
                  <p>
                    Thank you for reaching out. Your request has been received —
                    our team will get back to you shortly.
                  </p>
                  <button
                    className="secondary-btn"
                    type="button"
                    onClick={() => {
                      setSubmitted(false);
                      setFormData(initialForm);
                    }}
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <>
                  <h2 className="form-title">Send Us a Message</h2>
                  <p className="form-sub">
                    Fill in the form below and we will get back to you shortly.
                  </p>

                  <form className="contact-form" onSubmit={handleSubmit}>
                    <div className="form-field">
                      <label htmlFor="name">Full Name *</label>
                      <input
                        id="name"
                        name="name"
                        type="text"
                        placeholder="Enter your full name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="form-field">
                      <label htmlFor="email">Email Address *</label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="Enter your email address"
                        value={formData.email}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="form-field">
                      <label htmlFor="mobile">Mobile Number *</label>
                      <input
                        id="mobile"
                        name="mobile"
                        type="tel"
                        placeholder="Enter your mobile number"
                        value={formData.mobile}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="form-field">
                      <label htmlFor="subject">Issue *</label>
                      <select
                        id="subject"
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        required
                      >
                        <option value="">Select an issue</option>
                        {issueOptions.map((opt) => (
                          <option value={opt} key={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-field">
                      <label htmlFor="message">Message *</label>
                      <textarea
                        id="message"
                        name="message"
                        rows="5"
                        placeholder="Type your message here..."
                        value={formData.message}
                        onChange={handleChange}
                        required
                      ></textarea>
                    </div>

                    <button className="primary-btn submit-btn" type="submit">
                      Submit
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ================= MAP + OFFICE LOCATION (equal blocks) ================= */}
      <section className="section surface map-section" id="location-map">
        <div className="map-layout">
          <div className="map-frame">
            <iframe
              title="Office location"
              src={MAP_EMBED_URL}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            ></iframe>
          </div>

          <div className="office-card">
            <div className="office-block">
              <span className="office-icon">📍</span>
              <div>
                <h3>Our Office Location</h3>
                {OFFICE_ADDRESS_LINES.map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </div>

            <div className="office-divider"></div>

            <div className="office-block">
              <span className="office-icon">🕘</span>
              <div>
                <h3>Working Hours</h3>
                <p>Monday – Friday : 10:00 AM – 6:00 PM</p>
                <p>(Closed on Government Holidays)</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default ContactUs;