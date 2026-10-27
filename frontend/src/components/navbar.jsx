
import React, { useState, useEffect } from "react";
import "./navbar.css";
import "./navbarresponsive.css";
import logo from "../assets/logo.jpeg";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toMediaUrl } from "../utils/dashboardApi";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();

  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState(null);

  // Change language
  const handleLanguageChange = async (langCode) => {
    try {
      await i18n.changeLanguage(langCode);
      localStorage.setItem("i18nextLng", langCode);
      setIsLanguageOpen(false);
    } catch (error) {
      console.error("Failed to change language:", error);
    }
  };

  // Current language label: EN / HI / MR
  const currentLangLabel = String(
    i18n.resolvedLanguage || i18n.language || "en"
  )
    .split("-")[0]
    .toUpperCase();
  const panchayatName = t("navbar.panchayatName", {
    defaultValue: "Hinjawadi Gram Panchayat",
  });
  const panchayatNameBreak = panchayatName.lastIndexOf(" ");
  const panchayatNameLines = panchayatNameBreak > 0
    ? [
      panchayatName.slice(0, panchayatNameBreak),
      panchayatName.slice(panchayatNameBreak + 1),
    ]
    : [panchayatName];

  // Load logged-in user
  useEffect(() => {
    const loadUser = () => {
      try {
        const stored = localStorage.getItem("user");
        setUser(stored ? JSON.parse(stored) : null);
      } catch (error) {
        console.error(
          "Error reading user from localStorage:",
          error
        );
        setUser(null);
      }
    };

    loadUser();

    window.addEventListener("authChange", loadUser);
    window.addEventListener("storage", loadUser);

    return () => {
      window.removeEventListener("authChange", loadUser);
      window.removeEventListener("storage", loadUser);
    };
  }, [location.pathname]);

  // Close mobile menu when the route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsLanguageOpen(false);
    setIsProfileOpen(false);
  }, [location.pathname]);

  // Map user role to dashboard
  const roleDashboardPath = (role) => {
    switch (String(role || "").toLowerCase()) {
      case "admin":
        return "/admindashboard";
      case "staff":
        return "/staffdashboard";
      case "verifier":
        return "/verifierdashboard";
      case "citizen":
      default:
        return "/citizendashboard";
    }
  };

  // Navigate and close menus
  const goTo = (path, state) => {
    setIsProfileOpen(false);
    setIsLanguageOpen(false);
    setIsMobileMenuOpen(false);
    navigate(path, state ? { state } : undefined);
  };

  // Logout
  const handleLogout = () => {
    setIsProfileOpen(false);
    setIsLanguageOpen(false);
    setIsMobileMenuOpen(false);
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("authChange"));
    setUser(null);
    navigate("/");
  };

  // Translate role names
  const getTranslatedRole = (role) => {
    const normalizedRole = String(role || "").toLowerCase();

    const roleKeys = {
      admin: "navbar.roles.admin",
      staff: "navbar.roles.staff",
      verifier: "navbar.roles.verifier",
      citizen: "navbar.roles.citizen",
    };

    return roleKeys[normalizedRole]
      ? t(roleKeys[normalizedRole], {
        defaultValue: normalizedRole
          ? normalizedRole.charAt(0).toUpperCase() +
          normalizedRole.slice(1)
          : "",
      })
      : String(role || "");
  };

  // Close mobile menu after selecting a page
  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
    setIsLanguageOpen(false);
    setIsProfileOpen(false);
  };

  // Reusable navigation links
  const renderNavigationLinks = () => (
    <>
      <NavLink
        to="/"
        end
        onClick={closeMobileMenu}
        className={({ isActive }) => isActive ? "active" : ""}
      >
        {t("navbar.home", { defaultValue: "Home" })}
      </NavLink>

      <NavLink
        to="/services"
        onClick={closeMobileMenu}
        className={({ isActive }) => isActive ? "active" : ""}
      >
        {t("navbar.services", { defaultValue: "Services" })}
      </NavLink>

      <NavLink
        to="/issues-category"
        onClick={closeMobileMenu}
        className={({ isActive }) => isActive ? "active" : ""}
      >
        {t("navbar.issuesCategory", {
          defaultValue: "Issues Category",
        })}
      </NavLink>

      <NavLink
        to="/aboutus"
        onClick={closeMobileMenu}
        className={({ isActive }) => isActive ? "active" : ""}
      >
        {t("navbar.aboutUs", { defaultValue: "About Us" })}
      </NavLink>

      <NavLink
        to="/contactus"
        onClick={closeMobileMenu}
        className={({ isActive }) => isActive ? "active" : ""}
      >
        {t("navbar.contactUs", { defaultValue: "Contact Us" })}
      </NavLink>

      <NavLink
        to="/blog"
        onClick={closeMobileMenu}
        className={({ isActive }) => isActive ? "active" : ""}
      >
        {t("navbar.blog", { defaultValue: "Blog" })}
      </NavLink>

      {user && (
        <NavLink
          to="/dashboard"
          onClick={closeMobileMenu}
          className={({ isActive }) => isActive ? "active" : ""}
        >
          {t("navbar.dashboard", { defaultValue: "Dashboard" })}
        </NavLink>
      )}

    </>
  );

  // Reusable header actions for desktop and mobile
  const renderHeaderActions = () => (
    <>
      {/* Language Select */}
      <div className="language-dropdown">
        <button
          type="button"
          className="lang-select"
          onClick={() => setIsLanguageOpen((open) => !open)}
          aria-expanded={isLanguageOpen}
          aria-label="Select language"
        >
          {currentLangLabel}{" "}
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            aria-hidden="true"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        {isLanguageOpen && (
          <div className="language-menu">
            <button
              type="button"
              onClick={() => handleLanguageChange("en")}
            >
              {t("navbar.languages.english", {
                defaultValue: "English",
              })}
            </button>

            <button
              type="button"
              onClick={() => handleLanguageChange("hi")}
            >
              {t("navbar.languages.hindi", {
                defaultValue: "Hindi",
              })}
            </button>

            <button
              type="button"
              onClick={() => handleLanguageChange("mr")}
            >
              {t("navbar.languages.marathi", {
                defaultValue: "Marathi",
              })}
            </button>
          </div>
        )}
      </div>

      {/* Login button */}
      {!user && (
        <button
          type="button"
          className="btn btn-login"
          onClick={() => goTo("/login")}
        >
          {t("navbar.login", { defaultValue: "Login" })}
        </button>
      )}

      {/* Report Issue */}
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => goTo("/reportissue")}
      >
        {t("navbar.reportIssue", {
          defaultValue: "Report an Issue",
        })}
      </button>

      {/* Profile dropdown */}
      {user && (
        <div className="profile-dropdown">
          <button
            type="button"
            className="profile-select"
            onClick={() => setIsProfileOpen((open) => !open)}
            title={
              user?.name ||
              t("navbar.profile", { defaultValue: "Profile" })
            }
            aria-expanded={isProfileOpen}
            aria-label={t("navbar.profile", {
              defaultValue: "Profile",
            })}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
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
              aria-hidden="true"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          {isProfileOpen && (
            <div className="profile-menu">
              <div className="profile-info">
                <div className="profile-avatar">
                  {user?.profilePhoto ? (
                    <img src={toMediaUrl(user.profilePhoto)} alt="Profile" />
                  ) : (
                    user?.name
                      ? String(user.name).charAt(0).toUpperCase()
                      : "U"
                  )}
                </div>

                <div className="profile-info-text">
                  <span className="profile-name">
                    {user?.name ||
                      t("navbar.user", { defaultValue: "User" })}
                  </span>

                  <span className="profile-email">
                    {user?.email || ""}
                  </span>
                </div>
              </div>

              <div className="profile-menu-divider" />

              {/* Role-based Dashboard */}
              <button
                type="button"
                onClick={() => goTo(roleDashboardPath(user?.role))}
              >
                {user?.role
                  ? t("navbar.roleDashboard", {
                    role: getTranslatedRole(user.role),
                    defaultValue: `${getTranslatedRole(user.role)} Dashboard`,
                  })
                  : t("navbar.dashboard", {
                    defaultValue: "Dashboard",
                  })}
              </button>

              {/* Edit Profile */}
              <button
                type="button"
                onClick={() => goTo(roleDashboardPath(user?.role), { openProfile: true })}
              >
                {t("navbar.editProfile", {
                  defaultValue: "Edit Profile",
                })}
              </button>

              {/* Logout */}
              <button
                type="button"
                className="profile-logout"
                onClick={handleLogout}
              >
                {t("navbar.logout", { defaultValue: "Logout" })}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Top Bar: keep for desktop; hide using responsive CSS on mobile */}
      <div className="topbar">
        <div className="topbar-inner">
          <span className="topbar-government">
            <img
              src="https://flagcdn.com/w40/in.png"
              alt="India"
              className="flag-icon"
            />

            {t("navbar.governmentPortal", {
              defaultValue:
                "Government Digital Service",
            })}
          </span>

          <span className="topbar-title">
            {t("navbar.panchayatName", {
              defaultValue: "Hinjawadi Gram Panchayat",
            })}
          </span>

          <div className="topbar-right">
            <button
              type="button"
              className="lang-btn"
              onClick={() => handleLanguageChange("hi")}
              aria-pressed={currentLangLabel === "HI"}
            >
              हिंदी
            </button>

            <span className="sep">·</span>

            <button
              type="button"
              className="lang-btn"
              onClick={() => handleLanguageChange("mr")}
              aria-pressed={currentLangLabel === "MR"}
            >
              मराठी
            </button>

            <span className="sep">·</span>

            <button
              type="button"
              className="lang-btn"
              onClick={() => handleLanguageChange("en")}
              aria-pressed={currentLangLabel === "EN"}
            >
              English
            </button>
          </div>
        </div>
      </div>

      {/* Main Header / Navbar */}
      <header className="main-header">
        <div className="header-inner">
          {/* Brand */}
          <div className="brand">
            <NavLink
              to="/"
              className="brand-logo"
              aria-label="MyRoad India Home"
              onClick={closeMobileMenu}
            >
              <img src={logo} alt="MyRoad India Logo" />
            </NavLink>

            <NavLink
              to="/"
              className="brand-text"
              onClick={closeMobileMenu}
            >
              <b>My Road India</b>

              <span>
                {t("navbar.tagline", {
                  defaultValue: "Report · Track · Resolve",
                })}
              </span>
              <span className="mobile-brand-title">
                {panchayatNameLines.map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </span>
            </NavLink>
          </div>

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            className="mobile-menu-btn"
            onClick={() => {
              setIsMobileMenuOpen((open) => !open);
              setIsLanguageOpen(false);
              setIsProfileOpen(false);
            }}
            aria-label={
              isMobileMenuOpen
                ? "Close navigation menu"
                : "Open navigation menu"
            }
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-navigation"
          >
            {isMobileMenuOpen ? (
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            ) : (
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M4 6h16" />
                <path d="M4 12h16" />
                <path d="M4 18h16" />
              </svg>
            )}
          </button>

          {/* Desktop Navigation */}
          <nav className="primary desktop-primary">
            {renderNavigationLinks()}
          </nav>

          {/* Desktop Header Actions */}
          <div className="header-actions desktop-header-actions">
            {renderHeaderActions()}
          </div>

          {/* Mobile Dropdown: all navigation links and actions */}
          <div
            className={`mobile-navigation ${isMobileMenuOpen ? "mobile-navigation-open" : ""
              }`}
            id="mobile-navigation"
            aria-hidden={!isMobileMenuOpen}
          >
            <nav className="mobile-primary">
              {renderNavigationLinks()}
            </nav>

            <div className="mobile-header-actions">
              {renderHeaderActions()}
            </div>
          </div>
        </div>
      </header>
    </>
  );
};

export default Navbar;
