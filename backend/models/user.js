const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    // ==========================================
    // BASIC USER INFORMATION
    // ==========================================
    role: {
      type: String,
      enum: ["citizen", "staff", "verifier", "admin"],
      required: true,
      default: "citizen",
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    contact: {
      type: String,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },

    // ==========================================
    // PERSONAL INFORMATION
    // ==========================================
    gender: {
      type: String,
      enum: ["Male", "Female", "Other", "Prefer not to say"],
    },

    dateOfBirth: {
      type: Date,
    },

    address: {
      type: String,
      trim: true,
    },

    // ==========================================
    // EMPLOYMENT INFORMATION
    // Mainly for Staff and Verifier
    // ==========================================
    staffId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },

    verifierId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },

    department: {
      type: String,
      trim: true,
    },

    designation: {
      type: String,
      trim: true,
    },

    assignedArea: {
      type: String,
      trim: true,
    },

    joiningDate: {
      type: Date,
    },

    reportingOfficer: {
      type: String,
      trim: true,
    },

    // ==========================================
    // WORK INFORMATION / STATISTICS
    // ==========================================
    assignedComplaints: {
      type: Number,
      default: 0,
      min: 0,
    },

    resolvedComplaints: {
      type: Number,
      default: 0,
      min: 0,
    },

    currentWorkStatus: {
      type: String,
      default: "Idle",
      trim: true,
    },

    // ==========================================
    // SECURITY / LOGIN INFORMATION
    // ==========================================
    lastLogin: {
      type: Date,
      default: null,
    },

    loginActivity: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// ==========================================
// HASH PASSWORD BEFORE SAVE
// ==========================================
userSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }

  const salt = await bcrypt.genSalt(10);

  this.password = await bcrypt.hash(this.password, salt);
});

// ==========================================
// COMPARE PASSWORD
// ==========================================
userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ==========================================
// EXPORT USER MODEL
// ==========================================
// Collection name is explicitly "user"
module.exports = mongoose.model("User", userSchema, "user");