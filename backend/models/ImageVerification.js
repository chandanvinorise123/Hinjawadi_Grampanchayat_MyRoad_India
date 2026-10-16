const mongoose = require("mongoose");

const imageVerificationSchema = new mongoose.Schema(
  {
    complaintId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Complaint", 
      default: null 
    },
    fileName: { type: String, required: true },
    filePath: { type: String, required: true },
    fileSize: { type: Number, required: true },
    mimeType: { type: String, required: true },
    aiVerification: {
      checked: { type: Boolean, default: false },
      roadRelated: { type: Boolean, default: false },
      confidence: { type: Number, default: 0 },
      detectedIssue: { type: String, default: null },
      modelVersion: { type: String, default: "google-vision-label-detection" },
      checkedAt: { type: Date, default: Date.now }
    },
    imageHash: { type: String, default: null },
    location: {
      latitude: { type: Number },
      longitude: { type: Number },
      accuracy: { type: Number }
    },
    status: { 
      type: String, 
      enum: ["PENDING", "VERIFIED", "REJECTED", "MANUAL_REVIEW"], 
      default: "PENDING" 
    }
  },
  { timestamps: true }
);

imageVerificationSchema.index({ imageHash: 1 });
imageVerificationSchema.index({ status: 1 });

module.exports = mongoose.model("ImageVerification", imageVerificationSchema);