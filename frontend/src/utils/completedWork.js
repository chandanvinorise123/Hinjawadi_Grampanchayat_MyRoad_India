const approvedCompletionStatuses = new Set([
  "verified",
  "approved",
  "resolved",
  "closed",
  "notified",
  "citizen notified",
]);

export const isApprovedCompletedWork = (complaint) => {
  const status = String(complaint?.status || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
  return approvedCompletionStatuses.has(status);
};
