import React, { useState } from "react";
import { toMediaUrl } from "../utils/dashboardApi";
import "./ComplaintImage.css";

const ComplaintImage = ({ src, alt, className = "", fallbackClassName = "" }) => {
  const [failedSrc, setFailedSrc] = useState(null);

  if (!src || failedSrc === src) {
    return (
      <div className={`vci-fallback ${fallbackClassName}`} role="img" aria-label={`${alt}: unavailable`}>
        <span aria-hidden="true">📷</span>
        <span>Photo unavailable</span>
      </div>
    );
  }

  return (
    <img
      src={toMediaUrl(src)}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setFailedSrc(src)}
    />
  );
};

export default ComplaintImage;
