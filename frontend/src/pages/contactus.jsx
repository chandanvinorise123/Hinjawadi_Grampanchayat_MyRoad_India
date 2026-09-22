import React, { useState } from "react";
import "./contactus.css";
import bannerImage from "../assets/cu.png";

const contactDetails = [
  {
    icon: "🏛️",
    label: "Gram Panchayat",
    value: "Office of the Gram Panchayat, Local Administration",
  },
  {
    icon: "🛣️",
    label: "MyRoad India",
    value: "Digital Road & Public Infrastructure Platform",
  },
  {
    icon: "📞",
    label: "Contact Details",
    value: "Phone, email & office hours for citizen assistance",
  },
];

const supportOptions = [
  {
    num: "01",
    icon: "💬",
    title: "General Queries",
    summary: "Questions about the platform, services, or how the system works.",
  },
  {
    num: "02",
    icon: "📋",
    title: "Project Information",
    summary: "Details on ongoing infrastructure projects and their status.",
  },
  {
    num: "03",
    icon: "🛠️",
    title: "Complaint Assistance",
    summary: "Help with reporting, tracking, or resolving a registered complaint.",
  },
];

const ContactUs = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
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
      <section
        className="page-hero"
        id="home"
        style={{ backgroundImage: `url(${bannerImage})` }}
      >
        <div className="hero-scrim"></div>
        <div className="page-hero-inner">
          <div className="hero-cta-row">
               <button className="primary-btn" type="button">
                 Report an Issue <span>→</span>
               </button>
             {/* <div className="breadcrumb">
               Home / <b>Contact Us</b>
             </div>
             <p className="eyebrow eyebrow-light">Get in Touch</p>
             <h1>We're here to help you</h1>
             <p className="hero-lead">
               Reach out to the Gram Panchayat and MyRoad India team for
               queries, project information, or assistance with a complaint.
             </p> */}
            </div>
        </div>

      </section>

      {/* ================= CONTACT INFORMATION ================= */}
      <section className="section">
        <div className="section-heading">
          <p className="eyebrow">Contact Information</p>
          <h2>Reach the right office for your query</h2>
        </div>

        <div className="contact-info-grid">
          {contactDetails.map((item, i) => (
            <div className="contact-info-card" key={i}>
              <span className="contact-info-icon">{item.icon}</span>
              <div>
                <h4>{item.label}</h4>
                <p>{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ================= CITIZEN SUPPORT ================= */}
      <section className="section surface">
        <div className="section-heading">
          <p className="eyebrow">Citizen Support</p>
          <h2>What can we help you with?</h2>
        </div>

        <div className="support-grid">
          {supportOptions.map((option, i) => (
            <div className="support-card" key={i}>
              <div className="support-top">
                <span className="support-number">{option.num}</span>
                <span className="support-icon">{option.icon}</span>
              </div>
              <h4>{option.title}</h4>
              <p>{option.summary}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ================= CONTACT / SUPPORT REQUEST FORM ================= */}
      <section className="section">
        <div className="section-heading center">
          <p className="eyebrow center">Contact / Support Request</p>
          <h2>Send us your message</h2>
        </div>

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
                  setFormData({ name: "", email: "", subject: "", message: "" });
                }}
              >
                Send another message
              </button>
            </div>
          ) : (
            <form className="contact-form" onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-field">
                  <label htmlFor="name">Full Name</label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="Enter your name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="email">Email Address</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="subject">Subject</label>
                <input
                  id="subject"
                  name="subject"
                  type="text"
                  placeholder="What is this regarding?"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="message">Message</label>
                <textarea
                  id="message"
                  name="message"
                  rows="5"
                  placeholder="Describe your query or request in detail"
                  value={formData.message}
                  onChange={handleChange}
                  required
                ></textarea>
              </div>

              <button className="primary-btn" type="submit">
                Submit Request <span>→</span>
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
};

export default ContactUs;