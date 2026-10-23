const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      default: null 
    }, // Null means it's a broadcast to the whole role
    role: { 
      type: String, 
      enum: ["admin", "staff", "verifier", "citizen"], 
      required: true 
    }, // Who should see this?
    complaintId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Complaint" 
    }, // Link to the complaint
    contactMessageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ContactMessage",
      default: null,
    },
    type: { 
      type: String, 
      required: true 
    }, // e.g., "Complaint Registered", "Work Completed"
    message: { 
      type: String, 
      required: true 
    }, // The actual text to display
    isRead: { 
      type: Boolean, 
      default: false 
    },
  },
  { timestamps: true } // Automatically adds createdAt and updatedAt
);

module.exports = mongoose.model("Notification", notificationSchema);