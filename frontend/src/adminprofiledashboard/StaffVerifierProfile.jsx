import React, { useState, useEffect } from "react";
import "./StaffVerifierProfile.css";
import { API_BASE_URL } from "../utils/dashboardApi";

const StaffVerifierProfile = ({ userId, role, onBack, usersList = [] }) => {
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
  }, [currentUserId, viewMode]);

  const handleSave = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/profile/${currentUserId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setMessage({ type: "success", text: "Profile updated successfully!" });
        setIsEditing(false);
        setTimeout(() => setMessage({ type: "", text: "" }), 3000);
      } else {
        setMessage({ type: "error", text: data.message || "Update failed" });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Server error" });
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
              <button className="svp-back-btn" onClick={onBack}>← Back to Dashboard</button>
              <div>
                <h2>{viewRole === "staff" ? "Staff Profiles" : "Verifier Profiles"}</h2>
                <p>MyRoad India · {viewRole === "staff" ? "Staff Portal" : "Verifier Portal"}</p>
              </div>
            </div>
            <div className="svp-header-actions">
              <select 
                className="svp-role-select"
                value={viewRole}
                onChange={(e) => setViewRole(e.target.value)}
              >
                <option value="staff">Staff</option>
                <option value="verifier">Verifier</option>
              </select>
            </div>
          </div>

          <div className="svp-table-container">
            {filteredUsers.length === 0 ? (
              <div className="svp-empty-state">No {viewRole}s found.</div>
            ) : (
              <table className="svp-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Contact</th>
                    <th>Department</th>
                    <th>Assigned Area</th>
                    <th>Status</th>
                    <th>Action</th>
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
                          {user.currentWorkStatus || 'Active'}
                        </span>
                      </td>
                      <td>
                        <button 
                          className="svp-btn-primary" 
                          onClick={(e) => { e.stopPropagation(); setCurrentUserId(user.id); setViewMode("detail"); }}
                        >
                          View Details
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

  // ================= DETAIL VIEW (Your Existing Code) =================
  if (loading) return <div className="svp-full-page-loading">Loading Profile...</div>;
  if (!profile) return <div className="svp-full-page-loading">User not found.</div>;

  const isStaff = viewRole === "staff";
  const profileId = isStaff ? formData.staffId : formData.verifierId;
  const title = isStaff ? "Staff Profile" : "Verifier Profile";
  const portalName = isStaff ? "Staff Portal" : "Verifier Portal";

  return (
    <div className="svp-full-page">
      <div className="svp-page-container">
        {/* Header */}
        <div className="svp-header">
          <div className="svp-header-info">
            <button className="svp-back-btn" onClick={handleBack}>
              {usersList.length > 0 ? "← Back to List" : "← Back to Dashboard"}
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
              <option value="staff">Staff Profile</option>
              <option value="verifier">Verifier Profile</option>
            </select>
            
            <span className={`svp-status-badge ${formData.currentWorkStatus === 'Active' || formData.currentWorkStatus === 'On Field' ? 'active' : 'inactive'}`}>
              {formData.currentWorkStatus || 'Active'}
            </span>
          </div>
        </div>

        {message.text && <div className={`svp-message ${message.type}`}>{message.text}</div>}

        <div className="svp-content">
          {/* A. Personal Information */}
          <section className="svp-section">
            <h3>A. Personal Information</h3>
            <div className="svp-grid">
              <div className="svp-field">
                <label>Full Name</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} disabled={!isEditing} />
              </div>
              <div className="svp-field">
                <label>Email Address</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} disabled={!isEditing} />
              </div>
              <div className="svp-field">
                <label>Mobile Number</label>
                <input type="text" name="contact" value={formData.contact} onChange={handleChange} disabled={!isEditing} />
              </div>
              <div className="svp-field">
                <label>Gender (Optional)</label>
                <select name="gender" value={formData.gender} onChange={handleChange} disabled={!isEditing}>
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
              
              {!isStaff && (
                <div className="svp-field full-width">
                  <label>Address</label>
                  <input type="text" name="address" value={formData.address} onChange={handleChange} disabled={!isEditing} />
                </div>
              )}
              {isStaff && (
                <>
                  <div className="svp-field">
                    <label>Date of Birth (Optional)</label>
                    <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} disabled={!isEditing} />
                  </div>
                  <div className="svp-field full-width">
                    <label>Address</label>
                    <input type="text" name="address" value={formData.address} onChange={handleChange} disabled={!isEditing} />
                  </div>
                </>
              )}
            </div>
          </section>

          {/* B. Employment Information */}
          <section className="svp-section">
            <h3>B. Employment Information <span className="svp-note">(Managed by Admin)</span></h3>
            <div className="svp-grid">
              <div className="svp-field">
                <label>{isStaff ? "Staff ID" : "Verifier ID"}</label>
                <input type="text" value={profileId} disabled={true} className="svp-readonly" />
              </div>
              <div className="svp-field">
                <label>Department</label>
                <input type="text" name="department" value={formData.department} onChange={handleChange} disabled={!isEditing} />
              </div>
              <div className="svp-field">
                <label>Designation</label>
                <input type="text" name="designation" value={formData.designation} onChange={handleChange} disabled={!isEditing} />
              </div>
              <div className="svp-field">
                <label>{isStaff ? "Assigned Area" : "Assigned Verification Area"}</label>
                <input type="text" name="assignedArea" value={formData.assignedArea} onChange={handleChange} disabled={!isEditing} />
              </div>
              <div className="svp-field">
                <label>Joining Date</label>
                <input type="date" name="joiningDate" value={formData.joiningDate} onChange={handleChange} disabled={!isEditing} />
              </div>
              <div className="svp-field">
                <label>Reporting Officer</label>
                <input type="text" name="reportingOfficer" value={formData.reportingOfficer} onChange={handleChange} disabled={!isEditing} />
              </div>
            </div>
          </section>

          {/* C. Work / Verification Information */}
          <section className="svp-section">
            <h3>{isStaff ? "C. Work Information" : "C. Verification Information"}</h3>
            <div className="svp-stats-grid">
              <div className="svp-stat-card">
                <span className="svp-stat-label">{isStaff ? "Assigned Complaints" : "Assigned for Verification"}</span>
                <span className="svp-stat-value">{profile.assignedComplaints || 0}</span>
              </div>
              <div className="svp-stat-card">
                <span className="svp-stat-label">{isStaff ? "Resolved Complaints" : "Verified Complaints"}</span>
                <span className="svp-stat-value success">{profile.resolvedComplaints || 0}</span>
              </div>
              
              {!isStaff && (
                <div className="svp-stat-card">
                  <span className="svp-stat-label">Rejected / Recheck</span>
                  <span className="svp-stat-value warning">0</span>
                </div>
              )}
              
              <div className="svp-field" style={{ gridColumn: isStaff ? "span 3" : "span 2" }}>
                <label>Current Work Status</label>
                <select name="currentWorkStatus" value={formData.currentWorkStatus} onChange={handleChange} disabled={!isEditing}>
                  <option value="Idle">Idle</option>
                  <option value="Active">Active</option>
                  <option value="On Field">On Field</option>
                  <option value="On Leave">On Leave</option>
                </select>
              </div>
            </div>
          </section>

          {/* D. Security */}
          <section className="svp-section">
            <h3>D. Security</h3>
            <div className="svp-security-grid">
              <div className="svp-field full-width">
                <label>Change Password</label>
                <div className="svp-password-row">
                  <input type="password" placeholder="Current Password" value={passwordData.current} onChange={(e) => setPasswordData({...passwordData, current: e.target.value})} disabled={!isEditing} />
                  <input type="password" placeholder="New Password" value={passwordData.new} onChange={(e) => setPasswordData({...passwordData, new: e.target.value})} disabled={!isEditing} />
                  <input type="password" placeholder="Confirm Password" value={passwordData.confirm} onChange={(e) => setPasswordData({...passwordData, confirm: e.target.value})} disabled={!isEditing} />
                </div>
              </div>
              <div className="svp-field">
                <label>Last Login</label>
                <input type="text" value={profile.lastLogin ? new Date(profile.lastLogin).toLocaleString() : "Never"} disabled={true} className="svp-readonly" />
              </div>
              <div className="svp-field">
                <label>Login Activity</label>
                <input type="text" value={`${profile.loginActivity?.length || 0} sessions`} disabled={true} className="svp-readonly" />
              </div>
            </div>
          </section>
        </div>

        {/* Footer Actions */}
        <div className="svp-footer">
          <div className="svp-footer-left">
            <button className="svp-btn-outline" onClick={() => { setFormData({...formData}); }}> Copy Form Data</button>
            <button className="svp-btn-danger" onClick={() => setFormData({ name: "", email: "" })}>🔄 Reset</button>
          </div>
          <div className="svp-footer-right">
            {isEditing ? (
              <>
                <button className="svp-btn-outline" onClick={() => setIsEditing(false)}>Cancel</button>
                <button className="svp-btn-primary" onClick={handleSave}>💾 Save Changes</button>
              </>
            ) : (
              <button className="svp-btn-primary" onClick={() => setIsEditing(true)}>✏️ Edit Profile</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffVerifierProfile;