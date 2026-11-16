import React, { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next"; // ✅ ADDED
import "./StaffWorkMonitoring.css";
import { API_BASE_URL, fetchDashboard, getStoredUser, getUserId, updateDashboardComplaint } from "../utils/dashboardApi";

const StaffWorkMonitoring = ({ onBack }) => {
  const { t } = useTranslation(); // ✅ ADDED

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
          assignedTo: complaint.assignedStaffId || users.find((user) => user.name === complaint.assignedStaff)?.id || "",
        })));
      })
      .catch((error) => console.error(t('staff_work_monitoring.error_load_data'), error));
  }, [t]);

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
      await updateDashboardComplaint(complaintId, {
        assignedStaff: staff?.name || staffId,
        assignedStaffId: staffId,
        status: "Under Action",
      });
    } catch (error) {
      console.error(t('staff_work_monitoring.error_assign'), error);
      return;
    }
    setComplaints(complaints.map(c => 
      c.id === complaintId ? { ...c, assignedTo: staffId, assignedStaffId: staffId, status: "Under Action" } : c
    ));
    showMessage("success", t('staff_work_monitoring.msg_assigned_success'));
  };

  const handleReassign = async (complaintId, newStaffId) => {
    const staff = staffList.find((item) => item.id === newStaffId);
    try {
      await updateDashboardComplaint(complaintId, {
        assignedStaff: staff?.name || newStaffId,
        assignedStaffId: newStaffId,
      });
    } catch (error) {
      console.error(t('staff_work_monitoring.error_reassign'), error);
      return;
    }
    setComplaints(complaints.map(c => 
      c.id === complaintId ? { ...c, assignedTo: newStaffId, assignedStaffId: newStaffId } : c
    ));
    showMessage("success", t('staff_work_monitoring.msg_reassigned_success'));
  };

  // ✅ Helpers to translate UI strings while keeping internal logic intact
  const getStatusLabel = (status) => {
    const map = {
      "Pending": t('staff_work_monitoring.status_pending'),
      "Under Action": t('staff_work_monitoring.status_under_action'),
      "Resolved": t('staff_work_monitoring.status_resolved'),
    };
    return map[status] || status;
  };

  const getPriorityLabel = (priority) => {
    const map = {
      "Critical": t('staff_work_monitoring.priority_critical'),
      "Urgent": t('staff_work_monitoring.priority_urgent'),
      "Normal": t('staff_work_monitoring.priority_normal'),
    };
    return map[priority] || priority;
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
        <button className="swm-back-btn" onClick={onBack}>{t('staff_work_monitoring.back_to_dashboard')}</button>
        <div>
          <h2>{t('staff_work_monitoring.title')}</h2>
          <p>{t('staff_work_monitoring.subtitle')}</p>
        </div>
      </div>

      {message.text && <div className={`swm-message ${message.type}`}>{message.text}</div>}

      {/* Stats Row */}
      <div className="swm-stats-row">
        <div className="swm-stat-card"><h3>{t('staff_work_monitoring.stats.total_staff')}</h3><p>{stats.totalStaff}</p></div>
        <div className="swm-stat-card active"><h3>{t('staff_work_monitoring.stats.active_tasks')}</h3><p>{stats.activeTasks}</p></div>
        <div className="swm-stat-card pending"><h3>{t('staff_work_monitoring.stats.pending_work')}</h3><p>{stats.pendingWork}</p></div>
        <div className="swm-stat-card completed"><h3>{t('staff_work_monitoring.stats.completed_work')}</h3><p>{stats.completedWork}</p></div>
      </div>

      {/* Main Content Grid */}
      <div className="swm-main-grid">
        
        {/* LEFT PANEL: View Available Staff & Track Staff-wise */}
        <div className="swm-panel swm-staff-list-panel">
          <h3 className="swm-panel-title">{t('staff_work_monitoring.available_staff')}</h3>
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
                  <span className="swm-stat-badge assigned" title={t('staff_work_monitoring.assigned')}>{staff.assigned}</span>
                  <span className="swm-stat-badge pending" title={t('staff_work_monitoring.pending')}>{staff.pending}</span>
                  <span className="swm-stat-badge completed" title={t('staff_work_monitoring.completed')}>{staff.completed}</span>
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
              <h3>{t('staff_work_monitoring.workload_for', { name: selectedStaffDetails?.name })}</h3>
              <span className="swm-count-badge">{selectedStaffComplaints.length} {t('staff_work_monitoring.complaints')}</span>
            </div>
            
            {selectedStaffComplaints.length === 0 ? (
              <p className="swm-empty">{t('staff_work_monitoring.no_complaints_assigned')}</p>
            ) : (
              <div className="swm-table-wrap">
                <table className="swm-table">
                  <thead>
                    <tr>
                      <th>{t('staff_work_monitoring.col_id')}</th>
                      <th>{t('staff_work_monitoring.col_issue')}</th>
                      <th>{t('staff_work_monitoring.col_priority')}</th>
                      <th>{t('staff_work_monitoring.col_status')}</th>
                      <th>{t('staff_work_monitoring.col_action')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedStaffComplaints.map(c => (
                      <tr key={c.id}>
                        <td className="swm-mono">{c.complaintNumber}</td>
                        <td>{c.issue}<br/><small className="swm-subtext">{c.location}</small></td>
                        <td><span className={`swm-badge swm-priority-${getPriorityColor(c.priority)}`}>{getPriorityLabel(c.priority)}</span></td>
                        <td><span className={`swm-badge swm-status-${getStatusColor(c.status)}`}>{getStatusLabel(c.status)}</span></td>
                        <td>
                          {/* Reassign Dropdown */}
                          <select 
                            className="swm-select-sm" 
                            defaultValue="" 
                            onChange={(e) => e.target.value && handleReassign(c.id, e.target.value)}
                          >
                            <option value="" disabled>{t('staff_work_monitoring.reassign_to')}</option>
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
              <h3>{t('staff_work_monitoring.assignment_queue')}</h3>
              <span className="swm-count-badge queue">{unassignedComplaints.length} {t('staff_work_monitoring.needs_action')}</span>
            </div>

            {unassignedComplaints.length === 0 ? (
              <p className="swm-empty">{t('staff_work_monitoring.all_assigned')}</p>
            ) : (
              <div className="swm-queue-list">
                {unassignedComplaints.map(c => (
                  <div key={c.id} className="swm-queue-item">
                    <div className="swm-queue-info">
                      <strong>{c.complaintNumber}</strong> - {c.issue}
                      <small className="swm-subtext">{c.location}</small>
                    </div>
                    <div className="swm-queue-actions">
                      <span className={`swm-badge swm-priority-${getPriorityColor(c.priority)}`}>{getPriorityLabel(c.priority)}</span>
                      <select 
                        className="swm-select-sm" 
                        defaultValue="" 
                        onChange={(e) => e.target.value && handleAssign(c.id, e.target.value)}
                      >
                        <option value="" disabled>{t('staff_work_monitoring.assign_to')}</option>
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