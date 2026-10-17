const SystemStat = require("../../models/SystemStat");

// Safely try to load Complaint model (prevents crash if file is missing/named differently)
let Complaint;
try {
  Complaint = require("../../models/Complaint");
} catch (err) {
  console.warn("⚠️ Complaint model not found. Reported issues will default to 0.");
}

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
    
    let totalReportedIssues = 0;
    if (Complaint) {
      try {
        totalReportedIssues = await Complaint.countDocuments();
      } catch (err) {
        console.warn("Error counting complaints:", err.message);
      }
    }

    res.json({
      success: true,
      data: {
        totalCitizenVisits: stats.totalVisits,
        totalCitizenLogins: stats.totalLogins,
        totalReportedIssues: totalReportedIssues,
      },
    });
  } catch (error) {
    console.error("Get stats error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};