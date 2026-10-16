import React, { useState, useEffect } from "react";
import "./AdminManagement.css";
import { API_BASE_URL } from "../utils/dashboardApi";

const AdminManagement = ({ onBack }) => {
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
        showMessage("error", "Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [activeTab]);

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
        showMessage("success", "User status updated");
      } else {
        showMessage("error", data.message || "Failed to update user");
      }
    } catch (err) { 
      console.error(err);
      showMessage("error", "Failed to update user"); 
    }
  };

  const deleteUser = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this user?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/users/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setUsers(users.filter(u => getId(u) !== id));
        showMessage("success", "User deleted successfully");
      } else {
        showMessage("error", data.message || "Failed to delete user");
      }
    } catch (err) { 
      console.error(err);
      showMessage("error", "Failed to delete user"); 
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
        showMessage("success", "Category added successfully");
      } else {
        showMessage("error", data.message || "Failed to add category");
      }
    } catch (err) { 
      console.error(err);
      showMessage("error", "Failed to add category"); 
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
        showMessage("success", "Category status updated");
      }
    } catch (err) { 
      console.error(err);
      showMessage("error", "Failed to update category"); 
    }
  };

  const deleteCategory = async (id) => {
    if (!window.confirm("Are you sure you want to delete this category?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/categories/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setCategories(categories.filter(c => getId(c) !== id));
        showMessage("success", "Category deleted successfully");
      } else {
        showMessage("error", data.message || "Failed to delete category");
      }
    } catch (err) { 
      console.error(err);
      showMessage("error", "Failed to delete category"); 
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
        showMessage("success", "Configuration saved successfully");
      } else {
        showMessage("error", data.message || "Failed to save config");
      }
    } catch (err) { 
      console.error(err);
      showMessage("error", "Failed to save config"); 
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
        showMessage("success", "QR Code generated successfully");
      } else {
        showMessage("error", data.message || "Failed to generate QR");
      }
    } catch (err) { 
      console.error(err);
      showMessage("error", "Failed to generate QR"); 
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
        showMessage("success", `QR Code ${!currentStatus ? "Activated" : "Deactivated"}`);
      }
    } catch (err) { 
      console.error(err);
      showMessage("error", "Failed to update QR code"); 
    }
  };

  const deleteQRCode = async (id) => {
    if (!window.confirm("Are you sure you want to delete this QR code?")) return;
    try {
      // Note: Ensure your backend has a DELETE route for /admin/qrcodes/:id
      const res = await fetch(`${API_BASE_URL}/admin/qrcodes/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setQrcodes(qrcodes.filter(qr => getId(qr) !== id));
        showMessage("success", "QR Code deleted successfully");
      } else {
        showMessage("error", data.message || "Failed to delete QR code");
      }
    } catch (err) { 
      console.error(err);
      showMessage("error", "Failed to delete QR code"); 
    }
  };

  // ================= UI RENDER =================
  const tabs = [
    { id: "overview", label: "📊 Overview" },
    { id: "users", label: "👥 Manage Users" },
    { id: "roles", label: "🔑 Roles & Permissions" },
    { id: "categories", label: "📁 Issue Categories" },
    { id: "config", label: "⚙️ System Config" },
    { id: "qrcodes", label: "📱 QR Codes" },
    { id: "activity", label: "📜 System Activity" },
  ];

  if (loading && !overview) return <div className="am-loading">Loading Admin Management...</div>;

  return (
    <div className="am-shell">
      <div className="am-header">
        <button className="am-back-btn" onClick={onBack}>← Back to Dashboard</button>
        <h2>Admin Management Panel</h2>
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


        {/* 0. OVERVIEW (ROW CARDS FORMAT) */}
        {activeTab === "overview" && (
          <div className="am-overview-container">
            {loading ? (
              <div className="am-loading">Loading Overview Data...</div>
            ) : overview ? (
              <div className="am-overview-grid">
                
                {/* CARD 1: Total Users */}
                <div className="am-overview-card">
                  <h3 className="am-card-header">Total Users</h3>
                  <p className="am-card-value">{overview.totalUsers || 0}</p>
                </div>

                {/* CARD 2: Active Users */}
                <div className="am-overview-card">
                  <h3 className="am-card-header">Active Users</h3>
                  <p className="am-card-value">{overview.activeUsers || 0}</p>
                </div>

                {/* CARD 3: Total Issue Categories */}
                <div className="am-overview-card">
                  <h3 className="am-card-header">Total Issue Categories</h3>
                  <p className="am-card-value">{overview.totalCategories || 0}</p>
                </div>

                {/* CARD 4: Active QR Codes */}
                <div className="am-overview-card">
                  <h3 className="am-card-header">Active QR Codes</h3>
                  <p className="am-card-value">{overview.activeQRCodes || 0}</p>
                </div>

                {/* CARD 5: Recent System Activity (Spans 2 columns) */}
                <div className="am-overview-card am-card-wide">
                  <h3 className="am-card-header">Recent System Activity</h3>
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
                    <p className="am-empty-state">No recent activity logs.</p>
                  )}
                </div>

                {/* CARD 6: Complaint Summary by Status (Spans 2 columns) */}
                <div className="am-overview-card am-card-wide">
                  <h3 className="am-card-header">Complaint Summary by Status</h3>
                  {overview.complaintStatusCounts && overview.complaintStatusCounts.length > 0 ? (
                    <ul className="am-card-list">
                      {overview.complaintStatusCounts.map((item, index) => (
                        <li key={index}>
                          <span className="am-status-label">{item._id || "Unknown"}</span>
                          <span className="am-status-count">{item.count}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="am-empty-state">No complaints recorded yet.</p>
                  )}
                </div>

              </div>
            ) : (
              <div className="am-empty-state">Failed to load overview data.</div>
            )}
          </div>
        )}











        {/* 1. MANAGE USERS */}
        {activeTab === "users" && (
          <table className="am-table">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={getId(u)}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td><span className="am-badge">{u.role}</span></td>
                  <td><span className={`am-badge ${u.isActive !== false ? "success" : "danger"}`}>{u.isActive !== false ? "Active" : "Inactive"}</span></td>
                  <td>
                    <button className="am-btn-sm" onClick={() => toggleUserStatus(getId(u), u.isActive !== false)}>
                      {u.isActive !== false ? "Deactivate" : "Activate"}
                    </button>
                    <button className="am-btn-sm danger" onClick={() => deleteUser(getId(u))}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* 2. ROLES & PERMISSIONS */}
        {activeTab === "roles" && (
          <div className="am-roles-container">
            {["Citizen", "Staff", "Verifier", "Admin"].map(role => (
              <div key={role} className="am-role-card">
                <h3>{role}</h3>
                <ul>
                  <li><input type="checkbox" defaultChecked readOnly /> View Dashboard</li>
                  <li><input type="checkbox" defaultChecked={role !== "Citizen"} readOnly /> Manage Complaints</li>
                  <li><input type="checkbox" defaultChecked={role === "Admin"} readOnly /> System Configuration</li>
                </ul>
              </div>
            ))}
          </div>
        )}

        {/* 3. MANAGE CATEGORIES */}
        {activeTab === "categories" && (
          <div>
            <form className="am-form-inline" onSubmit={addCategory}>
              <input placeholder="Category Name" value={newCategory.name} onChange={e => setNewCategory({...newCategory, name: e.target.value})} required />
              <input placeholder="Description" value={newCategory.description} onChange={e => setNewCategory({...newCategory, description: e.target.value})} />
              <button type="submit" className="am-btn-primary">Add Category</button>
            </form>
            <table className="am-table">
              <thead><tr><th>Name</th><th>Description</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {categories.map(c => (
                  <tr key={getId(c)}>
                    <td>{c.name}</td>
                    <td>{c.description}</td>
                    <td>
                      <span className={`am-badge ${c.isActive ? "success" : "danger"}`}>
                        {c.isActive ? "Enabled" : "Disabled"}
                      </span>
                    </td>
                    <td>
                      <button className="am-btn-sm" onClick={() => toggleCategoryStatus(getId(c), c.isActive)}>
                        {c.isActive ? "Disable" : "Enable"}
                      </button>
                      <button className="am-btn-sm danger" onClick={() => deleteCategory(getId(c))}>Remove</button>
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
              <label>Portal Name</label>
              <input type="text" value={config.portalName || ""} onChange={e => setConfig({...config, portalName: e.target.value})} />
            </div>
            <div className="am-form-group">
              <label>Complaint Prefix</label>
              <input type="text" value={config.complaintPrefix || ""} onChange={e => setConfig({...config, complaintPrefix: e.target.value})} />
            </div>
            <div className="am-form-group">
              <label>Default Language</label>
              <select value={config.defaultLanguage || "English"} onChange={e => setConfig({...config, defaultLanguage: e.target.value})}>
                <option>English</option><option>Hindi</option><option>Marathi</option>
              </select>
            </div>
            <div className="am-form-group">
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                <input type="checkbox" checked={config.enableEmailNotifications} onChange={e => setConfig({...config, enableEmailNotifications: e.target.checked})} />
                Enable Email Notifications
              </label>
            </div>
            <button type="submit" className="am-btn-primary">Save Configuration</button>
          </form>
        )}

        {/* 5. MANAGE QR CODES */}
        {activeTab === "qrcodes" && (
          <div>
            <form className="am-form-inline" onSubmit={addQRCode}>
              <input placeholder="QR Code String" value={newQR.code} onChange={e => setNewQR({...newQR, code: e.target.value})} required />
              <input placeholder="Location" value={newQR.location} onChange={e => setNewQR({...newQR, location: e.target.value})} required />
              <button type="submit" className="am-btn-primary">Generate QR</button>
            </form>
            <table className="am-table">
              <thead><tr><th>Code</th><th>Location</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {qrcodes.map(qr => (
                  <tr key={getId(qr)}>
                    <td><code>{qr.code}</code></td>
                    <td>{qr.location}</td>
                    <td><span className={`am-badge ${qr.isActive ? "success" : "danger"}`}>{qr.isActive ? "Active" : "Inactive"}</span></td>
                    <td>
                      <button className="am-btn-sm" onClick={() => toggleQRStatus(getId(qr), qr.isActive)}>
                        {qr.isActive ? "Deactivate" : "Activate"}
                      </button>
                      <button className="am-btn-sm danger" onClick={() => deleteQRCode(getId(qr))}>Delete</button>
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
            <h3>Recent Complaints</h3>
            <table className="am-table">
              <thead><tr><th>ID</th><th>Category</th><th>Location</th><th>Date</th><th>Status</th></tr></thead>
              <tbody>
                {activity.complaints && activity.complaints.map(c => (
                  <tr key={getId(c)}>
                    <td>{c.complaintNumber}</td>
                    <td>{c.category}</td>
                    <td>{c.location}</td>
                    <td>{c.date ? new Date(c.date).toLocaleDateString() : "N/A"}</td>
                    <td><span className="am-badge">{c.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <h3 style={{marginTop: "32px"}}>System Logs</h3>
            <ul className="am-activity-list">
              {activity.logs && activity.logs.map((log, i) => (
                <li key={i}>
                  <strong>{log.action}</strong> by {log.userName}: {log.details} 
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