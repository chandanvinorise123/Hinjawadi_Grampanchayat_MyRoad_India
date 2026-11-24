import React, { useState, useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArcElement, BarElement, CategoryScale, Chart as ChartJS, Filler, Legend, LinearScale, LineElement, PointElement, Tooltip,
} from "chart.js";
import { Bar, Doughnut, Line, Pie } from "react-chartjs-2";
import "./admindashboard.css";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";
import marathiTranslations from "../i18n/locales/mr.json";

import AdminProfile from "../adminprofiledashboard/AdminProfile";
import AdminManagement from "../adminprofiledashboard/AdminManagement";
import StaffVerifierProfile from "../adminprofiledashboard/StaffVerifierProfile";
import ComplaintManagement from "../adminprofiledashboard/ComplaintManagement";
import StaffWorkMonitoring from "../adminprofiledashboard/StaffWorkMonitoring";
import ComplaintVerification from "../adminprofiledashboard/ComplaintVerification";
import CompletedWork from "../verifierprofiledashboard/CompletedWork";
import ReportsManagement from "../adminprofiledashboard/ReportsManagement";
import logo from "../assets/logo.jpeg";
import ComplaintDetails from "../adminprofiledashboard/ComplaintDetails";
import VisitorsOverview from "../components/visitoroverview/VisitorsOverview";
import NotificationMonitoring from "../adminprofiledashboard/Notification";
import { API_BASE_URL, fetchDashboard, getStoredUser, getUserId, normalizeStaffOptions, updateDashboardComplaint, toMediaUrl } from "../utils/dashboardApi";
import { getComplaintTableStatus, getComplaintTableStatusTone } from "../utils/complaintTableStatus";
import { isApprovedCompletedWork } from "../utils/completedWork";
import {
  getComplaintMapPinType,
  getComplaintMapMarkerSvg,
  isComplaintAwaitingVerification,
  isComplaintReworkRequested,
} from "../components/maps/complaintMapMarker";
import AdminComplaintsMap from "../components/maps/AdminComplaintsMap";
import { isWithinReportedRange } from "../components/maps/homeComplaintMapFilters";

ChartJS.register(ArcElement, BarElement, CategoryScale, Filler, Legend, LinearScale, LineElement, PointElement, Tooltip);

/* Complaint pipeline status (Keep in English for internal logic) */
const statusOptions = ["New", "Assigned", "Under Verification", "Resolved", "Rejected"];
const matchesMapStatusFilter = (complaint, status) => {
  if (status === "All") return true;
  if (status === "Under Verification") {
    return isComplaintAwaitingVerification(complaint);
  }
  if (status === "Assigned") {
    return getComplaintMapPinType(complaint) === "assigned" &&
      !isComplaintAwaitingVerification(complaint) &&
      !isComplaintReworkRequested(complaint);
  }
  return complaint.status === status;
};
const priorityOptions = ["Critical", "Urgent", "Normal"];
const INITIAL_COMPLAINT_TABLE_ROWS = 5;
const staffVerifierRoles = [
  { value: "verifier", label: "admin_dashboard.role_verifier" },
  { value: "staff", label: "admin_dashboard.role_staff" },
];
const roleTone = { citizen: "navy", staff: "orange", verifier: "amber", admin: "red" };
const mapColors = ["#e07b1c", "#2e6cb0", "#1d8a5c", "#c1900a", "#cf4438", "#7a5c9e"];
const complaintNavKeys = [
  "complaint-management", "new-complaints", "assigned-complaints", "complaint-verification", "completed-work", "complaint-detail",
];

const colorForCategory = (category) => {
  let hash = 0;
  const text = String(category ?? "");
  for (let i = 0; i < text.length; i++) hash = text.charCodeAt(i) + ((hash << 5) - hash);
  return mapColors[Math.abs(hash) % mapColors.length];
};

/* ===================== SHARED HELPERS (module level) ===================== */

/*
  FIX: this used to live INSIDE the component (using `t`), but generateComplaintPdf
  (module level) called it -> ReferenceError. Now it is a pure module-level helper.
  The component wraps it with a translated "pending" label.
*/
const getLocationText = (loc, pendingLabel = "Location pending") => {
  if (!loc) return pendingLabel;
  if (typeof loc === "object") return loc.address || pendingLabel;
  return String(loc);
};

const normalizeId = (doc) => ({ ...doc, id: doc.id || doc._id });
const complaintsAreUnchanged = (current, next) => current.length === next.length && current.every((complaint, index) => String(complaint.id || complaint._id) === String(next[index].id || next[index]._id) && complaint.updatedAt === next[index].updatedAt);
const notificationsAreUnchanged = (current, next) => current.length === next.length && current.every((notification, index) => {
  const refreshed = next[index];
  return notification.id === refreshed.id && notification.type === refreshed.type && notification.text === refreshed.text && notification.complaintId === refreshed.complaintId && notification.complaintNumber === refreshed.complaintNumber && notification.complaintStatus === refreshed.complaintStatus && notification.isRead === refreshed.isRead;
});

const getComplaintDate = (complaint) => {
  const value = complaint.createdAt || complaint.date;
  if (!value) return null;
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
  const parsed = dateOnly ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3])) : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const chartBaseOptions = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { labels: { usePointStyle: true, boxWidth: 8, padding: 18 } }, tooltip: { backgroundColor: "#142d4e", padding: 10, cornerRadius: 8 } },
};

const hasValidMapCoordinates = (complaint) => {
  const latitude = complaint.lat ?? complaint.coordinates?.latitude;
  const longitude = complaint.lng ?? complaint.coordinates?.longitude;
  return latitude !== null && latitude !== undefined && latitude !== "" && longitude !== null && longitude !== undefined && longitude !== "" && Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude)) && Number(latitude) >= -90 && Number(latitude) <= 90 && Number(longitude) >= -180 && Number(longitude) <= 180;
};

const defaultCenter = { lat: 18.5913, lng: 73.7389 };

const getComplaintDisplayStatus = (complaint) => {
  const status = String(complaint.status || "").trim().toLowerCase();
  if (["resolved", "closed"].includes(status)) return "Resolved";
  if (["new", "submitted"].includes(status) && !complaint.assignedStaff && !complaint.assignedStaffId) return "New";
  return "Assigned";
};

export const getComplaintPdfType = (complaint) => {
  if (isComplaintReworkRequested(complaint)) return "rejected";
  if (isComplaintAwaitingVerification(complaint)) return "verification";
  if (["resolved", "closed", "verified", "notified"].includes(
    String(complaint.status || "").trim().toLowerCase()
  )) return "resolved";
  if (getComplaintMapPinType(complaint) === "assigned") return "assigned";
  return "new";
};

/* ===================== PDF HELPERS ===================== */

const getLatestResolutionEntry = (complaint) => {
  const resolutionEntries = (Array.isArray(complaint.statusHistory) ? complaint.statusHistory : [])
    .filter((entry) => ["resolved", "closed"].includes(String(entry.status || "").trim().toLowerCase()))
    .filter((entry) => entry.updatedAt && !Number.isNaN(new Date(entry.updatedAt).getTime()))
    .sort((left, right) => new Date(left.updatedAt).getTime() - new Date(right.updatedAt).getTime());
  const verifiedResolution = [...resolutionEntries].reverse().find((entry) =>
    /\b(admin|verifier)\b/i.test(String(entry.actor || ""))
  );
  return verifiedResolution || resolutionEntries[resolutionEntries.length - 1] || null;
};

const getPhotoPath = (photo) =>
  typeof photo === "string"
    ? photo
    : photo?.url || photo?.path || photo?.imageUrl || "";

const firstPhotoPath = (...photos) =>
  photos.map(getPhotoPath).find(Boolean) || "";

const getComplaintPdfPhotos = (complaint) => {
  const inspection = complaint.inspection || {};
  const photoEntries = [
    ...(Array.isArray(complaint.images) ? complaint.images.map((image, index) => [`Citizen photo ${index + 1}`, getPhotoPath(image)]) : []),
    ...(Array.isArray(complaint.citizenPhotos) ? complaint.citizenPhotos.map((image, index) => [`Citizen photo ${index + 1}`, getPhotoPath(image)]) : []),
    ...(Array.isArray(complaint.photos) ? complaint.photos.map((image, index) => [`Complaint photo ${index + 1}`, getPhotoPath(image)]) : []),
    ...(["before", "site", "after", "verification"].flatMap((key) => (
      getPhotoPath(complaint.photos?.[key])
        ? [[`${key.charAt(0).toUpperCase()}${key.slice(1)} photo`, getPhotoPath(complaint.photos[key])]]
        : []
    ))),
    ["Before / site inspection photo", firstPhotoPath(inspection.sitePhoto, complaint.sitePhoto, complaint.beforePhoto)],
    ["After work photo", firstPhotoPath(inspection.completionPhoto, complaint.completionPhoto, complaint.afterPhoto)],
    ["Verification photo", firstPhotoPath(inspection.verificationPhoto, complaint.verificationPhoto)],
  ];
  const seen = new Set();
  return photoEntries.filter(([, path]) => {
    if (!path || seen.has(path.trim())) return false;
    seen.add(path.trim());
    return true;
  });
};

const loadPdfImageUrl = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Image request failed (${response.status})`);
  const bitmap = await createImageBitmap(await response.blob());
  const maxDimension = 1400;
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) { bitmap.close(); throw new Error("Could not prepare image for the PDF"); }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/png");
};

const loadPdfOpenStreetMap = async (latitude, longitude, width, height, zoom = 14) => {
  const tileSize = 256;
  const worldTileCount = 2 ** zoom;
  const latitudeRadians = (Math.max(-85.05112878, Math.min(85.05112878, latitude)) * Math.PI) / 180;
  const worldSize = tileSize * worldTileCount;
  const centerX = ((longitude + 180) / 360) * worldSize;
  const centerY = ((1 - Math.log(Math.tan(latitudeRadians) + 1 / Math.cos(latitudeRadians)) / Math.PI) / 2) * worldSize;
  const left = centerX - width / 2;
  const top = centerY - height / 2;
  const firstTileX = Math.floor(left / tileSize);
  const lastTileX = Math.floor((left + width - 1) / tileSize);
  const firstTileY = Math.floor(top / tileSize);
  const lastTileY = Math.floor((top + height - 1) / tileSize);
  const tiles = [];
  try {
    for (let tileY = firstTileY; tileY <= lastTileY; tileY += 1) {
      for (let tileX = firstTileX; tileX <= lastTileX; tileX += 1) {
        const wrappedX = ((tileX % worldTileCount) + worldTileCount) % worldTileCount;
        const boundedY = Math.max(0, Math.min(worldTileCount - 1, tileY));
        const response = await fetch(`https://tile.openstreetmap.org/${zoom}/${wrappedX}/${boundedY}.png`, { mode: "cors", cache: "force-cache" });
        if (!response.ok) throw new Error(`OpenStreetMap tile request failed (${response.status})`);
        const bitmap = await createImageBitmap(await response.blob());
        tiles.push({ bitmap, tileX, tileY });
      }
    }
    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not prepare the OpenStreetMap image for the PDF");
    context.scale(scale, scale);
    tiles.forEach(({ bitmap, tileX, tileY }) => {
      context.drawImage(bitmap, tileX * tileSize - left, tileY * tileSize - top, tileSize, tileSize);
    });
    return canvas;
  } finally {
    tiles.forEach(({ bitmap }) => bitmap.close());
  }
};

const loadPdfImage = (path) => loadPdfImageUrl(toMediaUrl(path));

/* ===================== COMPLAINT PDF GENERATOR ===================== */

export const generateComplaintPdf = async (complaint, language, { download = true, type } = {}) => {
  const isMarathi = language === "mr";
  const complaintType = type || getComplaintPdfType(complaint);
  const isNewComplaint = complaintType === "new";
  const isResolvedComplaint = complaintType === "resolved";
  const isAssignedComplaint = complaintType === "assigned";
  const isAwaitingVerificationComplaint = complaintType === "verification";
  const isRejectedComplaint = complaintType === "rejected";
  const usesCompactLayout = true;
  const labels = isMarathi
    ? {
        report: "तक्रार अहवाल",
        workOrder: "संबंधित कंत्राटदाराला कामाचे वाटप",
        workOrderNo: "तक्रार क्रमांक",
        reference: "संदर्भ",
        dateOfIssue: "जारी तारीख",
        complaintDetails: "तक्रारीचा तपशील",
        sitePhoto: "दुरुस्तीपूर्वीचे स्थळ छायाचित्र",
        beforePhoto: "कामापूर्वी / स्थळ छायाचित्र",
        afterPhoto: "कामानंतरचे छायाचित्र",
        complaintId: "तक्रार क्रमांक",
        dateTime: "तारीख व वेळ",
        assignmentDateTime: "नेमणुकीची तारीख व वेळ",
        issueType: "समस्येचा प्रकार",
        severity: "तीव्रता / प्राधान्य",
        locationMap: "ठिकाण नकाशा / GPS पिन",
        streetMapUnavailable: "रस्त्याचा नकाशा उपलब्ध नाही; नकाशा लिंक वापरा.",
        locationCode: "ठिकाण QR कोड",
        scopeOfWork: "कामाचे स्वरूप",
        workStartDeadline: "काम सुरू करण्याची अंतिम मुदत",
        workCompletionTimeline: "काम पूर्ण करण्याची मुदत",
        deliverables: "सादर करावयाचे",
        within24Hours: "२४ तासांच्या आत",
        within3Days: "३ दिवसांत",
        by: "तारीख",
        within24HoursOfAssignment: "नेमणुकीपासून २४ तासांच्या आत",
        within3DaysOfAssignment: "नेमणुकीपासून ३ दिवसांत",
        instructionsTitle: "कंत्राटदारासाठी सूचना",
        instructions: [
          "निश्चित वेळेत नेमलेले काम पूर्ण करा.",
          "गुणवत्ता व रस्ता-सुरक्षा मानकांचे पालन करा.",
          "गरजेनुसार वाहतुकीसाठी अडथळे व सूचना फलक लावा.",
          "काम पूर्ण अहवालासह दिनांक व ठिकाण असलेली फोटो सादर करा.",
        ],
        acceptedBy: "स्वीकारले",
        authorizedSignatory: "अधिकृत स्वाक्षरी",
        completionConfirmation: "काम पूर्ण झाल्याची पुष्टी",
        signatureAndDate: "स्वाक्षरी व तारीख",
        notAttached: "स्थळाचे छायाचित्र उपलब्ध नाही",
        openMap: "नकाशावर ठिकाण उघडा",
        complaintImage: "तक्रारीचे छायाचित्र",
        priority: "प्राधान्य",
        scanQRCode: "तक्रार व ठिकाणासाठी स्कॅन करा",
        panchayat: "ग्रामपंचायत हिंजवडी",
        location: "ठिकाण",
        status: "स्थिती",
        coordinates: "GPS निर्देशांक",
        landmark: "जवळची खूण",
        assignment: "कामाचे वाटप",
        assignedTo: "नेमलेले कर्मचारी / कंत्राटदार",
        issuedBy: "जारीकर्ता",
        approved: "मंजूर",
        notProvided: "माहिती उपलब्ध नाही",
        notAssigned: "नेमलेले नाही",
        locationPending: "ठिकाण प्रलंबित",
        priorityValues: { Critical: "उच्च", Urgent: "तातडीचे", Normal: "सामान्य" },
      }
    : {
        report: "COMPLAINT REPORT",
        workOrder: "WORK ASSIGNMENT TO CONCERN CONTRACTOR",
        workOrderNo: "Complaint number",
        reference: "Reference",
        dateOfIssue: "Date of issue",
        complaintDetails: "COMPLAINT DETAILS",
        sitePhoto: "SITE PHOTOGRAPH — BEFORE REPAIR",
        beforePhoto: "BEFORE / SITE PHOTO",
        afterPhoto: "AFTER WORK PHOTO",
        complaintId: "Complaint ID",
        dateTime: "Complaint date & time",
        assignmentDateTime: "Assignment date & time",
        issueType: "Issue type",
        severity: "Severity / Priority",
        locationMap: "LOCATION MAP / GPS PIN",
        streetMapUnavailable: "Street map unavailable; use the map link.",
        locationCode: "LOCATION QR CODE",
        scopeOfWork: "Scope of work",
        workStartDeadline: "Work start deadline",
        workCompletionTimeline: "Work completion timeline",
        deliverables: "Deliverables",
        within24Hours: "Within 24 hours",
        within3Days: "Within 3 days",
        by: "by",
        within24HoursOfAssignment: "Within 24 hours of assignment",
        within3DaysOfAssignment: "Within 3 days of assignment",
        instructionsTitle: "INSTRUCTIONS TO CONTRACTOR",
        instructions: [
          "Complete the assigned repair within the stated timeline.",
          "Maintain quality and follow applicable road-safety standards.",
          "Use barricades and signage where needed for traffic safety.",
          "Submit geo-tagged before/after photos with the completion report.",
        ],
        acceptedBy: "ACCEPTED BY (CONTRACTOR)",
        authorizedSignatory: "Authorized signatory",
        completionConfirmation: "WORK COMPLETION CONFIRMATION",
        signatureAndDate: "Signature & Date",
        notAttached: "No site photograph attached",
        openMap: "Open location in Google Maps",
        complaintImage: "Complaint Image",
        priority: "Priority",
        scanQRCode: "Scan for complaint and location",
        panchayat: "GRAM PANCHAYAT HINJAWADI",
        location: "Location",
        status: "Status",
        coordinates: "GPS coordinates",
        landmark: "Nearby landmark",
        assignment: "WORK ASSIGNMENT",
        assignedTo: "Assigned staff / contractor",
        issuedBy: "Issued by",
        approved: "APPROVED",
        notProvided: "Not provided",
        notAssigned: "Not assigned",
        locationPending: "Location pending",
        priorityValues: { Critical: "HIGH", Urgent: "URGENT", Normal: "NORMAL" },
      };

  if (isNewComplaint) {
    Object.assign(
      labels,
      isMarathi
        ? {
            report: "नवीन तक्रार अहवाल",
            workOrder: "नवीन तक्रार",
            workOrderNo: "तक्रार क्रमांक",
            dateOfIssue: "नोंदणी तारीख व वेळ",
            sitePhoto: "तक्रारीचे छायाचित्र",
            status: "तक्रार स्थिती",
            scopeOfWork: "तक्रारीचा तपशील",
            workStartDeadline: "पडताळणी स्थिती",
            workCompletionTimeline: "वाटप स्थिती",
            deliverables: "पुढील कार्यवाही",
            instructionsTitle: "तक्रारदारासाठी माहिती",
            instructions: [
              "तक्रार यशस्वीरित्या नोंदवली आहे; पुढील संदर्भासाठी क्रमांक जतन करा.",
              "ग्रामपंचायत पथक तक्रार आणि ठिकाणाची पडताळणी करेल.",
              "पडताळणीनंतर तक्रार संबंधित कर्मचाऱ्याला नेमली जाईल.",
              "तक्रारीचे तपशील आणि ठिकाण नकाशावर पाहण्यासाठी QR कोड स्कॅन करा.",
            ],
            acceptedBy: "नेमलेले कर्मचारी / व्यक्ती",
            authorizedSignatory: "पडताळणी व कर्मचारी नेमणूक",
            completionConfirmation: "सध्याची स्थिती",
            signatureAndDate: "नोंदणी तारीख",
            assignment: "तक्रार नोंदणी",
            assignedTo: "नेमलेले कर्मचारी / व्यक्ती",
            approved: "प्राप्त",
            notAssigned: "नेमलेले नाही",
            newStatus: "नवीन — पडताळणी प्रलंबित",
            reviewStatus: "ग्रामपंचायत पडताळणी प्रलंबित",
            pendingAssignment: "पडताळणीनंतर कर्मचारी नेमले जातील",
            nextStep: "तक्रार आणि ठिकाणाची पडताळणी करून कर्मचारी नेमणे",
            registered: "नोंदणी",
          }
        : {
            report: "NEW COMPLAINT REPORT",
            workOrder: "NEW COMPLAINT",
            workOrderNo: "Complaint number",
            dateOfIssue: "Registration date & time",
            sitePhoto: "COMPLAINT PHOTOGRAPH",
            status: "Complaint status",
            scopeOfWork: "Complaint details",
            workStartDeadline: "Review status",
            workCompletionTimeline: "Assignment status",
            deliverables: "Next action",
            instructionsTitle: "INFORMATION FOR COMPLAINANT",
            instructions: [
              "Your complaint has been registered. Keep its number for future reference.",
              "The Gram Panchayat team will verify the reported issue and location.",
              "The complaint will be assigned to the responsible staff after review.",
              "Scan the QR code to view the complaint details and location map.",
            ],
            acceptedBy: "ASSIGNED STAFF / PERSON",
            authorizedSignatory: "Review and assign staff",
            completionConfirmation: "CURRENT STATUS",
            signatureAndDate: "Registered",
            assignment: "COMPLAINT REGISTRATION",
            assignedTo: "Assigned staff / person",
            approved: "RECEIVED",
            notAssigned: "Not assigned",
            newStatus: "NEW — REVIEW PENDING",
            reviewStatus: "Pending Gram Panchayat review",
            pendingAssignment: "Staff assignment follows review",
            nextStep: "Verify complaint and location, then assign staff",
            registered: "Registered",
          }
    );
  }

  if (isResolvedComplaint) {
    Object.assign(
      labels,
      isMarathi
        ? {
            report: "निराकरण झालेल्या तक्रारीचा अहवाल",
            workOrder: "कामाची पडताळणी व तक्रार निराकरण",
            workOrderNo: "तक्रार क्रमांक",
            dateOfIssue: "निराकरण तारीख",
            sitePhoto: "कामापूर्वी व कामानंतरचे फोटो",
            notAttached: "छायाचित्र उपलब्ध नाही",
            status: "निराकरण स्थिती",
            scopeOfWork: "पूर्ण केलेले काम",
            workStartDeadline: "काम पूर्ण तारीख",
            workCompletionTimeline: "पडताळणी करणारे",
            deliverables: "अंतिम स्थिती",
            instructionsTitle: "पडताळणी व निराकरण",
            instructions: [
              "कर्मचाऱ्याने सादर केलेल्या कामाची पडताळणी करून तक्रार निराकरण केली आहे.",
              "कामापूर्वीचा आणि कामानंतरचा फोटो उपलब्ध असल्यास येथे दाखवला आहे.",
              "निराकरणाची वेळ प्रशासक किंवा पडताळणीकर्त्याच्या स्थिती नोंदीवरून घेतली आहे.",
              "ठिकाण नकाशावर उघडण्यासाठी नकाशा लिंक किंवा QR कोड वापरा.",
            ],
            acceptedBy: "काम पूर्ण करणारे",
            authorizedSignatory: "कामाची पडताळणी पूर्ण",
            completionConfirmation: "पडताळणी व निराकरण",
            signatureAndDate: "निराकरण तारीख",
            assignment: "निराकरण तपशील",
            assignedTo: "नेमलेले कर्मचारी / कंत्राटदार",
            approved: "निराकरण",
            notAssigned: "माहिती उपलब्ध नाही",
            resolvedStatus: "निराकरण व पडताळणी पूर्ण",
            resolvedBy: "निराकरण मंजूर करणारे",
            beforePhoto: "कामापूर्वी",
            afterPhoto: "कामानंतर",
          }
        : {
            report: "RESOLVED COMPLAINT REPORT",
            workOrder: "WORK VERIFICATION & COMPLAINT RESOLUTION",
            workOrderNo: "Complaint number",
            dateOfIssue: "Resolved on",
            sitePhoto: "BEFORE & AFTER WORK PHOTOS",
            notAttached: "Photo not available",
            status: "Resolution status",
            scopeOfWork: "Work completed",
            workStartDeadline: "Work completed on",
            workCompletionTimeline: "Verified by",
            deliverables: "Final status",
            instructionsTitle: "VERIFICATION & RESOLUTION",
            instructions: [
              "The submitted work was reviewed before the complaint was resolved.",
              "Before and after work photos are shown when available.",
              "Resolution time is taken from the Admin or Verifier status history.",
              "Use the map link or QR code to open the complaint location.",
            ],
            acceptedBy: "COMPLETED BY",
            authorizedSignatory: "Work verification complete",
            completionConfirmation: "VERIFIED & RESOLVED",
            signatureAndDate: "Resolved",
            assignment: "RESOLUTION DETAILS",
            assignedTo: "Assigned staff / contractor",
            approved: "RESOLVED",
            notAssigned: "Not provided",
            resolvedStatus: "RESOLVED & VERIFIED",
            resolvedBy: "Resolution approved by",
            beforePhoto: "BEFORE",
            afterPhoto: "AFTER",
          }
    );
  }

  if (isAssignedComplaint) {
    Object.assign(
      labels,
      isMarathi
        ? {
            report: "नेमून दिलेल्या तक्रारीचा अहवाल",
            workOrder: "तक्रार कामासाठी नेमण्यात आली",
            dateOfIssue: "नेमणूक तारीख व वेळ",
            status: "नेमणूक स्थिती",
            scopeOfWork: "कामाचे स्वरूप",
            workStartDeadline: "काम सुरू करण्याची अंतिम मुदत",
            workCompletionTimeline: "काम पूर्ण करण्याची मुदत",
            deliverables: "सादर करावयाचे",
            assignment: "कामाचे नेमणूक तपशील",
            assignedStatus: "कर्मचारी / कंत्राटदार यांना नेमले",
          }
        : {
            report: "ASSIGNED COMPLAINT REPORT",
            workOrder: "COMPLAINT ASSIGNMENT",
            dateOfIssue: "Assignment date & time",
            status: "Assignment status",
            scopeOfWork: "Scope of work",
            workStartDeadline: "Work start deadline",
            workCompletionTimeline: "Work completion deadline",
            deliverables: "Deliverables",
            assignment: "ASSIGNMENT DETAILS",
            assignedStatus: "ASSIGNED TO STAFF / CONTRACTOR",
          }
    );
  }

  if (isAwaitingVerificationComplaint) {
    Object.assign(
      labels,
      isMarathi
        ? {
            report: "पडताळणी प्रलंबित तक्रार अहवाल",
            workOrder: "काम पूर्ण; पडताळणी प्रलंबित",
            dateOfIssue: "पडताळणीसाठी पाठवण्याची तारीख",
            status: "पडताळणी स्थिती",
            scopeOfWork: "सादर केलेले काम",
            workStartDeadline: "काम पूर्ण तारीख",
            workCompletionTimeline: "पडताळणीकर्ता",
            deliverables: "अंतिम निर्णय",
            instructionsTitle: "पडताळणीसाठी माहिती",
            instructions: [
              "कर्मचाऱ्याने काम पूर्ण म्हणून अहवाल सादर केला आहे.",
              "कामापूर्वीचे व कामानंतरचे छायाचित्र पडताळणीसाठी उपलब्ध आहेत.",
              "पडताळणीनंतर तक्रार निराकरण किंवा सुधारित कामासाठी परत पाठवली जाईल.",
              "ठिकाण व तक्रार तपशील QR कोडवरून पाहता येतील.",
            ],
            assignment: "पडताळणी तपशील",
            verificationStatus: "पडताळणी प्रलंबित",
            approved: "पडताळणीसाठी पाठवले",
          }
        : {
            report: "AWAITING VERIFICATION REPORT",
            workOrder: "WORK COMPLETED — VERIFICATION PENDING",
            dateOfIssue: "Submitted for verification",
            status: "Verification status",
            scopeOfWork: "Submitted work",
            workStartDeadline: "Work completed on",
            workCompletionTimeline: "Verifier",
            deliverables: "Final decision",
            instructionsTitle: "VERIFICATION INFORMATION",
            instructions: [
              "The staff member has submitted the work as completed.",
              "Before and after photographs are available for verification.",
              "After verification, the complaint will be resolved or returned for correction.",
              "The QR code provides the complaint and location details.",
            ],
            assignment: "VERIFICATION DETAILS",
            verificationStatus: "AWAITING VERIFICATION",
            approved: "SUBMITTED",
          }
    );
  }

  if (isRejectedComplaint) {
    Object.assign(
      labels,
      isMarathi
        ? {
            report: "पडताळणीत नाकारलेली तक्रार",
            workOrder: "सुधारित कामासाठी परत पाठवले",
            dateOfIssue: "नाकारण्याची तारीख",
            status: "अहवाल स्थिती",
            scopeOfWork: "सुधारणा आवश्यक",
            workStartDeadline: "सुधारण्याची अंतिम मुदत",
            workCompletionTimeline: "पुन्हा पडताळणी",
            deliverables: "सुधारित काम सादर करा",
            instructionsTitle: "सुधारण्यासाठी सूचना",
            instructions: [
              "पडताळणीकर्त्याने सादर केलेले काम पूर्ण मानले नाही.",
              "विशिष्ट सुधारणा करून काम पुन्हा सादर करा.",
              "सुधारित कामाचे छायाचित्र व स्थान तपशील स्पष्ट असावेत.",
              "पुनर्पडताळणीनंतरच तक्रार निराकरण केली जाईल.",
            ],
            assignment: "सुधारणा तपशील",
            rejectedStatus: "नाकारले — सुधारणा आवश्यक",
            approved: "पुन्हा पडताळणी",
          }
        : {
            report: "REJECTED COMPLAINT REPORT",
            workOrder: "WORK RETURNED FOR CORRECTION",
            dateOfIssue: "Rejected on",
            status: "Review status",
            scopeOfWork: "Correction required",
            workStartDeadline: "Correction deadline",
            workCompletionTimeline: "Re-verification",
            deliverables: "Submit corrected work",
            instructionsTitle: "CORRECTION INSTRUCTIONS",
            instructions: [
              "The submitted work was not accepted during verification.",
              "Complete the required correction and resubmit the work.",
              "Provide clear photographs and accurate location details.",
              "The complaint is resolved only after successful re-verification.",
            ],
            assignment: "CORRECTION DETAILS",
            rejectedStatus: "REJECTED — CORRECTION REQUIRED",
            approved: "RE-VERIFY",
          }
    );
  }

  const canvas = document.createElement("canvas");
  const scale = 2;
  const canvasWidth = 794;
  const canvasHeight = 1123;
  canvas.width = canvasWidth * scale;
  canvas.height = canvasHeight * scale;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not prepare the complaint PDF");
  context.scale(scale, scale);

  const navy = "#173653";
  const green = "#176b43";
  const ink = "#263746";
  const muted = "#607184";
  const border = "#d6dee6";
  const t = (value) => String(value ?? "").trim() || labels.notProvided;
  const translatePdfIssueValue = (value) => {
    const text = String(value ?? "").trim();
    return isMarathi ? marathiTranslations[text] || text : text;
  };
  const formatPdfDateTime = (value, includeTime = true) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return labels.notProvided;
    const isDateOnly = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
    const formattedDateTime = new Intl.DateTimeFormat(isMarathi ? "mr-IN" : "en-IN", {
      dateStyle: "medium",
      ...(!isDateOnly && includeTime ? { timeStyle: "short" } : {}),
      timeZone: "Asia/Kolkata",
    }).format(date);
    return isMarathi
      ? formattedDateTime.replace(/, ([^, ]+) (AM|PM)$/i, (_, time, period) =>
          `, ${period.toUpperCase() === "PM" ? "दुपारी" : "सकाळी"} ${time}`
        )
      : formattedDateTime;
  };
  const drawText = (value, x, y, font, color = ink, align = "left") => {
    context.font = font;
    context.fillStyle = color;
    context.textAlign = align;
    context.fillText(String(value), x, y);
  };
  const getWrappedTextLines = (value, maxWidth, maxLines, font) => {
    context.font = font;
    const words = String(value).split(/\s+/).filter(Boolean);
    const lines = [];
    let line = "";
    words.forEach((word) => {
      const candidate = line ? `${line} ${word}` : word;
      if (line && context.measureText(candidate).width > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    });
    if (line) lines.push(line);
    if (lines.length > maxLines) {
      lines.length = maxLines;
      let lastLine = lines[maxLines - 1];
      while (lastLine && context.measureText(`${lastLine}…`).width > maxWidth) {
        lastLine = lastLine.slice(0, -1);
      }
      lines[maxLines - 1] = `${lastLine.trimEnd()}…`;
    }
    return lines;
  };
  const drawWrappedText = (value, x, y, maxWidth, lineHeight, maxLines, font, color = ink) => {
    context.font = font;
    context.fillStyle = color;
    context.textAlign = "left";
    const lines = getWrappedTextLines(value, maxWidth, maxLines, font);
    lines.forEach((text, index) => context.fillText(text, x, y + index * lineHeight));
  };
  const drawCenteredWrappedText = (value, x, y, width, height, lineHeight, maxLines, font, color = ink) => {
    context.font = font;
    context.fillStyle = color;
    context.textAlign = "center";
    const lines = getWrappedTextLines(value, width, maxLines, font);
    const firstBaseline = y + (height - lines.length * lineHeight) / 2 + lineHeight - 2;
    lines.forEach((text, index) => context.fillText(text, x + width / 2, firstBaseline + index * lineHeight));
  };
  const loadImageElement = (src, errorMessage) => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(errorMessage));
    image.src = src;
  });

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvasWidth, canvasHeight);
  context.fillStyle = "#e67e22";
  context.fillRect(0, 0, canvasWidth, 10);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 10, canvasWidth, 4);
  context.fillStyle = green;
  context.fillRect(0, 14, canvasWidth, 5);

  let photoImage = null;
  let workPhotoCards = [];
  let photoStatus = "missing";
  if (!isNewComplaint) {
    const inspection = complaint.inspection || {};
    const photoRecord = complaint.photos && typeof complaint.photos === "object" && !Array.isArray(complaint.photos)
      ? complaint.photos
      : {};
    const storedBeforeImages = [
      ...(Array.isArray(complaint.images) ? complaint.images : []),
      ...(Array.isArray(complaint.citizenPhotos) ? complaint.citizenPhotos : []),
      ...(Array.isArray(complaint.photos) ? complaint.photos : []),
      photoRecord.before,
      photoRecord.site,
    ].map(getPhotoPath).filter(Boolean);
    const storedAfterImages = [
      photoRecord.after,
      photoRecord.completion,
      photoRecord.verification,
      complaint.completionPhoto,
      complaint.afterPhoto,
      complaint.verificationPhoto,
      inspection.completionPhoto,
      inspection.verificationPhoto,
    ].map(getPhotoPath).filter(Boolean);
    const photoEntries = [
      {
        label: labels.beforePhoto,
        paths: [
          inspection.sitePhoto,
          complaint.sitePhoto,
          photoRecord.before,
          photoRecord.site,
          complaint.beforePhoto,
          ...storedBeforeImages,
        ],
      },
      {
        label: labels.afterPhoto,
        paths: [
          inspection.completionPhoto,
          complaint.completionPhoto,
          photoRecord.after,
          complaint.afterPhoto,
          ...storedAfterImages,
        ],
      },
    ];
    workPhotoCards = await Promise.all(photoEntries.map(async ({ label, paths }) => {
      const candidates = [...new Set(paths.map(getPhotoPath).filter(Boolean))];
      if (candidates.length === 0) return { label, image: null, hasPath: false };
      let lastError = null;
      for (const path of candidates) {
        try {
          const photoData = await loadPdfImage(path);
          const image = await loadImageElement(photoData, "Could not decode the complaint photo");
          return { label, image, hasPath: true };
        } catch (error) {
          lastError = error;
        }
      }
      console.error(`Could not load any available ${label.toLowerCase()} photo for the complaint PDF:`, lastError);
      return { label, image: null, hasPath: true };
    }));
    const loadedPhotos = workPhotoCards.filter((photo) => photo.image).length;
    const availablePhotos = workPhotoCards.filter((photo) => photo.hasPath).length;
    photoStatus = isResolvedComplaint
      ? loadedPhotos === 2
        ? "included"
        : loadedPhotos === 1
          ? "partial"
          : availablePhotos > 0
            ? "failed"
            : "missing"
      : availablePhotos === 0
        ? "missing"
        : loadedPhotos === availablePhotos
          ? "included"
          : loadedPhotos > 0
            ? "partial"
            : "failed";
  } else {
    const photoEntries = getComplaintPdfPhotos(complaint);
    photoStatus = photoEntries.length > 0 ? "failed" : "missing";
    let lastError = null;
    let lastFailedPhotoLabel = "";
    for (const [label, path] of photoEntries) {
      try {
        const photoData = await loadPdfImage(path);
        photoImage = await loadImageElement(photoData, "Could not decode the complaint photo");
        photoStatus = "included";
        break;
      } catch (error) {
        lastError = error;
        lastFailedPhotoLabel = label;
      }
    }
    if (photoStatus === "failed" && lastError) {
      console.error(`Could not load any available complaint photo for the PDF; last source tried: "${lastFailedPhotoLabel}".`, lastError);
    }
  }

  const resolvedStatusEntry = isResolvedComplaint ? getLatestResolutionEntry(complaint) : null;
  const issueDateCandidates = isNewComplaint
    ? [complaint.createdAt, complaint.date]
    : isResolvedComplaint
      ? [
          resolvedStatusEntry?.updatedAt,
          complaint.updatedAt,
          complaint.inspection?.completionDate,
          complaint.completionDate,
          complaint.date,
          complaint.createdAt,
        ]
      : [
          ...(Array.isArray(complaint.statusHistory)
            ? [...complaint.statusHistory]
                .reverse()
                .filter((entry) => {
                  const status = String(entry.status || "").trim().toLowerCase();
                  return isAwaitingVerificationComplaint
                    ? ["under verification", "work completed", "completed work", "awaiting verification"].includes(status)
                    : isRejectedComplaint
                      ? ["rejected", "sent back for action", "rework requested"].includes(status)
                      : true;
                })
                .map((entry) => entry.updatedAt)
            : []),
          complaint.updatedAt,
          complaint.createdAt,
          complaint.date,
        ];
  const issueDateValue = issueDateCandidates.find(
    (value) => value && !Number.isNaN(new Date(value).getTime())
  );
  const issueDate = issueDateValue ? formatPdfDateTime(issueDateValue) : labels.notProvided;
  const resolutionActor = String(resolvedStatusEntry?.actor || "");
  const resolvedBy = /\b(admin|verifier)\b/i.test(resolutionActor)
    ? resolutionActor
    : complaint.assignedVerifier || labels.notProvided;
  const completionDateValue = complaint.inspection?.completionDate || complaint.completionDate;
  const completionDate = completionDateValue
    ? formatPdfDateTime(completionDateValue)
    : labels.notProvided;
  const logoData = await loadPdfImageUrl(logo);
  const logoImage = await loadImageElement(logoData, "Could not load the MyRoad India logo");
  const logoBounds = { x: 42, y: 38, width: 92, height: 92 };
  context.drawImage(logoImage, logoBounds.x, logoBounds.y, logoBounds.width, logoBounds.height);

  drawText(labels.panchayat, 151, 77, "bold 24px Arial", navy);
  drawText(
    isMarathi ? "MyRoad India · हिंजवडी, पुणे" : "MyRoad India · Hinjawadi, Pune",
    151,
    106,
    "16px Arial",
    muted
  );
  context.fillStyle = "#f4f7fa";
  context.strokeStyle = border;
  context.fillRect(575, 42, 177, 88);
  context.strokeRect(575, 42, 177, 88);
  if (usesCompactLayout) {
    drawWrappedText(issueDate, 590, 61, 147, 11, 1, "9px Arial", muted);
    drawWrappedText(
      t(translatePdfIssueValue(
        isNewComplaint
          ? complaint.issueType || complaint.issue || complaint.category
          : complaint.category || complaint.issueType || complaint.issue
      )),
      590,
      83,
      147,
      14,
      2,
      "bold 12px Arial",
      navy
    );
    drawText(labels.report, 590, 116, "bold 9px Arial", navy);
  } else {
    const issueTitle = t(translatePdfIssueValue(complaint.issue || complaint.category));
    drawWrappedText(
      `${issueTitle} ${labels.report}`,
      590,
      78,
      147,
      22,
      2,
      "bold 14px Arial",
      navy
    );
  }

  context.fillStyle = navy;
  context.fillRect(42, 153, 710, 36);
  drawText(labels.workOrder, 397, 177, "bold 16px Arial", "#ffffff", "center");

  const complaintNo = t(complaint.complaintNumber || complaint.id || complaint._id);
  const displayComplaintNo = isMarathi
    ? complaintNo.replace(/\d/g, (digit) => "०१२३४५६७८९"[Number(digit)])
    : complaintNo;
  const issuedDate = formatPdfDateTime(new Date(), false);
  const assignmentLogTimestamp = (Array.isArray(complaint.activityLog) ? complaint.activityLog : [])
    .filter((entry) => /^Assigned staff member\b/i.test(String(entry.message || "")))
    .map((entry) => new Date(entry.createdAt).getTime())
    .filter(Number.isFinite)
    .sort((left, right) => right - left)[0];
  const fallbackAssignmentDate = [complaint.assignedDate, complaint.inspection?.assignedDate].find((value) =>
    value &&
    !(typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) &&
    !Number.isNaN(new Date(value).getTime())
  );
  const assignmentDateValue = assignmentLogTimestamp || fallbackAssignmentDate;
  const assignmentDate = assignmentDateValue ? new Date(assignmentDateValue) : null;
  const validAssignmentDate = assignmentDate && !Number.isNaN(assignmentDate.getTime()) ? assignmentDate : null;
  const assignmentDateTime = validAssignmentDate
    ? formatPdfDateTime(validAssignmentDate)
    : labels.notProvided;
  const formatDeadline = (hours) => {
    if (!validAssignmentDate) {
      return hours === 24 ? labels.within24HoursOfAssignment : labels.within3DaysOfAssignment;
    }
    const deadline = new Date(validAssignmentDate.getTime() + hours * 60 * 60 * 1000);
    const deadlineText = formatPdfDateTime(deadline);
    return `${hours === 24 ? labels.within24Hours : labels.within3Days} (${labels.by} ${deadlineText})`;
  };
  const deliverables = isMarathi
    ? "दुरुस्तीपूर्व व दुरुस्तीनंतरचे दिनांक/ठिकाणासह फोटो आणि काम पूर्ण अहवाल."
    : "Pre- and post-repair photos with date/location and a work completion report.";

  const drawMetaCell = (label, value, x, y, width) => {
    context.strokeStyle = border;
    context.strokeRect(x, y, width, 27);
    const labelText = `${label}:`;
    context.font = "bold 11px Arial";
    const valueOffset = x + 7 + context.measureText(labelText).width + 6;
    drawText(labelText, x + 7, y + 18, "bold 11px Arial", ink);
    drawText(value, valueOffset, y + 18, "11px Arial", ink);
  };
  if (isNewComplaint) {
    const drawRegistrationMetaCell = (label, value, x, valueOffset) => {
      context.strokeStyle = border;
      context.strokeRect(x, 189, 355, 27);
      const labelText = `${label}:`;
      context.font = "bold 11px Arial";
      const localizedValueOffset = x + 7 + context.measureText(labelText).width + 6;
      drawText(labelText, x + 7, 207, "bold 11px Arial", ink);
      drawText(value, isMarathi ? localizedValueOffset : x + valueOffset, 207, "11px Arial", ink);
    };
    drawRegistrationMetaCell(labels.workOrderNo, displayComplaintNo, 42, 112);
    drawRegistrationMetaCell(labels.dateOfIssue, issueDate, 397, isMarathi ? 119 : 138);
  } else {
    drawMetaCell(labels.workOrderNo, displayComplaintNo, 42, 189, 355);
    drawMetaCell(
      labels.dateOfIssue,
      issueDate,
      397,
      189,
      355
    );
  }

  const locationValue = getLocationText(complaint.location);
  const categoryValue = [complaint.category, complaint.issue || complaint.issueType]
    .filter(Boolean)
    .map(translatePdfIssueValue)
    .join(" · ");
  const coordinates = complaint.coordinates || {};
  const latitude = complaint.lat ?? coordinates.latitude;
  const longitude = complaint.lng ?? coordinates.longitude;
  const coordinateText = hasValidMapCoordinates(complaint)
    ? `${Number(latitude).toFixed(6)}, ${Number(longitude).toFixed(6)}`
    : labels.notProvided;
  const displayLocation = locationValue === "Location pending" ? labels.locationPending : t(locationValue);
  const landmark = typeof complaint.landmark === "string" ? complaint.landmark.trim() : "";
  const landmarkValue = t(landmark);
  const priorityText = labels.priorityValues[complaint.priority] || t(complaint.priority);
  const mapQuery = hasValidMapCoordinates(complaint)
    ? `${latitude},${longitude}`
    : locationValue !== "Location pending"
      ? locationValue
      : "";
  const mapsUrl = mapQuery
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`
    : "";
  const publicAppUrl = import.meta.env.VITE_PUBLIC_APP_URL?.trim();
  const appBaseUrl = new URL(
    import.meta.env.BASE_URL,
    publicAppUrl
      ? `${publicAppUrl.replace(/\/+$/, "")}/`
      : window.location.origin
  );
  const pdfViewerUrl = new URL(`complaint-pdf/${encodeURIComponent(complaintNo)}`, appBaseUrl);
  pdfViewerUrl.searchParams.set("language", language);
  const qrPayload = [pdfViewerUrl.toString(), mapsUrl].filter(Boolean).join("\n");
  const qrData = await QRCode.toDataURL(qrPayload, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 256,
  });
  const qrImage = await loadImageElement(qrData, "Could not prepare the complaint QR code");

  const detailHeaderY = 222;
  const detailHeaderHeight = 24;
  context.fillStyle = navy;
  context.fillRect(42, detailHeaderY, 356, detailHeaderHeight);
  context.fillRect(406, detailHeaderY, 346, detailHeaderHeight);
  drawText(labels.complaintDetails, 50, detailHeaderY + 17, "bold 12px Arial", "#ffffff");
  drawText(labels.sitePhoto, 414, detailHeaderY + 17, "bold 12px Arial", "#ffffff");

  const drawDetailRow = (label, value, y, height, maxLines = 1) => {
    const x = 42;
    const width = 356;
    const labelWidth = 128;
    context.strokeStyle = border;
    context.strokeRect(x, y, width, height);
    context.beginPath();
    context.moveTo(x + labelWidth, y);
    context.lineTo(x + labelWidth, y + height);
    context.stroke();
    if (usesCompactLayout) {
      drawCenteredWrappedText(label, x + 6, y, labelWidth - 12, height, 14, 2, "bold 11px Arial", ink);
      drawCenteredWrappedText(value, x + labelWidth + 7, y, width - labelWidth - 13, height, 14, maxLines, "11px Arial", ink);
    } else {
      drawWrappedText(label, x + 6, y + 17, labelWidth - 12, 14, 2, "bold 11px Arial", ink);
      drawWrappedText(value, x + labelWidth + 7, y + 17, width - labelWidth - 13, 14, maxLines, "11px Arial", ink);
    }
  };
  const detailRows = isNewComplaint
    ? [
        [labels.location, displayLocation, 40, 2],
        [labels.issueType, t(categoryValue), 40, 2],
        [labels.severity, priorityText, 34, 1],
        [labels.status, labels.newStatus, 34, 1],
      ]
    : [
        [labels.location, displayLocation, 40, 2],
        [labels.issueType, t(categoryValue), 34, 2],
        [labels.severity, priorityText, 29, 1],
        [
          labels.status,
          isResolvedComplaint
            ? labels.resolvedStatus
            : isAwaitingVerificationComplaint
              ? labels.verificationStatus
              : isRejectedComplaint
                ? labels.rejectedStatus
                : labels.assignedStatus,
          29,
          1,
        ],
      ];
  let detailY = detailHeaderY + detailHeaderHeight;
  detailRows.forEach(([label, value, height, maxLines]) => {
    drawDetailRow(label, value, detailY, height, maxLines);
    detailY += height;
  });

  const detailRowsHeight = detailRows.reduce((height, row) => height + row[2], 0);
  const photoBounds = {
    x: 406,
    y: detailHeaderY + detailHeaderHeight,
    width: 346,
    height: usesCompactLayout ? detailRowsHeight : 204,
  };
  context.fillStyle = "#f3f6f8";
  context.fillRect(photoBounds.x, photoBounds.y, photoBounds.width, photoBounds.height);
  context.strokeStyle = border;
  context.strokeRect(photoBounds.x, photoBounds.y, photoBounds.width, photoBounds.height);
  if (!isNewComplaint) {
    const photoGap = 6;
    const photoColumnWidth = (photoBounds.width - photoGap) / 2;
    workPhotoCards.forEach((photo, index) => {
      const x = photoBounds.x + index * (photoColumnWidth + photoGap);
      context.fillStyle = "#ffffff";
      context.fillRect(x, photoBounds.y, photoColumnWidth, photoBounds.height);
      context.strokeStyle = border;
      context.strokeRect(x, photoBounds.y, photoColumnWidth, photoBounds.height);
      context.fillStyle = navy;
      context.fillRect(x, photoBounds.y, photoColumnWidth, 20);
      drawText(photo.label, x + photoColumnWidth / 2, photoBounds.y + 14, "bold 9px Arial", "#ffffff", "center");
      if (photo.image) {
        const imageMaxWidth = photoColumnWidth - 8;
        const imageMaxHeight = photoBounds.height - 28;
        const imageScale = Math.min(
          imageMaxWidth / photo.image.width,
          imageMaxHeight / photo.image.height
        );
        const imageWidth = photo.image.width * imageScale;
        const imageHeight = photo.image.height * imageScale;
        context.drawImage(
          photo.image,
          x + (photoColumnWidth - imageWidth) / 2,
          photoBounds.y + 22 + (imageMaxHeight - imageHeight) / 2,
          imageWidth,
          imageHeight
        );
      } else {
        drawWrappedText(
          labels.notAttached,
          x + 8,
          photoBounds.y + 100,
          photoColumnWidth - 16,
          14,
          2,
          "10px Arial",
          muted
        );
      }
    });
  } else if (photoImage) {
    const imageScale = Math.max(photoBounds.width / photoImage.width, photoBounds.height / photoImage.height);
    const sourceWidth = photoBounds.width / imageScale;
    const sourceHeight = photoBounds.height / imageScale;
    context.drawImage(
      photoImage,
      (photoImage.width - sourceWidth) / 2,
      (photoImage.height - sourceHeight) / 2,
      sourceWidth,
      sourceHeight,
      photoBounds.x + 2,
      photoBounds.y + 2,
      photoBounds.width - 4,
      photoBounds.height - 4
    );
  } else {
    drawWrappedText(labels.notAttached, photoBounds.x + 20, photoBounds.y + 96, photoBounds.width - 40, 20, 2, "bold 14px Arial", muted);
  }

  const locationHeaderY = detailHeaderY + detailHeaderHeight + photoBounds.height + 10;
  const locationBodyY = locationHeaderY + 23;
  const locationBodyHeight = 130;
  const mapHeaderY = locationBodyY + locationBodyHeight + 8;
  const mapBounds = {
    x: 42,
    y: mapHeaderY + 23,
    width: 710,
    height: 262,
  };
  const gpsBounds = {
    x: 42,
    y: locationBodyY,
    width: 470,
    height: locationBodyHeight,
  };
  const mapLinkBounds = {
    x: 519,
    y: locationBodyY,
    width: 233,
    height: locationBodyHeight,
  };
  let streetMapCanvas = null;
  let complaintPinImage = null;
  if (hasValidMapCoordinates(complaint)) {
    try {
      streetMapCanvas = await loadPdfOpenStreetMap(
        Number(latitude),
        Number(longitude),
        mapBounds.width,
        mapBounds.height
      );
    } catch (error) {
      console.error("Failed to load OpenStreetMap tiles for the complaint PDF:", error);
    }
    try {
      const markerType = isRejectedComplaint
        ? "rework"
        : isAwaitingVerificationComplaint
          ? "verification"
          : getComplaintMapPinType(complaint);
      const markerSvg = getComplaintMapMarkerSvg(complaint, markerType);
      complaintPinImage = await loadImageElement(
        `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(markerSvg)}`,
        "Could not prepare the complaint map pin"
      );
    } catch (error) {
      console.error("Failed to prepare complaint map pin:", error);
    }
  }
  const osmAttributionBounds = {
    x: mapBounds.x + mapBounds.width - 178,
    y: mapBounds.y + mapBounds.height - 18,
    width: 170,
    height: 14,
  };
  context.fillStyle = navy;
  if (usesCompactLayout) {
    context.fillRect(gpsBounds.x, locationHeaderY, gpsBounds.width, 23);
    context.fillRect(mapLinkBounds.x, locationHeaderY, mapLinkBounds.width, 23);
    context.fillRect(mapBounds.x, mapHeaderY, mapBounds.width, 23);
    drawText(isMarathi ? labels.coordinates : "GPS COORDINATES", gpsBounds.x + 8, locationHeaderY + 16, "bold 11px Arial", "#ffffff");
    drawText(labels.locationCode, mapLinkBounds.x + 8, locationHeaderY + 16, "bold 11px Arial", "#ffffff");
    drawText(labels.locationMap, mapBounds.x + 8, mapHeaderY + 16, "bold 11px Arial", "#ffffff");
  } else {
    context.fillRect(42, locationHeaderY, mapBounds.width, 23);
    context.fillRect(gpsBounds.x, locationHeaderY, gpsBounds.width, 23);
    context.fillRect(mapLinkBounds.x, locationHeaderY, mapLinkBounds.width, 23);
    drawText(labels.locationMap, mapBounds.x + 8, locationHeaderY + 16, "bold 11px Arial", "#ffffff");
    drawText(isMarathi ? labels.coordinates : "GPS COORDINATES", gpsBounds.x + 8, locationHeaderY + 16, "bold 11px Arial", "#ffffff");
    drawText(labels.locationCode, mapLinkBounds.x + 8, locationHeaderY + 16, "bold 11px Arial", "#ffffff");
  }

  context.fillStyle = "#eef4f5";
  context.fillRect(mapBounds.x, mapBounds.y, mapBounds.width, mapBounds.height);
  context.strokeStyle = border;
  context.strokeRect(mapBounds.x, mapBounds.y, mapBounds.width, mapBounds.height);
  context.save();
  context.beginPath();
  context.rect(mapBounds.x, mapBounds.y, mapBounds.width, mapBounds.height);
  context.clip();
  if (streetMapCanvas) {
    context.drawImage(
      streetMapCanvas,
      mapBounds.x + 1,
      mapBounds.y + 1,
      mapBounds.width - 2,
      mapBounds.height - 2
    );
    context.fillStyle = "rgba(255,255,255,0.92)";
    context.fillRect(osmAttributionBounds.x, osmAttributionBounds.y, osmAttributionBounds.width, osmAttributionBounds.height);
    drawText(
      "© OpenStreetMap contributors",
      osmAttributionBounds.x + osmAttributionBounds.width - 4,
      osmAttributionBounds.y + 10,
      "8px Arial",
      muted,
      "right"
    );
  } else {
    drawCenteredWrappedText(
      labels.streetMapUnavailable,
      mapBounds.x + 18,
      mapBounds.y + 18,
      mapBounds.width - 36,
      mapBounds.height - 36,
      16,
      2,
      "bold 12px Arial",
      muted
    );
  }
  if (complaintPinImage) {
    const markerX = mapBounds.x + mapBounds.width / 2;
    const markerY = mapBounds.y + mapBounds.height / 2;
    context.drawImage(complaintPinImage, markerX - 22, markerY - 54, 44, 56);
  }
  context.restore();
  // FIX: the decorative map above sets lineWidth = 10; reset so later strokes stay thin.
  context.lineWidth = 1;

  context.fillStyle = "#ffffff";
  context.fillRect(gpsBounds.x, gpsBounds.y, gpsBounds.width, gpsBounds.height);
  context.strokeStyle = border;
  context.strokeRect(gpsBounds.x, gpsBounds.y, gpsBounds.width, gpsBounds.height);
  if (usesCompactLayout) {
    drawWrappedText(
      `${labels.coordinates}: ${coordinateText}`,
      gpsBounds.x + 10,
      gpsBounds.y + 34,
      gpsBounds.width - 20,
      14,
      1,
      "bold 9px Arial",
      navy
    );
    drawWrappedText(
      `${labels.landmark}: ${landmarkValue}`,
      gpsBounds.x + 10,
      gpsBounds.y + 68,
      gpsBounds.width - 20,
      14,
      1,
      "10px Arial",
      ink
    );
    if (mapsUrl) {
      drawText(labels.openMap, gpsBounds.x + 10, gpsBounds.y + 116, "bold 9px Arial", "#1768ac");
    }
  } else {
    drawWrappedText(`${labels.location}: ${displayLocation}`, gpsBounds.x + 10, gpsBounds.y + 27, gpsBounds.width - 20, 14, 3, "10px Arial", ink);
    drawWrappedText(`${labels.coordinates}: ${coordinateText}`, gpsBounds.x + 10, gpsBounds.y + 72, gpsBounds.width - 20, 12, 2, "bold 9px Arial", navy);
    if (mapsUrl) {
      drawText(labels.openMap, gpsBounds.x + 10, gpsBounds.y + 97, "bold 8px Arial", "#1768ac");
    }
  }

  context.fillStyle = "#ffffff";
  context.fillRect(mapLinkBounds.x, mapLinkBounds.y, mapLinkBounds.width, mapLinkBounds.height);
  context.strokeStyle = border;
  context.strokeRect(mapLinkBounds.x, mapLinkBounds.y, mapLinkBounds.width, mapLinkBounds.height);
  const qrSize = 112;
  context.drawImage(
    qrImage,
    mapLinkBounds.x + (mapLinkBounds.width - qrSize) / 2,
    mapLinkBounds.y + 4,
    qrSize,
    qrSize
  );
  drawText(
    labels.scanQRCode,
    mapLinkBounds.x + mapLinkBounds.width / 2,
    mapLinkBounds.y + 126,
    "9px Arial",
    muted,
    "center"
  );

  const workHeaderY = 651;
  const drawAssignmentRow = (label, value, y, height, maxLines) => {
    const x = 42;
    const width = 710;
    const labelWidth = 210;
    context.strokeStyle = border;
    context.strokeRect(x, y, width, height);
    context.beginPath();
    context.moveTo(x + labelWidth, y);
    context.lineTo(x + labelWidth, y + height);
    context.stroke();
    drawWrappedText(label, x + 12, y + 15, labelWidth - 24, 14, 2, "bold 11px Arial", green);
    drawWrappedText(value, x + labelWidth + 14, y + 16, width - labelWidth - 28, 14, maxLines, "11px Arial", ink);
  };
  let instructionsY;
  if (usesCompactLayout) {
    instructionsY = mapBounds.y + mapBounds.height + 5;
  } else {
    context.fillStyle = navy;
    context.fillRect(42, workHeaderY, 710, 22);
    drawText(labels.assignment, 50, workHeaderY + 16, "bold 12px Arial", "#ffffff");
    let assignmentRowY = workHeaderY + 22;
    const assignmentRows = isResolvedComplaint
      ? [
          [labels.assignedTo, t(complaint.assignedStaff || labels.notAssigned), 32, 1],
          [labels.scopeOfWork, t(complaint.inspection?.actionTaken || complaint.actionTaken || complaint.description), 38, 2],
          [labels.workStartDeadline, completionDate, 28, 1],
          [labels.workCompletionTimeline, resolvedBy, 28, 1],
          [labels.deliverables, labels.resolvedStatus, 38, 2],
        ]
      : isAwaitingVerificationComplaint
        ? [
            [labels.assignedTo, t(complaint.assignedStaff || labels.notAssigned), 32, 1],
            [labels.scopeOfWork, t(complaint.inspection?.actionTaken || complaint.actionTaken || complaint.description), 38, 2],
            [labels.workStartDeadline, completionDate, 28, 1],
            [labels.workCompletionTimeline, t(complaint.assignedVerifier || labels.notProvided), 28, 1],
            [labels.deliverables, labels.verificationStatus, 38, 2],
          ]
        : isRejectedComplaint
          ? [
              [labels.assignedTo, t(complaint.assignedStaff || labels.notAssigned), 32, 1],
              [labels.scopeOfWork, t(complaint.verifierRemarks || complaint.inspection?.remarks || complaint.description), 38, 2],
              [labels.workStartDeadline, formatDeadline(24), 28, 1],
              [labels.workCompletionTimeline, labels.rejectedStatus, 28, 1],
              [labels.deliverables, labels.deliverables, 38, 2],
            ]
          : [
              [labels.assignedTo, t(complaint.assignedStaff || labels.notAssigned), 32, 1],
              [labels.scopeOfWork, t(complaint.description || complaint.issue || complaint.issueType), 38, 2],
              [labels.workStartDeadline, formatDeadline(24), 28, 1],
              [labels.workCompletionTimeline, formatDeadline(72), 28, 1],
              [labels.deliverables, deliverables, 38, 2],
            ];
    assignmentRows.forEach(([label, value, height, maxLines]) => {
      drawAssignmentRow(label, value, assignmentRowY, height, maxLines);
      assignmentRowY += height;
    });
    instructionsY = assignmentRowY + 5;
  }
  const instructionsHeight = 70;
  context.fillStyle = "#fff6f5";
  context.strokeStyle = "#e7b9b7";
  context.fillRect(42, instructionsY, 710, instructionsHeight);
  context.strokeRect(42, instructionsY, 710, instructionsHeight);
  drawWrappedText(labels.instructionsTitle, 52, instructionsY + 25, 122, 14, 3, "bold 10px Arial", "#b94b48");
  labels.instructions.forEach((instruction, index) => {
    drawWrappedText(
      `• ${instruction}`,
      184,
      instructionsY + 14 + index * 14,
      556,
      13,
      1,
      "10px Arial",
      ink
    );
  });

  const signatureY = instructionsY + instructionsHeight + 5;
  const signatureHeight = 112;
  const signatureCards = usesCompactLayout
    ? [
        { title: labels.issuedBy, kind: "issued" },
        { title: labels.acceptedBy, kind: "accepted" },
      ]
    : [
        { title: labels.issuedBy, kind: "issued" },
        { title: labels.acceptedBy, kind: "accepted" },
        { title: labels.completionConfirmation, kind: "completion" },
      ];
  const signatureWidth = 710 / signatureCards.length;
  signatureCards.forEach((card, index) => {
    const x = 42 + signatureWidth * index;
    context.fillStyle = "#ffffff";
    context.strokeStyle = border;
    context.fillRect(x, signatureY, signatureWidth, signatureHeight);
    context.strokeRect(x, signatureY, signatureWidth, signatureHeight);
    context.fillStyle = "#e8eef4";
    context.fillRect(x, signatureY, signatureWidth, 25);
    drawWrappedText(card.title, x + 7, signatureY + 16, signatureWidth - 14, 11, 1, "bold 9px Arial", navy);

    if (card.kind === "issued") {
      drawWrappedText(labels.panchayat, x + 10, signatureY + 48, signatureWidth - 20, 14, 2, "bold 12px Arial", navy);
      context.fillStyle = "#e8f4ec";
      context.strokeStyle = green;
      context.fillRect(x + 60, signatureY + 73, signatureWidth - 120, 25);
      context.strokeRect(x + 60, signatureY + 73, signatureWidth - 120, 25);
      drawText(labels.approved, x + signatureWidth / 2, signatureY + 90, "bold 12px Arial", green, "center");
    } else if (card.kind === "accepted") {
      drawWrappedText(
        complaint.assignedStaff ? t(complaint.assignedStaff) : "",
        x + 10,
        signatureY + 48,
        signatureWidth - 20,
        14,
        2,
        "bold 12px Arial",
        ink
      );
      if (!isNewComplaint) {
        drawText(
          isResolvedComplaint
            ? labels.workCompletionTimeline
            : `${labels.authorizedSignatory}: __________`,
          x + 10,
          signatureY + 96,
          "10px Arial",
          muted
        );
      }
    } else {
      drawWrappedText(
        isNewComplaint ? labels.newStatus : isResolvedComplaint ? resolvedBy : labels.panchayat,
        x + 10,
        signatureY + 48,
        signatureWidth - 20,
        13,
        2,
        "bold 10px Arial",
        ink
      );
      drawText(
        isNewComplaint || isResolvedComplaint
          ? `${labels.signatureAndDate}: ${issueDate}`
          : `${labels.signatureAndDate}: __________`,
        x + 10,
        signatureY + 96,
        "10px Arial",
        muted
      );
    }
  });

  const footerY = signatureY + signatureHeight + 7;
  context.fillStyle = navy;
  context.fillRect(42, footerY, 710, 28);
  drawText(
    isMarathi
      ? "MYROAD INDIA · डिजिटल रस्ता सुरक्षा · GIS नकाशांकन"
      : "MYROAD INDIA · DIGITAL ROAD SAFETY · GIS MAPPING",
    52,
    footerY + 12,
    "bold 9px Arial",
    "#ffffff"
  );
  drawText(
    isMarathi
      ? `तक्रार ${displayComplaintNo} · हिंजवडी`
      : `Complaint ${complaintNo} · Hinjawadi`,
    742,
    footerY + 12,
    "9px Arial",
    "#ffffff",
    "right"
  );
  drawText(
    isMarathi ? "नागरिक तक्रार नोंदणी" : "Citizen grievance reporting",
    52,
    footerY + 23,
    "9px Arial",
    "#ffffff"
  );

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, pageWidth, pageHeight);
  const appHomeUrl = appBaseUrl.toString();
  const addCanvasLink = ({ x, y, width, height }, url) => {
    doc.link(
      (x / canvasWidth) * pageWidth,
      (y / canvasHeight) * pageHeight,
      (width / canvasWidth) * pageWidth,
      (height / canvasHeight) * pageHeight,
      { url }
    );
  };
  addCanvasLink(logoBounds, "https://myroadindia.com/");
  addCanvasLink(mapLinkBounds, pdfViewerUrl.toString());
  if (mapsUrl) {
    addCanvasLink(mapBounds, mapsUrl);
    // FIX: four overlapping link rectangles collapsed into one clean clickable GPS area.
    addCanvasLink(
      { x: gpsBounds.x + 8, y: gpsBounds.y + 15, width: gpsBounds.width - 16, height: gpsBounds.height - 19 },
      mapsUrl
    );
  }
  if (streetMapCanvas) {
    addCanvasLink(osmAttributionBounds, "https://www.openstreetmap.org/copyright");
  }
  const safeComplaintNumber = complaintNo.replace(/[^a-z0-9-_]/gi, "_");
  const pdfBlob = doc.output("blob");
  if (download) {
    const reportType = isNewComplaint
      ? "New"
      : isResolvedComplaint
        ? "Resolved"
        : isAwaitingVerificationComplaint
          ? "Awaiting_Verification"
          : isRejectedComplaint
            ? "Rejected"
            : "Assigned";
    doc.save(`MyRoad_${reportType}_Complaint_${safeComplaintNumber}_${language}.pdf`);
  }
  return { photoStatus, pdfBlob };
};

/* ===================== FALLBACK TABLE PDF ===================== */
/*
  The original fallback branch was unreachable (getComplaintDisplayStatus only returns
  New / Assigned / Resolved). It is now a standalone helper used when the designed PDF fails.
*/
const generateFallbackComplaintPdf = async (complaint, location) => {
  const coordinates = complaint.coordinates || {};
  const inspection = complaint.inspection || {};
  const photoEntries = getComplaintPdfPhotos(complaint);

  const detailRows = [
    ["Complaint record ID", complaint.id || complaint._id],
    ["Complaint number", complaint.complaintNumber],
    ["Category", complaint.category],
    ["Specific issue", complaint.issue || complaint.issueType],
    ["Description", complaint.description || complaint.issueDescription],
    ["Citizen name", complaint.citizenName || complaint.citizenProfile?.name],
    ["Location", location],
    ["Coordinates", [coordinates.latitude ?? complaint.lat, coordinates.longitude ?? complaint.lng].filter((v) => v != null && v !== "").join(", ")],
    ["Priority", complaint.priority],
    ["Current status", complaint.status],
    ["Assigned staff/contractor", complaint.assignedStaff],
    ["Assigned verifier", complaint.assignedVerifier],
    ["Submitted date", complaint.date || complaint.createdAt],
    ["Work performed", inspection.actionTaken || complaint.actionTaken],
  ].map(([label, value]) => [label, value === undefined || value === null || value === "" ? "Not provided" : String(value)]);

  const images = await Promise.all(photoEntries.map(async ([label, path]) => {
    try { return { label, dataUrl: await loadPdfImage(path), error: "" }; }
    catch { return { label, dataUrl: "", error: "Could not load this image" }; }
  }));

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const saffron = [230, 126, 34]; const indiaGreen = [19, 110, 67]; const navy = [20, 45, 80];

  doc.setFillColor(...saffron); doc.rect(0, 0, pageWidth, 34, "F");
  doc.setFillColor(255, 255, 255); doc.rect(0, 32, pageWidth, 2, "F");
  doc.setFillColor(...indiaGreen); doc.rect(0, 34, pageWidth, 2, "F");
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(18);
  doc.text("MyRoad India", 14, 14); doc.setFontSize(12); doc.text("Official Complaint Report", 14, 23);
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  doc.text(`Complaint: ${complaint.complaintNumber || "N/A"}`, 14, 30);
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - 14, 30, { align: "right" });

  autoTable(doc, {
    startY: 44, head: [["Complaint information", "Details"]], body: detailRows, theme: "grid",
    margin: { left: 14, right: 14 }, styles: { fontSize: 8.5, cellPadding: 3, overflow: "linebreak", valign: "top" },
    headStyles: { fillColor: navy, textColor: 255, fontStyle: "bold" },
    columnStyles: { 0: { cellWidth: 48, fontStyle: "bold", textColor: indiaGreen }, 1: { cellWidth: "auto" } },
  });

  let photoTableStartY = doc.lastAutoTable.finalY + 10;
  if (photoTableStartY > pageHeight - 35) { doc.addPage(); photoTableStartY = 18; }
  doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(...indiaGreen);
  doc.text("Complaint photos", 14, photoTableStartY);

  autoTable(doc, {
    startY: photoTableStartY + 4, head: [["Photo type", "Image"]],
    body: images.length ? images.map((image) => [image.label, image.error || ""]) : [["Photos", "No complaint photos attached"]],
    theme: "grid", margin: { left: 14, right: 14 }, styles: { fontSize: 8.5, cellPadding: 3, minCellHeight: 38, valign: "middle" },
    headStyles: { fillColor: indiaGreen, textColor: 255, fontStyle: "bold" },
    columnStyles: { 0: { cellWidth: 48, fontStyle: "bold", textColor: indiaGreen }, 1: { cellWidth: "auto" } },
    didDrawCell: (data) => {
      if (data.section !== "body" || data.column.index !== 1) return;
      const image = images[data.row.index];
      if (!image?.dataUrl) return;
      const imageProperties = doc.getImageProperties(image.dataUrl);
      const maxWidth = data.cell.width - 6; const maxHeight = data.cell.height - 6;
      const imgScale = Math.min(maxWidth / imageProperties.width, maxHeight / imageProperties.height);
      doc.addImage(image.dataUrl, "PNG", data.cell.x + (data.cell.width - (imageProperties.width * imgScale)) / 2, data.cell.y + (data.cell.height - (imageProperties.height * imgScale)) / 2, imageProperties.width * imgScale, imageProperties.height * imgScale);
    },
  });

  const safeComplaintNumber = String(complaint.complaintNumber || complaint.id || complaint._id || "complaint").replace(/[^a-z0-9-_]/gi, "_");
  doc.save(`MyRoad_Complaint_${safeComplaintNumber}.pdf`);
};

/* ===================== COMPONENT ===================== */

const emptyUser = { name: "", role: "staff", contact: "", email: "", password: "" };
const emptyAdmin = { name: "", role: "admin", contact: "", email: "", password: "" };

const AdminDashboard = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  // FIX: removed unused `setSearchParams`
  const [searchParams] = useSearchParams();

  const storedAdmin = getStoredUser();
  const [admin, setAdmin] = useState({
    name: storedAdmin.name || "", role: storedAdmin.designation || storedAdmin.role || "",
    contact: storedAdmin.contact || storedAdmin.mobile || "",
    email: storedAdmin.email || "",
    staffId: storedAdmin.adminId || storedAdmin.staffId || getUserId(storedAdmin) || "",
    profilePhoto: storedAdmin.profilePhoto || "",
  });

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return { "Content-Type": "application/json", "Authorization": token ? `Bearer ${token}` : "" };
  };

  // Translated wrapper around the module-level helper
  const getLocationString = (loc) => getLocationText(loc, t("admin_dashboard.location_pending"));

  useEffect(() => {
    const loadAdminProfile = async () => {
      try {
        const data = await fetchDashboard("admin", getUserId(storedAdmin));
        if (data.profile) {
          setAdmin((current) => ({
            ...current, ...data.profile,
            staffId: data.profile.adminId || data.profile.staffId || current.staffId,
            role: data.profile.designation || data.profile.role || current.role,
            contact: data.profile.contact || data.profile.mobile || current.contact,
          }));
        }
      } catch (error) { console.error("Failed to load admin dashboard profile:", error); }
    };
    loadAdminProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [users, setUsers] = useState([]); const [usersLoading, setUsersLoading] = useState(true); const [usersLoadError, setUsersLoadError] = useState("");
  const [admins, setAdmins] = useState([]); const [adminsLoading, setAdminsLoading] = useState(true);
  const [complaints, setComplaints] = useState([]); const [complaintsLoading, setComplaintsLoading] = useState(true);
  const [boundaryGeoJson, setBoundaryGeoJson] = useState(null); const [boundaryError, setBoundaryError] = useState(false);
  const [assignmentSavingKey, setAssignmentSavingKey] = useState(""); const [assignmentError, setAssignmentError] = useState("");
  const [selectedId, setSelectedId] = useState(searchParams.get("complaintId") || null);
  const [notificationFeed, setNotificationFeed] = useState([]);
  const [mapStatusFilter, setMapStatusFilter] = useState("All");
  const [mapReportedRange, setMapReportedRange] = useState("all");
  const [searchTerm, setSearchTerm] = useState(""); const [categoryFilter, setCategoryFilter] = useState("All"); const [priorityFilter, setPriorityFilter] = useState("All");
  const [showAddUser, setShowAddUser] = useState(false); const [editingUserId, setEditingUserId] = useState(null);
  const [newUser, setNewUser] = useState(emptyUser);
  const [showAddAdmin, setShowAddAdmin] = useState(false); const [editingAdminId, setEditingAdminId] = useState(null);
  const [newAdmin, setNewAdmin] = useState(emptyAdmin);
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState(null); const [confirmDeleteAdminId, setConfirmDeleteAdminId] = useState(null); const [confirmDeleteComplaintId, setConfirmDeleteComplaintId] = useState(null);
  const [userMessage, setUserMessage] = useState({ type: "", text: "" });
  const [resettingPasswordId, setResettingPasswordId] = useState(null); const [resettingAdminPasswordId, setResettingAdminPasswordId] = useState(null); const [newPassword, setNewPassword] = useState("");
  const [showProfile, setShowProfile] = useState(false); const [showCompletedWork, setShowCompletedWork] = useState(false);
  const [showStaffVerifierProfile, setShowStaffVerifierProfile] = useState(false); const [showComplaintVerification, setShowComplaintVerification] = useState(false);
  const [showStaffMonitoring, setShowStaffMonitoring] = useState(false); const [selectedUserProfile, setSelectedUserProfile] = useState(null);
  const [showComplaintManagement, setShowComplaintManagement] = useState(false); const [showComplaintDetails, setShowComplaintDetails] = useState(false);
  const [complaintListType, setComplaintListType] = useState("new"); const [showReports, setShowReports] = useState(false);
  const [showNotificationMonitoring, setShowNotificationMonitoring] = useState(false); const [initialNotification, setInitialNotification] = useState(null);
  const [complaintsMenuOpen, setComplaintsMenuOpen] = useState(false);
  const [activeNav, setActiveNav] = useState("dashboard");
  const [showAdminManagement, setShowAdminManagement] = useState(false);
  const [showAllComplaints, setShowAllComplaints] = useState(false);

  // PDF Generation states
  const [pdfGeneratingId, setPdfGeneratingId] = useState("");
  const [pdfMessage, setPdfMessage] = useState({ type: "", text: "" });

  const closeAllViews = () => {
    setShowProfile(false); setShowAdminManagement(false); setShowComplaintManagement(false); setShowComplaintVerification(false);
    setShowComplaintDetails(false); setShowStaffMonitoring(false); setShowCompletedWork(false); setShowReports(false);
    setShowStaffVerifierProfile(false); setShowNotificationMonitoring(false);
  };
  const openView = (setter) => { closeAllViews(); setter(true); };
  const selectView = (view, setter) => { setActiveNav(view); openView(setter); };
  const returnToDashboard = () => { closeAllViews(); setActiveNav("dashboard"); };

  useEffect(() => {
    let isMounted = true;

    const fetchBoundary = async () => {
      try {
        const response = await fetch("/boundaries/hinjavadi.geojson");
        const boundary = await response.json();
        if (
          !response.ok ||
          boundary?.type !== "FeatureCollection" ||
          !Array.isArray(boundary.features) ||
          !boundary.features.some((feature) =>
            ["Polygon", "MultiPolygon"].includes(feature?.geometry?.type)
          )
        ) {
          throw new Error("Unable to load the Hinjawadi boundary GeoJSON");
        }

        if (isMounted) {
          setBoundaryGeoJson(boundary);
          setBoundaryError(false);
        }
      } catch (error) {
        console.error("Failed to fetch admin map boundary:", error);
        if (isMounted) {
          setBoundaryGeoJson(null);
          setBoundaryError(true);
        }
      }
    };

    fetchBoundary();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!location.state?.openProfile) return;
    selectView("profile", setShowProfile); navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, location.pathname, navigate]);

  useEffect(() => { if (complaintNavKeys.includes(activeNav)) setComplaintsMenuOpen(true); }, [activeNav]);

  const handleLogout = () => {
    if (window.confirm(t("admin_dashboard.confirm_logout"))) {
      localStorage.removeItem("user"); localStorage.removeItem("token"); localStorage.removeItem("adminData"); window.location.href = "/login";
    }
  };

  const categories = ["All", ...Array.from(new Set(complaints.map((c) => c.category).filter(Boolean)))];
  const adminStaffOptions = useMemo(() => normalizeStaffOptions(users), [users]);
  const adminVerifierOptions = useMemo(() => users.filter((user) => user.role === "verifier"), [users]);
  const getStaffAccountId = (complaint) => complaint.assignedStaffId || adminStaffOptions.find((user) => user.name === complaint.assignedStaff)?.id || "";
  const getVerifierAccountId = (complaint) => complaint.assignedVerifierId || adminVerifierOptions.find((user) => user.name === complaint.assignedVerifier)?.id || "";

  const handleComplaintUpdated = (updatedComplaint) => {
    if (!updatedComplaint) return;
    const normalized = normalizeId(updatedComplaint);
    setSelectedId(normalized.id);
    setComplaints((current) => current.map((complaint) => String(complaint.id) === String(normalized.id) ? { ...complaint, ...normalized } : complaint));
  };
  const handleManagedUserUpdated = (updatedUser) => {
    setUsers((current) => current.map((user) => String(user.id) === String(updatedUser._id || updatedUser.id) ? normalizeId(updatedUser) : user));
  };

  // FIX: keep the timer in a ref so overlapping messages don't clear each other and it is cleaned on unmount.
  const messageTimerRef = useRef(null);
  const showMessage = (type, text) => {
    setUserMessage({ type, text });
    if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
    messageTimerRef.current = setTimeout(() => setUserMessage({ type: "", text: "" }), 3000);
  };
  useEffect(() => () => { if (messageTimerRef.current) clearTimeout(messageTimerRef.current); }, []);

  const findComplaintForNotification = (notification) => {
    const complaintId = notification.complaintId || notification.complaint?._id || notification.complaint?.id;
    const complaintNumber = notification.complaintNumber || notification.complaint?.complaintNumber;
    return complaints.find((item) => (complaintId && String(item.id || item._id) === String(complaintId)) || (complaintNumber && item.complaintNumber === complaintNumber));
  };

  const handleInlineAssignment = async (complaint, role, accountId) => {
    const savingKey = String(complaint.id); const usersForRole = role === "staff" ? adminStaffOptions : adminVerifierOptions;
    const selectedUser = usersForRole.find((user) => String(user.id) === String(accountId));
    setAssignmentError(""); setAssignmentSavingKey(savingKey);
    try {
      const update = role === "staff"
        ? { assignedStaff: selectedUser?.name || "", assignedStaffId: selectedUser?.id || "", ...(selectedUser && ["New", "Pending"].includes(complaint.status) ? { status: "Under Action" } : {}) }
        : { assignedVerifier: selectedUser?.name || "", assignedVerifierId: selectedUser?.id || "" };
      const result = await updateDashboardComplaint(complaint.id, update); handleComplaintUpdated(result.complaint);
    } catch (error) {
      console.error(`Failed to assign ${role}:`, error);
      setAssignmentError(error.message || t("admin_dashboard.error_assign_role", { role }));
      throw error;
    } finally { setAssignmentSavingKey(""); }
  };

  const handleMapVerificationDecision = async (
    complaint,
    status,
    remarks,
    dateTime
  ) => {
    const result = await updateDashboardComplaint(complaint.id, {
      status,
      remarks,
      verificationDateTime: dateTime,
      actorName: admin.name || storedAdmin.name || "",
    });
    handleComplaintUpdated(result.complaint);
    return result.complaint;
  };

  const handleOpenNotificationComplaint = (notification) => {
    if (notification.contactMessageId || notification.contactMessage) { setInitialNotification(notification); selectView("notifications", setShowNotificationMonitoring); return; }
    const complaint = findComplaintForNotification(notification);
    if (!complaint) { showMessage("error", t("admin_dashboard.error_complaint_not_found")); return; }
    setSelectedId(complaint.id || complaint._id); setComplaintListType(null); selectView("complaint-detail", setShowComplaintDetails);
  };

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setUsersLoading(true); setUsersLoadError("");
        const response = await fetch(`${API_BASE_URL}/users?role=staff,verifier`, { headers: getAuthHeaders() });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.message || t("admin_dashboard.error_load_users"));
        setUsers(data.users.map(normalizeId));
      } catch (err) { console.error("Failed to fetch users:", err); setUsersLoadError(err.message || t("admin_dashboard.error_load_users")); } finally { setUsersLoading(false); }
    }; fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  useEffect(() => {
    const fetchAdmins = async () => {
      try {
        setAdminsLoading(true);
        const response = await fetch(`${API_BASE_URL}/users?role=admin`, { headers: getAuthHeaders() });
        const data = await response.json();
        if (response.ok && data.success) setAdmins(data.users.map(normalizeId));
      } catch (err) { console.error("Failed to fetch admins:", err); } finally { setAdminsLoading(false); }
    }; fetchAdmins();
  }, []);

  useEffect(() => {
    let active = true;
    const fetchComplaints = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/complaints`, { headers: getAuthHeaders() });
        const data = await response.json();
        if (response.ok && data.success) {
          if (!active) return;
          const normalized = data.complaints.map((complaint) => ({ ...normalizeId(complaint), lat: complaint.lat ?? complaint.coordinates?.latitude ?? null, lng: complaint.lng ?? complaint.coordinates?.longitude ?? null }));
          setComplaints((current) => complaintsAreUnchanged(current, normalized) ? current : normalized);
          if (normalized.length > 0) setSelectedId((current) => (normalized.some((complaint) => String(complaint.id) === String(current)) ? current : normalized[0].id));
        }
      } catch (err) { if (active) console.error("Failed to fetch complaints:", err); } finally { if (active) setComplaintsLoading(false); }
    }; fetchComplaints();
    const refreshTimer = window.setInterval(fetchComplaints, 30000);
    return () => { active = false; window.clearInterval(refreshTimer); };
  }, []);

  useEffect(() => {
    let active = true;
    const fetchNotifications = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/notifications`, { headers: getAuthHeaders() });
        const data = await response.json();
        if (response.ok && data.success && active) {
          const normalized = data.notifications.map(normalizeId);
          setNotificationFeed((current) => notificationsAreUnchanged(current, normalized) ? current : normalized);
        }
      } catch (err) { if (active) console.error("Failed to fetch notifications:", err); }
    }; fetchNotifications();
    const refreshTimer = window.setInterval(fetchNotifications, 30000);
    return () => { active = false; window.clearInterval(refreshTimer); };
  }, []);

  /*
    FIX: removed the separate "analytics" fetch (its state was never rendered) and the
    separate "map complaints" fetch (it duplicated /complaints and never refreshed).
    The map now reads from the already-polled `complaints` state.
  */

  const [trendRange, setTrendRange] = useState(7);
  const dashboardCharts = useMemo(() => {
    const categoryCounts = new Map(); const statusCounts = new Map(); const knownLocations = new Set();
    const pendingLabel = t("admin_dashboard.location_pending");
    const keyOf = (date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    const trendDays = Array.from({ length: trendRange }, (_, index) => { const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - (trendRange - index - 1)); return date; });
    const trendCounts = new Map(trendDays.map((date) => [keyOf(date), { total: 0, resolved: 0 }]));
    const priorityCounts = new Map(priorityOptions.map((priority) => [priority, 0]));
    let resolvedCount = 0; let activeCount = 0;
    complaints.forEach((complaint) => {
      const category = String(complaint.category || t("admin_dashboard.unknown"));
      const status = String(complaint.status || t("admin_dashboard.unknown"));
      const priority = String(complaint.priority || "Normal");
      const normalizedStatus = status.toLowerCase(); const isResolved = normalizedStatus === "resolved";
      categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1); statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
      if (priorityCounts.has(priority)) priorityCounts.set(priority, priorityCounts.get(priority) + 1);
      const loc = getLocationText(complaint.location, pendingLabel);
      if (loc !== pendingLabel) knownLocations.add(loc);
      if (isResolved) resolvedCount += 1;
      if (!["resolved", "closed", "rejected"].includes(normalizedStatus)) activeCount += 1;
      const date = getComplaintDate(complaint); if (!date) return;
      const point = trendCounts.get(keyOf(date)); if (!point) return;
      point.total += 1; if (isResolved) point.resolved += 1;
    });
    const categoryEntries = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1]); const statuses = [...statusCounts.entries()].sort((a, b) => b[1] - a[1]); const priorities = [...priorityCounts.entries()];
    const formatDate = (date) => date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    const statusColors = { New: "#4b8df8", Pending: "#f5a623", "Under Verification": "#9b6bdb", "Under Action": "#17a2b8", Resolved: "#27ae70", Closed: "#6b7c93", Rejected: "#e35d6a" };
    return {
      resolvedCount, activeCount, locationCount: knownLocations.size,
      category: { labels: categoryEntries.map(([label]) => label), datasets: [{ data: categoryEntries.map(([, count]) => count), backgroundColor: categoryEntries.map(([label]) => colorForCategory(label)), borderColor: "#ffffff", borderWidth: 3 }] },
      status: { labels: statuses.map(([label]) => label), datasets: [{ data: statuses.map(([, count]) => count), backgroundColor: statuses.map(([label]) => statusColors[label] || "#8ca0b8"), borderColor: "#ffffff", borderWidth: 3 }] },
      priority: { labels: priorities.map(([label]) => label), datasets: [{ label: t("admin_dashboard.col_complaints"), data: priorities.map(([, count]) => count), backgroundColor: ["#e95b62", "#f5a623", "#4b8df8"], borderRadius: 7, maxBarThickness: 48 }] },
      trend: { labels: trendDays.map(formatDate), datasets: [
        { label: t("admin_dashboard.trend_total"), data: trendDays.map((date) => trendCounts.get(keyOf(date)).total), borderColor: "#4b8df8", backgroundColor: "rgba(75, 141, 248, 0.12)", fill: true, tension: 0.35, pointRadius: 3, pointHoverRadius: 5 },
        { label: t("admin_dashboard.trend_resolved"), data: trendDays.map((date) => trendCounts.get(keyOf(date)).resolved), borderColor: "#27ae70", backgroundColor: "rgba(39, 174, 112, 0.08)", fill: false, tension: 0.35, pointRadius: 3, pointHoverRadius: 5 },
      ] },
    };
  }, [complaints, trendRange, t]);

  const dashboardSummary = [
    { label: t("admin_dashboard.total_complaints"), value: complaints.length, icon: "▣", tone: "blue" },
    { label: t("admin_dashboard.resolved"), value: dashboardCharts.resolvedCount, icon: "✓", tone: "green" },
    { label: t("admin_dashboard.active_complaints"), value: dashboardCharts.activeCount, icon: "◷", tone: "orange" },
    { label: t("admin_dashboard.staff_admins"), value: users.length + admins.length, icon: "♟", tone: "purple" },
    { label: t("admin_dashboard.reported_locations"), value: dashboardCharts.locationCount, icon: "⌖", tone: "cyan" },
  ];

  const newComplaintCount = complaints.filter((complaint) => String(complaint.status || "").toLowerCase() === "new").length;
  const assignedComplaintCount = complaints.filter((complaint) => [complaint.assignedStaff, complaint.assignedStaffId].some((assignment) => String(assignment || "").trim())).length;
  const verificationComplaintCount = complaints.filter((complaint) => {
    const status = String(complaint.status || "")
      .trim()
      .toLowerCase()
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ");
    return ["under verification", "under review", "submitted", "work completed", "completed work", "awaiting verification", "ready for verification"].includes(status);
  }).length;
  const completedWorkCount = complaints.filter(isApprovedCompletedWork).length;

  // FIX: Math.random() is not cryptographically secure -> use crypto.getRandomValues for passwords.
  const generatePassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#";
    const bytes = new Uint32Array(10);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes, (n) => chars[n % chars.length]).join("");
  };

  const saveUser = async (e) => {
    e.preventDefault(); setUserMessage({ type: "", text: "" });
    const isEditing = Boolean(editingUserId);
    // FIX: password is only mandatory when creating (form says "leave blank to keep current" when editing).
    if (!newUser.name.trim() || !newUser.contact.trim() || !newUser.email.trim() || (!isEditing && !newUser.password.trim())) { showMessage("error", t("admin_dashboard.error_all_fields_required")); return; }
    try {
      const url = isEditing ? `${API_BASE_URL}/users/${editingUserId}` : `${API_BASE_URL}/users`; const method = isEditing ? "PUT" : "POST";
      const payload = { ...newUser };
      if (isEditing && !payload.password.trim()) delete payload.password;
      const response = await fetch(url, { method, headers: getAuthHeaders(), body: JSON.stringify(payload) }); const data = await response.json();
      if (response.ok && data.success) {
        if (isEditing) { setUsers((current) => current.map((u) => (u.id === editingUserId ? normalizeId(data.user) : u))); showMessage("success", t("admin_dashboard.success_user_updated", { name: data.user.name })); }
        else { setUsers((current) => [normalizeId(data.user), ...current]); showMessage("success", t("admin_dashboard.success_user_registered", { name: data.user.name })); }
        setNewUser(emptyUser); setShowAddUser(false); setEditingUserId(null);
      } else showMessage("error", data.message || t("admin_dashboard.error_operation_failed"));
    } catch (err) { console.error("Failed to save user:", err); showMessage("error", t("admin_dashboard.error_server_unreachable")); }
  };

  const editUser = (user) => { setNewUser({ name: user.name, role: user.role, contact: user.contact, email: user.email, password: "" }); setEditingUserId(user.id); setShowAddUser(true); };
  const resetUserPassword = async (id) => {
    if (!newPassword.trim()) { showMessage("error", t("admin_dashboard.error_password_empty")); return; }
    try {
      const response = await fetch(`${API_BASE_URL}/users/${id}`, { method: "PUT", headers: getAuthHeaders(), body: JSON.stringify({ password: newPassword }) }); const data = await response.json();
      if (response.ok && data.success) { setResettingPasswordId(null); setNewPassword(""); showMessage("success", t("admin_dashboard.success_password_reset")); }
      else showMessage("error", data.message || t("admin_dashboard.error_password_reset"));
    } catch (err) { console.error("Failed to reset user password:", err); showMessage("error", t("admin_dashboard.error_server_unreachable")); }
  };
  const deleteUser = async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${id}`, { method: "DELETE", headers: getAuthHeaders() }); const data = await response.json();
      if (response.ok && data.success) { setUsers((current) => current.filter((u) => u.id !== id)); setConfirmDeleteUserId(null); showMessage("success", t("admin_dashboard.success_user_removed")); }
      else showMessage("error", data.message || t("admin_dashboard.error_user_remove"));
    } catch (err) { console.error("Failed to delete user:", err); showMessage("error", t("admin_dashboard.error_server_unreachable")); }
  };

  const saveAdmin = async (e) => {
    e.preventDefault(); setUserMessage({ type: "", text: "" });
    const isEditing = Boolean(editingAdminId);
    if (!newAdmin.name.trim() || !newAdmin.contact.trim() || !newAdmin.email.trim() || (!isEditing && !newAdmin.password.trim())) { showMessage("error", t("admin_dashboard.error_all_fields_required")); return; }
    try {
      const url = isEditing ? `${API_BASE_URL}/users/${editingAdminId}` : `${API_BASE_URL}/users`; const method = isEditing ? "PUT" : "POST";
      const payload = { ...newAdmin, role: "admin" };
      if (isEditing && !payload.password.trim()) delete payload.password;
      const response = await fetch(url, { method, headers: getAuthHeaders(), body: JSON.stringify(payload) }); const data = await response.json();
      if (response.ok && data.success) {
        if (isEditing) { setAdmins((current) => current.map((a) => (a.id === editingAdminId ? normalizeId(data.user) : a))); showMessage("success", t("admin_dashboard.success_admin_updated", { name: data.user.name })); }
        else { setAdmins((current) => [normalizeId(data.user), ...current]); showMessage("success", t("admin_dashboard.success_admin_registered", { name: data.user.name })); }
        setNewAdmin(emptyAdmin); setShowAddAdmin(false); setEditingAdminId(null);
      } else showMessage("error", data.message || t("admin_dashboard.error_operation_failed"));
    } catch (err) { console.error("Failed to save admin:", err); showMessage("error", t("admin_dashboard.error_server_unreachable")); }
  };

  const editAdmin = (adminUser) => { setNewAdmin({ name: adminUser.name, role: "admin", contact: adminUser.contact, email: adminUser.email, password: "" }); setEditingAdminId(adminUser.id); setShowAddAdmin(true); };
  const resetAdminPassword = async (id) => {
    if (!newPassword.trim()) { showMessage("error", t("admin_dashboard.error_password_empty")); return; }
    try {
      const response = await fetch(`${API_BASE_URL}/users/${id}`, { method: "PUT", headers: getAuthHeaders(), body: JSON.stringify({ password: newPassword }) }); const data = await response.json();
      if (response.ok && data.success) { setResettingAdminPasswordId(null); setNewPassword(""); showMessage("success", t("admin_dashboard.success_password_reset")); }
      else showMessage("error", data.message || t("admin_dashboard.error_password_reset"));
    } catch (err) { console.error("Failed to reset admin password:", err); showMessage("error", t("admin_dashboard.error_server_unreachable")); }
  };
  const deleteAdmin = async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${id}`, { method: "DELETE", headers: getAuthHeaders() }); const data = await response.json();
      if (response.ok && data.success) { setAdmins((current) => current.filter((a) => a.id !== id)); setConfirmDeleteAdminId(null); showMessage("success", t("admin_dashboard.success_admin_removed")); }
      else showMessage("error", data.message || t("admin_dashboard.error_admin_remove"));
    } catch (err) { console.error("Failed to delete admin:", err); showMessage("error", t("admin_dashboard.error_server_unreachable")); }
  };

  const filteredComplaints = complaints.filter((c) => {
    const locStr = getLocationString(c.location).toLowerCase(); const normalizedSearchTerm = searchTerm.trim().toLowerCase();
    const matchesSearch = !normalizedSearchTerm || String(c.complaintNumber || "").toLowerCase().includes(normalizedSearchTerm) || String(c.issue || "").toLowerCase().includes(normalizedSearchTerm) || locStr.includes(normalizedSearchTerm);
    const matchesCategory = categoryFilter === "All" || c.category === categoryFilter; const matchesPriority = priorityFilter === "All" || c.priority === priorityFilter;
    return matchesSearch && matchesCategory && matchesPriority;
  });
  const visibleComplaints = showAllComplaints
    ? filteredComplaints
    : filteredComplaints.slice(0, INITIAL_COMPLAINT_TABLE_ROWS);

  const deleteComplaint = async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/complaints/${id}`, { method: "DELETE", headers: getAuthHeaders() }); const data = await response.json();
      if (response.ok && data.success) {
        const remaining = complaints.filter((c) => c.id !== id); setComplaints(remaining); setConfirmDeleteComplaintId(null);
        if (String(selectedId) === String(id)) setSelectedId(remaining[0]?.id || null);
        showMessage("success", t("admin_dashboard.success_complaint_removed"));
      } else showMessage("error", data.message || t("admin_dashboard.error_complaint_remove"));
    } catch (err) { console.error("Failed to delete complaint:", err); showMessage("error", t("admin_dashboard.error_server_unreachable")); }
  };

  const handleGenerateComplaintPdf = async (complaint, language = "en") => {
    const complaintId = String(complaint.id || complaint._id || "");
    setPdfGeneratingId(complaintId);
    setPdfMessage({ type: "", text: "" });
    try {
      await generateComplaintPdf(complaint, language, {
        type: getComplaintPdfType(complaint),
      });
    } catch (error) {
      console.error("Failed to generate complaint PDF:", error);
      // Fallback: simple table-based PDF if the designed one fails
      try {
        await generateFallbackComplaintPdf(complaint, getLocationString(complaint.location));
      } catch (fallbackError) {
        console.error("Fallback PDF also failed:", fallbackError);
        setPdfMessage({ type: "error", text: fallbackError.message || error.message || "Could not generate the complaint PDF." });
      }
    } finally {
      setPdfGeneratingId("");
    }
  };

  const handleShareMarathiComplaintPdf = async (complaint) => {
    const complaintId = String(complaint.id || complaint._id || "");
    setPdfGeneratingId(complaintId);
    setPdfMessage({ type: "", text: "" });
    try {
      const result = await generateComplaintPdf(complaint, "mr", {
        type: getComplaintPdfType(complaint),
      });
      if (!result?.pdfBlob) {
        throw new Error(t("admin_dashboard.map_whatsapp_pdf_error"));
      }
      return true;
    } catch (error) {
      console.error("Failed to prepare Marathi complaint PDF for WhatsApp:", error);
      setPdfMessage({
        type: "error",
        text: error.message || t("admin_dashboard.map_whatsapp_pdf_error"),
      });
      throw error;
    } finally {
      setPdfGeneratingId("");
    }
  };

  const filteredMapComplaints = useMemo(() => complaints.filter((c) => {
    if (!hasValidMapCoordinates(c)) return false;
    const matchesStatus = matchesMapStatusFilter(c, mapStatusFilter);
    const matchesReportedRange = isWithinReportedRange(c, mapReportedRange);
    return matchesStatus && matchesReportedRange;
  }), [complaints, mapStatusFilter, mapReportedRange]);
  const missingCoordinateCount = complaints.filter((complaint) => !hasValidMapCoordinates(complaint)).length;

  const resetMapFilters = () => { setMapStatusFilter("All"); setMapReportedRange("all"); };
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  // FIX: guard against empty/undefined name (previously could throw on undefined .split)
  const initials = String(admin.name || "").split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  const sidebarMarkup = (
    <aside className="ad-sidebar">
      <div className="ad-sb-brand">
        <a href="https://myroadindia.com/" target="_blank" rel="noopener noreferrer" className="ad-sb-logo ad-sb-logo-button" aria-label="MyRoad India website">
          <img src={logo} alt={t("admin_dashboard.brand")} />
        </a>
        <div><b>{t("admin_dashboard.brand")}</b><span>{t("admin_dashboard.portal")}</span></div>
      </div>
      <div className="ad-sb-label">{t("admin_dashboard.overview")}</div>
      <nav className="ad-sb-nav">
        <button type="button" className={`ad-sb-link ${activeNav === "dashboard" ? "active" : ""}`} onClick={() => { returnToDashboard(); scrollTo("ad-top"); }}><span className="ad-sb-text">📊 {t("admin_dashboard.system_overview")}</span></button>
        <button type="button" className={`ad-sb-link ${activeNav === "profile" ? "active" : ""}`} onClick={() => selectView("profile", setShowProfile)}><span className="ad-sb-text">👤 {t("admin_dashboard.my_profile")}</span></button>
      </nav>
      <div className="ad-sb-label">{t("admin_dashboard.management")}</div>
      <nav className="ad-sb-nav">
        <button type="button" className={`ad-sb-link ${activeNav === "staff-verifier" ? "active" : ""}`} onClick={() => { if (users.length > 0) { setSelectedUserProfile(users[0]); selectView("staff-verifier", setShowStaffVerifierProfile); } }}><span className="ad-sb-text">👥 {t("admin_dashboard.staff_verifier_profile")}</span><span className="ad-sb-badge">{users.length}</span></button>



        <button type="button" className={`ad-sb-link ${activeNav === "admin-management" ? "active" : ""}`} onClick={() => selectView("admin-management", setShowAdminManagement)}><span className="ad-sb-text">⚙️ {t("admin_dashboard.admin_management")}</span><span className="ad-sb-badge">{admins.length}</span></button>
            <button type="button" className={`ad-sb-link ad-sb-sublink ${activeNav === "complaint-management" ? "active" : ""}`} onClick={() => selectView("complaint-management", setShowComplaintManagement)}><span className="ad-sb-text">⚙️ {t("admin_dashboard.complaint_management")}</span><span className="ad-sb-badge">{complaints.length}</span></button>


        <button type="button" className={`ad-sb-link ad-sb-parent ${complaintsMenuOpen ? "open" : ""} ${complaintNavKeys.includes(activeNav) ? "has-active" : ""}`} aria-expanded={complaintsMenuOpen} onClick={() => setComplaintsMenuOpen((prev) => !prev)}>
          <span className="ad-sb-text" style={{ display: "flex", alignItems: "center", gap: "9px", flex: 1 }}>📋 {t("admin_dashboard.complaints")}</span>
          <span className="ad-sb-badge">{complaints.length}</span><span className="ad-sb-chevron">▸</span>
        </button>
        {complaintsMenuOpen && (
          <div className="ad-sb-subnav">




            <button type="button" className={`ad-sb-link ad-sb-sublink ${activeNav === "new-complaints" ? "active" : ""}`} onClick={() => { setSelectedId(null); setComplaintListType("new"); selectView("new-complaints", setShowComplaintDetails); }}><span className="ad-sb-text">📈 {t("admin_dashboard.new_complaints")}</span><span className="ad-sb-badge">{newComplaintCount}</span></button>
            <button type="button" className={`ad-sb-link ad-sb-sublink ${activeNav === "assigned-complaints" ? "active" : ""}`} onClick={() => { setSelectedId(null); setComplaintListType("assigned"); selectView("assigned-complaints", setShowComplaintDetails); }}><span className="ad-sb-text">📋 {t("admin_dashboard.assigned_complaints")}</span><span className="ad-sb-badge">{assignedComplaintCount}</span></button>
            <button type="button" className={`ad-sb-link ad-sb-sublink ${activeNav === "complaint-verification" ? "active" : ""}`} onClick={() => selectView("complaint-verification", setShowComplaintVerification)}><span className="ad-sb-text">✅ {t("admin_dashboard.complaint_verification")}</span><span className="ad-sb-badge">{verificationComplaintCount}</span></button>
            <button type="button" className={`ad-sb-link ad-sb-sublink ${activeNav === "completed-work" ? "active" : ""}`} onClick={() => selectView("completed-work", setShowCompletedWork)}><span className="ad-sb-text">🛠️ {t("completed_work.title")}</span><span className="ad-sb-badge">{completedWorkCount}</span></button>
          </div>
        )}
        <button type="button" className={`ad-sb-link ${activeNav === "staff-monitoring" ? "active" : ""}`} onClick={() => selectView("staff-monitoring", setShowStaffMonitoring)}><span className="ad-sb-text">👷 {t("admin_dashboard.staff_work_monitoring")}</span><span className="ad-sb-badge">{adminStaffOptions.length}</span></button>
      </nav>
      <div className="ad-sb-label">{t("admin_dashboard.insights")}</div>
      <nav className="ad-sb-nav">
        <button type="button" className={`ad-sb-link ${activeNav === "reports" ? "active" : ""}`} onClick={() => selectView("reports", setShowReports)}><span className="ad-sb-text">📈 {t("admin_dashboard.reports_management")}</span></button>
        <button type="button" className={`ad-sb-link ${activeNav === "notifications" ? "active" : ""}`} onClick={() => { setInitialNotification(null); selectView("notifications", setShowNotificationMonitoring); }}><span className="ad-sb-text">🔔 {t("admin_dashboard.notification_monitoring")}</span><span className="ad-sb-badge">{notificationFeed.length}</span></button>
        <button type="button" className="ad-button-link" onClick={handleLogout} style={{ color: "#cf4438", fontWeight: "600", marginTop: "8px" }}>{t("admin_dashboard.logout")}</button>
      </nav>
      <div className="ad-sb-footer">
        <div className="ad-sb-user">
          <div className="ad-sb-avatar">{admin.profilePhoto ? <img src={admin.profilePhoto} alt="Profile" /> : initials}</div>
          <div className="ad-sb-user-info"><b>{admin.name}</b><span>{admin.email}</span></div>
        </div>
        <div className="ad-sb-ward">{admin.role}</div>
      </div>
    </aside>
  );

  const renderWithSidebar = (content) => (
    <div className="ad-shell">
      {sidebarMarkup}
      <div className="ad-main">
        <div className="ad-topbar ad-topbar-end">
          <div className="ad-tb-user">
            <div className="ad-tb-avatar">{admin.profilePhoto ? <img src={admin.profilePhoto} alt="Profile" /> : initials}</div>
            <div><b>{admin.name}</b><span>{admin.role}</span></div>
          </div>
        </div>
        <main className="ad-content ad-subview-content">{content}</main>
      </div>
    </div>
  );

  if (showProfile) return renderWithSidebar(<AdminProfile adminId={admin.staffId || getUserId(storedAdmin)} onBack={returnToDashboard} />);
  if (showComplaintManagement) return renderWithSidebar(<ComplaintManagement onBack={returnToDashboard} />);
  if (showComplaintVerification) return renderWithSidebar(<ComplaintVerification onBack={returnToDashboard} />);
  if (showCompletedWork) return renderWithSidebar(<CompletedWork complaints={complaints} onBack={returnToDashboard} />);
  if (showComplaintDetails) return renderWithSidebar(<ComplaintDetails listType={complaintListType || "new"} key={complaintListType || `detail-${String(complaints.find((complaint) => String(complaint.id) === String(selectedId))?.id || "list")}`} complaint={complaintListType ? null : complaints.find((complaint) => String(complaint.id) === String(selectedId))} staffOptions={adminStaffOptions} verifierOptions={adminVerifierOptions} assignmentsLoading={usersLoading} assignmentsError={usersLoadError} onComplaintUpdated={handleComplaintUpdated} onBack={() => { setSelectedId(null); returnToDashboard(); }} />);
  if (showStaffMonitoring) return renderWithSidebar(<StaffWorkMonitoring onBack={returnToDashboard} />);
  if (showReports) return renderWithSidebar(<ReportsManagement onBack={returnToDashboard} />);
  if (showAdminManagement) return renderWithSidebar(<AdminManagement onBack={returnToDashboard} />);
  if (showStaffVerifierProfile) return renderWithSidebar(<StaffVerifierProfile userId={selectedUserProfile?.id} role={selectedUserProfile?.role || "staff"} usersList={users} onUserUpdated={handleManagedUserUpdated} onBack={() => { setSelectedUserProfile(null); returnToDashboard(); }} />);
  if (showNotificationMonitoring) return renderWithSidebar(<NotificationMonitoring onBack={() => { setInitialNotification(null); returnToDashboard(); }} onOpenComplaint={handleOpenNotificationComplaint} initialNotification={initialNotification} />);

  const lineOptions = { ...chartBaseOptions, plugins: { ...chartBaseOptions.plugins, legend: { position: "top", align: "end", labels: chartBaseOptions.plugins.legend.labels } }, scales: { x: { grid: { display: false }, border: { display: false } }, y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: "#edf2f8" }, border: { display: false } } } };
  const pieOptions = { ...chartBaseOptions, plugins: { ...chartBaseOptions.plugins, legend: { position: "bottom", labels: chartBaseOptions.plugins.legend.labels } } };
  const doughnutOptions = { ...pieOptions, cutout: "68%" };
  const barOptions = { ...chartBaseOptions, plugins: { ...chartBaseOptions.plugins, legend: { display: false } }, scales: { x: { grid: { display: false }, border: { display: false } }, y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: "#edf2f8" }, border: { display: false } } } };

  return (
    <div className="ad-shell">
      {sidebarMarkup}
      <div className="ad-main" id="ad-top">
        <div className="ad-topbar">
          <div className="ad-search">🔍 <input type="text" placeholder={t("admin_dashboard.search_placeholder")} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
          <div className="ad-tb-actions">
            <button type="button" className="ad-icon-btn" aria-label={t("admin_dashboard.notifications_aria")} onClick={() => { setInitialNotification(null); selectView("notifications", setShowNotificationMonitoring); }}>🔔<span className="ad-tb-dot"></span></button>
            <div className="ad-tb-user" id="ad-profile">
              <div className="ad-tb-avatar">{admin.profilePhoto ? <img src={admin.profilePhoto} alt="Profile" /> : initials}</div>
              <div><b>{admin.name}</b><span>{admin.role}</span></div>
            </div>
          </div>
        </div>
        <div className="ad-content">
          <div className="ad-title-row">
            <div><h1>{t("admin_dashboard.system_overview")}</h1><p>{admin.role} · {admin.contact}</p></div>
          </div>
          <div className="ad-stats-row">
            {dashboardSummary.map((stat) => (
              <div className={`ad-stat-card ad-dashboard-stat tone-${stat.tone}`} key={stat.label}>
                <div className="ad-stat-heading"><span className="ad-stat-label">{stat.label}</span><span className="ad-stat-ic" aria-hidden="true">{stat.icon}</span></div>
                <div className="ad-stat-num">{stat.value.toLocaleString()}</div>
              </div>
            ))}
          </div>
          <section className="ad-dashboard-charts" aria-label={t("admin_dashboard.complaint_charts")}>
            <article className="ad-dashboard-chart ad-dashboard-chart-trend">
              <div className="ad-dashboard-chart-head">
                <div><h3>{t("admin_dashboard.complaint_trend")}</h3><p>{t("admin_dashboard.new_resolved_over_time")}</p></div>
                <label className="ad-chart-range">
                  <span className="ad-visually-hidden">{t("admin_dashboard.trend_date_range")}</span>
                  <select value={trendRange} onChange={(event) => setTrendRange(Number(event.target.value))}>
                    <option value={7}>{t("admin_dashboard.last_7_days")}</option>
                    <option value={30}>{t("admin_dashboard.last_30_days")}</option>
                    <option value={90}>{t("admin_dashboard.last_90_days")}</option>
                  </select>
                </label>
              </div>
              <div className="ad-chart-canvas ad-chart-canvas-trend">
                {complaintsLoading ? <div className="ad-chart-empty">{t("admin_dashboard.loading_data")}</div> : complaints.length === 0 ? <div className="ad-chart-empty">{t("admin_dashboard.no_data")}</div> : <Line data={dashboardCharts.trend} options={lineOptions} />}
              </div>
            </article>
            <article className="ad-dashboard-chart">
              <div className="ad-dashboard-chart-head"><div><h3>{t("admin_dashboard.complaints_by_category")}</h3><p>{t("admin_dashboard.share_of_reported")}</p></div></div>
              <div className="ad-chart-canvas ad-chart-canvas-circle">
                {complaintsLoading ? <div className="ad-chart-empty">{t("admin_dashboard.loading_data")}</div> : dashboardCharts.category.labels.length === 0 ? <div className="ad-chart-empty">{t("admin_dashboard.no_category_data")}</div> : <Pie data={dashboardCharts.category} options={pieOptions} />}
              </div>
            </article>
            <article className="ad-dashboard-chart">
              <div className="ad-dashboard-chart-head"><div><h3>{t("admin_dashboard.status_distribution")}</h3><p>{t("admin_dashboard.current_pipeline")}</p></div></div>
              <div className="ad-chart-canvas ad-chart-canvas-circle">
                {complaintsLoading ? <div className="ad-chart-empty">{t("admin_dashboard.loading_data")}</div> : dashboardCharts.status.labels.length === 0 ? <div className="ad-chart-empty">{t("admin_dashboard.no_status_data")}</div> : <Doughnut data={dashboardCharts.status} options={doughnutOptions} />}
              </div>
            </article>
            <article className="ad-dashboard-chart">
              <div className="ad-dashboard-chart-head"><div><h3>{t("admin_dashboard.complaints_by_priority")}</h3><p>{t("admin_dashboard.distribution_across_levels")}</p></div></div>
              <div className="ad-chart-canvas ad-chart-canvas-column">
                {complaintsLoading ? <div className="ad-chart-empty">{t("admin_dashboard.loading_data")}</div> : complaints.length === 0 ? <div className="ad-chart-empty">{t("admin_dashboard.no_priority_data")}</div> : <Bar data={dashboardCharts.priority} options={barOptions} />}
              </div>
            </article>
          </section>
          <VisitorsOverview />
          {userMessage.text && <div className={`ad-message-banner ${userMessage.type}`}>{userMessage.text}</div>}

          {/* ================= STAFF & VERIFIER MANAGEMENT ================= */}
          <div className="ad-panel ad-form-panel" id="user-mgmt">
            <div className="ad-panel-head">
              <h3>{t("admin_dashboard.staff_verifier_management")}</h3>
              <button className="ad-btn-primary small" type="button" onClick={() => { setShowAddUser(true); setEditingUserId(null); setNewUser(emptyUser); }}>
                + {t("admin_dashboard.add_staff_verifier")}
              </button>
            </div>

            {showAddUser && (
              <form className="ad-new-form-vertical" onSubmit={saveUser}>
                <h4>{t(editingUserId ? "admin_dashboard.user_form_edit_title" : "admin_dashboard.user_form_add_title")}</h4>
                <div className="ad-vertical-field">
                  <label>{t("admin_dashboard.form_full_name")}</label>
                  <input type="text" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} required />
                </div>
                <div className="ad-vertical-field">
                  <label>{t("admin_dashboard.form_role")}</label>
                  <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
                    {staffVerifierRoles.map((r) => <option key={r.value} value={r.value}>{t(r.label)}</option>)}
                  </select>
                </div>
                <div className="ad-vertical-field">
                  <label>{t("admin_dashboard.form_contact")}</label>
                  <input type="text" value={newUser.contact} onChange={(e) => setNewUser({ ...newUser, contact: e.target.value })} required />
                </div>
                <div className="ad-vertical-field">
                  <label>{t("admin_dashboard.form_email_address")}</label>
                  <input type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} required />
                </div>
                <div className="ad-vertical-field">
                  <label>{t(editingUserId ? "admin_dashboard.form_new_password_keep_current" : "admin_dashboard.form_password")}</label>
                  <div className="ad-password-row">
                    <input type="text" autoComplete="new-password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} required={!editingUserId} />
                    {!editingUserId && <button type="button" className="ad-btn-outline small" onClick={() => setNewUser({ ...newUser, password: generatePassword() })}>🎲 {t("admin_dashboard.form_generate_password")}</button>}
                  </div>
                </div>
                <div className="ad-form-actions">
                  <button className="ad-btn-outline" type="button" onClick={() => { setShowAddUser(false); setEditingUserId(null); }}>{t("admin_dashboard.form_cancel")}</button>
                  <button className="ad-btn-primary" type="submit">{t(editingUserId ? "admin_dashboard.form_update_user" : "admin_dashboard.form_register_user")} →</button>
                </div>
              </form>
            )}

            <div className="ad-table-wrap">
              {usersLoading ? <div className="ad-loading">{t("admin_dashboard.loading_users")}</div> : (
                <table>
                  <thead><tr><th>{t("admin_dashboard.table_name")}</th><th>{t("admin_dashboard.table_email")}</th><th>{t("admin_dashboard.table_password")}</th><th>{t("admin_dashboard.form_role")}</th><th>{t("admin_dashboard.form_contact")}</th><th>{t("admin_dashboard.table_actions")}</th></tr></thead>
                  <tbody>
                    {users.length === 0 ? <tr><td colSpan={6} style={{ textAlign: "center" }}>{t("admin_dashboard.no_staff_registered")}</td></tr> : users.map((u) => (
                      <React.Fragment key={u.id}>
                        <tr>
                          <td>{u.name}</td>
                          <td>{u.email || "-"}</td>
                          <td>
                            {resettingPasswordId === u.id ? (
                              <div style={{ display: "flex", gap: "8px" }}>
                                <input type="text" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder={t("admin_dashboard.form_new_password_placeholder")} autoFocus />
                                <button className="ad-btn-primary small" onClick={() => resetUserPassword(u.id)}>✓</button>
                                <button className="ad-btn-outline small" onClick={() => { setResettingPasswordId(null); setNewPassword(""); }}>✕</button>
                              </div>
                            ) : (
                              <div style={{ cursor: "pointer" }} onClick={() => { setResettingPasswordId(u.id); setNewPassword(""); }}>{t("admin_dashboard.password_reset_action")}</div>
                            )}
                          </td>
                          <td><span className={`ad-badge ad-badge-${roleTone[u.role]}`}>{t(u.role === "staff" ? "admin_dashboard.role_staff" : "admin_dashboard.role_verifier")}</span></td>
                          <td>{u.contact}</td>
                          <td>
                            <button className="ad-btn-outline small" onClick={() => editUser(u)}>✏️</button>
                            <button className="ad-icon-btn small danger" onClick={() => setConfirmDeleteUserId(u.id)}>🗑️</button>
                          </td>
                        </tr>
                        {confirmDeleteUserId === u.id && (
                          <tr className="ad-edit-row"><td colSpan={6}>
                            <div className="ad-delete-confirm">
                              <span>{t("admin_dashboard.confirm_remove_user", { name: u.name })}</span>
                              <div>
                                <button className="ad-btn-outline small" onClick={() => setConfirmDeleteUserId(null)}>{t("admin_dashboard.button_no")}</button>
                                <button className="ad-btn-danger small" onClick={() => deleteUser(u.id)}>{t("admin_dashboard.button_yes_remove")}</button>
                              </div>
                            </div>
                          </td></tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* ================= ADMIN MANAGEMENT ================= */}
          <div className="ad-panel ad-form-panel" id="admin-mgmt">
            <div className="ad-panel-head">
              <h3>{t("admin_dashboard.admin_management")}</h3>
              <button className="ad-btn-primary small" type="button" onClick={() => { setShowAddAdmin(true); setEditingAdminId(null); setNewAdmin(emptyAdmin); }}>
                + {t("admin_dashboard.add_admin")}
              </button>
            </div>

            {showAddAdmin && (
              <form className="ad-new-form-vertical" onSubmit={saveAdmin}>
                <h4>{t(editingAdminId ? "admin_dashboard.admin_form_edit_title" : "admin_dashboard.admin_form_add_title")}</h4>
                <div className="ad-vertical-field"><label>{t("admin_dashboard.form_full_name")}</label><input type="text" value={newAdmin.name} onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })} required /></div>
                <div className="ad-vertical-field"><label>{t("admin_dashboard.form_contact")}</label><input type="text" value={newAdmin.contact} onChange={(e) => setNewAdmin({ ...newAdmin, contact: e.target.value })} required /></div>
                <div className="ad-vertical-field"><label>{t("admin_dashboard.form_email")}</label><input type="email" value={newAdmin.email} onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })} required /></div>
                <div className="ad-vertical-field">
                  <label>{t(editingAdminId ? "admin_dashboard.form_new_password_keep_current" : "admin_dashboard.form_password")}</label>
                  <div className="ad-password-row">
                    <input type="text" autoComplete="new-password" value={newAdmin.password} onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })} required={!editingAdminId} />
                    {!editingAdminId && <button type="button" className="ad-btn-outline small" onClick={() => setNewAdmin({ ...newAdmin, password: generatePassword() })}>🎲 {t("admin_dashboard.form_generate_password")}</button>}
                  </div>
                </div>
                <div className="ad-form-actions">
                  <button className="ad-btn-outline" type="button" onClick={() => { setShowAddAdmin(false); setEditingAdminId(null); }}>{t("admin_dashboard.form_cancel")}</button>
                  <button className="ad-btn-primary" type="submit">{t(editingAdminId ? "admin_dashboard.form_update_admin" : "admin_dashboard.form_register_admin")} →</button>
                </div>
              </form>
            )}

            <div className="ad-table-wrap">
              {adminsLoading ? <div className="ad-loading">{t("admin_dashboard.loading_admins")}</div> : (
                <table>
                  <thead><tr><th>{t("admin_dashboard.table_name")}</th><th>{t("admin_dashboard.table_email")}</th><th>{t("admin_dashboard.table_password")}</th><th>{t("admin_dashboard.form_role")}</th><th>{t("admin_dashboard.form_contact")}</th><th>{t("admin_dashboard.table_actions")}</th></tr></thead>
                  <tbody>
                    {admins.length === 0 ? <tr><td colSpan={6} style={{ textAlign: "center" }}>{t("admin_dashboard.no_admins_registered")}</td></tr> : admins.map((a) => (
                      <React.Fragment key={a.id}>
                        <tr>
                          <td>{a.name}</td>
                          <td>{a.email || "-"}</td>
                          <td>
                            {resettingAdminPasswordId === a.id ? (
                              <div style={{ display: "flex", gap: "8px" }}>
                                <input type="text" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder={t("admin_dashboard.form_new_password_placeholder")} autoFocus />
                                <button className="ad-btn-primary small" onClick={() => resetAdminPassword(a.id)}>✓</button>
                                <button className="ad-btn-outline small" onClick={() => { setResettingAdminPasswordId(null); setNewPassword(""); }}>✕</button>
                              </div>
                            ) : (
                              <div style={{ cursor: "pointer" }} onClick={() => { setResettingAdminPasswordId(a.id); setNewPassword(""); }}>{t("admin_dashboard.password_reset_action")}</div>
                            )}
                          </td>
                          <td><span className={`ad-badge ad-badge-${roleTone[a.role]}`}>{t("admin_dashboard.role_admin")}</span></td>
                          <td>{a.contact}</td>
                          <td>
                            <button className="ad-btn-outline small" onClick={() => editAdmin(a)}>✏️</button>
                            <button className="ad-icon-btn small danger" onClick={() => setConfirmDeleteAdminId(a.id)}>🗑️</button>
                          </td>
                        </tr>
                        {confirmDeleteAdminId === a.id && (
                          <tr className="ad-edit-row"><td colSpan={6}>
                            <div className="ad-delete-confirm">
                              <span>{t("admin_dashboard.confirm_remove_admin", { name: a.name })}</span>
                              <div>
                                <button className="ad-btn-outline small" onClick={() => setConfirmDeleteAdminId(null)}>{t("admin_dashboard.button_no")}</button>
                                <button className="ad-btn-danger small" onClick={() => deleteAdmin(a.id)}>{t("admin_dashboard.button_yes_remove")}</button>
                              </div>
                            </div>
                          </td></tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* ================= ALL COMPLAINTS (TABLE VIEW) ================= */}
          <div className="ad-panel ad-form-panel" id="complaint-mgmt">
            <div className="ad-panel-head">
              <h3>{t("admin_dashboard.all_complaints_title")}</h3>
              <span className="ad-panel-link">{t("admin_dashboard.total_complaints_count", { count: filteredComplaints.length })}</span>
            </div>
            <div className="ad-filter-row">
              <input type="text" placeholder={t("admin_dashboard.complaints_search_placeholder")} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }} />
              <select className="ad-inline-select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                {categories.map((c) => <option key={c} value={c}>{c === "All" ? t("admin_dashboard.filter_all_categories") : t(c, { defaultValue: c })}</option>)}
              </select>
              <select className="ad-inline-select" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
                <option value="All">{t("admin_dashboard.filter_all_priorities")}</option>
                {priorityOptions.map((p) => <option key={p} value={p}>{t(`admin_dashboard.priority_${p.toLowerCase()}`, { defaultValue: p })}</option>)}
              </select>
            </div>

            {assignmentError && <div className="ad-assignment-error" role="alert">{assignmentError}</div>}
            {pdfMessage.text && (
              <div className={`ad-pdf-message ${pdfMessage.type}`} role="alert">
                {pdfMessage.text}
              </div>
            )}

            <div className="ad-table-wrap">
              {complaintsLoading ? <div className="ad-loading">{t("admin_dashboard.loading_complaints")}</div> : (
                <table className="ad-all-complaints-table" id="all-complaints-table">
                  <colgroup>
                    <col className="ad-col-complaint" />
                    <col className="ad-col-category" />
                    <col className="ad-col-location" />
                    <col className="ad-col-status" />
                    <col className="ad-col-staff-assignee" />
                    <col className="ad-col-verifier-assignee" />
                    <col className="ad-col-action" />
                    <col className="ad-col-pdf" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>{t("admin_dashboard.complaints_col_number")}</th>
                      <th>{t("admin_dashboard.complaints_col_category")}</th>
                      <th>{t("admin_dashboard.complaints_col_location")}</th>
                      <th>{t("admin_dashboard.complaints_col_status")}</th>
                      <th>{t("admin_dashboard.complaints_col_assign_staff")}</th>
                      <th>{t("admin_dashboard.complaints_col_assign_verifier")}</th>
                      <th>{t("admin_dashboard.complaints_col_action")}</th>
                      <th>{t("admin_dashboard.complaints_col_pdf")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredComplaints.length === 0 ? <tr><td colSpan={8} style={{ textAlign: "center" }}>{t("admin_dashboard.no_complaints_found")}</td></tr> : visibleComplaints.map((c) => {
                      const tableStatus = getComplaintTableStatus(c);
                      const tableStatusKey = tableStatus.toLowerCase().replace(/\s+/g, "_");
                      return (
                      <React.Fragment key={c.id}>
                        <tr className={String(selectedId) === String(c.id) ? "ad-row-active" : ""} onClick={() => setSelectedId(c.id)}>
                          <td className="ad-mono">{c.complaintNumber}</td>
                          <td><div className="ad-cat"><span className="ad-cat-dot" style={{ background: colorForCategory(c.category) }}></span>{t(c.category, { defaultValue: c.category })}</div></td>
                          <td>{getLocationString(c.location)}</td>
                          <td><span className={`ad-badge ad-badge-${getComplaintTableStatusTone(tableStatus)}`}>{t(`admin_dashboard.complaint_table_status_${tableStatusKey}`, { defaultValue: tableStatus })}</span></td>

                          <td onClick={(e) => e.stopPropagation()}>
                            {tableStatus === "Rejected" && (c.assignedStaff || c.assignedStaffId) ? (
                              <span>
                                {c.assignedStaff || adminStaffOptions.find((user) => String(user.id) === String(c.assignedStaffId))?.name || c.assignedStaffId}
                              </span>
                            ) : (
                              <select className="ad-assignment-select" value={getStaffAccountId(c)} disabled={usersLoading || assignmentSavingKey === String(c.id)} onChange={(e) => handleInlineAssignment(c, "staff", e.target.value)}>
                                <option value="">{t("admin_dashboard.complaints_unassigned")}</option>
                                {adminStaffOptions.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                              </select>
                            )}
                          </td>
                          <td onClick={(e) => e.stopPropagation()}>
                            <select className="ad-assignment-select" value={getVerifierAccountId(c)} disabled={usersLoading || assignmentSavingKey === String(c.id)} onChange={(e) => handleInlineAssignment(c, "verifier", e.target.value)}>
                              <option value="">{t("admin_dashboard.complaints_unassigned")}</option>
                              {adminVerifierOptions.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                          </td>
                          <td onClick={(e) => e.stopPropagation()}>
                            <div className="ad-action-buttons">
                              <button className="ad-btn-primary small" onClick={() => { setSelectedId(c.id); setComplaintListType(null); selectView("complaint-detail", setShowComplaintDetails); }}>{t("admin_dashboard.complaints_view_details")}</button>
                              {c.status === "New" && <button className="ad-action-delete-btn" type="button" onClick={() => setConfirmDeleteComplaintId(c.id)}>{t("admin_dashboard.complaints_delete")}</button>}
                            </div>
                          </td>
                          <td onClick={(event) => event.stopPropagation()}>
                            <div className="ad-pdf-actions">
                              <button className="ad-pdf-btn" type="button" onClick={() => handleGenerateComplaintPdf(c, "en")} disabled={Boolean(pdfGeneratingId)}>
                                {pdfGeneratingId === String(c.id) ? "..." : "EN"}
                              </button>
                              <button className="ad-pdf-btn" type="button" onClick={() => handleGenerateComplaintPdf(c, "mr")} disabled={Boolean(pdfGeneratingId)}>
                                {pdfGeneratingId === String(c.id) ? "..." : "मराठी"}
                              </button>
                            </div>
                          </td>
                        </tr>
                        {confirmDeleteComplaintId === c.id && (
                          <tr className="ad-edit-row"><td colSpan={8}>
                            <div className="ad-delete-confirm">
                              <span>{t("admin_dashboard.confirm_remove_complaint", { number: c.complaintNumber })}</span>
                              <div>
                                <button className="ad-btn-outline small" onClick={() => setConfirmDeleteComplaintId(null)}>{t("admin_dashboard.button_no")}</button>
                                <button className="ad-btn-danger small" onClick={() => deleteComplaint(c.id)}>{t("admin_dashboard.button_yes_remove")}</button>
                              </div>
                            </div>
                          </td></tr>
                        )}
                      </React.Fragment>
                    );})}
                  </tbody>
                </table>
              )}
            </div>
            {!complaintsLoading && filteredComplaints.length > INITIAL_COMPLAINT_TABLE_ROWS && (
              <div className="ad-table-footer">
                <button
                  className="ad-btn-outline small"
                  type="button"
                  aria-controls="all-complaints-table"
                  aria-expanded={showAllComplaints}
                  onClick={() => setShowAllComplaints((isShowingAll) => !isShowingAll)}
                >
                  {showAllComplaints ? t("admin_dashboard.complaints_view_less") : t("admin_dashboard.complaints_view_more")}
                </button>
              </div>
            )}
          </div>

          {/* ================= MAP DASHBOARD (BOTTOM OF PAGE) ================= */}
          <div className="ad-panel ad-form-panel" id="map-dashboard">
            <div className="ad-panel-head">
              <h3>🗺️ {t("admin_dashboard.map_dashboard_complaint_locations")}</h3>
              <span className="ad-panel-link">{t("admin_dashboard.complaints_on_map", { count: filteredMapComplaints.length })}</span>
            </div>

            <div style={{ display: "flex", gap: "16px", marginBottom: "12px", fontSize: "0.85rem", flexWrap: "wrap" }}>
              <span>📍 {t("admin_dashboard.map_red_pins_legend")}</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <i className="verification-map-legend-pin" aria-hidden="true" />
                {t("admin_dashboard.map_verification_pins_legend")}
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <i className="rework-map-legend-pin" aria-hidden="true" />
                {t("admin_dashboard.map_rework_pins_legend")}
              </span>
              <span style={{ marginLeft: "auto", color: "#666" }}>💡 {t("admin_dashboard.map_click_pin_legend")}</span>
            </div>

            {boundaryError && (
              <div className="ad-assignment-error" role="alert">
                {t("admin_dashboard.map_boundary_load_error")}
              </div>
            )}
            <AdminComplaintsMap
              complaints={filteredMapComplaints}
              center={defaultCenter}
              boundaryGeoJson={boundaryGeoJson}
              translate={t}
              staffOptions={adminStaffOptions}
              staffLoadError={usersLoadError}
              onAssignStaff={(complaint, staffId) =>
                handleInlineAssignment(complaint, "staff", staffId)
              }
              assignmentSavingKey={assignmentSavingKey}
              staffLoading={usersLoading}
              onGeneratePdf={handleGenerateComplaintPdf}
              onShareMarathiPdf={handleShareMarathiComplaintPdf}
              pdfGeneratingId={pdfGeneratingId}
              onVerifyComplaint={handleMapVerificationDecision}
              reportedRange={mapReportedRange}
              onReportedRangeChange={setMapReportedRange}
              mapStatusFilter={mapStatusFilter}
              onMapStatusFilterChange={setMapStatusFilter}
              statusOptions={statusOptions}
              onResetFilters={resetMapFilters}
            />

            {missingCoordinateCount > 0 && (
              <div style={{ marginTop: "16px", padding: "12px", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: "6px" }}>
                <strong style={{ color: "#c2410c" }}>⚠️ {t("admin_dashboard.map_missing_coordinates", { count: missingCoordinateCount })}</strong>
                <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "#666" }}>{t("admin_dashboard.map_missing_coordinates_note")}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;