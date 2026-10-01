const mongoose = require("mongoose");

const complaintSchema = new mongoose.Schema(
  {
    // Unique identifier for the complaint (e.g., "MRI-482913")
    complaintNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // Broad category of the issue
    category: {
      type: String,
      required: true,
      trim: true,
    },

    // Specific issue description (e.g., "Road Potholes")
    issue: {
      type: String,
      required: true,
      trim: true,
    },

    // Location where the issue is reported
    location: {
      type: String,
      required: true,
      trim: true,
    },

    // Name of the citizen who reported it
    citizenName: {
      type: String,
      required: true,
      trim: true,
    },

    // Detailed description of the problem
    description: {
      type: String,
      required: true,
    },

    // Number of photos attached (default 0)
    photos: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Priority level of the complaint
    priority: {
      type: String,
      enum: ["Critical", "Urgent", "Normal"],
      default: "Normal",
    },

    // Current status in the pipeline
    status: {
      type: String,
      enum: ["New", "Pending", "Under Verification", "Under Action", "Resolved"],
      default: "New",
    },

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

    // Date of complaint (Stored as "YYYY-MM-DD" string for easy aggregation grouping)
    date: {
      type: String,
      default: () => new Date().toISOString().split("T")[0], // Automatically sets to today's date in YYYY-MM-DD format
    },
  },
  {
    // Automatically adds `createdAt` and `updatedAt` fields
    timestamps: true, 
  }
);

// Optional: Create an index on status and category for faster querying in the admin dashboard
complaintSchema.index({ status: 1, category: 1 });
complaintSchema.index({ complaintNumber: 1 });

module.exports = mongoose.model("Complaint", complaintSchema);