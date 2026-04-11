const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const DEFAULT_STEP_SECONDS = 30;
const DEFAULT_DIGITS = 6;

const keyCache = new Map();

const base32ToBytes = (secret) => {
  const normalized = String(secret || "")
    .toUpperCase()
    .replace(/=+$/g, "")
    .replace(/[^A-Z2-7]/g, "");

  let bits = "";
  for (const char of normalized) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) {
      throw new Error("Invalid base32 secret");
    }
    bits += index.toString(2).padStart(5, "0");
  }

  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(Number.parseInt(bits.slice(i, i + 8), 2));
  }

  return new Uint8Array(bytes);
};

const getKey = async (secret) => {
  if (!keyCache.has(secret)) {
    const keyPromise = crypto.subtle.importKey(
      "raw",
      base32ToBytes(secret),
      { name: "HMAC", hash: "SHA-1" },
      false,
      ["sign"]
    );
    keyCache.set(secret, keyPromise);
  }

  return keyCache.get(secret);
};

export const generateTotp = async (secret, options = {}) => {
  const step = options.step ?? DEFAULT_STEP_SECONDS;
  const digits = options.digits ?? DEFAULT_DIGITS;
  const epochMs = options.epochMs ?? Date.now();

  const counter = Math.floor(epochMs / 1000 / step);
  const counterBytes = new ArrayBuffer(8);
  const view = new DataView(counterBytes);

  const high = Math.floor(counter / 0x100000000);
  const low = counter >>> 0;
  view.setUint32(0, high, false);
  view.setUint32(4, low, false);

  const key = await getKey(secret);
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, counterBytes));
  const offset = signature[signature.length - 1] & 0x0f;

  const binary =
    ((signature[offset] & 0x7f) << 24) |
    ((signature[offset + 1] & 0xff) << 16) |
    ((signature[offset + 2] & 0xff) << 8) |
    (signature[offset + 3] & 0xff);

  return String(binary % (10 ** digits)).padStart(digits, "0");
};
