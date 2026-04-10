// Admin routes for scheduling new matches with default seat layout.
const express = require("express");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const Event = require("../models/Event");
const validate = require("../middleware/validate");

const router = express.Router();

const adminUser = process.env.ADMIN_USER || "admin";
const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
const adminJwtSecret = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET;

const adminLoginSchema = z.object({
  userId: z.string().min(1, "userId is required"),
  password: z.string().min(1, "password is required"),
});

const scheduleMatchSchema = z.object({
  eventId: z.string().regex(/^Match-\d+$/, "eventId must be like Match-003"),
  name: z.string().min(3, "name is required"),
  date: z.string().datetime("date must be an ISO datetime string"),
  venue: z.string().min(3, "venue is required"),
});

const adminAuth = (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    return res.status(401).json({ message: "Admin token missing" });
  }

  try {
    const decoded = jwt.verify(token, adminJwtSecret);
    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }
    req.admin = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid admin token" });
  }
};

const buildDefaultSeats = () => {
  const layout = [
    { row: "A", stand: "North", price: 1500 },
    { row: "B", stand: "East", price: 4000 },
    { row: "C", stand: "West", price: 4000 },
    { row: "D", stand: "South", price: 7000 },
  ];

  return layout.flatMap((group) =>
    Array.from({ length: 6 }, (_, index) => ({
      seatId: `${group.row}${index + 1}`,
      row: group.row,
      stand: group.stand,
      price: group.price,
      isTaken: false,
    }))
  );
};

router.post("/login", validate(adminLoginSchema), async (req, res) => {
  const { userId, password } = req.body;
  if (userId !== adminUser || password !== adminPassword) {
    return res.status(401).json({ message: "Invalid admin credentials" });
  }

  const token = jwt.sign({ role: "admin", userId }, adminJwtSecret, { expiresIn: "12h" });
  return res.json({ message: "Admin login successful", token });
});

router.post("/matches", adminAuth, validate(scheduleMatchSchema), async (req, res) => {
  try {
    const { eventId, name, date, venue } = req.body;
    const exists = await Event.findOne({ eventId });
    if (exists) {
      return res.status(400).json({ message: "Event ID already exists" });
    }

    const seats = buildDefaultSeats();
    const event = await Event.create({
      eventId,
      name,
      date: new Date(date),
      venue,
      totalSeats: seats.length,
      seats,
    });

    return res.json({ message: "Match scheduled", eventId: event.eventId, event });
  } catch (error) {
    return res.status(500).json({ message: "Failed to schedule match", error: error.message });
  }
});

module.exports = router;