const mongoose = require("mongoose");

const configSchema = new mongoose.Schema({
  portalName: { type: String, default: "MyRoad India" },
  complaintPrefix: { type: String, default: "MRI" },
  defaultLanguage: { type: String, default: "English" },
  mapDefaultLat: { type: Number, default: null },
  mapDefaultLng: { type: Number, default: null },
  enableEmailNotifications: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model("SystemConfig", configSchema);