// Event routes expose seat maps for booking UI.
const express = require("express");
const Event = require("../models/Event");
const validate = require("../middleware/validate");
const { eventIdParamSchema } = require("../schemas/eventSchema");
const { buildSectionSummary } = require("../utils/stadiumLayout");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const events = await Event.find({})
      .sort({ date: 1 })
      .select("eventId name date venue totalSeats seats")
      .lean();

    return res.json(events.map((event) => ({
      eventId: event.eventId,
      name: event.name,
      date: event.date,
      venue: event.venue,
      totalSeats: event.totalSeats,
      minPrice: Array.isArray(event.seats) && event.seats.length
        ? Math.min(...event.seats.map((seat) => Number(seat.price) || 0))
        : 0,
      maxPrice: Array.isArray(event.seats) && event.seats.length
        ? Math.max(...event.seats.map((seat) => Number(seat.price) || 0))
        : 0,
      availableSeats: Array.isArray(event.seats)
        ? event.seats.filter((seat) => !seat.isTaken).length
        : 0,
      sections: buildSectionSummary(event.seats || []),
    })));
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch events", error: error.message });
  }
});

router.get("/:id/seats", validate(eventIdParamSchema, "params"), async (req, res) => {
  try {
    const event = await Event.findOne({ eventId: req.params.id });
    if (!event) return res.status(404).json({ message: "Event not found" });

    return res.json({
      eventId: event.eventId,
      name: event.name,
      date: event.date,
      venue: event.venue,
      sections: buildSectionSummary(event.seats || []),
      seats: event.seats
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch seats", error: error.message });
  }
});

module.exports = router;
