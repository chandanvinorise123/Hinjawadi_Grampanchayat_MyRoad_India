const mongoose = require("mongoose");

const complaintSchema = new mongoose.Schema(
  {
    // ==========================================
    // COMPLAINT IDENTIFICATION
    // ==========================================

    // Unique identifier for the complaint
    complaintNumber: {
      type: String,
      unique: true,
      index: true,
      trim: true,
    },

    // ==========================================
    // CITIZEN INFORMATION
    // ==========================================

    citizenId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    citizenName: {
      type: String,
      required: true,
      trim: true,
    },

    // ==========================================
    // COMPLAINT CATEGORY / ISSUE
    // ==========================================

    // Broad category of the issue
    category: {
      type: String,
      required: true,
      trim: true,
    },

    // Specific issue type
    // Example: "Road Potholes"
    issueType: {
      type: String,
      required: true,
      trim: true,
    },

    // ==========================================
    // COMPLAINT DESCRIPTION
    // ==========================================

    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },

    // ==========================================
    // LOCATION INFORMATION
    // ==========================================

    location: {
      type: String,
      required: true,
      trim: true,
    },

    landmark: {
      type: String,
      trim: true,
      default: "",
    },

    coordinates: {
      latitude: {
        type: Number,
        required: true,
        min: -90,
        max: 90,
      },

      longitude: {
        type: Number,
        required: true,
        min: -180,
        max: 180,
      },
    },

    // ==========================================
    // IMAGES / PHOTOS
    // ==========================================

    // Number of photos attached
    photos: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Image file paths / URLs
    images: [
      {
        type: String,
      },
    ],

    // ==========================================
    // PRIORITY
    // ==========================================

    priority: {
      type: String,
      enum: ["Critical", "Urgent", "Normal"],
      default: "Normal",
    },

    // ==========================================
    // STATUS
    // ==========================================

    status: {
      type: String,
      enum: [
        "New",
        "Pending",
        "Under Verification",
        "Under Action",
        "Resolved",
        "Submitted",
        "Under Review",
        "Verified",
        "Assigned",
        "In Progress",
        "Closed",
        "Rejected",
      ],
      default: "New",
    },

    // ==========================================
    // DEPARTMENT
    // ==========================================

    department: {
      type: String,
      required: true,
      trim: true,
    },

    // ==========================================
    // STAFF / VERIFIER ASSIGNMENT
    // ==========================================

    // Name of the staff member assigned to fix it
    assignedStaff: {
      type: String,
      default: "",
      trim: true,
    },

    // Name of the verifier assigned to check the work
    assignedVerifier: {
      type: String,
      default: "",
      trim: true,
    },

    inspection: {
      inspectionDate: { type: String, default: "" },
      completionDate: { type: String, default: "" },
      remarks: { type: String, default: "" },
      actionTaken: { type: String, default: "" },
      sitePhoto: { type: String, default: "" },
      completionPhoto: { type: String, default: "" },
    },

    // ==========================================
    // COMPLAINT DATE
    // ==========================================

    // Stored as YYYY-MM-DD
    // for easy aggregation/grouping
    date: {
      type: String,
      default: () => new Date().toISOString().split("T")[0],
    },

    // ==========================================
    // STATUS HISTORY
    // ==========================================

    statusHistory: [
      {
        status: {
          type: String,
          required: true,
        },

        remarks: {
          type: String,
          default: "",
        },

        updatedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    // Automatically adds:
    // createdAt
    // updatedAt
    timestamps: true,
  }
);

// ==========================================
// INDEXES
// ==========================================

// Faster querying for admin dashboard
complaintSchema.index({
  status: 1,
  category: 1,
});

// ==========================================
// GENERATE COMPLAINT NUMBER
// ==========================================

complaintSchema.pre("save", function () {
  if (!this.complaintNumber) {
    this.complaintNumber =
      "MRI-" +
      Date.now().toString() +
      "-" +
      Math.floor(1000 + Math.random() * 9000);
  }

  // Add initial status history entry
  if (this.isNew && this.statusHistory.length === 0) {
    this.statusHistory.push({
      status: this.status,
      remarks: "Complaint registered",
    });
  }
});

// ==========================================
// EXPORT MODEL
// ==========================================

module.exports = mongoose.model("Complaint", complaintSchema);