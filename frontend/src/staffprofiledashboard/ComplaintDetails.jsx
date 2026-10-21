import React, { useMemo, useState } from "react";
import "./ComplaintDetails.css";
import StaffComplaintDetails from "./StaffComplaintDetails";
import { toMediaUrl } from "../utils/dashboardApi";

const formatDate = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleString()
    : "Not recorded";
};

const getTimestamp = (value) => {
  const timestamp = new Date(value || 0).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const ComplaintDetails = ({ complaints = [], onBack }) => {
  const [viewingComplaintId, setViewingComplaintId] = useState("");
  const updatedComplaints = useMemo(
    () => complaints
      .map((complaint) => {
        const updates = (Array.isArray(complaint.log) ? complaint.log : [])
          .filter((entry) => /staff|admin|verifier/i.test(String(entry.actor || "")))
          .map((entry) => ({
            ...entry,
            time: entry.time || complaint.updatedAt || "",
            timestamp: getTimestamp(entry.time || complaint.updatedAt),
          }))
          .sort((first, second) => second.timestamp - first.timestamp);
        const latestUpdate = updates[0];
        return latestUpdate
          ? { complaint, latestUpdate, latestTimestamp: latestUpdate.timestamp }
          : null;
      })
      .filter(Boolean)
      .sort((first, second) => second.latestTimestamp - first.latestTimestamp),
    [complaints]
  );
  const selectedEntry = updatedComplaints.find(({ complaint }) =>
    String(complaint.id) === String(viewingComplaintId)
  );

  return (
    <div className="cd-shell">
      <div className="cd-header">
        <button className="cd-back-btn" type="button" onClick={onBack}>
          ← Back to Dashboard
        </button>
        <div>
          <span className="cd-eyebrow">Staff workspace</span>
          <h2>{selectedEntry ? "Updated Work Details" : "Complaint Updated Details"}</h2>
          <p className="cd-subtitle">
            {selectedEntry
              ? `${selectedEntry.latestUpdate.actor || "Dashboard"} update for ${selectedEntry.complaint.complaintNumber || "this complaint"}`
              : "Review staff, admin, and verifier updates, with the newest updates first."}
          </p>
        </div>
      </div>

      {!selectedEntry ? (
        <main className="cd-container">
          <section className="cd-list-panel" aria-label="Updated complaints">
            <div className="cd-list-heading">
              <div>
                <span className="cd-eyebrow">Complaint activity</span>
                <h3>Recently Updated Complaints</h3>
                <p>See the latest update from staff, admin, or verifier for each complaint.</p>
              </div>
              <span className="cd-count">{updatedComplaints.length} complaints</span>
            </div>
            <div className="cd-table-wrap">
              <table className="cd-table">
                <thead>
                  <tr>
                    <th>Complaint</th>
                    <th>Issue & Location</th>
                    <th>Status</th>
                    <th>Updated By</th>
                    <th>Latest Update</th>
                    <th>Updated At</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {updatedComplaints.length ? updatedComplaints.map(
                    ({ complaint, latestUpdate }) => (
                      <tr key={complaint.id}>
                        <td>
                          <b className="cd-complaint-number">{complaint.complaintNumber || "Complaint"}</b>
                          <span className="cd-cell-note">{complaint.citizenName || "Citizen not available"}</span>
                        </td>
                        <td>
                          <b>{complaint.issue || complaint.issueType || "Issue not specified"}</b>
                          <span className="cd-cell-note">
                            {typeof complaint.location === "string"
                              ? complaint.location
                              : complaint.location?.address || complaint.location?.name || "Location not recorded"}
                          </span>
                        </td>
                        <td><span className="cd-status">{complaint.status || "Not recorded"}</span></td>
                        <td><span className="cd-status">{latestUpdate.actor || "Dashboard"}</span></td>
                        <td className="cd-update-summary">{latestUpdate.text || "Complaint details updated"}</td>
                        <td>{formatDate(latestUpdate.time)}</td>
                        <td>
                          <button
                            className="cd-view-btn"
                            type="button"
                            onClick={() => setViewingComplaintId(complaint.id)}
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    )
                  ) : (
                    <tr>
                      <td className="cd-empty" colSpan="6">
                        No staff, admin, or verifier updates are available yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      ) : (
        <main className="cd-container">
          <button
            className="cd-return-btn"
            type="button"
            onClick={() => setViewingComplaintId("")}
          >
            ← Back to Updated Complaints
          </button>
          <div className="cd-detail-layout">
            <section className="cd-information-panel">
              <header className="cd-panel-heading">
                <div>
                  <span className="cd-eyebrow">Original report</span>
                  <h3>Complaint Information</h3>
                </div>
                <span className="cd-status">{selectedEntry.complaint.status || "Not recorded"}</span>
              </header>
              <StaffComplaintDetails
                complaint={selectedEntry.complaint}
                showActivity={false}
              />
            </section>

            <section className="cd-work-panel">
              <header className="cd-panel-heading">
                <div>
                  <span className="cd-eyebrow">{selectedEntry.latestUpdate.actor || "Dashboard"} update</span>
                  <h3>Updated Complaint Information</h3>
                </div>
                <span className="cd-update-date">{formatDate(selectedEntry.latestUpdate.time)}</span>
              </header>
              <div className="cd-work-content">
                <div className="cd-work-fact">
                  <span>Latest update</span>
                  <p>{selectedEntry.latestUpdate.text || "Complaint details updated."}</p>
                </div>
                <div className="cd-work-fact">
                  <span>Work performed</span>
                  <p>{selectedEntry.complaint.inspection?.actionTaken || "No work description recorded."}</p>
                </div>
                <div className="cd-work-fact">
                  <span>Work remarks</span>
                  <p>{selectedEntry.complaint.inspection?.remarks || "No additional remarks recorded."}</p>
                </div>
                <div className="cd-work-fact">
                  <span>Completion date & time</span>
                  <p>{formatDate(selectedEntry.complaint.inspection?.completionDate)}</p>
                </div>
                <div className="cd-work-fact">
                  <span>Work status</span>
                  <p>{selectedEntry.complaint.status || "Not recorded"}</p>
                </div>
                <div className="cd-work-fact">
                  <span>Verifier feedback</span>
                  <p>{selectedEntry.complaint.verifierRemarks || selectedEntry.complaint.previousRemarks || "No verifier feedback recorded."}</p>
                </div>
                <section className="cd-work-evidence">
                  <h4>Work Evidence</h4>
                  {[
                    ["Before / Site Photograph", selectedEntry.complaint.inspection?.sitePhoto || selectedEntry.complaint.photos?.site],
                    ["After-Work Photograph", selectedEntry.complaint.inspection?.completionPhoto || selectedEntry.complaint.photos?.after],
                  ].some(([, photo]) => photo) ? (
                    <div className="cd-work-photos">
                      {[
                        ["Before / Site Photograph", selectedEntry.complaint.inspection?.sitePhoto || selectedEntry.complaint.photos?.site],
                        ["After-Work Photograph", selectedEntry.complaint.inspection?.completionPhoto || selectedEntry.complaint.photos?.after],
                      ].filter(([, photo]) => photo).map(([label, photo]) => (
                        <a
                          className="cd-work-photo"
                          href={toMediaUrl(photo)}
                          target="_blank"
                          rel="noopener noreferrer"
                          key={label}
                        >
                          <img src={toMediaUrl(photo)} alt={label} loading="lazy" />
                          <span>{label}</span>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="cd-no-evidence">No staff work photographs attached.</p>
                  )}
                </section>
              </div>
            </section>
          </div>
        </main>
      )}
    </div>
  );
};

export default ComplaintDetails;
