import React, { useState, useMemo, useEffect } from "react";
import "./ComplaintManagement.css";
import { API_BASE_URL, fetchDashboard, getStoredUser, getUserId, updateDashboardComplaint } from "../utils/dashboardApi";

// ==========================================
// ==========================================

const STATUS_OPTIONS = ["New", "Pending", "Under Verification", "Under Action", "Resolved"];
const PRIORITY_OPTIONS = ["Critical", "Urgent", "Normal"];

const ComplaintManagement = ({ onBack }) => {
  // State
  const [complaints, setComplaints] = useState([]);
  const [staffOptions, setStaffOptions] = useState([]);
  const [verifierOptions, setVerifierOptions] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterPriority, setFilterPriority] = useState("All");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  
  // Modal State
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError("");
    Promise.all([
      fetchDashboard("admin", getUserId(getStoredUser())),
      fetch(`${API_BASE_URL}/users?role=staff,verifier`).then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.success === false) {
          throw new Error(data.message || "Failed to load staff and verifier users");
        }
        return data;
      }),
    ])
      .then(([dashboard, usersResult]) => {
        if (!active) return;
        setComplaints(dashboard.complaints || []);
        const users = usersResult.users || [];
        setStaffOptions(users.filter((user) => user.role === "staff"));
        setVerifierOptions(users.filter((user) => user.role === "verifier"));
      })
      .catch((error) => {
        if (!active) return;
        console.error("Failed to load complaints:", error);
        setLoadError(error.message || "Failed to load complaints");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Filter Logic
  const filteredComplaints = useMemo(() => {
    return complaints.filter(c => {
      const search = searchTerm.toLowerCase();
      const matchesSearch = String(c.complaintNumber || "").toLowerCase().includes(search) ||
                            String(c.issue || "").toLowerCase().includes(search) ||
                            String(c.location || "").toLowerCase().includes(search);
      const matchesStatus = filterStatus === "All" || c.status === filterStatus;
      const matchesPriority = filterPriority === "All" || c.priority === filterPriority;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [complaints, searchTerm, filterStatus, filterPriority]);

  // Stats Calculation
  const stats = useMemo(() => ({
    total: complaints.length,
    new: complaints.filter(c => c.status === "New").length,
    inProgress: complaints.filter(c => ["Under Action", "Under Verification"].includes(c.status)).length,
    resolved: complaints.filter(c => c.status === "Resolved").length,
  }), [complaints]);

  // --- Actions (Currently updates local state, will be API calls later) ---
  const handleOpenDetails = (complaint) => {
    setSelectedComplaint({
      ...complaint,
      complaintNumber: complaint.complaintNumber || complaint.id || "Complaint",
      citizenName: complaint.citizenName || "Not available",
      category: complaint.category || "Not available",
      location: complaint.location || "Location pending",
      description: complaint.description || "No description provided",
      photos: Array.isArray(complaint.citizenPhotos || complaint.photos)
        ? (complaint.citizenPhotos || complaint.photos).length
        : complaint.photos || "None",
      priority: complaint.priority || "Normal",
      status: complaint.status || "New",
      assignedStaff: complaint.assignedStaff || "",
      assignedVerifier: complaint.assignedVerifier || "",
    });
    setShowModal(true);
  };

  const handleSaveChanges = async () => {
    if (!selectedComplaint?.id) return;
    try {
      setSaving(true);
      const data = await updateDashboardComplaint(selectedComplaint.id, {
        status: selectedComplaint.status,
        priority: selectedComplaint.priority,
        assignedStaff: selectedComplaint.assignedStaff,
        assignedVerifier: selectedComplaint.assignedVerifier,
      });
      setComplaints((current) => current.map(c => c.id === selectedComplaint.id ? data.complaint : c));
      setShowModal(false);
      setSelectedComplaint(null);
    } catch (error) {
      console.error("Failed to save complaint changes:", error);
      setLoadError(error.message || "Failed to save complaint changes");
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = { "New": "navy", "Pending": "amber", "Under Verification": "orange", "Under Action": "orange", "Resolved": "green" };
    return colors[status] || "navy";
  };

  const getPriorityColor = (priority) => {
    const colors = { "Critical": "red", "Urgent": "amber", "Normal": "green" };
    return colors[priority] || "navy";
  };

  return (
    <div className="cm-shell">
      {/* Header */}
      <div className="cm-header">
        <button className="cm-back-btn" onClick={onBack}>← Back to Dashboard</button>
        <div>
          <h2>Complaint Management</h2>
          <p>Monitor, verify, assign, and resolve citizen complaints.</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="cm-stats-row">
        <div className="cm-stat-card"><h3>Total Complaints</h3><p>{stats.total}</p></div>
        <div className="cm-stat-card new"><h3>New</h3><p>{stats.new}</p></div>
        <div className="cm-stat-card progress"><h3>In Progress</h3><p>{stats.inProgress}</p></div>
        <div className="cm-stat-card resolved"><h3>Resolved</h3><p>{stats.resolved}</p></div>
      </div>

      {/* Search & Filters */}
      <div className="cm-toolbar">
        <div className="cm-search-box">
          <span>🔍</span>
          <input 
            type="text" 
            placeholder="Search by ID, issue, or location..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="All">All Statuses</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
          <option value="All">All Priorities</option>
          {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Complaints Table */}
      <div className="cm-table-container">
        {loadError && <div className="cm-error" role="alert">{loadError}</div>}
        {loading ? (
          <div className="cm-empty">Loading complaints...</div>
        ) : (
        <table className="cm-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Issue / Category</th>
              <th>Location</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Assigned To</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredComplaints.length === 0 ? (
              <tr><td colSpan="8" className="cm-empty">No complaints found matching your filters.</td></tr>
            ) : (
              filteredComplaints.map(c => (
                <tr key={c.id}>
                  <td className="cm-mono">{c.complaintNumber}</td>
                  <td><strong>{c.issue}</strong><br/><small>{c.category}</small></td>
                  <td>{c.location}</td>
                  <td><span className={`cm-badge cm-priority-${getPriorityColor(c.priority)}`}>{c.priority}</span></td>
                  <td><span className={`cm-badge cm-status-${getStatusColor(c.status)}`}>{c.status}</span></td>
                  <td>{c.assignedStaff || <span className="cm-unassigned">Unassigned</span>}</td>
                  <td className="cm-mono">{c.date}</td>
                  <td>
                    <button className="cm-btn-view" onClick={() => handleOpenDetails(c)}>View & Manage</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        )}
      </div>

      {/* Details & Action Modal */}
      {showModal && selectedComplaint && (
        <div className="cm-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="cm-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="cm-modal-header">
              <h3>Complaint Details: {selectedComplaint.complaintNumber}</h3>
              <button className="cm-close-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>
            
            <div className="cm-modal-body">
              {/* Left: Details */}
              <div className="cm-modal-section">
                <h4>Issue Details</h4>
                <p><strong>Citizen:</strong> {selectedComplaint.citizenName}</p>
                <p><strong>Category:</strong> {selectedComplaint.category}</p>
                <p><strong>Location:</strong> {selectedComplaint.location}</p>
                <p><strong>Description:</strong> {selectedComplaint.description}</p>
                <p><strong>Photos Attached:</strong> {selectedComplaint.photos}</p>
              </div>

              {/* Right: Actions */}
              <div className="cm-modal-section cm-actions-section">
                <h4>Management Actions</h4>
                
                <div className="cm-form-group">
                  <label>Set Priority</label>
                  <select value={selectedComplaint.priority} onChange={(e) => setSelectedComplaint({...selectedComplaint, priority: e.target.value})}>
                    {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                <div className="cm-form-group">
                  <label>Update Status (Verify/Resolve)</label>
                  <select value={selectedComplaint.status} onChange={(e) => setSelectedComplaint({...selectedComplaint, status: e.target.value})}>
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="cm-form-group">
                  <label>Assign / Reassign Staff</label>
                  <select value={selectedComplaint.assignedStaff} onChange={(e) => setSelectedComplaint({...selectedComplaint, assignedStaff: e.target.value})}>
                    <option value="">-- Unassigned --</option>
                    {staffOptions.map(s => <option key={s._id} value={s.name}>{s.name}</option>)}
                  </select>
                </div>

                <div className="cm-form-group">
                  <label>Assign Verifier</label>
                  <select value={selectedComplaint.assignedVerifier} onChange={(e) => setSelectedComplaint({...selectedComplaint, assignedVerifier: e.target.value})}>
                    <option value="">-- Unassigned --</option>
                    {verifierOptions.map(v => <option key={v._id} value={v.name}>{v.name}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="cm-modal-footer">
              <button className="cm-btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="cm-btn-save" onClick={handleSaveChanges} disabled={saving}>
                {saving ? "Saving..." : "💾 Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplaintManagement;