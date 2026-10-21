const SystemStat = require("../../models/SystemStat");
const Complaint = require("../../models/Complaint");

const statusGroups = {
  underVerification: ["Under Verification", "Under Review"],
  actionRequired: ["New", "Pending", "Submitted", "Verified", "Assigned", "Under Action"],
  underRepair: ["In Progress"],
  resolved: ["Resolved", "Closed"],
};

const getOrCreateStats = async () => {
  let stats = await SystemStat.findOne();
  if (!stats) {
    stats = await SystemStat.create({ totalVisits: 0, totalLogins: 0 });
  }
  return stats;
};

exports.incrementVisit = async (req, res) => {
  try {
    const stats = await getOrCreateStats();
    stats.totalVisits += 1;
    await stats.save();
    res.json({ success: true, totalVisits: stats.totalVisits });
  } catch (error) {
    console.error("Increment visit error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.incrementLogin = async (req, res) => {
  try {
    const stats = await getOrCreateStats();
    stats.totalLogins += 1;
    await stats.save();
    res.json({ success: true, totalLogins: stats.totalLogins });
  } catch (error) {
    console.error("Increment login error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getStats = async (req, res) => {
  try {
    const stats = await getOrCreateStats();
    const complaintStatusCounts = await Complaint.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const countsByStatus = new Map(
      complaintStatusCounts.map(({ _id, count }) => [_id, count])
    );
    const totalReportedIssues = complaintStatusCounts.reduce(
      (total, statusCount) => total + statusCount.count,
      0
    );
    const countStatuses = (statuses) =>
      statuses.reduce((total, status) => total + (countsByStatus.get(status) || 0), 0);

    res.json({
      success: true,
      data: {
        totalCitizenVisits: stats.totalVisits,
        totalCitizenLogins: stats.totalLogins,
        totalReportedIssues,
        complaintStatusCounts: Object.fromEntries(
          Object.entries(statusGroups).map(([group, statuses]) => [
            group,
            countStatuses(statuses),
          ])
        ),
      },
    });
  } catch (error) {
    console.error("Get stats error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};