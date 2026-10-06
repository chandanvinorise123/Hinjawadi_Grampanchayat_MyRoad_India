const mongoose = require("mongoose");

const complaintSchema = new mongoose.Schema(
  {
    complaintNumber: {
      type: String,
      unique: true,
      index: true,
    },

    citizenId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    category: {
      type: String,
      required: true,
      trim: true,
    },

    issueType: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },

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

    images: [
      {
        type: String,
      },
    ],

    status: {
      type: String,
      enum: [
        "Submitted",
        "Under Review",
        "Verified",
        "Assigned",
        "In Progress",
        "Resolved",
        "Closed",
        "Rejected",
      ],
      default: "Submitted",
    },

    department: {
     type: String,
     required: true,
   },

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
    timestamps: true,
  }
);

// Generate a complaint number before saving.
complaintSchema.pre("save", function () {
  if (!this.complaintNumber) {
    this.complaintNumber =
      "MRI-" +
      Date.now().toString() +
      "-" +
      Math.floor(1000 + Math.random() * 9000);
  }

  if (this.isNew && this.statusHistory.length === 0) {
    this.statusHistory.push({
      status: this.status,
      remarks: "Complaint registered",
    });
  }
});

module.exports = mongoose.model("Complaint", complaintSchema);