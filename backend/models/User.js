const mongoose = require("mongoose");

const allowedTypes = ["Admin", "Doctor", "Patient", "Pharmacy"];

const patientProfileSchema = new mongoose.Schema(
  {
    fullName: { type: String, trim: true, default: "" },
    dateOfBirth: { type: Date },
    gender: {
      type: String,
      enum: ["male", "female", "other", "prefer_not_to_say"],
      lowercase: true,
    },
    profilePictureUrl: { type: String, default: "" },
    phone: { type: String, trim: true, default: "" },
    contactEmail: { type: String, trim: true, lowercase: true, default: "" },
    city: { type: String, trim: true, default: "" },
    addressLine: { type: String, trim: true, default: "" },
    emergencyContactName: { type: String, trim: true, default: "" },
    emergencyContactPhone: { type: String, trim: true, default: "" },
    bloodType: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const doctorProfileSchema = new mongoose.Schema(
  {
    specialty: { type: String, trim: true, default: "" },
    specialties: { type: [String], default: [] },
    profilePictureUrl: { type: String, default: "" },
    clinicAddress: { type: String, trim: true, default: "" },
    availabilityMode: {
      type: String,
      enum: ["online", "physical", "both"],
      default: "both",
    },
    consultationFees: {
      fee30Min: { type: Number, min: 0, default: 0 },
      fee1Hour: { type: Number, min: 0, default: 0 },
      fee3Hour: { type: Number, min: 0, default: 0 },
    },
    workingDays: { type: [String], default: [] },
    timeSlots: { type: [String], default: [] },
  },
  { _id: false }
);

const doctorVerificationSchema = new mongoose.Schema(
  {
    phone: { type: String, trim: true, default: "" },
    province: { type: String, trim: true, default: "" },
    city: { type: String, trim: true, default: "" },
    address: { type: String, trim: true, default: "" },
    cnicNumber: { type: String, trim: true, default: "" },
    cnicFrontFile: { type: String, default: "" },
    cnicBackFile: { type: String, default: "" },
    selfieFile: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    rejectionReason: { type: String, trim: true, default: "" },
    reviewedAt: { type: Date },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
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
    password: {
      type: String,
      required: function requiredPassword() {
        return !this.googleId;
      },
      minlength: 8,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    otpCodeHash: { type: String, default: "" },
    otpExpiresAt: { type: Date, default: null },
    otpPurpose: { type: String, enum: ["signup", "login", "reset_password", ""], default: "" },
    otpAttempts: { type: Number, default: 0 },
    otpResendAfter: { type: Date, default: null },
    isEmailVerified: { type: Boolean, default: false },
    type: {
      type: String,
      enum: allowedTypes,
      required: true,
    },
    patientProfile: {
      type: patientProfileSchema,
      default: undefined,
    },
    doctorProfile: {
      type: doctorProfileSchema,
      default: undefined,
    },
    doctorVerification: {
      type: doctorVerificationSchema,
      default: undefined,
    },
  },
  { timestamps: true }
);

userSchema.index({ "doctorVerification.cnicNumber": 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("User", userSchema);
