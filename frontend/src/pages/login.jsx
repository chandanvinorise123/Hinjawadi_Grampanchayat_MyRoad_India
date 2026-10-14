import React, { useState } from "react";
import "./login.css";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import bannerImageEn from "../assets/lg.png";
import bannerImageHi from "../assets/lg-hi.png";
import bannerImageMr from "../assets/lg-mr.png";


const API_BASE_URL = "http://localhost:3200/api/auth";
const STATS_API_URL = "http://localhost:3200/api/stats";

const Login = () => {
  const navigate = useNavigate();
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
  
  const [loginData, setLoginData] = useState({
    role: "citizen",
    identifier: "",
    password: "",
    remember: false,
  });

  const [loginStatus, setLoginStatus] = useState(null);
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const roles = [
    { value: "citizen", label: t("login.roles.citizen") },
    { value: "staff", label: t("login.roles.staff") },
    { value: "verifier", label: t("login.roles.verifier") },
    { value: "admin", label: t("login.roles.admin") },
  ];

  // Handle input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setLoginData((previousData) => ({
      ...previousData,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Login API
  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoginError("");
    setLoginStatus(null);
    setLoginLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...loginData,
          identifier: loginData.identifier.trim(),
        }),
      });

      const data = await response.json();

      console.log("Login response:", data);

      if (response.ok && data.success) {
        if (!data.user) {
          throw new Error(
            "Login successful, but user information was not returned."
          );
        }

        setLoginStatus("success");

        // Save logged-in user
        localStorage.setItem("user", JSON.stringify(data.user));

        // Record successful citizen login for statistics
        if (String(data.user.role).toLowerCase() === "citizen") {
          try {
            await fetch(`${STATS_API_URL}/login`, {
              method: "POST",
            });
          } catch (err) {
            console.error("Failed to record citizen login stat:", err);
          }
        }

        // Notify Navbar and other components
        window.dispatchEvent(new Event("authChange"));

        // Role-based redirect
        const userRole = String(data.user.role || "").toLowerCase();

        if (userRole === "citizen") {
          navigate("/", { replace: true });
        } else if (userRole === "admin") {
          navigate("/admindashboard", { replace: true });
        } else if (userRole === "staff") {
          navigate("/staffdashboard", { replace: true });
        } else if (userRole === "verifier") {
          navigate("/verifierdashboard", { replace: true });
        } else {
          navigate("/dashboard", { replace: true });
        }
      } else {
        setLoginStatus("failed");
        setLoginError(
          data.message || t("login.errors.invalidCredentials")
        );
      }
    } catch (error) {
      console.error("Login error:", error);

      setLoginStatus("failed");

      setLoginError(
        error.message ===
          "Login successful, but user information was not returned."
          ? t("login.errors.userNotReturned")
          : t("login.errors.serverUnavailable")
      );
    } finally {
      setLoginLoading(false);
    }
  };

  // Google Login
  const handleGoogleLogin = () => {
    console.log("Continue with Google clicked");
  };

  return (
    <div className="login-container">
      <div className="login-card">
        {/* LEFT BANNER */}
        <div className="login-banner">
          <img
            src={bannerImage}
            alt={t("login.bannerAlt")}
          />
        </div>

        {/* RIGHT LOGIN SECTION */}
        <div className="login-section">
          <div className="login-box">
            <h1>{t("login.title")}</h1>

            <p className="login-subtitle">
              {t("login.subtitle")}
            </p>

            {/* ERROR */}
            {loginStatus === "failed" && (
              <div className="error-banner" role="alert">
                {loginError || t("login.errors.invalidCredentials")}
              </div>
            )}

            {/* SUCCESS */}
            {loginStatus === "success" && (
              <div className="success-banner" role="status">
                {t("login.success")}
              </div>
            )}

            {/* LOGIN FORM */}
            <form onSubmit={handleSubmit}>
              {/* ROLE */}
              <div className="input-group">
                <select
                  name="role"
                  value={loginData.role}
                  onChange={handleChange}
                  aria-label={t("login.loginAs")}
                  required
                >
                  {roles.map((role) => (
                    <option key={role.value} value={role.value}>
                      {t("login.loginAs")} {role.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* EMAIL / MOBILE NUMBER */}
              <div className="input-group">
                <input
                  type="text"
                  name="identifier"
                  placeholder={t("login.identifierPlaceholder")}
                  value={loginData.identifier}
                  onChange={handleChange}
                  autoComplete="username"
                  aria-label={t("login.identifierPlaceholder")}
                  required
                />
              </div>

              {/* PASSWORD */}
              <div className="input-group">
                <input
                  type="password"
                  name="password"
                  placeholder={t("login.passwordPlaceholder")}
                  value={loginData.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                  aria-label={t("login.passwordPlaceholder")}
                  required
                />
              </div>

              {/* REMEMBER + FORGOT PASSWORD */}
              <div className="login-options">
                <label className="remember">
                  <input
                    type="checkbox"
                    name="remember"
                    checked={loginData.remember}
                    onChange={handleChange}
                  />
                  <span>{t("login.rememberMe")}</span>
                </label>

                <Link
                  to="/forgot-password"
                  className="forgot-password"
                >
                  {t("login.forgotPassword")}
                </Link>
              </div>

              {/* LOGIN BUTTON */}
              <button
                type="submit"
                className="login-button"
                disabled={loginLoading}
              >
                {loginLoading ? (
                  t("login.loggingIn")
                ) : (
                  <>
                    {t("login.submit")} <span>→</span>
                  </>
                )}
              </button>
            </form>

            {/* DIVIDER */}
            <div className="divider">
              <span>{t("login.or")}</span>
            </div>

            {/* GOOGLE LOGIN */}
            <button
              type="button"
              className="google-button"
              onClick={handleGoogleLogin}
            >
              <span className="google-icon"></span>
              {t("login.continueWithGoogle")}
            </button>

            {/* SIGN UP */}
            <p className="signup-text">
              {t("login.noAccount")}{" "}
              <Link to="/signup">
                {t("login.signUp")}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
