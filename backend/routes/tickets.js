// Ticket routes handle minting and listing tickets for authenticated users.
const express = require("express");
const { ethers } = require("ethers");
const auth = require("../middleware/authMiddleware");
const { contract } = require("../config/blockchain");
const User = require("../models/User");
const Ticket = require("../models/Ticket");
const Event = require("../models/Event");
const { decryptKey } = require("../utils/walletManager");
const { createQrSecret } = require("../utils/totpHelper");
const { sendWithRetry } = require("../utils/txRetry");
const { logger } = require("../config/logger");
const validate = require("../middleware/validate");
const { mintSchema } = require("../schemas/ticketSchema");

const router = express.Router();
const MAX_ACTIVE_TICKETS = 4;

router.get("/", auth, async (req, res) => {
  try {
    const tickets = await Ticket.find({ ownerBstId: req.user.bstId }).sort({
      createdAt: -1,
    });
    const eventIds = [...new Set(tickets.map((ticket) => ticket.eventId).filter(Boolean))];
    const events = await Event.find({ eventId: { $in: eventIds } })
      .select("eventId name")
      .lean();
    const eventNameById = new Map(events.map((event) => [event.eventId, event.name]));

    return res.json(
      tickets.map((ticket) => ({
        ...ticket.toObject(),
        eventName: eventNameById.get(ticket.eventId) || ticket.eventId,
      }))
    );
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to fetch tickets", error: error.message });
  }
});

router.get("/public/:tokenId/owner", async (req, res) => {
  try {
    const tokenId = Number(req.params.tokenId);
    if (!Number.isInteger(tokenId) || tokenId <= 0) {
      return res.status(400).json({ message: "tokenId must be a positive integer" });
    }

    const ticket = await Ticket.findOne({ tokenId });
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    const onChainOwner = await contract.ownerOf(tokenId);
    return res.json({
      tokenId,
      eventId: ticket.eventId,
      seat: ticket.seat,
      onChainOwner,
      ownerWalletAddress: ticket.ownerWalletAddress,
      ownerMatches: ticket.ownerWalletAddress.toLowerCase() === onChainOwner.toLowerCase()
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch on-chain owner", error: error.message });
  }
});

router.get("/:tokenId/owner", auth, async (req, res) => {
  try {
    const tokenId = Number(req.params.tokenId);
    if (!Number.isInteger(tokenId) || tokenId <= 0) {
      return res.status(400).json({ message: "tokenId must be a positive integer" });
    }

    const ticket = await Ticket.findOne({ tokenId });
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    if (ticket.ownerBstId !== req.user.bstId) {
      return res.status(403).json({ message: "Not ticket owner" });
    }

    const onChainOwner = await contract.ownerOf(tokenId);
    return res.json({
      tokenId,
      onChainOwner,
      ownerWalletAddress: ticket.ownerWalletAddress,
      ownerMatches: ticket.ownerWalletAddress.toLowerCase() === onChainOwner.toLowerCase()
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch on-chain owner", error: error.message });
  }
});

router.post("/mint", auth, validate(mintSchema), async (req, res) => {
  try {
    const { tokenId, eventId, seat, faceValue } = req.body;

    const activeTicketCount = await Ticket.countDocuments({
      ownerBstId: req.user.bstId,
      isUsed: false,
    });
    if (activeTicketCount >= MAX_ACTIVE_TICKETS) {
      return res.status(400).json({
        message: `Active ticket limit reached. You can hold at most ${MAX_ACTIVE_TICKETS} active tickets.`,
      });
    }

    const buyer = await User.findOne({ bstId: req.user.bstId });
    if (!buyer) return res.status(404).json({ message: "Buyer not found" });

    // Decrypt key to satisfy custodial flow check; tx itself is signed by admin per contract rules.
    const decrypted = decryptKey(buyer.encryptedPrivateKey);
    if (!decrypted || !ethers.isHexString(decrypted)) {
      return res.status(400).json({ message: "Buyer key decryption failed" });
    }

    // Atomically claim the seat — prevents double-booking when two users click simultaneously.
    const seatClaim = await Event.findOneAndUpdate(
      { eventId, seats: { $elemMatch: { seatId: seat, isTaken: false } } },
      { $set: { "seats.$.isTaken": true } },
      { new: true }
    );
    if (!seatClaim) {
      return res.status(409).json({ message: "Seat already taken" });
    }

    let tx;
    try {
      ({ tx } = await sendWithRetry(
        () => contract.mint(
          buyer.walletAddress,
          tokenId,
          eventId,
          seat,
          Number(faceValue),
        ),
        { label: `mint-token-${tokenId}` }
      ));
    } catch (mintErr) {
      // Rollback seat claim if blockchain mint fails.
      await Event.updateOne(
        { eventId, "seats.seatId": seat },
        { $set: { "seats.$.isTaken": false } }
      );
      throw mintErr;
    }

    logger.info(`Ticket minted: tokenId=${tokenId} seat=${seat} owner=${buyer.bstId} tx=${tx.hash}`);
    const maxResalePrice = Math.floor(Number(faceValue) * 1.1);
    
    // Get seat details to check if it's a yellow seat (no resale allowed)
    const event = await Event.findOne({ eventId });
    const seatDetails = event?.seats.find(s => s.seatId === seat);
    const canResale = seatDetails?.seatType !== "yellow";
    
    const ticket = await Ticket.create({
      tokenId: Number(tokenId),
      eventId,
      seat,
      ownerBstId: buyer.bstId,
      ownerWalletAddress: buyer.walletAddress,
      faceValue: Number(faceValue),
      maxResalePrice,
      isUsed: false,
      transferCount: 0,
      qrSecret: createQrSecret(),
      txHash: tx.hash,
      canResale,
    });

    return res.json({ message: "Ticket minted", txHash: tx.hash, ticket });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Mint failed", error: error.message });
  }
});

// Public debug endpoint to list all tickets in database
router.get("/public/list/all", async (req, res) => {
  try {
    const tickets = await Ticket.find({}).limit(50).sort({ createdAt: -1 });
    return res.json({ count: tickets.length, tickets: tickets.map(t => ({ tokenId: t.tokenId, eventId: t.eventId, seat: t.seat, ownerBstId: t.ownerBstId, createdAt: t.createdAt })) });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch tickets", error: error.message });
  }
});

module.exports = router;
