import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next"; // ✅ ADDED
import "./StaffVerifierProfile.css";
import { API_BASE_URL } from "../utils/dashboardApi";

const StaffVerifierProfile = ({ userId, role, onBack, onUserUpdated, usersList = [] }) => {
  const { t } = useTranslation(); // ✅ ADDED
  
  // ✅ NEW: Manage view mode (list vs detail). Defaults to list if usersList is provided.
  const [viewMode, setViewMode] = useState(usersList.length > 0 ? "list" : "detail");
  const [currentUserId, setCurrentUserId] = useState(userId);

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [isEditing, setIsEditing] = useState(false);
  
  const [viewRole, setViewRole] = useState(role || "staff");

  const [formData, setFormData] = useState({
    name: "", email: "", contact: "", gender: "", dateOfBirth: "", address: "",
    staffId: "", verifierId: "", department: "", designation: "", 
    assignedArea: "", joiningDate: "", reportingOfficer: "",
    currentWorkStatus: "Idle"
  });
  
  const [passwordData, setPasswordData] = useState({ current: "", new: "", confirm: "" });

  // ✅ Helper to translate status labels while keeping backend values intact
  const getStatusLabel = (status) => {
    if (status === 'Active') return t('staff_verifier_profile.status_active');
    if (status === 'On Field') return t('staff_verifier_profile.status_on_field');
    if (status === 'On Leave') return t('staff_verifier_profile.status_on_leave');
    return t('staff_verifier_profile.status_idle');
  };

  // ✅ Fetch profile ONLY when in detail mode and currentUserId is set
  useEffect(() => {
    if (viewMode === "detail" && currentUserId) {
      const fetchProfile = async () => {
        try {
          setLoading(true);
          const response = await fetch(`${API_BASE_URL}/users/${currentUserId}`);
          const data = await response.json();
          if (response.ok && data.success) {
            const u = data.user;
            setProfile(u);
            setFormData({
              name: u.name || "", email: u.email || "", contact: u.contact || "",
              gender: u.gender || "", dateOfBirth: u.dateOfBirth ? u.dateOfBirth.split('T')[0] : "",
              address: u.address || "",
              staffId: u.staffId || "", verifierId: u.verifierId || "",
              department: u.department || "", designation: u.designation || "",
              assignedArea: u.assignedArea || "", joiningDate: u.joiningDate ? u.joiningDate.split('T')[0] : "",
              reportingOfficer: u.reportingOfficer || "",
              currentWorkStatus: u.currentWorkStatus || "Idle"
            });
          }
        } catch (err) {
          console.error("Fetch error:", err);
        } finally {
          setLoading(false);
        }
      };
      fetchProfile();
    }
  }, [currentUserId, viewMode, t]);

  const handleSave = async () => {
    try {
      const updates = { ...formData };
      delete updates.password;
      if (viewRole === "staff") {
        delete updates.verifierId;
      } else {
        delete updates.staffId;
      }
      const response = await fetch(`${API_BASE_URL}/users/${currentUserId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setProfile(data.user);
        if (usersList.length > 0) onUserUpdated?.(data.user);
        setMessage({ type: "success", text: t('staff_verifier_profile.msg_updated_success') });
        setIsEditing(false);
        setTimeout(() => setMessage({ type: "", text: "" }), 3000);
      } else {
        setMessage({ type: "error", text: data.message || t('staff_verifier_profile.msg_update_failed') });
      }
    } catch (error) {
      console.error("Failed to update staff/verifier profile:", error);
      setMessage({ type: "error", text: error.message || t('staff_verifier_profile.msg_server_error') });
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleBack = () => {
    if (viewMode === "detail" && usersList.length > 0) {
      setViewMode("list"); // Go back to table
    } else {
      onBack(); // Go back to dashboard
    }
  };

  // ✅ FILTER USERS FOR TABLE VIEW
  const filteredUsers = usersList.filter(u => u.role === viewRole);

  // ================= TABLE VIEW =================
  if (viewMode === "list" && usersList.length > 0) {
    return (
      <div className="svp-full-page">
        <div className="svp-page-container">
          <div className="svp-header">
            <div className="svp-header-info">
              <button className="svp-back-btn" onClick={onBack}>{t('staff_verifier_profile.back_to_dashboard')}</button>
              <div>
                <h2>{viewRole === "staff" ? t('staff_verifier_profile.staff_profiles') : t('staff_verifier_profile.verifier_profiles')}</h2>
                <p>MyRoad India · {viewRole === "staff" ? t('staff_verifier_profile.staff_portal') : t('staff_verifier_profile.verifier_portal')}</p>
              </div>
            </div>
            <div className="svp-header-actions">
              <select 
                className="svp-role-select"
                value={viewRole}
                onChange={(e) => setViewRole(e.target.value)}
              >
                <option value="staff">{t('staff_verifier_profile.staff_profiles')}</option>
                <option value="verifier">{t('staff_verifier_profile.verifier_profiles')}</option>
              </select>
            </div>
          </div>

          <div className="svp-table-container">
            {filteredUsers.length === 0 ? (
              <div className="svp-empty-state">{t('staff_verifier_profile.no_users_found', { role: viewRole })}</div>
            ) : (
              <table className="svp-table">
                <thead>
                  <tr>
                    <th>{t('staff_verifier_profile.col_name')}</th>
                    <th>{t('staff_verifier_profile.col_email')}</th>
                    <th>{t('staff_verifier_profile.col_contact')}</th>
                    <th>{t('staff_verifier_profile.col_department')}</th>
                    <th>{t('staff_verifier_profile.col_assigned_area')}</th>
                    <th>{t('staff_verifier_profile.col_status')}</th>
                    <th>{t('staff_verifier_profile.col_action')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(user => (
                    <tr key={user.id} onClick={() => { setCurrentUserId(user.id); setViewMode("detail"); }}>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td>{user.contact}</td>
                      <td>{user.department || "-"}</td>
                      <td>{user.assignedArea || "-"}</td>
                      <td>
                        <span className={`svp-status-badge ${(user.currentWorkStatus === 'Active' || user.currentWorkStatus === 'On Field') ? 'active' : 'inactive'}`}>
                          {getStatusLabel(user.currentWorkStatus)}
                        </span>
                      </td>
                      <td>
                        <button 
                          className="svp-btn-primary" 
                          onClick={(e) => { e.stopPropagation(); setCurrentUserId(user.id); setViewMode("detail"); }}
                        >
                          {t('staff_verifier_profile.view_details')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ================= DETAIL VIEW =================
  if (loading) return <div className="svp-full-page-loading">{t('staff_verifier_profile.loading_profile')}</div>;
  if (!profile) return <div className="svp-full-page-loading">{t('staff_verifier_profile.user_not_found')}</div>;

  const isStaff = viewRole === "staff";
  const profileId = isStaff ? formData.staffId : formData.verifierId;
  const title = isStaff ? t('staff_verifier_profile.staff_profile_title') : t('staff_verifier_profile.verifier_profile_title');
  const portalName = isStaff ? t('staff_verifier_profile.staff_portal') : t('staff_verifier_profile.verifier_portal');

  return (
    <div className="svp-full-page">
      <div className="svp-page-container">
        {/* Header */}
        <div className="svp-header">
          <div className="svp-header-info">
            <button className="svp-back-btn" onClick={handleBack}>
              {usersList.length > 0 ? t('staff_verifier_profile.back_to_list') : t('staff_verifier_profile.back_to_dashboard')}
            </button>
            <div>
              <h2>{title}</h2>
              <p>MyRoad India · {portalName}</p>
            </div>
          </div>
          
          <div className="svp-header-actions">
            <select 
              className="svp-role-select"
              value={viewRole}
              onChange={(e) => setViewRole(e.target.value)}
            >
              <option value="staff">{t('staff_verifier_profile.staff_profile_title')}</option>
              <option value="verifier">{t('staff_verifier_profile.verifier_profile_title')}</option>
            </select>
            
            <span className={`svp-status-badge ${formData.currentWorkStatus === 'Active' || formData.currentWorkStatus === 'On Field' ? 'active' : 'inactive'}`}>
              {getStatusLabel(formData.currentWorkStatus)}
            </span>
          </div>
        </div>

        {message.text && <div className={`svp-message ${message.type}`}>{message.text}</div>}

        <div className="svp-content">
          {/* A. Personal Information */}
          <section className="svp-section">
            <h3>{t('staff_verifier_profile.personal_info_title')}</h3>
            <div className="svp-grid">
              <div className="svp-field">
                <label>{t('staff_verifier_profile.full_name')}</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} disabled={!isEditing} />
              </div>
              <div className="svp-field">
                <label>{t('staff_verifier_profile.email_address')}</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} disabled={!isEditing} />
              </div>
              <div className="svp-field">
                <label>{t('staff_verifier_profile.mobile_number')}</label>
                <input type="text" name="contact" value={formData.contact} onChange={handleChange} disabled={!isEditing} />
              </div>
              <div className="svp-field">
                <label>{t('staff_verifier_profile.gender_optional')}</label>
                <select name="gender" value={formData.gender} onChange={handleChange} disabled={!isEditing}>
                  <option value="">{t('staff_verifier_profile.select_gender')}</option>
                  <option value="Male">{t('staff_verifier_profile.male')}</option>
                  <option value="Female">{t('staff_verifier_profile.female')}</option>
                  <option value="Other">{t('staff_verifier_profile.other')}</option>
                  <option value="Prefer not to say">{t('staff_verifier_profile.prefer_not_to_say')}</option>
                </select>
              </div>
              
              {!isStaff && (
                <div className="svp-field full-width">
                  <label>{t('staff_verifier_profile.address')}</label>
                  <input type="text" name="address" value={formData.address} onChange={handleChange} disabled={!isEditing} />
                </div>
              )}
              {isStaff && (
                <>
                  <div className="svp-field">
                    <label>{t('staff_verifier_profile.dob_optional')}</label>
                    <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} disabled={!isEditing} />
                  </div>
                  <div className="svp-field full-width">
                    <label>{t('staff_verifier_profile.address')}</label>
                    <input type="text" name="address" value={formData.address} onChange={handleChange} disabled={!isEditing} />
                  </div>
                </>
              )}
            </div>
          </section>

          {/* B. Employment Information */}
          <section className="svp-section">
            <h3>{t('staff_verifier_profile.employment_info_title')} <span className="svp-note">({t('staff_verifier_profile.managed_by_admin')})</span></h3>
            <div className="svp-grid">
              <div className="svp-field">
                <label>{isStaff ? t('staff_verifier_profile.staff_id') : t('staff_verifier_profile.verifier_id')}</label>
                <input
                  type="text"
                  name={isStaff ? "staffId" : "verifierId"}
                  value={isStaff ? profileId : formData.verifierId}
                  onChange={handleChange}
                  disabled={!isEditing || isStaff}
                  className={!isEditing || isStaff ? "svp-readonly" : ""}
                />
              </div>
              <div className="svp-field">
                <label>{t('staff_verifier_profile.department')}</label>
                <input type="text" name="department" value={formData.department} onChange={handleChange} disabled={!isEditing} />
              </div>
              <div className="svp-field">
                <label>{t('staff_verifier_profile.designation')}</label>
                <input type="text" name="designation" value={formData.designation} onChange={handleChange} disabled={!isEditing} />
              </div>
              <div className="svp-field">
                <label>{isStaff ? t('staff_verifier_profile.assigned_area') : t('staff_verifier_profile.assigned_verification_area')}</label>
                <input type="text" name="assignedArea" value={formData.assignedArea} onChange={handleChange} disabled={!isEditing} />
              </div>
              <div className="svp-field">
                <label>{t('staff_verifier_profile.joining_date')}</label>
                <input type="date" name="joiningDate" value={formData.joiningDate} onChange={handleChange} disabled={!isEditing} />
              </div>
              <div className="svp-field">
                <label>{t('staff_verifier_profile.reporting_officer')}</label>
                <input type="text" name="reportingOfficer" value={formData.reportingOfficer} onChange={handleChange} disabled={!isEditing} />
              </div>
            </div>
          </section>

          {/* C. Work / Verification Information */}
          <section className="svp-section">
            <h3>{isStaff ? t('staff_verifier_profile.work_info_title') : t('staff_verifier_profile.verification_info_title')}</h3>
            <div className="svp-stats-grid">
              <div className="svp-stat-card">
                <span className="svp-stat-label">{isStaff ? t('staff_verifier_profile.assigned_complaints') : t('staff_verifier_profile.assigned_for_verification')}</span>
                <span className="svp-stat-value">{profile.assignedComplaints || 0}</span>
              </div>
              <div className="svp-stat-card">
                <span className="svp-stat-label">{isStaff ? t('staff_verifier_profile.resolved_complaints') : t('staff_verifier_profile.verified_complaints')}</span>
                <span className="svp-stat-value success">{profile.resolvedComplaints || 0}</span>
              </div>
              
              {!isStaff && (
                <div className="svp-stat-card">
                  <span className="svp-stat-label">{t('staff_verifier_profile.rejected_recheck')}</span>
                  <span className="svp-stat-value warning">0</span>
                </div>
              )}
              
              <div className="svp-field" style={{ gridColumn: isStaff ? "span 3" : "span 2" }}>
                <label>{t('staff_verifier_profile.current_work_status')}</label>
                <select name="currentWorkStatus" value={formData.currentWorkStatus} onChange={handleChange} disabled={!isEditing}>
                  <option value="Idle">{t('staff_verifier_profile.status_idle')}</option>
                  <option value="Active">{t('staff_verifier_profile.status_active')}</option>
                  <option value="On Field">{t('staff_verifier_profile.status_on_field')}</option>
                  <option value="On Leave">{t('staff_verifier_profile.status_on_leave')}</option>
                </select>
              </div>
            </div>
          </section>

          {/* D. Security */}
          <section className="svp-section">
            <h3>{t('staff_verifier_profile.security_title')}</h3>
            <div className="svp-security-grid">
              <div className="svp-field full-width">
                <label>{t('staff_verifier_profile.change_password')}</label>
                <div className="svp-password-row">
                  <input type="password" placeholder={t('staff_verifier_profile.current_password')} value={passwordData.current} onChange={(e) => setPasswordData({...passwordData, current: e.target.value})} disabled={!isEditing} />
                  <input type="password" placeholder={t('staff_verifier_profile.new_password')} value={passwordData.new} onChange={(e) => setPasswordData({...passwordData, new: e.target.value})} disabled={!isEditing} />
                  <input type="password" placeholder={t('staff_verifier_profile.confirm_password')} value={passwordData.confirm} onChange={(e) => setPasswordData({...passwordData, confirm: e.target.value})} disabled={!isEditing} />
                </div>
              </div>
              <div className="svp-field">
                <label>{t('staff_verifier_profile.last_login')}</label>
                <input type="text" value={profile.lastLogin ? new Date(profile.lastLogin).toLocaleString() : t('staff_verifier_profile.never')} disabled={true} className="svp-readonly" />
              </div>
              <div className="svp-field">
                <label>{t('staff_verifier_profile.login_activity')}</label>
                <input type="text" value={`${profile.loginActivity?.length || 0} ${t('staff_verifier_profile.sessions')}`} disabled={true} className="svp-readonly" />
              </div>
            </div>
          </section>
        </div>

        {/* Footer Actions */}
        <div className="svp-footer">
          <div className="svp-footer-left">
            <button className="svp-btn-outline" onClick={() => { setFormData({...formData}); }}> {t('staff_verifier_profile.copy_form_data')}</button>
            <button className="svp-btn-danger" onClick={() => setFormData({ name: "", email: "" })}>{t('staff_verifier_profile.reset')}</button>
          </div>
          <div className="svp-footer-right">
            {isEditing ? (
              <>
                <button className="svp-btn-outline" onClick={() => setIsEditing(false)}>{t('staff_verifier_profile.cancel')}</button>
                <button className="svp-btn-primary" onClick={handleSave}>{t('staff_verifier_profile.save_changes')}</button>
              </>
            ) : (
              <button className="svp-btn-primary" onClick={() => setIsEditing(true)}>{t('staff_verifier_profile.edit_profile')}</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffVerifierProfile;