const request = require("supertest");
const { setup, teardown, clearDB } = require("../setup");
const { buildApp, makeToken } = require("../testApp");
const User = require("../../models/User");
const Ticket = require("../../models/Ticket");
const TransferRequest = require("../../models/TransferRequest");
const { encryptKey } = require("../../utils/walletManager");

let app, sellerToken, buyerToken;

beforeAll(async () => {
  await setup();
  app = buildApp();
});
afterEach(async () => {
  await clearDB();
  jest.clearAllMocks();
});
afterAll(async () => await teardown());

const seedTransferData = async () => {
  const seller = await User.create({
    phone: "9000000001",
    bstId: "BST-2025-00001",
    walletAddress: "0x" + "1".repeat(40),
    encryptedPrivateKey: encryptKey("0x" + "a".repeat(64)),
  });
  const buyer = await User.create({
    phone: "9000000002",
    bstId: "BST-2025-00002",
    walletAddress: "0x" + "2".repeat(40),
    encryptedPrivateKey: encryptKey("0x" + "b".repeat(64)),
  });
  sellerToken = makeToken(seller.bstId, seller.walletAddress);
  buyerToken = makeToken(buyer.bstId, buyer.walletAddress);

  const ticket = await Ticket.create({
    tokenId: 100,
    eventId: "EVT001",
    seat: "A1",
    ownerBstId: seller.bstId,
    ownerWalletAddress: seller.walletAddress,
    faceValue: 500,
    maxResalePrice: 550,
    isUsed: false,
    transferCount: 0,
    qrSecret: "TESTQRSECRET1234",
    txHash: "0xabc",
  });

  return { seller, buyer, ticket };
};

describe("GET /users/lookup/:bstId", () => {
  it("returns 404 for unknown user", async () => {
    await seedTransferData();
    const res = await request(app)
      .get("/users/lookup/BST-2025-99999")
      .set("Authorization", `Bearer ${sellerToken}`);
    expect(res.status).toBe(404);
  });

  it("returns user info for valid bstId", async () => {
    const { buyer } = await seedTransferData();
    const res = await request(app)
      .get(`/users/lookup/${buyer.bstId}`)
      .set("Authorization", `Bearer ${sellerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.walletAddress).toBe(buyer.walletAddress);
  });
});

describe("POST /transfer/request", () => {
  it("creates a transfer request", async () => {
    const { buyer } = await seedTransferData();
    const res = await request(app)
      .post("/transfer/request")
      .set("Authorization", `Bearer ${sellerToken}`)
      .send({ tokenId: 100, buyerBstId: buyer.bstId, resalePrice: 550 });
    expect(res.status).toBe(200);
    expect(res.body.request.status).toBe("pending");
  });

  it("rejects price above cap", async () => {
    const { buyer } = await seedTransferData();
    const res = await request(app)
      .post("/transfer/request")
      .set("Authorization", `Bearer ${sellerToken}`)
      .send({ tokenId: 100, buyerBstId: buyer.bstId, resalePrice: 9999 });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/cap/i);
  });

  it("rejects non-owner", async () => {
    await seedTransferData();
    const res = await request(app)
      .post("/transfer/request")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ tokenId: 100, buyerBstId: "BST-2025-00001", resalePrice: 500 });
    expect(res.status).toBe(403);
  });
});

describe("POST /transfer/request/:id/decline", () => {
  it("declines a pending request", async () => {
    const { seller, buyer, ticket } = await seedTransferData();
    const tr = await TransferRequest.create({
      tokenId: 100,
      eventId: "EVT001",
      seat: "A1",
      sellerBstId: seller.bstId,
      sellerWalletAddress: seller.walletAddress,
      buyerBstId: buyer.bstId,
      buyerWalletAddress: buyer.walletAddress,
      resalePrice: 500,
      status: "pending",
    });

    const res = await request(app)
      .post(`/transfer/request/${tr._id}/decline`)
      .set("Authorization", `Bearer ${buyerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.request.status).toBe("declined");
  });
});
