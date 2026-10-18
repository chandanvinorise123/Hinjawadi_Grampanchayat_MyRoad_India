import React, { useState, useEffect } from "react";
import "./ComplaintDetails.css";
import { API_BASE_URL, toMediaUrl, updateDashboardComplaint } from "../utils/dashboardApi";

const formatDate = (complaint) =>
  complaint.date ||
  (complaint.createdAt ? new Date(complaint.createdAt).toLocaleDateString() : "N/A");

const toDetailData = (complaint) => {
  const coordinates = complaint.coordinates || {};
  const location =
    typeof complaint.location === "object" && complaint.location !== null
      ? complaint.location
      : {};
  const images = Array.from(new Set([
    ...(Array.isArray(complaint.images) ? complaint.images : []),
    ...(Array.isArray(complaint.citizenPhotos) ? complaint.citizenPhotos : []),
    ...(Array.isArray(complaint.photos)
      ? complaint.photos
      : complaint.photos && typeof complaint.photos === "object"
        ? Object.values(complaint.photos)
        : []),
  ].filter((image) => typeof image === "string" && image.trim())));
  const inspection = complaint.inspection || {};

  return {
    ...complaint,
    date: formatDate(complaint),
    citizen: {
      name: complaint.citizenName || complaint.citizenProfile?.name || "Guest",
      contact: complaint.citizenContact || complaint.citizenMobile || "",
      email: complaint.citizenEmail || complaint.citizenProfile?.email || "",
    },
    photos: images,
    location: {
      ...location,
      address:
        location.address ||
        (typeof complaint.location === "string" ? complaint.location : ""),
      lat: Number(location.lat ?? coordinates.lat ?? coordinates.latitude ?? complaint.lat),
      lng: Number(location.lng ?? coordinates.lng ?? coordinates.longitude ?? complaint.lng),
    },
    inspection: {
      ...inspection,
      assignedStaff: complaint.assignedStaff,
      staffContact: complaint.staffContact || inspection.staffContact || "",
      assignedDate: complaint.assignedDate || inspection.assignedDate || "",
      actionTaken: inspection.actionTaken || "",
      expectedCompletion: inspection.completionDate || "",
    },
    beforeAfter: {
      before:
        complaint.beforePhoto ||
        images[0] ||
        "",
      after:
        inspection.completionPhoto ||
        complaint.afterPhoto ||
        images[1] ||
        "",
    },
    history: complaint.statusHistory || complaint.log || [],
  };
};

const ComplaintDetails = ({
  complaint: initialComplaint,
  staffOptions = [],
  verifierOptions = [],
  assignmentsLoading = false,
  assignmentsError = "",
  onComplaintUpdated,
  onBack,
}) => {
  const [complaintsList, setComplaintsList] = useState([]);
  const [selectedComplaint, setSelectedComplaint] = useState(
    initialComplaint ? toDetailData(initialComplaint) : null
  );
  const [loading, setLoading] = useState(!initialComplaint);
  const [staffSelection, setStaffSelection] = useState(null);
  const [verifierSelection, setVerifierSelection] = useState(null);
  const [savingAssignments, setSavingAssignments] = useState(false);
  const [assignmentError, setAssignmentError] = useState("");
  const selectedStaffId = staffSelection ?? (
    selectedComplaint?.assignedStaffId ||
    staffOptions.find((staff) => staff.name === selectedComplaint?.assignedStaff)?.id ||
    staffOptions.find((staff) => staff.name === selectedComplaint?.assignedStaff)?._id ||
    ""
  );
  const selectedVerifierId = verifierSelection ?? (
    selectedComplaint?.assignedVerifierId ||
    verifierOptions.find((verifier) => verifier.name === selectedComplaint?.assignedVerifier)?.id ||
    verifierOptions.find((verifier) => verifier.name === selectedComplaint?.assignedVerifier)?._id ||
    ""
  );

  useEffect(() => {
    if (initialComplaint) return undefined;

    // Fetch all complaints for the table view directly from the API
    const fetchAllComplaints = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_BASE_URL}/complaints`, {
          headers: {
            "Authorization": token ? `Bearer ${token}` : ""
          }
        });
        const data = await response.json();

        if (data.success) {
          setComplaintsList(data.complaints || []);
        }
      } catch (error) {
        console.error("Failed to load complaints list:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllComplaints();
    return undefined;
  }, [initialComplaint]);

  const handleViewDetails = (complaint) => {
    setStaffSelection(null);
    setVerifierSelection(null);
    setSelectedComplaint(toDetailData(complaint));
  };

  const handleBackToList = () => {
    setSelectedComplaint(null);
  };

  const handleSaveAssignments = async () => {
    if (!selectedComplaint?.id) return;
    const staff = staffOptions.find((user) => String(user.id || user._id) === String(selectedStaffId));
    const verifier = verifierOptions.find((user) => String(user.id || user._id) === String(selectedVerifierId));
    setSavingAssignments(true);
    setAssignmentError("");
    try {
      const result = await updateDashboardComplaint(selectedComplaint.id, {
        assignedStaff: staff?.name || "",
        assignedStaffId: staff ? String(staff.id || staff._id) : "",
        assignedVerifier: verifier?.name || "",
        assignedVerifierId: verifier ? String(verifier.id || verifier._id) : "",
        ...(staff && ["New", "Pending"].includes(selectedComplaint.status)
          ? { status: "Under Action" }
          : {}),
      });
      const updated = toDetailData(result.complaint);
      setSelectedComplaint(updated);
      setStaffSelection(null);
      setVerifierSelection(null);
      onComplaintUpdated?.(result.complaint);
    } catch (error) {
      console.error("Failed to assign complaint:", error);
      setAssignmentError(error.message || "Could not save complaint assignments.");
    } finally {
      setSavingAssignments(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      "New": "navy", "Pending": "amber", "Under Verification": "orange",
      "Under Action": "orange", "Resolved": "green", "Submitted": "navy",
      "Verified": "amber", "Assigned": "orange", "In Progress": "orange",
      "Closed": "green", "Rejected": "red"
    };
    return colors[status] || "navy";
  };

  // ==========================================
  // VIEW 1: LOADING STATE
  // ==========================================
  if (loading) {
    return (
      <div className="cd-shell">
        <button className="cd-back-btn" onClick={onBack}>← Back to Dashboard</button>
        <p style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>Loading complaints...</p>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: TABLE LIST OF ALL COMPLAINTS (Default View)
  // ==========================================
  if (!selectedComplaint) {
    return (
      <div className="cd-shell">
        <div className="cd-header">
          <button className="cd-back-btn" onClick={onBack}>← Back to Dashboard</button>
          <div className="cd-header-info">
            <h2>All Complaints</h2>
          </div>
        </div>

        <div className="cd-grid">
          <div className="cd-card cd-card-full">
            <h3 className="cd-card-title">Complaint List</h3>
            <div className="cd-table-container">
              <table className="cd-table">
                <thead>
                  <tr>
                    <th>Complaint No.</th>
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {complaintsList.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
                        No complaints found in the system.
                      </td>
                    </tr>
                  ) : (
                    complaintsList.map((complaint) => (
                      <tr key={complaint._id || complaint.id}>
                        <td style={{ fontWeight: "600", color: "#2e6cb0" }}>{complaint.complaintNumber}</td>
                        <td>{complaint.category}</td>
                        <td>
                          <span className={`cd-badge cd-priority-${String(complaint.priority || "Normal").toLowerCase()}`}>
                            {complaint.priority || "Normal"}
                          </span>
                        </td>
                        <td>
                          <span className={`cd-badge cd-status-${getStatusColor(complaint.status)}`}>
                            {complaint.status}
                          </span>
                        </td>
                        <td>{formatDate(complaint)}</td>
                        <td>
                          <button
                            className="cd-view-btn"
                            onClick={() => handleViewDetails(complaint)}
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 3: DETAILED COMPLAINT VIEW
  // ==========================================
  const data = selectedComplaint;

  return (
    <div className="cd-shell">
      {/* Header */}
      <div className="cd-header">
        <div className="cd-header-actions">
          {!initialComplaint && <button className="cd-back-btn" onClick={handleBackToList}>← Back to List</button>}
          <button className="cd-back-btn" onClick={onBack}>← Back to Dashboard</button>
        </div>
        <div className="cd-header-info">
          <h2>Complaint Details: {data.complaintNumber}</h2>
          <div className="cd-header-badges">
            <span className={`cd-badge cd-priority-${String(data.priority || "Normal").toLowerCase()}`}>
              {data.priority || "Normal"}
            </span>
            <span className={`cd-badge cd-status-${getStatusColor(data.status)}`}>
              {data.status}
            </span>
          </div>
        </div>
      </div>

      <div className="cd-grid">

        {/* 1 & 2. Citizen, Complaint Info, Category & Description */}
        <div className="cd-card cd-card-full">
          <h3 className="cd-card-title"> Complaint & Citizen Information</h3>
          <div className="cd-info-grid">
            <div className="cd-info-item">
              <label>Citizen Name</label>
              <p>{data.citizen.name}</p>
            </div>
            <div className="cd-info-item">
              <label>Report Source</label>
              <p>{data.citizenProfile || data.citizenId ? "Registered citizen" : "Guest submission"}</p>
            </div>
            <div className="cd-info-item">
              <label>Contact Number</label>
              <p>{data.citizen.contact}</p>
            </div>
            <div className="cd-info-item">
              <label>Email Address</label>
              <p>{data.citizen.email || data.citizenProfile?.email || "N/A"}</p>
            </div>
            <div className="cd-info-item">
              <label>Issue Category</label>
              <p>{data.category}</p>
            </div>
            <div className="cd-info-item">
              <label>Department</label>
              <p>{data.department || "Not provided"}</p>
            </div>
            <div className="cd-info-item">
              <label>Specific Issue</label>
              <p>{data.issueType || data.issue}</p>
            </div>
            <div className="cd-info-item">
              <label>Date Reported</label>
              <p>{data.date}</p>
            </div>
            <div className="cd-info-item cd-full-width">
              <label>Detailed Description</label>
              <p className="cd-description">{data.description}</p>
            </div>
          </div>
        </div>

        {/* 3. Initial Photographs */}
        <div className="cd-card">
          <h3 className="cd-card-title">📸 Initial Photographs</h3>
          <div className="cd-photo-grid">
            {data.photos.length > 0 ? data.photos.map((url, index) => (
              <div key={index} className="cd-photo-item">
                <img
                  src={toMediaUrl(url)}
                  alt={`Complaint photo ${index + 1}`}
                  loading="lazy"
                />
              </div>
            )) : <p style={{ color: "#64748b", padding: "10px" }}>No photos available.</p>}
          </div>
        </div>

        {/* 4. Location on Map */}
        <div className="cd-card">
          <h3 className="cd-card-title">📍 Complaint Location</h3>
          <p className="cd-address">{data.location.address || "Address not provided"}</p>
          {Number.isFinite(data.location.lat) && Number.isFinite(data.location.lng) && (
            <p className="cd-coordinates">
              GPS: {data.location.lat}, {data.location.lng}
              {" · "}
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${data.location.lat},${data.location.lng}`)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open in Google Maps
              </a>
            </p>
          )}
          <div className="cd-map-container">
            {Number.isFinite(data.location.lat) && Number.isFinite(data.location.lng) ? (
              <iframe
                title="Complaint Location Map"
                width="100%"
                height="100%"
                frameBorder="0"
                scrolling="no"
                marginHeight="0"
                marginWidth="0"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${data.location.lng - 0.01}%2C${data.location.lat - 0.01}%2C${data.location.lng + 0.01}%2C${data.location.lat + 0.01}&layer=mapnik&marker=${data.location.lat}%2C${data.location.lng}`}
              ></iframe>
            ) : (
              <div style={{ padding: "20px", textAlign: "center", color: "#64748b" }}>Map coordinates not available.</div>
            )}
          </div>
        </div>

        {/* 5. Inspection & Action Details */}
        <div className="cd-card cd-card-full">
          <h3 className="cd-card-title">🛠️ Inspection & Action Details</h3>
          <div className="cd-info-grid">
            <div className="cd-info-item">
              <label>Assigned Staff</label>
              <p>{data.inspection.assignedStaff || "Not assigned"}</p>
            </div>
            <div className="cd-info-item">
              <label>Staff Contact</label>
              <p>{data.inspection.staffContact || data.assignedStaffContact || "N/A"}</p>
            </div>
            <div className="cd-info-item">
              <label>Assigned Date</label>
              <p>{data.inspection.assignedDate || "N/A"}</p>
            </div>
            <div className="cd-info-item">
              <label>Expected Completion</label>
              <p>{data.inspection.expectedCompletion || "N/A"}</p>
            </div>
            <div className="cd-info-item cd-full-width">
              <label>Action Taken / Remarks</label>
              <p className="cd-description">{data.inspection.actionTaken || "No remarks yet."}</p>
            </div>
          </div>
        </div>

        <div className="cd-card cd-card-full">
          <h3 className="cd-card-title">👥 Staff & Verifier Assignment</h3>
          <div className="cd-assignment-grid">
            <div className="cd-assignment-field">
              <label htmlFor="cd-assigned-staff">Assigned Staff</label>
              <select
                id="cd-assigned-staff"
                value={selectedStaffId}
                onChange={(event) => setStaffSelection(event.target.value)}
                disabled={savingAssignments || assignmentsLoading || Boolean(assignmentsError)}
              >
                <option value="">Unassigned</option>
                {staffOptions.map((staff) => (
                  <option key={staff.id || staff._id} value={String(staff.id || staff._id)}>
                    {staff.name} · {staff.staffId || staff.email}
                    {staff.department ? ` · ${staff.department}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="cd-assignment-field">
              <label htmlFor="cd-assigned-verifier">Assigned Verifier</label>
              <select
                id="cd-assigned-verifier"
                value={selectedVerifierId}
                onChange={(event) => setVerifierSelection(event.target.value)}
                disabled={savingAssignments || assignmentsLoading || Boolean(assignmentsError)}
              >
                <option value="">Unassigned</option>
                {verifierOptions.map((verifier) => (
                  <option key={verifier.id || verifier._id} value={String(verifier.id || verifier._id)}>
                    {verifier.name} · {verifier.verifierId || verifier.staffId || verifier.email}
                    {verifier.department ? ` · ${verifier.department}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="cd-assignment-action">
              <button
                className="cd-view-btn"
                type="button"
                onClick={handleSaveAssignments}
                disabled={savingAssignments || assignmentsLoading || Boolean(assignmentsError)}
              >
                {assignmentsLoading ? "Loading accounts..." : savingAssignments ? "Saving..." : "Save Assignments"}
              </button>
            </div>
          </div>
          {assignmentsError && <p className="cd-assignment-error" role="alert">{assignmentsError}</p>}
          {assignmentError && <p className="cd-assignment-error" role="alert">{assignmentError}</p>}
        </div>

        {/* 6. Before & After Photographs */}
        <div className="cd-card cd-card-full">
          <h3 className="cd-card-title">🔄 Before & After Progress</h3>
          <div className="cd-comparison-grid">
            <div className="cd-comparison-item">
              <span className="cd-comparison-label">Before</span>
              {data.beforeAfter.before ? (
                <img
                  src={toMediaUrl(data.beforeAfter.before)}
                  alt="Before work"
                  loading="lazy"
                />
              ) : (
                <div className="cd-photo-placeholder">No before photo</div>
              )}
            </div>
            <div className="cd-comparison-item">
              <span className="cd-comparison-label">After</span>
              {data.beforeAfter.after ? (
                <img
                  src={toMediaUrl(data.beforeAfter.after)}
                  alt="After work"
                  loading="lazy"
                />
              ) : (
                <div className="cd-photo-placeholder">No after photo</div>
              )}
            </div>
          </div>
        </div>

        {/* 7. Complaint History & Remarks */}
        <div className="cd-card cd-card-full">
          <h3 className="cd-card-title">📜 Complaint History & Remarks</h3>
          <div className="cd-timeline">
            {data.history.length > 0 ? data.history.map((event, index) => (
              <div className="cd-timeline-item" key={index}>
                <div className="cd-timeline-dot"></div>
                <div className="cd-timeline-content">
                  <div className="cd-timeline-header">
                    <span className="cd-timeline-date">{event.date || (event.updatedAt ? new Date(event.updatedAt).toLocaleDateString() : "N/A")}</span>
                    <span className={`cd-badge cd-status-${getStatusColor(event.status)}`}>{event.status}</span>
                  </div>
                  <p className="cd-timeline-user"><strong>By:</strong> {event.user || event.actor || "System"}</p>
                  <p className="cd-timeline-remark">{event.remark || event.remarks || "No remarks"}</p>
                </div>
              </div>
            )) : <p style={{ padding: "10px", color: "#64748b" }}>No history available.</p>}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ComplaintDetails;