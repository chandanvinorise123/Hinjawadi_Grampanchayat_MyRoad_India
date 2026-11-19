import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { API_BASE_URL, toMediaUrl } from "../utils/dashboardApi";
import { generateComplaintPdf } from "../dashboard/admindashboard";
import "./ComplaintPdfView.css";

const ComplaintPdfView = () => {
  const { complaintNumber = "" } = useParams();
  const [searchParams] = useSearchParams();
  const language = searchParams.get("language") === "mr" ? "mr" : "en";
  const [complaint, setComplaint] = useState(null);
  const [pdfUrl, setPdfUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [photoNotice, setPhotoNotice] = useState("");

  useEffect(() => {
    let active = true;
    let objectUrl = "";

    const loadComplaintPdf = async () => {
      setLoading(true);
      setError("");
      setPhotoNotice("");
      setComplaint(null);
      setPdfUrl("");

      try {
        const response = await fetch(
          `${API_BASE_URL}/complaints/track/${encodeURIComponent(complaintNumber)}`
        );
        const result = await response.json().catch(() => null);
        if (!response.ok || !result?.success || !result.data) {
          throw new Error(result?.message || "Could not load this complaint PDF.");
        }

        if (active) setComplaint(result.data);
        const { pdfBlob, photoStatus } = await generateComplaintPdf(
          result.data,
          language,
          { download: false }
        );
        if (!active) return;

        objectUrl = URL.createObjectURL(pdfBlob);
        setPdfUrl(objectUrl);
        if (photoStatus === "failed") {
          setPhotoNotice("The PDF opened, but its complaint photo could not be loaded.");
        } else if (photoStatus === "partial") {
          setPhotoNotice("The PDF opened, but one or more before/after photos are missing or unavailable.");
        } else if (photoStatus === "missing") {
          setPhotoNotice("No complaint photo was attached to this record.");
        }
      } catch (loadError) {
        console.error("Failed to open complaint PDF from QR code:", loadError);
        if (active) setError(loadError.message || "Could not load this complaint PDF.");
      } finally {
        if (active) setLoading(false);
      }
    };

    loadComplaintPdf();
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [complaintNumber, language]);

  const isMarathi = language === "mr";
  const labels = isMarathi
    ? {
        category: "समस्येचा प्रकार",
        status: "स्थिती",
        priority: "प्राधान्य",
        location: "ठिकाण",
        coordinates: "GPS निर्देशांक",
        description: "तक्रारीचा तपशील",
        image: "तक्रारीचे छायाचित्र",
        openMap: "Google Maps वर ठिकाण उघडा",
        noMap: "ठिकाणाची माहिती उपलब्ध नाही",
        noDescription: "तपशील उपलब्ध नाही",
      }
    : {
        category: "Issue category",
        status: "Status",
        priority: "Priority",
        location: "Location",
        coordinates: "GPS coordinates",
        description: "Complaint details",
        image: "Complaint image",
        openMap: "Open location in Google Maps",
        noMap: "Location details are not available",
        noDescription: "No description provided",
      };
  const coordinates = complaint?.coordinates || {};
  const latitude = complaint?.lat ?? coordinates.latitude;
  const longitude = complaint?.lng ?? coordinates.longitude;
  const hasCoordinates =
    latitude !== null &&
    latitude !== undefined &&
    latitude !== "" &&
    longitude !== null &&
    longitude !== undefined &&
    longitude !== "" &&
    Number.isFinite(Number(latitude)) &&
    Number.isFinite(Number(longitude)) &&
    Number(latitude) >= -90 &&
    Number(latitude) <= 90 &&
    Number(longitude) >= -180 &&
    Number(longitude) <= 180;
  const locationValue =
    typeof complaint?.location === "object"
      ? complaint.location?.address || ""
      : complaint?.location || "";
  const mapQuery = hasCoordinates
    ? `${latitude},${longitude}`
    : locationValue && locationValue !== "Location pending"
      ? locationValue
      : "";
  const mapUrl = mapQuery
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`
    : "";
  const imageEntry = Array.isArray(complaint?.images) ? complaint.images[0] : "";
  const imagePath =
    typeof imageEntry === "string"
      ? imageEntry
      : imageEntry?.url || imageEntry?.path || imageEntry?.imageUrl || "";
  const complaintImageUrl = imagePath ? toMediaUrl(imagePath) : "";
  const priorityLabels = isMarathi
    ? { Critical: "उच्च", Urgent: "तातडीचे", Normal: "सामान्य" }
    : { Critical: "HIGH", Urgent: "URGENT", Normal: "NORMAL" };
  const displayedPriority =
    priorityLabels[complaint?.priority] || complaint?.priority || "—";

  return (
    <main className="complaint-pdf-view">
      <header className="complaint-pdf-view__header">
        <div>
          <span>MYROAD INDIA · HINJAWADI</span>
          <h1>{isMarathi ? "तक्रार कार्यादेश" : "Complaint work order"}</h1>
          <p>{complaintNumber}</p>
        </div>
        {pdfUrl && (
          <div className="complaint-pdf-view__actions">
            <a href={pdfUrl} target="_blank" rel="noreferrer">
              {isMarathi ? "PDF उघडा" : "Open PDF"}
            </a>
            <a href={pdfUrl} download={`MyRoad_Complaint_${complaintNumber}.pdf`}>
              {isMarathi ? "PDF डाउनलोड करा" : "Download PDF"}
            </a>
          </div>
        )}
      </header>

      {loading && <p className="complaint-pdf-view__status" role="status">{isMarathi ? "PDF तयार होत आहे…" : "Preparing the complaint PDF…"}</p>}
      {error && <p className="complaint-pdf-view__error" role="alert">{error}</p>}
      {photoNotice && <p className="complaint-pdf-view__notice" role="status">{photoNotice}</p>}
      {complaint && (
        <section className="complaint-pdf-view__details" aria-label={labels.description}>
          <div className="complaint-pdf-view__facts">
            <div>
              <span>{labels.category}</span>
              <strong>{complaint.category || complaint.issueType || complaint.issue || "—"}</strong>
            </div>
            <div>
              <span>{labels.status}</span>
              <strong>{complaint.status || "—"}</strong>
            </div>
            <div>
              <span>{labels.priority}</span>
              <strong>{displayedPriority}</strong>
            </div>
            <div>
              <span>{labels.location}</span>
              <strong>{locationValue || "—"}</strong>
            </div>
            {hasCoordinates && (
              <div>
                <span>{labels.coordinates}</span>
                <strong>{Number(latitude).toFixed(6)}, {Number(longitude).toFixed(6)}</strong>
              </div>
            )}
          </div>
          <div className="complaint-pdf-view__description">
            <h2>{labels.description}</h2>
            <p>{complaint.description || labels.noDescription}</p>
          </div>
          {complaintImageUrl && (
            <div className="complaint-pdf-view__photo">
              <h2>{labels.image}</h2>
              <img src={complaintImageUrl} alt={labels.image} />
            </div>
          )}
          <div className="complaint-pdf-view__map">
            {mapUrl ? (
              <>
                <a href={mapUrl} target="_blank" rel="noopener noreferrer">
                  {labels.openMap}
                </a>
                <a className="complaint-pdf-view__map-url" href={mapUrl} target="_blank" rel="noopener noreferrer">
                  {mapUrl}
                </a>
              </>
            ) : (
              <p>{labels.noMap}</p>
            )}
          </div>
        </section>
      )}
      {pdfUrl && (
        <iframe
          className="complaint-pdf-view__frame"
          src={pdfUrl}
          title={isMarathi ? "तक्रारीचा PDF" : "Complaint PDF"}
        />
      )}
    </main>
  );
};

export default ComplaintPdfView;
