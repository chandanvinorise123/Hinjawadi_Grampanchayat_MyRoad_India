import React, { useState, useEffect } from 'react';
import './navbar.css';
import logo from '../assets/logo.jpeg';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [language, setLanguage] = useState('EN');
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // NEW: track the logged-in user
  const [user, setUser] = useState(null);

  // Read user from localStorage whenever the component mounts,
  // the route changes, or an 'authChange' event fires (from Login/Logout).
  useEffect(() => {
    const loadUser = () => {
      const stored = localStorage.getItem('user');
      setUser(stored ? JSON.parse(stored) : null);
    };

    loadUser(); // initial load

    window.addEventListener('authChange', loadUser);
    window.addEventListener('storage', loadUser); // syncs across tabs

    return () => {
      window.removeEventListener('authChange', loadUser);
      window.removeEventListener('storage', loadUser);
    };
  }, [location.pathname]);

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    setIsLanguageOpen(false);
  };

  const goTo = (path) => {
    setIsProfileOpen(false);
    navigate(path);
  };

  const handleLogout = () => {
    setIsProfileOpen(false);
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('authChange')); // tell Navbar to update
    setUser(null);
    navigate('/');
  };

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
          {/* Brand */}
          <div className="brand">
            <div className="brand-logo">
              <img src={logo} alt="MyRoad India Logo" />
            </div>
            <div className="brand-text">
              <b>MyRoad India</b>
              <span>Report · Track · Resolve</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="primary">
            <NavLink to="/" className={({ isActive }) => isActive ? 'active' : ''}>Home</NavLink>
            <NavLink to="/services" className={({ isActive }) => isActive ? 'active' : ''}>Services</NavLink>
            <NavLink to="/issues-category" className={({ isActive }) => isActive ? 'active' : ''}>Issues Category</NavLink>
            <NavLink to="/aboutus" className={({ isActive }) => isActive ? 'active' : ''}>About Us</NavLink>
            <NavLink to="/contactus" className={({ isActive }) => isActive ? 'active' : ''}>Contact Us</NavLink>
            <NavLink to="/Dashboard" className={({ isActive }) => isActive ? 'active' : ''}>Dashboard</NavLink>
            <NavLink to="/HelpFaq" className={({ isActive }) => isActive ? 'active' : ''}>Help / FAQ</NavLink>
          </nav>

          {/* Header Actions */}
          <div className="header-actions">
            {/* Language Select */}
            <div className="language-dropdown">
              <button className="lang-select" onClick={() => setIsLanguageOpen(!isLanguageOpen)}>
                {language}{' '}
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              {isLanguageOpen && (
                <div className="language-menu">
                  <button onClick={() => handleLanguageChange('EN')}>English</button>
                  <button onClick={() => handleLanguageChange('HI')}>Hindi</button>
                  <button onClick={() => handleLanguageChange('MR')}>Marathi</button>
                </div>
              )}
            </div>

            {/* NEW: Show Login button ONLY when there's no user */}
            {!user && (
              <button className="btn btn-login" onClick={() => navigate('/Login')}>
                Login
              </button>
            )}

            <button className="btn btn-primary" onClick={() => navigate('/ReportIssue')}>
              Report an Issue
            </button>

            {/* NEW: Show Profile dropdown ONLY when a user is logged in */}
            {user && (
              <div className="profile-dropdown">
                <button
                  className="profile-select"
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  title={user.name}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
                  </svg>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>

                {isProfileOpen && (
                  <div className="profile-menu">
                    {/* Only show Admin Dashboard link if role is admin */}
                    {user.role === 'admin' && (
                      <button onClick={() => goTo('/admindashboard')}>Admin Dashboard</button>
                    )}

                    <button onClick={() => goTo('/Dashboard')}>User Dashboard</button>
                    <button onClick={() => goTo('/EditProfile')}>Edit Profile</button>
                    <button onClick={() => goTo('/Settings')}>Settings</button>
                    <button onClick={() => goTo('/HelpFaq')}>Help Center</button>
                    <button className="profile-logout" onClick={handleLogout}>Logout</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
};

export default Navbar;