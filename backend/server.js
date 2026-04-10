// Main Express server bootstraps DB, middleware, and all API route groups.
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const validateEnv = require("./config/validateEnv");
validateEnv();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
//const { logger, httpLogger } = require("./config/logger");
const { globalLimiter } = require("./middleware/rateLimiter");

const authRoutes = require("./routes/auth");
const queueRoutes = require("./routes/queue");
const eventsRoutes = require("./routes/events");
const paymentRoutes = require("./routes/payment");
const ticketsRoutes = require("./routes/tickets");
const transferRoutes = require("./routes/transfer");
const gateRoutes = require("./routes/gate");

const app = express();
const PORT = process.env.PORT || 5000;

connectDB();

const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((o) => o.trim())
  : ["http://localhost:3000", "http://localhost:3001"];
app.use(cors({ origin: corsOrigins }));
app.use(express.json());
//app.use(httpLogger);
app.use(globalLimiter);

// Health route helps quick sanity checks.
app.get("/health", (req, res) => res.json({ status: "ok", service: "BlockSeat Backend" }));

app.use("/auth", authRoutes);
app.use("/queue", queueRoutes);
app.use("/events", eventsRoutes);
app.use("/payment", paymentRoutes);
app.use("/tickets", ticketsRoutes);
app.use("/", transferRoutes);
app.use("/gate", gateRoutes);

app.listen(PORT, () => {
  console.log(`BlockSeat backend listening on http://localhost:${PORT}`);
});
