import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next"; // ✅ ADDED
import "./AdminManagement.css";
import { API_BASE_URL } from "../utils/dashboardApi";

const AdminManagement = ({ onBack }) => {
  const { t } = useTranslation(); // ✅ ADDED
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: "", text: "" });

  // State for each section
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [config, setConfig] = useState({});
  const [qrcodes, setQrcodes] = useState([]);
  const [activity, setActivity] = useState({ logs: [], complaints: [] });

  // Form States
  const [newCategory, setNewCategory] = useState({ name: "", description: "", isActive: true });
  const [newQR, setNewQR] = useState({ code: "", location: "", isActive: true });

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 3000);
  };

  // Helper to get ID safely (handles both _id from MongoDB and normalized id)
  const getId = (item) => item.id || item._id;

  // Fetch all data on mount or tab change
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (activeTab === "overview") {
          const res = await fetch(`${API_BASE_URL}/admin/overview`);
          const data = await res.json();
          if (data.success) setOverview(data.stats);
        } else if (activeTab === "users") {
          const res = await fetch(`${API_BASE_URL}/users`);
          const data = await res.json();
          if (data.success) setUsers(data.users);
        } else if (activeTab === "categories") {
          const res = await fetch(`${API_BASE_URL}/admin/categories`);
          const data = await res.json();
          if (data.success) setCategories(data.categories);
        } else if (activeTab === "config") {
          const res = await fetch(`${API_BASE_URL}/admin/config`);
          const data = await res.json();
          if (data.success) setConfig(data.config);
        } else if (activeTab === "qrcodes") {
          const res = await fetch(`${API_BASE_URL}/admin/qrcodes`);
          const data = await res.json();
          if (data.success) setQrcodes(data.qrcodes);
        } else if (activeTab === "activity") {
          const res = await fetch(`${API_BASE_URL}/admin/activity`);
          const data = await res.json();
          if (data.success) setActivity(data);
        }
      } catch (err) {
        console.error("Fetch error:", err);
        showMessage("error", t('admin_management.msg_failed_load'));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [activeTab, t]);

  // ================= CRUD HANDLERS =================

  // 1. USERS CRUD
  const toggleUserStatus = async (id, currentStatus) => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/users/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setUsers(users.map(u => getId(u) === id ? { ...u, isActive: !currentStatus } : u));
        showMessage("success", t('admin_management.msg_user_status_updated'));
      } else {
        showMessage("error", data.message || t('admin_management.msg_failed_update_user'));
      }
    } catch (err) { 
      console.error(err);
      showMessage("error", t('admin_management.msg_failed_update_user')); 
    }
  };

  const deleteUser = async (id) => {
    if (!window.confirm(t('admin_management.msg_confirm_delete_user'))) return;
    try {
      const res = await fetch(`${API_BASE_URL}/users/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setUsers(users.filter(u => getId(u) !== id));
        showMessage("success", t('admin_management.msg_user_deleted'));
      } else {
        showMessage("error", data.message || t('admin_management.msg_failed_delete_user'));
      }
    } catch (err) { 
      console.error(err);
      showMessage("error", t('admin_management.msg_failed_delete_user')); 
    }
  };

  // 3. CATEGORIES CRUD
  const addCategory = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/admin/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCategory),
      });
      const data = await res.json();
      if (data.success) {
        setCategories([data.category, ...categories]);
        setNewCategory({ name: "", description: "", isActive: true });
        showMessage("success", t('admin_management.msg_category_added'));
      } else {
        showMessage("error", data.message || t('admin_management.msg_failed_add_category'));
      }
    } catch (err) { 
      console.error(err);
      showMessage("error", t('admin_management.msg_failed_add_category')); 
    }
  };

  const toggleCategoryStatus = async (id, currentStatus) => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setCategories(categories.map(c => getId(c) === id ? { ...c, isActive: !currentStatus } : c));
        showMessage("success", t('admin_management.msg_category_status_updated'));
      }
    } catch (err) { 
      console.error(err);
      showMessage("error", t('admin_management.msg_failed_update_category')); 
    }
  };

  const deleteCategory = async (id) => {
    if (!window.confirm(t('admin_management.msg_confirm_delete_category'))) return;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/categories/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setCategories(categories.filter(c => getId(c) !== id));
        showMessage("success", t('admin_management.msg_category_deleted'));
      } else {
        showMessage("error", data.message || t('admin_management.msg_failed_delete_category'));
      }
    } catch (err) { 
      console.error(err);
      showMessage("error", t('admin_management.msg_failed_delete_category')); 
    }
  };

  // 4. CONFIG CRUD
  const saveConfig = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/admin/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.success) {
        setConfig(data.config);
        showMessage("success", t('admin_management.msg_config_saved'));
      } else {
        showMessage("error", data.message || t('admin_management.msg_failed_save_config'));
      }
    } catch (err) { 
      console.error(err);
      showMessage("error", t('admin_management.msg_failed_save_config')); 
    }
  };

  // 5. QR CODES CRUD
  const addQRCode = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/admin/qrcodes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newQR),
      });
      const data = await res.json();
      if (data.success) {
        setQrcodes([data.qrCode, ...qrcodes]);
        setNewQR({ code: "", location: "", isActive: true });
        showMessage("success", t('admin_management.msg_qr_generated'));
      } else {
        showMessage("error", data.message || t('admin_management.msg_failed_generate_qr'));
      }
    } catch (err) { 
      console.error(err);
      showMessage("error", t('admin_management.msg_failed_generate_qr')); 
    }
  };

  const toggleQRStatus = async (id, currentStatus) => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/qrcodes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setQrcodes(qrcodes.map(qr => getId(qr) === id ? { ...qr, isActive: !currentStatus } : qr));
        showMessage("success", t(!currentStatus ? 'admin_management.msg_qr_activated' : 'admin_management.msg_qr_deactivated'));
      }
    } catch (err) { 
      console.error(err);
      showMessage("error", t('admin_management.msg_failed_update_qr')); 
    }
  };

  const deleteQRCode = async (id) => {
    if (!window.confirm(t('admin_management.msg_confirm_delete_qr'))) return;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/qrcodes/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setQrcodes(qrcodes.filter(qr => getId(qr) !== id));
        showMessage("success", t('admin_management.msg_qr_deleted'));
      } else {
        showMessage("error", data.message || t('admin_management.msg_failed_delete_qr'));
      }
    } catch (err) { 
      console.error(err);
      showMessage("error", t('admin_management.msg_failed_delete_qr')); 
    }
  };

  // ================= UI RENDER =================
  const tabs = [
    { id: "overview", label: `📊 ${t('admin_management.tab_overview')}` },
    { id: "users", label: `👥 ${t('admin_management.tab_users')}` },
    { id: "roles", label: `🔑 ${t('admin_management.tab_roles')}` },
    { id: "categories", label: `📁 ${t('admin_management.tab_categories')}` },
    { id: "config", label: `⚙️ ${t('admin_management.tab_config')}` },
    { id: "qrcodes", label: `📱 ${t('admin_management.tab_qrcodes')}` },
    { id: "activity", label: `📜 ${t('admin_management.tab_activity')}` },
  ];

  const roleKeys = ["citizen", "staff", "verifier", "admin"];

  if (loading && !overview) return <div className="am-loading">{t('admin_management.loading')}</div>;

  return (
    <div className="am-shell">
      <div className="am-header">
        <button className="am-back-btn" onClick={onBack}>{t('admin_management.back_to_dashboard')}</button>
        <h2>{t('admin_management.title')}</h2>
      </div>

      {message.text && <div className={`am-message ${message.type}`}>{message.text}</div>}

      <div className="am-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`am-tab-btn ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="am-content">
        {/* 0. OVERVIEW */}
        {activeTab === "overview" && (
          <div className="am-overview-container">
            {loading ? (
              <div className="am-loading">{t('admin_management.overview.loading')}</div>
            ) : overview ? (
              <div className="am-overview-grid">
                <div className="am-overview-card">
                  <h3 className="am-card-header">{t('admin_management.overview.total_users')}</h3>
                  <p className="am-card-value">{overview.totalUsers || 0}</p>
                </div>
                <div className="am-overview-card">
                  <h3 className="am-card-header">{t('admin_management.overview.active_users')}</h3>
                  <p className="am-card-value">{overview.activeUsers || 0}</p>
                </div>
                <div className="am-overview-card">
                  <h3 className="am-card-header">{t('admin_management.overview.total_categories')}</h3>
                  <p className="am-card-value">{overview.totalCategories || 0}</p>
                </div>
                <div className="am-overview-card">
                  <h3 className="am-card-header">{t('admin_management.overview.active_qrcodes')}</h3>
                  <p className="am-card-value">{overview.activeQRCodes || 0}</p>
                </div>
                <div className="am-overview-card am-card-wide">
                  <h3 className="am-card-header">{t('admin_management.overview.recent_activity')}</h3>
                  {overview.recentActivity && overview.recentActivity.length > 0 ? (
                    <ul className="am-card-list">
                      {overview.recentActivity.map((log, index) => (
                        <li key={index}>
                          <span><strong>{log.action}</strong>: {log.details}</span>
                          <span className="am-card-time">
                            {new Date(log.timestamp || log.createdAt).toLocaleTimeString()}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="am-empty-state">{t('admin_management.overview.no_recent_activity')}</p>
                  )}
                </div>
                <div className="am-overview-card am-card-wide">
                  <h3 className="am-card-header">{t('admin_management.overview.complaint_summary')}</h3>
                  {overview.complaintStatusCounts && overview.complaintStatusCounts.length > 0 ? (
                    <ul className="am-card-list">
                      {overview.complaintStatusCounts.map((item, index) => (
                        <li key={index}>
                          <span className="am-status-label">{item._id || t('admin_management.overview.unknown')}</span>
                          <span className="am-status-count">{item.count}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="am-empty-state">{t('admin_management.overview.no_complaints')}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="am-empty-state">{t('admin_management.overview.failed_to_load')}</div>
            )}
          </div>
        )}

        {/* 1. MANAGE USERS */}
        {activeTab === "users" && (
          <table className="am-table">
            <thead><tr><th>{t('admin_management.users.col_name')}</th><th>{t('admin_management.users.col_email')}</th><th>{t('admin_management.users.col_role')}</th><th>{t('admin_management.users.col_status')}</th><th>{t('admin_management.users.col_actions')}</th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={getId(u)}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td><span className="am-badge">{u.role}</span></td>
                  <td><span className={`am-badge ${u.isActive !== false ? "success" : "danger"}`}>{u.isActive !== false ? t('admin_management.users.status_active') : t('admin_management.users.status_inactive')}</span></td>
                  <td>
                    <button className="am-btn-sm" onClick={() => toggleUserStatus(getId(u), u.isActive !== false)}>
                      {u.isActive !== false ? t('admin_management.users.btn_deactivate') : t('admin_management.users.btn_activate')}
                    </button>
                    <button className="am-btn-sm danger" onClick={() => deleteUser(getId(u))}>{t('admin_management.users.btn_delete')}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* 2. ROLES & PERMISSIONS */}
        {activeTab === "roles" && (
          <div className="am-roles-container">
            {roleKeys.map(roleKey => (
              <div key={roleKey} className="am-role-card">
                <h3>{t(`admin_management.roles.${roleKey}`)}</h3>
                <ul>
                  <li><input type="checkbox" defaultChecked readOnly /> {t('admin_management.roles.perm_view_dashboard')}</li>
                  <li><input type="checkbox" defaultChecked={roleKey !== "citizen"} readOnly /> {t('admin_management.roles.perm_manage_complaints')}</li>
                  <li><input type="checkbox" defaultChecked={roleKey === "admin"} readOnly /> {t('admin_management.roles.perm_system_config')}</li>
                </ul>
              </div>
            ))}
          </div>
        )}

        {/* 3. MANAGE CATEGORIES */}
        {activeTab === "categories" && (
          <div>
            <form className="am-form-inline" onSubmit={addCategory}>
              <input placeholder={t('admin_management.categories.placeholder_name')} value={newCategory.name} onChange={e => setNewCategory({...newCategory, name: e.target.value})} required />
              <input placeholder={t('admin_management.categories.placeholder_desc')} value={newCategory.description} onChange={e => setNewCategory({...newCategory, description: e.target.value})} />
              <button type="submit" className="am-btn-primary">{t('admin_management.categories.btn_add')}</button>
            </form>
            <table className="am-table">
              <thead><tr><th>{t('admin_management.categories.col_name')}</th><th>{t('admin_management.categories.col_desc')}</th><th>{t('admin_management.categories.col_status')}</th><th>{t('admin_management.categories.col_actions')}</th></tr></thead>
              <tbody>
                {categories.map(c => (
                  <tr key={getId(c)}>
                    <td>{c.name}</td>
                    <td>{c.description}</td>
                    <td>
                      <span className={`am-badge ${c.isActive ? "success" : "danger"}`}>
                        {c.isActive ? t('admin_management.categories.status_enabled') : t('admin_management.categories.status_disabled')}
                      </span>
                    </td>
                    <td>
                      <button className="am-btn-sm" onClick={() => toggleCategoryStatus(getId(c), c.isActive)}>
                        {c.isActive ? t('admin_management.categories.btn_disable') : t('admin_management.categories.btn_enable')}
                      </button>
                      <button className="am-btn-sm danger" onClick={() => deleteCategory(getId(c))}>{t('admin_management.categories.btn_remove')}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 4. SYSTEM CONFIGURATION */}
        {activeTab === "config" && (
          <form className="am-form-vertical" onSubmit={saveConfig}>
            <div className="am-form-group">
              <label>{t('admin_management.config.label_portal_name')}</label>
              <input type="text" value={config.portalName || ""} onChange={e => setConfig({...config, portalName: e.target.value})} />
            </div>
            <div className="am-form-group">
              <label>{t('admin_management.config.label_prefix')}</label>
              <input type="text" value={config.complaintPrefix || ""} onChange={e => setConfig({...config, complaintPrefix: e.target.value})} />
            </div>
            <div className="am-form-group">
              <label>{t('admin_management.config.label_language')}</label>
              <select value={config.defaultLanguage || "English"} onChange={e => setConfig({...config, defaultLanguage: e.target.value})}>
                <option value="English">{t('admin_management.config.lang_english')}</option>
                <option value="Hindi">{t('admin_management.config.lang_hindi')}</option>
                <option value="Marathi">{t('admin_management.config.lang_marathi')}</option>
              </select>
            </div>
            <div className="am-form-group">
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                <input type="checkbox" checked={config.enableEmailNotifications} onChange={e => setConfig({...config, enableEmailNotifications: e.target.checked})} />
                {t('admin_management.config.label_email_notif')}
              </label>
            </div>
            <button type="submit" className="am-btn-primary">{t('admin_management.config.btn_save')}</button>
          </form>
        )}

        {/* 5. MANAGE QR CODES */}
        {activeTab === "qrcodes" && (
          <div>
            <form className="am-form-inline" onSubmit={addQRCode}>
              <input placeholder={t('admin_management.qrcodes.placeholder_code')} value={newQR.code} onChange={e => setNewQR({...newQR, code: e.target.value})} required />
              <input placeholder={t('admin_management.qrcodes.placeholder_location')} value={newQR.location} onChange={e => setNewQR({...newQR, location: e.target.value})} required />
              <button type="submit" className="am-btn-primary">{t('admin_management.qrcodes.btn_generate')}</button>
            </form>
            <table className="am-table">
              <thead><tr><th>{t('admin_management.qrcodes.col_code')}</th><th>{t('admin_management.qrcodes.col_location')}</th><th>{t('admin_management.qrcodes.col_status')}</th><th>{t('admin_management.qrcodes.col_actions')}</th></tr></thead>
              <tbody>
                {qrcodes.map(qr => (
                  <tr key={getId(qr)}>
                    <td><code>{qr.code}</code></td>
                    <td>{qr.location}</td>
                    <td><span className={`am-badge ${qr.isActive ? "success" : "danger"}`}>{qr.isActive ? t('admin_management.qrcodes.status_active') : t('admin_management.qrcodes.status_inactive')}</span></td>
                    <td>
                      <button className="am-btn-sm" onClick={() => toggleQRStatus(getId(qr), qr.isActive)}>
                        {qr.isActive ? t('admin_management.qrcodes.btn_deactivate') : t('admin_management.qrcodes.btn_activate')}
                      </button>
                      <button className="am-btn-sm danger" onClick={() => deleteQRCode(getId(qr))}>{t('admin_management.qrcodes.btn_delete')}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 6. MONITOR ACTIVITY */}
        {activeTab === "activity" && (
          <div>
            <h3>{t('admin_management.activity.recent_complaints')}</h3>
            <table className="am-table">
              <thead><tr><th>{t('admin_management.activity.col_id')}</th><th>{t('admin_management.activity.col_category')}</th><th>{t('admin_management.activity.col_location')}</th><th>{t('admin_management.activity.col_date')}</th><th>{t('admin_management.activity.col_status')}</th></tr></thead>
              <tbody>
                {activity.complaints && activity.complaints.map(c => (
                  <tr key={getId(c)}>
                    <td>{c.complaintNumber}</td>
                    <td>{c.category}</td>
                    <td>{c.location}</td>
                    <td>{c.date ? new Date(c.date).toLocaleDateString() : t('admin_management.activity.na')}</td>
                    <td><span className="am-badge">{c.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <h3 style={{marginTop: "32px"}}>{t('admin_management.activity.system_logs')}</h3>
            <ul className="am-activity-list">
              {activity.logs && activity.logs.map((log, i) => (
                <li key={i}>
                  <strong>{log.action}</strong> {t('admin_management.activity.by')} {log.userName}: {log.details} 
                  <span className="am-time">{new Date(log.timestamp || log.createdAt).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminManagement;