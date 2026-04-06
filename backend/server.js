// Main Express server bootstraps DB, middleware, and all API route groups.
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const authRoutes = require("./routes/auth");
const eventsRoutes = require("./routes/events");
const paymentRoutes = require("./routes/payment");
const ticketsRoutes = require("./routes/tickets");
const transferRoutes = require("./routes/transfer");
const gateRoutes = require("./routes/gate");

const app = express();
const PORT = process.env.PORT || 5000;

connectDB();

app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

// Health route helps quick sanity checks.
app.get("/health", (req, res) => res.json({ status: "ok", service: "BlockSeat Backend" }));

app.use("/auth", authRoutes);
app.use("/events", eventsRoutes);
app.use("/payment", paymentRoutes);
app.use("/tickets", ticketsRoutes);
app.use("/", transferRoutes);
app.use("/gate", gateRoutes);

app.listen(PORT, () => {
  console.log(`BlockSeat backend listening on http://localhost:${PORT}`);
});
