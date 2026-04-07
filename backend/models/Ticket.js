// Ticket schema mirrors both off-chain ownership state and on-chain metadata.
const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema(
  {
    tokenId: { type: Number, required: true, unique: true },
    eventId: { type: String, required: true },
    seat: { type: String, required: true },
    ownerBstId: { type: String, required: true },
    ownerWalletAddress: { type: String, required: true },
    faceValue: { type: Number, required: true },
    maxResalePrice: { type: Number, required: true },
    isUsed: { type: Boolean, default: false },
    transferCount: { type: Number, default: 0 },
    txHash: {
      type: String,
      required: true,
      index: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Ticket", ticketSchema);
