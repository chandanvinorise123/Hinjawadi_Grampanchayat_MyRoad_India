import React, { useState } from "react";
import "./dashboard.css";
import CitizenDashboard from "./dashboard/citizendashboard";

const roles = [
  { value: "admin", label: "Admin" },
  { value: "staff", label: "Staff" },
  { value: "verifier", label: "Verifier" },
  { value: "citizen", label: "Citizen" },
];

const roleStats = {
  admin: [
    { label: "Total Complaints", value: 1284, icon: "📋", tone: "navy" },
    { label: "New Complaints", value: 96, icon: "🆕", tone: "blue" },
    { label: "Pending", value: 214, icon: "⏳", tone: "amber" },
    { label: "Under Verification", value: 58, icon: "🔍", tone: "amber" },
    { label: "Under Action", value: 132, icon: "🧰", tone: "orange" },
    { label: "Resolved", value: 742, icon: "✅", tone: "green" },
    { label: "Critical", value: 42, icon: "🚨", tone: "red" },
  ],
  staff: [
    { label: "Assigned to Me", value: 24, icon: "📥", tone: "navy" },
    { label: "Under Action", value: 9, icon: "🧰", tone: "orange" },
    { label: "Resolved by Me", value: 63, icon: "✅", tone: "green" },
    { label: "Critical", value: 3, icon: "🚨", tone: "red" },
  ],
  verifier: [
    { label: "Pending Verification", value: 41, icon: "🔍", tone: "amber" },
    { label: "Verified Today", value: 17, icon: "✅", tone: "green" },
    { label: "Sent Back", value: 6, icon: "↩️", tone: "orange" },
    { label: "Escalated", value: 2, icon: "🚨", tone: "red" },
  ],
  citizen: [
    { label: "My Complaints", value: 5, icon: "📋", tone: "navy" },
    { label: "Pending", value: 2, icon: "⏳", tone: "amber" },
    { label: "In Progress", value: 1, icon: "🧰", tone: "orange" },
    { label: "Resolved", value: 2, icon: "✅", tone: "green" },
  ],
};

const issueCategoryAnalytics = [
  { label: "Road Issues", value: 412, max: 450 },
  { label: "Sewerage Issues", value: 268, max: 450 },
  { label: "Water Issues", value: 231, max: 450 },
  { label: "Streetlight Issues", value: 156, max: 450 },
  { label: "Safety Issues", value: 129, max: 450 },
  { label: "Bridge/Culvert Issues", value: 88, max: 450 },
];

const areaAnalytics = [
  { label: "Ward 1 — North Zone", value: 186 },
  { label: "Ward 2 — Market Road", value: 154 },
  { label: "Ward 3 — Riverside", value: 121 },
  { label: "Ward 4 — Highway Belt", value: 97 },
  { label: "Ward 5 — South Zone", value: 76 },
];

const lifecycleSteps = [
  { label: "Registered", state: "done" },
  { label: "Verified", state: "done" },
  { label: "Assigned", state: "done" },
  { label: "Action", state: "now" },
  { label: "Work Completed", state: "pend" },
  { label: "Verified", state: "pend" },
  { label: "Closed", state: "pend" },
];

const reportCards = [
  { icon: "📅", title: "Daily / Weekly / Monthly Reports", summary: "Scheduled snapshots of complaint activity across all wards." },
  { icon: "📌", title: "Pending / Resolved", summary: "Live split of open versus closed complaints for quick review." },
  { icon: "🗂️", title: "Category-wise Reports", summary: "Breakdown of complaints by issue category over time." },
  { icon: "📍", title: "Area-wise Reports", summary: "Complaint volume and resolution rate by location." },
  { icon: "🚦", title: "Priority-wise Reports", summary: "Critical, urgent, and routine complaints tracked separately." },
  { icon: "🛠️", title: "Action / Work Progress", summary: "Field staff activity and status of ongoing repair work." },
];

const roleCopy = {
  admin: {
    eyebrow: "Dashboard Overview",
    heading: "Complaint management & analytics",
    lead: "A real-time view of every complaint, category, and area across the MyRoad India platform.",
    statsHeading: "Overview at a glance",
  },
  staff: {
    eyebrow: "Staff Dashboard",
    heading: "Your assigned complaints",
    lead: "Track complaints assigned to you, update work status, and monitor resolution progress.",
    statsHeading: "Your work at a glance",
  },
  verifier: {
    eyebrow: "Verifier Dashboard",
    heading: "Complaint verification queue",
    lead: "Review newly registered complaints, verify details, and route them for assignment.",
    statsHeading: "Verification at a glance",
  },
  citizen: {
    eyebrow: "Citizen Dashboard",
    heading: "Your reported complaints",
    lead: "Track the status of every issue you've reported, from registration to resolution.",
    statsHeading: "Your complaints at a glance",
  },
};

// Base URL for your backend API. Update this to match your server
// (e.g. an Express server connected to MongoDB).
const API_BASE_URL = "http://localhost:3200/api/auth";

const Dashboard = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [credentials, setCredentials] = useState({
    identifier: "",
    password: "",
    role: "citizen",
  });
  const [activeRole, setActiveRole] = useState("citizen");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  const handleChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  // Calls your backend, which authenticates against MongoDB
  // and returns { success: true, user: { role, name, email, ... } }
  // or { success: false, message: "..." }.
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Trust the role returned by the backend, not the dropdown value,
        // since the server is the source of truth for who this user is.
        setActiveRole(data.user.role);
        setIsAuthenticated(true);
      } else {
        setLoginError(data.message || "Incorrect username or password. Please try again.");
      }
    } catch (err) {
      setLoginError("Unable to reach the server. Please try again.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCredentials({ identifier: "", password: "", role: "citizen" });
    setLoginError("");
  };

  const copy = roleCopy[activeRole];
  const showAnalytics = activeRole === "admin" || activeRole === "staff";
  const showReports = activeRole === "admin";

  if (!isAuthenticated) {
    return (
      <main className="dashboard-page">
        {/* ================= PAGE HERO ================= */}
        <section className="page-hero">
          <div className="hero-glow"></div>
          <div className="page-hero-inner">
            <div className="breadcrumb">
              Home / <b>Dashboard</b>
            </div>
            <p className="eyebrow eyebrow-light">Login</p>
            <h1>MyRoad India Dashboard</h1>
            <p className="hero-lead">
              Sign in with your credentials to view complaints, analytics,
              and reports relevant to your role.
            </p>
          </div>
        </section>

        {/* ================= LOGIN / AUTHENTICATION ================= */}
        <section className="section">
          <div className="login-shell">
            <div className="login-heading">
              <p className="eyebrow">Login / Authentication</p>
              <h2>Sign in to continue</h2>
            </div>

            {loginError && <div className="error-banner">{loginError}</div>}

            <form className="login-form" onSubmit={handleLogin}>
              <div className="form-field">
                <label htmlFor="role">Login As</label>
                <select
                  id="role"
                  name="role"
                  value={credentials.role}
                  onChange={handleChange}
                  required
                >
                  {roles.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
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
                  placeholder="Enter your registered email"
                  value={credentials.identifier}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-field">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Enter password"
                  value={credentials.password}
                  onChange={handleChange}
                  required
                />
              </div>
              <button className="primary-btn" type="submit" disabled={loginLoading}>
                {loginLoading ? "Logging in..." : <>Log In <span>→</span></>}
              </button>
            </form>
          </div>
        </section>
      </main>
    );
  }

  // Citizens get their own dedicated dashboard component.
  if (activeRole === "citizen") {
    return <CitizenDashboard />;
  }

  return (
    <main className="dashboard-page">
      {/* ================= PAGE HERO ================= */}
      <section className="page-hero">
        <div className="hero-glow"></div>
        <div className="page-hero-inner">
          <div className="breadcrumb">
            Home / <b>Dashboard</b>
          </div>
          <p className="eyebrow eyebrow-light">
            {copy.eyebrow} <span className="role-badge">{roles.find((r) => r.value === activeRole).label}</span>
          </p>
          <h1>{copy.heading}</h1>
          <p className="hero-lead">{copy.lead}</p>
        </div>
        <button
          className="logout-btn"
          type="button"
          onClick={handleLogout}
        >
          Log Out
        </button>
      </section>

      {/* ================= OVERVIEW STATS ================= */}
      <section className="section">
        <div className="section-heading">
          <p className="eyebrow">Complaint Management</p>
          <h2>{copy.statsHeading}</h2>
        </div>

        <div className="stats-grid">
          {roleStats[activeRole].map((stat, i) => (
            <div className={`stat-card tone-${stat.tone}`} key={i}>
              <span className="stat-icon">{stat.icon}</span>
              <div>
                <span className="stat-value">{stat.value.toLocaleString()}</span>
                <span className="stat-label">{stat.label}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ================= ANALYTICS ================= */}
      {showAnalytics && (
        <section className="section surface">
          <div className="analytics-grid">
            {/* Issue Category Analytics */}
            <div className="analytics-card">
              <p className="eyebrow">Issue Category Analytics</p>
              <h3>Complaints by category</h3>
              <div className="bar-list">
                {issueCategoryAnalytics.map((item, i) => (
                  <div className="bar-row" key={i}>
                    <div className="bar-row-top">
                      <span>{item.label}</span>
                      <span className="bar-value">{item.value}</span>
                    </div>
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{ width: `${(item.value / item.max) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Area / Location Analytics */}
            <div className="analytics-card">
              <p className="eyebrow">Area / Location Analytics</p>
              <h3>Area-wise complaints</h3>
              <div className="bar-list">
                {areaAnalytics.map((item, i) => (
                  <div className="bar-row" key={i}>
                    <div className="bar-row-top">
                      <span>{item.label}</span>
                      <span className="bar-value">{item.value}</span>
                    </div>
                    <div className="bar-track">
                      <div
                        className="bar-fill alt"
                        style={{ width: `${(item.value / areaAnalytics[0].value) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
              <span className="map-note">📍 Complaints also plotted on the live map view</span>
            </div>
          </div>
        </section>
      )}

      {/* ================= COMPLAINT STATUS MONITORING ================= */}
      <section className="section">
        <div className="section-heading center">
          <p className="eyebrow center">Complaint Status Monitoring</p>
          <h2>Full lifecycle, tracked end-to-end</h2>
        </div>

        <div className="lifecycle-track">
          {lifecycleSteps.map((step, i) => (
            <div className={`lifecycle-step ${step.state}`} key={i}>
              <div className="lifecycle-dot"></div>
              <span>{step.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ================= REPORTS & ANALYTICS ================= */}
      {showReports && (
        <section className="section surface">
          <div className="section-heading">
            <p className="eyebrow">Reports & Analytics</p>
            <h2>Generate and review reports</h2>
          </div>

          <div className="reports-grid">
            {reportCards.map((report, i) => (
              <div className="report-card" key={i}>
                <span className="report-icon">{report.icon}</span>
                <h4>{report.title}</h4>
                <p>{report.summary}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
};

export default Dashboard;