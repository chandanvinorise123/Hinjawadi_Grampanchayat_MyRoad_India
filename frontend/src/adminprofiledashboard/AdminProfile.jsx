import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next"; // ✅ ADDED
import "./adminprofile.css";
import { API_BASE_URL, toMediaUrl, uploadProfilePhoto } from "../utils/dashboardApi";

// ✅ HELPER: Safely extract address string whether it's an object or plain string
const getAddressString = (addr) => {
  if (!addr) return "";
  if (typeof addr === 'object' && addr !== null) {
    return addr.address || ""; 
  }
  return String(addr);
};

const AdminProfile = ({ adminId = "", onBack }) => {
  const { t } = useTranslation(); // ✅ ADDED
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
      if (!adminId) {
        setLoading(false);
        showMessage("error", t('admin_profile.msg_identity_not_found'));
        return;
      }
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
            profilePhoto: toMediaUrl(admin.profilePhoto),
            address: getAddressString(admin.address || admin.location),
          });
          setPreferences({
            language: admin.language || "English",
            theme: admin.theme || "Light",
            emailNotifications: admin.emailNotifications ?? true,
          });
        }
      } catch (err) {
        console.error("Failed to fetch profile:", err);
        showMessage("error", t('admin_profile.msg_failed_load'));
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [adminId, t]);

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
        showMessage("success", t('admin_profile.msg_updated_success'));
      } else {
        showMessage("error", data.message || t('admin_profile.msg_failed_update'));
      }
    } catch (err) {
      showMessage("error", t('admin_profile.msg_server_unreachable'));
    }
  };

  // ==========================================
  // CHANGE PASSWORD
  // ==========================================
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showMessage("error", t('admin_profile.msg_password_mismatch'));
      return;
    }
    if (passwordData.newPassword.length < 6) {
      showMessage("error", t('admin_profile.msg_password_length'));
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
        showMessage("success", t('admin_profile.msg_password_changed'));
      } else {
        showMessage("error", data.message || t('admin_profile.msg_failed_change_password'));
      }
    } catch (err) {
      showMessage("error", t('admin_profile.msg_server_unreachable'));
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const data = await uploadProfilePhoto(file, adminId, "admin");
      setFormData((current) => ({ ...current, profilePhoto: toMediaUrl(data.profilePhoto) }));
      setProfile((current) => ({ ...current, profilePhoto: toMediaUrl(data.profilePhoto) }));
      const current = JSON.parse(localStorage.getItem("user") || "{}");
      localStorage.setItem("user", JSON.stringify({ ...current, profilePhoto: data.profilePhoto }));
      window.dispatchEvent(new Event("authChange"));
      showMessage("success", t('admin_profile.msg_photo_uploaded'));
    } catch (error) {
      console.error("Failed to upload admin profile photo:", error);
      showMessage("error", error.message || t('admin_profile.msg_failed_upload_photo'));
    } finally {
      e.target.value = "";
    }
  };

  const getInitials = (name) => {
    if (!name) return "AD";
    return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  };

  // ✅ Updated to use browser's default locale for better i18n support
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString(undefined, {
      day: "2-digit", month: "2-digit", year: "numeric"
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString(undefined, {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  };

  if (loading) {
    return (
      <div className="ap-loading">
        <div className="ap-spinner"></div>
        <p>{t('admin_profile.loading')}</p>
      </div>
    );
  }

  return (
    <div className="ap-shell">
      {/* HEADER */}
      <div className="ap-header">
        <button className="ap-back-btn" onClick={onBack}>
          {t('admin_profile.back_to_dashboard')}
        </button>
        <div className="ap-header-title">
          <h1>{t('admin_profile.title')}</h1>
          <p>{t('admin_profile.subtitle')}</p>
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
          <h2>{profile?.name || t('admin_profile.hero.admin_name')}</h2>
          <p className="ap-hero-role">{profile?.role === "admin" ? t('admin_profile.hero.system_admin') : profile?.role}</p>
          <span className="ap-hero-status">
            <span className="ap-status-dot"></span>
            {profile?.accountStatus || t('admin_profile.hero.active')}
          </span>
          <p className="ap-hero-org">
            {t('admin_profile.hero.org')}
          </p>
        </div>
      </div>

      {/* ================= 1. PERSONAL INFORMATION ================= */}
      <div className="ap-section">
        <div className="ap-section-head">
          <h3>{t('admin_profile.personal_info.title')}</h3>
          <button
            className="ap-edit-btn"
            onClick={() => setEditMode(!editMode)}
          >
            {editMode ? t('admin_profile.personal_info.cancel_edit') : t('admin_profile.personal_info.edit')}
          </button>
        </div>

        <form className="ap-form" onSubmit={handleProfileUpdate}>
          <div className="ap-form-grid">
            <div className="ap-field">
              <label>{t('admin_profile.personal_info.full_name')}</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={!editMode}
                placeholder={t('admin_profile.placeholders.admin_name')}
              />
            </div>

            <div className="ap-field">
              <label>{t('admin_profile.personal_info.email')}</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={!editMode}
                placeholder={t('admin_profile.placeholders.email')}
              />
            </div>

            <div className="ap-field">
              <label>{t('admin_profile.personal_info.mobile')}</label>
              <input
                type="text"
                value={formData.contact}
                onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                disabled={!editMode}
                placeholder={t('admin_profile.placeholders.mobile')}
              />
            </div>

            <div className="ap-field">
              <label>{t('admin_profile.personal_info.gender')}</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                disabled={!editMode}
              >
                <option value="">{t('admin_profile.personal_info.select_gender')}</option>
                <option value="Male">{t('admin_profile.personal_info.male')}</option>
                <option value="Female">{t('admin_profile.personal_info.female')}</option>
                <option value="Other">{t('admin_profile.personal_info.other')}</option>
              </select>
            </div>

            <div className="ap-field ap-field-full">
              <label>{t('admin_profile.personal_info.address')}</label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                disabled={!editMode}
                placeholder={t('admin_profile.placeholders.address')}
                rows="2"
              />
            </div>

            <div className="ap-field ap-field-full">
              <label>{t('admin_profile.personal_info.profile_photo')}</label>
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
                <small>{t('admin_profile.personal_info.upload_hint')}</small>
              </div>
            </div>
          </div>

          {editMode && (
            <div className="ap-form-actions">
              <button type="button" className="ap-btn-outline" onClick={() => setEditMode(false)}>
                {t('admin_profile.personal_info.cancel')}
              </button>
              <button type="submit" className="ap-btn-primary">
                {t('admin_profile.personal_info.save_changes')}
              </button>
            </div>
          )}
        </form>
      </div>

      {/* ================= 2. ACCOUNT INFORMATION ================= */}
      <div className="ap-section">
        <div className="ap-section-head">
          <h3>{t('admin_profile.account_info.title')}</h3>
          <span className="ap-section-badge">{t('admin_profile.account_info.read_only')}</span>
        </div>

        <div className="ap-info-grid">
          <div className="ap-info-item">
            <span className="ap-info-label">{t('admin_profile.account_info.admin_id')}</span>
            <b className="ap-info-value">{profile?.adminId || "-"}</b>
          </div>
          <div className="ap-info-item">
            <span className="ap-info-label">{t('admin_profile.account_info.role')}</span>
            <b className="ap-info-value">
              <span className="ap-role-badge">
                {profile?.role === "admin" ? t('admin_profile.account_info.super_admin') : profile?.role}
              </span>
            </b>
          </div>
          <div className="ap-info-item">
            <span className="ap-info-label">{t('admin_profile.account_info.department')}</span>
            <b className="ap-info-value">{profile?.department || t('admin_profile.account_info.infrastructure')}</b>
          </div>
          <div className="ap-info-item">
            <span className="ap-info-label">{t('admin_profile.account_info.account_status')}</span>
            <b className="ap-info-value">
              <span className="ap-status-badge active">
                {profile?.accountStatus || t('admin_profile.hero.active')}
              </span>
            </b>
          </div>
          <div className="ap-info-item">
            <span className="ap-info-label">{t('admin_profile.account_info.date_joined')}</span>
            <b className="ap-info-value">{formatDate(profile?.dateJoined || profile?.createdAt)}</b>
          </div>
          <div className="ap-info-item">
            <span className="ap-info-label">{t('admin_profile.account_info.last_login')}</span>
            <b className="ap-info-value">{formatDateTime(profile?.lastLogin)}</b>
          </div>
        </div>
      </div>

      {/* ================= 3. SECURITY SETTINGS ================= */}
      <div className="ap-section">
        <div className="ap-section-head">
          <h3>{t('admin_profile.security.title')}</h3>
        </div>

        <form className="ap-form" onSubmit={handlePasswordChange}>
          <div className="ap-form-grid">
            <div className="ap-field ap-field-full">
              <label>{t('admin_profile.security.current_password')}</label>
              <input
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                placeholder={t('admin_profile.placeholders.current_password')}
                required
              />
            </div>

            <div className="ap-field">
              <label>{t('admin_profile.security.new_password')}</label>
              <input
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                placeholder={t('admin_profile.placeholders.new_password')}
                required
              />
            </div>

            <div className="ap-field">
              <label>{t('admin_profile.security.confirm_password')}</label>
              <input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                placeholder={t('admin_profile.placeholders.confirm_password')}
                required
              />
            </div>
          </div>

          <div className="ap-form-actions">
            <button type="submit" className="ap-btn-primary">
              {t('admin_profile.security.change_password')}
            </button>
          </div>
        </form>
      </div>

      {/* ================= 4. PREFERENCES ================= */}
      <div className="ap-section">
        <div className="ap-section-head">
          <h3>{t('admin_profile.preferences.title')}</h3>
        </div>

        <div className="ap-preferences-grid">
          <div className="ap-pref-item">
            <label>{t('admin_profile.preferences.language')}</label>
            <select
              value={preferences.language}
              onChange={(e) => setPreferences({ ...preferences, language: e.target.value })}
              disabled={!editMode}
            >
              <option value="English">{t('admin_profile.preferences.english')}</option>
              <option value="Hindi">{t('admin_profile.preferences.hindi')}</option>
              <option value="Marathi">{t('admin_profile.preferences.marathi')}</option>
            </select>
          </div>

          <div className="ap-pref-item">
            <label>{t('admin_profile.preferences.theme')}</label>
            <select
              value={preferences.theme}
              onChange={(e) => setPreferences({ ...preferences, theme: e.target.value })}
              disabled={!editMode}
            >
              <option value="Light">{t('admin_profile.preferences.light')}</option>
              <option value="Dark">{t('admin_profile.preferences.dark')}</option>
            </select>
          </div>

          <div className="ap-pref-item">
            <label>{t('admin_profile.preferences.email_notifications')}</label>
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
              {t('admin_profile.personal_info.cancel')}
            </button>
            <button type="button" className="ap-btn-primary" onClick={handleProfileUpdate}>
              {t('admin_profile.preferences.save_preferences')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminProfile;