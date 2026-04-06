// GateScanner is a hackathon-friendly manual verifier UI for entry checks.
import React, { useState } from "react";
import api from "../services/api";

function GateScanner() {
  const [tokenId, setTokenId] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [result, setResult] = useState(null);

  const verify = async () => {
    try {
      const { data } = await api.post("/gate/verify", { tokenId: Number(tokenId), totpCode });
      setResult({ ok: true, text: `${data.status} - ${data.message}` });
    } catch (error) {
      const reason = error.response?.data?.reason || error.response?.data?.message || "Invalid";
      setResult({ ok: false, text: `INVALID - ${reason}` });
    }
  };

  return (
    <div style={{ maxWidth: 540, margin: "24px auto", fontFamily: "Arial" }}>
      <h2>Gate Scanner (Demo)</h2>
      <div style={{ height: 220, background: "black", borderRadius: 10, marginBottom: 14 }} />

      <input
        value={tokenId}
        onChange={(e) => setTokenId(e.target.value)}
        placeholder="Token ID"
        style={{ width: "100%", padding: 10, marginBottom: 10 }}
      />
      <input
        value={totpCode}
        onChange={(e) => setTotpCode(e.target.value)}
        placeholder="TOTP Code"
        style={{ width: "100%", padding: 10, marginBottom: 10 }}
      />
      <button onClick={verify}>Verify Ticket</button>

      {result && (
        <div
          style={{
            marginTop: 14,
            padding: 14,
            borderRadius: 8,
            color: "white",
            background: result.ok ? "#16a34a" : "#dc2626"
          }}
        >
          {result.text}
        </div>
      )}
    </div>
  );
}

export default GateScanner;
