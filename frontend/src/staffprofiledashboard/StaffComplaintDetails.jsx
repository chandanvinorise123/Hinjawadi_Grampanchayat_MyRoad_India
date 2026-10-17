import React from "react";
import { toMediaUrl } from "../utils/dashboardApi";
import "./StaffComplaintDetails.css";

const formatDate = (value) => {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
};

const StaffComplaintDetails = ({ complaint, showMap = true }) => {
  if (!complaint) return null;

  const coordinates = complaint.coordinates || {};
  const hasCoordinates = coordinates.latitude !== null
    && coordinates.latitude !== undefined
    && coordinates.latitude !== ""
    && coordinates.longitude !== null
    && coordinates.longitude !== undefined
    && coordinates.longitude !== ""
    && Number.isFinite(Number(coordinates.latitude))
    && Number.isFinite(Number(coordinates.longitude));
  const mapQuery = hasCoordinates
    ? `${coordinates.latitude},${coordinates.longitude}`
    : complaint.location;
  const citizenPhotos = Array.isArray(complaint.citizenPhotos)
    ? complaint.citizenPhotos
    : Array.isArray(complaint.images) ? complaint.images : [];
  const workPhotos = [
    ["Before / Site", complaint.inspection?.sitePhoto || complaint.photos?.site],
    ["After Work", complaint.inspection?.completionPhoto || complaint.photos?.after],
  ].filter(([, photo]) => photo);
  const activity = Array.isArray(complaint.log) ? [...complaint.log].reverse() : [];

  return (
    <section className="scd-panel" aria-label="Full complaint and workflow details">
      <div className="scd-heading">
        <h3>Complaint, Assignment & Work Details</h3>
        <span>{complaint.status || "Status unavailable"}</span>
      </div>

      <div className="scd-grid">
        {[
          ["Citizen", complaint.citizenName],
          ["Contact", complaint.citizenContact],
          ["Citizen email", complaint.citizenProfile?.email],
          ["Department", complaint.department],
          ["Priority", complaint.priority],
          ["Assigned staff", complaint.assignedStaff],
          ["Assigned verifier", complaint.assignedVerifier],
          ["Submitted", formatDate(complaint.createdAt || complaint.date)],
          ["Last updated", formatDate(complaint.updatedAt)],
          ["Landmark", complaint.landmark],
          ["Inspection date", formatDate(complaint.inspection?.inspectionDate)],
          ["Completion date", formatDate(complaint.inspection?.completionDate)],
        ].map(([label, value]) => (
          <div className="scd-item" key={label}>
            <span>{label}</span>
            <b>{value || "Not recorded"}</b>
          </div>
        ))}
        <div className="scd-item scd-wide">
          <span>Complaint description</span>
          <p>{complaint.description || "No description provided."}</p>
        </div>
        <div className="scd-item scd-wide">
          <span>Staff inspection remarks</span>
          <p>{complaint.inspection?.remarks || "No inspection remarks recorded."}</p>
        </div>
        <div className="scd-item scd-wide">
          <span>Work performed</span>
          <p>{complaint.inspection?.actionTaken || "No work details recorded."}</p>
        </div>
        <div className="scd-item scd-wide">
          <span>Verifier feedback</span>
          <p>{complaint.verifierRemarks || complaint.previousRemarks || "No verifier feedback recorded."}</p>
        </div>
        <div className="scd-item scd-wide">
          <span>Location</span>
          <p>{complaint.location || "Location not recorded"}</p>
          {mapQuery && (
            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`} target="_blank" rel="noopener noreferrer">
              {hasCoordinates ? `${coordinates.latitude}, ${coordinates.longitude} · Open map` : "Open location in map"}
            </a>
          )}
          {showMap && hasCoordinates && (
            <iframe
              className="scd-map"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(coordinates.longitude) - 0.02}%2C${Number(coordinates.latitude) - 0.02}%2C${Number(coordinates.longitude) + 0.02}%2C${Number(coordinates.latitude) + 0.02}&layer=mapnik&marker=${coordinates.latitude}%2C${coordinates.longitude}`}
              title={`Map for complaint ${complaint.complaintNumber || ""}`}
              loading="lazy"
            />
          )}
        </div>
      </div>

      <div className="scd-evidence-section">
        <h4>Citizen Photographs</h4>
        {citizenPhotos.length ? (
          <div className="scd-photo-grid">
            {citizenPhotos.map((photo, index) => (
              <a className="scd-photo" href={toMediaUrl(photo)} target="_blank" rel="noopener noreferrer" key={`${photo}-${index}`}>
                <img src={toMediaUrl(photo)} alt={`Citizen complaint evidence ${index + 1}`} loading="lazy" />
                <span>Initial evidence {index + 1}</span>
              </a>
            ))}
          </div>
        ) : <p className="scd-empty">No citizen photographs attached.</p>}
      </div>

      <div className="scd-evidence-section">
        <h4>Before & After Work Evidence</h4>
        {workPhotos.length ? (
          <div className="scd-photo-grid">
            {workPhotos.map(([label, photo]) => (
              <a className="scd-photo" href={toMediaUrl(photo)} target="_blank" rel="noopener noreferrer" key={label}>
                <img src={toMediaUrl(photo)} alt={`${label} work evidence`} loading="lazy" />
                <span>{label}</span>
              </a>
            ))}
          </div>
        ) : <p className="scd-empty">No staff work photographs attached.</p>}
      </div>

      <div className="scd-evidence-section">
        <h4>Admin, Staff & Verifier Activity</h4>
        {activity.length ? (
          <ol className="scd-activity">
            {activity.map((entry, index) => (
              <li key={`${entry.time || "event"}-${index}`}>
                <b>{entry.actor || "Dashboard"}</b>
                <span>{formatDate(entry.time)}</span>
                <p>{entry.text}</p>
              </li>
            ))}
          </ol>
        ) : <p className="scd-empty">No activity history recorded yet.</p>}
      </div>
    </section>
  );
};

export default StaffComplaintDetails;
