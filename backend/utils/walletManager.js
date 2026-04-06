// Wallet manager handles custodial wallet creation and key encryption/decryption.
const { Wallet } = require("ethers");
const CryptoJS = require("crypto-js");

const createWallet = () => Wallet.createRandom();

const encryptKey = (privateKey) => {
  return CryptoJS.AES.encrypt(privateKey, process.env.MASTER_ENCRYPTION_KEY).toString();
};

const decryptKey = (encryptedPrivateKey) => {
  const bytes = CryptoJS.AES.decrypt(encryptedPrivateKey, process.env.MASTER_ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};

module.exports = { createWallet, encryptKey, decryptKey };
