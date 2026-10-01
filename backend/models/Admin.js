const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    contact: { type: String, required: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, default: "admin" },
    
    // ✅ Personal Information
    gender: { type: String, default: "" },
    profilePhoto: { type: String, default: "" },
    address: { type: String, default: "" },
    
    // ✅ Account Information
    // Removed 'default: ""' to prevent unique constraint errors on the 2nd admin
    adminId: { type: String, required: true, unique: true, trim: true }, 
    department: { type: String, default: "Infrastructure" },
    accountStatus: { type: String, default: "Active", enum: ["Active", "Inactive", "Suspended"] },
    dateJoined: { type: Date, default: Date.now },
    lastLogin: { type: Date, default: Date.now },
    
    // ✅ Preferences
    language: { type: String, default: "English" },
    theme: { type: String, default: "Light", enum: ["Light", "Dark"] },
    emailNotifications: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Hash password before saving
adminSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
adminSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("Admin", adminSchema);