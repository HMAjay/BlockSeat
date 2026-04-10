// Builds a test-ready Express app with mocked blockchain and env vars.
const path = require("path");

// Set test env vars before any app code loads.
process.env.JWT_SECRET = "test-jwt-secret-1234567890";
process.env.MASTER_ENCRYPTION_KEY = "test-master-key-1234567890";
process.env.RAZORPAY_KEY_ID = "rzp_test_fake";
process.env.RAZORPAY_KEY_SECRET = "fake_razorpay_secret";
process.env.POLYGON_RPC_URL = "http://localhost:8545";
process.env.ADMIN_PRIVATE_KEY = "0x" + "a".repeat(64);
process.env.CONTRACT_ADDRESS = "0x" + "b".repeat(40);
process.env.GATE_ADMIN_BST_IDS = "BST-2025-00001";
process.env.NODE_ENV = "test";

// Mock blockchain module before requiring routes.
const mockTxResult = { hash: "0xmocktxhash" };
const mockContract = {
  mint: jest.fn().mockResolvedValue({ ...mockTxResult, wait: jest.fn().mockResolvedValue({}) }),
  resell: jest.fn().mockResolvedValue({ ...mockTxResult, wait: jest.fn().mockResolvedValue({}) }),
  burnOnEntry: jest.fn().mockResolvedValue({ ...mockTxResult, wait: jest.fn().mockResolvedValue({}) }),
  ownerOf: jest.fn().mockResolvedValue("0x" + "c".repeat(40)),
  getTicketData: jest.fn().mockResolvedValue({ isUsed: false }),
};

jest.mock("../config/blockchain", () => ({
  contract: mockContract,
  provider: { getBalance: jest.fn().mockResolvedValue(BigInt(0)) },
  adminSigner: { sendTransaction: jest.fn().mockResolvedValue({ wait: jest.fn() }) },
  CONTRACT_ABI: [],
}));

// Mock validateEnv to be a no-op in tests.
jest.mock("../config/validateEnv", () => jest.fn());

// Mock Razorpay in transfer routes.
jest.mock("razorpay", () => {
  return jest.fn().mockImplementation(() => ({
    orders: {
      create: jest.fn().mockResolvedValue({ id: "order_test123", amount: 10000 }),
    },
  }));
});

const express = require("express");
const jwt = require("jsonwebtoken");

function buildApp() {
  const app = express();
  app.use(express.json());

  // Load routes.
  app.use("/auth", require("../routes/auth"));
  app.use("/events", require("../routes/events"));
  app.use("/tickets", require("../routes/tickets"));
  app.use("/", require("../routes/transfer"));
  app.use("/gate", require("../routes/gate"));

  return app;
}

function makeToken(
  bstId = "BST-2025-00001",
  walletAddress = "0x" + "c".repeat(40),
  options = {}
) {
  return jwt.sign(
    { bstId, walletAddress, isGateAdmin: Boolean(options.isGateAdmin) },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
}

module.exports = { buildApp, makeToken, mockContract };
