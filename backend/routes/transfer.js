// Transfer routes implement capped resale payment and ownership handoff.
const express = require("express");
const crypto = require("crypto");
const Razorpay = require("razorpay");
const auth = require("../middleware/authMiddleware");
const Ticket = require("../models/Ticket");
const User = require("../models/User");
<<<<<<< HEAD
const { contract } = require("../config/blockchain");
=======
const TransferRequest = require("../models/TransferRequest");
const { contract, provider, CONTRACT_ABI, adminSigner } = require("../config/blockchain");
const { ethers } = require("ethers");
const { decryptKey } = require("../utils/walletManager");
const { createQrSecret } = require("../utils/totpHelper");
const { sendWithRetry } = require("../utils/txRetry");
const { paymentLimiter } = require("../middleware/rateLimiter");
const validate = require("../middleware/validate");
const { transferRequestSchema, transferCompleteSchema, mongoIdParamSchema, bstIdParamSchema } = require("../schemas/transferSchema");
>>>>>>> PostR1

const router = express.Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

<<<<<<< HEAD
router.get("/users/lookup/:bstId", auth, async (req, res) => {
=======
router.get("/users/lookup/:bstId", auth, validate(bstIdParamSchema, "params"), async (req, res) => {
>>>>>>> PostR1
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

<<<<<<< HEAD
router.post("/transfer/create-order", auth, async (req, res) => {
  try {
    const { tokenId, resalePrice } = req.body;
=======
router.post("/transfer/request", auth, validate(transferRequestSchema), async (req, res) => {
  try {
    const { tokenId, buyerBstId, resalePrice } = req.body;
>>>>>>> PostR1
    const ticket = await Ticket.findOne({ tokenId: Number(tokenId) });
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });
    if (ticket.ownerBstId !== req.user.bstId) return res.status(403).json({ message: "Not ticket owner" });
    if (Number(resalePrice) > ticket.maxResalePrice) {
      return res.status(400).json({ message: "Resale price exceeds cap" });
    }

<<<<<<< HEAD
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

=======
    const existingRequest = await TransferRequest.findOne({
      tokenId: Number(tokenId),
      sellerBstId: req.user.bstId,
      status: { $in: ["pending", "accepted"] }
    });
    if (existingRequest) {
      return res.status(400).json({
        message: "This ticket already has a pending transfer request. Wait for accept or decline before sending another."
      });
    }

    const buyer = await User.findOne({ bstId: buyerBstId });
    if (!buyer) return res.status(404).json({ message: "Buyer not found" });

    const request = await TransferRequest.create({
      tokenId: Number(tokenId),
      eventId: ticket.eventId,
      seat: ticket.seat,
      sellerBstId: ticket.ownerBstId,
      sellerWalletAddress: ticket.ownerWalletAddress,
      buyerBstId: buyer.bstId,
      buyerWalletAddress: buyer.walletAddress,
      resalePrice: Number(resalePrice),
      status: "pending"
    });

    return res.json({ message: "Transfer request created", request });
  } catch (error) {
    return res.status(500).json({ message: "Transfer request failed", error: error.message });
  }
});

router.get("/transfer/requests/incoming", auth, async (req, res) => {
  try {
    const requests = await TransferRequest.find({
      buyerBstId: req.user.bstId,
      status: "pending"
    }).sort({ createdAt: -1 });
    return res.json(requests);
  } catch (error) {
    return res.status(500).json({ message: "Failed to load transfer requests", error: error.message });
  }
});

router.get("/transfer/requests/sent", auth, async (req, res) => {
  try {
    const requests = await TransferRequest.find({
      sellerBstId: req.user.bstId
    }).sort({ createdAt: -1 });
    return res.json(requests);
  } catch (error) {
    return res.status(500).json({ message: "Failed to load sent requests", error: error.message });
  }
});

router.post("/transfer/request/:id/create-order", auth, paymentLimiter, validate(mongoIdParamSchema, "params"), async (req, res) => {
  try {
    const request = await TransferRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Transfer request not found" });
    if (request.buyerBstId !== req.user.bstId) return res.status(403).json({ message: "Not request recipient" });
    if (request.status !== "pending") return res.status(400).json({ message: "Transfer request is not pending" });

    const order = await razorpay.orders.create({
      amount: Math.round(Number(request.resalePrice) * 100),
      currency: "INR",
      receipt: `tr_${request.tokenId}_${Date.now().toString().slice(-7)}`
    });

    request.paymentOrderId = order.id;
    await request.save();

    return res.json({ order, keyId: process.env.RAZORPAY_KEY_ID, request });
  } catch (error) {
    return res.status(500).json({ message: "Request order failed", error: error.message });
  }
});

router.post("/transfer/request/:id/complete", auth, paymentLimiter, validate(mongoIdParamSchema, "params"), validate(transferCompleteSchema), async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const request = await TransferRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Transfer request not found" });
    if (request.buyerBstId !== req.user.bstId) return res.status(403).json({ message: "Not request recipient" });
    if (request.status !== "pending") return res.status(400).json({ message: "Transfer request is not ready for completion" });
    if (request.paymentOrderId && request.paymentOrderId !== razorpay_order_id) {
      return res.status(400).json({ message: "Payment order does not match this request" });
    }

>>>>>>> PostR1
    // Verify Razorpay signature before blockchain transfer.
    const generated = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");
    if (generated !== razorpay_signature) {
      return res.status(400).json({ message: "Invalid payment signature" });
    }

<<<<<<< HEAD
    const tx = await contract.resell(Number(tokenId), recipient.walletAddress, Number(resalePrice));
    await tx.wait();
=======
    const recipient = await User.findOne({ bstId: request.buyerBstId });
    if (!recipient) return res.status(404).json({ message: "Recipient not found" });

    const ticket = await Ticket.findOne({ tokenId: Number(request.tokenId) });
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });
    if (ticket.ownerBstId !== request.sellerBstId) {
      return res.status(400).json({ message: "Ticket owner no longer matches request" });
    }

    // Use the seller's custodial wallet to sign the resell tx (contract requires msg.sender == owner).
    const seller = await User.findOne({ bstId: request.sellerBstId });
    if (!seller) return res.status(404).json({ message: "Seller not found" });
    const sellerPrivateKey = decryptKey(seller.encryptedPrivateKey);
    const sellerSigner = new ethers.Wallet(sellerPrivateKey, provider);
    const sellerContract = new ethers.Contract(process.env.CONTRACT_ADDRESS, CONTRACT_ABI, sellerSigner);

    // Fund seller wallet with gas if balance is too low for the tx.
    const sellerBalance = await provider.getBalance(seller.walletAddress);
    if (sellerBalance < ethers.parseEther("0.01")) {
      const fundTx = await adminSigner.sendTransaction({
        to: seller.walletAddress,
        value: ethers.parseEther("0.05")
      });
      await fundTx.wait();
    }

    const { tx } = await sendWithRetry(
      () => sellerContract.resell(Number(request.tokenId), recipient.walletAddress, Number(request.resalePrice)),
      { label: `resell-token-${request.tokenId}` }
    );
>>>>>>> PostR1

    ticket.ownerBstId = recipient.bstId;
    ticket.ownerWalletAddress = recipient.walletAddress;
    ticket.transferCount += 1;
<<<<<<< HEAD
    await ticket.save();

    return res.json({ message: "Transfer complete", txHash: tx.hash, recipientBstId: recipient.bstId });
=======
    ticket.qrSecret = createQrSecret();
    ticket.txHash = tx.hash;
    await ticket.save();

    request.status = "completed";
    request.paymentId = razorpay_payment_id;
    request.paymentSignature = razorpay_signature;
    request.txHash = tx.hash;
    await request.save();

    return res.json({
      message: "Transfer complete",
      txHash: tx.hash,
      recipientBstId: recipient.bstId,
      request
    });
>>>>>>> PostR1
  } catch (error) {
    return res.status(500).json({ message: "Transfer execution failed", error: error.message });
  }
});

<<<<<<< HEAD
=======
router.post("/transfer/request/:id/decline", auth, validate(mongoIdParamSchema, "params"), async (req, res) => {
  try {
    const request = await TransferRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Transfer request not found" });
    if (request.buyerBstId !== req.user.bstId) return res.status(403).json({ message: "Not request recipient" });
    if (request.status !== "pending" && request.status !== "accepted") {
      return res.status(400).json({ message: "Transfer request cannot be declined" });
    }

    request.status = "declined";
    await request.save();
    return res.json({ message: "Transfer request declined", request });
  } catch (error) {
    return res.status(500).json({ message: "Decline failed", error: error.message });
  }
});

>>>>>>> PostR1
module.exports = router;
