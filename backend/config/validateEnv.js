// Validates required environment variables at startup and crashes fast with clear errors.
const validateEnv = () => {
  const required = [
    { key: "MONGO_URI", check: (v) => v.startsWith("mongodb"), hint: "must start with 'mongodb'" },
    { key: "JWT_SECRET", check: (v) => v.length >= 16, hint: "must be at least 16 characters" },
    { key: "MASTER_ENCRYPTION_KEY", check: (v) => v.length >= 16, hint: "must be at least 16 characters" },
    { key: "POLYGON_RPC_URL", check: (v) => v.startsWith("http"), hint: "must be an HTTP(S) URL" },
    { key: "ADMIN_PRIVATE_KEY", check: (v) => /^0x[0-9a-fA-F]{64}$/.test(v), hint: "must be 0x + 64 hex chars" },
    { key: "CONTRACT_ADDRESS", check: (v) => /^0x[0-9a-fA-F]{40}$/.test(v), hint: "must be 0x + 40 hex chars" },
    { key: "RAZORPAY_KEY_ID", check: (v) => v.startsWith("rzp_"), hint: "must start with 'rzp_'" },
    { key: "RAZORPAY_KEY_SECRET", check: (v) => v.length > 0, hint: "must not be empty" }
  ];

  const optional = [
    { key: "ADMIN_USER", check: (v) => v.trim().length > 0, hint: "should not be empty if set" },
    { key: "ADMIN_PASSWORD", check: (v) => v.length >= 6, hint: "should be at least 6 characters if set" },
    { key: "ADMIN_JWT_SECRET", check: (v) => v.length >= 16, hint: "should be at least 16 characters if set" },
    { key: "QUEUE_PASS_SECRET", check: (v) => v.length >= 16, hint: "should be at least 16 characters if set" },
    { key: "REDIS_URL", check: (v) => v.startsWith("redis://") || v.startsWith("rediss://"), hint: "should be a Redis URL if set" },
    { key: "CAPTCHA_ENABLED", check: (v) => ["true", "false"].includes(v), hint: "should be true or false if set" },
    { key: "TURNSTILE_SECRET_KEY", check: (v) => v.length > 20, hint: "should be a valid Turnstile secret if set" },
    { key: "QUEUE_MAX_ACTIVE_CHECKOUTS", check: (v) => Number(v) > 0, hint: "should be a positive number if set" },
    { key: "QUEUE_PASS_TTL_SECONDS", check: (v) => Number(v) > 0, hint: "should be a positive number if set" },
    { key: "QUEUE_WAIT_TTL_SECONDS", check: (v) => Number(v) > 0, hint: "should be a positive number if set" },
    { key: "QUEUE_JOIN_RATE_LIMIT", check: (v) => Number(v) > 0, hint: "should be a positive number if set" },
    { key: "QUEUE_STATUS_RATE_LIMIT", check: (v) => Number(v) > 0, hint: "should be a positive number if set" },
    { key: "QUEUE_STATUS_MIN_POLL_MS", check: (v) => Number(v) > 0, hint: "should be a positive number if set" },
    { key: "TWILIO_ACCOUNT_SID", check: (v) => v.length > 0, hint: "should be your Twilio Account SID if SMS is enabled" },
    { key: "TWILIO_AUTH_TOKEN", check: (v) => v.length > 0, hint: "should be your Twilio Auth Token if SMS is enabled" },
    { key: "TWILIO_PHONE_NUMBER", check: (v) => v.startsWith("+") && v.length > 5, hint: "should be a valid Twilio phone number if SMS is enabled" }
  ];

  const errors = [];
  for (const { key, check, hint } of required) {
    const val = process.env[key];
    if (!val) {
      errors.push(`  ${key} — missing (${hint})`);
    } else if (!check(val)) {
      errors.push(`  ${key} — invalid (${hint})`);
    }
  }

  for (const { key, check, hint } of optional) {
    const val = process.env[key];
    if (val && !check(val)) {
      errors.push(`  ${key} — invalid (${hint})`);
    }
  }

  if (errors.length) {
    console.error("\n[BlockSeat] Environment validation failed:\n" + errors.join("\n") + "\n");
    process.exit(1);
  }
};

module.exports = validateEnv;
