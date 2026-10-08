import React, { useState } from "react";
import "./login.css";
import { useNavigate, Link } from "react-router-dom";
import bannerImage from "../assets/lg.png";

const roles = [
  { value: "citizen", label: "Citizen" },
  { value: "staff", label: "Staff" },
  { value: "verifier", label: "Verifier" },
  { value: "admin", label: "Admin" },
];

// Backend API
const API_BASE_URL = "http://localhost:3200/api/auth";
const STATS_API_URL = "http://localhost:3200/api/stats"; // stats tracking

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
        // identifier can be an email address or a 10-digit mobile number
        body: JSON.stringify({
          ...loginData,
          identifier: loginData.identifier.trim(),
        }),
      });

      const data = await response.json();

      console.log("Login response:", data);

      if (response.ok && data.success) {
        // ------------------------------------------
        // LOGIN SUCCESS
        // ------------------------------------------

        // Check that backend returned user
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
            await fetch(`${STATS_API_URL}/login`, { method: "POST" });
          } catch (err) {
            console.error("Failed to record citizen login stat:", err);
            // Non-blocking: proceeds with login even if stat tracking fails
          }
        }

        // Notify Navbar / other components
        window.dispatchEvent(new Event("authChange"));

        // ------------------------------------------
        // ✅ FIXED: IMMEDIATE ROLE-BASED REDIRECT (Removed setTimeout)
        // ------------------------------------------
        const userRole = String(data.user.role || "").toLowerCase();
        console.log("🚀 Attempting to navigate to role:", userRole);

        if (userRole === "citizen") {
          navigate("/", { replace: true });
        } else if (userRole === "admin") {
          navigate("/admindashboard", { replace: true });
        } else if (userRole === "staff") {
          navigate("/staffdashboard", { replace: true });
        } else if (userRole === "verifier") {
          navigate("/verifierdashboard", { replace: true });
        } else {
          navigate("/dashboard", { replace: true }); // Fallback
        }
        
      } else {
        // ------------------------------------------
        // LOGIN FAILED
        // ------------------------------------------
        setLoginStatus("failed");

        setLoginError(
          data.message ||
            "Incorrect email/mobile number or password. Please try again."
        );
      }
    } catch (error) {
      console.error("Login error:", error);

      setLoginStatus("failed");

      setLoginError(
        error.message ===
          "Login successful, but user information was not returned."
          ? error.message
          : "Unable to reach the server. Please try again."
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
      {/* ================================
          LOGIN CARD
      ================================= */}
      <div className="login-card">
        {/* ================================
            LEFT BANNER
        ================================= */}
        <div className="login-banner">
          <img src={bannerImage} alt="Better Roads. Stronger Communities." />
        </div>

        {/* ================================
            RIGHT LOGIN SECTION
        ================================= */}
        <div className="login-section">
          <div className="login-box">
            {/* Heading */}
            <h1>Login</h1>

            <p className="login-subtitle">
              Welcome back! Please login to your account.
            </p>

            {/* ================================
                ERROR
            ================================= */}
            {loginStatus === "failed" && (
              <div className="error-banner">
                {loginError ||
                  "Incorrect email/mobile number or password. Please try again."}
              </div>
            )}

            {/* ================================
                SUCCESS
            ================================= */}
            {loginStatus === "success" && (
              <div className="success-banner">
                Login successful. Redirecting...
              </div>
            )}

            {/* ================================
                LOGIN FORM
            ================================= */}
            <form onSubmit={handleSubmit}>
              {/* ROLE */}
              <div className="input-group">
                <select
                  name="role"
                  value={loginData.role}
                  onChange={handleChange}
                  aria-label="Login as"
                  required
                >
                  {roles.map((role) => (
                    <option key={role.value} value={role.value}>
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

              {/* PASSWORD */}
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

              {/* ================================
                  REMEMBER + FORGOT PASSWORD
              ================================= */}
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

                <Link to="/forgot-password" className="forgot-password">
                  Forgot Password?
                </Link>
              </div>

              {/* ================================
                  LOGIN BUTTON
              ================================= */}
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

            {/* ================================
                DIVIDER
            ================================= */}
            <div className="divider">
              <span>or</span>
            </div>

            {/* ================================
                GOOGLE LOGIN
            ================================= */}
            <button
              type="button"
              className="google-button"
              onClick={handleGoogleLogin}
            >
              <span className="google-icon"></span>
              Continue with Google
            </button>

            {/* ================================
                SIGN UP
            ================================= */}
            <p className="signup-text">
              Don't have an account?
              <Link to="/signup">Sign Up</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;