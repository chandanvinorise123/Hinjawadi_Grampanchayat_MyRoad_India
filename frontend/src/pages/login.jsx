import React, { useState } from "react";
import "./login.css";
import { useNavigate, Link } from "react-router-dom";
import bannerImage from "../assets/login-banner.png";

const roles = [
  { value: "citizen", label: "Citizen" },
  { value: "staff", label: "Staff" },
  { value: "verifier", label: "Verifier" },
  { value: "admin", label: "Admin" },
];

// Base URL for your backend API
const API_BASE_URL = "http://localhost:3200/api/auth";

const Login = () => {
  const navigate = useNavigate();

  const [loginData, setLoginData] = useState({
    role: "citizen",
    identifier: "",
    password: "",
    remember: false,
  });

  const [loginStatus, setLoginStatus] = useState(null);
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setLoginData({
      ...loginData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  // Login API
  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoginError("");
    setLoginLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        // identifier can be an email address or a 10-digit mobile number
        body: JSON.stringify({
          ...loginData,
          identifier: loginData.identifier.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setLoginStatus("success");

        // Save logged-in user
        localStorage.setItem("user", JSON.stringify(data.user));

        // Notify Navbar about authentication change
        window.dispatchEvent(new Event("authChange"));

        // Redirect to Home
        setTimeout(() => {
          navigate("/");
        }, 1000);
      } else {
        setLoginError(
          data.message ||
          "Incorrect email/mobile number or password. Please try again."
        );

        setLoginStatus("failed");
      }
    } catch (err) {
      setLoginError(
        "Unable to reach the server. Please try again."
      );

      setLoginStatus("failed");
    } finally {
      setLoginLoading(false);
    }
  };

  // Google OAuth placeholder
  const handleGoogleLogin = () => {
    console.log("Continue with Google clicked");
  };

  return (
    <div className="login-container">

      {/* =====================================================
          LOGIN CARD
          Banner + Login Section are now inside one wrapper
          ===================================================== */}
      <div className="login-card">

        {/* =================================================
            LEFT BANNER
            ================================================= */}
        <div className="login-banner">
          <img
            src={bannerImage}
            alt="Better Roads. Stronger Communities."
          />
        </div>

        {/* =================================================
            RIGHT LOGIN SECTION
            ================================================= */}
        <div className="login-section">
          <div className="login-box">

            {/* Login Heading */}
            <h1>Login</h1>

            <p className="login-subtitle">
              Welcome back! Please login to your account.
            </p>

            {/* =================================================
                ERROR MESSAGE
                ================================================= */}
            {loginStatus === "failed" && (
              <div className="error-banner">
                {loginError ||
                  "Incorrect email/mobile number or password. Please try again."}
              </div>
            )}

            {/* =================================================
                SUCCESS MESSAGE
                ================================================= */}
            {loginStatus === "success" && (
              <div className="success-banner">
                Login successful. Redirecting...
              </div>
            )}

            {/* =================================================
                LOGIN FORM
                ================================================= */}
            <form onSubmit={handleSubmit}>

              {/* Role */}
              <div className="input-group">
                <select
                  name="role"
                  value={loginData.role}
                  onChange={handleChange}
                  aria-label="Login as"
                >
                  {roles.map((role) => (
                    <option
                      key={role.value}
                      value={role.value}
                    >
                      Login as {role.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Email / Mobile Number */}
              <div className="input-group">
                <input
                  type="text"
                  name="identifier"
                  placeholder="Email or Mobile Number"
                  value={loginData.identifier}
                  onChange={handleChange}
                  autoComplete="username"
                  required
                />
              </div>

              {/* Password */}
              <div className="input-group">
                <input
                  type="password"
                  name="password"
                  placeholder="Password"
                  value={loginData.password}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* =================================================
                  REMEMBER ME + FORGOT PASSWORD
                  ================================================= */}
              <div className="login-options">

                <label className="remember">
                  <input
                    type="checkbox"
                    name="remember"
                    checked={loginData.remember}
                    onChange={handleChange}
                  />

                  <span>Remember me</span>
                </label>

                <Link
                  to="/forgot-password"
                  className="forgot-password"
                >
                  Forgot Password?
                </Link>

              </div>

              {/* =================================================
                  LOGIN BUTTON
                  ================================================= */}
              <button
                type="submit"
                className="login-button"
                disabled={loginLoading}
              >
                {loginLoading ? (
                  "Logging in..."
                ) : (
                  <>
                    Login <span>→</span>
                  </>
                )}
              </button>

            </form>

            {/* =================================================
                DIVIDER
                ================================================= */}
            <div className="divider">
              <span>or</span>
            </div>

            {/* =================================================
                GOOGLE LOGIN
                ================================================= */}
            <button
              type="button"
              className="google-button"
              onClick={handleGoogleLogin}
            >
              <span className="google-icon"></span>

              Continue with Google
            </button>

            {/* =================================================
                SIGN UP LINK
                ================================================= */}
            <p className="signup-text">
              Don't have an account?

              <Link to="/signup">
                Sign Up
              </Link>
            </p>

          </div>
        </div>

      </div>
    </div>
  );
};

export default Login;