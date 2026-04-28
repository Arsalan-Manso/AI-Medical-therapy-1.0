const mongoose = require("mongoose");

const appointmentRequestSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    specialtyRequested: {
      type: String,
      required: true,
      trim: true,
    },
    preferredDate: { type: Date },
    notes: { type: String, trim: true, maxlength: 2000, default: "" },
    status: {
      type: String,
      enum: ["pending", "approved", "declined", "cancelled"],
      default: "pending",
      index: true,
    },
    scheduledAt: { type: Date },
    doctorMessage: { type: String, trim: true, maxlength: 1000, default: "" },
  },
  { timestamps: true }
);

appointmentRequestSchema.index({ patient: 1, doctor: 1, status: 1 });

module.exports = mongoose.model("AppointmentRequest", appointmentRequestSchema);
