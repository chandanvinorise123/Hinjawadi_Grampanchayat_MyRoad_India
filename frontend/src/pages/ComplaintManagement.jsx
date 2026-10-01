import React, { useState, useMemo } from "react";
import "./ComplaintManagement.css";

// ==========================================
// 1. HARDCODED MOCK DATA (Will be replaced by API later)
// ==========================================
const MOCK_COMPLAINTS = [
  {
    id: "1", complaintNumber: "MRI-849201", category: "Road Damage", issue: "Large Pothole",
    location: "Hinjawadi Phase 2, Near Wipro Gate", citizenName: "Rahul Sharma",
    description: "A massive pothole has formed near the Wipro gate, causing traffic jams and vehicle damage.",
    photos: 3, priority: "Critical", status: "New", assignedStaff: "", assignedVerifier: "", date: "2023-10-25",
    photoUrls: ["https://via.placeholder.com/150", "https://via.placeholder.com/150"]
  },
  {
    id: "2", complaintNumber: "MRI-849202", category: "Street Light", issue: "Light Not Working",
    location: "Hinjewadi Rajiv Gandhi IT Park Road", citizenName: "Priya Desai",
    description: "Street lights are not working for the last 3 days. Very unsafe for night commuters.",
    photos: 1, priority: "Urgent", status: "Under Action", assignedStaff: "Shiv Kumar", assignedVerifier: "", date: "2023-10-24",
    photoUrls: []
  },
  {
    id: "3", complaintNumber: "MRI-849203", category: "Water Logging", issue: "Drainage Blockage",
    location: "Marunji Road, Near Bus Stop", citizenName: "Amit Patel",
    description: "Water logging is severe due to blocked drainage. Pedestrians cannot walk.",
    photos: 2, priority: "Normal", status: "Under Verification", assignedStaff: "Ramesh Yadav", assignedVerifier: "Sarpanch Ji", date: "2023-10-22",
    photoUrls: []
  },
  {
    id: "4", complaintNumber: "MRI-849204", category: "Road Damage", issue: "Cracked Road",
    location: "Pirangut Road", citizenName: "Sneha Kulkarni",
    description: "Road has developed deep cracks after recent rains.",
    photos: 4, priority: "Normal", status: "Resolved", assignedStaff: "Shiv Kumar", assignedVerifier: "Sarpanch Ji", date: "2023-10-20",
    photoUrls: []
  }
];

const STAFF_LIST = ["Shiv Kumar", "Ramesh Yadav", "Vikram Singh", "Anil Patil"];
const VERIFIER_LIST = ["Sarpanch Ji", "Deputy Sarpanch", "Ward Officer 1"];
const STATUS_OPTIONS = ["New", "Pending", "Under Verification", "Under Action", "Resolved"];
const PRIORITY_OPTIONS = ["Critical", "Urgent", "Normal"];

const ComplaintManagement = ({ onBack }) => {
  // State
  const [complaints, setComplaints] = useState(MOCK_COMPLAINTS);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterPriority, setFilterPriority] = useState("All");
  
  // Modal State
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Filter Logic
  const filteredComplaints = useMemo(() => {
    return complaints.filter(c => {
      const matchesSearch = c.complaintNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            c.issue.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            c.location.toLowerCase().includes(searchTerm.toLowerCase());
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
    setSelectedComplaint({ ...complaint });
    setShowModal(true);
  };

  const handleSaveChanges = () => {
    // Update the local state array
    setComplaints(complaints.map(c => c.id === selectedComplaint.id ? selectedComplaint : c));
    setShowModal(false);
    setSelectedComplaint(null);
    // TODO: Later, add fetch() API call here to update backend
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
                    {STAFF_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="cm-form-group">
                  <label>Assign Verifier</label>
                  <select value={selectedComplaint.assignedVerifier} onChange={(e) => setSelectedComplaint({...selectedComplaint, assignedVerifier: e.target.value})}>
                    <option value="">-- Unassigned --</option>
                    {VERIFIER_LIST.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="cm-modal-footer">
              <button className="cm-btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="cm-btn-save" onClick={handleSaveChanges}>💾 Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplaintManagement;