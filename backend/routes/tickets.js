// Ticket routes handle minting and listing tickets for authenticated users.
const express = require("express");
const { ethers } = require("ethers");
const auth = require("../middleware/authMiddleware");
const { contract } = require("../config/blockchain");
const User = require("../models/User");
const Ticket = require("../models/Ticket");
const Event = require("../models/Event");
const { decryptKey } = require("../utils/walletManager");
<<<<<<< HEAD

const router = express.Router();
=======
const { createQrSecret } = require("../utils/totpHelper");
const { sendWithRetry } = require("../utils/txRetry");
const { logger } = require("../config/logger");
const validate = require("../middleware/validate");
const { mintSchema } = require("../schemas/ticketSchema");

const router = express.Router();
const MAX_ACTIVE_TICKETS = 4;
>>>>>>> PostR1

router.get("/", auth, async (req, res) => {
  try {
    const tickets = await Ticket.find({ ownerBstId: req.user.bstId }).sort({
      createdAt: -1,
    });
    return res.json(tickets);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to fetch tickets", error: error.message });
  }
});

<<<<<<< HEAD
router.post("/mint", auth, async (req, res) => {
  try {
    const { tokenId, eventId, seat, faceValue } = req.body;
    if (!tokenId || !eventId || !seat || !faceValue) {
      return res
        .status(400)
        .json({ message: "tokenId, eventId, seat, faceValue are required" });
=======
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
>>>>>>> PostR1
    }

    const buyer = await User.findOne({ bstId: req.user.bstId });
    if (!buyer) return res.status(404).json({ message: "Buyer not found" });

    // Decrypt key to satisfy custodial flow check; tx itself is signed by admin per contract rules.
    const decrypted = decryptKey(buyer.encryptedPrivateKey);
    if (!decrypted || !ethers.isHexString(decrypted)) {
      return res.status(400).json({ message: "Buyer key decryption failed" });
    }

<<<<<<< HEAD
    const tx = await contract.mint(
      buyer.walletAddress,
      tokenId,
      eventId,
      seat,
      Number(faceValue),
    );
    await tx.wait();
    console.log("Ticket minted!");
    console.log("txHash:", tx.hash);
    console.log("tokenId:", tokenId);
    console.log("seat:", seat);
    console.log("owner:", buyer.bstId);
=======
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
>>>>>>> PostR1
    const maxResalePrice = Math.floor(Number(faceValue) * 1.1);
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
<<<<<<< HEAD
      txHash: tx.hash,
    });

    // Mark seat as taken when ticket gets minted.
    await Event.updateOne(
      { eventId, "seats.seatId": seat },
      { $set: { "seats.$.isTaken": true } },
    );

=======
      qrSecret: createQrSecret(),
      txHash: tx.hash,
    });

>>>>>>> PostR1
    return res.json({ message: "Ticket minted", txHash: tx.hash, ticket });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Mint failed", error: error.message });
  }
});

module.exports = router;
