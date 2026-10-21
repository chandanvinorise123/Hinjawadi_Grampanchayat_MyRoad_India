import React, { useMemo, useState } from "react";
import "./UpdatedComplaints.css";
import { toMediaUrl } from "../utils/dashboardApi";

const formatDateTime = (value) => {
  if (!value) return "Time not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
};

const getTimestamp = (value) => {
  const timestamp = new Date(value || 0).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const getUpdateHistory = (complaint, actorRoles) => {
  const activities = (Array.isArray(complaint.activityLog) ? complaint.activityLog : [])
    .filter((entry) => actorRoles.some((role) => String(entry.actor || "").toLowerCase().includes(role)))
    .map((entry, index) => ({
      id: `activity-${index}`,
      actor: entry.actor || "Staff / Verifier",
      details: entry.message || "Complaint work information was updated.",
      time: entry.createdAt || complaint.updatedAt || "",
    }));
  const statusUpdates = (Array.isArray(complaint.statusHistory) ? complaint.statusHistory : [])
    .filter((entry) => actorRoles.some((role) => String(entry.actor || "").toLowerCase().includes(role)))
    .map((entry, index) => ({
      id: `status-${index}`,
      actor: entry.actor || "Staff / Verifier",
      details: [
        entry.status ? `Status changed to ${entry.status}` : "",
        entry.remarks || "",
      ].filter(Boolean).join(" — "),
      time: entry.updatedAt || complaint.updatedAt || "",
    }));
  const history = [...activities, ...statusUpdates]
    .sort((left, right) => getTimestamp(right.time) - getTimestamp(left.time));

  if (history.length) return history;

  const inspection = complaint.inspection || {};
  const legacyStaffDetails = [
    inspection.actionTaken,
    inspection.remarks,
    inspection.sitePhoto,
    inspection.completionPhoto,
    inspection.verificationPhoto,
  ].filter(Boolean);
  if (actorRoles.includes("staff") && legacyStaffDetails.length) {
    return [{
      id: "legacy-staff-update",
      actor: "Staff",
      details: inspection.actionTaken || inspection.remarks || "Staff work evidence was updated.",
      time: complaint.updatedAt || complaint.createdAt || "",
    }];
  }
  const verifierDetails = complaint.verifierRemarks || complaint.previousRemarks;
  if (actorRoles.includes("verifier") && verifierDetails) {
    return [{
      id: "legacy-verifier-update",
      actor: "Verifier",
      details: verifierDetails,
      time: complaint.updatedAt || complaint.createdAt || "",
    }];
  }

  return [];
};

const getPhotoItems = (photos, label) => photos
  .filter((photo) => typeof photo === "string" && photo.trim())
  .map((photo, index) => ({
    label: photos.length > 1 ? `${label} ${index + 1}` : label,
    photo,
  }));

const getCitizenPhotos = (complaint) => {
  const photos = Array.isArray(complaint.citizenPhotos)
    ? complaint.citizenPhotos
    : Array.isArray(complaint.images) ? complaint.images : [];
  return getPhotoItems(photos, "Citizen Evidence");
};

const getWorkPhotos = (complaint) => {
  const inspection = complaint.inspection || {};
  return [
    ...getPhotoItems([inspection.sitePhoto || complaint.photos?.site || ""], "Before / Site"),
    ...getPhotoItems([inspection.completionPhoto || complaint.photos?.after || ""], "After Work"),
    ...getPhotoItems([inspection.verificationPhoto || ""], "Verification"),
  ];
};

const UpdatedComplaints = ({
  complaints = [],
  onBack,
  actorRoles = ["staff", "verifier"],
  audienceLabel = "Staff & verifier activity",
  listTitle = "Staff & Verifier Updates",
  showUpdateHistory = true,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedComplaintId, setSelectedComplaintId] = useState("");

  const updatedComplaints = useMemo(() => complaints
    .map((complaint) => {
      const history = getUpdateHistory(complaint, actorRoles);
      const latestUpdate = history[0] || null;
      return {
        complaint,
        history,
        latestUpdate,
        latestTimestamp: Math.max(
          getTimestamp(latestUpdate?.time),
          getTimestamp(complaint.updatedAt),
          getTimestamp(complaint.createdAt)
        ),
      };
    })
    .filter(({ latestUpdate }) => latestUpdate)
    .sort((left, right) => right.latestTimestamp - left.latestTimestamp), [complaints, actorRoles]);

  const filteredComplaints = updatedComplaints.filter(({ complaint, latestUpdate }) => {
    const query = searchTerm.trim().toLowerCase();
    return !query || [
      complaint.complaintNumber,
      complaint.citizenName,
      complaint.issue,
      complaint.category,
      complaint.location,
      complaint.status,
      latestUpdate.actor,
    ].some((value) => String(value || "").toLowerCase().includes(query));
  });
  const selectedRecord = updatedComplaints.find(
    ({ complaint }) => String(complaint.id || complaint._id) === String(selectedComplaintId)
  );

  return (
    <main className="uc-shell">
      <header className="uc-header">
        <button className="uc-back-btn" type="button" onClick={selectedRecord ? () => setSelectedComplaintId("") : onBack}>
          ← {selectedRecord ? "Back to Updated Complaints" : "Back to Dashboard"}
        </button>
        <div>
          <span className="uc-eyebrow">{audienceLabel}</span>
          <h1>{selectedRecord ? "Updated Complaint Details" : "Updated Complaints"}</h1>
          <p>
            {selectedRecord
              ? selectedRecord.complaint.complaintNumber
              : "Review the latest complaint updates and submitted work evidence."}
          </p>
        </div>
      </header>

      {selectedRecord ? (
        <div className="uc-detail-layout">
          <section className="uc-panel">
            <div className="uc-panel-heading">
              <span className="uc-eyebrow">Original report</span>
              <h2>Complaint Information</h2>
            </div>
            <dl className="uc-facts">
              <div><dt>Complaint Number</dt><dd>{selectedRecord.complaint.complaintNumber || "Not recorded"}</dd></div>
              <div><dt>Citizen</dt><dd>{selectedRecord.complaint.citizenName || "Guest"}</dd></div>
              <div><dt>Contact</dt><dd>{selectedRecord.complaint.citizenContact || selectedRecord.complaint.citizenMobile || "Not recorded"}</dd></div>
              <div><dt>Email</dt><dd>{selectedRecord.complaint.citizenEmail || selectedRecord.complaint.citizenProfile?.email || "Not recorded"}</dd></div>
              <div><dt>Category</dt><dd>{selectedRecord.complaint.category || "Not recorded"}</dd></div>
              <div><dt>Issue</dt><dd>{selectedRecord.complaint.issue || selectedRecord.complaint.issueType || "Not recorded"}</dd></div>
              <div><dt>Location</dt><dd>{typeof selectedRecord.complaint.location === "string" ? selectedRecord.complaint.location : selectedRecord.complaint.location?.address || "Not recorded"}</dd></div>
              <div><dt>Priority</dt><dd>{selectedRecord.complaint.priority || "Normal"}</dd></div>
              <div><dt>Current Status</dt><dd>{selectedRecord.complaint.status || "Not recorded"}</dd></div>
              <div><dt>Assigned Staff</dt><dd>{selectedRecord.complaint.assignedStaff || "Not assigned"}</dd></div>
              <div><dt>Assigned Verifier</dt><dd>{selectedRecord.complaint.assignedVerifier || "Not assigned"}</dd></div>
              <div><dt>Submitted</dt><dd>{formatDateTime(selectedRecord.complaint.createdAt || selectedRecord.complaint.date)}</dd></div>
              <div><dt>Last Updated</dt><dd>{formatDateTime(selectedRecord.complaint.updatedAt)}</dd></div>
              <div><dt>Landmark</dt><dd>{selectedRecord.complaint.landmark || "Not recorded"}</dd></div>
              <div className="uc-fact-wide"><dt>Description</dt><dd>{selectedRecord.complaint.description || "No complaint description provided."}</dd></div>
            </dl>
            <div className="uc-evidence">
              <h3>Citizen Evidence</h3>
              {getCitizenPhotos(selectedRecord.complaint).length ? (
                <div className="uc-photo-grid">
                  {getCitizenPhotos(selectedRecord.complaint).map(({ label, photo }, index) => (
                    <a href={toMediaUrl(photo)} target="_blank" rel="noopener noreferrer" key={`${label}-${index}`}>
                      <img src={toMediaUrl(photo)} alt={`${label} evidence`} loading="lazy" />
                      <span>{label}</span>
                    </a>
                  ))}
                </div>
              ) : <p className="uc-empty">No citizen complaint images attached.</p>}
            </div>
          </section>

          <section className="uc-panel">
            <div className="uc-panel-heading">
              <span className="uc-eyebrow">Latest activity first</span>
              <h2>Update Information</h2>
            </div>
            <dl className="uc-facts">
              <div><dt>Work Performed</dt><dd>{selectedRecord.complaint.inspection?.actionTaken || "Not recorded"}</dd></div>
              <div><dt>Staff Remarks</dt><dd>{selectedRecord.complaint.inspection?.remarks || "Not recorded"}</dd></div>
              <div><dt>Inspection Date</dt><dd>{formatDateTime(selectedRecord.complaint.inspection?.inspectionDate)}</dd></div>
              <div><dt>Completion Date</dt><dd>{formatDateTime(selectedRecord.complaint.inspection?.completionDate)}</dd></div>
              <div className="uc-fact-wide"><dt>Verifier Feedback</dt><dd>{selectedRecord.complaint.verifierRemarks || selectedRecord.complaint.previousRemarks || "No verifier feedback recorded."}</dd></div>
            </dl>
            {showUpdateHistory && (
              <div className="uc-evidence">
                <h3>Update History</h3>
                <ol className="uc-history">
                  {selectedRecord.history.map((entry) => (
                    <li key={entry.id}>
                      <div className="uc-history-topline">
                        <strong>{entry.actor}</strong>
                        <time>{formatDateTime(entry.time)}</time>
                      </div>
                      <p>{entry.details}</p>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            <div className="uc-evidence">
              <h3>Work Evidence</h3>
              {getWorkPhotos(selectedRecord.complaint).length ? (
                <div className="uc-photo-grid">
                  {getWorkPhotos(selectedRecord.complaint).map(({ label, photo }, index) => (
                    <a href={toMediaUrl(photo)} target="_blank" rel="noopener noreferrer" key={`${label}-${index}`}>
                      <img src={toMediaUrl(photo)} alt={`${label} evidence`} loading="lazy" />
                      <span>{label}</span>
                    </a>
                  ))}
                </div>
              ) : <p className="uc-empty">No staff or verifier work images attached.</p>}
            </div>
          </section>
        </div>
      ) : (
        <section className="uc-panel uc-table-panel">
          <div className="uc-table-heading">
            <div>
              <h2>{listTitle}</h2>
              <p>{filteredComplaints.length} updated complaint{filteredComplaints.length === 1 ? "" : "s"}</p>
            </div>
            <input
              type="search"
              aria-label="Search updated complaints"
              placeholder="Search complaint, updater, location..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          <div className="uc-table-wrap">
            <table className="uc-table">
              <thead>
                <tr>
                  <th>Complaint No.</th>
                  <th>Citizen</th>
                  <th>Issue</th>
                  <th>Updated By</th>
                  <th>Latest Update</th>
                  <th>Date & Time</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredComplaints.length ? filteredComplaints.map(({ complaint, latestUpdate }) => (
                  <tr key={complaint.id || complaint._id}>
                    <td className="uc-mono">{complaint.complaintNumber || "N/A"}</td>
                    <td>{complaint.citizenName || "Guest"}</td>
                    <td>
                      <strong>{complaint.issue || complaint.issueType || complaint.category || "Complaint"}</strong>
                      <small>{typeof complaint.location === "string" ? complaint.location : complaint.location?.address || "Location not recorded"}</small>
                    </td>
                    <td><span className="uc-actor-badge">{latestUpdate.actor}</span></td>
                    <td className="uc-update-summary">{latestUpdate.details}</td>
                    <td>{formatDateTime(latestUpdate.time)}</td>
                    <td>
                      <button
                        className="uc-view-btn"
                        type="button"
                        onClick={() => setSelectedComplaintId(String(complaint.id || complaint._id))}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr><td className="uc-empty-row" colSpan="7">No staff or verifier updates match your search.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
};

export default UpdatedComplaints;
