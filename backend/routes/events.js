// Event routes expose seat maps for booking UI.
const express = require("express");
const Event = require("../models/Event");
<<<<<<< HEAD

const router = express.Router();

router.get("/:id/seats", async (req, res) => {
=======
const validate = require("../middleware/validate");
const { eventIdParamSchema } = require("../schemas/eventSchema");

const router = express.Router();

router.get("/:id/seats", validate(eventIdParamSchema, "params"), async (req, res) => {
>>>>>>> PostR1
  try {
    const event = await Event.findOne({ eventId: req.params.id });
    if (!event) return res.status(404).json({ message: "Event not found" });

    return res.json({
      eventId: event.eventId,
      name: event.name,
      date: event.date,
      venue: event.venue,
      seats: event.seats
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch seats", error: error.message });
  }
});

module.exports = router;
