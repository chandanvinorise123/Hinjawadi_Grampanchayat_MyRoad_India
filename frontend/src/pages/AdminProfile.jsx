import React, { useState, useEffect } from "react";
import "./adminprofile.css";

const API_BASE_URL = "http://localhost:3200/api";

const AdminProfile = ({ adminId = "ADM001", onBack }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Personal Info Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    contact: "",
    gender: "",
    profilePhoto: "",
    address: "",
  });

  // Security Settings Form State
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Preferences Form State
  const [preferences, setPreferences] = useState({
    language: "English",
    theme: "Light",
    emailNotifications: true,
  });

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 3000);
  };

  // ==========================================
  // FETCH PROFILE DATA
  // ==========================================
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/admin/profile/${adminId}`);
        const data = await response.json();
        if (response.ok && data.success) {
          const admin = data.admin;
          setProfile(admin);
          setFormData({
            name: admin.name || "",
            email: admin.email || "",
            contact: admin.contact || "",
            gender: admin.gender || "",
            profilePhoto: admin.profilePhoto || "",
            address: admin.address || "",
          });
          setPreferences({
            language: admin.language || "English",
            theme: admin.theme || "Light",
            emailNotifications: admin.emailNotifications ?? true,
          });
        }
      } catch (err) {
        console.error("Failed to fetch profile:", err);
        showMessage("error", "Failed to load profile data");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [adminId]);

  // ==========================================
  // UPDATE PROFILE (Personal + Preferences)
  // ==========================================
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE_URL}/admin/profile/${adminId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, ...preferences }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setProfile(data.admin);
        setEditMode(false);
        showMessage("success", "Profile updated successfully!");
      } else {
        showMessage("error", data.message || "Failed to update profile");
      }
    } catch (err) {
      showMessage("error", "Unable to reach the server");
    }
  };

  // ==========================================
  // CHANGE PASSWORD
  // ==========================================
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showMessage("error", "New passwords do not match");
      return;
    }
    if (passwordData.newPassword.length < 6) {
      showMessage("error", "Password must be at least 6 characters");
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/admin/change-password/${adminId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
        showMessage("success", "Password changed successfully!");
      } else {
        showMessage("error", data.message || "Failed to change password");
      }
    } catch (err) {
      showMessage("error", "Unable to reach the server");
    }
  };

  // ==========================================
  // HANDLE PHOTO UPLOAD (Base64 for simplicity)
  // ==========================================
  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, profilePhoto: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const getInitials = (name) => {
    if (!name) return "AD";
    return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit", month: "2-digit", year: "numeric"
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  };

  if (loading) {
    return (
      <div className="ap-loading">
        <div className="ap-spinner"></div>
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="ap-shell">
      {/* HEADER */}
      <div className="ap-header">
        <button className="ap-back-btn" onClick={onBack}>
          ← Back to Dashboard
        </button>
        <div className="ap-header-title">
          <h1>My Profile</h1>
          <p>Manage your personal information and security settings</p>
        </div>
      </div>

      {/* MESSAGE BANNER */}
      {message.text && (
        <div className={`ap-message-banner ${message.type}`}>{message.text}</div>
      )}

      {/* PROFILE HERO CARD */}
      <div className="ap-hero-card">
        <div className="ap-hero-avatar">
          {profile?.profilePhoto ? (
            <img src={profile.profilePhoto} alt="Profile" />
          ) : (
            <span>{getInitials(profile?.name)}</span>
          )}
        </div>
        <div className="ap-hero-info">
          <h2>{profile?.name || "Admin Name"}</h2>
          <p className="ap-hero-role">{profile?.role === "admin" ? "System Administrator" : profile?.role}</p>
          <span className="ap-hero-status">
            <span className="ap-status-dot"></span>
            {profile?.accountStatus || "Active"}
          </span>
          <p className="ap-hero-org">
            MyRoad India · Hinjawadi Gram Panchayat
          </p>
        </div>
      </div>

      {/* ================= 1. PERSONAL INFORMATION ================= */}
      <div className="ap-section">
        <div className="ap-section-head">
          <h3>👤 Personal Information</h3>
          <button
            className="ap-edit-btn"
            onClick={() => setEditMode(!editMode)}
          >
            {editMode ? "Cancel Edit" : "Edit Profile"}
          </button>
        </div>

        <form className="ap-form" onSubmit={handleProfileUpdate}>
          <div className="ap-form-grid">
            <div className="ap-field">
              <label>Full Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={!editMode}
                placeholder="Admin Name"
              />
            </div>

            <div className="ap-field">
              <label>Email Address</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={!editMode}
                placeholder="admin@myroadindia.in"
              />
            </div>

            <div className="ap-field">
              <label>Mobile Number</label>
              <input
                type="text"
                value={formData.contact}
                onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                disabled={!editMode}
                placeholder="+91 XXXXX XXXXX"
              />
            </div>

            <div className="ap-field">
              <label>Gender</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                disabled={!editMode}
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="ap-field ap-field-full">
              <label>Address</label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                disabled={!editMode}
                placeholder="Hinjawadi, Pune"
                rows="2"
              />
            </div>

            <div className="ap-field ap-field-full">
              <label>Profile Photo</label>
              <div className="ap-photo-upload">
                {formData.profilePhoto ? (
                  <img src={formData.profilePhoto} alt="Preview" className="ap-photo-preview" />
                ) : (
                  <div className="ap-photo-placeholder">📷</div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  disabled={!editMode}
                  className="ap-file-input"
                />
                <small>Upload a photo (JPG, PNG)</small>
              </div>
            </div>
          </div>

          {editMode && (
            <div className="ap-form-actions">
              <button type="button" className="ap-btn-outline" onClick={() => setEditMode(false)}>
                Cancel
              </button>
              <button type="submit" className="ap-btn-primary">
                Save Changes
              </button>
            </div>
          )}
        </form>
      </div>

      {/* ================= 2. ACCOUNT INFORMATION ================= */}
      <div className="ap-section">
        <div className="ap-section-head">
          <h3>🏢 Account Information</h3>
          <span className="ap-section-badge">Read Only</span>
        </div>

        <div className="ap-info-grid">
          <div className="ap-info-item">
            <span className="ap-info-label">Admin ID</span>
            <b className="ap-info-value">{profile?.adminId || "ADM001"}</b>
          </div>
          <div className="ap-info-item">
            <span className="ap-info-label">Role</span>
            <b className="ap-info-value">
              <span className="ap-role-badge">
                {profile?.role === "admin" ? "Super Admin" : profile?.role}
              </span>
            </b>
          </div>
          <div className="ap-info-item">
            <span className="ap-info-label">Department</span>
            <b className="ap-info-value">{profile?.department || "Infrastructure"}</b>
          </div>
          <div className="ap-info-item">
            <span className="ap-info-label">Account Status</span>
            <b className="ap-info-value">
              <span className="ap-status-badge active">
                {profile?.accountStatus || "Active"}
              </span>
            </b>
          </div>
          <div className="ap-info-item">
            <span className="ap-info-label">Date Joined</span>
            <b className="ap-info-value">{formatDate(profile?.dateJoined || profile?.createdAt)}</b>
          </div>
          <div className="ap-info-item">
            <span className="ap-info-label">Last Login</span>
            <b className="ap-info-value">{formatDateTime(profile?.lastLogin)}</b>
          </div>
        </div>
      </div>

      {/* ================= 3. SECURITY SETTINGS ================= */}
      <div className="ap-section">
        <div className="ap-section-head">
          <h3>🔒 Security Settings</h3>
        </div>

        <form className="ap-form" onSubmit={handlePasswordChange}>
          <div className="ap-form-grid">
            <div className="ap-field ap-field-full">
              <label>Current Password</label>
              <input
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                placeholder="Enter current password"
                required
              />
            </div>

            <div className="ap-field">
              <label>New Password</label>
              <input
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                placeholder="Enter new password"
                required
              />
            </div>

            <div className="ap-field">
              <label>Confirm New Password</label>
              <input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                placeholder="Confirm new password"
                required
              />
            </div>
          </div>

          <div className="ap-form-actions">
            <button type="submit" className="ap-btn-primary">
              🔒 Change Password
            </button>
          </div>
        </form>
      </div>

      {/* ================= 4. PREFERENCES ================= */}
      <div className="ap-section">
        <div className="ap-section-head">
          <h3>⚙️ Preferences</h3>
        </div>

        <div className="ap-preferences-grid">
          <div className="ap-pref-item">
            <label>Language</label>
            <select
              value={preferences.language}
              onChange={(e) => setPreferences({ ...preferences, language: e.target.value })}
              disabled={!editMode}
            >
              <option value="English">English</option>
              <option value="Hindi">हिंदी</option>
              <option value="Marathi">मराठी</option>
            </select>
          </div>

          <div className="ap-pref-item">
            <label>Theme</label>
            <select
              value={preferences.theme}
              onChange={(e) => setPreferences({ ...preferences, theme: e.target.value })}
              disabled={!editMode}
            >
              <option value="Light">☀️ Light</option>
              <option value="Dark">🌙 Dark</option>
            </select>
          </div>

          <div className="ap-pref-item">
            <label>Email Notifications</label>
            <label className="ap-toggle">
              <input
                type="checkbox"
                checked={preferences.emailNotifications}
                onChange={(e) => setPreferences({ ...preferences, emailNotifications: e.target.checked })}
                disabled={!editMode}
              />
              <span className="ap-toggle-slider"></span>
            </label>
          </div>
        </div>

        {editMode && (
          <div className="ap-form-actions">
            <button type="button" className="ap-btn-outline" onClick={() => setEditMode(false)}>
              Cancel
            </button>
            <button type="button" className="ap-btn-primary" onClick={handleProfileUpdate}>
              Save Preferences
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminProfile;