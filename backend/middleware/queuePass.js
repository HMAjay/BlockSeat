// Protects checkout creation endpoints with a short-lived JWT queue pass.
const jwt = require("jsonwebtoken");
const {
  QUEUE_SCOPE,
  QUEUE_PASS_SECRET,
  claimCheckoutQueuePass,
  isWaitingRoomUnavailable,
} = require("../config/waitingRoom");

module.exports = async (req, res, next) => {
  const rawPass = req.headers["x-blockseat-queue-pass"] || req.headers["x-queue-pass"];

  if (!rawPass) {
    return res.status(403).json({
      message: "Waiting room required before checkout",
      waitingRoomRequired: true,
      joinUrl: "/queue/join"
    });
  }

  try {
    const decoded = jwt.verify(rawPass, QUEUE_PASS_SECRET);
    if (decoded.scope !== QUEUE_SCOPE) {
      return res.status(403).json({ message: "Invalid queue pass scope", waitingRoomRequired: true });
    }

    if (!req.user || decoded.bstId !== req.user.bstId) {
      return res.status(403).json({ message: "Queue pass does not belong to this user", waitingRoomRequired: true });
    }

    let claimed;
    try {
      claimed = await claimCheckoutQueuePass(decoded.queueId, req.user.bstId);
    } catch (error) {
      if (isWaitingRoomUnavailable(error)) {
        return res.status(503).json({ message: "Waiting room temporarily unavailable" });
      }
      throw error;
    }
    if (!claimed) {
      return res.status(403).json({
        message: "Queue pass expired or already used",
        waitingRoomRequired: true,
        joinUrl: "/queue/join"
      });
    }

    req.queuePass = decoded;
    return next();
  } catch (error) {
    return res.status(403).json({
      message: "Invalid queue pass",
      waitingRoomRequired: true,
      joinUrl: "/queue/join"
    });
  }
};