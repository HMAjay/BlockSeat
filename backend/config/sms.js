// Local OTP delivery helper with backend logging only.
const { logger } = require("./logger");

const initializeSmsClient = () => {
  logger.info("SMS provider disabled. OTPs will be logged by the backend only.");
  return null;
};

const sendOtp = async (phoneNumber, otp) => {
  logger.info(`[OTP] Generated OTP for ${phoneNumber}: ${otp}`);
  return { success: true, isMock: true };
};

const sendSms = async (phoneNumber, message) => {
  logger.info(`[SMS DISABLED] ${phoneNumber}: ${message}`);
  return { success: true, isMock: true };
};

module.exports = {
  initializeSmsClient,
  sendOtp,
  sendSms
};
