
import React, { useState, useEffect } from "react";
import "./navbar.css";
import logo from "../assets/logo.jpeg";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

const MIN_FONT_SIZE = 80;
const MAX_FONT_SIZE = 130;
const FONT_STEP = 10;

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();

  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [user, setUser] = useState(null);

  // Restore the saved font size
  const [fontSize, setFontSize] = useState(() => {
    const savedSize = Number(
      localStorage.getItem("myroad-font-size")
    );

    return savedSize >= MIN_FONT_SIZE &&
      savedSize <= MAX_FONT_SIZE
      ? savedSize
      : 100;
  });

  // Apply font size throughout the application
  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize}%`;
    localStorage.setItem("myroad-font-size", String(fontSize));
  }, [fontSize]);

  // Decrease, reset, or increase font size
  const changeFontSize = (newSize) => {
    const size = Math.max(
      MIN_FONT_SIZE,
      Math.min(MAX_FONT_SIZE, newSize)
    );

    setFontSize(size);
  };

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

  // Navigate and close profile menu
  const goTo = (path) => {
    setIsProfileOpen(false);
    navigate(path);
  };

  // Logout
  const handleLogout = () => {
    setIsProfileOpen(false);
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

            {t("navbar.governmentPortal", {
              defaultValue:
                "Government Digital Service · Gram Panchayat Portal",
            })}
          </span>

          <div className="topbar-right">
            <a
              href="#"
              className="sr-link"
              onClick={(event) => event.preventDefault()}
            >
              {t("navbar.screenReader", {
                defaultValue: "Screen Reader Access",
              })}
            </a>

            <span className="sep">·</span>

            {/* Decrease font size */}
            <button
              type="button"
              className="font-btn"
              onClick={() =>
                changeFontSize(fontSize - FONT_STEP)
              }
              disabled={fontSize <= MIN_FONT_SIZE}
              aria-label="Decrease font size"
              title="Decrease font size"
            >
              A−
            </button>

            {/* Reset font size */}
            <button
              type="button"
              className="font-btn"
              onClick={() => changeFontSize(100)}
              aria-label="Reset font size"
              title="Reset font size"
            >
              A
            </button>

            {/* Increase font size */}
            <button
              type="button"
              className="font-btn"
              onClick={() =>
                changeFontSize(fontSize + FONT_STEP)
              }
              disabled={fontSize >= MAX_FONT_SIZE}
              aria-label="Increase font size"
              title="Increase font size"
            >
              A+
            </button>

            <span className="sep">·</span>

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
              <span>
                {t("navbar.tagline", {
                  defaultValue: "Report · Track · Resolve",
                })}
              </span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="primary">
            <NavLink
              to="/"
              className={({ isActive }) =>
                isActive ? "active" : ""
              }
            >
              {t("navbar.home", { defaultValue: "Home" })}
            </NavLink>

            <NavLink
              to="/services"
              className={({ isActive }) =>
                isActive ? "active" : ""
              }
            >
              {t("navbar.services", {
                defaultValue: "Services",
              })}
            </NavLink>

            <NavLink
              to="/issues-category"
              className={({ isActive }) =>
                isActive ? "active" : ""
              }
            >
              {t("navbar.issuesCategory", {
                defaultValue: "Issues Category",
              })}
            </NavLink>

            <NavLink
              to="/aboutus"
              className={({ isActive }) =>
                isActive ? "active" : ""
              }
            >
              {t("navbar.aboutUs", {
                defaultValue: "About Us",
              })}
            </NavLink>

            <NavLink
              to="/contactus"
              className={({ isActive }) =>
                isActive ? "active" : ""
              }
            >
              {t("navbar.contactUs", {
                defaultValue: "Contact Us",
              })}
            </NavLink>

            <NavLink
              to="/Blog"
              className={({ isActive }) =>
                isActive ? "active" : ""
              }
            >
              {t("navbar.blog", { defaultValue: "Blog" })}
            </NavLink>

            {user && (
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  isActive ? "active" : ""
                }
              >
                {t("navbar.dashboard", {
                  defaultValue: "Dashboard",
                })}
              </NavLink>
            )}

            <NavLink
              to="/HelpFaq"
              className={({ isActive }) =>
                isActive ? "active" : ""
              }
            >
              {t("navbar.helpFaq", {
                defaultValue: "Help / FAQ",
              })}
            </NavLink>
          </nav>

          {/* Header Actions */}
          <div className="header-actions">
            {/* Language Select */}
            <div className="language-dropdown">
              <button
                type="button"
                className="lang-select"
                onClick={() =>
                  setIsLanguageOpen((open) => !open)
                }
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
                    onClick={() =>
                      handleLanguageChange("en")
                    }
                  >
                    {t("navbar.languages.english", {
                      defaultValue: "English",
                    })}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleLanguageChange("hi")
                    }
                  >
                    {t("navbar.languages.hindi", {
                      defaultValue: "Hindi",
                    })}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleLanguageChange("mr")
                    }
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
                onClick={() => navigate("/Login")}
              >
                {t("navbar.login", {
                  defaultValue: "Login",
                })}
              </button>
            )}

            {/* Report Issue */}
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate("/ReportIssue")}
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
                  onClick={() =>
                    setIsProfileOpen((open) => !open)
                  }
                  title={
                    user?.name ||
                    t("navbar.profile", {
                      defaultValue: "Profile",
                    })
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
                        {user?.name
                          ? String(user.name)
                              .charAt(0)
                              .toUpperCase()
                          : "U"}
                      </div>

                      <div className="profile-info-text">
                        <span className="profile-name">
                          {user?.name ||
                            t("navbar.user", {
                              defaultValue: "User",
                            })}
                        </span>

                        <span className="profile-email">
                          {user?.email || ""}
                        </span>
                      </div>
                    </div>

                    <div className="profile-menu-divider" />

                    {/* Dashboard */}
                    <button
                      type="button"
                      onClick={() =>
                        goTo(roleDashboardPath(user?.role))
                      }
                    >
                      {user?.role
                        ? t("navbar.roleDashboard", {
                            role: getTranslatedRole(user.role),
                            defaultValue: `${getTranslatedRole(
                              user.role
                            )} Dashboard`,
                          })
                        : t("navbar.dashboard", {
                            defaultValue: "Dashboard",
                          })}
                    </button>

                    {/* Edit Profile */}
                    <button
                      type="button"
                      onClick={() => goTo("/EditProfile")}
                    >
                      {t("navbar.editProfile", {
                        defaultValue: "Edit Profile",
                      })}
                    </button>

                    {/* Help */}
                    <button
                      type="button"
                      onClick={() => goTo("/HelpFaq")}
                    >
                      {t("navbar.helpCenter", {
                        defaultValue: "Help Center",
                      })}
                    </button>

                    {/* Logout */}
                    <button
                      type="button"
                      className="profile-logout"
                      onClick={handleLogout}
                    >
                      {t("navbar.logout", {
                        defaultValue: "Logout",
                      })}
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
