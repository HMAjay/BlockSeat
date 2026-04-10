// Mock logger before importing txRetry.
jest.mock("../../config/logger", () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

const { sendWithRetry } = require("../../utils/txRetry");

describe("sendWithRetry", () => {
  it("returns tx and receipt on first success", async () => {
    const mockTx = { hash: "0x1", wait: jest.fn().mockResolvedValue({ status: 1 }) };
    const result = await sendWithRetry(() => Promise.resolve(mockTx));
    expect(result.tx.hash).toBe("0x1");
    expect(mockTx.wait).toHaveBeenCalled();
  });

  it("retries on NONCE_EXPIRED and eventually succeeds", async () => {
    const nonceErr = new Error("nonce expired");
    nonceErr.code = "NONCE_EXPIRED";
    let calls = 0;
    const txFn = () => {
      calls++;
      if (calls < 3) throw nonceErr;
      return Promise.resolve({ hash: "0x2", wait: jest.fn().mockResolvedValue({}) });
    };
    const result = await sendWithRetry(txFn, { retries: 3, baseDelay: 10 });
    expect(result.tx.hash).toBe("0x2");
    expect(calls).toBe(3);
  });

  it("throws immediately for non-retryable errors", async () => {
    const err = new Error("revert");
    err.code = "CALL_EXCEPTION";
    await expect(sendWithRetry(() => { throw err; }, { retries: 3 })).rejects.toThrow("revert");
  });

  it("throws after max retries", async () => {
    const err = new Error("nonce");
    err.code = "NONCE_EXPIRED";
    await expect(
      sendWithRetry(() => { throw err; }, { retries: 2, baseDelay: 10 })
    ).rejects.toThrow("nonce");
  });
});
