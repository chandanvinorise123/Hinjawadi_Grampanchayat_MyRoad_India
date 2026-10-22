export const getTimestamp = (value) => {
  const timestamp = new Date(value || 0).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
};

export const getUpdateHistory = (complaint, actorRoles) => {
  const activities = (Array.isArray(complaint.activityLog) ? complaint.activityLog : [])
    .filter((entry) => actorRoles.some((role) => String(entry.actor || "").toLowerCase().includes(role)))
    .map((entry, index) => ({
      id: `activity-${index}`,
      actor: entry.actor || "Staff / Verifier",
      details: entry.message || "Complaint work information was updated.",
      time: entry.createdAt || complaint.updatedAt || "",
    }));
  const statusUpdates = (Array.isArray(complaint.statusHistory) ? complaint.statusHistory : [])
    .filter((entry) => actorRoles.some((role) => String(entry.actor || "").toLowerCase().includes(role)))
    .map((entry, index) => ({
      id: `status-${index}`,
      actor: entry.actor || "Staff / Verifier",
      details: [
        entry.status ? `Status changed to ${entry.status}` : "",
        entry.remarks || "",
      ].filter(Boolean).join(" — "),
      time: entry.updatedAt || complaint.updatedAt || "",
    }));
  const history = [...activities, ...statusUpdates]
    .sort((left, right) => getTimestamp(right.time) - getTimestamp(left.time));

  if (history.length) return history;

  const inspection = complaint.inspection || {};
  const legacyStaffDetails = [
    inspection.actionTaken,
    inspection.remarks,
    inspection.sitePhoto,
    inspection.completionPhoto,
    inspection.verificationPhoto,
  ].filter(Boolean);
  if (actorRoles.includes("staff") && legacyStaffDetails.length) {
    return [{
      id: "legacy-staff-update",
      actor: "Staff",
      details: inspection.actionTaken || inspection.remarks || "Staff work evidence was updated.",
      time: complaint.updatedAt || complaint.createdAt || "",
    }];
  }
  const verifierDetails = complaint.verifierRemarks || complaint.previousRemarks;
  if (actorRoles.includes("verifier") && verifierDetails) {
    return [{
      id: "legacy-verifier-update",
      actor: "Verifier",
      details: verifierDetails,
      time: complaint.updatedAt || complaint.createdAt || "",
    }];
  }

  return [];
};

export const countUpdatedComplaints = (complaints, actorRoles) =>
  complaints.filter((complaint) => getUpdateHistory(complaint, actorRoles).length > 0).length;
