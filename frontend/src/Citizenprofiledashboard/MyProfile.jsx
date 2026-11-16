
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "./MyProfile.css";
import {
  API_BASE_URL,
  toMediaUrl,
  uploadProfilePhoto,
} from "../utils/dashboardApi";

const API_URL = `${API_BASE_URL}/auth/users`;
const MOBILE_REGEX = /^[6-9]\d{9}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MyProfile = ({ onBack }) => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const language = (
    i18n.resolvedLanguage ||
    i18n.language ||
    "en"
  ).split("-")[0];

  const localeMap = {
    en: "en-IN",
    hi: "hi-IN",
    mr: "mr-IN",
  };

  const formatMemberSince = (date) => {
    if (!date) return "";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) return "";

    return parsedDate.toLocaleDateString(
      localeMap[language] || "en-IN",
      {
        month: "long",
        year: "numeric",
      }
    );
  };

  const [storedUser, setStoredUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  });

  const [profile, setProfile] = useState({
    name: storedUser.name || "",
    email: storedUser.email || "",
    mobile: storedUser.mobile || "",
    profilePhoto: storedUser.profilePhoto
      ? toMediaUrl(storedUser.profilePhoto)
      : "",
    userId: storedUser.userId || storedUser.id || "N/A",
    ward: storedUser.location || "",
    memberSince: formatMemberSince(storedUser.createdAt),
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
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");

    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const clearSession = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    window.dispatchEvent(new Event("authChange"));
  };

  useEffect(() => {
    if (!storedUser.id) {
      navigate("/login");
      return;
    }

    const loadProfile = async () => {
      try {
        const response = await fetch(
          `${API_URL}/${storedUser.id}`,
          {
            headers: getAuthHeaders(),
          }
        );

        if (response.status === 404) {
          clearSession();
          navigate("/login");
          return;
        }

        const data = await response.json();

        if (response.ok && data.success) {
          const user = data.user;

          const loaded = {
            name: user.name || "",
            email: user.email || "",
            mobile: user.mobile || "",
            profilePhoto: toMediaUrl(user.profilePhoto),
            userId: user.userId || user.id || storedUser.id,
            ward: user.location || "",
            memberSince: formatMemberSince(user.createdAt),
          };

          setProfile(loaded);

          setForm({
            name: loaded.name,
            email: loaded.email,
            mobile: loaded.mobile,
            ward: loaded.ward,
          });

          const current = JSON.parse(
            localStorage.getItem("user") || "{}"
          );

          const updatedUser = { ...current, ...user };

          localStorage.setItem(
            "user",
            JSON.stringify(updatedUser)
          );

          setStoredUser(updatedUser);
        } else {
          console.error(
            "Failed to load profile data:",
            data
          );
        }
      } catch (error) {
        console.error("Failed to load profile:", error);
      }
    };

    loadProfile();
  }, [storedUser.id, navigate]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]:
        name === "mobile"
          ? value.replace(/\D/g, "")
          : value,
    }));
  };

  const handlePhotoUpload = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      const data = await uploadProfilePhoto(
        file,
        storedUser.id,
        "citizen"
      );

      setProfile((current) => ({
        ...current,
        profilePhoto: toMediaUrl(data.profilePhoto),
      }));

      const current = JSON.parse(
        localStorage.getItem("user") || "{}"
      );

      const updatedUser = {
        ...current,
        profilePhoto: data.profilePhoto,
      };

      localStorage.setItem(
        "user",
        JSON.stringify(updatedUser)
      );

      setStoredUser(updatedUser);
      window.dispatchEvent(new Event("authChange"));

      setNotice({
        type: "success",
        text: t("myProfile.photoUploadSuccess"),
      });
    } catch (error) {
      setNotice({
        type: "error",
        text:
          error.message ||
          t("myProfile.photoUploadError"),
      });
    } finally {
      event.target.value = "";
    }
  };

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;

    setPasswordForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleCancel = () => {
    setForm({
      name: profile.name,
      email: profile.email,
      mobile: profile.mobile,
      ward: profile.ward,
    });

    setEditing(false);
    setNotice(null);
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();

    if (!form.name.trim()) {
      return setNotice({
        type: "error",
        text: t("myProfile.nameRequired"),
      });
    }

    if (!EMAIL_REGEX.test(form.email.trim())) {
      return setNotice({
        type: "error",
        text: t("myProfile.invalidEmail"),
      });
    }

    if (!MOBILE_REGEX.test(form.mobile)) {
      return setNotice({
        type: "error",
        text: t("myProfile.invalidMobile"),
      });
    }

    setSaving(true);

    try {
      const response = await fetch(
        `${API_URL}/${storedUser.id}`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            name: form.name.trim(),
            email: form.email.trim(),
            mobile: form.mobile,
            location: form.ward,
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setProfile((previous) => ({
          ...previous,
          name: form.name.trim(),
          email: form.email.trim(),
          mobile: form.mobile,
          ward: form.ward,
        }));

        const current = JSON.parse(
          localStorage.getItem("user") || "{}"
        );

        const updatedUser = {
          ...current,
          name: form.name.trim(),
          email: form.email.trim(),
          mobile: form.mobile,
          location: form.ward,
        };

        localStorage.setItem(
          "user",
          JSON.stringify(updatedUser)
        );

        setStoredUser(updatedUser);
        window.dispatchEvent(new Event("authChange"));

        setEditing(false);

        setNotice({
          type: "success",
          text: t("myProfile.profileUpdateSuccess"),
        });
      } else {
        console.error("Update profile failed:", data);

        setNotice({
          type: "error",
          text:
            data.message ||
            t("myProfile.profileUpdateError"),
        });
      }
    } catch (error) {
      console.error("Update profile error:", error);

      setNotice({
        type: "error",
        text: t("myProfile.serverError"),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();

    if (
      passwordForm.newPassword !==
      passwordForm.confirmPassword
    ) {
      return setNotice({
        type: "error",
        text: t("myProfile.passwordMismatch"),
      });
    }

    if (passwordForm.newPassword.length < 6) {
      return setNotice({
        type: "error",
        text: t("myProfile.passwordTooShort"),
      });
    }

    setSaving(true);

    try {
      const response = await fetch(
        `${API_URL}/${storedUser.id}/password`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            currentPassword: passwordForm.currentPassword,
            newPassword: passwordForm.newPassword,
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setNotice({
          type: "success",
          text: t("myProfile.passwordChangeSuccess"),
        });

        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });

        setChangingPassword(false);
      } else {
        console.error("Change password failed:", data);

        setNotice({
          type: "error",
          text:
            data.message ||
            t("myProfile.passwordChangeError"),
        });
      }
    } catch (error) {
      console.error("Change password error:", error);

      setNotice({
        type: "error",
        text: t("myProfile.serverError"),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (event) => {
    event.preventDefault();
    setDeleting(true);

    try {
      const response = await fetch(
        `${API_URL}/${storedUser.id}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            password: deletePassword,
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        clearSession();
        navigate("/");
      } else {
        console.error("Delete account failed:", data);

        setNotice({
          type: "error",
          text:
            data.message ||
            t("myProfile.deleteAccountError"),
        });
      }
    } catch (error) {
      console.error("Delete account error:", error);

      setNotice({
        type: "error",
        text: t("myProfile.serverError"),
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate("/dashboard");
    }
  };

  return (
    <div className="cdp-profile-page">
      <div className="cdp-profile-header">
        <button
          className="cdp-back-btn"
          onClick={handleBack}
        >
          ← {t("myProfile.backToDashboard")}
        </button>

        <h1>{t("myProfile.title")}</h1>
      </div>

      <div className="cdp-profile-content">
        <p className="cdp-profile-subtitle">
          {t("myProfile.subtitle")}
        </p>

        {notice && (
          <div
            className={`cdp-banner cdp-banner-${notice.type}`}
          >
            {notice.text}
          </div>
        )}

        <div className="cdp-profile-grid">
          <div className="cdp-panel cdp-profile-card cdp-sticky-card">
            <div className="cdp-profile-avatar">
              {profile.profilePhoto ? (
                <img
                  src={profile.profilePhoto}
                  alt={t("myProfile.profilePhotoAlt")}
                />
              ) : (
                initials
              )}
            </div>

            <label className="cdp-btn-primary small">
              {t("myProfile.uploadPhoto")}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoUpload}
                hidden
              />
            </label>

            <h3>{profile.name}</h3>
            <p>{t("myProfile.citizenAccount")}</p>

            <dl className="cdp-kv">
              <div>
                <dt>{t("myProfile.userId")}</dt>
                <dd className="cdp-mono">
                  {profile.userId}
                </dd>
              </div>

              <div>
                <dt>{t("myProfile.memberSince")}</dt>
                <dd>{profile.memberSince}</dd>
              </div>

              <div>
                <dt>{t("myProfile.status")}</dt>
                <dd>
                  <span className="cdp-badge cdp-badge-green">
                    {t("myProfile.active")}
                  </span>
                </dd>
              </div>
            </dl>
          </div>

          <div className="cdp-right-column">
            <div className="cdp-panel">
              <div className="cdp-panel-head">
                <h3>
                  {t("myProfile.personalInformation")}
                </h3>

                {!editing && (
                  <button
                    type="button"
                    className="cdp-btn-primary small"
                    onClick={() => {
                      setEditing(true);
                      setNotice(null);
                    }}
                  >
                    {t("myProfile.editProfile")}
                  </button>
                )}
              </div>

              <form
                className="cdp-new-form"
                onSubmit={handleSaveProfile}
              >
                <div className="cdp-form-row">
                  <div className="cdp-field">
                    <label htmlFor="pf-name">
                      {t("myProfile.fullName")}
                    </label>

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

                  <div className="cdp-field">
                    <label htmlFor="pf-email">
                      {t("myProfile.emailAddress")}
                    </label>

                    <input
                      id="pf-email"
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      disabled={!editing}
                      required
                    />
                  </div>
                </div>

                <div className="cdp-form-row">
                  <div className="cdp-field">
                    <label htmlFor="pf-mobile">
                      {t("myProfile.mobileNumber")}
                    </label>

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

                  <div className="cdp-field">
                    <label htmlFor="pf-ward">
                      {t("myProfile.wardLocation")}
                    </label>

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
                  <div className="cdp-form-actions">
                    <button
                      type="button"
                      className="cdp-btn-outline"
                      onClick={handleCancel}
                    >
                      {t("myProfile.cancel")}
                    </button>

                    <button
                      type="submit"
                      className="cdp-btn-primary"
                      disabled={saving}
                    >
                      {saving
                        ? t("myProfile.saving")
                        : t("myProfile.saveChanges")}
                    </button>
                  </div>
                )}
              </form>
            </div>

            <div className="cdp-panel">
              <div className="cdp-panel-head">
                <h3>
                  {t("myProfile.securityPassword")}
                </h3>

                {!changingPassword && (
                  <button
                    type="button"
                    className="cdp-btn-outline small"
                    onClick={() => {
                      setChangingPassword(true);
                      setNotice(null);
                    }}
                  >
                    {t("myProfile.changePassword")}
                  </button>
                )}
              </div>

              {changingPassword ? (
                <form
                  className="cdp-new-form"
                  onSubmit={handleChangePassword}
                >
                  <div className="cdp-form-row">
                    <div className="cdp-field">
                      <label htmlFor="curr-pass">
                        {t("myProfile.currentPassword")}
                      </label>

                      <input
                        id="curr-pass"
                        name="currentPassword"
                        type="password"
                        value={passwordForm.currentPassword}
                        onChange={handlePasswordChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="cdp-form-row">
                    <div className="cdp-field">
                      <label htmlFor="new-pass">
                        {t("myProfile.newPassword")}
                      </label>

                      <input
                        id="new-pass"
                        name="newPassword"
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={handlePasswordChange}
                        required
                      />
                    </div>

                    <div className="cdp-field">
                      <label htmlFor="conf-pass">
                        {t("myProfile.confirmNewPassword")}
                      </label>

                      <input
                        id="conf-pass"
                        name="confirmPassword"
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={handlePasswordChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="cdp-form-actions">
                    <button
                      type="button"
                      className="cdp-btn-outline"
                      onClick={() => {
                        setChangingPassword(false);
                        setPasswordForm({
                          currentPassword: "",
                          newPassword: "",
                          confirmPassword: "",
                        });
                      }}
                    >
                      {t("myProfile.cancel")}
                    </button>

                    <button
                      type="submit"
                      className="cdp-btn-primary"
                      disabled={saving}
                    >
                      {saving
                        ? t("myProfile.updating")
                        : t("myProfile.updatePassword")}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="cdp-security-hint">
                  {t("myProfile.securityHint")}
                </div>
              )}
            </div>

            <div className="cdp-panel cdp-danger-panel">
              <div className="cdp-panel-head">
                <h3>{t("myProfile.deleteAccount")}</h3>
              </div>

              <div className="cdp-danger-body">
                <p>
                  {t("myProfile.deleteAccountWarning")}
                </p>

                {!confirmingDelete ? (
                  <button
                    type="button"
                    className="cdp-btn-danger"
                    onClick={() => {
                      setConfirmingDelete(true);
                      setNotice(null);
                    }}
                  >
                    {t("myProfile.deleteMyAccount")}
                  </button>
                ) : (
                  <form
                    className="cdp-danger-form"
                    onSubmit={handleDelete}
                  >
                    <div className="cdp-field">
                      <label htmlFor="pf-delete-password">
                        {t("myProfile.confirmDeletePassword")}
                      </label>

                      <input
                        id="pf-delete-password"
                        type="password"
                        value={deletePassword}
                        onChange={(event) =>
                          setDeletePassword(event.target.value)
                        }
                        autoComplete="current-password"
                        required
                      />
                    </div>

                    <div className="cdp-form-actions">
                      <button
                        type="button"
                        className="cdp-btn-outline"
                        onClick={() => {
                          setConfirmingDelete(false);
                          setDeletePassword("");
                        }}
                      >
                        {t("myProfile.cancel")}
                      </button>

                      <button
                        type="submit"
                        className="cdp-btn-danger"
                        disabled={deleting}
                      >
                        {deleting
                          ? t("myProfile.deleting")
                          : t("myProfile.confirmDeleteAccount")}
                      </button>
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
