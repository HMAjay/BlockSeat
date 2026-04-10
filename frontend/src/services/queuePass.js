// Helper for joining the checkout waiting room and polling for a JWT queue pass.
import api from "./api";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function acquireCheckoutQueuePass({ onStatus } = {}) {
  const { data } = await api.post("/queue/join");

  if (data.allowed && data.queuePass) {
    return data.queuePass;
  }

  let queueId = data.queueId;
  let retryAfterMs = data.retryAfterMs || 2500;

  if (onStatus) {
    onStatus(`Waiting room position ${data.position}. Hold tight.`);
  }

  for (let attempt = 0; attempt < 30; attempt += 1) {
    await sleep(retryAfterMs);
    const statusResp = await api.get(`/queue/status/${queueId}`);
    const status = statusResp.data;

    if (status.allowed && status.queuePass) {
      return status.queuePass;
    }

    if (status.expired) {
      throw new Error("Waiting room entry expired. Please join again.");
    }

    queueId = status.queueId || queueId;
    retryAfterMs = status.retryAfterMs || retryAfterMs;

    if (onStatus) {
      onStatus(`Waiting room position ${status.position}. Hold tight.`);
    }
  }

  throw new Error("Queue timed out. Please try again.");
}