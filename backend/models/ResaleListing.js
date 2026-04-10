// ResaleListing supports open-market seat listings (no fixed buyer BST ID).
const mongoose = require("mongoose");

const resaleListingSchema = new mongoose.Schema(
  {
    tokenId: { type: Number, required: true, index: true },
    eventId: { type: String, required: true, index: true },
    seat: { type: String, required: true },
    sellerBstId: { type: String, required: true, index: true },
    sellerWalletAddress: { type: String, required: true },
    resalePrice: { type: Number, required: true },
    status: {
      type: String,
      enum: ["listed", "sold", "cancelled"],
      default: "listed"
    },
    buyerBstId: { type: String },
    buyerWalletAddress: { type: String },
    paymentOrderId: { type: String },
    paymentId: { type: String },
    paymentSignature: { type: String },
    txHash: { type: String }
  },
  { timestamps: true }
);

resaleListingSchema.index({ tokenId: 1, status: 1 });
resaleListingSchema.index({ eventId: 1, seat: 1, status: 1 });

module.exports = mongoose.model("ResaleListing", resaleListingSchema);