import React, { useMemo, useState } from "react";
import ComplaintImage from "./ComplaintImage";
import VerifierComplaintDetails from "./VerifierComplaintDetails";
import { uploadDashboardPhoto } from "../utils/dashboardApi";
import logo from "../assets/logo.jpeg";
import "./ComplaintAssigned.css";

const formatStatus = (status) => {
  const labels = {
    pending: "Pending Verification",
    in_action: "Staff Work in Progress",
    in_review: "Physical Verification",
    verified: "Verified",
    resolved: "Resolved",
    notified: "Closed",
    rejected: "Sent Back for Action",
  };
  return labels[status] || status || "Status unavailable";
};

const ComplaintAssigned = ({
  complaints,
  staffOptions,
  verifier,
  loadError,
  onBack,
  onAction,
  onAssignStaff,
  onSaveEvidence,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [staffId, setStaffId] = useState("");
  const [remarks, setRemarks] = useState("");
  const [evidencePhoto, setEvidencePhoto] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const managedComplaints = useMemo(() => {
    const hasAssignment = (value) => {
      const assignee = typeof value === "object"
        ? value?._id || value?.name || ""
        : value;
      const normalized = String(assignee || "").trim().toLowerCase();
      return normalized !== "" &&
        !["unassigned", "not assigned", "none", "null"].includes(normalized);
    };

    const assigned = complaints.filter((complaint) =>
      hasAssignment(complaint.assignedStaffId) ||
      hasAssignment(complaint.assignedStaff) ||
      hasAssignment(complaint.assignedVerifierId) ||
      hasAssignment(complaint.assignedVerifier)
    );
    const assignmentTime = (complaint) => {
      const latestAssignmentTime = (complaint.log || []).reduce((latest, entry) => {
        if (!/assigned (staff member|verifier)|assigned to/i.test(entry.text || "")) {
          return latest;
        }
        const timestamp = new Date(entry.time || 0).getTime();
        return Number.isFinite(timestamp) ? Math.max(latest, timestamp) : latest;
      }, 0);
      if (latestAssignmentTime) return latestAssignmentTime;

      const timestamp = new Date(complaint.updatedAt || complaint.createdAt || 0).getTime();
      return Number.isFinite(timestamp) ? timestamp : 0;
    };

    return assigned.sort((first, second) =>
      assignmentTime(second) - assignmentTime(first)
    );
  }, [complaints]);

  const filteredComplaints = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return managedComplaints;
    return managedComplaints.filter((complaint) => [
      complaint.complaintNumber,
      complaint.issue,
      complaint.category,
      complaint.location,
      complaint.status,
      complaint.queue,
      complaint.assignedStaff,
      complaint.assignedVerifier,
    ].some((value) => String(value || "").toLowerCase().includes(query)));
  }, [managedComplaints, searchTerm]);

  const openComplaint = (complaint) => {
    setSelectedComplaint(complaint);
    setStaffId(
      complaint.assignedStaffId ||
      staffOptions.find((staff) => staff.name === complaint.assignedStaff)?._id ||
      ""
    );
    setRemarks("");
    setEvidencePhoto(complaint.photos?.verification || "");
    setError("");
  };

  const handleDecision = async (action) => {
    if (action === "accept" && !staffId) {
      setError("Select a staff member before accepting this complaint.");
      return;
    }
    if (action === "reject" && !remarks.trim()) {
      setError("Add remarks explaining why this complaint is rejected.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await onAction(selectedComplaint.id, action, {
        staffId,
        remarks: remarks.trim(),
      });
      setSelectedComplaint(null);
    } catch (saveError) {
      setError(saveError.message || "Unable to save the complaint decision.");
    } finally {
      setSaving(false);
    }
  };

  const handleStaffAssignment = async () => {
    if (!staffId) {
      setError("Select a staff member before assigning this complaint.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onAssignStaff(selectedComplaint, staffId);
      setSelectedComplaint(null);
    } catch (saveError) {
      setError(saveError.message || "Unable to assign staff to this complaint.");
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    setError("");
    try {
      const uploaded = await uploadDashboardPhoto(file);
      const updated = await onSaveEvidence(selectedComplaint.id, uploaded.publicUrl);
      setSelectedComplaint(updated);
      setEvidencePhoto(updated.photos?.verification || uploaded.publicUrl);
    } catch (uploadError) {
      setError(uploadError.message || "Unable to save the verifier image.");
    } finally {
      setUploadingPhoto(false);
      event.target.value = "";
    }
  };

  const closeDetails = () => {
    if (!saving && !uploadingPhoto) setSelectedComplaint(null);
  };

  const initials = String(verifier.name || "Verifier")
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="vd-shell">
      <aside className="vd-sidebar">
        <div className="vd-sb-brand">
          <div className="vd-sb-logo"><img src={logo} alt="MyRoad India logo" /></div>
          <div>
            <b>MyRoad India</b>
            <span>Verifier Portal</span>
          </div>
        </div>
        <div className="vd-sb-label">Overview</div>
        <nav className="vd-sb-nav">
          <button type="button" className="vd-sb-link" onClick={onBack}>
            📊 Dashboard
          </button>
          <button type="button" className="vd-sb-link active" aria-current="page">
            📋 Complaint Assigned
            <span className="vd-sb-badge">{managedComplaints.length}</span>
          </button>
        </nav>
        <div className="vd-sb-footer">
          <div className="vd-sb-user">
            <div className="vd-sb-avatar">{initials}</div>
            <div className="vd-sb-user-info">
              <b>{verifier.name}</b>
              <span>{verifier.staffId}</span>
            </div>
          </div>
          <div className="vd-sb-ward">{verifier.role} · {verifier.ward}</div>
        </div>
      </aside>

      <main className="vd-main ca-page">
        <header className="vd-topbar">
          <button className="vd-btn-outline" type="button" onClick={onBack}>
            ← Back to Dashboard
          </button>
          <div className="vd-tb-user">
            <div className="vd-tb-avatar">{initials}</div>
            <div><b>{verifier.name}</b><span>{verifier.role}</span></div>
          </div>
        </header>

        <div className="vd-content">
          <div className="vd-title-row">
            <h1>Complaint Assigned</h1>
            <p>Review all complaints assigned by an administrator or verifier.</p>
          </div>
          {loadError && <div className="vd-error-message" role="alert">{loadError}</div>}
          <section className="vd-panel" aria-label="Assigned complaints">
            <div className="vd-panel-head cm-panel-head">
              <h3>Assigned Complaints</h3>
              <span className="vd-panel-link">{filteredComplaints.length} shown / {managedComplaints.length} assigned</span>
            </div>
            <label className="cm-search">
              <span>Search complaints</span>
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Complaint number, status, staff, location..."
              />
            </label>
            <div className="vd-table-wrap">
              <table className="cm-table">
                <thead>
                  <tr>
                    <th>Complaint</th>
                    <th>Issue</th>
                    <th>Location</th>
                    <th>Assigned Verifier</th>
                    <th>Assigned Staff</th>
                    <th>Status</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredComplaints.length ? filteredComplaints.map((complaint) => (
                    <tr key={complaint.id}>
                      <td className="vd-mono">{complaint.complaintNumber || "—"}</td>
                      <td>{complaint.issue || complaint.category || "Issue not specified"}</td>
                      <td>{complaint.location || "Location pending"}</td>
                      <td>{complaint.assignedVerifier || "Not assigned"}</td>
                      <td>{complaint.assignedStaff || "Not assigned"}</td>
                      <td><span className={`cm-status cm-status-${complaint.status}`}>{formatStatus(complaint.status)}</span></td>
                      <td>
                        <button
                          className="vd-verify-btn"
                          type="button"
                          onClick={() => openComplaint(complaint)}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="7" className="cm-empty">
                      {managedComplaints.length
                        ? "No assigned complaints match your search."
                        : "No assigned complaints are available."}
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>

      {selectedComplaint && (
        <div className="cm-modal-backdrop" onClick={closeDetails}>
          <section
            className="cm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cm-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="cm-modal-header">
              <div>
                <span>Complaint details</span>
                <h2 id="cm-modal-title">{selectedComplaint.complaintNumber || "Complaint"}</h2>
              </div>
              <button type="button" aria-label="Close details" onClick={closeDetails}>×</button>
            </header>
            <div className="cm-modal-body">
              <div className="cm-summary-grid">
                <div><span>Issue</span><b>{selectedComplaint.issue || selectedComplaint.category || "Not specified"}</b></div>
                <div><span>Priority</span><b>{selectedComplaint.priority || "Normal"}</b></div>
                <div><span>Status</span><b>{formatStatus(selectedComplaint.status)}</b></div>
                <div><span>Queue</span><b>{selectedComplaint.queue}</b></div>
                <div><span>Verifier</span><b>{selectedComplaint.assignedVerifier || "Not assigned"}</b></div>
                <div><span>Staff</span><b>{selectedComplaint.assignedStaff || "Not assigned"}</b></div>
                <div className="cm-wide"><span>Description</span><b>{selectedComplaint.description || "No description provided."}</b></div>
              </div>
              <VerifierComplaintDetails complaint={selectedComplaint} />

              <section className="cm-evidence">
                <h3>Complaint and verification images</h3>
                <div className="cm-images">
                  {[
                    ["Before repair", selectedComplaint.photos?.before],
                    ["Site photo", selectedComplaint.photos?.site],
                    ["After repair", selectedComplaint.photos?.after],
                    ["Verifier image", evidencePhoto],
                  ].filter(([, url]) => url).map(([label, url]) => (
                    <figure key={label}>
                      <ComplaintImage src={url} alt={label} />
                      <figcaption>{label}</figcaption>
                    </figure>
                  ))}
                  {!selectedComplaint.photos?.before &&
                    !selectedComplaint.photos?.site &&
                    !selectedComplaint.photos?.after &&
                    !evidencePhoto && <p>No images have been uploaded for this complaint.</p>}
                </div>
                <label className="cm-upload">
                  {uploadingPhoto ? "Uploading verifier image..." : "Add an optional verifier image"}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingPhoto || saving}
                    onChange={handlePhotoUpload}
                  />
                </label>
              </section>

              {["pending", "in_action", "rejected"].includes(selectedComplaint.status) && (
                <section className="cm-actions">
                  <h3>Review and assignment</h3>
                  {error && <p className="cm-error" role="alert">{error}</p>}
                  <label htmlFor="cm-staff">Assign staff</label>
                  <select
                    id="cm-staff"
                    value={staffId}
                    disabled={saving || uploadingPhoto}
                    onChange={(event) => setStaffId(event.target.value)}
                  >
                    <option value="">Select staff member</option>
                    {staffOptions.map((staff) => (
                      <option key={staff._id} value={staff._id}>
                        {staff.name}{staff.staffId ? ` · ${staff.staffId}` : ""}
                      </option>
                    ))}
                  </select>
                  {selectedComplaint.status === "pending" && (
                    <>
                      <label htmlFor="cm-remarks">Rejection remarks (required to reject)</label>
                      <textarea
                        id="cm-remarks"
                        rows="3"
                        value={remarks}
                        disabled={saving || uploadingPhoto}
                        onChange={(event) => setRemarks(event.target.value)}
                        placeholder="Explain why the complaint should be rejected."
                      />
                    </>
                  )}
                  <div className="cm-action-buttons">
                    {selectedComplaint.status === "pending" ? (
                      <>
                        <button type="button" className="vd-btn-danger" disabled={saving || uploadingPhoto} onClick={() => handleDecision("reject")}>Reject Complaint</button>
                        <button type="button" className="vd-btn-primary" disabled={saving || uploadingPhoto} onClick={() => handleDecision("accept")}>{saving ? "Saving..." : "Accept & Assign"}</button>
                      </>
                    ) : (
                      <button type="button" className="vd-btn-primary" disabled={saving || uploadingPhoto} onClick={handleStaffAssignment}>{saving ? "Saving..." : "Assign / Reassign Staff"}</button>
                    )}
                  </div>
                </section>
              )}
              {error && !["pending", "in_action", "rejected"].includes(selectedComplaint.status) && (
                <p className="cm-error" role="alert">{error}</p>
              )}
            </div>
            <footer className="cm-modal-footer">
              <button type="button" className="vd-btn-outline" onClick={closeDetails}>Close</button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
};

export default ComplaintAssigned;
