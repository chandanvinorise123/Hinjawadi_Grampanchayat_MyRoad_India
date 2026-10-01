const mongoose = require("mongoose");

const complaintSchema = new mongoose.Schema(
  {
    complaintNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    issue: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    citizenName: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    photos: {
      type: Number,
      default: 0,
      min: 0,
    },
    priority: {
      type: String,
      enum: ["Critical", "Urgent", "Normal"],
      default: "Normal",
    },
    status: {
      type: String,
      enum: [
        "New",
        "Pending",
        "Under Verification",
        "Under Action",
        "Resolved",
      ],
      default: "New",
    },
    assignedStaff: {
      type: String,
      default: "",
      trim: true,
    },
    assignedVerifier: {
      type: String,
      default: "",
      trim: true,
    },
    date: {
      type: String,
      default: () => new Date().toISOString().split("T")[0],
    },

    // Coordinates for map display
    lat: {
      type: Number,
      default: null,
    },
    lng: {
      type: Number,
      default: null,
    },

    // Photo URLs for viewing complaint photos
    photoUrls: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
complaintSchema.index({ status: 1, category: 1 });
complaintSchema.index({ lat: 1, lng: 1 });

module.exports = mongoose.model("Complaint", complaintSchema);