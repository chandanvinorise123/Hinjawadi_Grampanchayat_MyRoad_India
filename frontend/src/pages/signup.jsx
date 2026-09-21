import React, { useState } from "react";
import "./signup.css";
import { useNavigate, Link } from "react-router-dom";
import bannerImage from "../assets/signup-banner.png";

const roles = [
  { value: "citizen", label: "Citizen" },
  { value: "staff", label: "Staff" },
  { value: "verifier", label: "Verifier" },
  { value: "admin", label: "Admin" },
];

// Base URL for your backend API
const API_BASE_URL = "http://localhost:3200/api/auth";

const Signup = () => {
  const navigate = useNavigate();

  const [signupData, setSignupData] = useState({
    role: "citizen",
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    mobile: "",
    location: "",
  });

  const [signupStatus, setSignupStatus] = useState(null);
  const [signupError, setSignupError] = useState("");
  const [signupLoading, setSignupLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setSignupData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setSignupError("");
    setSignupStatus(null);

    // Password validation
    if (signupData.password !== signupData.confirmPassword) {
      setSignupError("Passwords do not match.");
      setSignupStatus("failed");
      return;
    }

    if (signupData.password.length < 4) {
      setSignupError("Password must be at least 4 characters long.");
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
          data.message ||
            "Something went wrong. Please check your details and try again."
        );
        setSignupStatus("failed");
      }
    } catch (err) {
      setSignupError("Unable to reach the server. Please try again.");
      setSignupStatus("failed");
    } finally {
      setSignupLoading(false);
    }
  };

  // Placeholder for Google OAuth
  const handleGoogleSignup = () => {
    // TODO: integrate Google OAuth
    console.log("Continue with Google clicked");
  };

  return (
    <div className="signup-container">
      {/* ================= SINGLE SIGNUP CARD ================= */}
      <div className="signup-card">

        {/* ================= LEFT BANNER ================= */}
        <div className="signup-banner">
          <img
            src={bannerImage}
            alt="Better Roads. Stronger Communities."
          />
        </div>

        {/* ================= RIGHT SIGNUP SECTION ================= */}
        <div className="signup-section">
          <div className="signup-box">

            <h1>Sign Up</h1>

            <p className="signup-subtitle">
              Create your account and be a part of safer and stronger
              communities.
            </p>

            {/* Error Message */}
            {signupStatus === "failed" && (
              <div className="error-banner">
                {signupError ||
                  "Please fill all fields correctly — passwords must match and be at least 4 characters."}
              </div>
            )}

            {/* Success Message */}
            {signupStatus === "success" && (
              <div className="success-banner">
                Account created successfully. Redirecting you to login...
              </div>
            )}

            <form onSubmit={handleSubmit}>

              {/* ================= ROLE ================= */}
              <div className="input-group">
                <select
                  name="role"
                  value={signupData.role}
                  onChange={handleChange}
                  aria-label="Register as"
                >
                  {roles.map((role) => (
                    <option key={role.value} value={role.value}>
                      Register as {role.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* ================= FULL NAME ================= */}
              <div className="input-group">
                <input
                  type="text"
                  name="name"
                  placeholder="Full Name"
                  value={signupData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* ================= EMAIL ================= */}
              <div className="input-group">
                <input
                  type="email"
                  name="email"
                  placeholder="Email Address"
                  value={signupData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* ================= PASSWORD ================= */}
              <div className="input-group">
                <input
                  type="password"
                  name="password"
                  placeholder="Password"
                  value={signupData.password}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* ================= CONFIRM PASSWORD ================= */}
              <div className="input-group">
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="Confirm Password"
                  value={signupData.confirmPassword}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* ================= MOBILE ================= */}
              <div className="input-group">
                <input
                  type="tel"
                  name="mobile"
                  placeholder="Mobile Number"
                  value={signupData.mobile}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* ================= LOCATION ================= */}
              <div className="input-group">
                <input
                  type="text"
                  name="location"
                  placeholder="Location (City)"
                  value={signupData.location}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* ================= CREATE ACCOUNT ================= */}
              <button
                type="submit"
                className="signup-button"
                disabled={signupLoading}
              >
                {signupLoading ? (
                  "Creating account..."
                ) : (
                  <>
                    Create Account <span>→</span>
                  </>
                )}
              </button>
            </form>

            {/* ================= DIVIDER ================= */}
            <div className="divider">
              <span>or</span>
            </div>

            {/* ================= GOOGLE ================= */}
            <button
              type="button"
              className="google-button"
              onClick={handleGoogleSignup}
            >
              <span className="google-icon"></span>
              Continue with Google
            </button>

            {/* ================= LOGIN ================= */}
            <p className="login-text">
              Already have an account?
              <Link to="/login">Login</Link>
            </p>

          </div>
        </div>

      </div>
    </div>
  );
};

export default Signup;