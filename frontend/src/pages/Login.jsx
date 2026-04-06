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
      setBstId(data.bstId);
      setMessage("Login successful");
      setTimeout(() => navigate("/events/EVT-001"), 1200);
    } catch (error) {
      setMessage(error.response?.data?.message || "OTP verification failed");
    }
  };

  return (
    <div style={{ maxWidth: 460, margin: "40px auto", fontFamily: "Arial" }}>
      <h2>BlockSeat Login</h2>
      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="Phone number"
        style={{ width: "100%", padding: 10, marginBottom: 10 }}
      />
      <button onClick={sendOtp} style={{ width: "100%", padding: 10, marginBottom: 16 }}>Send OTP</button>

      <input
        value={otp}
        onChange={(e) => setOtp(e.target.value.slice(0, 6))}
        placeholder="6-digit OTP"
        style={{ width: "100%", padding: 10, marginBottom: 10 }}
      />
      <button onClick={verifyOtp} style={{ width: "100%", padding: 10 }}>Verify OTP</button>

      {bstId && (
        <div style={{ marginTop: 18, background: "#fef08a", padding: 12, borderRadius: 8 }}>
          Your BST ID: {bstId}
        </div>
      )}
      {message && <p style={{ marginTop: 12 }}>{message}</p>}
    </div>
  );
}

export default Login;
