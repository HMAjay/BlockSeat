// CAPTCHA verification helper (Cloudflare Turnstile).
const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

const isCaptchaEnabled = () => process.env.CAPTCHA_ENABLED === "true";

const verifyCaptcha = async ({ token, remoteIp }) => {
  if (!isCaptchaEnabled()) {
    return { ok: true, reason: "disabled" };
  }

  if (process.env.NODE_ENV === "test") {
    return { ok: true, reason: "test-bypass" };
  }

  if (!token) {
    return { ok: false, reason: "missing-token" };
  }

  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    return { ok: false, reason: "missing-secret" };
  }

  try {
    const body = new URLSearchParams();
    body.append("secret", secret);
    body.append("response", token);
    if (remoteIp) body.append("remoteip", remoteIp);

    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!response.ok) {
      return { ok: false, reason: "provider-http-error" };
    }

    const result = await response.json();
    if (!result.success) {
      return { ok: false, reason: "provider-failed", errors: result["error-codes"] || [] };
    }

    return { ok: true, reason: "verified" };
  } catch (error) {
    return { ok: false, reason: "provider-exception", error: error.message };
  }
};

module.exports = { isCaptchaEnabled, verifyCaptcha };