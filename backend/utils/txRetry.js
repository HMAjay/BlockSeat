// Retry wrapper for blockchain transactions with exponential backoff.
const { logger } = require("../config/logger");

async function sendWithRetry(txFn, { retries = 3, baseDelay = 1000, label = "tx" } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const tx = await txFn();
      const receipt = await tx.wait();
      return { tx, receipt };
    } catch (error) {
      lastError = error;
      const isRetryable =
        error.code === "NONCE_EXPIRED" ||
        error.code === "REPLACEMENT_UNDERPRICED" ||
        error.code === "SERVER_ERROR" ||
        error.code === "TIMEOUT" ||
        error.code === "NETWORK_ERROR" ||
        (error.message && error.message.includes("nonce"));
      if (!isRetryable || attempt === retries) {
        logger.error(`${label} failed after ${attempt} attempt(s): ${error.message}`);
        throw error;
      }
      const delay = baseDelay * Math.pow(2, attempt - 1);
      logger.warn(`${label} attempt ${attempt} failed, retrying in ${delay}ms: ${error.message}`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}

module.exports = { sendWithRetry };
