// Login page drives phone OTP flow and stores JWT/BST identity locally.
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

function Login() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [bstId, setBstId] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [isCaptchaReady, setIsCaptchaReady] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const captchaRef = useRef(null);
  const widgetIdRef = useRef(null);
  const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || "";
  const navigate = useNavigate();

  useEffect(() => {
    if (!turnstileSiteKey) return;

    const mountWidget = () => {
      if (!window.turnstile || !captchaRef.current || widgetIdRef.current !== null) return;
      widgetIdRef.current = window.turnstile.render(captchaRef.current, {
        sitekey: turnstileSiteKey,
        callback: (token) => {
          setCaptchaToken(token);
          setMessage("");
        },
        "expired-callback": () => {
          setCaptchaToken("");
          setMessage("CAPTCHA expired. Please complete it again.");
        },
        "error-callback": () => {
          setCaptchaToken("");
          setMessage("CAPTCHA failed to load. Refresh and try again.");
        }
      });
      setIsCaptchaReady(true);
    };

    if (window.turnstile) {
      mountWidget();
      return;
    }

    const existingScript = document.querySelector('script[src="https://challenges.cloudflare.com/turnstile/v0/api.js"]');
    if (existingScript) {
      existingScript.addEventListener("load", mountWidget, { once: true });
      return () => existingScript.removeEventListener("load", mountWidget);
    }

    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    script.async = true;
    script.defer = true;
    script.onload = mountWidget;
    document.body.appendChild(script);

    return () => {
      script.onload = null;
    };
  }, [turnstileSiteKey]);

  const sendOtp = async () => {
    if (!captchaToken) {
      setMessage("Complete CAPTCHA before sending OTP.");
      return;
    }

    try {
      setIsSendingOtp(true);
      await api.post("/auth/send-otp", { phone, captchaToken });
      setMessage("OTP sent. Check backend console (mock SMS).");
      if (window.turnstile && widgetIdRef.current !== null) {
        window.turnstile.reset(widgetIdRef.current);
      }
      setCaptchaToken("");
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to send OTP");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const verifyOtp = async () => {
    try {
      const { data } = await api.post("/auth/verify-otp", { phone, otp });
      localStorage.setItem("blockseat_token", data.token);
      localStorage.setItem("blockseat_bstId", data.bstId);
      localStorage.setItem("blockseat_wallet", data.walletAddress);
      setBstId(data.bstId);
      setMessage("Login successful");
      setTimeout(() => navigate("/"), 900);
    } catch (error) {
      setMessage(error.response?.data?.message || "OTP verification failed");
    }
  };

  const isError = message.toLowerCase().includes("fail") || message.toLowerCase().includes("invalid");
  const isPhoneValid = /^[6-9]\d{9}$/.test(phone);
  const canSendOtp = isPhoneValid && Boolean(captchaToken) && !isSendingOtp;

  return (
    <div className="login-wrap">
      <div className="login-card">
        <aside className="login-aside">
          <span className="eyebrow">Secure access</span>
          <div className="login-copy">
            <h1 className="title" style={{ marginBottom: 0 }}>Enter the seat, not the scalper market.</h1>
            <p className="subtitle">
              BlockSeat keeps tickets tied to ownership, QR timing, and resale rules so the live event experience stays clean and verified.
            </p>
            <div className="helper-row">
              <span className="helper-chip">OTP login</span>
              <span className="helper-chip">On-chain NFT tickets</span>
              <span className="helper-chip">Dynamic QR access</span>
            </div>
            <div className="stats-row">
              <div className="stat">
                <span className="stat-value">70s</span>
                <span className="stat-label">QR refresh window</span>
              </div>
              <div className="stat">
                <span className="stat-value">Polygon</span>
                <span className="stat-label">Ticket network</span>
              </div>
              <div className="stat">
                <span className="stat-value">BST ID</span>
                <span className="stat-label">Your identity layer</span>
              </div>
            </div>
          </div>
        </aside>

        <section className="login-form">
          <div>
            <h2 className="form-title">Sign in to BlockSeat</h2>
            <p className="form-subtitle">Use your phone number to receive a one-time password and unlock your wallet-backed account.</p>
          </div>

          <div className="form-grid">
            <input
              className="input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone number"
            />
            <button type="button" className="btn btn-secondary" onClick={sendOtp} disabled={!canSendOtp}>
              {isSendingOtp ? "Sending..." : "Send OTP"}
            </button>

            <div style={{ gridColumn: "1 / -1" }}>
              {turnstileSiteKey ? (
                <div ref={captchaRef} />
              ) : (
                <div className="alert error">CAPTCHA is not configured. Set VITE_TURNSTILE_SITE_KEY in frontend env.</div>
              )}
              {turnstileSiteKey && !isCaptchaReady && <p className="hint">Loading CAPTCHA...</p>}
            </div>

            <input
              className="input"
              value={otp}
              onChange={(e) => setOtp(e.target.value.slice(0, 6))}
              placeholder="6-digit OTP"
            />
            <button type="button" className="btn btn-primary" onClick={verifyOtp}>
              Verify OTP
            </button>
          </div>

          {bstId && (
            <div className="alert success">
              Your BST ID: <strong>{bstId}</strong>
            </div>
          )}
          {message && <div className={`alert ${isError ? "error" : ""}`}>{message}</div>}
          <p className="hint">Tip: check the backend console for the mock OTP during local testing.</p>
        </section>
      </div>
    </div>
  );
}

export default Login;
