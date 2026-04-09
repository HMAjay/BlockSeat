// GateScanner is an admin utility to scan QR images and verify entry.
import React, { useMemo, useState } from "react";
import api from "../services/api";

function GateScanner() {
  const [imageUrl, setImageUrl] = useState("");
  const [tokenId, setTokenId] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [result, setResult] = useState(null);
  const [scanMessage, setScanMessage] = useState("");

  const canScan = useMemo(() => {
    return Boolean(imageUrl.trim());
  }, [imageUrl]);

  const verify = async () => {
    try {
      const { data } = await api.post("/gate/verify", { tokenId: Number(tokenId), totpCode });
      setResult({ ok: true, text: `${data.status} - ${data.message}` });
    } catch (error) {
      const reason = error.response?.data?.reason || error.response?.data?.message || "Invalid";
      setResult({ ok: false, text: `INVALID - ${reason}` });
    }
  };

  const decodeFromImage = async (src) => {
    if (!("BarcodeDetector" in window)) {
      throw new Error("This browser does not support QR image scanning.");
    }

    const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
    const img = new Image();
    img.crossOrigin = "anonymous";

    const payload = await new Promise((resolve, reject) => {
      img.onload = async () => {
        try {
          const codes = await detector.detect(img);
          if (!codes.length) {
            reject(new Error("No QR code found in the image."));
            return;
          }
          resolve(codes[0].rawValue);
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error("Failed to load image."));
      img.src = src;
    });

    let parsed;
    try {
      parsed = JSON.parse(payload);
    } catch {
      throw new Error("QR payload is not valid JSON.");
    }

    setTokenId(String(parsed.tokenId || ""));
    setTotpCode(String(parsed.totp || ""));
    setScanMessage(`QR decoded for token #${parsed.tokenId || "unknown"}.`);
    setResult(null);
  };

  const handleScan = async () => {
    try {
      setScanMessage("Scanning...");
      await decodeFromImage(imageUrl.trim());
    } catch (error) {
      setScanMessage(error.message || "Failed to scan QR image.");
    }
  };

  return (
    <div className="layout-split">
      <section className="hero-card">
        <span className="eyebrow">Entry control</span>
        <h1 className="title">Gate scanner</h1>
        <p className="subtitle">
          Open this page directly at the gate. Paste a QR image URL or upload an image, decode it, then verify the ticket.
        </p>

        <div className="scanner-frame" style={{ marginTop: 20 }}>
          <div className="scanner-lens" />
        </div>

        <p className="hint">
          This tool is intentionally not exposed in the customer navigation.
        </p>
      </section>

      <aside className="section">
        <div className="section-header">
          <div>
            <h2 className="section-title">Scan QR image</h2>
            <p className="section-copy">Paste an image URL or choose a QR file from the gate device.</p>
          </div>
        </div>

        <div className="form-grid">
          <input
            className="input"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="QR image URL"
          />
          <button type="button" className="btn btn-secondary" onClick={handleScan} disabled={!canScan}>
            Scan Image
          </button>

          <input
            className="input"
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const url = URL.createObjectURL(file);
              setImageUrl(url);
            }}
          />

          {scanMessage && <div className="alert">{scanMessage}</div>}

          <input
            className="input"
            value={tokenId}
            onChange={(e) => setTokenId(e.target.value)}
            placeholder="Token ID"
          />
          <input
            className="input"
            value={totpCode}
            onChange={(e) => setTotpCode(e.target.value)}
            placeholder="TOTP Code"
          />
          <button type="button" className="btn btn-primary" onClick={verify}>
            Verify Ticket
          </button>
        </div>

        {result && (
          <div className={`alert ${result.ok ? "success" : "error"}`}>
            {result.text}
          </div>
        )}
      </aside>
    </div>
  );
}

export default GateScanner;
