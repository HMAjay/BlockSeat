const { z } = require("zod");

const mintSchema = z.object({
  tokenId: z.number({ coerce: true }).int().positive("tokenId must be a positive integer"),
  eventId: z.string().min(1, "eventId is required"),
  seat: z.string().min(1, "seat is required"),
  faceValue: z.number({ coerce: true }).positive("faceValue must be positive").max(999999, "faceValue exceeds maximum")
});

module.exports = { mintSchema };
