const { z } = require("zod");

const createOrderSchema = z.object({
  amount: z.number({ coerce: true }).positive("Amount must be positive").max(999999, "Amount exceeds maximum"),
  currency: z.string().default("INR"),
  receipt: z.string().max(40).optional()
});

const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1, "Order ID is required"),
  razorpay_payment_id: z.string().min(1, "Payment ID is required"),
  razorpay_signature: z.string().min(1, "Signature is required")
});

module.exports = { createOrderSchema, verifyPaymentSchema };
