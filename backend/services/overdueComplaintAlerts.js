const Complaint = require("../models/Complaint");
const Notification = require("../models/Notification");
const { createNotifications } = require("./notificationService");

const alertDays = Number(process.env.PENDING_COMPLAINT_ALERT_DAYS || 7);
if (!Number.isFinite(alertDays) || alertDays <= 0) {
  throw new Error("PENDING_COMPLAINT_ALERT_DAYS must be a positive number.");
}

const checkOverdueComplaints = async () => {
  const deadline = new Date(Date.now() - alertDays * 24 * 60 * 60 * 1000);
  const overdueComplaints = await Complaint.find({
    createdAt: { $lte: deadline },
    status: { $nin: ["Resolved", "Closed"] },
  }).select("_id complaintNumber");

  if (!overdueComplaints.length) return 0;

  const complaintIds = overdueComplaints.map((complaint) => complaint._id);
  const existingAlerts = await Notification.find({
    role: "admin",
    type: "Pending Complaint Alert",
    complaintId: { $in: complaintIds },
  }).distinct("complaintId");
  const existingIds = new Set(existingAlerts.map(String));
  const notifications = overdueComplaints
    .filter((complaint) => !existingIds.has(String(complaint._id)))
    .map((complaint) => ({
      role: "admin",
      complaintId: complaint._id,
      type: "Pending Complaint Alert",
      message: `${complaint.complaintNumber || complaint._id} has been open for more than ${alertDays} days.`,
    }));

  await createNotifications(notifications);
  return notifications.length;
};

const startOverdueComplaintAlerts = () => {
  const runCheck = async () => {
    try {
      const count = await checkOverdueComplaints();
      if (count) console.info(`Created ${count} overdue complaint alert(s).`);
    } catch (error) {
      console.error("Overdue complaint alert check failed:", error);
    }
  };

  void runCheck();
  const timer = setInterval(runCheck, 60 * 60 * 1000);
  timer.unref();
};

module.exports = { checkOverdueComplaints, startOverdueComplaintAlerts };
