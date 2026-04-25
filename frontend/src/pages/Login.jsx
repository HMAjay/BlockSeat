import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import api from "../services/api";
import { signIn } from "../services/auth";

function Login() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpRequested, setOtpRequested] = useState(false);
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

  useEffect(() => {
    setOtpRequested(false);
    setOtp("");
  }, [phone]);

  const sendOtp = async () => {
    if (!captchaToken) {
      setMessage("Complete CAPTCHA before sending OTP.");
      return;
    }

    try {
      setIsSendingOtp(true);
      await api.post("/auth/send-otp", { phone, captchaToken });
      setMessage(`OTP sent to ${phone}`);
      setOtpRequested(true);
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
    if (!otpRequested) {
      setMessage("Please click Send OTP first.");
      return;
    }

    try {
      const { data } = await api.post("/auth/verify-otp", { phone, otp });
      signIn(data);
      setBstId(data.bstId);
      setMessage("Login successful");
      navigate("/", { replace: true });
    } catch (error) {
      setMessage(error.response?.data?.message || "OTP verification failed");
    }
  };

  const isError = message.toLowerCase().includes("fail") || message.toLowerCase().includes("invalid");
  const isPhoneValid = /^[6-9]\d{9}$/.test(phone);
  const canSendOtp = isPhoneValid && Boolean(captchaToken) && !isSendingOtp;

  return (
    <div className="login-wrap">
      <div className="login-card login-card-compact">
        <section className="login-form login-form-compact">
          <div>
            <div className="login-brand">
              <span className="brand-mark login-brand-mark">
                <BrandLogo />
              </span>
              <div className="brand-copy">
                <span className="brand-name">BlockSeat</span>
                <span className="brand-tag">Match Tickets</span>
              </div>
            </div>
            <h1 className="form-title login-title">Sign in</h1>
            <p className="form-subtitle">Enter your phone number and OTP to continue.</p>
          </div>

          <div className="form-grid">
            <input
              className="input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone number"
            />
            <button type="button" className="btn btn-secondary login-action" onClick={sendOtp} disabled={!canSendOtp}>
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
              disabled={!otpRequested}
            />
            <button type="button" className="btn btn-primary login-action" onClick={verifyOtp}>
              Verify OTP
            </button>
          </div>

          {bstId ? <div className="alert success">Account verified. Redirecting you to bookings.</div> : null}
          {message && <div className={`alert ${isError ? "error" : ""}`}>{message}</div>}
        </section>
      </div>
    </div>
  );
}

export default Login;
