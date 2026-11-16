
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import "./MyProfile.css";
import {
  changeDashboardPassword,
  getStoredUser,
  getUserId,
  uploadProfilePhoto,
} from "../utils/dashboardApi";

const MyProfile = ({ initialStaff, onBack, onUpdate }) => {
  const { t } = useTranslation();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(initialStaff || {});
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Keep the profile synchronized if the parent updates initialStaff.
  useEffect(() => {
    setFormData(initialStaff || {});
  }, [initialStaff]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const showMessage = (text, type = "success") => {
    setMessage(text);
    setMessageType(type);
  };

  // Clear messages automatically without leaving old timers running.
  useEffect(() => {
    if (!message) return undefined;

    const timer = window.setTimeout(() => {
      setMessage("");
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [message]);

  const handleSave = async (event) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      await onUpdate(formData);
      setIsEditing(false);
      showMessage(t("staffMyProfile.profileUpdateSuccess"));
    } catch (error) {
      showMessage(
        error.message || t("staffMyProfile.profileUpdateError"),
        "error"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async (event) => {
    event.preventDefault();

    if (
      passwordData.newPassword !==
      passwordData.confirmPassword
    ) {
      showMessage(
        t("staffMyProfile.passwordMismatch"),
        "error"
      );
      return;
    }

    if (passwordData.newPassword.length < 6) {
      showMessage(
        t("staffMyProfile.passwordTooShort"),
        "error"
      );
      return;
    }

    setIsChangingPassword(true);

    try {
      await changeDashboardPassword(
        getUserId(getStoredUser()),
        passwordData.currentPassword,
        passwordData.newPassword
      );

      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      showMessage(
        t("staffMyProfile.passwordChangeSuccess")
      );
    } catch (error) {
      showMessage(
        error.message ||
          t("staffMyProfile.passwordChangeError"),
        "error"
      );
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handlePhotoUpload = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      const staffId = formData._id || formData.id;

      const data = await uploadProfilePhoto(
        file,
        staffId,
        "staff"
      );

      const updatedProfile = {
        ...formData,
        profilePhoto: data.profilePhoto,
      };

      setFormData(updatedProfile);

      await onUpdate(updatedProfile);

      const current = JSON.parse(
        localStorage.getItem("user") || "{}"
      );

      localStorage.setItem(
        "user",
        JSON.stringify({
          ...current,
          profilePhoto: data.profilePhoto,
        })
      );

      window.dispatchEvent(new Event("authChange"));

      showMessage(
        t("staffMyProfile.photoUploadSuccess")
      );
    } catch (error) {
      showMessage(
        error.message ||
          t("staffMyProfile.photoUploadError"),
        "error"
      );
    } finally {
      event.target.value = "";
    }
  };

  const handleCancel = () => {
    setFormData(initialStaff || {});
    setIsEditing(false);
  };

  const initials = (formData.name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="mp-shell">
      {/* Header */}
      <div className="mp-header">
        <button
          className="mp-back-btn"
          onClick={onBack}
        >
          ← {t("staffMyProfile.backToDashboard")}
        </button>

        <h2>{t("staffMyProfile.title")}</h2>
      </div>

      {message && (
        <div
          className={`mp-success-message ${
            messageType === "error"
              ? "mp-error-message"
              : ""
          }`}
          role={messageType === "error" ? "alert" : "status"}
        >
          {message}
        </div>
      )}

      <div className="mp-container">
        {/* Left: Profile summary */}
        <div className="mp-sidebar">
          <div className="mp-profile-card">
            <div className="mp-avatar-large">
              {formData.profilePhoto ? (
                <img
                  src={formData.profilePhoto}
                  alt={t("staffMyProfile.profilePhotoAlt")}
                />
              ) : (
                initials
              )}
            </div>

            <label className="mp-edit-btn">
              {t("staffMyProfile.uploadPhoto")}

              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoUpload}
                hidden
              />
            </label>

            <div className="mp-profile-info">
              <h3>{formData.name || ""}</h3>
              <p className="mp-role">
                {formData.role || ""}
              </p>

              <span className="mp-staff-id-badge">
                {formData.staffId || ""}
              </span>
            </div>

            <div className="mp-profile-actions">
              {!isEditing ? (
                <button
                  className="mp-edit-btn"
                  onClick={() => setIsEditing(true)}
                >
                  ✏️ {t("staffMyProfile.editProfile")}
                </button>
              ) : (
                <button
                  className="mp-cancel-btn"
                  onClick={handleCancel}
                >
                  {t("staffMyProfile.cancelChanges")}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right: Profile details and password form */}
        <div className="mp-main-content">
          <div className="mp-content-card">
            <div className="mp-card-header">
              <h3>
                {isEditing
                  ? t("staffMyProfile.editProfileInformation")
                  : t("staffMyProfile.profileInformation")}
              </h3>
            </div>

            <form
              className="mp-form"
              onSubmit={handleSave}
            >
              <div className="mp-form-grid">
                <div className="mp-field">
                  <label htmlFor="staff-name">
                    {t("staffMyProfile.fullName")}
                  </label>

                  {isEditing ? (
                    <input
                      id="staff-name"
                      name="name"
                      value={formData.name || ""}
                      onChange={handleChange}
                      required
                    />
                  ) : (
                    <div className="mp-readonly-value">
                      {formData.name || ""}
                    </div>
                  )}
                </div>

                <div className="mp-field">
                  <label>{t("staffMyProfile.staffId")}</label>

                  <div className="mp-readonly-value mp-mono">
                    {formData.staffId || ""}
                  </div>
                </div>

                <div className="mp-field">
                  <label htmlFor="staff-role">
                    {t("staffMyProfile.roleDesignation")}
                  </label>

                  {isEditing ? (
                    <input
                      id="staff-role"
                      name="role"
                      value={formData.role || ""}
                      onChange={handleChange}
                      required
                    />
                  ) : (
                    <div className="mp-readonly-value">
                      {formData.role || ""}
                    </div>
                  )}
                </div>

                <div className="mp-field">
                  <label>{t("staffMyProfile.department")}</label>

                  <div className="mp-readonly-value">
                    {formData.department || ""}
                  </div>
                </div>

                <div className="mp-field">
                  <label htmlFor="staff-ward">
                    {t("staffMyProfile.assignedWard")}
                  </label>

                  {isEditing ? (
                    <input
                      id="staff-ward"
                      name="ward"
                      value={formData.ward || ""}
                      onChange={handleChange}
                      required
                    />
                  ) : (
                    <div className="mp-readonly-value">
                      {formData.ward || ""}
                    </div>
                  )}
                </div>

                <div className="mp-field">
                  <label htmlFor="staff-contact">
                    {t("staffMyProfile.contactNumber")}
                  </label>

                  {isEditing ? (
                    <input
                      id="staff-contact"
                      name="contact"
                      value={formData.contact || ""}
                      onChange={handleChange}
                      required
                    />
                  ) : (
                    <div className="mp-readonly-value">
                      {formData.contact || ""}
                    </div>
                  )}
                </div>

                <div className="mp-field">
                  <label htmlFor="staff-email">
                    {t("staffMyProfile.emailAddress")}
                  </label>

                  {isEditing ? (
                    <input
                      id="staff-email"
                      name="email"
                      type="email"
                      value={formData.email || ""}
                      onChange={handleChange}
                      required
                    />
                  ) : (
                    <div className="mp-readonly-value">
                      {formData.email || ""}
                    </div>
                  )}
                </div>

                <div className="mp-field">
                  <label>{t("staffMyProfile.joinDate")}</label>

                  <div className="mp-readonly-value">
                    {formData.joinDate || ""}
                  </div>
                </div>
              </div>

              {isEditing && (
                <div className="mp-form-actions">
                  <button
                    type="button"
                    className="mp-btn-outline"
                    onClick={handleCancel}
                  >
                    {t("staffMyProfile.cancel")}
                  </button>

                  <button
                    type="submit"
                    className="mp-btn-primary"
                    disabled={isSaving}
                  >
                    {isSaving
                      ? t("staffMyProfile.saving")
                      : t("staffMyProfile.saveChanges")}
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Change password */}
          <div className="mp-content-card mp-password-card">
            <div className="mp-card-header">
              <h3>
                {t("staffMyProfile.changePassword")}
              </h3>
            </div>

            <p className="mp-password-help">
              {t("staffMyProfile.passwordHelp")}
            </p>

            <form
              className="mp-form"
              onSubmit={handlePasswordChange}
            >
              <div className="mp-form-grid">
                <div className="mp-field">
                  <label htmlFor="staff-current-password">
                    {t("staffMyProfile.currentPassword")}
                  </label>

                  <input
                    id="staff-current-password"
                    type="password"
                    autoComplete="current-password"
                    value={passwordData.currentPassword}
                    onChange={(event) =>
                      setPasswordData((current) => ({
                        ...current,
                        currentPassword: event.target.value,
                      }))
                    }
                    required
                  />
                </div>

                <div className="mp-field">
                  <label htmlFor="staff-new-password">
                    {t("staffMyProfile.newPassword")}
                  </label>

                  <input
                    id="staff-new-password"
                    type="password"
                    autoComplete="new-password"
                    minLength={6}
                    value={passwordData.newPassword}
                    onChange={(event) =>
                      setPasswordData((current) => ({
                        ...current,
                        newPassword: event.target.value,
                      }))
                    }
                    required
                  />
                </div>

                <div className="mp-field">
                  <label htmlFor="staff-confirm-password">
                    {t("staffMyProfile.confirmNewPassword")}
                  </label>

                  <input
                    id="staff-confirm-password"
                    type="password"
                    autoComplete="new-password"
                    minLength={6}
                    value={passwordData.confirmPassword}
                    onChange={(event) =>
                      setPasswordData((current) => ({
                        ...current,
                        confirmPassword: event.target.value,
                      }))
                    }
                    required
                  />
                </div>
              </div>

              <div className="mp-form-actions">
                <button
                  type="submit"
                  className="mp-btn-primary"
                  disabled={isChangingPassword}
                >
                  {isChangingPassword
                    ? t("staffMyProfile.updating")
                    : t("staffMyProfile.updatePassword")}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyProfile;
