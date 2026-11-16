import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next"; // ✅ ADDED
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import "./ReportsManagement.css";
import { API_BASE_URL, fetchDashboard, getStoredUser, getUserId } from "../utils/dashboardApi";

const ReportsManagement = ({ onBack }) => {
  const { t } = useTranslation(); // ✅ ADDED

  // ✅ Moved inside component to safely use `t` for dynamic titles/descriptions
  const reportTypes = useMemo(() => [
    { id: "daily", title: t('reports.daily_title'), desc: t('reports.daily_desc'), icon: "📊" },
    { id: "weekly", title: t('reports.weekly_title'), desc: t('reports.weekly_desc'), icon: "🗓️" },
    { id: "status", title: t('reports.status_title'), desc: t('reports.status_desc'), icon: "⏳" },
    { id: "category", title: t('reports.category_title'), desc: t('reports.category_desc'), icon: "📁" },
    { id: "staff", title: t('reports.staff_title'), desc: t('reports.staff_desc'), icon: "👷" },
  ], [t]);

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
            staff: complaint.assignedStaff || t('reports.unassigned'),
          })),
          staff,
        });
      })
      .catch((error) => console.error("Failed to load reports:", error));
  }, [t]);

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
    doc.text(t('reports.pdf_title'), 14, 20);
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    const reportTitle = reportTypes.find(r => r.id === type)?.title || t('reports.custom');
    doc.text(`${t('reports.pdf_report_type')}: ${reportTitle}`, 14, 30);
    doc.text(`${t('reports.pdf_generated_on')}: ${new Date().toLocaleDateString()}`, pageWidth - 14, 30, { align: "right" });

    // --- Summary Section ---
    let yPos = 55;
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(t('reports.executive_summary'), 14, yPos);
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

    drawBox(14, yPos, t('reports.total_complaints'), total, { r: 59, g: 130, b: 246 }); // Blue
    drawBox(75, yPos, t('reports.resolved'), resolved, { r: 16, g: 163, b: 74 }); // Green
    drawBox(136, yPos, t('reports.pending'), pending, { r: 217, g: 119, b: 6 }); // Amber
    yPos += 40;

    // --- Table Data Preparation ---
    let head = [];
    let body = [];

    if (type === "staff") {
      head = [[t('reports.staff_name'), t('reports.assigned'), t('reports.completed'), t('reports.pending'), t('reports.progress')]];
      body = reports.staff.map(s => [s.name, s.assigned, s.completed, s.pending, s.progress]);
    } else {
      head = [[t('reports.complaint_id'), t('reports.date'), t('reports.category'), t('reports.area'), t('reports.priority'), t('reports.status'), t('reports.staff')]];
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
      doc.text(`${t('reports.page')} ${i} ${t('reports.of')} ${pageCount} | ${t('reports.footer_text')}`, pageWidth / 2, 285, { align: "center" });
    }

    doc.save(`MyRoad_Report_${type}_${Date.now()}.pdf`);
    showMessage("success", t('reports.msg_pdf_generated'));
  };

  return (
    <div className="rm-shell">
      <div className="rm-header">
        <button className="rm-back-btn" onClick={onBack}>{t('reports.back_to_dashboard')}</button>
        <div>
          <h2>{t('reports.title')}</h2>
          <p>{t('reports.subtitle')}</p>
        </div>
      </div>

      {message.text && <div className={`rm-message ${message.type}`}>{message.text}</div>}

      {/* Report Cards Grid */}
      <div className="rm-grid">
        {reportTypes.map(report => (
          <div key={report.id} className="rm-card" onClick={() => setSelectedReport(report.id)}>
            <div className="rm-card-icon">{report.icon}</div>
            <h3>{report.title}</h3>
            <p>{report.desc}</p>
            <button className="rm-card-btn" onClick={(e) => { e.stopPropagation(); generatePDF(report.id); }}>
              {t('reports.download_pdf')}
            </button>
          </div>
        ))}
      </div>

      {/* Preview Section (Shows what the PDF will look like) */}
      {selectedReport && (
        <div className="rm-preview-section">
          <h3>{t('reports.preview')} {reportTypes.find(r => r.id === selectedReport)?.title}</h3>
          <div className="rm-preview-table">
            <table>
              <thead>
                <tr>
                  {selectedReport === "staff" ? (
                    <>
                      <th>{t('reports.staff_name')}</th>
                      <th>{t('reports.assigned')}</th>
                      <th>{t('reports.completed')}</th>
                      <th>{t('reports.pending')}</th>
                      <th>{t('reports.progress')}</th>
                    </>
                  ) : (
                    <>
                      <th>{t('reports.complaint_id')}</th>
                      <th>{t('reports.date')}</th>
                      <th>{t('reports.category')}</th>
                      <th>{t('reports.area')}</th>
                      <th>{t('reports.priority')}</th>
                      <th>{t('reports.status')}</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {selectedReport === "staff" 
                  ? reports.staff.map((s, i) => (
                      <tr key={i}>
                        <td>{s.name}</td>
                        <td>{s.assigned}</td>
                        <td>{s.completed}</td>
                        <td>{s.pending}</td>
                        <td><span className="rm-progress">{s.progress}</span></td>
                      </tr>
                    ))
                  : reports.complaints.map((c, i) => (
                      <tr key={i}>
                        <td>{c.id}</td>
                        <td>{c.date}</td>
                        <td>{c.category}</td>
                        <td>{c.area}</td>
                        <td><span className={`rm-badge rm-p-${String(c.priority || "normal").toLowerCase()}`}>{c.priority || t('reports.normal')}</span></td>
                        <td><span className={`rm-badge rm-s-${String(c.status || "new").toLowerCase()}`}>{c.status || t('reports.new')}</span></td>
                      </tr>
                    ))
                }
              </tbody>
            </table>
          </div>
          <button className="rm-generate-btn" onClick={() => generatePDF(selectedReport)}>
            {t('reports.generate_download_pdf')}
          </button>
        </div>
      )}
    </div>
  );
};

export default ReportsManagement;