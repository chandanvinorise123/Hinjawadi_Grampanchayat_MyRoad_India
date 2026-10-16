import React, { useEffect, useState } from "react";
import "./MyProfile.css";
import { uploadProfilePhoto } from "../utils/dashboardApi";

const MyProfile = ({ initialVerifier, onBack, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(initialVerifier);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setFormData(initialVerifier);
  }, [initialVerifier]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    onUpdate(formData);
    setIsEditing(false);
    setMessage("✅ Profile updated successfully!");
    setTimeout(() => setMessage(""), 3000);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await uploadProfilePhoto(file, formData._id || formData.id, "verifier");
      setFormData((current) => ({ ...current, profilePhoto: data.profilePhoto }));
      onUpdate({ ...formData, profilePhoto: data.profilePhoto });
      const current = JSON.parse(localStorage.getItem("user") || "{}");
      localStorage.setItem("user", JSON.stringify({ ...current, profilePhoto: data.profilePhoto }));
      window.dispatchEvent(new Event("authChange"));
      setMessage("✅ Profile photo uploaded successfully!");
    } catch (error) {
      setMessage(error.message || "Profile photo upload failed.");
    } finally {
      e.target.value = "";
    }
  };

  const handleCancel = () => {
    setFormData(initialVerifier);
    setIsEditing(false);
  };

  const initials = formData.name
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

      {message && <div className="mp-success-message">{message}</div>}

      <div className="mp-container">
        {/* ✅ LEFT SIDE: Profile Summary Card */}
        <div className="mp-sidebar">
          <div className="mp-profile-card">
            <div className="mp-avatar-large">
              {formData.profilePhoto ? <img src={formData.profilePhoto} alt="Profile" /> : initials}
            </div>
            <label className="mp-edit-btn">
              Upload Photo
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoUpload} hidden />
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
                <button className="mp-cancel-btn" onClick={handleCancel}>
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
                  {isEditing ? (
                    <input name="department" value={formData.department} onChange={handleChange} required />
                  ) : (
                    <div className="mp-readonly-value">{formData.department}</div>
                  )}
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
                  <button type="button" className="mp-btn-outline" onClick={handleCancel}>
                    Cancel
                  </button>
                  <button type="submit" className="mp-btn-primary">
                    Save Changes
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyProfile;