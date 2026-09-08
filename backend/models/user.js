const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
    {
        role: {
            type: String,
            enum: ["citizen", "staff", "verifier", "admin"],
            required: true,
            default: "citizen"
        },

        name: {
            type: String,
            required: true,
            trim: true
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        password: {
            type: String,
            required: true
        }
    },
    {
        timestamps: true
    }
);

// Hash the password automatically before saving,
// but only if it was newly set or changed.
// NOTE: Modern Mongoose (v7+) no longer uses a "next" callback here —
// just use async/await and let errors throw naturally.
userSchema.pre("save", async function () {
    if (!this.isModified("password")) return;

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Instance method to compare a plain-text password
// against the stored hash.
userSchema.methods.comparePassword = function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Third argument forces the exact collection name "user"
module.exports = mongoose.model("User", userSchema, "user");