const request = require("supertest");
const { setup, teardown, clearDB } = require("../setup");
const { buildApp, makeToken } = require("../testApp");

let app;
let token;
let secondToken;

beforeAll(async () => {
  await setup();
  process.env.QUEUE_STATUS_MIN_POLL_MS = "1500";
  app = buildApp();
  token = makeToken();
  secondToken = makeToken("BST-2025-00002", "0x" + "d".repeat(40));
});

afterEach(async () => {
  await clearDB();
  jest.clearAllMocks();
});

afterAll(async () => await teardown());

describe("checkout waiting room", () => {
  it("issues a queue pass for authenticated users", async () => {
    const res = await request(app)
      .post("/queue/join")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.allowed).toBe(true);
    expect(res.body.queuePass).toBeTruthy();
  });

  it("blocks checkout order creation without a queue pass", async () => {
    const res = await request(app)
      .post("/payment/create-order")
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: 500 });

    expect(res.status).toBe(403);
    expect(res.body.waitingRoomRequired).toBe(true);
  });

  it("allows checkout order creation with a valid queue pass", async () => {
    const queueRes = await request(app)
      .post("/queue/join")
      .set("Authorization", `Bearer ${token}`);

    const res = await request(app)
      .post("/payment/create-order")
      .set("Authorization", `Bearer ${token}`)
      .set("X-BlockSeat-Queue-Pass", queueRes.body.queuePass)
      .send({ amount: 500 });

    expect(res.status).toBe(200);
    expect(res.body.keyId).toBe("rzp_test_fake");
  });

  it("throttles queue status polling when requests are too frequent", async () => {
    const joined = await request(app)
      .post("/queue/join")
      .set("Authorization", `Bearer ${secondToken}`);

    expect(joined.status).toBe(200);
    expect(joined.body.queueId).toBeTruthy();

    const firstStatus = await request(app)
      .get(`/queue/status/${joined.body.queueId}`)
      .set("Authorization", `Bearer ${secondToken}`);
    expect(firstStatus.status).toBe(200);

    const secondStatus = await request(app)
      .get(`/queue/status/${joined.body.queueId}`)
      .set("Authorization", `Bearer ${secondToken}`);

    expect(secondStatus.status).toBe(429);
    expect(secondStatus.body.message).toMatch(/polled too quickly/i);
  });
});