const normalizeStatus = (status) =>
  String(status || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

const reworkStatuses = new Set([
  "rejected",
  "sent back for action",
  "awaiting staff correction",
  "rework requested",
  "returned for rework",
]);
const verificationStatuses = new Set([
  "under verification",
  "under review",
  "in review",
  "work completed",
  "completed work",
  "work submitted",
  "awaiting verification",
  "ready for verification",
  "re verification",
  "reverification",
  "verification needed",
]);

const hasAssignment = (value) => {
  const assignee = typeof value === "object"
    ? value?._id || value?.id || value?.name || ""
    : value;
  const normalized = String(assignee || "").trim().toLowerCase();
  return normalized !== "" && !["unassigned", "not assigned", "none", "null"].includes(normalized);
};

const hasWorkEvidence = (complaint) => {
  const inspection = complaint.inspection || {};
  return Boolean(
    String(inspection.completionPhoto || complaint.completionPhoto || "").trim() &&
    String(inspection.actionTaken || complaint.actionTaken || "").trim()
  );
};

export const getComplaintTableStatus = (complaint) => {
  const status = normalizeStatus(complaint.status);
  const assigned = [
    complaint.assignedStaff,
    complaint.assignedStaffId,
    complaint.assignedVerifier,
    complaint.assignedVerifierId,
  ].some(hasAssignment);
  if (reworkStatuses.has(status)) return "Rejected";

  const hasSubmittedWork = hasWorkEvidence(complaint);
  const history = Array.isArray(complaint.statusHistory) ? complaint.statusHistory : [];
  const wasRejected = history.some((entry) => reworkStatuses.has(normalizeStatus(entry.status)));
  const latestStatus = history[history.length - 1];
  const staffSubmittedResolvedWork = Boolean(
    latestStatus &&
    /\bstaff\b/i.test(String(latestStatus.actor || "")) &&
    ["resolved", "closed"].includes(normalizeStatus(latestStatus.status)) &&
    hasSubmittedWork
  );
  const isPendingOrAssigned = [
    "new",
    "registered",
    "complaint registered",
    "submitted",
    "pending",
    "pending verification",
    "assigned",
    "under action",
    "in action",
    "in progress",
  ].includes(status);
  if (
    verificationStatuses.has(status) ||
    staffSubmittedResolvedWork ||
    (hasSubmittedWork && isPendingOrAssigned && !wasRejected)
  ) {
    return "Verification Needed";
  }

  if (["resolved", "closed", "notified", "citizen notified", "complaint resolved"].includes(status)) {
    return "Resolved";
  }
  if (
    ["new", "registered", "complaint registered", "submitted", "pending", "pending verification"].includes(status) &&
    !assigned
  ) {
    return "New";
  }
  return "Assigned";
};

export const getComplaintTableStatusTone = (status) => ({
  New: "navy",
  Assigned: "orange",
  "Verification Needed": "amber",
  Rejected: "red",
  Resolved: "green",
}[status] || "navy");
