const mongoose = require("mongoose");

const complaintSawThisSchema = new mongoose.Schema(
  {
    complaintId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Complaint",
      required: true,
    },
    sawThisBy: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

complaintSawThisSchema.index({ complaintId: 1 }, { unique: true });

module.exports = mongoose.model("ComplaintSawThis", complaintSawThisSchema);
