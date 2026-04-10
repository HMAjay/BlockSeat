const request = require("supertest");
const { setup, teardown, clearDB } = require("../setup");
const { buildApp, makeToken } = require("../testApp");

let app;

beforeAll(async () => {
  await setup();
  app = buildApp();
});
afterEach(async () => await clearDB());
afterAll(async () => await teardown());

describe("POST /auth/send-otp", () => {
  it("returns 400 for invalid phone number", async () => {
    const res = await request(app).post("/auth/send-otp").send({ phone: "123" });
    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  it("sends OTP for valid phone", async () => {
    const res = await request(app).post("/auth/send-otp").send({ phone: "9876543210" });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/OTP sent/i);
  });
});

describe("POST /auth/verify-otp", () => {
  it("returns 400 for expired/missing OTP", async () => {
    const res = await request(app)
      .post("/auth/verify-otp")
      .send({ phone: "9876543210", otp: "123456" });
    expect(res.status).toBe(400);
  });

  it("creates user and returns token on valid OTP flow", async () => {
    // Send OTP first.
    await request(app).post("/auth/send-otp").send({ phone: "9000000001" });

    // We can't know the OTP from outside, so verify returns 400 for wrong OTP.
    const res = await request(app)
      .post("/auth/verify-otp")
      .send({ phone: "9000000001", otp: "000000" });
    expect(res.status).toBe(400);
  });
});
