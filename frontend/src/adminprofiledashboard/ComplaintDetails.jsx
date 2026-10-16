import React, { useState, useEffect } from "react";
import "./ComplaintDetails.css";
import { fetchDashboard, getStoredUser, getUserId } from "../utils/dashboardApi";

const toDetailData = (complaint) => ({
  ...complaint,
  citizen: { name: complaint.citizenName, contact: complaint.citizenContact || "", email: "" },
  photos: complaint.images || complaint.citizenPhotos || [],
  location: typeof complaint.location === "object"
    ? complaint.location
    : { address: complaint.location || "", ...complaint.coordinates },
  inspection: {
    assignedStaff: complaint.assignedStaff,
    actionTaken: complaint.inspection?.actionTaken || "",
    expectedCompletion: complaint.inspection?.completionDate || "",
  },
  beforeAfter: {
    before: complaint.images?.[0] || "",
    after: complaint.images?.[1] || "",
  },
  history: complaint.statusHistory || complaint.log || [],
});

const ComplaintDetails = ({ onBack, complaint: initialComplaint }) => {
  const [data, setData] = useState(initialComplaint ? toDetailData(initialComplaint) : null);

  useEffect(() => {
    if (initialComplaint) {
      setData(toDetailData(initialComplaint));
      return;
    }
    fetchDashboard("admin", getUserId(getStoredUser()))
      .then(({ complaints = [] }) => {
        const complaint = complaints[0];
        if (complaint) {
          setData(toDetailData(complaint));
        }
      })
      .catch((error) => console.error("Failed to load complaint details:", error));
  }, [initialComplaint]);

  if (!data) {
    return <div className="cd-shell"><button className="cd-back-btn" onClick={onBack}>← Back to Dashboard</button><p>Loading complaint details...</p></div>;
  }

  const getStatusColor = (status) => {
    const colors = { "Registered": "navy", "Verified": "amber", "Assigned": "orange", "Under Action": "orange", "Resolved": "green" };
    return colors[status] || "navy";
  };

  return (
    <div className="cd-shell">
      {/* Header */}
      <div className="cd-header">
        <button className="cd-back-btn" onClick={onBack}>← Back to Dashboard</button>
        <div className="cd-header-info">
          <h2>Complaint Details: {data.complaintNumber}</h2>
          <div className="cd-header-badges">
            <span className={`cd-badge cd-priority-${String(data.priority || "Normal").toLowerCase()}`}>{data.priority || "Normal"}</span>
            <span className={`cd-badge cd-status-${getStatusColor(data.status).toLowerCase()}`}>{data.status}</span>
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
              <label>Contact Number</label>
              <p>{data.citizen.contact}</p>
            </div>
            <div className="cd-info-item">
              <label>Email Address</label>
              <p>{data.citizen.email}</p>
            </div>
            <div className="cd-info-item">
              <label>Issue Category</label>
              <p>{data.category}</p>
            </div>
            <div className="cd-info-item">
              <label>Specific Issue</label>
              <p>{data.issue}</p>
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
            {data.photos.map((url, index) => (
              <div key={index} className="cd-photo-item">
                <img src={url} alt={`Complaint photo ${index + 1}`} />
              </div>
            ))}
          </div>
        </div>

        {/* 4. Location on Map */}
        <div className="cd-card">
          <h3 className="cd-card-title">📍 Complaint Location</h3>
          <p className="cd-address">{data.location.address}</p>
          <div className="cd-map-container">
            <iframe 
              title="Complaint Location Map"
              width="100%" 
              height="100%" 
              frameBorder="0" 
              scrolling="no" 
              marginHeight="0" 
              marginWidth="0" 
              src={data.location.lat !== undefined && data.location.lng !== undefined
                ? `https://www.openstreetmap.org/export/embed.html?bbox=${data.location.lng - 0.01}%2C${data.location.lat - 0.01}%2C${data.location.lng + 0.01}%2C${data.location.lat + 0.01}&layer=mapnik&marker=${data.location.lat}%2C${data.location.lng}`
                : undefined}
            ></iframe>
          </div>
        </div>

        {/* 5. Inspection & Action Details */}
        <div className="cd-card cd-card-full">
          <h3 className="cd-card-title">🛠️ Inspection & Action Details</h3>
          <div className="cd-info-grid">
            <div className="cd-info-item">
              <label>Assigned Staff</label>
              <p>{data.inspection.assignedStaff}</p>
            </div>
            <div className="cd-info-item">
              <label>Staff Contact</label>
              <p>{data.inspection.staffContact}</p>
            </div>
            <div className="cd-info-item">
              <label>Assigned Date</label>
              <p>{data.inspection.assignedDate}</p>
            </div>
            <div className="cd-info-item">
              <label>Expected Completion</label>
              <p>{data.inspection.expectedCompletion}</p>
            </div>
            <div className="cd-info-item cd-full-width">
              <label>Action Taken / Remarks</label>
              <p className="cd-description">{data.inspection.actionTaken}</p>
            </div>
          </div>
        </div>

        {/* 6. Before & After Photographs */}
        <div className="cd-card cd-card-full">
          <h3 className="cd-card-title">🔄 Before & After Progress</h3>
          <div className="cd-comparison-grid">
            <div className="cd-comparison-item">
              <span className="cd-comparison-label">Before</span>
              <img src={data.beforeAfter.before} alt="Before work" />
            </div>
            <div className="cd-comparison-item">
              <span className="cd-comparison-label">After</span>
              <img src={data.beforeAfter.after} alt="After work" />
            </div>
          </div>
        </div>

        {/* 7. Complaint History & Remarks */}
        <div className="cd-card cd-card-full">
          <h3 className="cd-card-title">📜 Complaint History & Remarks</h3>
          <div className="cd-timeline">
            {data.history.map((event, index) => (
              <div className="cd-timeline-item" key={index}>
                <div className="cd-timeline-dot"></div>
                <div className="cd-timeline-content">
                  <div className="cd-timeline-header">
                    <span className="cd-timeline-date">{event.date}</span>
                    <span className={`cd-badge cd-status-${getStatusColor(event.status).toLowerCase()}`}>{event.status}</span>
                  </div>
                  <p className="cd-timeline-user"><strong>By:</strong> {event.user}</p>
                  <p className="cd-timeline-remark">{event.remark}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ComplaintDetails;