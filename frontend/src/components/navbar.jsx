import React, { useState } from 'react';
import './navbar.css';
import logo from '../assets/logo.jpeg';
import { NavLink, useNavigate } from 'react-router-dom';

const Navbar = () => {
  const navigate = useNavigate();

  // Added for language dropdown
  const [language, setLanguage] = useState('EN');
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);

  // Added for user profile dropdown
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    setIsLanguageOpen(false);
  };

  // Close the menu after navigating so it doesn't stay open on the next page.
  const goTo = (path) => {
    setIsProfileOpen(false);
    navigate(path);
  };

  // NOTE: this just clears whatever auth info you're storing client-side and
  // sends the user back to Login. Wire this up to your real auth/session
  // logic (e.g. clearing a token from localStorage or an auth context).
  const handleLogout = () => {
    setIsProfileOpen(false);
    localStorage.removeItem('user');
    navigate('/Login');
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

          {/* Navigation */}
          <nav className="primary">

            <NavLink to="/" className={({ isActive }) => isActive ? 'active' : ''} > Home </NavLink>



            <NavLink to="/services" className={({ isActive }) => isActive ? 'active' : ''}  >  Services </NavLink>

            <NavLink to="/issues-category" className={({ isActive }) => isActive ? 'active' : ''} > Issues Category </NavLink>

            <NavLink to="/aboutus" className={({ isActive }) => isActive ? 'active' : ''} >   About Us </NavLink>

            <NavLink to="/contactus" className={({ isActive }) => isActive ? 'active' : ''} >Contact Us </NavLink>

            <NavLink to="/Dashboard" className={({ isActive }) => isActive ? 'active' : ''}> Dashboard </NavLink>

            <NavLink to="/HelpFaq" className={({ isActive }) => isActive ? 'active' : ''}  > Help / FAQ </NavLink>
            {/*  
        <NavLink to="/CitizenDashboard" className={({ isActive }) => isActive ? 'active' : ''}  > Citizen Dashboard </NavLink> 
        <NavLink to="/StaffDashboard" className={({ isActive }) => isActive ? 'active' : ''}  > Staff Dashboard </NavLink> 
        <NavLink to="/VerifierDashboard" className={({ isActive }) => isActive ? 'active' : ''} > Verifier Dashboard </NavLink> 
        <NavLink to="/admindashboard" className={({ isActive }) => isActive ? 'active' : ''} > admindashboard </NavLink> */}

            {/*  
        <NavLink to="/Login" className={({ isActive }) => isActive ? 'active' : ''} > Login </NavLink> 
 
        <NavLink to="/ReportIssue" className={({ isActive }) => isActive ? 'active' : ''} > Report an Issue </NavLink> 
 */}




          </nav>



          {/* Header Actions */}
          
          <div className="header-actions">

            {/* <button className="icon-btn" title="Accessibility">
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
            </button> */}
            

            {/* Language Select - Added */}
            <div className="language-dropdown">
              <button
                className="lang-select"
                onClick={() => setIsLanguageOpen(!isLanguageOpen)}
              >
                {language}{' '}
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

              {isLanguageOpen && (
                <div className="language-menu">

                  <button
                    onClick={() => handleLanguageChange('EN')}
                  >
                    English
                  </button>

                  <button
                    onClick={() => handleLanguageChange('HI')}
                  >
                    Hindi
                  </button>

                  <button
                    onClick={() => handleLanguageChange('MR')}
                  >
                    Marathi
                  </button>

                </div>
              )}
            </div>


            <button className="btn btn-login" onClick={() => navigate('/Login')} >

              Login
            </button>




            <button className="btn btn-primary" onClick={() => navigate('/ReportIssue')} >
              Report an Issue
            </button>

            {/* User Profile - Added, placed after Report an Issue */}
            <div className="profile-dropdown">
              <button
                className="profile-select"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                title="User Profile"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
                </svg>
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

              {isProfileOpen && (
                <div className="profile-menu">

                  <button onClick={() => goTo('/admindashboard')}>
                    Admin Dashboard
                  </button>

                  <button onClick={() => goTo('/Dashboard')}>
                    User Dashboard
                  </button>

                  <button onClick={() => goTo('/EditProfile')}>
                    Edit Profile
                  </button>

                  <button onClick={() => goTo('/Settings')}>
                    Settings
                  </button>

                  <button onClick={() => goTo('/HelpFaq')}>
                    Help Center
                  </button>

                  <button className="profile-logout" onClick={handleLogout}>
                    Logout
                  </button>

                </div>
              )}
            </div>


          </div>
        </div>
      </header>
    </>
  );
};

export default Navbar;