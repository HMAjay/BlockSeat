// Login page drives phone OTP flow and stores JWT/BST identity locally.
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

function Login() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [bstId, setBstId] = useState("");
  const navigate = useNavigate();

  const sendOtp = async () => {
    try {
      await api.post("/auth/send-otp", { phone });
      setMessage("OTP sent. Check backend console (mock SMS).");
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to send OTP");
    }
  };

  const verifyOtp = async () => {
    try {
      const { data } = await api.post("/auth/verify-otp", { phone, otp });
      localStorage.setItem("blockseat_token", data.token);
      localStorage.setItem("blockseat_bstId", data.bstId);
      localStorage.setItem("blockseat_wallet", data.walletAddress);
      localStorage.setItem("blockseat_is_gate_admin", String(Boolean(data.isGateAdmin)));
      setBstId(data.bstId);
      setMessage("Login successful");
      setTimeout(() => navigate("/events/Match-001"), 900);
    } catch (error) {
      setMessage(error.response?.data?.message || "OTP verification failed");
    }
  };

  const isError = message.toLowerCase().includes("fail") || message.toLowerCase().includes("invalid");

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
            <button type="button" className="btn btn-secondary" onClick={sendOtp}>
              Send OTP
            </button>

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
