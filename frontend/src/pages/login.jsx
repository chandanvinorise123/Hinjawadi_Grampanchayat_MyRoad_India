import React, { useState } from "react";
import "./login.css";

const roles = [
  { value: "citizen", label: "Citizen", icon: "🧑" },
  { value: "staff", label: "Staff", icon: "🧰" },
  { value: "verifier", label: "Verifier", icon: "🔍" },
  { value: "admin", label: "Admin", icon: "🛡️" },
];

const authFlowSteps = ["Enter Credentials", "Authentication", "Check Role", "Dashboard"];

// Base URL for your backend API. Update this to match your server
// (e.g. an Express server connected to MongoDB).
const API_BASE_URL = "http://localhost:3200/api/auth";

const Login = () => {
  const [activeTab, setActiveTab] = useState("login");

  const [loginData, setLoginData] = useState({
    role: "citizen",
    identifier: "",
    password: "",
  });
  const [loginStatus, setLoginStatus] = useState(null); // null | "success" | "failed"
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [signupData, setSignupData] = useState({
    role: "citizen",
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [signupStatus, setSignupStatus] = useState(null); // null | "success" | "failed"
  const [signupError, setSignupError] = useState("");
  const [signupLoading, setSignupLoading] = useState(false);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setLoginStatus(null);
    setSignupStatus(null);
    setLoginError("");
    setSignupError("");
  };

  const handleLoginChange = (e) => {
    setLoginData({ ...loginData, [e.target.name]: e.target.value });
  };

  const handleSignupChange = (e) => {
    setSignupData({ ...signupData, [e.target.name]: e.target.value });
  };

  // Calls your backend, which should authenticate against MongoDB
  // and return { success: true, ... } or { success: false, message: "..." }.
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setLoginStatus("success");
      } else {
        setLoginError(data.message || "Incorrect username or password. Please try again.");
        setLoginStatus("failed");
      }
    } catch (err) {
      setLoginError("Unable to reach the server. Please try again.");
      setLoginStatus("failed");
    } finally {
      setLoginLoading(false);
    }
  };

  // Calls your backend, which should create a new user document in MongoDB
  // and return { success: true, ... } or { success: false, message: "..." }.
  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setSignupError("");

    if (signupData.password !== signupData.confirmPassword) {
      setSignupError("Passwords do not match.");
      setSignupStatus("failed");
      return;
    }

    setSignupLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signupData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSignupStatus("success");
      } else {
        setSignupError(data.message || "Something went wrong. Please check your details and try again.");
        setSignupStatus("failed");
      }
    } catch (err) {
      setSignupError("Unable to reach the server. Please try again.");
      setSignupStatus("failed");
    } finally {
      setSignupLoading(false);
    }
  };

  const loggedInRole = roles.find((r) => r.value === loginData.role);
  const registeredRole = roles.find((r) => r.value === signupData.role);

  return (
    <main className="login-page">
      {/* ================= PAGE HERO ================= */}
      <section className="page-hero">
        <div className="hero-glow"></div>
        <div className="page-hero-inner">
          <div className="breadcrumb">
            Home / <b>Login</b>
          </div>
          <p className="eyebrow eyebrow-light">Account Access</p>
          <h1>Sign in or create your account</h1>
          <p className="hero-lead">
            Citizens, field staff, verifiers, and admins all access MyRoad
            India through the same secure login.
          </p>
        </div>
      </section>

      {/* ================= AUTH CARD ================= */}
      <section className="section">
        <div className="auth-shell">
          <div className="auth-tabs">
            <button
              type="button"
              className={`auth-tab ${activeTab === "login" ? "active" : ""}`}
              onClick={() => handleTabChange("login")}
            >
              Login
            </button>
            <button
              type="button"
              className={`auth-tab ${activeTab === "signup" ? "active" : ""}`}
              onClick={() => handleTabChange("signup")}
            >
              Sign Up
            </button>
          </div>

          {/* ---------------- LOGIN FORM ---------------- */}
          {activeTab === "login" && (
            <>
              {loginStatus === "success" ? (
                <div className="status-card success">
                  <span className="status-icon">✓</span>
                  <h3>Authenticated as {loggedInRole.label}</h3>
                  <p>
                    Login successful. Redirecting you to the {loggedInRole.label}{" "}
                    Dashboard...
                  </p>
                  <button
                    className="secondary-btn"
                    type="button"
                    onClick={() => setLoginStatus(null)}
                  >
                    Back to Login
                  </button>
                </div>
              ) : (
                <form className="auth-form" onSubmit={handleLoginSubmit}>
                  {loginStatus === "failed" && (
                    <div className="error-banner">
                      {loginError || "Incorrect username or password. Please try again."}
                    </div>
                  )}

                  <div className="form-field">
                    <label htmlFor="login-role">Login As</label>
                    <select
                      id="login-role"
                      name="role"
                      value={loginData.role}
                      onChange={handleLoginChange}
                    >
                      {roles.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.icon} {role.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-field">
                    <label htmlFor="identifier">Username / Email</label>
                    <input
                      id="identifier"
                      name="identifier"
                      type="text"
                      placeholder="Enter your username or email"
                      value={loginData.identifier}
                      onChange={handleLoginChange}
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="password">Password</label>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="Enter your password"
                      value={loginData.password}
                      onChange={handleLoginChange}
                      required
                    />
                  </div>

                  <button className="primary-btn" type="submit" disabled={loginLoading}>
                    {loginLoading ? "Logging in..." : <>Log In <span>→</span></>}
                  </button>

                  <p className="auth-switch">
                    Don't have an account?{" "}
                    <button
                      type="button"
                      className="link-btn"
                      onClick={() => handleTabChange("signup")}
                    >
                      Sign up here
                    </button>
                  </p>
                </form>
              )}
            </>
          )}

          {/* ---------------- SIGN UP FORM ---------------- */}
          {activeTab === "signup" && (
            <>
              {signupStatus === "success" ? (
                <div className="status-card success">
                  <span className="status-icon">✓</span>
                  <h3>Account created as {registeredRole.label}</h3>
                  <p>
                    Your account has been registered. You can now log in to
                    access your {registeredRole.label} Dashboard.
                  </p>
                  <button
                    className="secondary-btn"
                    type="button"
                    onClick={() => {
                      setSignupStatus(null);
                      handleTabChange("login");
                    }}
                  >
                    Go to Login
                  </button>
                </div>
              ) : (
                <form className="auth-form" onSubmit={handleSignupSubmit}>
                  {signupStatus === "failed" && (
                    <div className="error-banner">
                      {signupError || "Please fill all fields correctly — passwords must match and be at least 4 characters."}
                    </div>
                  )}

                  <div className="form-field">
                    <label htmlFor="signup-role">Register As</label>
                    <select
                      id="signup-role"
                      name="role"
                      value={signupData.role}
                      onChange={handleSignupChange}
                    >
                      {roles.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.icon} {role.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-field">
                    <label htmlFor="name">Full Name</label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      placeholder="Enter your full name"
                      value={signupData.name}
                      onChange={handleSignupChange}
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="email">Email Address</label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="Enter your email"
                      value={signupData.email}
                      onChange={handleSignupChange}
                      required
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-field">
                      <label htmlFor="signup-password">Password</label>
                      <input
                        id="signup-password"
                        name="password"
                        type="password"
                        placeholder="Create a password"
                        value={signupData.password}
                        onChange={handleSignupChange}
                        required
                      />
                    </div>
                    <div className="form-field">
                      <label htmlFor="confirmPassword">Confirm Password</label>
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        placeholder="Re-enter password"
                        value={signupData.confirmPassword}
                        onChange={handleSignupChange}
                        required
                      />
                    </div>
                  </div>

                  <button className="primary-btn" type="submit" disabled={signupLoading}>
                    {signupLoading ? "Creating account..." : <>Create Account <span>→</span></>}
                  </button>

                  <p className="auth-switch">
                    Already have an account?{" "}
                    <button
                      type="button"
                      className="link-btn"
                      onClick={() => handleTabChange("login")}
                    >
                      Log in here
                    </button>
                  </p>
                </form>
              )}
            </>
          )}
        </div>
      </section>

      {/* ================= AUTHENTICATION FLOW ================= */}
      <section className="section surface">
        <div className="section-heading center">
          <p className="eyebrow center">How Login Works</p>
          <h2>From credentials to your dashboard</h2>
        </div>

        <div className="flow-track">
          {authFlowSteps.map((step, i) => (
            <React.Fragment key={i}>
              <div className="flow-step">
                <div className="flow-dot">{i + 1}</div>
                <span>{step}</span>
              </div>
              {i < authFlowSteps.length - 1 && <div className="flow-arrow">→</div>}
            </React.Fragment>
          ))}
        </div>

        <div className="branch-row">
          <div className="branch-card fail">
            <span className="branch-icon">✕</span>
            <div>
              <h4>Failed</h4>
              <p>Incorrect credentials show an error message to try again.</p>
            </div>
          </div>
          <div className="branch-card success">
            <span className="branch-icon">✓</span>
            <div>
              <h4>Success</h4>
              <p>Your role is checked and you're sent to the right dashboard.</p>
            </div>
          </div>
        </div>

        <div className="role-grid">
          {roles.map((role, i) => (
            <div className="role-card" key={i}>
              <span className="role-icon">{role.icon}</span>
              <h4>{role.label}</h4>
              <p>Dashboard</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
};

export default Login;