import React, { useState } from "react";
import "./dashboard.css";
import bannerImage from "../assets/db.png";
import CitizenDashboard from "../dashboard/citizendashboard";
import StaffDashboard from "../dashboard/staffdashboard";
import AdminDashboard from "../dashboard/admindashboard";
import VerifierDashboard from "../dashboard/verifierdashboard";
/* ================= LINE ICONS (no emoji, consistent stroke weight) ================= */
const Icon = {
  Clipboard: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="6" y="4" width="12" height="16" rx="2" />
      <path d="M9 4V3a1 1 0 011-1h4a1 1 0 011 1v1M9 10h6M9 14h6" />
    </svg>
  ),
  New: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18" />
    </svg>
  ),
  Clock: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  ),
  Search: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  ),
  Wrench: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M14.7 6.3a4 4 0 00-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 005.4-5.4l-2.3 2.3-2-2z" />
    </svg>
  ),
  Check: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M5 13l4 4L19 7" />
    </svg>
  ),
  Alert: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3l10 18H2z" />
      <path d="M12 10v4M12 17h.01" />
    </svg>
  ),
  Inbox: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 12h4l2 3h6l2-3h4" />
      <path d="M5 5h14l2 7v7a2 2 0 01-2 2H5a2 2 0 01-2-2v-7z" />
    </svg>
  ),
  Undo: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9 14l-4-4 4-4" />
      <path d="M5 10h9a5 5 0 010 10h-1" />
    </svg>
  ),
  Calendar: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </svg>
  ),
  Layers: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3l9 5-9 5-9-5 9-5z" />
      <path d="M3 13l9 5 9-5" />
    </svg>
  ),
  MapPin: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 21s7-6.5 7-11a7 7 0 10-14 0c0 4.5 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.4" />
    </svg>
  ),
  TrafficLight: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="8" y="2" width="8" height="16" rx="3" />
      <path d="M12 22v-2M9 6h.01M12 10h.01M15 6h.01" />
    </svg>
  ),
  Arrow: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  ),
};
const roles = [
  { value: "admin", label: "Admin" },
  { value: "staff", label: "Staff" },
  { value: "verifier", label: "Verifier" },
  { value: "citizen", label: "Citizen" },
];

const roleStats = {
  admin: [
    { label: "Total Complaints", value: 1284, icon: Icon.Clipboard, tone: "navy" },
    { label: "New Complaints", value: 96, icon: Icon.New, tone: "blue" },
    { label: "Pending", value: 214, icon: Icon.Clock, tone: "amber" },
    { label: "Under Verification", value: 58, icon: Icon.Search, tone: "amber" },
    { label: "Under Action", value: 132, icon: Icon.Wrench, tone: "orange" },
    { label: "Resolved", value: 742, icon: Icon.Check, tone: "green" },
    { label: "Critical", value: 42, icon: Icon.Alert, tone: "red" },
  ],
  staff: [
    { label: "Assigned to Me", value: 24, icon: Icon.Inbox, tone: "navy" },
    { label: "Under Action", value: 9, icon: Icon.Wrench, tone: "orange" },
    { label: "Resolved by Me", value: 63, icon: Icon.Check, tone: "green" },
    { label: "Critical", value: 3, icon: Icon.Alert, tone: "red" },
  ],
  verifier: [
    { label: "Pending Verification", value: 41, icon: Icon.Search, tone: "amber" },
    { label: "Verified Today", value: 17, icon: Icon.Check, tone: "green" },
    { label: "Sent Back", value: 6, icon: Icon.Undo, tone: "orange" },
    { label: "Escalated", value: 2, icon: Icon.Alert, tone: "red" },
  ],
  citizen: [
    { label: "My Complaints", value: 5, icon: Icon.Clipboard, tone: "navy" },
    { label: "Pending", value: 2, icon: Icon.Clock, tone: "amber" },
    { label: "In Progress", value: 1, icon: Icon.Wrench, tone: "orange" },
    { label: "Resolved", value: 2, icon: Icon.Check, tone: "green" },
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
  { icon: Icon.Calendar, title: "Daily / Weekly / Monthly Reports", summary: "Scheduled snapshots of complaint activity across all wards." },
  { icon: Icon.Clipboard, title: "Pending / Resolved", summary: "Live split of open versus closed complaints for quick review." },
  { icon: Icon.Layers, title: "Category-wise Reports", summary: "Breakdown of complaints by issue category over time." },
  { icon: Icon.MapPin, title: "Area-wise Reports", summary: "Complaint volume and resolution rate by location." },
  { icon: Icon.TrafficLight, title: "Priority-wise Reports", summary: "Critical, urgent, and routine complaints tracked separately." },
  { icon: Icon.Wrench, title: "Action / Work Progress", summary: "Field staff activity and status of ongoing repair work." },
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

// Read the logged-in user saved by the Login page / this page
const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch {
    return null;
  }
};

const Dashboard = () => {
  // Start logged in if a user is already saved (keeps you signed in when
  // you navigate to another page, such as My Profile, and come back)
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!getStoredUser());
  const [credentials, setCredentials] = useState({
    identifier: "",
    password: "",
    role: "citizen",
  });
  const [activeRole, setActiveRole] = useState(() => getStoredUser()?.role || "citizen");
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
        // Save the user so other pages (My Profile) and refreshes can use it
        localStorage.setItem("user", JSON.stringify(data.user));
        window.dispatchEvent(new Event("authChange"));

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
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("authChange"));
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
        {/* ================= PAGE HERO — banner as full-cover background ================= */}
        <section
          className="page-hero"
          style={{ backgroundImage: `url(${bannerImage})` }}
        >
          <div className="hero-scrim"></div>
          {/* <div className="page-hero-inner">
            <div className="breadcrumb">
              Home / <b>Dashboard</b>
            </div>
            <p className="eyebrow eyebrow-light">Login</p>
            <h1>MyRoad India Dashboard</h1>
            <p className="hero-lead">
              Sign in with your credentials to view complaints, analytics,
              and reports relevant to your role.
            </p>
          </div> */}
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
                {loginLoading ? "Logging in..." : <>Log In <Icon.Arrow /></>}
              </button>
            </form>
          </div>
        </section>
      </main>
    );
  }

  // Each role gets its own dedicated dashboard component.
  if (activeRole === "citizen") {
    return <CitizenDashboard />;
  }

  if (activeRole === "staff") {
    return <StaffDashboard />;
  }

  if (activeRole === "admin") {
    return <AdminDashboard />;
  }

  if (activeRole === "verifier") {
    return <VerifierDashboard />;
  }

  return (
    <main className="dashboard-page">
      {/* ================= PAGE HERO — banner as full-cover background ================= */}
      <section
        className="page-hero"
        style={{ backgroundImage: `url(${bannerImage})` }}
      >
        <div className="hero-scrim"></div>
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
          {roleStats[activeRole].map((stat, i) => {
            const StatIcon = stat.icon;
            return (
              <div className={`stat-card tone-${stat.tone}`} key={i}>
                <span className={`stat-icon-badge tone-${stat.tone}`}>
                  <StatIcon />
                </span>
                <div>
                  <span className="stat-value">{stat.value.toLocaleString()}</span>
                  <span className="stat-label">{stat.label}</span>
                </div>
              </div>
            );
          })}
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
              <span className="map-note">
                <Icon.MapPin /> Complaints also plotted on the live map view
              </span>
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
            {reportCards.map((report, i) => {
              const ReportIcon = report.icon;
              return (
                <div className="report-card" key={i}>
                  <span className="report-icon-badge">
                    <ReportIcon />
                  </span>
                  <h4>{report.title}</h4>
                  <p>{report.summary}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
};

export default Dashboard;