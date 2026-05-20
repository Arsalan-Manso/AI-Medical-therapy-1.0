const mongoose = require("mongoose");

const allowedTypes = ["Admin", "Doctor", "Patient", "Pharmacy"];

const pendingSignupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    type: { type: String, enum: allowedTypes, required: true },
    otpCodeHash: { type: String, default: "" },
    otpExpiresAt: { type: Date, default: null },
    otpPurpose: { type: String, enum: ["signup", ""], default: "signup" },
    otpAttempts: { type: Number, default: 0 },
    otpResendAfter: { type: Date, default: null },
  },
  { timestamps: true }
);

pendingSignupSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 });

module.exports = mongoose.model("PendingSignup", pendingSignupSchema);
