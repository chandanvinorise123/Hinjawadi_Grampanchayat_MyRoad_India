import React, { useState, useMemo, useEffect } from "react";
import "./StaffWorkMonitoring.css";
import { API_BASE_URL, fetchDashboard, getStoredUser, getUserId, updateDashboardComplaint } from "../utils/dashboardApi";

// ==========================================
// ==========================================
const StaffWorkMonitoring = ({ onBack }) => {
  const [staffList, setStaffList] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    Promise.all([
      fetchDashboard("admin", getUserId(getStoredUser())),
      fetch(`${API_BASE_URL}/users?role=staff`).then((response) => response.json()),
    ])
      .then(([dashboard, usersResult]) => {
        const users = (usersResult.users || []).map((user) => ({
          ...user,
          id: user._id,
          status: user.currentWorkStatus || "Active",
        }));
        setStaffList(users);
        setSelectedStaffId(users[0]?.id || "");
        setComplaints((dashboard.complaints || []).map((complaint) => ({
          ...complaint,
          assignedTo: users.find((user) => user.name === complaint.assignedStaff)?.id || "",
        })));
      })
      .catch((error) => console.error("Failed to load staff monitoring data:", error));
  }, []);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 3000);
  };

  // Calculate Global Stats
  const stats = useMemo(() => ({
    totalStaff: staffList.length,
    activeTasks: complaints.filter(c => c.status === "Under Action").length,
    pendingWork: complaints.filter(c => c.status === "Pending" || !c.assignedTo).length,
    completedWork: complaints.filter(c => c.status === "Resolved").length,
  }), [staffList, complaints]);

  // Filter complaints for the selected staff member
  const selectedStaffComplaints = useMemo(() => 
    complaints.filter(c => c.assignedTo === selectedStaffId), 
  [complaints, selectedStaffId]);

  const selectedStaffDetails = staffList.find(s => s.id === selectedStaffId);

  // Get unassigned complaints for the assignment queue
  const unassignedComplaints = complaints.filter(c => !c.assignedTo || c.status === "Pending");

  // --- Actions ---
  const handleAssign = async (complaintId, staffId) => {
    const staff = staffList.find((item) => item.id === staffId);
    try {
      await updateDashboardComplaint(complaintId, { assignedStaff: staff?.name || staffId, status: "Under Action" });
    } catch (error) {
      console.error("Failed to assign complaint:", error);
      return;
    }
    setComplaints(complaints.map(c => 
      c.id === complaintId ? { ...c, assignedTo: staffId, status: "Under Action" } : c
    ));
    showMessage("success", `Complaint assigned successfully!`);
  };

  const handleReassign = async (complaintId, newStaffId) => {
    const staff = staffList.find((item) => item.id === newStaffId);
    try {
      await updateDashboardComplaint(complaintId, { assignedStaff: staff?.name || newStaffId });
    } catch (error) {
      console.error("Failed to reassign complaint:", error);
      return;
    }
    setComplaints(complaints.map(c => 
      c.id === complaintId ? { ...c, assignedTo: newStaffId } : c
    ));
    showMessage("success", `Complaint reassigned successfully!`);
  };

  const getStatusColor = (status) => {
    const colors = { "Pending": "amber", "Under Action": "navy", "Resolved": "green" };
    return colors[status] || "navy";
  };

  const getPriorityColor = (priority) => {
    const colors = { "Critical": "red", "Urgent": "amber", "Normal": "green" };
    return colors[priority] || "navy";
  };

  return (
    <div className="swm-shell">
      {/* Header */}
      <div className="swm-header">
        <button className="swm-back-btn" onClick={onBack}>← Back to Dashboard</button>
        <div>
          <h2>🧑‍ Staff & Work Monitoring</h2>
          <p>Assign, reassign, and track staff workload and progress.</p>
        </div>
      </div>

      {message.text && <div className={`swm-message ${message.type}`}>{message.text}</div>}

      {/* Stats Row */}
      <div className="swm-stats-row">
        <div className="swm-stat-card"><h3>Total Staff</h3><p>{stats.totalStaff}</p></div>
        <div className="swm-stat-card active"><h3>Active Tasks</h3><p>{stats.activeTasks}</p></div>
        <div className="swm-stat-card pending"><h3>Pending Work</h3><p>{stats.pendingWork}</p></div>
        <div className="swm-stat-card completed"><h3>Completed Work</h3><p>{stats.completedWork}</p></div>
      </div>

      {/* Main Content Grid */}
      <div className="swm-main-grid">
        
        {/* LEFT PANEL: View Available Staff & Track Staff-wise */}
        <div className="swm-panel swm-staff-list-panel">
          <h3 className="swm-panel-title">Available Staff</h3>
          <div className="swm-staff-list">
            {staffList.map(staff => (
              <div 
                key={staff.id} 
                className={`swm-staff-item ${selectedStaffId === staff.id ? "active" : ""} ${staff.status === "On Leave" ? "on-leave" : ""}`}
                onClick={() => staff.status !== "On Leave" && setSelectedStaffId(staff.id)}
              >
                <div className="swm-staff-info">
                  <div className="swm-avatar">{staff.name.charAt(0)}</div>
                  <div>
                    <strong>{staff.name}</strong>
                    <small>{staff.contact}</small>
                  </div>
                </div>
                <div className="swm-staff-stats">
                  <span className="swm-stat-badge assigned" title="Assigned">{staff.assigned}</span>
                  <span className="swm-stat-badge pending" title="Pending">{staff.pending}</span>
                  <span className="swm-stat-badge completed" title="Completed">{staff.completed}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT PANEL: Monitor Assigned Work & Assignment Queue */}
        <div className="swm-panel swm-work-details-panel">
          
          {/* Section 1: Selected Staff Workload */}
          <div className="swm-section">
            <div className="swm-section-header">
              <h3>Workload: {selectedStaffDetails?.name}</h3>
              <span className="swm-count-badge">{selectedStaffComplaints.length} Complaints</span>
            </div>
            
            {selectedStaffComplaints.length === 0 ? (
              <p className="swm-empty">No complaints currently assigned to this staff member.</p>
            ) : (
              <div className="swm-table-wrap">
                <table className="swm-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Issue</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedStaffComplaints.map(c => (
                      <tr key={c.id}>
                        <td className="swm-mono">{c.complaintNumber}</td>
                        <td>{c.issue}<br/><small className="swm-subtext">{c.location}</small></td>
                        <td><span className={`swm-badge swm-priority-${getPriorityColor(c.priority)}`}>{c.priority}</span></td>
                        <td><span className={`swm-badge swm-status-${getStatusColor(c.status)}`}>{c.status}</span></td>
                        <td>
                          {/* Reassign Dropdown */}
                          <select 
                            className="swm-select-sm" 
                            defaultValue="" 
                            onChange={(e) => e.target.value && handleReassign(c.id, e.target.value)}
                          >
                            <option value="" disabled>Reassign to...</option>
                            {staffList.filter(s => s.id !== c.assignedTo && s.status !== "On Leave").map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 2: Unassigned / Pending Queue */}
          <div className="swm-section swm-queue-section">
            <div className="swm-section-header">
              <h3>📥 Assignment Queue (Unassigned / Pending)</h3>
              <span className="swm-count-badge queue">{unassignedComplaints.length} Needs Action</span>
            </div>

            {unassignedComplaints.length === 0 ? (
              <p className="swm-empty">All complaints are assigned!</p>
            ) : (
              <div className="swm-queue-list">
                {unassignedComplaints.map(c => (
                  <div key={c.id} className="swm-queue-item">
                    <div className="swm-queue-info">
                      <strong>{c.complaintNumber}</strong> - {c.issue}
                      <small className="swm-subtext">{c.location}</small>
                    </div>
                    <div className="swm-queue-actions">
                      <span className={`swm-badge swm-priority-${getPriorityColor(c.priority)}`}>{c.priority}</span>
                      <select 
                        className="swm-select-sm" 
                        defaultValue="" 
                        onChange={(e) => e.target.value && handleAssign(c.id, e.target.value)}
                      >
                        <option value="" disabled>Assign to...</option>
                        {staffList.filter(s => s.status !== "On Leave").map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default StaffWorkMonitoring;