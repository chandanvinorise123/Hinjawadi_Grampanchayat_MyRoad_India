import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next"; // ✅ ADDED
import "./ComplaintDetails.css";
import { API_BASE_URL, toMediaUrl, updateDashboardComplaint } from "../utils/dashboardApi";
import ComplaintLocationMap from "../components/maps/ComplaintLocationMap";

const toCoordinate = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const coordinate = Number(value);
    if (Number.isFinite(coordinate)) return coordinate;
  }
  return Number.NaN;
};

const getAssignmentTimestamp = (complaint) => {
  const assignmentTimestamps = (Array.isArray(complaint.activityLog) ? complaint.activityLog : [])
    .filter((entry) => /^Assigned staff member\b/i.test(String(entry.message || "")))
    .map((entry) => new Date(entry.createdAt).getTime())
    .filter(Number.isFinite);

  if (assignmentTimestamps.length > 0) return Math.max(...assignmentTimestamps);

  const fallbackTimestamp = new Date(complaint.updatedAt || complaint.createdAt || complaint.date || 0).getTime();
  return Number.isFinite(fallbackTimestamp) ? fallbackTimestamp : 0;
};

const toDetailData = (complaint, t) => {
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
    id: complaint.id || complaint._id,
    date: complaint.date || (complaint.createdAt ? new Date(complaint.createdAt).toLocaleDateString(undefined) : t('complaint_details_admin.na')),
    citizen: {
      name: complaint.citizenName || complaint.citizenProfile?.name || t('complaint_details_admin.guest'),
      contact: complaint.citizenContact || complaint.citizenMobile || "",
      email: complaint.citizenEmail || complaint.citizenProfile?.email || "",
    },
    photos: images,
    location: {
      ...location,
      address:
        location.address ||
        (typeof complaint.location === "string" ? complaint.location : ""),
      lat: toCoordinate(location.lat, coordinates.lat, coordinates.latitude, complaint.lat),
      lng: toCoordinate(location.lng, coordinates.lng, coordinates.longitude, complaint.lng),
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
      before: complaint.beforePhoto || images[0] || "",
      after: inspection.completionPhoto || complaint.afterPhoto || "",
    },
    history: complaint.statusHistory || complaint.log || [],
  };
};

const formatAssignmentDateTime = (complaint, t) => {
  const timestamp = getAssignmentTimestamp(complaint);
  return timestamp
    ? new Date(timestamp).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : t('complaint_details_admin.na');
};

const ComplaintDetails = ({
  complaint: initialComplaint,
  listType = "new",
  staffOptions = [],
  verifierOptions = [],
  assignmentsLoading = false,
  assignmentsError = "",
  onComplaintUpdated,
  onBack,
}) => {
  const { t } = useTranslation(); // ✅ ADDED
  const [complaintsList, setComplaintsList] = useState([]);
  const [listError, setListError] = useState("");
  const [selectedComplaint, setSelectedComplaint] = useState(
    initialComplaint ? toDetailData(initialComplaint, t) : null
  );
  const [loading, setLoading] = useState(!initialComplaint);
  const [staffSelection, setStaffSelection] = useState(null);
  const [verifierSelection, setVerifierSelection] = useState(null);
  const [editingAssignments, setEditingAssignments] = useState(false);
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

    const fetchAllComplaints = async () => {
      try {
        setListError("");
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_BASE_URL}/complaints`, {
          headers: { "Authorization": token ? `Bearer ${token}` : "" }
        });
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || t('complaint_details_admin.error_load_complaints'));
        }
        setComplaintsList(data.complaints || []);
      } catch (error) {
        console.error("Failed to load complaints list:", error);
        setListError(error.message || t('complaint_details_admin.error_load_complaints'));
      } finally {
        setLoading(false);
      }
    };

    fetchAllComplaints();
    return undefined;
  }, [initialComplaint, t]);

  const handleViewDetails = (complaint) => {
    setStaffSelection(null);
    setVerifierSelection(null);
    setEditingAssignments(false);
    setSelectedComplaint(toDetailData(complaint, t));
  };

  const handleBackToList = () => {
    setSelectedComplaint(null);
  };

  const handleCancelAssignmentEdit = () => {
    setStaffSelection(null);
    setVerifierSelection(null);
    setAssignmentError("");
    setEditingAssignments(false);
  };

  const handleSaveAssignments = async () => {
    const complaintId = selectedComplaint?.id || selectedComplaint?._id;
    if (!complaintId) return;
    const staff = staffOptions.find((user) => String(user.id || user._id) === String(selectedStaffId));
    const verifier = verifierOptions.find((user) => String(user.id || user._id) === String(selectedVerifierId));
    setSavingAssignments(true);
    setAssignmentError("");
    try {
      const result = await updateDashboardComplaint(complaintId, {
        assignedStaff: staff?.name || "",
        assignedStaffId: staff ? String(staff.id || staff._id) : "",
        assignedVerifier: verifier?.name || "",
        assignedVerifierId: verifier ? String(verifier.id || verifier._id) : "",
        ...(staff && ["New", "Pending"].includes(selectedComplaint.status)
          ? { status: "Under Action" }
          : {}),
      });
      const updated = toDetailData(result.complaint, t);
      setSelectedComplaint(updated);
      setComplaintsList((current) => current.map((complaint) =>
        String(complaint._id || complaint.id) === String(result.complaint._id || result.complaint.id)
          ? result.complaint
          : complaint
      ));
      setStaffSelection(null);
      setVerifierSelection(null);
      setEditingAssignments(false);
      onComplaintUpdated?.(result.complaint);
    } catch (error) {
      console.error("Failed to assign complaint:", error);
      setAssignmentError(error.message || t('complaint_details_admin.error_save_assignments'));
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

  const isAssignedList = listType === "assigned";
  const visibleComplaints = complaintsList.filter(
    (complaint) => {
      if (isAssignedList) {
        return [complaint.assignedStaff, complaint.assignedStaffId].some((assignment) => String(assignment || "").trim());
      }
      return String(complaint.status || "").toLowerCase() === "new";
    }
  );
  if (isAssignedList) {
    visibleComplaints.sort((left, right) => getAssignmentTimestamp(right) - getAssignmentTimestamp(left));
  }
  const listTitle = isAssignedList ? t('complaint_details_admin.assigned_complaints') : t('complaint_details_admin.new_complaints');
  const emptyListMessage = isAssignedList ? t('complaint_details_admin.empty_assigned') : t('complaint_details_admin.empty_new');
  const visibleColumnCount = isAssignedList ? 9 : 7;

  // ==========================================
  // VIEW 1: LOADING STATE
  // ==========================================
  if (loading) {
    return (
      <div className="cd-shell">
        <button className="cd-back-btn" onClick={onBack}>{t('complaint_details_admin.back_to_dashboard')}</button>
        <p style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>{t('complaint_details_admin.loading_complaints')}</p>
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
          <button className="cd-back-btn" onClick={onBack}>{t('complaint_details_admin.back_to_dashboard')}</button>
          <div className="cd-header-info">
            <h2>{listTitle}</h2>
          </div>
        </div>

        <div className="cd-grid">
          <div className="cd-card cd-card-full">
            <h3 className="cd-card-title">{listTitle}</h3>
            {listError && <p className="cd-list-error" role="alert">{listError}</p>}
            <div className="cd-table-container">
              <table className="cd-table">
                <thead>
                  <tr>
                    <th>{t('complaint_details_admin.col_complaint_no')}</th>
                    <th>{t('complaint_details_admin.col_citizen')}</th>
                    <th>{t('complaint_details_admin.col_category')}</th>
                    <th>{t('complaint_details_admin.col_location')}</th>
                    {isAssignedList && <th>{t('complaint_details_admin.col_assigned_staff')}</th>}
                    {isAssignedList && <th>{t('complaint_details_admin.col_assigned_verifier')}</th>}
                    <th>{t('complaint_details_admin.col_priority')}</th>
                    <th>{isAssignedList ? t('complaint_details_admin.col_assigned_date_time') : t('complaint_details_admin.col_date')}</th>
                    <th>{t('complaint_details_admin.col_action')}</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleComplaints.length === 0 ? (
                    <tr>
                      <td colSpan={visibleColumnCount} style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
                        {listError ? `${listTitle} ${t('complaint_details_admin.error_load_complaints').toLowerCase()}` : emptyListMessage}
                      </td>
                    </tr>
                  ) : (
                    visibleComplaints.map((complaint) => (
                      <tr key={complaint._id || complaint.id}>
                        <td style={{ fontWeight: "600", color: "#2e6cb0" }}>{complaint.complaintNumber}</td>
                        <td>{complaint.citizenName || t('complaint_details_admin.guest')}</td>
                        <td>{complaint.category}</td>
                        <td>{typeof complaint.location === "string" ? complaint.location : complaint.location?.address || t('complaint_details_admin.col_location')}</td>
                        {isAssignedList && (
                          <>
                            <td>{complaint.assignedStaff || (complaint.assignedStaffId ? t('complaint_details_admin.assigned_name_unavailable') : t('complaint_details_admin.not_assigned'))}</td>
                            <td>{complaint.assignedVerifier || (complaint.assignedVerifierId ? t('complaint_details_admin.assigned_name_unavailable') : t('complaint_details_admin.not_assigned'))}</td>
                          </>
                        )}
                        <td>
                          <span className={`cd-badge cd-priority-${String(complaint.priority || "Normal").toLowerCase()}`}>
                            {complaint.priority || t('complaint_details_admin.col_priority')}
                          </span>
                        </td>
                        <td>{isAssignedList ? formatAssignmentDateTime(complaint, t) : (complaint.date || (complaint.createdAt ? new Date(complaint.createdAt).toLocaleDateString(undefined) : t('complaint_details_admin.na')))}</td>
                        <td>
                          <button className="cd-view-btn" onClick={() => handleViewDetails(complaint)}>
                            {t('complaint_details_admin.view_details')}
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
  const hasValidCoordinates =
    Number.isFinite(data.location.lat) &&
    data.location.lat >= -90 &&
    data.location.lat <= 90 &&
    Number.isFinite(data.location.lng) &&
    data.location.lng >= -180 &&
    data.location.lng <= 180;
  const mapPosition = hasValidCoordinates
    ? { lat: data.location.lat, lng: data.location.lng }
    : null;

  return (
    <div className="cd-shell">
      {/* Header */}
      <div className="cd-header">
        <div className="cd-header-actions">
          {!initialComplaint && <button className="cd-back-btn" onClick={handleBackToList}>{t('complaint_details_admin.back_to_list')}</button>}
          <button className="cd-back-btn" onClick={onBack}>{t('complaint_details_admin.back_to_dashboard')}</button>
        </div>
        <div className="cd-header-info">
          <h2>{t('complaint_details_admin.complaint_details')} {data.complaintNumber}</h2>
          <div className="cd-header-badges">
            <span className={`cd-badge cd-priority-${String(data.priority || "Normal").toLowerCase()}`}>
              {data.priority || t('complaint_details_admin.col_priority')}
            </span>
            <span className={`cd-badge cd-status-${getStatusColor(data.status)}`}>
              {data.status}
            </span>
          </div>
        </div>
      </div>

      <div className="cd-grid">
        <div className="cd-overview-grid">
          <section className="cd-card">
            <h3 className="cd-card-title">{t('complaint_details_admin.complaint_citizen_info')}</h3>
            <div className="cd-info-grid">
              <div className="cd-info-item">
                <label>{t('complaint_details_admin.citizen_name')}</label>
                <p>{data.citizen.name}</p>
              </div>
              <div className="cd-info-item">
                <label>{t('complaint_details_admin.report_source')}</label>
                <p>{data.citizenProfile || data.citizenId ? t('complaint_details_admin.registered_citizen') : t('complaint_details_admin.guest_submission')}</p>
              </div>
              <div className="cd-info-item">
                <label>{t('complaint_details_admin.contact_number')}</label>
                <p>{data.citizen.contact}</p>
              </div>
              <div className="cd-info-item">
                <label>{t('complaint_details_admin.email_address')}</label>
                <p>{data.citizen.email || data.citizenProfile?.email || t('complaint_details_admin.na')}</p>
              </div>
              <div className="cd-info-item">
                <label>{t('complaint_details_admin.issue_category')}</label>
                <p>{data.category}</p>
              </div>
              <div className="cd-info-item">
                <label>{t('complaint_details_admin.department')}</label>
                <p>{data.department || t('complaint_details_admin.not_provided')}</p>
              </div>
              <div className="cd-info-item">
                <label>{t('complaint_details_admin.specific_issue')}</label>
                <p>{data.issueType || data.issue}</p>
              </div>
              <div className="cd-info-item">
                <label>{t('complaint_details_admin.date_reported')}</label>
                <p>{data.date}</p>
              </div>
              <div className="cd-info-item cd-full-width">
                <label>{t('complaint_details_admin.detailed_description')}</label>
                <p className="cd-description">{data.description}</p>
              </div>
            </div>
          </section>

          <section className="cd-card">
            <h3 className="cd-card-title">{t('complaint_details_admin.inspection_action_details')}</h3>
            <div className="cd-info-grid">
              <div className="cd-info-item">
                <label>{t('complaint_details_admin.col_assigned_staff')}</label>
                <p>{data.inspection.assignedStaff || t('complaint_details_admin.not_assigned')}</p>
              </div>
              <div className="cd-info-item">
                <label>{t('complaint_details_admin.staff_contact')}</label>
                <p>{data.inspection.staffContact || data.assignedStaffContact || t('complaint_details_admin.na')}</p>
              </div>
              <div className="cd-info-item">
                <label>{t('complaint_details_admin.assigned_date')}</label>
                <p>{data.inspection.assignedDate || t('complaint_details_admin.na')}</p>
              </div>
              <div className="cd-info-item">
                <label>{t('complaint_details_admin.expected_completion')}</label>
                <p>{data.inspection.expectedCompletion || t('complaint_details_admin.na')}</p>
              </div>
              <div className="cd-info-item cd-full-width">
                <label>{t('complaint_details_admin.action_taken_remarks')}</label>
                <p className="cd-description">{data.inspection.actionTaken || t('complaint_details_admin.no_remarks_yet')}</p>
              </div>
            </div>
          </section>
        </div>

        {/* 3. Initial Photographs */}
        <div className="cd-card">
          <h3 className="cd-card-title">{t('complaint_details_admin.initial_photographs')}</h3>
          <div className="cd-photo-grid">
            {data.photos.length > 0 ? data.photos.map((url, index) => (
              <div key={index} className="cd-photo-item">
                <img src={toMediaUrl(url)} alt={`${t('complaint_details_admin.complaint_photo')} ${index + 1}`} loading="lazy" />
              </div>
            )) : <p style={{ color: "#64748b", padding: "10px" }}>{t('complaint_details_admin.no_photos_available')}</p>}
          </div>
        </div>

        {/* 4. Location on Map */}
        <div className="cd-card">
          <h3 className="cd-card-title">{t('complaint_details_admin.complaint_location')}</h3>
          <p className="cd-address">{data.location.address || t('complaint_details_admin.address_not_provided')}</p>
          {mapPosition && (
            <p className="cd-coordinates">
              {t('complaint_details_admin.gps')} {data.location.lat}, {data.location.lng}
              {" · "}
              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${data.location.lat},${data.location.lng}`)}`} target="_blank" rel="noopener noreferrer">
                {t('complaint_details_admin.open_in_google_maps')}
              </a>
            </p>
          )}
          <div className="cd-map-container">
            {mapPosition ? (
              <ComplaintLocationMap
                complaint={{ ...data, images: data.photos, location: data.location.address }}
                position={mapPosition}
              />
            ) : (
              <div style={{ padding: "20px", textAlign: "center", color: "#64748b" }}>{t('complaint_details_admin.map_coordinates_not_available')}</div>
            )}
          </div>
        </div>

        <div className="cd-card cd-card-full">
          <div className="cd-assignment-heading">
            <h3 className="cd-card-title">{t('complaint_details_admin.staff_verifier_assignment')}</h3>
            {!editingAssignments && (
              <button
                className="cd-view-btn"
                type="button"
                onClick={() => {
                  setAssignmentError("");
                  setEditingAssignments(true);
                }}
                disabled={assignmentsLoading || Boolean(assignmentsError)}
              >
                {t('complaint_details_admin.edit_assignments')}
              </button>
            )}
          </div>
          {editingAssignments ? (
            <div className="cd-assignment-grid">
              <div className="cd-assignment-field">
                <label htmlFor="cd-assigned-staff">{t('complaint_details_admin.col_assigned_staff')}</label>
                <select
                  id="cd-assigned-staff"
                  value={selectedStaffId}
                  onChange={(event) => setStaffSelection(event.target.value)}
                  disabled={savingAssignments || assignmentsLoading || Boolean(assignmentsError)}
                >
                  <option value="">{t('complaint_details_admin.unassigned')}</option>
                  {staffOptions.map((staff) => (
                    <option key={staff.id || staff._id} value={String(staff.id || staff._id)}>
                      {staff.name} · {staff.staffId || staff.email}
                      {staff.department ? ` · ${staff.department}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="cd-assignment-field">
                <label htmlFor="cd-assigned-verifier">{t('complaint_details_admin.col_assigned_verifier')}</label>
                <select
                  id="cd-assigned-verifier"
                  value={selectedVerifierId}
                  onChange={(event) => setVerifierSelection(event.target.value)}
                  disabled={savingAssignments || assignmentsLoading || Boolean(assignmentsError)}
                >
                  <option value="">{t('complaint_details_admin.unassigned')}</option>
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
                  {assignmentsLoading ? t('complaint_details_admin.loading_accounts') : savingAssignments ? t('complaint_details_admin.saving') : t('complaint_details_admin.save_assignments')}
                </button>
                <button
                  className="cd-back-btn"
                  type="button"
                  onClick={handleCancelAssignmentEdit}
                  disabled={savingAssignments}
                >
                  {t('complaint_details_admin.cancel')}
                </button>
              </div>
            </div>
          ) : (
            <div className="cd-assignment-grid cd-assignment-readonly">
              <div className="cd-info-item">
                <label>{t('complaint_details_admin.col_assigned_staff')}</label>
                <p>
                  {data.assignedStaff ||
                    staffOptions.find((staff) => String(staff.id || staff._id) === String(selectedStaffId))?.name ||
                    (selectedComplaint.assignedStaffId ? t('complaint_details_admin.assigned_name_unavailable') : t('complaint_details_admin.not_assigned'))}
                </p>
              </div>
              <div className="cd-info-item">
                <label>{t('complaint_details_admin.col_assigned_verifier')}</label>
                <p>
                  {data.assignedVerifier ||
                    verifierOptions.find((verifier) => String(verifier.id || verifier._id) === String(selectedVerifierId))?.name ||
                    (selectedComplaint.assignedVerifierId ? t('complaint_details_admin.assigned_name_unavailable') : t('complaint_details_admin.not_assigned'))}
                </p>
              </div>
            </div>
          )}
          {assignmentsError && <p className="cd-assignment-error" role="alert">{assignmentsError}</p>}
          {assignmentError && <p className="cd-assignment-error" role="alert">{assignmentError}</p>}
        </div>

        {/* 6. Before & After Photographs */}
        <div className="cd-card cd-card-full">
          <h3 className="cd-card-title">{t('complaint_details_admin.before_after_progress')}</h3>
          <div className="cd-comparison-grid">
            <div className="cd-comparison-item">
              <span className="cd-comparison-label">{t('complaint_details_admin.before')}</span>
              {data.beforeAfter.before ? (
                <img src={toMediaUrl(data.beforeAfter.before)} alt={t('complaint_details_admin.before')} loading="lazy" />
              ) : (
                <div className="cd-photo-placeholder">{t('complaint_details_admin.no_before_photo')}</div>
              )}
            </div>
            <div className="cd-comparison-item">
              <span className="cd-comparison-label">{t('complaint_details_admin.after')}</span>
              {data.beforeAfter.after ? (
                <img src={toMediaUrl(data.beforeAfter.after)} alt={t('complaint_details_admin.after')} loading="lazy" />
              ) : (
                <div className="cd-photo-placeholder">{t('complaint_details_admin.no_after_photo')}</div>
              )}
            </div>
          </div>
        </div>

        {/* 7. Complaint History & Remarks */}
        <div className="cd-card cd-card-full">
          <h3 className="cd-card-title">{t('complaint_details_admin.complaint_history_remarks')}</h3>
          <div className="cd-timeline">
            {data.history.length > 0 ? data.history.map((event, index) => (
              <div className="cd-timeline-item" key={index}>
                <div className="cd-timeline-dot"></div>
                <div className="cd-timeline-content">
                  <div className="cd-timeline-header">
                    <span className="cd-timeline-date">{event.date || (event.updatedAt ? new Date(event.updatedAt).toLocaleDateString(undefined) : t('complaint_details_admin.na'))}</span>
                    <span className={`cd-badge cd-status-${getStatusColor(event.status)}`}>{event.status}</span>
                  </div>
                  <p className="cd-timeline-user"><strong>{t('complaint_details_admin.by')}</strong> {event.user || event.actor || t('complaint_details_admin.system')}</p>
                  <p className="cd-timeline-remark">{event.remark || event.remarks || t('complaint_details_admin.no_remarks')}</p>
                </div>
              </div>
            )) : <p style={{ padding: "10px", color: "#64748b" }}>{t('complaint_details_admin.no_history_available')}</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComplaintDetails;