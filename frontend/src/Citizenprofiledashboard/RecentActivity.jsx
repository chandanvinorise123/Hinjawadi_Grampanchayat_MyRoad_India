import React, { useState, useMemo, useEffect } from "react";
import "./RecentActivity.css";

// ✅ HARDCODED MOCK DATA: CITIZEN-SIDE ACTIVITIES
const mockActivities = [
  {
    id: "1",
    timestamp: "Oct 05, 2026, 09:15 AM",
    action: "Complaint Registered",
    category: "Complaints",
    complaintNumber: "MRI-550192",
    description: "Successfully submitted a new complaint regarding 'Broken Footpath' near City Hospital Gate with 1 attached photo.",
    device: "Chrome on Windows",
    status: "Success"
  },
  {
    id: "2",
    timestamp: "Oct 04, 2026, 03:30 PM",
    action: "Profile Updated",
    category: "Account",
    complaintNumber: null,
    description: "Updated mobile number from +91 98765 43210 to +91 98765 43211 and changed location to 'Ward 3 — Riverside'.",
    device: "Safari on macOS",
    status: "Success"
  },
  {
    id: "3",
    timestamp: "Oct 03, 2026, 11:00 AM",
    action: "Complaint Tracked",
    category: "Tracking",
    complaintNumber: "MRI-773820",
    description: "Checked the real-time status of complaint regarding 'Overflowing Garbage Bin'. Status was 'Complaint Closed'.",
    device: "Chrome on Android",
    status: "Success"
  },
  {
    id: "4",
    timestamp: "Oct 02, 2026, 04:45 PM",
    action: "Viewed Complaint Details",
    category: "Complaints",
    complaintNumber: "MRI-882910",
    description: "Opened the detailed view of the 'Large Pothole' complaint to review the resolution remarks and after-repair photos.",
    device: "Chrome on Windows",
    status: "Success"
  },
  {
    id: "5",
    timestamp: "Oct 01, 2026, 10:00 AM",
    action: "Password Changed",
    category: "Security",
    complaintNumber: null,
    description: "Successfully updated the account password. A confirmation email was sent to the registered email address.",
    device: "Chrome on Windows",
    status: "Success"
  },
  {
    id: "6",
    timestamp: "Oct 01, 2026, 09:50 AM",
    action: "Account Login",
    category: "Security",
    complaintNumber: null,
    description: "Successful login to the Citizen Portal from a recognized device.",
    device: "Chrome on Windows",
    status: "Success"
  }
];

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

  const filteredActivities = useMemo(() => {
    return mockActivities.filter((a) => {
      const matchesSearch =
        a.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.complaintNumber && a.complaintNumber.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesCategory = filterCategory === "All" || a.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, filterCategory]);

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