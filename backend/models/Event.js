const mongoose = require("mongoose");

const seatSchema = new mongoose.Schema(
  {
    seatId: { type: String, required: true },
    row: { type: String, required: true },
    stand: { type: String, required: true },
    section: { type: String },
    category: { type: String },
    price: { type: Number, required: true },
    isTaken: { type: Boolean, default: false },
    seatType: { type: String, enum: ["normal", "yellow"], default: "normal" }
  },
  { _id: false }
);

const eventSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    date: { type: Date, required: true },
    venue: { type: String, required: true },
    totalSeats: { type: Number, required: true },
    seats: [seatSchema]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Event", eventSchema);
