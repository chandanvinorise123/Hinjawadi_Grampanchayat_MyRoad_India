import React from "react";
import "./footer.css";
import logo from "../assets/logo.jpeg";

/* ================= SOCIAL ICONS ================= */
const SocialIcon = {
  Instagram: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.8">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="0.9" fill="#ffffff" stroke="none" />
    </svg>
  ),
  LinkedIn: () => (
    <svg viewBox="0 0 24 24" fill="#ffffff" stroke="none">
      <rect x="3" y="3" width="18" height="18" rx="3" fill="none" />
      <circle cx="6.5" cy="7" r="1.6" />
      <rect x="5.2" y="10" width="2.6" height="9" />
      <path d="M11 10h2.5v1.4c.6-1 1.7-1.7 3.2-1.7 2.4 0 3.8 1.6 3.8 4.6V19h-2.6v-4.2c0-1.4-.5-2.3-1.8-2.3-1 0-1.6.7-1.9 1.4-.1.3-.1.6-.1 1V19H11z" />
    </svg>
  ),
  YouTube: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.8">
      <rect x="2.5" y="6" width="19" height="12" rx="4" />
      <path d="M10.5 9.5l5 2.5-5 2.5z" fill="#ffffff" stroke="none" />
    </svg>
  ),
  WhatsApp: () => (
    <svg viewBox="0 0 24 24" fill="#ffffff" stroke="none">
      <path d="M12 3a9 9 0 00-7.8 13.5L3 21l4.7-1.2A9 9 0 1012 3z" fillOpacity="0" stroke="#ffffff" strokeWidth="1.8" />
      <path d="M8.4 7.6c.2-.5.5-.5.7-.5h.5c.2 0 .4 0 .6.4.2.5.7 1.7.7 1.8.1.1.1.3 0 .4-.1.2-.2.3-.3.4l-.4.5c-.1.1-.2.3-.1.5.2.4.8 1.3 1.7 2.1 1.1 1 1.1 1 1.4.9.2 0 .4-.2.5-.3l.5-.6c.2-.2.3-.2.5-.1l1.7.8c.2.1.3.2.4.3.1.2.1 1-.3 1.5-.3.5-1.4 1-2 1-.5 0-1.7-.2-3.5-1.7-2.1-1.8-2.9-3.4-3.1-3.9-.2-.5-.7-1.6-.5-2.6.1-.6.4-1 .6-1.2z" />
    </svg>
  ),
};

/* ================= CONTACT ICONS ================= */
const ContactIcon = {
  Mail: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.8">
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="M4 6.5l8 6 8-6" />
    </svg>
  ),
  Globe: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.6 2.5 15.4 0 18M12 3c-2.5 2.6-2.5 15.4 0 18" />
    </svg>
  ),
  Phone: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.8">
      <path d="M6 3h3l1.5 4L8 8.5a12 12 0 006 6L15.5 12l4 1.5v3c0 1.2-1 2-2.2 1.8A16 16 0 015 5.2C4.8 4 5.6 3 6 3z" />
    </svg>
  ),
  Pin: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.8">
      <path d="M12 21s7-6.5 7-11a7 7 0 10-14 0c0 4.5 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.4" />
    </svg>
  ),
  Leaf: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 20c0-9 6-15 16-15-1 10-7 15-16 15z" />
      <path d="M5 19c4-6 8-9 13-11" />
    </svg>
  ),
};

const Footer = () => {
  return (
    <footer className="myroad-footer">
      <div className="footer-card">
        <div className="footer-accent"></div>

        <div className="footer-main">
          {/* ---------- Logo ---------- */}
          <div className="footer-logo-wrap">
            <div className="footer-logo-ring">
              <img src={logo} alt="MyRoad India logo" className="footer-logo-img" />
            </div>
          </div>

          {/* ---------- Content ---------- */}
          <div className="footer-content">
            <h2 className="footer-title">MyRoad India</h2>
            <p className="footer-subtitle">
              Road Safety • GIS Mapping • Smart Road Management
            </p>
            <p className="footer-tagline">
              Safer Roads • Smarter Communities • A Better India
            </p>

            {/* ---------- Social ---------- */}
            <div className="footer-social">
              <a
                href="https://www.instagram.com/myroadindia/"
                className="social-icon social-instagram"
                aria-label="Instagram"
              >
                <SocialIcon.Instagram />
              </a>
              <a
                href="https://www.linkedin.com/company/my-road-india/"
                className="social-icon social-linkedin"
                aria-label="LinkedIn"
              >
                <SocialIcon.LinkedIn />
              </a>
              <a
                href="https://www.youtube.com/@MyRoadIndia"
                className="social-icon social-youtube"
                aria-label="YouTube"
              >
                <SocialIcon.YouTube />
              </a>
              <a
                href="https://wa.me/918956324316"
                className="social-icon social-whatsapp"
                aria-label="WhatsApp"
              >
                <SocialIcon.WhatsApp />
              </a>
            </div>

            {/* ---------- Contact ---------- */}
            <div className="footer-contact-grid">
              <div className="footer-contact-col">
                <div className="footer-contact-row">
                  <span className="contact-icon-badge">
                    <ContactIcon.Mail />
                  </span>
                  <a href="mailto:info@myroadindia.com" className="contact-text">
                    info@myroadindia.com
                  </a>
                </div>
                <div className="footer-contact-row">
                  <span className="contact-icon-badge">
                    <ContactIcon.Globe />
                  </span>
                  <a
                    href="https://www.myroadindia.com"
                    className="contact-text contact-link"
                    target="_blank"
                    rel="noreferrer"
                  >
                    www.myroadindia.com
                  </a>
                </div>
              </div>

              <div className="footer-contact-divider"></div>

              <div className="footer-contact-col">
                <div className="footer-contact-row">
                  <span className="contact-icon-badge">
                    <ContactIcon.Phone />
                  </span>
                  <a href="tel:+91-8956324316" className="contact-text">
                    +91 8956324316
                  </a>
                </div>
                <div className="footer-contact-row">
                  <span className="contact-icon-badge">
                    <ContactIcon.Pin />
                  </span>
                  <span className="contact-text">Pune, Maharashtra, India</span>
                </div>
              </div>
            </div>
          </div>

          {/* ---------- Navigation Columns ---------- */}
          <div className="footer-nav">
            <div className="footer-nav-col">
              <h3 className="footer-nav-title">CITIZEN SERVICES</h3>
              <ul className="footer-nav-list">
                <li><a href="#report" className="footer-nav-link">Report an Issue</a></li>
                <li><a href="#track" className="footer-nav-link">Track Complaint</a></li>
                <li><a href="#map" className="footer-nav-link">Issues Map</a></li>
                <li><a href="#safety" className="footer-nav-link">Road Safety</a></li>
              </ul>
            </div>

            <div className="footer-nav-col">
              <h3 className="footer-nav-title">PLATFORM</h3>
              <ul className="footer-nav-list">
                <li><a href="#about" className="footer-nav-link">About</a></li>
                <li><a href="#how-it-works" className="footer-nav-link">How It Works</a></li>
                <li><a href="#faq" className="footer-nav-link">FAQ</a></li>
                <li><a href="#contact" className="footer-nav-link">Contact</a></li>
              </ul>
            </div>

            <div className="footer-nav-col">
              <h3 className="footer-nav-title">LEGAL</h3>
              <ul className="footer-nav-list">
                <li><a href="#privacy" className="footer-nav-link">Privacy Policy</a></li>
                <li><a href="#accessibility" className="footer-nav-link">Accessibility</a></li>
                <li><a href="#terms" className="footer-nav-link">Terms of Use</a></li>
              </ul>
            </div>

            <div className="footer-nav-col">
              <h3 className="footer-nav-title">ACCESS</h3>
              <ul className="footer-nav-list">
                <li><a href="#login" className="footer-nav-link">System Login</a></li>
                <li><a href="#staff" className="footer-nav-link">Staff Portal</a></li>
                <li><a href="#admin" className="footer-nav-link">Admin Dashboard</a></li>
              </ul>
            </div>
          </div>
        </div>

        {/* ---------- Bottom Bar ---------- */}
        <div className="footer-bottom-bar">
          <p className="footer-bottom-links">
            REPORT <span className="dot">|</span> MAP{" "}
            <span className="dot">|</span> TRACK{" "}
            <span className="dot">|</span> BUILD SAFER ROADS TOGETHER
          </p>
          <p className="footer-bottom-tagline">
            <ContactIcon.Leaf />
            Clean Roads • Safe Lives • Greener Tomorrow
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;