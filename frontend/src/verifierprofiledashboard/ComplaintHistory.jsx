import React, { useMemo, useState } from "react";
import "./ComplaintHistory.css";
import ComplaintImage from "./ComplaintImage";
import VerifierDecisionForm from "./VerifierDecisionForm";

const formatDateTime = (value) => {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
};

const getTimestamp = (value) => {
  const timestamp = new Date(value || 0).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const getStatusTone = (status) => {
  const normalized = String(status || "").toLowerCase().replace(/[_-]+/g, " ");
  if (normalized.includes("reject")) return "red";
  if (["verified", "resolved", "closed", "notified"].includes(normalized)) return "green";
  if (normalized.includes("verif") || normalized.includes("review")) return "orange";
  if (normalized.includes("pending")) return "amber";
  return "navy";
};

const getComplaintPhotos = (complaint) => {
  const citizenPhotos = Array.isArray(complaint.citizenPhotos)
    ? complaint.citizenPhotos
    : Array.isArray(complaint.images) ? complaint.images : [];
  const photos = complaint.photos && typeof complaint.photos === "object"
    ? complaint.photos
    : {};
  return [
    ...citizenPhotos.map((photo, index) => ({ label: `Citizen Evidence ${index + 1}`, photo })),
    { label: "Before / Site", photo: complaint.inspection?.sitePhoto || photos.site || photos.before },
    { label: "After Work", photo: complaint.inspection?.completionPhoto || photos.after },
    { label: "Verification", photo: complaint.inspection?.verificationPhoto || photos.verification },
  ].filter(({ photo }) => typeof photo === "string" && photo.trim());
};

const ComplaintHistory = ({ complaints = [], onBack, onVerify }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  const sortedComplaints = useMemo(() => [...complaints].sort((left, right) => (
    getTimestamp(right.updatedAt || right.createdAt) -
    getTimestamp(left.updatedAt || left.createdAt)
  )), [complaints]);

  const filteredComplaints = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return sortedComplaints.filter((complaint) => [
      complaint.complaintNumber,
      complaint.category,
      complaint.issue,
      complaint.location,
      complaint.citizenName,
      complaint.citizenContact,
      complaint.status,
      complaint.assignedStaff,
      complaint.assignedVerifier,
    ].some((value) => String(value || "").toLowerCase().includes(query)));
  }, [sortedComplaints, searchTerm]);

  const selectedItem = sortedComplaints.find(
    (complaint) => String(complaint.id) === String(selectedId)
  );
  const backAction = selectedItem
    ? () => setSelectedId(null)
    : onBack;

  return (
    <main className="vch-shell">
      <header className="vch-header">
        <button className="vch-back-btn" type="button" onClick={backAction}>
          ← {selectedItem ? "Back to Complaint History" : "Back to Dashboard"}
        </button>
        <div>
          <span className="vch-eyebrow">Verifier records</span>
          <h2>📜 Complaint History & Timeline</h2>
          {selectedItem && <p>{selectedItem.complaintNumber}</p>}
        </div>
      </header>

      {selectedItem ? (
        <div className="vch-detail-layout">
          <section className="vch-detail-panel">
            <header className="vch-detail-heading">
              <span className="vch-eyebrow">Original report</span>
              <h3>Complaint Information</h3>
            </header>
            <dl className="vch-detail-facts">
              <div><dt>Complaint Number</dt><dd>{selectedItem.complaintNumber || "Not recorded"}</dd></div>
              <div><dt>Citizen</dt><dd>{selectedItem.citizenName || "Guest"}</dd></div>
              <div><dt>Contact</dt><dd>{selectedItem.citizenContact || "Not recorded"}</dd></div>
              <div><dt>Email</dt><dd>{selectedItem.citizenEmail || selectedItem.citizenProfile?.email || "Not recorded"}</dd></div>
              <div><dt>Department</dt><dd>{selectedItem.department || "Not assigned"}</dd></div>
              <div><dt>Category</dt><dd>{selectedItem.category || "Not recorded"}</dd></div>
              <div><dt>Issue</dt><dd>{selectedItem.issue || "Not recorded"}</dd></div>
              <div><dt>Priority</dt><dd>{selectedItem.priority || "Normal"}</dd></div>
              <div><dt>Location</dt><dd>{selectedItem.location || "Location pending"}</dd></div>
              <div><dt>Landmark</dt><dd>{selectedItem.landmark || "Not recorded"}</dd></div>
              <div><dt>Submitted</dt><dd>{formatDateTime(selectedItem.createdAt || selectedItem.date)}</dd></div>
              <div><dt>Assigned Staff</dt><dd>{selectedItem.assignedStaff || "Not assigned"}</dd></div>
              <div><dt>Assigned Verifier</dt><dd>{selectedItem.assignedVerifier || "Not assigned"}</dd></div>
              <div className="vch-detail-wide"><dt>Description</dt><dd>{selectedItem.description || "No complaint description provided."}</dd></div>
            </dl>
            <div className="vch-detail-evidence">
              <h4>Complaint Evidence</h4>
              {getComplaintPhotos(selectedItem).length ? (
                <div className="vch-detail-photos">
                  {getComplaintPhotos(selectedItem).map(({ label, photo }) => (
                    <figure key={`${label}-${photo}`}>
                      <ComplaintImage src={photo} alt={label} fallbackClassName="vch-photo-fallback" />
                      <figcaption>{label}</figcaption>
                    </figure>
                  ))}
                </div>
              ) : <p className="vch-empty-text">No images attached to this complaint.</p>}
            </div>
          </section>

          <section className="vch-detail-panel">
            <header className="vch-detail-heading">
              <span className="vch-eyebrow">Work & verification</span>
              <h3>Work Information</h3>
            </header>
            <dl className="vch-detail-facts">
              <div><dt>Current Status</dt><dd><span className={`vch-status-badge vch-status-${getStatusTone(selectedItem.status)}`}>{selectedItem.status || "Pending"}</span></dd></div>
              <div><dt>Queue</dt><dd>{selectedItem.queue || "Not recorded"}</dd></div>
              <div><dt>Inspection Date</dt><dd>{formatDateTime(selectedItem.inspection?.inspectionDate)}</dd></div>
              <div><dt>Completion Date</dt><dd>{formatDateTime(selectedItem.inspection?.completionDate)}</dd></div>
              <div className="vch-detail-wide"><dt>Staff Inspection Remarks</dt><dd>{selectedItem.inspection?.remarks || "No staff inspection remarks recorded."}</dd></div>
              <div className="vch-detail-wide"><dt>Action Taken by Staff</dt><dd>{selectedItem.inspection?.actionTaken || "No work action recorded."}</dd></div>
              <div className="vch-detail-wide"><dt>Verifier Feedback</dt><dd>{selectedItem.verifierRemarks || selectedItem.previousRemarks || "No verifier feedback recorded."}</dd></div>
            </dl>
            <div className="vch-detail-evidence">
              <h4>Verifier Decision</h4>
              <VerifierDecisionForm complaint={selectedItem} onVerify={onVerify} />
            </div>
          </section>
        </div>
      ) : (
        <section className="vch-table-section">
          <div className="vch-table-header">
            <div>
              <h3>All Complaints</h3>
              <p>Browse complaint records and open their full details.</p>
            </div>
            <div className="vch-table-controls">
              <span className="vch-table-count">{filteredComplaints.length} complaints</span>
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search complaint, citizen, status..."
                aria-label="Search complaints"
              />
            </div>
          </div>
          <div className="vch-table-container">
            <table className="vch-complaints-table">
              <thead>
                <tr>
                  <th>Complaint No.</th>
                  <th>Citizen</th>
                  <th>Issue</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Last Updated</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredComplaints.length ? filteredComplaints.map((complaint) => (
                  <tr key={complaint.id}>
                    <td className="vch-mono">{complaint.complaintNumber || "N/A"}</td>
                    <td>{complaint.citizenName || "Guest"}</td>
                    <td>{complaint.issue || complaint.category || "Not recorded"}</td>
                    <td>{complaint.location || "Location pending"}</td>
                    <td><span className={`vch-status-badge vch-status-${getStatusTone(complaint.status)}`}>{complaint.status || "Pending"}</span></td>
                    <td>{formatDateTime(complaint.updatedAt || complaint.createdAt || complaint.date)}</td>
                    <td>
                      <button
                        className="vch-view-details-btn"
                        type="button"
                        onClick={() => setSelectedId(String(complaint.id))}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr><td className="vch-empty-row" colSpan="7">No complaints match your search.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
};

export default ComplaintHistory;
