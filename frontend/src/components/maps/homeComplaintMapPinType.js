import { getComplaintMapPinType } from "./complaintMapMarker.js";

export const getHomeComplaintMapPinType = (complaint = {}) => {
  const pinType = getComplaintMapPinType(complaint);
  if (pinType === "resolved") return pinType;

  const status = String(complaint.status || "").trim().toLowerCase();
  const inspection = complaint.inspection || {};
  const hasCompletedWorkEvidence = Boolean(
    inspection.actionTaken?.trim() &&
    inspection.completionDate?.trim() &&
    inspection.completionPhoto?.trim()
  );

  if (
    hasCompletedWorkEvidence &&
    ["assigned", "under action", "in progress"].includes(status)
  ) {
    return "resolved";
  }

  return pinType;
};
