import React, { useState } from "react";
import { toMediaUrl } from "../utils/dashboardApi";
import "./ComplaintImage.css";

const ComplaintImage = ({ src, alt, className = "", fallbackClassName = "" }) => {
  const [failedSrc, setFailedSrc] = useState(null);
  const imagePath =
    typeof src === "string" ? src : src?.url || src?.path || src?.imageUrl || "";

  if (!imagePath || failedSrc === imagePath) {
    return (
      <div className={`vci-fallback ${fallbackClassName}`} role="img" aria-label={`${alt}: unavailable`}>
        <span aria-hidden="true">📷</span>
        <span>Photo unavailable</span>
      </div>
    );
  }

  return (
    <img
      src={toMediaUrl(imagePath)}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setFailedSrc(imagePath)}
    />
  );
};

export default ComplaintImage;
