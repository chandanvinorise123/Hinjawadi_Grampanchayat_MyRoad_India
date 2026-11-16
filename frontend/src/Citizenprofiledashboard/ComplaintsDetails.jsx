import React, { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next"; // ✅ ADDED
import "./ComplaintsDetails.css";
import { toMediaUrl } from "../utils/dashboardApi";
import ComplaintLocationMap from "../components/maps/ComplaintLocationMap";

// ⚠️ KEEP IN ENGLISH: Used for internal logic/status mapping
const priorityTone = {
  Critical: "red",
  Urgent: "amber",
  Normal: "green",
  High: "red",
  Medium: "amber",
  Low: "green",
};

const statusToneMap = {
  New: "amber",
  Pending: "amber",
  Submitted: "amber",
  "Under Review": "amber",
  Verified: "amber",
  "Under Verification": "amber",
  Assigned: "orange",
  "Under Action": "orange",
  "In Progress": "orange",
  Resolved: "green",
  Closed: "green",
  "Complaint Registered": "amber",
  "Complaint Verified": "amber",
  "Assigned to Staff/Officer": "orange",
  "Action Initiated": "orange",
  "Work Completed": "orange",
  "Verification": "amber",
  "Complaint Closed": "green",
};

const ComplaintsDetails = ({ onBack, complaints = [] }) => {
  const { t } = useTranslation(); // ✅ ADDED
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  
  const coordinates = selectedComplaint?.coordinates;
  const latitude = Number(coordinates?.latitude);
  const longitude = Number(coordinates?.longitude);
  
  const mapPosition =
    coordinates?.latitude !== null &&
    coordinates?.latitude !== "" &&
    coordinates?.longitude !== null &&
    coordinates?.longitude !== "" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
      ? { lat: latitude, lng: longitude }
      : null;

  const complaintDetails = complaints.map((complaint) => ({
    ...complaint,
    imageUrls: Array.from(new Set([
      ...(Array.isArray(complaint.images) ? complaint.images : []),
      ...(Array.isArray(complaint.citizenPhotos) ? complaint.citizenPhotos : []),
      ...(complaint.photos && typeof complaint.photos === "object"
        ? Object.values(complaint.photos)
        : []),
    ].filter((image) => typeof image === "string" && image.trim()))),
    history: (complaint.statusHistory || []).map((entry) => ({
      time: entry.updatedAt ? new Date(entry.updatedAt).toLocaleString() : "",
      action: entry.status,
      remarks: entry.remarks || "",
    })),
  }));

  const filteredComplaints = useMemo(() => {
    return complaintDetails.filter((c) =>
      (c.complaintNumber || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.category || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.location || "").toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [complaintDetails, searchTerm]); // ✅ Fixed dependency array

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") setSelectedComplaint(null);
    };
    if (selectedComplaint) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "auto";
    };
  }, [selectedComplaint]);

  return (
    <div className="cdp-cd-page">
      {/* Header */}
      <div className="cdp-cd-header">
        <button className="cdp-back-btn" onClick={onBack}>← {t('complaint_details.back_to_dashboard')}</button>
        <h1>{t('complaint_details.title')}</h1>
      </div>

      <div className="cdp-cd-content">
        <p className="cdp-cd-subtitle">{t('complaint_details.subtitle')}</p>

        {/* Search Bar */}
        <div className="cdp-cd-controls">
          <div className="cdp-cd-search">
            <span className="cdp-cd-search-icon">🔍</span>
            <input
              type="text"
              placeholder={t('complaint_details.search_placeholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Complaints Table */}
        <div className="cdp-cd-table-container">
          {filteredComplaints.length === 0 ? (
            <div className="cdp-cd-empty-state">
              <div className="cdp-cd-empty-icon">📭</div>
              <h4>{t('complaint_details.empty_title')}</h4>
              <p>{t('complaint_details.empty_desc')}</p>
            </div>
          ) : (
            <table className="cdp-cd-table">
              <thead>
                <tr>
                  <th>{t('complaint_details.col_complaint_no')}</th>
                  <th>{t('complaint_details.col_category')}</th>
                  <th>{t('complaint_details.col_priority')}</th>
                  <th>{t('complaint_details.col_location')}</th>
                  <th>{t('complaint_details.col_status')}</th>
                  <th>{t('complaint_details.col_action')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredComplaints.map((c) => (
                  <tr key={c.id} className="cdp-cd-row">
                    <td className="cdp-cd-mono">{c.complaintNumber}</td>
                    <td>{c.category}</td>
                    <td>
                      <span className={`cdp-cd-badge cdp-cd-badge-${priorityTone[c.priority]}`}>
                        {c.priority}
                      </span>
                    </td>
                    <td>{c.location}</td>
                    <td>
                      <span className={`cdp-cd-badge cdp-cd-badge-${statusToneMap[c.status]}`}>
                        {c.status}
                      </span>
                    </td>
                    <td>
                      <button className="cdp-cd-view-btn" onClick={() => setSelectedComplaint(c)}>
                        {t('complaint_details.view_details')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ✅ OVERLAY MODAL for Complete Complaint Details */}
      {selectedComplaint && (
        <div className="cdp-cd-modal-overlay" onClick={() => setSelectedComplaint(null)}>
          <div className="cdp-cd-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="cdp-cd-modal-header">
              <div>
                <span className="cdp-cd-modal-badge">{t('complaint_details.modal_title')}</span>
                <h3>{selectedComplaint.complaintNumber}</h3>
              </div>
              <button className="cdp-cd-modal-close" onClick={() => setSelectedComplaint(null)}>✕</button>
            </div>

            <div className="cdp-cd-modal-body">
              {/* 1. Basic Info Grid */}
              <div className="cdp-cd-info-grid">
                <div className="cdp-cd-info-item"><span>{t('complaint_details.modal_category')}</span><b>{selectedComplaint.category}</b></div>
                <div className="cdp-cd-info-item"><span>{t('complaint_details.modal_priority')}</span><b className={`cdp-cd-text-${priorityTone[selectedComplaint.priority]}`}>{selectedComplaint.priority}</b></div>
                <div className="cdp-cd-info-item"><span>{t('complaint_details.modal_current_status')}</span><b className={`cdp-cd-text-${statusToneMap[selectedComplaint.status]}`}>{selectedComplaint.status}</b></div>
                <div className="cdp-cd-info-item"><span>{t('complaint_details.modal_date_submitted')}</span><b>{selectedComplaint.date}</b></div>
                <div className="cdp-cd-info-item" style={{ gridColumn: "1 / -1" }}><span>{t('complaint_details.modal_location')}</span><b>📍 {selectedComplaint.location}</b></div>
              </div>

              {/* 2. Map Section */}
              <div className="cdp-cd-section">
                <h4>🗺️ {t('complaint_details.modal_complaint_location')}</h4>
                {mapPosition && (
                  <p>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${mapPosition.lat},${mapPosition.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {mapPosition.lat.toFixed(6)}, {mapPosition.lng.toFixed(6)} · {t('complaint_details.modal_open_exact')}
                    </a>
                  </p>
                )}
                <div className="cdp-cd-map-container">
                  {mapPosition && (
                    <ComplaintLocationMap
                      complaint={{
                        ...selectedComplaint,
                        images: selectedComplaint.imageUrls,
                      }}
                      position={mapPosition}
                    />
                  )}
                </div>
              </div>

              {/* 3. Description */}
              <div className="cdp-cd-section">
                <h4>📝 {t('complaint_details.modal_issue_desc')}</h4>
                <p className="cdp-cd-description">{selectedComplaint.description}</p>
              </div>

              {/* 4. Photo Gallery */}
              {selectedComplaint.imageUrls.length > 0 && (
                <div className="cdp-cd-section">
                  <h4>📷 {t('complaint_details.modal_photo_evidence')}</h4>
                  <div className="cdp-cd-photo-grid">
                    {selectedComplaint.imageUrls.map((image, index) => (
                      <div className="cdp-cd-photo-card" key={image}>
                        <span className="cdp-cd-photo-label">{t('complaint_details.modal_photo_label')} {index + 1}</span>
                        <img
                          className="cdp-cd-photo-image"
                          src={toMediaUrl(image)}
                          alt={`${t('complaint_details.modal_photo_label')} ${index + 1}`}
                          loading="lazy"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 5. History Timeline */}
              <div className="cdp-cd-section">
                <h4>🕘 {t('complaint_details.modal_history_title')}</h4>
                <div className="cdp-cd-timeline">
                  {selectedComplaint.history.map((log, idx) => (
                    <div className="cdp-cd-timeline-item" key={idx}>
                      <div className="cdp-cd-timeline-dot"></div>
                      <div className="cdp-cd-timeline-content">
                        <div className="cdp-cd-timeline-header">
                          <span className="cdp-cd-timeline-action">{log.action}</span>
                          <span className="cdp-cd-timeline-time">{log.time}</span>
                        </div>
                        <p className="cdp-cd-timeline-remarks">{log.remarks}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 6. Resolution Details */}
              {selectedComplaint.resolutionDetails && (
                <div className="cdp-cd-section cdp-cd-resolution-section">
                  <h4>✅ {t('complaint_details.modal_resolution_title')}</h4>
                  <div className="cdp-cd-resolution-grid">
                    <div><span>{t('complaint_details.modal_resolved_by')}</span><strong>{selectedComplaint.resolutionDetails.resolvedBy}</strong></div>
                    <div><span>{t('complaint_details.modal_resolution_date')}</span><strong>{selectedComplaint.resolutionDetails.resolutionDate}</strong></div>
                    <div style={{ gridColumn: "1 / -1" }}><span>{t('complaint_details.modal_final_remarks')}</span><strong>{selectedComplaint.resolutionDetails.remarks}</strong></div>
                  </div>
                </div>
              )}
            </div>

            <div className="cdp-cd-modal-footer">
              <button className="cdp-cd-modal-close-btn" onClick={() => setSelectedComplaint(null)}>
                {t('complaint_details.modal_close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplaintsDetails;