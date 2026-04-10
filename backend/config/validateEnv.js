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

  const errors = [];
  for (const { key, check, hint } of required) {
    const val = process.env[key];
    if (!val) {
      errors.push(`  ${key} — missing (${hint})`);
    } else if (!check(val)) {
      errors.push(`  ${key} — invalid (${hint})`);
    }
  }

  if (errors.length) {
    console.error("\n[BlockSeat] Environment validation failed:\n" + errors.join("\n") + "\n");
    process.exit(1);
  }
};

module.exports = validateEnv;
