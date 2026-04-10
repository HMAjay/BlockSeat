// Structured logger using winston with HTTP request logging via morgan.
const winston = require("winston");
const morgan = require("morgan");

const isProduction = process.env.NODE_ENV === "production";

const logger = winston.createLogger({
  level: isProduction ? "info" : "debug",
  format: isProduction
    ? winston.format.combine(winston.format.timestamp(), winston.format.json())
    : winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: "HH:mm:ss" }),
        winston.format.printf(({ timestamp, level, message }) => `${timestamp} ${level}: ${message}`)
      ),
  transports: [new winston.transports.Console()]
});

// Morgan stream that writes to winston instead of stdout.
const httpLogger = morgan(isProduction ? "combined" : "dev", {
  stream: { write: (msg) => logger.info(msg.trimEnd()) }
});

module.exports = { logger, httpLogger };
