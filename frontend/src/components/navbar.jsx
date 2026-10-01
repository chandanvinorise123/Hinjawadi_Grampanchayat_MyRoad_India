
import React, { useState, useEffect } from 'react';
import './navbar.css';
import logo from '../assets/logo.jpeg';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { i18n } = useTranslation();

  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Change language
  const handleLanguageChange = (langCode) => {
    i18n.changeLanguage(langCode);
    setIsLanguageOpen(false);
  };

  // Current language label: EN / HI / MR
  const currentLangLabel = String(i18n.language || 'en')
    .split('-')[0]
    .toUpperCase();

  // Track logged-in user
  const [user, setUser] = useState(null);

  // Load user from localStorage
  useEffect(() => {
    const loadUser = () => {
      try {
        const stored = localStorage.getItem('user');

        if (stored) {
          setUser(JSON.parse(stored));
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Error reading user from localStorage:', error);
        setUser(null);
      }
    };

    loadUser();

    window.addEventListener('authChange', loadUser);
    window.addEventListener('storage', loadUser);

    return () => {
      window.removeEventListener('authChange', loadUser);
      window.removeEventListener('storage', loadUser);
    };
  }, [location.pathname]);

  // Maps a logged-in user's role to the route of THEIR dashboard only
  const roleDashboardPath = (role) => {
    switch (String(role || '').toLowerCase()) {
      case 'admin':
        return '/admindashboard';
      case 'staff':
        return '/staffdashboard';
      case 'verifier':
        return '/verifierdashboard';
      case 'citizen':
      default:
        return '/citizendashboard';
    }
  };

  // Navigate and close profile menu
  const goTo = (path) => {
    setIsProfileOpen(false);
    navigate(path);
  };

  // Logout
  const handleLogout = () => {
    setIsProfileOpen(false);

    localStorage.removeItem('user');

    window.dispatchEvent(new Event('authChange'));

    setUser(null);

    navigate('/');
  };


  
  return (
    <>
      {/* Top Bar */}
      <div className="topbar">
        <div className="topbar-inner">

          <span>
            <img
              src="https://flagcdn.com/w40/in.png"
              alt="India"
              className="flag-icon"
            />
            Government Digital Service · Gram Panchayat Portal
          </span>

          <div className="topbar-right">

            <a href="#" className="sr-link">
              Screen Reader Access
            </a>

            <span className="sep">·</span>

            <button className="font-btn">A-</button>
            <button className="font-btn">A</button>
            <button className="font-btn">A+</button>

            <span className="sep">·</span>

            <button
              className="lang-btn"
              onClick={() => handleLanguageChange('hi')}
            >
              हिंदी
            </button>

            <span className="sep">·</span>

            <button
              className="lang-btn"
              onClick={() => handleLanguageChange('mr')}
            >
              मराठी
            </button>

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

            <NavLink
              to="/"
              className={({ isActive }) =>
                isActive ? 'active' : ''
              }
            >
              Home
            </NavLink>

            <NavLink
              to="/services"
              className={({ isActive }) =>
                isActive ? 'active' : ''
              }
            >
              Services
            </NavLink>

            <NavLink
              to="/issues-category"
              className={({ isActive }) =>
                isActive ? 'active' : ''
              }
            >
              Issues Category
            </NavLink>

            <NavLink
              to="/aboutus"
              className={({ isActive }) =>
                isActive ? 'active' : ''
              }
            >
              About Us
            </NavLink>

            <NavLink
              to="/contactus"
              className={({ isActive }) =>
                isActive ? 'active' : ''
              }
            >
              Contact Us
            </NavLink>

            <NavLink
              to="/Blog"
              className={({ isActive }) =>
                isActive ? 'active' : ''
              }
            >
              Blog
            </NavLink>

            {/* Dashboard only appears once a user is logged in */}
                                {/* Dashboard - goes to gateway page */}
                   {user && (
                       <NavLink
                   to="/dashboard"
                   className={({ isActive }) =>
                      isActive ? 'active' : ''
                             }
                             >
                         Dashboard
                           </NavLink>
                          )}

            
            {/* {user && (
              <NavLink
                to={roleDashboardPath(user.role)}
                className={({ isActive }) =>
                  isActive ? 'active' : ''
                }
              >
                Dashboard
              </NavLink>
            )} */}

            <NavLink
              to="/HelpFaq"
              className={({ isActive }) =>
                isActive ? 'active' : ''
              }
            >
              Help / FAQ
            </NavLink>

          </nav>

          {/* Header Actions */}
          <div className="header-actions">

            {/* Language Select */}
            <div className="language-dropdown">

              <button
                className="lang-select"
                onClick={() =>
                  setIsLanguageOpen(!isLanguageOpen)
                }
              >
                {currentLangLabel}{' '}

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
                    onClick={() =>
                      handleLanguageChange('en')
                    }
                  >
                    English
                  </button>

                  <button
                    onClick={() =>
                      handleLanguageChange('hi')
                    }
                  >
                    Hindi
                  </button>

                  <button
                    onClick={() =>
                      handleLanguageChange('mr')
                    }
                  >
                    Marathi
                  </button>

                </div>
              )}

            </div>

            {/* Login button only when user is NOT logged in */}
            {!user && (
              <button
                className="btn btn-login"
                onClick={() => navigate('/Login')}
              >
                Login
              </button>
            )}

            {/* Report Issue */}
            <button
              className="btn btn-primary"
              onClick={() => navigate('/ReportIssue')}
            >
              Report an Issue
            </button>

            {/* Profile only when user is logged in */}
            {user && (
              <div className="profile-dropdown">

                <button
                  className="profile-select"
                  onClick={() =>
                    setIsProfileOpen(!isProfileOpen)
                  }
                  title={user?.name || 'Profile'}
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

                    {/* User information */}
                    <div className="profile-info">

                      <div className="profile-avatar">
                        {user?.name
                          ? String(user.name).charAt(0).toUpperCase()
                          : 'U'}
                      </div>

                      <div className="profile-info-text">

                        <span className="profile-name">
                          {user?.name || 'User'}
                        </span>

                        <span className="profile-email">
                          {user?.email || ''}
                        </span>

                      </div>

                    </div>

                    <div className="profile-menu-divider"></div>

                    {/* Dashboard */}
                    <button


                       onClick={() => goTo("/dashboard")}
                    >
                      {user?.role
                        ? `${String(user.role).charAt(0).toUpperCase()}${String(user.role).slice(1)} Dashboard`
                        : 'Dashboard'}



                    </button>

                    {/* Edit Profile */}
                    <button
                      onClick={() =>
                        goTo('/EditProfile')
                      }
                    >
                      Edit Profile
                    </button>

                    {/* Settings */}
                    <button
                      onClick={() =>
                        goTo('/Settings')
                      }
                    >
                      Settings
                    </button>

                    {/* Help */}
                    <button
                      onClick={() =>
                        goTo('/HelpFaq')
                      }
                    >
                      Help Center
                    </button>

                    {/* Logout */}
                    <button
                      className="profile-logout"
                      onClick={handleLogout}
                    >
                      Logout
                    </button>

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
