// User schema stores identity, custodial wallet, and generated BST ID.
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, unique: true },
    bstId: { type: String, required: true, unique: true },
    walletAddress: { type: String, required: true, unique: true },
    encryptedPrivateKey: { type: String, required: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

module.exports = mongoose.model("User", userSchema);
