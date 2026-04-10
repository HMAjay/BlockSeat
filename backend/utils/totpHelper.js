// TOTP helper generates dynamic gate codes with per-ticket secrets.
const { authenticator } = require("otplib");

authenticator.options = {
  step: 30,
  window: 0
};

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

const deriveLegacySecret = (tokenId) => {
  const seed = `${process.env.TOTP_ISSUER || "BlockSeat"}-${tokenId}`;
  let secret = "";

  for (let i = 0; i < seed.length; i += 1) {
    secret += BASE32_ALPHABET[seed.charCodeAt(i) % BASE32_ALPHABET.length];
  }

  while (secret.length < 16) {
    secret += BASE32_ALPHABET[(seed.length * 7) % BASE32_ALPHABET.length];
  }

  return secret.slice(0, 32);
};

const makeSecret = (qrSecret, tokenId) => qrSecret || deriveLegacySecret(tokenId);

const generateTOTP = (qrSecret, tokenId) => authenticator.generate(makeSecret(qrSecret, tokenId));

const verifyTOTP = async (qrSecret, tokenId, totpCode) =>
  authenticator.verify({ token: String(totpCode), secret: makeSecret(qrSecret, tokenId) });

const createQrSecret = () => authenticator.generateSecret();

module.exports = { createQrSecret, deriveLegacySecret, generateTOTP, verifyTOTP };
