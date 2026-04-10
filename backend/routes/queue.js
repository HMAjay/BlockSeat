// Waiting room routes issue and refresh queue passes before checkout.
const express = require("express");
const rateLimit = require("express-rate-limit");
const auth = require("../middleware/authMiddleware");
const {
  joinCheckoutQueue,
  getCheckoutQueueStatus,
  allowQueueStatusPoll,
  STATUS_MIN_POLL_MS,
  isWaitingRoomUnavailable,
} = require("../config/waitingRoom");

const router = express.Router();

const queueJoinLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.QUEUE_JOIN_RATE_LIMIT || 30),
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many queue join attempts, please retry shortly" },
});

const queueStatusLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.QUEUE_STATUS_RATE_LIMIT || 120),
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many queue status checks, please retry shortly" },
});

router.post("/join", auth, queueJoinLimiter, async (req, res) => {
  try {
    const result = await joinCheckoutQueue(req.user.bstId);
    return res.json(result);
  } catch (error) {
    if (isWaitingRoomUnavailable(error)) {
      return res.status(503).json({ message: "Waiting room temporarily unavailable" });
    }
    return res.status(500).json({ message: "Failed to enter waiting room", error: error.message });
  }
});

router.get("/status/:queueId", auth, queueStatusLimiter, async (req, res) => {
  try {
    const pollAllowed = await allowQueueStatusPoll(req.params.queueId, req.user.bstId);
    if (!pollAllowed) {
      return res.status(429).json({
        message: "Queue status polled too quickly",
        retryAfterMs: STATUS_MIN_POLL_MS,
      });
    }

    const result = await getCheckoutQueueStatus(req.params.queueId, req.user.bstId);
    if (result.expired) {
      return res.status(410).json({ message: "Queue entry expired" });
    }
    return res.json(result);
  } catch (error) {
    if (isWaitingRoomUnavailable(error)) {
      return res.status(503).json({ message: "Waiting room temporarily unavailable" });
    }
    return res.status(500).json({ message: "Failed to check queue status", error: error.message });
  }
});

module.exports = router;