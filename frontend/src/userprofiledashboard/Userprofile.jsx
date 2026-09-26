import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../dashboard/citizendashboard.css";
import "./userprofile.css";

const API_URL = "http://localhost:3200/api/auth/users";
const MOBILE_REGEX = /^[6-9]\d{9}$/;
const DEFAULT_WARD = "Ward 3 — Riverside";

// Sidebar links. `state` tells the dashboard what to open/scroll to after navigating.
const NAV = [
  {
    label: "Overview",
    items: [
      { icon: "📊", text: "Dashboard", to: "/dashboard" },
      { icon: "👤", text: "My Profile", to: "/profile" },
    ],
  },
  {
    label: "Citizen Functions",
    items: [
      { icon: "📍", text: "Report an Issue", to: "/dashboard", state: { openForm: true } },
      { icon: "🔍", text: "Track Complaint", to: "/dashboard", state: { scrollTo: "my-activity" } },
      { icon: "🗺️", text: "Issues Map", to: "/dashboard", state: { openMap: true, scrollTo: "map-section" } },
      { icon: "📋", text: "My Complaints", to: "/dashboard", state: { scrollTo: "my-activity" }, badge: 3 }, // replace with real count
    ],
  },
  {
    label: "Activity",
    items: [
      { icon: "🔔", text: "Notifications", to: "/dashboard", state: { scrollTo: "notif-panel" }, badge: 3 }, // replace with real count
      { icon: "🕘", text: "Recent Activity", to: "/dashboard", state: { scrollTo: "my-activity" } },
    ],
  },
];

const UserProfile = () => {
  const navigate = useNavigate();

  const stored = JSON.parse(localStorage.getItem("user") || "{}");
  const [profile, setProfile] = useState({
    name: stored.name || "Citizen User",
    email: stored.email || "",
    mobile: stored.mobile || "",
    memberSince: "March 2026",
    ward: stored.location || DEFAULT_WARD,
  });

  // Edit form
  const [form, setForm] = useState({
    name: profile.name,
    mobile: profile.mobile,
    ward: profile.ward,
  });
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null); // { type: "success" | "error", text }

  // Delete account
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);

  const initials = profile.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const jsonHeaders = { "Content-Type": "application/json" };

  const clearSession = () => {
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("authChange"));
  };

  // ---------------- READ: load the latest profile from the server ----------------
  // Nobody logged in -> send the user to log in.
  useEffect(() => {
    if (!stored.id) {
      navigate("/login");
      return;
    }

    const loadProfile = async () => {
      try {
        const response = await fetch(`${API_URL}/${stored.id}`);
        const data = await response.json();

        // The account no longer exists (e.g. deleted)
        if (response.status === 404) {
          clearSession();
          navigate("/login");
          return;
        }

        if (response.ok && data.success) {
          const u = data.user;
          const loaded = {
            name: u.name,
            email: u.email,
            mobile: u.mobile || "",
            ward: u.location || DEFAULT_WARD,
            memberSince: u.createdAt
              ? new Date(u.createdAt).toLocaleDateString("en-IN", { month: "long", year: "numeric" })
              : "March 2026",
          };
          setProfile(loaded);
          setForm({ name: loaded.name, mobile: loaded.mobile, ward: loaded.ward });

          const current = JSON.parse(localStorage.getItem("user") || "{}");
          localStorage.setItem("user", JSON.stringify({ ...current, ...u }));
        }
      } catch (err) {
        // Server unreachable: keep showing the saved details
      }
    };

    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------- UPDATE ----------------
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "mobile" ? value.replace(/\D/g, "") : value,
    }));
  };

  const handleCancel = () => {
    setForm({ name: profile.name, mobile: profile.mobile, ward: profile.ward });
    setEditing(false);
    setNotice(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!form.name.trim())
      return setNotice({ type: "error", text: "Full name is required." });
    if (!MOBILE_REGEX.test(form.mobile))
      return setNotice({
        type: "error",
        text: "Enter a valid 10-digit mobile number starting with 6, 7, 8 or 9.",
      });

    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/${stored.id}`, {
        method: "PUT",
        headers: jsonHeaders,
        body: JSON.stringify({
          name: form.name.trim(),
          mobile: form.mobile,
          location: form.ward,
        }),
      });
      const data = await response.json();

      if (response.ok && data.success) {
        const name = form.name.trim();
        setProfile((p) => ({ ...p, name, mobile: form.mobile, ward: form.ward }));

        const current = JSON.parse(localStorage.getItem("user") || "{}");
        localStorage.setItem(
          "user",
          JSON.stringify({ ...current, name, mobile: form.mobile, location: form.ward })
        );
        window.dispatchEvent(new Event("authChange"));

        setEditing(false);
        setNotice({ type: "success", text: "Profile updated successfully." });
      } else {
        setNotice({
          type: "error",
          text: data.message || "Could not update your profile. Please try again.",
        });
      }
    } catch (err) {
      setNotice({ type: "error", text: "Unable to reach the server. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  // ---------------- DELETE (needs the account password) ----------------
  const handleDelete = async (e) => {
    e.preventDefault();
    setDeleting(true);
    try {
      const response = await fetch(`${API_URL}/${stored.id}`, {
        method: "DELETE",
        headers: jsonHeaders,
        body: JSON.stringify({ password: deletePassword }),
      });
      const data = await response.json();

      if (response.ok && data.success) {
        clearSession();
        navigate("/");
      } else {
        setNotice({
          type: "error",
          text: data.message || "Could not delete your account. Please try again.",
        });
      }
    } catch (err) {
      setNotice({ type: "error", text: "Unable to reach the server. Please try again." });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="cd-shell">
      {/* ============ SIDEBAR ============ */}
      <aside className="cd-sidebar">
        <div className="cd-sb-brand">
          <div className="cd-sb-logo">MI</div>
          <div>
            <b>MyRoad India</b>
            <span>Citizen Portal</span>
          </div>
        </div>

        {NAV.map((group) => (
          <div key={group.label}>
            <div className="cd-sb-label">{group.label}</div>
            <nav className="cd-sb-nav">
              {group.items.map((item) => (
                <button
                  key={item.text}
                  type="button"
                  className={`cd-sb-link ${item.to === "/profile" ? "active" : ""}`}
                  onClick={() => navigate(item.to, { state: item.state })}
                >
                  {item.icon} {item.text}
                  {item.badge && <span className="cd-sb-badge">{item.badge}</span>}
                </button>
              ))}
            </nav>
          </div>
        ))}

        <div className="cd-sb-footer">
          <div className="cd-sb-user">
            <div className="cd-sb-avatar">{initials}</div>
            <div className="cd-sb-user-info">
              <b>{profile.name}</b>
              <span>{profile.mobile ? `+91 ${profile.mobile}` : profile.email}</span>
            </div>
          </div>
          <div className="cd-sb-ward">
            {profile.ward} · Member since {profile.memberSince}
          </div>
        </div>
      </aside>

      {/* ============ MAIN AREA ============ */}
      <div className="cd-main">
        <div className="cd-topbar">
          <div className="cd-search">
            🔍 <input type="text" placeholder="Search your complaints..." />
          </div>
          <div className="cd-tb-actions">
            <button
              type="button"
              className="cd-icon-btn"
              aria-label="Notifications"
              onClick={() => navigate("/dashboard", { state: { scrollTo: "notif-panel" } })}
            >
              🔔<span className="cd-tb-dot"></span>
            </button>
            <button
              className="cd-btn-primary"
              type="button"
              onClick={() => navigate("/dashboard", { state: { openForm: true } })}
            >
              + Report an Issue
            </button>
            <div className="cd-tb-user">
              <div className="cd-tb-avatar">{initials}</div>
              <div>
                <b>{profile.name}</b>
                <span>Citizen Account</span>
              </div>
            </div>
          </div>
        </div>

        {/* ============ CENTER: CITIZEN DETAILS ============ */}
        <div className="cd-content">
          <div className="cd-title-row">
            <div>
              <h1>My Profile</h1>
              <p>Manage your personal details and contact information.</p>
            </div>
          </div>

          {notice && <div className={`cd-banner ${notice.type}`}>{notice.text}</div>}

          <div className="cd-dash-grid">
            {/* ---------- Personal information (update) ---------- */}
            <div className="cd-panel">
              <div className="cd-panel-head">
                <h3>Personal Information</h3>
                {!editing && (
                  <button
                    type="button"
                    className="cd-btn-primary small"
                    onClick={() => setEditing(true)}
                  >
                    Edit Profile
                  </button>
                )}
              </div>

              <form className="cd-new-form" onSubmit={handleSave}>
                <div className="cd-form-row">
                  <div className="cd-field">
                    <label htmlFor="pf-name">Full Name</label>
                    <input
                      id="pf-name"
                      name="name"
                      type="text"
                      value={form.name}
                      onChange={handleChange}
                      disabled={!editing}
                      required
                    />
                  </div>
                  <div className="cd-field">
                    <label htmlFor="pf-email">Email Address</label>
                    <input id="pf-email" type="email" value={profile.email} disabled />
                  </div>
                </div>

                <div className="cd-form-row">
                  <div className="cd-field">
                    <label htmlFor="pf-mobile">Mobile Number</label>
                    <input
                      id="pf-mobile"
                      name="mobile"
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={form.mobile}
                      onChange={handleChange}
                      disabled={!editing}
                      required
                    />
                  </div>
                  <div className="cd-field">
                    <label htmlFor="pf-ward">Ward / Location</label>
                    <input
                      id="pf-ward"
                      name="ward"
                      type="text"
                      value={form.ward}
                      onChange={handleChange}
                      disabled={!editing}
                    />
                  </div>
                </div>

                {editing && (
                  <div className="cd-form-actions">
                    <button type="button" className="cd-btn-outline" onClick={handleCancel}>
                      Cancel
                    </button>
                    <button type="submit" className="cd-btn-primary" disabled={saving}>
                      {saving ? "Saving…" : "Save Changes"}
                    </button>
                  </div>
                )}
              </form>
            </div>

            {/* ---------- Summary card ---------- */}
            <div className="cd-panel cd-profile-card">
              <div className="cd-profile-avatar">{initials}</div>
              <h3>{profile.name}</h3>
              <p>Citizen Account</p>
              <dl className="cd-kv">
                <div>
                  <dt>Member since</dt>
                  <dd>{profile.memberSince}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>
                    <span className="cd-badge cd-badge-green">Active</span>
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* ---------- Delete account ---------- */}
          <div className="cd-panel cd-danger-panel">
            <div className="cd-panel-head">
              <h3>Delete Account</h3>
            </div>
            <div className="cd-danger-body">
              <p>
                Permanently delete your account and personal details. This cannot
                be undone.
              </p>

              {!confirmingDelete ? (
                <button
                  type="button"
                  className="cd-btn-danger"
                  onClick={() => {
                    setConfirmingDelete(true);
                    setNotice(null);
                  }}
                >
                  Delete My Account
                </button>
              ) : (
                <form className="cd-danger-form" onSubmit={handleDelete}>
                  <div className="cd-field">
                    <label htmlFor="pf-delete-password">Enter your password to confirm</label>
                    <input
                      id="pf-delete-password"
                      type="password"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      autoComplete="current-password"
                      required
                    />
                  </div>
                  <div className="cd-form-actions">
                    <button
                      type="button"
                      className="cd-btn-outline"
                      onClick={() => {
                        setConfirmingDelete(false);
                        setDeletePassword("");
                      }}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="cd-btn-danger" disabled={deleting}>
                      {deleting ? "Deleting…" : "Yes, Delete My Account"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;