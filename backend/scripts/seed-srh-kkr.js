// Seeds a live SRH vs KKR match with all seats open.
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Event = require("../models/Event");

const buildSeats = () => {
  const rows = [
    { row: "A", stand: "North", price: 1500 },
    { row: "B", stand: "East", price: 3500 },
    { row: "C", stand: "West", price: 3500 },
    { row: "D", stand: "South", price: 7000 },
  ];

  return rows.flatMap((group) =>
    Array.from({ length: 6 }, (_, index) => {
      const seatNumber = index + 1;
      return {
        seatId: `${group.row}${seatNumber}`,
        row: group.row,
        stand: group.stand,
        price: group.price,
        isTaken: false,
      };
    })
  );
};

const seed = async () => {
  await connectDB();

  const event = await Event.findOneAndUpdate(
    { eventId: "Match-002" },
    {
      eventId: "Match-002",
      name: "SRH vs KKR",
      date: new Date("2026-04-18T14:00:00.000Z"),
      venue: "Rajiv Gandhi International Stadium, Hyderabad",
      totalSeats: 24,
      seats: buildSeats(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log(`Seeded ${event.eventId} - ${event.name}`);
  await mongoose.disconnect();
};

seed().catch(async (error) => {
  console.error("Seed failed:", error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});