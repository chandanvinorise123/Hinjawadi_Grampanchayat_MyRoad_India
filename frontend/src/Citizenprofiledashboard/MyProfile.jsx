import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./MyProfile.css";
import { API_BASE_URL, toMediaUrl, uploadProfilePhoto } from "../utils/dashboardApi";

const API_URL = `${API_BASE_URL}/auth/users`;
const MOBILE_REGEX = /^[6-9]\d{9}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ✅ Accept onBack as a prop
const MyProfile = ({ onBack }) => {
  const navigate = useNavigate();

  const [storedUser, setStoredUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch (e) {
      return {};
    }
  });

  const [profile, setProfile] = useState({
    name: storedUser.name || "",
    email: storedUser.email || "",
    mobile: storedUser.mobile || "",
    profilePhoto: storedUser.profilePhoto || "",
    userId: storedUser.userId || storedUser.id || "N/A",
    ward: storedUser.location || "",
    memberSince: storedUser.createdAt ? new Date(storedUser.createdAt).toLocaleDateString("en-IN", { month: "long", year: "numeric" }) : "",
  });

  const [form, setForm] = useState({
    name: profile.name,
    email: profile.email,
    mobile: profile.mobile,
    ward: profile.ward,
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [editing, setEditing] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState(null);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");

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

  useEffect(() => {
    if (!storedUser.id) {
      navigate("/login");
      return;
    }

    const loadProfile = async () => {
      try {
        const response = await fetch(`${API_URL}/${storedUser.id}`);
        if (response.status === 404) {
          clearSession();
          navigate("/login");
          return;
        }
        const data = await response.json();
        if (response.ok && data.success) {
          const u = data.user;
          const loaded = {
            name: u.name,
            email: u.email,
            mobile: u.mobile || "",
            profilePhoto: toMediaUrl(u.profilePhoto),
            userId: u.userId || u.id,
            ward: u.location || "",
            memberSince: u.createdAt
              ? new Date(u.createdAt).toLocaleDateString("en-IN", { month: "long", year: "numeric" })
              : "",
          };
          setProfile(loaded);
          setForm({ name: loaded.name, email: loaded.email, mobile: loaded.mobile, ward: loaded.ward });

          const current = JSON.parse(localStorage.getItem("user") || "{}");
          localStorage.setItem("user", JSON.stringify({ ...current, ...u }));
          setStoredUser({ ...current, ...u });
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
      }
    };

    loadProfile();
  }, [storedUser.id, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "mobile" ? value.replace(/\D/g, "") : value,
    }));
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await uploadProfilePhoto(file, storedUser.id, "citizen");
      setProfile((current) => ({ ...current, profilePhoto: toMediaUrl(data.profilePhoto) }));
      const current = JSON.parse(localStorage.getItem("user") || "{}");
      localStorage.setItem("user", JSON.stringify({ ...current, profilePhoto: data.profilePhoto }));
      setStoredUser((user) => ({ ...user, profilePhoto: data.profilePhoto }));
      window.dispatchEvent(new Event("authChange"));
      setNotice({ type: "success", text: "Profile photo uploaded successfully." });
    } catch (error) {
      setNotice({ type: "error", text: error.message || "Failed to upload profile photo." });
    } finally {
      e.target.value = "";
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCancel = () => {
    setForm({ name: profile.name, email: profile.email, mobile: profile.mobile, ward: profile.ward });
    setEditing(false);
    setNotice(null);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return setNotice({ type: "error", text: "Full name is required." });
    if (!EMAIL_REGEX.test(form.email)) return setNotice({ type: "error", text: "Enter a valid email address." });
    if (!MOBILE_REGEX.test(form.mobile)) return setNotice({ type: "error", text: "Enter a valid 10-digit mobile number." });

    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/${storedUser.id}`, {
        method: "PUT",
        headers: jsonHeaders,
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          mobile: form.mobile,
          location: form.ward,
        }),
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setProfile((p) => ({ ...p, name: form.name.trim(), email: form.email.trim(), mobile: form.mobile, ward: form.ward }));
        const current = JSON.parse(localStorage.getItem("user") || "{}");
        localStorage.setItem("user", JSON.stringify({ ...current, name: form.name.trim(), email: form.email.trim(), mobile: form.mobile, location: form.ward }));
        window.dispatchEvent(new Event("authChange"));
        setEditing(false);
        setNotice({ type: "success", text: "Profile updated successfully." });
      } else {
        setNotice({ type: "error", text: data.message || "Could not update profile." });
      }
    } catch (err) {
      setNotice({ type: "error", text: "Unable to reach the server." });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      return setNotice({ type: "error", text: "New passwords do not match." });
    }
    if (passwordForm.newPassword.length < 6) {
      return setNotice({ type: "error", text: "New password must be at least 6 characters." });
    }

    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/${storedUser.id}/password`, {
        method: "PUT",
        headers: jsonHeaders,
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setNotice({ type: "success", text: "Password changed successfully." });
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
        setChangingPassword(false);
      } else {
        setNotice({ type: "error", text: data.message || "Could not change password. Check current password." });
      }
    } catch (err) {
      setNotice({ type: "error", text: "Unable to reach the server." });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (e) => {
    e.preventDefault();
    setDeleting(true);
    try {
      const response = await fetch(`${API_URL}/${storedUser.id}`, {
        method: "DELETE",
        headers: jsonHeaders,
        body: JSON.stringify({ password: deletePassword }),
      });
      const data = await response.json();

      if (response.ok && data.success) {
        clearSession();
        navigate("/");
      } else {
        setNotice({ type: "error", text: data.message || "Could not delete account. Check password." });
      }
    } catch (err) {
      setNotice({ type: "error", text: "Unable to reach the server." });
    } finally {
      setDeleting(false);
    }
  };

  // ✅ Smart Back Handler: Uses the prop if provided, otherwise falls back to router
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate("/dashboard"); // Fallback if used as a standalone route
    }
  };

  return (
    <div className="cdp-profile-page">
      <div className="cdp-profile-header">
        {/* ✅ FIXED: Now uses the smart handleBack function */}
        <button className="cdp-back-btn" onClick={handleBack}>
          ← Back to Dashboard
        </button>
        <h1>My Profile</h1>
      </div>

      <div className="cdp-profile-content">
        <p className="cdp-profile-subtitle">Manage your personal details, account information, and security settings.</p>

        {notice && <div className={`cdp-banner cdp-banner-${notice.type}`}>{notice.text}</div>}

        <div className="cdp-profile-grid">
          <div className="cdp-panel cdp-profile-card cdp-sticky-card">
            <div className="cdp-profile-avatar">
              {profile.profilePhoto ? <img src={profile.profilePhoto} alt="Profile" /> : initials}
            </div>
            <label className="cdp-btn-primary small">
              Upload Photo
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoUpload} hidden />
            </label>
            <h3>{profile.name}</h3>
            <p>Citizen Account</p>
            <dl className="cdp-kv">
              <div>
                <dt>User ID</dt>
                <dd className="cdp-mono">{profile.userId}</dd>
              </div>
              <div>
                <dt>Member since</dt>
                <dd>{profile.memberSince}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd><span className="cdp-badge cdp-badge-green">Active</span></dd>
              </div>
            </dl>
          </div>

          <div className="cdp-right-column">
            <div className="cdp-panel">
              <div className="cdp-panel-head">
                <h3>Personal Information</h3>
                {!editing && (
                  <button type="button" className="cdp-btn-primary small" onClick={() => { setEditing(true); setNotice(null); }}>
                    Edit Profile
                  </button>
                )}
              </div>

              <form className="cdp-new-form" onSubmit={handleSaveProfile}>
                <div className="cdp-form-row">
                  <div className="cdp-field">
                    <label htmlFor="pf-name">Full Name</label>
                    <input id="pf-name" name="name" type="text" value={form.name} onChange={handleChange} disabled={!editing} required />
                  </div>
                  <div className="cdp-field">
                    <label htmlFor="pf-email">Email Address</label>
                    <input id="pf-email" name="email" type="email" value={form.email} onChange={handleChange} disabled={!editing} required />
                  </div>
                </div>

                <div className="cdp-form-row">
                  <div className="cdp-field">
                    <label htmlFor="pf-mobile">Mobile Number</label>
                    <input id="pf-mobile" name="mobile" type="tel" inputMode="numeric" maxLength={10} value={form.mobile} onChange={handleChange} disabled={!editing} required />
                  </div>
                  <div className="cdp-field">
                    <label htmlFor="pf-ward">Ward / Location</label>
                    <input id="pf-ward" name="ward" type="text" value={form.ward} onChange={handleChange} disabled={!editing} />
                  </div>
                </div>

                {editing && (
                  <div className="cdp-form-actions">
                    <button type="button" className="cdp-btn-outline" onClick={handleCancel}>Cancel</button>
                    <button type="submit" className="cdp-btn-primary" disabled={saving}>{saving ? "Saving…" : "Save Changes"}</button>
                  </div>
                )}
              </form>
            </div>

            <div className="cdp-panel">
              <div className="cdp-panel-head">
                <h3>Security & Password</h3>
                {!changingPassword && (
                  <button type="button" className="cdp-btn-outline small" onClick={() => { setChangingPassword(true); setNotice(null); }}>
                    Change Password
                  </button>
                )}
              </div>

              {changingPassword ? (
                <form className="cdp-new-form" onSubmit={handleChangePassword}>
                  <div className="cdp-form-row">
                    <div className="cdp-field">
                      <label htmlFor="curr-pass">Current Password</label>
                      <input id="curr-pass" name="currentPassword" type="password" value={passwordForm.currentPassword} onChange={handlePasswordChange} required />
                    </div>
                  </div>
                  <div className="cdp-form-row">
                    <div className="cdp-field">
                      <label htmlFor="new-pass">New Password</label>
                      <input id="new-pass" name="newPassword" type="password" value={passwordForm.newPassword} onChange={handlePasswordChange} required />
                    </div>
                    <div className="cdp-field">
                      <label htmlFor="conf-pass">Confirm New Password</label>
                      <input id="conf-pass" name="confirmPassword" type="password" value={passwordForm.confirmPassword} onChange={handlePasswordChange} required />
                    </div>
                  </div>
                  <div className="cdp-form-actions">
                    <button type="button" className="cdp-btn-outline" onClick={() => { setChangingPassword(false); setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" }); }}>Cancel</button>
                    <button type="submit" className="cdp-btn-primary" disabled={saving}>{saving ? "Updating…" : "Update Password"}</button>
                  </div>
                </form>
              ) : (
                <div className="cdp-security-hint">
                  Keep your account secure by using a strong, unique password. Never share your password with anyone.
                </div>
              )}
            </div>

            <div className="cdp-panel cdp-danger-panel">
              <div className="cdp-panel-head">
                <h3>Delete Account</h3>
              </div>
              <div className="cdp-danger-body">
                <p>Permanently delete your account, personal details, and complaint history. This action cannot be undone.</p>

                {!confirmingDelete ? (
                  <button type="button" className="cdp-btn-danger" onClick={() => { setConfirmingDelete(true); setNotice(null); }}>
                    Delete My Account
                  </button>
                ) : (
                  <form className="cdp-danger-form" onSubmit={handleDelete}>
                    <div className="cdp-field">
                      <label htmlFor="pf-delete-password">Enter your password to confirm permanent deletion</label>
                      <input id="pf-delete-password" type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} autoComplete="current-password" required />
                    </div>
                    <div className="cdp-form-actions">
                      <button type="button" className="cdp-btn-outline" onClick={() => { setConfirmingDelete(false); setDeletePassword(""); }}>Cancel</button>
                      <button type="submit" className="cdp-btn-danger" disabled={deleting}>{deleting ? "Deleting…" : "Yes, Delete My Account"}</button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyProfile;
