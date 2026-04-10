// TransferRequest tracks a seller-created offer for a specific buyer.
const mongoose = require("mongoose");

const transferRequestSchema = new mongoose.Schema(
  {
    tokenId: { type: Number, required: true, index: true },
    eventId: { type: String, required: true },
    seat: { type: String, required: true },
    sellerBstId: { type: String, required: true, index: true },
    sellerWalletAddress: { type: String, required: true },
    buyerBstId: { type: String, required: true, index: true },
    buyerWalletAddress: { type: String, required: true },
    resalePrice: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "completed", "declined", "cancelled"],
      default: "pending"
    },
    paymentOrderId: { type: String },
    paymentId: { type: String },
    paymentSignature: { type: String },
    txHash: { type: String }
  },
  { timestamps: true }
);

transferRequestSchema.index({ tokenId: 1, buyerBstId: 1, status: 1 });

module.exports = mongoose.model("TransferRequest", transferRequestSchema);
