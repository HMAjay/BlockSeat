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

const router = express.Router();

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

router.post("/mint", auth, async (req, res) => {
  try {
    const { tokenId, eventId, seat, faceValue } = req.body;
    if (!tokenId || !eventId || !seat || !faceValue) {
      return res
        .status(400)
        .json({ message: "tokenId, eventId, seat, faceValue are required" });
    }

    const buyer = await User.findOne({ bstId: req.user.bstId });
    if (!buyer) return res.status(404).json({ message: "Buyer not found" });

    // Decrypt key to satisfy custodial flow check; tx itself is signed by admin per contract rules.
    const decrypted = decryptKey(buyer.encryptedPrivateKey);
    if (!decrypted || !ethers.isHexString(decrypted)) {
      return res.status(400).json({ message: "Buyer key decryption failed" });
    }

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
      qrSecret: createQrSecret(),
      txHash: tx.hash,
    });

    // Mark seat as taken when ticket gets minted.
    await Event.updateOne(
      { eventId, "seats.seatId": seat },
      { $set: { "seats.$.isTaken": true } },
    );

    return res.json({ message: "Ticket minted", txHash: tx.hash, ticket });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Mint failed", error: error.message });
  }
});

module.exports = router;
