const { z } = require("zod");

const gateVerifySchema = z.object({
  tokenId: z.number({ coerce: true }).int().positive("tokenId must be a positive integer"),
  totpCode: z.string().regex(/^\d{6}$/, "Must be exactly 6 digits")
});

const gateBurnSchema = z.object({
  tokenId: z.number({ coerce: true }).int().positive("tokenId must be a positive integer")
});

module.exports = { gateVerifySchema, gateBurnSchema };
