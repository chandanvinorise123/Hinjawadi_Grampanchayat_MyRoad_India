import React, { useState } from "react";
import "./ComplaintMapPdfActions.css";

const WHATSAPP_PHONE_WITH_COUNTRY_CODE = "919325694255";

const DownloadIcon = () => (
  <svg
    aria-hidden="true"
    focusable="false"
    viewBox="0 0 24 24"
    className="complaint-map-action-icon"
  >
    <path d="M12 3v11m0 0 4-4m-4 4-4-4M5 18v3h14v-3" />
  </svg>
);

const WhatsAppIcon = () => (
  <svg
    aria-hidden="true"
    focusable="false"
    viewBox="0 0 24 24"
    className="complaint-map-action-icon"
  >
    <path d="M20.2 11.5a8.2 8.2 0 0 1-12.1 7.2L4 20l1.3-4.1a8.2 8.2 0 1 1 14.9-4.4Z" />
    <path d="M8.2 7.7c.2-.3.4-.4.7-.4h.5c.2 0 .4.1.5.4l.7 1.6c.1.2.1.4 0 .6l-.5.6c-.2.2-.2.4-.1.6.4.7 1.1 1.4 1.8 1.8.2.1.4.1.6-.1l.6-.6c.2-.2.4-.2.6-.1l1.6.7c.2.1.4.3.4.5 0 .6-.3 1.2-.7 1.5-.5.4-1.1.5-1.7.4-1-.2-2.3-.8-3.5-2-1.1-1.1-1.8-2.5-2-3.5-.1-.7 0-1.2.5-2Z" />
  </svg>
);

const ComplaintMapPdfActions = ({
  complaint,
  onGeneratePdf,
  onShareMarathiPdf,
  generatingId = "",
  translate = (key) => key,
}) => {
  const [error, setError] = useState("");
  const [shareNotice, setShareNotice] = useState("");
  const complaintId = String(complaint?.id || complaint?._id || "");
  const isGenerating = Boolean(generatingId);

  const generate = async (language) => {
    setError("");
    setShareNotice("");
    try {
      await onGeneratePdf(complaint, language);
    } catch (generateError) {
      setError(generateError.message || "Could not generate the complaint PDF.");
    }
  };

  const shareMarathiPdfOnWhatsApp = async () => {
    setError("");
    setShareNotice("");
    const message = translate("admin_dashboard.map_whatsapp_prefill_message", {
      complaintNumber: complaint?.complaintNumber || "complaint",
    });
    const whatsappUrl =
      `https://wa.me/${WHATSAPP_PHONE_WITH_COUNTRY_CODE}?text=${encodeURIComponent(message)}`;
    const whatsappWindow = window.open(whatsappUrl, "_blank");
    if (!whatsappWindow) {
      setError(translate("admin_dashboard.map_whatsapp_open_error"));
      return;
    }
    whatsappWindow.opener = null;

    try {
      await onShareMarathiPdf(complaint);
      setShareNotice(translate("admin_dashboard.map_whatsapp_download_notice"));
    } catch (shareError) {
      whatsappWindow.close();
      setError(
        shareError.message ||
          translate("admin_dashboard.map_whatsapp_pdf_error")
      );
    }
  };

  if (!onGeneratePdf) return null;

  return (
    <div className="complaint-map-pdf-actions" aria-label="Download complaint PDF">
      <button
        type="button"
        disabled={isGenerating}
        aria-label={`Download English PDF for ${complaint?.complaintNumber || "complaint"}`}
        onClick={() => generate("en")}
      >
        <DownloadIcon />
        {generatingId === complaintId ? "..." : "EN PDF"}
      </button>
      <button
        type="button"
        disabled={isGenerating}
        aria-label={`Download Marathi PDF for ${complaint?.complaintNumber || "complaint"}`}
        onClick={() => generate("mr")}
      >
        <DownloadIcon />
        {generatingId === complaintId ? "..." : "मराठी PDF"}
      </button>
      {onShareMarathiPdf && (
        <button
          className="whatsapp-share-button"
          type="button"
          disabled={isGenerating}
          aria-label={translate(
            "admin_dashboard.map_whatsapp_button_aria",
            { complaintNumber: complaint?.complaintNumber || "complaint" }
          )}
          onClick={shareMarathiPdfOnWhatsApp}
        >
          <WhatsAppIcon />
          WhatsApp
        </button>
      )}
      {error && <p role="alert">{error}</p>}
      {shareNotice && (
        <p className="whatsapp-share-notice" role="status">
          {shareNotice}
        </p>
      )}
    </div>
  );
};

export default ComplaintMapPdfActions;
