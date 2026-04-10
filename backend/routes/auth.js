// Auth routes implement phone OTP login and JWT issuance.
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { createWallet, encryptKey } = require("../utils/walletManager");

const router = express.Router();
const otpStore = new Map(); // In-memory OTP store for demo usage.

const generateBstId = async () => {
  const year = new Date().getFullYear();
  const count = await User.countDocuments();
  return `BST-${year}-${String(count + 1).padStart(5, "0")}`;
};

router.post("/send-otp", async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ message: "Phone is required" });

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = Date.now() + 5 * 60 * 1000;

    otpStore.set(phone, { otpHash, expiresAt });
    console.log(`[MOCK SMS] OTP for ${phone}: ${otp}`);

    return res.json({ message: "OTP sent successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to send OTP", error: error.message });
  }
});

router.post("/verify-otp", async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) return res.status(400).json({ message: "Phone and OTP are required" });

    const record = otpStore.get(phone);
    if (!record || Date.now() > record.expiresAt) {
      return res.status(400).json({ message: "OTP expired or not found" });
    }

    const valid = await bcrypt.compare(String(otp), record.otpHash);
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
