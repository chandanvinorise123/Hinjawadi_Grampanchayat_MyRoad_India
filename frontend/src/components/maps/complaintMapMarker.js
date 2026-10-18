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

export const getComplaintMapMarkerSvg = (complaint) => {
  const glyph = markerGlyphForComplaint(complaint);
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="44" height="56" viewBox="0 0 44 56">
      <path d="M22 54C18.7 48.8 3 32.8 3 21a19 19 0 1 1 38 0c0 11.8-15.7 27.8-19 33Z"
        fill="#e11d2e" stroke="#ffffff" stroke-width="2"/>
      <circle cx="22" cy="21" r="13" fill="#ffffff"/>
      <text x="22" y="26" text-anchor="middle" font-family="Arial,sans-serif"
        font-size="16" font-weight="700" fill="#b01827">${glyph}</text>
    </svg>
  `;
};

export const getComplaintMapMarkerIcon = (complaint, maps = window.google?.maps) => {
  if (!maps?.Size || !maps?.Point) return undefined;

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(getComplaintMapMarkerSvg(complaint))}`,
    scaledSize: new maps.Size(44, 56),
    anchor: new maps.Point(22, 54),
  };
};
