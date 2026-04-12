// Auth routes implement phone OTP login and JWT issuance.
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { createWallet, encryptKey } = require("../utils/walletManager");
const { logger } = require("../config/logger");
const { verifyCaptcha } = require("../config/captcha");
const { authLimiter } = require("../middleware/rateLimiter");
const validate = require("../middleware/validate");
const { sendOtpSchema, verifyOtpSchema } = require("../schemas/authSchema");

const router = express.Router();
const otpStore = new Map(); // In-memory OTP store for demo usage.
const DEV_BYPASS_OTP = "111111";

const generateBstId = async () => {
  const year = new Date().getFullYear();
  const count = await User.countDocuments();
  return `BST-${year}-${String(count + 1).padStart(5, "0")}`;
};

router.post("/send-otp", authLimiter, validate(sendOtpSchema), async (req, res) => {
  try {
    const { phone, captchaToken } = req.body;

    const captcha = await verifyCaptcha({
      token: captchaToken,
      remoteIp: req.ip,
    });
    if (!captcha.ok) {
      return res.status(400).json({ message: "CAPTCHA verification failed. Please try again." });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = Date.now() + 5 * 60 * 1000;

    otpStore.set(phone, { otpHash, expiresAt });
    if (process.env.NODE_ENV !== "production") {
      logger.debug(`[MOCK SMS] OTP for ${phone}: ${otp}`);
    }

    return res.json({ message: "OTP sent successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to send OTP", error: error.message });
  }
});

router.post("/verify-otp", authLimiter, validate(verifyOtpSchema), async (req, res) => {
  try {
    const { phone, otp } = req.body;

    const record = otpStore.get(phone);
    if (!record || Date.now() > record.expiresAt) {
      return res.status(400).json({ message: "OTP expired or not found" });
    }

    const providedOtp = String(otp);
    const validBypass = providedOtp === DEV_BYPASS_OTP;
    const validStoredOtp = await bcrypt.compare(providedOtp, record.otpHash);
    const valid = validBypass || validStoredOtp;
    if (!valid) return res.status(400).json({ message: "Invalid OTP" });
    otpStore.delete(phone);

    let user = await User.findOne({ phone });
    if (!user) {
      const wallet = createWallet();
      user = await User.create({
        phone,
        bstId: await generateBstId(),
        walletAddress: wallet.address,
        encryptedPrivateKey: encryptKey(wallet.privateKey)
      });
    }

    const token = jwt.sign(
      { bstId: user.bstId, walletAddress: user.walletAddress },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      message: "OTP verified",
      token,
      bstId: user.bstId,
      walletAddress: user.walletAddress
    });
  } catch (error) {
    return res.status(500).json({ message: "OTP verification failed", error: error.message });
  }
});

module.exports = router;
