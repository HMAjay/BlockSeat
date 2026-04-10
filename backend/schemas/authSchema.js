const { z } = require("zod");

const sendOtpSchema = z.object({
  phone: z.string().regex(/^[6-9]\d{9}$/, "Must be a valid 10-digit Indian mobile number"),
  captchaToken: z.string().min(1, "Complete CAPTCHA before sending OTP").optional()
});

const verifyOtpSchema = z.object({
  phone: z.string().regex(/^[6-9]\d{9}$/, "Must be a valid 10-digit Indian mobile number"),
  otp: z.string().regex(/^\d{6}$/, "Must be exactly 6 digits")
});

module.exports = { sendOtpSchema, verifyOtpSchema };
