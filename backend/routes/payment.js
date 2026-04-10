// Payment routes integrate Razorpay test mode order lifecycle.
const express = require("express");
const crypto = require("crypto");
const Razorpay = require("razorpay");
const { paymentLimiter } = require("../middleware/rateLimiter");
const validate = require("../middleware/validate");
const { createOrderSchema, verifyPaymentSchema } = require("../schemas/paymentSchema");

const router = express.Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

router.post("/create-order", paymentLimiter, validate(createOrderSchema), async (req, res) => {
  try {
    const { amount, currency = "INR", receipt = `receipt_${Date.now()}` } = req.body;

    const order = await razorpay.orders.create({
      amount: Math.round(Number(amount) * 100), // Razorpay takes paise.
      currency,
      receipt
    });

    return res.json({ ...order, keyId: process.env.RAZORPAY_KEY_ID });
  } catch (error) {
    return res.status(500).json({ message: "Order creation failed", error: error.message });
  }
});

router.post("/verify", paymentLimiter, validate(verifyPaymentSchema), async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const generated = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const verified = generated === razorpay_signature;
    return res.json({ verified });
  } catch (error) {
    return res.status(500).json({ message: "Payment verification failed", error: error.message });
  }
});

module.exports = router;
