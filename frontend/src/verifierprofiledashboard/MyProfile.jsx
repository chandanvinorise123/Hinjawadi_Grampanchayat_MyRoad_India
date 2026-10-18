import React, { useState } from "react";
import "./MyProfile.css";
import { changeDashboardPassword, getStoredUser, getUserId, toMediaUrl, uploadProfilePhoto } from "../utils/dashboardApi";

const createFormData = (profile = {}) => ({
  ...profile,
  name: profile.name || "",
  role: profile.role || "",
  department: profile.department || "",
  ward: profile.ward || "",
  contact: profile.contact || "",
  email: profile.email || "",
  staffId: profile.staffId || profile.verifierId || "",
});

const MyProfile = ({ initialVerifier, onBack, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(() => createFormData(initialVerifier));
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [messageType, setMessageType] = useState("success");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage("");
    try {
      const result = await onUpdate(formData);
      if (!result?.success) throw new Error("The profile update was not confirmed by the server.");
      setIsEditing(false);
      setMessageType("success");
      setMessage("✅ Profile updated successfully!");
    } catch (error) {
      setMessageType("error");
      setMessage(error.message || "Profile update failed.");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsSaving(true);
    try {
      const data = await uploadProfilePhoto(file, formData._id || formData.id, "verifier");
      setFormData((current) => ({ ...current, profilePhoto: data.profilePhoto }));
      const result = await onUpdate({ ...formData, profilePhoto: data.profilePhoto });
      if (!result?.success) throw new Error("The profile photo was uploaded but could not be synchronized.");
      const current = JSON.parse(localStorage.getItem("user") || "{}");
      localStorage.setItem("user", JSON.stringify({ ...current, profilePhoto: data.profilePhoto }));
      window.dispatchEvent(new Event("authChange"));
      setMessageType("success");
      setMessage("✅ Profile photo uploaded successfully!");
    } catch (error) {
      setMessageType("error");
      setMessage(error.message || "Profile photo upload failed.");
    } finally {
      setIsSaving(false);
      e.target.value = "";
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessageType("error");
      setMessage("New passwords do not match.");
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setMessageType("error");
      setMessage("New password must be at least 6 characters.");
      return;
    }

    setIsChangingPassword(true);
    setMessage("");
    try {
      await changeDashboardPassword(
        getUserId(getStoredUser()),
        passwordData.currentPassword,
        passwordData.newPassword
      );
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setMessageType("success");
      setMessage("Password changed successfully.");
    } catch (error) {
      setMessageType("error");
      setMessage(error.message || "Password change failed.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleCancel = () => {
    setFormData(initialVerifier);
    setIsEditing(false);
  };

  const initials = String(formData.name || "")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="mp-shell">
      {/* Header */}
      <div className="mp-header">
        <button className="mp-back-btn" onClick={onBack}>
          ← Back to Dashboard
        </button>
        <h2>My Profile</h2>
      </div>

      {message && <div className={`mp-success-message ${messageType === "error" ? "mp-error-message" : ""}`} role={messageType === "error" ? "alert" : "status"}>{message}</div>}

      <div className="mp-container">
        {/* ✅ LEFT SIDE: Profile Summary Card */}
        <div className="mp-sidebar">
          <div className="mp-profile-card">
            <div className="mp-avatar-large">
              {formData.profilePhoto ? <img src={toMediaUrl(formData.profilePhoto)} alt="Profile" /> : initials}
            </div>
            <label className="mp-edit-btn">
              Upload Photo
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoUpload} disabled={isSaving} hidden />
            </label>
            <div className="mp-profile-info">
              <h3>{formData.name}</h3>
              <p className="mp-role">{formData.role}</p>
              <span className="mp-staff-id-badge">{formData.staffId}</span>
            </div>
            
            <div className="mp-profile-actions">
              {!isEditing ? (
                <button className="mp-edit-btn" onClick={() => setIsEditing(true)}>
                  ✏️ Edit Profile
                </button>
              ) : (
                <button className="mp-cancel-btn" disabled={isSaving} onClick={handleCancel}>
                  Cancel Changes
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ✅ RIGHT SIDE: Profile Details / Form */}
        <div className="mp-main-content">
          <div className="mp-content-card">
            <div className="mp-card-header">
              <h3>{isEditing ? "Edit Profile Information" : "Profile Information"}</h3>
            </div>

            <form className="mp-form" onSubmit={handleSave}>
              <div className="mp-form-grid">
                {/* Full Name */}
                <div className="mp-field">
                  <label>Full Name</label>
                  {isEditing ? (
                    <input name="name" value={formData.name} onChange={handleChange} required />
                  ) : (
                    <div className="mp-readonly-value">{formData.name}</div>
                  )}
                </div>

                {/* Verifier ID */}
                <div className="mp-field">
                  <label>Verifier ID</label>
                  <div className="mp-readonly-value mp-mono">{formData.staffId}</div>
                </div>

                {/* Role / Designation */}
                <div className="mp-field">
                  <label>Role / Designation</label>
                  {isEditing ? (
                    <input name="role" value={formData.role} onChange={handleChange} required />
                  ) : (
                    <div className="mp-readonly-value">{formData.role}</div>
                  )}
                </div>

                {/* Department */}
                <div className="mp-field">
                  <label>Department</label>
                  <div className="mp-readonly-value">{formData.department}</div>
                </div>

                {/* Assigned Ward */}
                <div className="mp-field">
                  <label>Assigned Ward</label>
                  {isEditing ? (
                    <input name="ward" value={formData.ward} onChange={handleChange} required />
                  ) : (
                    <div className="mp-readonly-value">{formData.ward}</div>
                  )}
                </div>

                {/* Contact Number */}
                <div className="mp-field">
                  <label>Contact Number</label>
                  {isEditing ? (
                    <input name="contact" value={formData.contact} onChange={handleChange} required />
                  ) : (
                    <div className="mp-readonly-value">{formData.contact}</div>
                  )}
                </div>

                {/* Email Address */}
                <div className="mp-field">
                  <label>Email Address</label>
                  {isEditing ? (
                    <input name="email" type="email" value={formData.email} onChange={handleChange} required />
                  ) : (
                    <div className="mp-readonly-value">{formData.email}</div>
                  )}
                </div>

                {/* Join Date */}
                <div className="mp-field">
                  <label>Join Date</label>
                  <div className="mp-readonly-value">{formData.joinDate}</div>
                </div>
              </div>

              {isEditing && (
                <div className="mp-form-actions">
                  <button type="button" className="mp-btn-outline" disabled={isSaving} onClick={handleCancel}>
                    Cancel
                  </button>
                  <button type="submit" className="mp-btn-primary" disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              )}
            </form>
          </div>

          <div className="mp-content-card mp-password-card">
            <div className="mp-card-header">
              <h3>Change Password</h3>
            </div>
            <p className="mp-password-help">Enter your current password to set a new password for your verifier account.</p>
            <form className="mp-form" onSubmit={handlePasswordChange}>
              <div className="mp-form-grid">
                <div className="mp-field">
                  <label htmlFor="verifier-current-password">Current Password</label>
                  <input
                    id="verifier-current-password"
                    type="password"
                    autoComplete="current-password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData((current) => ({ ...current, currentPassword: e.target.value }))}
                    required
                  />
                </div>
                <div className="mp-field">
                  <label htmlFor="verifier-new-password">New Password</label>
                  <input
                    id="verifier-new-password"
                    type="password"
                    autoComplete="new-password"
                    minLength={6}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData((current) => ({ ...current, newPassword: e.target.value }))}
                    required
                  />
                </div>
                <div className="mp-field">
                  <label htmlFor="verifier-confirm-password">Confirm New Password</label>
                  <input
                    id="verifier-confirm-password"
                    type="password"
                    autoComplete="new-password"
                    minLength={6}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData((current) => ({ ...current, confirmPassword: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div className="mp-form-actions">
                <button type="submit" className="mp-btn-primary" disabled={isChangingPassword}>
                  {isChangingPassword ? "Updating..." : "Update Password"}
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