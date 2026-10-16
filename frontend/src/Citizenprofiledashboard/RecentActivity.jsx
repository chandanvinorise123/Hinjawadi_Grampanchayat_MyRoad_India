import React, { useState, useMemo, useEffect } from "react";
import "./RecentActivity.css";
import { fetchDashboard, getStoredUser, getUserId } from "../utils/dashboardApi";

const categoryBadgeMap = {
  "Complaints": "navy",
  "Account": "orange",
  "Tracking": "amber",
  "Security": "green"
};

const RecentActivity = ({ onBack }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    fetchDashboard("citizen", getUserId(getStoredUser()))
      .then(({ complaints = [] }) => setActivities(complaints.flatMap((complaint) =>
        (complaint.statusHistory || []).map((entry) => ({
          id: `${complaint.id}-${entry.updatedAt}`,
          timestamp: entry.updatedAt ? new Date(entry.updatedAt).toLocaleString() : "",
          action: entry.status,
          category: "Complaints",
          complaintNumber: complaint.complaintNumber,
          description: entry.remarks || `Complaint status changed to ${entry.status}`,
          device: "MyRoad India",
          status: "Success",
        }))
      )))
      .catch((error) => console.error("Failed to load citizen activity:", error));
  }, []);

  const filteredActivities = useMemo(() => {
    return activities.filter((a) => {
      const matchesSearch =
        a.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.complaintNumber && a.complaintNumber.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesCategory = filterCategory === "All" || a.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [activities, searchTerm, filterCategory]);

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") setSelectedActivity(null);
    };
    if (selectedActivity) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "auto";
    };
  }, [selectedActivity]);

  return (
    <div className="cdp-ra-page">
      {/* Header */}
      <div className="cdp-ra-header">
        <button className="cdp-back-btn" onClick={onBack}>← Back to Dashboard</button>
        <h1>Recent Activity</h1>
      </div>

      <div className="cdp-ra-content">
        <p className="cdp-ra-subtitle">
          A chronological log of all actions and interactions performed on your citizen account.
        </p>

        {/* Search and Filter Bar */}
        <div className="cdp-ra-controls">
          <div className="cdp-ra-search">
            <span className="cdp-ra-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by action, description, or complaint number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="cdp-ra-filter">
            <label>Category:</label>
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
              <option value="All">All Categories</option>
              <option value="Complaints">Complaints</option>
              <option value="Tracking">Tracking</option>
              <option value="Account">Account</option>
              <option value="Security">Security</option>
            </select>
          </div>
        </div>

        {/* Activity Table */}
        <div className="cdp-ra-table-container">
          {filteredActivities.length === 0 ? (
            <div className="cdp-ra-empty-state">
              <div className="cdp-ra-empty-icon">📜</div>
              <h4>No Activity Found</h4>
              <p>Try adjusting your search or filter criteria.</p>
            </div>
          ) : (
            <table className="cdp-ra-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Action</th>
                  <th>Category</th>
                  <th>Related Complaint</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredActivities.map((a) => (
                  <tr key={a.id} className="cdp-ra-row">
                    <td className="cdp-ra-mono">{a.timestamp}</td>
                    <td className="cdp-ra-action-text">{a.action}</td>
                    <td>
                      <span className={`cdp-ra-badge cdp-ra-badge-${categoryBadgeMap[a.category]}`}>
                        {a.category}
                      </span>
                    </td>
                    <td className="cdp-ra-mono">
                      {a.complaintNumber || <span className="cdp-ra-na">N/A</span>}
                    </td>
                    <td>
                      <span className="cdp-ra-status-success">✓ {a.status}</span>
                    </td>
                    <td>
                      <button 
                        className="cdp-ra-view-btn"
                        onClick={() => setSelectedActivity(a)}
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

      {/* ✅ OVERLAY MODAL for Complete Activity Details */}
      {selectedActivity && (
        <div className="cdp-ra-modal-overlay" onClick={() => setSelectedActivity(null)}>
          <div className="cdp-ra-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="cdp-ra-modal-header">
              <div>
                <span className={`cdp-ra-modal-badge cdp-ra-badge-${categoryBadgeMap[selectedActivity.category]}`}>
                  {selectedActivity.category}
                </span>
                <h3>{selectedActivity.action}</h3>
              </div>
              <button className="cdp-ra-modal-close" onClick={() => setSelectedActivity(null)}>✕</button>
            </div>

            <div className="cdp-ra-modal-body">
              {/* Full Description */}
              <div className="cdp-ra-modal-section">
                <h4>📝 Activity Description</h4>
                <p className="cdp-ra-modal-full-desc">{selectedActivity.description}</p>
              </div>

              {/* Context Grid */}
              <div className="cdp-ra-modal-section">
                <h4>ℹ️ Session & Context Details</h4>
                <div className="cdp-ra-context-grid">
                  <div className="cdp-ra-context-item">
                    <span>Timestamp</span>
                    <b className="cdp-ra-mono">{selectedActivity.timestamp}</b>
                  </div>
                  <div className="cdp-ra-context-item">
                    <span>Device / Browser</span>
                    <b>{selectedActivity.device}</b>
                  </div>
                  <div className="cdp-ra-context-item">
                    <span>Execution Status</span>
                    <b className="cdp-ra-status-success">✓ {selectedActivity.status}</b>
                  </div>
                  <div className="cdp-ra-context-item">
                    <span>Related Complaint</span>
                    <b className="cdp-ra-mono">{selectedActivity.complaintNumber || "None"}</b>
                  </div>
                </div>
              </div>
            </div>

            <div className="cdp-ra-modal-footer">
              <button className="cdp-ra-modal-close-btn" onClick={() => setSelectedActivity(null)}>
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecentActivity;