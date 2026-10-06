const mongoose = require("mongoose");

const systemStatSchema = new mongoose.Schema(
  {
    totalVisits: { type: Number, default: 0 },
    totalLogins: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SystemStat", systemStatSchema, "systemstats");