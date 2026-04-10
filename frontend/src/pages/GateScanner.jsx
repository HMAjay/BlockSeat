// GateScanner is an admin utility to scan QR codes (camera or image) and verify entry.
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import api from "../services/api";

function GateScanner() {
  const [tokenId, setTokenId] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [result, setResult] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState("");
  const [verifying, setVerifying] = useState(false);

  const scannerRef = useRef(null);
  const html5QrRef = useRef(null);

  // Parse QR payload and populate fields.
  const handleQrPayload = useCallback((raw) => {
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      setScanMessage("QR payload is not valid JSON.");
      return null;
    }
    if (!parsed.tokenId || !parsed.totp) {
      setScanMessage("QR missing tokenId or totp.");
      return null;
    }
    setTokenId(String(parsed.tokenId));
    setTotpCode(String(parsed.totp));
    setScanMessage(`QR decoded — Token #${parsed.tokenId}`);
    setResult(null);
    return parsed;
  }, []);

  // Verify ticket against backend.
  const verify = useCallback(async (tid, totp) => {
    const id = tid ?? tokenId;
    const code = totp ?? totpCode;
    if (!id || !code) {
      setResult({ ok: false, text: "Token ID and TOTP Code are required." });
      return;
    }
    setVerifying(true);
    try {
      const { data } = await api.post("/gate/verify", { tokenId: Number(id), totpCode: code });
      setResult({ ok: true, text: `${data.status} — ${data.message}` });
    } catch (error) {
      const reason = error.response?.data?.reason || error.response?.data?.message || "Verification failed";
      setResult({ ok: false, text: `INVALID — ${reason}` });
    } finally {
      setVerifying(false);
    }
  }, [tokenId, totpCode]);

  // Start live camera scanning.
  const startCamera = useCallback(async () => {
    if (html5QrRef.current) return;
    setScanMessage("");
    setResult(null);

    const scanner = new Html5Qrcode("gate-scanner-region");
    html5QrRef.current = scanner;

    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          // Auto-verify on successful scan.
          const parsed = handleQrPayload(decodedText);
          if (parsed) {
            await stopCamera();
            verify(String(parsed.tokenId), String(parsed.totp));
          }
        },
        () => {} // ignore per-frame errors
      );
      setScanning(true);
    } catch (err) {
      html5QrRef.current = null;
      setScanMessage(
        err.toString().includes("NotAllowedError")
          ? "Camera permission denied. Use image upload instead."
          : `Camera failed: ${err.message || err}`
      );
    }
  }, [handleQrPayload, verify]);

  // Stop camera.
  const stopCamera = useCallback(async () => {
    if (html5QrRef.current) {
      try {
        await html5QrRef.current.stop();
      } catch { /* already stopped */ }
      html5QrRef.current = null;
    }
    setScanning(false);
  }, []);

  // Scan from uploaded image file.
  const handleFileUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    await stopCamera();
    setScanMessage("Scanning image...");
    setResult(null);

    const scanner = new Html5Qrcode("gate-scanner-region");
    try {
      const decoded = await scanner.scanFile(file, true);
      handleQrPayload(decoded);
    } catch {
      setScanMessage("No QR code found in the image.");
    } finally {
      scanner.clear();
    }
  }, [stopCamera, handleQrPayload]);

  // Cleanup camera on unmount.
  useEffect(() => {
    return () => {
      if (html5QrRef.current) {
        html5QrRef.current.stop().catch(() => {});
      }
    };
  }, []);

  // Reset for next scan.
  const resetScanner = () => {
    setTokenId("");
    setTotpCode("");
    setResult(null);
    setScanMessage("");
  };

  return (
    <div className="layout-split">
      <section className="hero-card">
        <span className="eyebrow">Entry control</span>
        <h1 className="title">Gate scanner</h1>
        <p className="subtitle">
          Point the camera at the attendee's QR code or upload a screenshot. The ticket is verified automatically.
        </p>

        <div className="scanner-frame" style={{ marginTop: 20, position: "relative" }}>
          <div id="gate-scanner-region" ref={scannerRef} style={{ width: "100%", minHeight: 260 }} />
          {!scanning && (
            <div className="scanner-lens" style={{ pointerEvents: "none" }} />
          )}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          {!scanning ? (
            <button type="button" className="btn btn-primary" onClick={startCamera}>
              Start Camera
            </button>
          ) : (
            <button type="button" className="btn btn-secondary" onClick={stopCamera}>
              Stop Camera
            </button>
          )}
          <label className="btn btn-secondary" style={{ cursor: "pointer", margin: 0 }}>
            Upload Image
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              style={{ display: "none" }}
            />
          </label>
        </div>

        <p className="hint" style={{ marginTop: 14 }}>
          This tool is intentionally not exposed in the customer navigation.
        </p>
      </section>

      <aside className="section">
        <div className="section-header">
          <div>
            <h2 className="section-title">Ticket verification</h2>
            <p className="section-copy">Fields auto-fill when a QR is scanned. You can also enter values manually.</p>
          </div>
        </div>

        <div className="form-grid">
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
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => verify()}
            disabled={verifying || !tokenId || !totpCode}
          >
            {verifying ? "Verifying..." : "Verify Ticket"}
          </button>

          {result && (
            <div className={`alert ${result.ok ? "success" : "error"}`}>
              {result.text}
            </div>
          )}

          {result && (
            <button type="button" className="btn btn-secondary" onClick={resetScanner}>
              Scan Next
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}

export default GateScanner;
