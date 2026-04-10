const request = require("supertest");
const { setup, teardown, clearDB } = require("../setup");
const { buildApp, makeToken, mockContract } = require("../testApp");
const User = require("../../models/User");
const Event = require("../../models/Event");
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

const seedUser = async () => {
  const user = await User.create({
    phone: "9876543210",
    bstId: "BST-2025-00001",
    walletAddress: "0x" + "c".repeat(40),
    encryptedPrivateKey: encryptKey("0x" + "a".repeat(64)),
  });
  token = makeToken(user.bstId, user.walletAddress);
  return user;
};

const seedEvent = async () => {
  return Event.create({
    eventId: "EVT001",
    name: "Test Event",
    date: new Date("2026-12-01"),
    venue: "Stadium",
    totalSeats: 2,
    seats: [
      { seatId: "A1", row: "A", stand: "North", price: 500, isTaken: false },
      { seatId: "A2", row: "A", stand: "North", price: 500, isTaken: false },
    ],
  });
};

describe("GET /tickets", () => {
  it("returns 401 without auth token", async () => {
    const res = await request(app).get("/tickets");
    expect(res.status).toBe(401);
  });

  it("returns empty array for user with no tickets", async () => {
    await seedUser();
    const res = await request(app)
      .get("/tickets")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe("POST /tickets/mint", () => {
  it("returns 401 without token", async () => {
    const res = await request(app).post("/tickets/mint").send({});
    expect(res.status).toBe(401);
  });

  it("returns 400 with missing fields", async () => {
    await seedUser();
    const res = await request(app)
      .post("/tickets/mint")
      .set("Authorization", `Bearer ${token}`)
      .send({ tokenId: 1 });
    expect(res.status).toBe(400);
  });

  it("mints ticket and marks seat as taken", async () => {
    await seedUser();
    await seedEvent();
    const res = await request(app)
      .post("/tickets/mint")
      .set("Authorization", `Bearer ${token}`)
      .send({ tokenId: 1, eventId: "EVT001", seat: "A1", faceValue: 500 });
    expect(res.status).toBe(200);
    expect(res.body.txHash).toBe("0xmocktxhash");
    expect(res.body.ticket.seat).toBe("A1");
    expect(mockContract.mint).toHaveBeenCalledTimes(1);

    // Verify seat is now taken.
    const event = await Event.findOne({ eventId: "EVT001" });
    const seat = event.seats.find((s) => s.seatId === "A1");
    expect(seat.isTaken).toBe(true);
  });

  it("returns 409 when seat already taken (concurrent guard)", async () => {
    await seedUser();
    await seedEvent();

    // Mark seat as already taken.
    await Event.updateOne(
      { eventId: "EVT001", "seats.seatId": "A1" },
      { $set: { "seats.$.isTaken": true } }
    );

    const res = await request(app)
      .post("/tickets/mint")
      .set("Authorization", `Bearer ${token}`)
      .send({ tokenId: 2, eventId: "EVT001", seat: "A1", faceValue: 500 });
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already taken/i);
  });
});
