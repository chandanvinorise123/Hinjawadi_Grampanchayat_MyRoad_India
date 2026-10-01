const mongoose = require("mongoose");

const qrCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  location: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  assignedTo: { type: String, default: "Unassigned" },
}, { timestamps: true });

module.exports = mongoose.model("QRCode", qrCodeSchema);