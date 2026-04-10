// Gate routes verify live QR/TOTP and burn ticket entry status.
const express = require("express");
const { contract } = require("../config/blockchain");
const Ticket = require("../models/Ticket");
const auth = require("../middleware/authMiddleware");
const requireGateAdmin = require("../middleware/gateAdminMiddleware");
const { deriveLegacySecret, verifyTOTP } = require("../utils/totpHelper");
const { sendWithRetry } = require("../utils/txRetry");
const validate = require("../middleware/validate");
const { gateVerifySchema, gateBurnSchema } = require("../schemas/gateSchema");

const router = express.Router();

router.post("/verify", auth, requireGateAdmin, validate(gateVerifySchema), async (req, res) => {
  try {
    const { tokenId, totpCode } = req.body;

    const ticket = await Ticket.findOne({ tokenId: Number(tokenId) });
    if (!ticket) return res.status(400).json({ status: "INVALID", reason: "Ticket not found in DB" });

    // (1) Validate TOTP freshness and authenticity.
    const qrSecret = ticket.qrSecret || deriveLegacySecret(tokenId);
    if (!(await verifyTOTP(qrSecret, tokenId, totpCode))) {
      return res.status(400).json({ status: "INVALID", reason: "Invalid TOTP" });
    }

    // (2) Ensure token exists and can resolve owner on-chain.
    let onChainOwner;
    try {
      onChainOwner = await contract.ownerOf(Number(tokenId));
    } catch (error) {
      return res.status(400).json({ status: "INVALID", reason: "Token does not exist on-chain" });
    }

    // (3) Verify on-chain owner matches backend owner wallet record.
    if (ticket.ownerWalletAddress.toLowerCase() !== onChainOwner.toLowerCase()) {
      return res.status(400).json({ status: "INVALID", reason: "Owner mismatch" });
    }

    // (4) Ensure ticket is not already used in either source of truth.
    const chainData = await contract.getTicketData(Number(tokenId));
    if (Boolean(chainData.isUsed) || ticket.isUsed) {
      return res.status(400).json({ status: "INVALID", reason: "Already Used" });
    }

    // Mark ticket used as part of successful gate verify flow.
    const { tx } = await sendWithRetry(
      () => contract.burnOnEntry(Number(tokenId)),
      { label: `burn-verify-${tokenId}` }
    );
    ticket.isUsed = true;
    await ticket.save();

    return res.json({ status: "VALID", message: "WELCOME IN", txHash: tx.hash });
  } catch (error) {
    return res.status(500).json({ status: "INVALID", reason: error.message });
  }
});

router.post("/burn", auth, requireGateAdmin, validate(gateBurnSchema), async (req, res) => {
  try {
    const { tokenId } = req.body;

    const { tx } = await sendWithRetry(
      () => contract.burnOnEntry(Number(tokenId)),
      { label: `burn-${tokenId}` }
    );

    await Ticket.updateOne({ tokenId: Number(tokenId) }, { $set: { isUsed: true } });
    return res.json({ message: "Ticket burned on entry", txHash: tx.hash });
  } catch (error) {
    return res.status(500).json({ message: "Burn failed", error: error.message });
  }
});

module.exports = router;
