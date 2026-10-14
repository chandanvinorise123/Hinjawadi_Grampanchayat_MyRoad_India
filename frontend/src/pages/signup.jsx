import React, { useState } from "react";
import "./signup.css";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import bannerImageEn from "../assets/su.png";
import bannerImageHi from "../assets/su-hi.png";
import bannerImageMr from "../assets/su-mr.png";


// Base URL for backend API
const API_BASE_URL = "http://localhost:3200/api/auth";

// Indian mobile number: 10 digits, starting with 6-9
const MOBILE_REGEX = /^[6-9]\d{9}$/;

const Signup = () => {
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
  
  const [signupData, setSignupData] = useState({
    role: "citizen",
    name: "",
    email: "",
    mobile: "",
    password: "",
    confirmPassword: "",
    location: "",
  });

  const [signupStatus, setSignupStatus] = useState(null);
  const [signupError, setSignupError] = useState("");
  const [signupLoading, setSignupLoading] = useState(false);

  const roles = [
    { value: "citizen", label: t("signup.roles.citizen") },
    { value: "staff", label: t("signup.roles.staff") },
    { value: "verifier", label: t("signup.roles.verifier") },
    { value: "admin", label: t("signup.roles.admin") },
  ];

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;

    setSignupData((prevData) => ({
      ...prevData,
      [name]: name === "mobile" ? value.replace(/\D/g, "") : value,
    }));
  };

  // Handle signup submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    setSignupError("");
    setSignupStatus(null);

    // Mobile number validation
    if (!MOBILE_REGEX.test(signupData.mobile)) {
      setSignupError(t("signup.errors.invalidMobile"));
      setSignupStatus("failed");
      return;
    }

    // Password match validation
    if (signupData.password !== signupData.confirmPassword) {
      setSignupError(t("signup.errors.passwordMismatch"));
      setSignupStatus("failed");
      return;
    }

    // Minimum password length validation
    if (signupData.password.length < 4) {
      setSignupError(t("signup.errors.passwordTooShort"));
      setSignupStatus("failed");
      return;
    }

    setSignupLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(signupData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSignupStatus("success");

        // Redirect to login after successful signup
        setTimeout(() => {
          navigate("/login");
        }, 1200);
      } else {
        setSignupError(
          data.message || t("signup.errors.general")
        );
        setSignupStatus("failed");
      }
    } catch (err) {
      console.error("Signup error:", err);

      setSignupError(t("signup.errors.serverUnavailable"));
      setSignupStatus("failed");
    } finally {
      setSignupLoading(false);
    }
  };

  // Google OAuth placeholder
  const handleGoogleSignup = () => {
    console.log("Continue with Google clicked");
  };

  return (
    <div className="signup-container">
      {/* SINGLE SIGNUP CARD */}
      <div className="signup-card">

        {/* LEFT BANNER */}
        <div className="signup-banner">
          <img
            src={bannerImage}
            alt={t("signup.bannerAlt")}
          />
        </div>

        {/* RIGHT SIGNUP SECTION */}
        <div className="signup-section">
          <div className="signup-box">

            <h1>{t("signup.title")}</h1>

            <p className="signup-subtitle">
              {t("signup.subtitle")}
            </p>

            {/* ERROR MESSAGE */}
            {signupStatus === "failed" && (
              <div className="error-banner" role="alert">
                {signupError || t("signup.errors.general")}
              </div>
            )}

            {/* SUCCESS MESSAGE */}
            {signupStatus === "success" && (
              <div className="success-banner" role="status">
                {t("signup.success")}
              </div>
            )}

            {/* SIGNUP FORM */}
            <form onSubmit={handleSubmit}>

              {/* ROLE */}
              <div className="input-group">
                <select
                  name="role"
                  value={signupData.role}
                  onChange={handleChange}
                  aria-label={t("signup.registerAs")}
                  required
                >
                  {roles.map((role) => (
                    <option key={role.value} value={role.value}>
                      {t("signup.registerAs")} {role.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* FULL NAME */}
              <div className="input-group">
                <input
                  type="text"
                  name="name"
                  placeholder={t("signup.namePlaceholder")}
                  value={signupData.name}
                  onChange={handleChange}
                  autoComplete="name"
                  aria-label={t("signup.namePlaceholder")}
                  required
                />
              </div>

              {/* EMAIL */}
              <div className="input-group">
                <input
                  type="email"
                  name="email"
                  placeholder={t("signup.emailPlaceholder")}
                  value={signupData.email}
                  onChange={handleChange}
                  autoComplete="email"
                  aria-label={t("signup.emailPlaceholder")}
                  required
                />
              </div>

              {/* MOBILE NUMBER */}
              <div className="input-group">
                <input
                  type="tel"
                  name="mobile"
                  placeholder={t("signup.mobilePlaceholder")}
                  value={signupData.mobile}
                  onChange={handleChange}
                  pattern="[6-9][0-9]{9}"
                  maxLength={10}
                  inputMode="numeric"
                  autoComplete="tel-national"
                  title={t("signup.mobileTitle")}
                  aria-label={t("signup.mobilePlaceholder")}
                  required
                />
              </div>

              {/* PASSWORD */}
              <div className="input-group">
                <input
                  type="password"
                  name="password"
                  placeholder={t("signup.passwordPlaceholder")}
                  value={signupData.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                  aria-label={t("signup.passwordPlaceholder")}
                  required
                />
              </div>

              {/* CONFIRM PASSWORD */}
              <div className="input-group">
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder={t("signup.confirmPasswordPlaceholder")}
                  value={signupData.confirmPassword}
                  onChange={handleChange}
                  autoComplete="new-password"
                  aria-label={t("signup.confirmPasswordPlaceholder")}
                  required
                />
              </div>

              {/* CREATE ACCOUNT */}
              <button
                type="submit"
                className="signup-button"
                disabled={signupLoading}
              >
                {signupLoading ? (
                  t("signup.creatingAccount")
                ) : (
                  <>
                    {t("signup.createAccount")} <span>→</span>
                  </>
                )}
              </button>
            </form>

            {/* DIVIDER */}
            <div className="divider">
              <span>{t("signup.or")}</span>
            </div>

            {/* GOOGLE SIGNUP */}
            <button
              type="button"
              className="google-button"
              onClick={handleGoogleSignup}
            >
              <span className="google-icon"></span>
              {t("signup.continueWithGoogle")}
            </button>

            {/* LOGIN LINK */}
            <p className="login-text">
              {t("signup.alreadyHaveAccount")}{" "}
              <Link to="/login">
                {t("signup.login")}
              </Link>
            </p>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
