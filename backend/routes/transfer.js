// Transfer routes implement capped resale payment and ownership handoff.
const express = require("express");
const crypto = require("crypto");
const Razorpay = require("razorpay");
const auth = require("../middleware/authMiddleware");
const Ticket = require("../models/Ticket");
const User = require("../models/User");
const { contract } = require("../config/blockchain");

const router = express.Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

router.get("/users/lookup/:bstId", auth, async (req, res) => {
  try {
    const user = await User.findOne({ bstId: req.params.bstId });
    if (!user) return res.status(404).json({ message: "User not found" });

    return res.json({
      name: `User ${user.bstId.slice(-5)}`, // Demo-friendly display name.
      walletAddress: user.walletAddress
    });
  } catch (error) {
    return res.status(500).json({ message: "Lookup failed", error: error.message });
  }
});

router.post("/transfer/create-order", auth, async (req, res) => {
  try {
    const { tokenId, resalePrice } = req.body;
    const ticket = await Ticket.findOne({ tokenId: Number(tokenId) });
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });
    if (ticket.ownerBstId !== req.user.bstId) return res.status(403).json({ message: "Not ticket owner" });
    if (Number(resalePrice) > ticket.maxResalePrice) {
      return res.status(400).json({ message: "Resale price exceeds cap" });
    }

    const order = await razorpay.orders.create({
      amount: Math.round(Number(resalePrice) * 100),
      currency: "INR",
      receipt: `transfer_${tokenId}_${Date.now()}`
    });

    return res.json({ order, maxResalePrice: ticket.maxResalePrice, keyId: process.env.RAZORPAY_KEY_ID });
  } catch (error) {
    return res.status(500).json({ message: "Transfer order failed", error: error.message });
  }
});

router.post("/transfer/execute", auth, async (req, res) => {
  try {
    const {
      tokenId,
      recipientBstId,
      resalePrice,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;

    const ticket = await Ticket.findOne({ tokenId: Number(tokenId) });
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });
    if (ticket.ownerBstId !== req.user.bstId) return res.status(403).json({ message: "Not ticket owner" });
    if (Number(resalePrice) > ticket.maxResalePrice) {
      return res.status(400).json({ message: "Resale price exceeds cap" });
    }

    const recipient = await User.findOne({ bstId: recipientBstId });
    if (!recipient) return res.status(404).json({ message: "Recipient not found" });

    // Verify Razorpay signature before blockchain transfer.
    const generated = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");
    if (generated !== razorpay_signature) {
      return res.status(400).json({ message: "Invalid payment signature" });
    }

    const tx = await contract.resell(Number(tokenId), recipient.walletAddress, Number(resalePrice));
    await tx.wait();

    ticket.ownerBstId = recipient.bstId;
    ticket.ownerWalletAddress = recipient.walletAddress;
    ticket.transferCount += 1;
    await ticket.save();

    return res.json({ message: "Transfer complete", txHash: tx.hash, recipientBstId: recipient.bstId });
  } catch (error) {
    return res.status(500).json({ message: "Transfer execution failed", error: error.message });
  }
});

module.exports = router;
