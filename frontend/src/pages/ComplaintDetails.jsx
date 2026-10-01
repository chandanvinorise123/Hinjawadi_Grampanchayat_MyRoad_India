import React, { useState } from "react";
import "./ComplaintDetails.css";

// ==========================================
// 1. HARDCODED MOCK DATA (Will be replaced by API later)
// ==========================================
const MOCK_DETAILS = {
  id: "1",
  complaintNumber: "MRI-849201",
  date: "2023-10-25",
  priority: "Critical",
  status: "Under Action",
  
  // 1 & 2. Citizen, Complaint, Category & Description
  citizen: { name: "Rahul Sharma", contact: "+91 98765 43210", email: "rahul.s@example.com" },
  category: "Road Damage",
  issue: "Large Pothole",
  description: "A massive pothole has formed near the Wipro gate, causing traffic jams and vehicle damage. It is especially dangerous during the monsoon season.",
  
  // 3. Initial Photographs
  photos: [
    "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1590486803833-1c5dc8ddd4c8?auto=format&fit=crop&w=400&q=80"
  ],

  // 4. Location
  location: { address: "Hinjawadi Phase 2, Near Wipro Gate, Pune", lat: 18.5912, lng: 73.7389 },

  // 5. Inspection & Action Details
  inspection: {
    assignedStaff: "Shiv Kumar",
    staffContact: "+91 99887 76655",
    assignedDate: "2023-10-26",
    actionTaken: "Barricades placed around the pothole. Cold mix asphalt ordered for permanent repair.",
    expectedCompletion: "2023-10-28"
  },

  // 6. Before & After Photographs
  beforeAfter: {
    before: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80",
    after: "https://images.unsplash.com/photo-1590486803833-1c5dc8ddd4c8?auto=format&fit=crop&w=600&q=80"
  },

  // 7. History & Remarks
  history: [
    { date: "2023-10-25 09:15 AM", user: "Rahul Sharma (Citizen)", status: "Registered", remark: "Complaint submitted via web portal." },
    { date: "2023-10-25 11:30 AM", user: "Admin User", status: "Verified", remark: "Verified the issue. Marked as Critical priority." },
    { date: "2023-10-26 10:00 AM", user: "Admin User", status: "Assigned", remark: "Assigned to staff member Shiv Kumar." },
    { date: "2023-10-26 02:45 PM", user: "Shiv Kumar (Staff)", status: "Under Action", remark: "Reached location. Barricades placed." }
  ]
};

const ComplaintDetails = ({ onBack }) => {
  const [data] = useState(MOCK_DETAILS);

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
            <span className={`cd-badge cd-priority-${data.priority.toLowerCase()}`}>{data.priority}</span>
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
            {/* Using OpenStreetMap iframe for a real map view without needing an API key for the mockup */}
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