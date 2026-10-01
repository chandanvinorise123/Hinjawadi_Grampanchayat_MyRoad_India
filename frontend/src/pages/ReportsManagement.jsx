import React, { useState } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import "./ReportsManagement.css";

// ==========================================
// 1. HARDCODED MOCK DATA
// ==========================================
const MOCK_REPORTS = {
  complaints: [
    { id: "MRI-849201", date: "2023-10-25", category: "Road Damage", area: "Hinjawadi Phase 2", priority: "Critical", status: "Resolved", staff: "Shiv Kumar" },
    { id: "MRI-849202", date: "2023-10-26", category: "Street Light", area: "IT Park Road", priority: "Urgent", status: "Pending", staff: "Unassigned" },
    { id: "MRI-849203", date: "2023-10-27", category: "Water Logging", area: "Marunji Road", priority: "Normal", status: "Resolved", staff: "Ramesh Yadav" },
    { id: "MRI-849204", date: "2023-10-28", category: "Road Damage", area: "Pirangut Road", priority: "Normal", status: "Pending", staff: "Anil Patil" },
    { id: "MRI-849205", date: "2023-10-29", category: "Garbage Dump", area: "Tathawade", priority: "Urgent", status: "Resolved", staff: "Shiv Kumar" },
  ],
  staff: [
    { name: "Shiv Kumar", assigned: 12, completed: 10, pending: 2, progress: "83%" },
    { name: "Ramesh Yadav", assigned: 8, completed: 8, pending: 0, progress: "100%" },
    { name: "Anil Patil", assigned: 15, completed: 9, pending: 6, progress: "60%" },
  ]
};

const REPORT_TYPES = [
  { id: "daily", title: " Daily Report", desc: "Generate a summary of today's complaints.", icon: "" },
  { id: "weekly", title: "🗓️ Weekly/Monthly Report", desc: "Analyze trends over a specific period.", icon: "🗓️" },
  { id: "status", title: "⏳ Pending vs Resolved", desc: "Track resolution rates and bottlenecks.", icon: "⏳" },
  { id: "category", title: "📁 Category & Area Wise", desc: "Breakdown by issue type and location.", icon: "📁" },
  { id: "staff", title: "👷 Staff & Progress Report", desc: "Monitor individual staff performance.", icon: "👷" },
];

const ReportsManagement = ({ onBack }) => {
  const [selectedReport, setSelectedReport] = useState(null);
  const [filterValue, setFilterValue] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });

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
    const total = MOCK_REPORTS.complaints.length;
    const resolved = MOCK_REPORTS.complaints.filter(c => c.status === "Resolved").length;
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
      body = MOCK_REPORTS.staff.map(s => [s.name, s.assigned, s.completed, s.pending, s.progress]);
    } else {
      head = [["Complaint ID", "Date", "Category", "Area", "Priority", "Status", "Staff"]];
      body = MOCK_REPORTS.complaints.map(c => [c.id, c.date, c.category, c.area, c.priority, c.status, c.staff]);
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
                  ? MOCK_REPORTS.staff.map((s, i) => (
                      <tr key={i}><td>{s.name}</td><td>{s.assigned}</td><td>{s.completed}</td><td>{s.pending}</td><td><span className="rm-progress">{s.progress}</span></td></tr>
                    ))
                  : MOCK_REPORTS.complaints.map((c, i) => (
                      <tr key={i}><td>{c.id}</td><td>{c.date}</td><td>{c.category}</td><td>{c.area}</td><td><span className={`rm-badge rm-p-${c.priority.toLowerCase()}`}>{c.priority}</span></td><td><span className={`rm-badge rm-s-${c.status.toLowerCase()}`}>{c.status}</span></td></tr>
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