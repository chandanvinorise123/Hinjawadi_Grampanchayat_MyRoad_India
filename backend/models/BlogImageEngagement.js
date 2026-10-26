const mongoose = require("mongoose");

const blogImageEngagementSchema = new mongoose.Schema(
  {
    complaintId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Complaint",
      required: true,
    },
    imageIndex: {
      type: Number,
      required: true,
      min: 0,
    },
    likes: {
      type: [String],
      default: [],
    },
    thumbs: {
      type: [String],
      default: [],
    },
    comments: [
      {
        clientId: { type: String, required: true },
        text: { type: String, required: true, maxlength: 500 },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

blogImageEngagementSchema.index(
  { complaintId: 1, imageIndex: 1 },
  { unique: true }
);

module.exports = mongoose.model("BlogImageEngagement", blogImageEngagementSchema);
