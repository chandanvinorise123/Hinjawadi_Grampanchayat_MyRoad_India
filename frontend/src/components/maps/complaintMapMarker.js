export const markerGlyphForComplaint = (complaint = {}) => {
  const issue = `${complaint.category || ""} ${complaint.issue || ""} ${complaint.issueType || ""}`.toLowerCase();

  if (/water|pipeline|leak|pressure|tap|contaminat/.test(issue)) return "≈";
  if (/sewer|drain|manhole|choked|sewage/.test(issue)) return "≋";
  if (/streetlight|street light|light|pole/.test(issue)) return "✦";
  if (/safety|signboard|signage|speed breaker|dangerous|curve/.test(issue)) return "!";
  if (/bridge|culvert|railing/.test(issue)) return "⌒";
  if (/pothole|crack|damaged road|road issue|road/.test(issue)) return "↔";
  return "•";
};

export const getComplaintMapPinType = (complaint = {}) => {
  const status = String(complaint.status || "").trim().toLowerCase();
  if (["resolved", "closed"].includes(status)) return "resolved";
  if (
    complaint.assignedStaff ||
    complaint.assignedStaffId ||
    ["assigned", "assigned to staff/officer", "under action", "in progress", "action initiated"].includes(status)
  ) {
    return "assigned";
  }
  return "open";
};

export const getComplaintMapMarkerSvg = (
  complaint,
  pinTypeOverride,
  dimensional = false
) => {
  const glyph = markerGlyphForComplaint(complaint);
  const pinType = pinTypeOverride || getComplaintMapPinType(complaint);
  const pinColor = {
    open: "#e11d2e",
    assigned: "#e0a800",
    resolved: "#16803c",
  }[pinType];
  const glyphColor = {
    open: "#b01827",
    assigned: "#8a6500",
    resolved: "#12632f",
  }[pinType];
  if (dimensional) {
    const lightColor = {
      open: "#ff7580",
      assigned: "#ffe16b",
      resolved: "#62d78b",
    }[pinType];
    const darkColor = {
      open: "#a90d1c",
      assigned: "#a86e00",
      resolved: "#07552b",
    }[pinType];
    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="52" height="66" viewBox="0 0 52 66">
        <defs>
          <linearGradient id="pin-${pinType}" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="${lightColor}"/>
            <stop offset="0.48" stop-color="${pinColor}"/>
            <stop offset="1" stop-color="${darkColor}"/>
          </linearGradient>
          <filter id="pin-shadow" x="-30%" y="-20%" width="160%" height="160%">
            <feDropShadow dx="0" dy="3" stdDeviation="2.2" flood-color="#10243b" flood-opacity=".38"/>
          </filter>
        </defs>
        <path
          d="M26 63C21.8 56.5 4 38.4 4 24a22 22 0 1 1 44 0c0 14.4-17.8 32.5-22 39Z"
          fill="url(#pin-${pinType})"
          stroke="#ffffff"
          stroke-width="2.5"
          stroke-linejoin="round"
          filter="url(#pin-shadow)"
        />
        <path
          d="M26 6.5A17.5 17.5 0 0 0 8.5 24c0 2.1.4 4.3 1.1 6.5"
          fill="none"
          stroke="#ffffff"
          stroke-width="2"
          stroke-linecap="round"
          opacity=".6"
        />
        <circle cx="26" cy="24" r="15.5" fill="#ffffff" stroke="${darkColor}" stroke-opacity=".2" stroke-width="1"/>
        <circle cx="26" cy="24" r="12.5" fill="#f8fafc"/>
        <text
          x="26"
          y="29"
          text-anchor="middle"
          font-family="Arial,sans-serif"
          font-size="16"
          font-weight="700"
          fill="${glyphColor}"
        >${glyph}</text>
        <ellipse cx="26" cy="61.5" rx="4.5" ry="1.5" fill="#10243b" opacity=".18"/>
      </svg>
    `;
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="44" height="56" viewBox="0 0 44 56">
      <path d="M22 54C18.7 48.8 3 32.8 3 21a19 19 0 1 1 38 0c0 11.8-15.7 27.8-19 33Z"
        fill="${pinColor}" stroke="#ffffff" stroke-width="2"/>
      <circle cx="22" cy="21" r="13" fill="#ffffff"/>
      <text x="22" y="26" text-anchor="middle" font-family="Arial,sans-serif"
        font-size="16" font-weight="700" fill="${glyphColor}">${glyph}</text>
    </svg>
  `;
};

export const getComplaintMapMarkerIcon = (
  complaint,
  maps = window.google?.maps,
  pinTypeOverride,
  dimensional = false
) => {
  if (!maps?.Size || !maps?.Point) return undefined;

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(getComplaintMapMarkerSvg(complaint, pinTypeOverride, dimensional))}`,
    scaledSize: dimensional ? new maps.Size(52, 66) : new maps.Size(44, 56),
    anchor: dimensional ? new maps.Point(26, 63) : new maps.Point(22, 54),
  };
};
