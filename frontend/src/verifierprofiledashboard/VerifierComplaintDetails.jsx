import React from "react";
import "./VerifierComplaintDetails.css";
import ComplaintImage from "./ComplaintImage";

const formatDate = (value) => {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
};

const VerifierComplaintDetails = ({ complaint }) => {
  if (!complaint) return null;

  const citizenDetails = [
    ["Citizen", complaint.citizenName || "Not available"],
    ["Citizen contact", complaint.citizenContact || "Not available"],
    ["Citizen email", complaint.citizenProfile?.email || "Not available"],
    ["Department", complaint.department || "Not assigned"],
    ["Assigned staff", complaint.assignedStaff || "Not assigned"],
    ["Assigned verifier", complaint.assignedVerifier || "Not assigned"],
    ["Priority", complaint.priority || "Normal"],
    ["Submitted", formatDate(complaint.createdAt || complaint.date)],
    ["Last updated", formatDate(complaint.updatedAt)],
    ["Landmark", complaint.landmark || "Not provided"],
  ];

  const workDetails = [
    ["Inspection date", formatDate(complaint.inspection?.inspectionDate)],
    ["Work completion date", formatDate(complaint.inspection?.completionDate)],
  ];

  return (
    <div className="vcd-layout" aria-label="Complaint and work details">
      <section className="vcd-panel" aria-labelledby="vcd-citizen-heading">
        <h4 id="vcd-citizen-heading">Citizen & Complaint Details</h4>
        <div className="vcd-grid">
          {citizenDetails.map(([label, value]) => (
            <div className="vcd-item" key={label}>
              <span>{label}</span>
              <b>{value}</b>
            </div>
          ))}
          <div className="vcd-item vcd-wide">
            <span>Reported description</span>
            <b>{complaint.description || "No description provided."}</b>
          </div>
          <div className="vcd-item vcd-wide">
            <span>Complaint location</span>
            <b>{complaint.location || "Location pending"}</b>
          </div>
          {complaint.coordinates?.latitude != null && complaint.coordinates?.longitude != null && (
            <div className="vcd-item vcd-wide">
              <span>GPS coordinates</span>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${complaint.coordinates.latitude},${complaint.coordinates.longitude}`)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {complaint.coordinates.latitude}, {complaint.coordinates.longitude} · Open map
              </a>
            </div>
          )}
        </div>
      </section>

      <section className="vcd-panel" aria-labelledby="vcd-work-heading">
        <h4 id="vcd-work-heading">Inspection & Work Details</h4>
        <div className="vcd-grid">
          {workDetails.map(([label, value]) => (
            <div className="vcd-item" key={label}>
              <span>{label}</span>
              <b>{value}</b>
            </div>
          ))}
          <div className="vcd-item vcd-wide">
            <span>Staff inspection remarks</span>
            <b>{complaint.inspection?.remarks || "No staff inspection remarks recorded."}</b>
          </div>
          <div className="vcd-item vcd-wide">
            <span>Action taken by staff</span>
            <b>{complaint.inspection?.actionTaken || "No work action recorded."}</b>
          </div>
          {complaint.verifierRemarks && (
            <div className="vcd-item vcd-wide">
              <span>Latest verifier feedback</span>
              <b>{complaint.verifierRemarks}</b>
            </div>
          )}
        </div>
        {complaint.photos?.verification && (
          <div className="vcd-verification-photo">
            <span>Physical verification evidence</span>
            <ComplaintImage
              src={complaint.photos.verification}
              alt="Physical verification evidence"
              fallbackClassName="vcd-photo-fallback"
            />
          </div>
        )}
      </section>
    </div>
  );
};

export default VerifierComplaintDetails;
