// Auth routes implement phone OTP login and JWT issuance with real SMS integration.
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const OTP = require("../models/OTP");
const { createWallet, encryptKey } = require("../utils/walletManager");
const { logger } = require("../config/logger");
const { verifyCaptcha } = require("../config/captcha");
const { authLimiter } = require("../middleware/rateLimiter");
const validate = require("../middleware/validate");
const { sendOtpSchema, verifyOtpSchema, resendOtpSchema } = require("../schemas/authSchema");
const { sendOtp, initializeSmsClient } = require("../config/sms");

const router = express.Router();
const DEV_BYPASS_OTP = process.env.NODE_ENV === "production" ? null : "111111";
const OTP_EXPIRY_MINUTES = 5;
const MAX_OTP_ATTEMPTS = 5;

// Initialize SMS client on startup
initializeSmsClient();

const generateBstId = async () => {
  const year = new Date().getFullYear();
  const count = await User.countDocuments();
  return `BST-${year}-${String(count + 1).padStart(5, "0")}`;
};

router.post("/send-otp", authLimiter, validate(sendOtpSchema), async (req, res) => {
  try {
    const { phone, captchaToken } = req.body;

    // Verify CAPTCHA
    const captcha = await verifyCaptcha({
      token: captchaToken,
      remoteIp: req.ip,
    });
    if (!captcha.ok) {
      return res.status(400).json({ message: "CAPTCHA verification failed. Please try again." });
    }

    // Generate OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Clear any existing OTP for this phone
    await OTP.deleteMany({ phone });

    // Send OTP via SMS
    const smsResult = await sendOtp(`+91${phone}`, otp);

    // Store OTP in database
    const otpRecord = await OTP.create({
      phone,
      otpHash,
      expiresAt,
      messageSid: smsResult.messageSid || null,
      isMock: smsResult.isMock || false
    });

    logger.info(`OTP sent successfully to ${phone}`);

    return res.json({
      message: "OTP sent successfully to your phone",
      phoneHint: `+91${phone.slice(0, 2)}****${phone.slice(-2)}`
    });
  } catch (error) {
    logger.error(`Failed to send OTP: ${error.message}`);
    return res.status(500).json({
      message: "Failed to send OTP",
      error: process.env.NODE_ENV === "production" ? undefined : error.message
    });
  }
});

router.post("/verify-otp", authLimiter, validate(verifyOtpSchema), async (req, res) => {
  try {
    const { phone, otp } = req.body;

    // Find OTP record
    const otpRecord = await OTP.findOne({ phone });

    if (!otpRecord) {
      return res.status(400).json({ message: "OTP not found. Please request a new OTP." });
    }

    // Check expiration
    if (new Date() > otpRecord.expiresAt) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({ message: "OTP has expired. Please request a new OTP." });
    }

    // Check attempt limit
    if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(429).json({
        message: `Too many failed attempts. Please request a new OTP.`
      });
    }

    // Verify OTP
    const providedOtp = String(otp);
    const validBypass = DEV_BYPASS_OTP && providedOtp === DEV_BYPASS_OTP;
    const validStoredOtp = await bcrypt.compare(providedOtp, otpRecord.otpHash);
    const valid = validBypass || validStoredOtp;

    if (!valid) {
      // Increment attempts
      otpRecord.attempts += 1;
      otpRecord.lastAttemptAt = new Date();
      await otpRecord.save();

      const remainingAttempts = MAX_OTP_ATTEMPTS - otpRecord.attempts;
      return res.status(400).json({
        message: `Invalid OTP. ${remainingAttempts} attempt${remainingAttempts !== 1 ? "s" : ""} remaining.`
      });
    }

    // OTP verified successfully - delete it
    await OTP.deleteOne({ _id: otpRecord._id });

    // Find or create user
    let user = await User.findOne({ phone });
    if (!user) {
      const wallet = createWallet();
      user = await User.create({
        phone,
        bstId: await generateBstId(),
        walletAddress: wallet.address,
        encryptedPrivateKey: encryptKey(wallet.privateKey)
      });
      logger.info(`New user created: ${user.bstId} (${phone})`);
    } else {
      logger.info(`User logged in: ${user.bstId} (${phone})`);
    }

    // Generate JWT token
    const token = jwt.sign(
      { bstId: user.bstId, walletAddress: user.walletAddress, phone: user.phone },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      message: "OTP verified successfully",
      token,
      bstId: user.bstId,
      walletAddress: user.walletAddress,
      isNewUser: !user.createdAt // Approximation - user was just created
    });
  } catch (error) {
    logger.error(`OTP verification failed: ${error.message}`);
    return res.status(500).json({
      message: "OTP verification failed",
      error: process.env.NODE_ENV === "production" ? undefined : error.message
    });
  }
});

// Resend OTP endpoint
router.post("/resend-otp", authLimiter, validate(resendOtpSchema), async (req, res) => {
  try {
    const { phone, captchaToken } = req.body;

    // Verify CAPTCHA
    const captcha = await verifyCaptcha({
      token: captchaToken,
      remoteIp: req.ip,
    });
    if (!captcha.ok) {
      return res.status(400).json({ message: "CAPTCHA verification failed. Please try again." });
    }

    // Delete existing OTP
    await OTP.deleteMany({ phone });

    // Generate new OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Send OTP via SMS
    const smsResult = await sendOtp(`+91${phone}`, otp);

    // Store OTP in database
    await OTP.create({
      phone,
      otpHash,
      expiresAt,
      messageSid: smsResult.messageSid || null,
      isMock: smsResult.isMock || false
    });

    logger.info(`OTP resent to ${phone}`);

    return res.json({
      message: "OTP resent successfully to your phone",
      phoneHint: `+91${phone.slice(0, 2)}****${phone.slice(-2)}`
    });
  } catch (error) {
    logger.error(`Failed to resend OTP: ${error.message}`);
    return res.status(500).json({
      message: "Failed to resend OTP",
      error: process.env.NODE_ENV === "production" ? undefined : error.message
    });
  }
});

module.exports = router;
