
import React from 'react';
import './navbar.css';
import logo from '../assets/logo.jpeg';

const Navbar = () => {
  return (
    <>
      {/* Top Bar */}
      <div className="topbar">
        <div className="topbar-inner">
          <span>Government Digital Service · Gram Panchayat Portal</span>
          <div className="topbar-right">
            <a href="#" className="sr-link">Screen Reader Access</a>
            <span className="sep">·</span>
            <button className="font-btn">A-</button>
            <button className="font-btn">A</button>
            <button className="font-btn">A+</button>
            <span className="sep">·</span>
            <button className="lang-btn">हिंदी</button>
            <span className="sep">·</span>
            <button className="lang-btn">मराठी</button>
          </div>
        </div>
      </div>

      {/* Main Header / Navbar */}
      <header className="main-header">
        <div className="header-inner">
          <div className="brand">
            <div className="brand-logo">
              <img
                src={logo}
                alt="MyRoad India Logo"
              />
            </div>
            <div className="brand-text">
              <b>MyRoad India</b>
              <span>Report · Track · Resolve</span>
            </div>
          </div>

          <nav className="primary">
            <a href="#" className="active">Home</a>
            <a href="#report">Report an Issue</a>
            <a href="#track">Track Complaint</a>
            <a href="#map">Issues Map</a>
            <a href="#">Road Safety</a>
            <a href="#">About</a>
            <a href="#">Help / FAQ</a>
          </nav>

          <div className="header-actions">
            <button className="icon-btn" title="Accessibility">
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="4" r="2" />
                <path d="M5 8l7 2 7-2M12 10v5m-4 7l4-7 4 7" />
              </svg>
            </button>
            <button className="lang-select">
              EN{' '}
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            <button className="btn btn-login">Login</button>
            <button className="btn btn-primary">Report an Issue</button>
          </div>
        </div>
      </header>
    </>
  );
};

export default Navbar;

