const request = require("supertest");
const { setup, teardown, clearDB } = require("../setup");
const { buildApp } = require("../testApp");
const Event = require("../../models/Event");

let app;

beforeAll(async () => {
  await setup();
  app = buildApp();
});
afterEach(async () => await clearDB());
afterAll(async () => await teardown());

describe("GET /events/:id/seats", () => {
  it("returns 404 for unknown event", async () => {
    const res = await request(app).get("/events/UNKNOWN/seats");
    expect(res.status).toBe(404);
  });

  it("returns seat map for existing event", async () => {
    await Event.create({
      eventId: "EVT001",
      name: "Test Event",
      date: new Date("2026-12-01"),
      venue: "Wankhede",
      totalSeats: 1,
      seats: [{ seatId: "A1", row: "A", stand: "North", price: 500, isTaken: false }],
    });

    const res = await request(app).get("/events/EVT001/seats");
    expect(res.status).toBe(200);
    expect(res.body.eventId).toBe("EVT001");
    expect(res.body.seats).toHaveLength(1);
    expect(res.body.seats[0].seatId).toBe("A1");
  });
});
