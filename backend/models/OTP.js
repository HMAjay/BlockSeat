// OTP model for storing phone-based OTPs with expiration tracking.
const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      index: true
    },
    otpHash: {
      type: String,
      required: true
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 } // Auto-delete expired documents
    },
    attempts: {
      type: Number,
      default: 0,
      max: 5 // Maximum verification attempts
    },
    lastAttemptAt: {
      type: Date,
      default: null
    },
    messageSid: {
      type: String,
      default: null
    },
    isMock: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

module.exports = mongoose.model("OTP", otpSchema);
