// SMS service configuration for Twilio real-time OTP delivery.
const twilio = require("twilio");
const { logger } = require("./logger");

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

let twilioClient = null;

const initializeSmsClient = () => {
  if (!accountSid || !authToken) {
    logger.warn("Twilio credentials not configured. OTP will be logged to console only.");
    return null;
  }
  twilioClient = twilio(accountSid, authToken);
  return twilioClient;
};

const sendOtp = async (phoneNumber, otp) => {
  try {
    if (!twilioClient) {
      logger.debug(`[MOCK SMS] OTP for ${phoneNumber}: ${otp}`);
      return { success: true, isMock: true };
    }

    const message = await twilioClient.messages.create({
      body: `Your BlockSeat verification code is: ${otp}. Valid for 5 minutes. Do not share with anyone.`,
      from: fromNumber,
      to: phoneNumber
    });

    logger.info(`SMS sent successfully to ${phoneNumber}. SID: ${message.sid}`);
    return { success: true, messageSid: message.sid };
  } catch (error) {
    logger.error(`Failed to send OTP SMS to ${phoneNumber}: ${error.message}`);
    throw new Error(`Failed to send OTP: ${error.message}`);
  }
};

const sendSms = async (phoneNumber, message) => {
  try {
    if (!twilioClient) {
      logger.debug(`[MOCK SMS] ${phoneNumber}: ${message}`);
      return { success: true, isMock: true };
    }

    const result = await twilioClient.messages.create({
      body: message,
      from: fromNumber,
      to: phoneNumber
    });

    logger.info(`SMS sent to ${phoneNumber}. SID: ${result.sid}`);
    return { success: true, messageSid: result.sid };
  } catch (error) {
    logger.error(`Failed to send SMS to ${phoneNumber}: ${error.message}`);
    throw new Error(`Failed to send SMS: ${error.message}`);
  }
};

module.exports = {
  initializeSmsClient,
  sendOtp,
  sendSms
};
