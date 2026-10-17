import React from "react";
import "./VerifierComplaintDetails.css";

const formatDate = (value) => {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
};

const VerifierComplaintDetails = ({ complaint }) => {
  if (!complaint) return null;

  const details = [
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
    ["Inspection date", formatDate(complaint.inspection?.inspectionDate)],
    ["Work completion date", formatDate(complaint.inspection?.completionDate)],
  ];

  return (
    <section className="vcd-panel" aria-label="Complaint and work details">
      <h4>Citizen, Assignment & Work Details</h4>
      <div className="vcd-grid">
        {details.map(([label, value]) => (
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
  );
};

export default VerifierComplaintDetails;
