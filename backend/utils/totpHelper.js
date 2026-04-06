// TOTP helper generates dynamic gate codes with 70-second refresh windows.
const { authenticator } = require("otplib");

authenticator.options = {
  step: 70,
  window: 1
};

const makeSecret = (tokenId) => `${process.env.TOTP_ISSUER || "BlockSeat"}-${tokenId}`;

const generateTOTP = (tokenId) => authenticator.generate(makeSecret(tokenId));

const verifyTOTP = (tokenId, totpCode) => authenticator.verify({ token: String(totpCode), secret: makeSecret(tokenId) });

module.exports = { generateTOTP, verifyTOTP };
