const { z } = require("zod");

const bstIdRegex = /^BST-\d{4}-\d{5}$/;
const mongoIdRegex = /^[a-fA-F0-9]{24}$/;

const transferRequestSchema = z.object({
  tokenId: z.number({ coerce: true }).int().positive("tokenId must be a positive integer"),
  buyerBstId: z.string().regex(bstIdRegex, "Must be a valid BST ID (e.g. BST-2026-00001)"),
  resalePrice: z.number({ coerce: true }).positive("resalePrice must be positive").max(999999, "resalePrice exceeds maximum")
});

const transferCompleteSchema = z.object({
  razorpay_order_id: z.string().min(1, "Order ID is required"),
  razorpay_payment_id: z.string().min(1, "Payment ID is required"),
  razorpay_signature: z.string().min(1, "Signature is required")
});

const mongoIdParamSchema = z.object({
  id: z.string().regex(mongoIdRegex, "Invalid request ID format")
});

const bstIdParamSchema = z.object({
  bstId: z.string().regex(bstIdRegex, "Must be a valid BST ID")
});

module.exports = { transferRequestSchema, transferCompleteSchema, mongoIdParamSchema, bstIdParamSchema };
