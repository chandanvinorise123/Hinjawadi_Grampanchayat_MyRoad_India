import React, { useMemo, useState } from "react";
import "./ComplaintDetails.css";
import StaffComplaintDetails from "./StaffComplaintDetails";

const ComplaintDetails = ({ complaints = [], onBack }) => {
  const [viewingComplaint, setViewingComplaint] = useState(null);
  const staffUpdatedComplaints = useMemo(
    () => complaints
      .map((complaint) => {
        const staffUpdates = (complaint.log || [])
          .filter((entry) => /staff/i.test(entry.actor || ""))
          .sort((first, second) =>
            new Date(second.time || 0).getTime() - new Date(first.time || 0).getTime()
          );
        return staffUpdates.length
          ? { complaint, latestStaffUpdate: staffUpdates[0] }
          : null;
      })
      .filter(Boolean)
      .sort((first, second) =>
        new Date(second.latestStaffUpdate.time || 0).getTime() -
        new Date(first.latestStaffUpdate.time || 0).getTime()
      ),
    [complaints]
  );

  const formatDate = (value) => {
    const date = value ? new Date(value) : null;
    return date && !Number.isNaN(date.getTime())
      ? date.toLocaleString()
      : "Not recorded";
  };

  return (
    <div className="cd-shell">
      <div className="cd-header">
        <button className="cd-back-btn" onClick={onBack}>
          ← Back to Dashboard
        </button>
        <div>
          <h2>Complaint Details</h2>
          <p className="cd-subtitle">Complaints with updates recorded by staff</p>
        </div>
      </div>

      <div className="cd-container">
        <div className="cd-table-wrap">
          <table className="cd-table">
            <thead>
              <tr>
                <th>Complaint No.</th>
                <th>Issue</th>
                <th>Location</th>
                <th>Status</th>
                <th>Latest Staff Update</th>
                <th>Updated At</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {staffUpdatedComplaints.length ? staffUpdatedComplaints.map(
                ({ complaint, latestStaffUpdate }) => (
                  <tr key={complaint.id}>
                    <td className="cd-mono">{complaint.complaintNumber || "Not available"}</td>
                    <td>{complaint.issue || complaint.issueType || "Not available"}</td>
                    <td>{typeof complaint.location === "string"
                      ? complaint.location
                      : complaint.location?.address || complaint.location?.name || "Not recorded"}</td>
                    <td><span className="cd-status">{complaint.status || "Not recorded"}</span></td>
                    <td>{latestStaffUpdate.text}</td>
                    <td>{formatDate(latestStaffUpdate.time)}</td>
                    <td>
                      <button
                        className="cd-view-btn"
                        type="button"
                        onClick={() => setViewingComplaint(complaint)}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                )
              ) : (
                <tr>
                  <td className="cd-empty" colSpan="7">
                    No staff-updated complaints are available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {viewingComplaint && (
        <div className="cd-modal-overlay" onClick={() => setViewingComplaint(null)}>
          <section
            className="cd-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`Details for ${viewingComplaint.complaintNumber || "complaint"}`}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="cd-modal-header">
              <h3>Complaint Details: {viewingComplaint.complaintNumber}</h3>
              <button
                type="button"
                className="cd-modal-close"
                aria-label="Close details"
                onClick={() => setViewingComplaint(null)}
              >
                ×
              </button>
            </header>
            <div className="cd-modal-body">
              <StaffComplaintDetails complaint={viewingComplaint} />
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default ComplaintDetails;
