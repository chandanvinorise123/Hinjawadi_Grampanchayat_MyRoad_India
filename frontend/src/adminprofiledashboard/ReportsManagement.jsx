import React, { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import "./ReportsManagement.css";
import { API_BASE_URL, fetchDashboard, getStoredUser, getUserId } from "../utils/dashboardApi";

// ==========================================
// ==========================================
const REPORT_TYPES = [
  { id: "daily", title: " Daily Report", desc: "Generate a summary of today's complaints.", icon: "" },
  { id: "weekly", title: "🗓️ Weekly/Monthly Report", desc: "Analyze trends over a specific period.", icon: "🗓️" },
  { id: "status", title: "⏳ Pending vs Resolved", desc: "Track resolution rates and bottlenecks.", icon: "⏳" },
  { id: "category", title: "📁 Category & Area Wise", desc: "Breakdown by issue type and location.", icon: "📁" },
  { id: "staff", title: "👷 Staff & Progress Report", desc: "Monitor individual staff performance.", icon: "👷" },
];

const ReportsManagement = ({ onBack }) => {
  const [reports, setReports] = useState({ complaints: [], staff: [] });
  const [selectedReport, setSelectedReport] = useState(null);
  const [filterValue, setFilterValue] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    Promise.all([
      fetchDashboard("admin", getUserId(getStoredUser())),
      fetch(`${API_BASE_URL}/users?role=staff`).then((response) => response.json()),
    ])
      .then(([dashboard, usersResult]) => {
        const complaints = dashboard.complaints || [];
        const staff = (usersResult.users || []).map((user) => {
          const assigned = complaints.filter((complaint) => complaint.assignedStaff === user.name);
          const completed = assigned.filter((complaint) => ["Resolved", "Closed"].includes(complaint.status)).length;
          return {
            name: user.name,
            assigned: assigned.length,
            completed,
            pending: assigned.length - completed,
            progress: assigned.length ? `${Math.round((completed / assigned.length) * 100)}%` : "0%",
          };
        });
        setReports({
          complaints: complaints.map((complaint) => ({
            id: complaint.complaintNumber,
            date: complaint.date,
            category: complaint.category,
            area: complaint.location,
            priority: complaint.priority,
            status: complaint.status,
            staff: complaint.assignedStaff || "Unassigned",
          })),
          staff,
        });
      })
      .catch((error) => console.error("Failed to load reports:", error));
  }, []);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 3000);
  };

  // ==========================================
  // 2. COLORFUL PDF GENERATION ENGINE
  // ==========================================
  const generatePDF = (type) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // --- PDF Header ---
    doc.setFillColor(30, 58, 138); // Navy Blue
    doc.rect(0, 0, pageWidth, 40, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("MyRoad India - Official Report", 14, 20);
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Report Type: ${REPORT_TYPES.find(r => r.id === type)?.title || "Custom"}`, 14, 30);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth - 14, 30, { align: "right" });

    // --- Summary Section ---
    let yPos = 55;
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Executive Summary", 14, yPos);
    yPos += 10;

    // Colorful Summary Boxes
    const total = reports.complaints.length;
    const resolved = reports.complaints.filter(c => ["Resolved", "Closed"].includes(c.status)).length;
    const pending = total - resolved;

    const drawBox = (x, y, label, value, color) => {
      doc.setFillColor(color.r, color.g, color.b);
      doc.roundedRect(x, y, 55, 25, 3, 3, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.text(label, x + 5, y + 10);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(value.toString(), x + 5, y + 20);
    };

    drawBox(14, yPos, "Total Complaints", total, { r: 59, g: 130, b: 246 }); // Blue
    drawBox(75, yPos, "Resolved", resolved, { r: 16, g: 163, b: 74 }); // Green
    drawBox(136, yPos, "Pending", pending, { r: 217, g: 119, b: 6 }); // Amber
    yPos += 40;

    // --- Table Data Preparation ---
    let head = [];
    let body = [];

    if (type === "staff") {
      head = [["Staff Name", "Assigned", "Completed", "Pending", "Progress"]];
      body = reports.staff.map(s => [s.name, s.assigned, s.completed, s.pending, s.progress]);
    } else {
      head = [["Complaint ID", "Date", "Category", "Area", "Priority", "Status", "Staff"]];
      body = reports.complaints.map(c => [c.id, c.date, c.category, c.area, c.priority, c.status, c.staff]);
    }

    // --- Generate Beautiful Table ---
    autoTable(doc, {
      startY: yPos,
      head: head,
      body: body,
      theme: "grid",
      headStyles: { 
        fillColor: [30, 58, 138], // Navy Blue Header
        textColor: 255, 
        fontSize: 10,
        halign: "center"
      },
      bodyStyles: { 
        fontSize: 9, 
        textColor: [30, 41, 59],
        lineColor: [226, 232, 240]
      },
      alternateRowStyles: { 
        fillColor: [248, 250, 252] // Light gray for alternating rows
      },
      columnStyles: {
        4: { halign: "center" }, // Center align Priority
        5: { halign: "center" }, // Center align Status
        6: { halign: "center" }  // Center align Staff
      },
      margin: { top: yPos, left: 14, right: 14 }
    });

    // --- Footer ---
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`Page ${i} of ${pageCount} | MyRoad India Gram Panchayat Portal`, pageWidth / 2, 285, { align: "center" });
    }

    doc.save(`MyRoad_Report_${type}_${Date.now()}.pdf`);
    showMessage("success", "Colorful PDF generated successfully!");
  };

  return (
    <div className="rm-shell">
      <div className="rm-header">
        <button className="rm-back-btn" onClick={onBack}>← Back to Dashboard</button>
        <div>
          <h2>📈 Reports Management</h2>
          <p>Generate, view, and download colorful PDF reports for all system activities.</p>
        </div>
      </div>

      {message.text && <div className={`rm-message ${message.type}`}>{message.text}</div>}

      {/* Report Cards Grid */}
      <div className="rm-grid">
        {REPORT_TYPES.map(report => (
          <div key={report.id} className="rm-card" onClick={() => setSelectedReport(report.id)}>
            <div className="rm-card-icon">{report.icon}</div>
            <h3>{report.title}</h3>
            <p>{report.desc}</p>
            <button className="rm-card-btn" onClick={(e) => { e.stopPropagation(); generatePDF(report.id); }}>
              Download PDF
            </button>
          </div>
        ))}
      </div>

      {/* Preview Section (Shows what the PDF will look like) */}
      {selectedReport && (
        <div className="rm-preview-section">
          <h3>Preview: {REPORT_TYPES.find(r => r.id === selectedReport)?.title}</h3>
          <div className="rm-preview-table">
            <table>
              <thead>
                <tr>
                  {selectedReport === "staff" ? (
                    <>
                      <th>Staff Name</th><th>Assigned</th><th>Completed</th><th>Pending</th><th>Progress</th>
                    </>
                  ) : (
                    <>
                      <th>ID</th><th>Date</th><th>Category</th><th>Area</th><th>Priority</th><th>Status</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {selectedReport === "staff" 
                  ? reports.staff.map((s, i) => (
                      <tr key={i}><td>{s.name}</td><td>{s.assigned}</td><td>{s.completed}</td><td>{s.pending}</td><td><span className="rm-progress">{s.progress}</span></td></tr>
                    ))
                  : reports.complaints.map((c, i) => (
                      <tr key={i}><td>{c.id}</td><td>{c.date}</td><td>{c.category}</td><td>{c.area}</td><td><span className={`rm-badge rm-p-${String(c.priority || "normal").toLowerCase()}`}>{c.priority || "Normal"}</span></td><td><span className={`rm-badge rm-s-${String(c.status || "new").toLowerCase()}`}>{c.status || "New"}</span></td></tr>
                    ))
                }
              </tbody>
            </table>
          </div>
          <button className="rm-generate-btn" onClick={() => generatePDF(selectedReport)}>
            📥 Generate & Download Colorful PDF
          </button>
        </div>
      )}
    </div>
  );
};

export default ReportsManagement;