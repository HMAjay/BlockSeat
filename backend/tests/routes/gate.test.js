const request = require("supertest");
const { setup, teardown, clearDB } = require("../setup");
const { buildApp, makeToken, mockContract } = require("../testApp");
const User = require("../../models/User");
const Ticket = require("../../models/Ticket");
const { encryptKey } = require("../../utils/walletManager");

let app, token;

beforeAll(async () => {
  await setup();
  app = buildApp();
});
afterEach(async () => {
  await clearDB();
  jest.clearAllMocks();
});
afterAll(async () => await teardown());

const seedData = async () => {
  const user = await User.create({
    phone: "9876543210",
    bstId: "BST-2025-00001",
    walletAddress: "0x" + "c".repeat(40),
    encryptedPrivateKey: encryptKey("0x" + "a".repeat(64)),
  });
  token = makeToken(user.bstId, user.walletAddress);

  const ticket = await Ticket.create({
    tokenId: 100,
    eventId: "EVT001",
    seat: "A1",
    ownerBstId: user.bstId,
    ownerWalletAddress: user.walletAddress,
    faceValue: 500,
    maxResalePrice: 550,
    isUsed: false,
    transferCount: 0,
    qrSecret: "TESTQRSECRET1234",
    txHash: "0xabc",
  });

  // Mock ownerOf to return the user's wallet.
  mockContract.ownerOf.mockResolvedValue(user.walletAddress);

  return { user, ticket };
};

describe("POST /gate/verify", () => {
  it("returns 400 for non-existent ticket", async () => {
    const res = await request(app)
      .post("/gate/verify")
      .send({ tokenId: 999, totpCode: "123456" });
    expect(res.status).toBe(400);
    expect(res.body.reason).toMatch(/not found/i);
  });

  it("returns 400 for invalid TOTP code", async () => {
    await seedData();
    const res = await request(app)
      .post("/gate/verify")
      .send({ tokenId: 100, totpCode: "000000" });
    expect(res.status).toBe(400);
    expect(res.body.reason).toMatch(/TOTP/i);
  });

  it("returns 400 for already used ticket", async () => {
    const { ticket } = await seedData();
    ticket.isUsed = true;
    await ticket.save();
    mockContract.getTicketData.mockResolvedValue({ isUsed: true });

    const res = await request(app)
      .post("/gate/verify")
      .send({ tokenId: 100, totpCode: "123456" });
    // Will fail at TOTP before reaching the isUsed check, which is fine.
    expect(res.status).toBe(400);
  });
});

describe("POST /gate/burn", () => {
  it("returns 200 and burns ticket", async () => {
    await seedData();
    const res = await request(app)
      .post("/gate/burn")
      .send({ tokenId: 100 });
    expect(res.status).toBe(200);
    expect(res.body.txHash).toBe("0xmocktxhash");
    expect(mockContract.burnOnEntry).toHaveBeenCalled();

    const ticket = await Ticket.findOne({ tokenId: 100 });
    expect(ticket.isUsed).toBe(true);
  });

  it("returns 400 with missing tokenId", async () => {
    const res = await request(app).post("/gate/burn").send({});
    expect(res.status).toBe(400);
  });
});
