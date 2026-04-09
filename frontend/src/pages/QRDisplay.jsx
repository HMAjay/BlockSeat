// QRDisplay rotates TOTP-based payload every 30 seconds.

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { authenticator } from "@otplib/preset-browser";

// 30-second rotation
authenticator.options = {
  step: 30,
  window: 1
};

// Valid Base32 secret
const SECRET = "JBSWY3DPEHPK3PXP";

function createTotpCode() {
  return authenticator.generate(SECRET);
}

function QRDisplay() {
  const { tokenId } = useParams();

  const safeTokenId = tokenId || "0";

  const [totp, setTotp] = useState(() =>
    createTotpCode()
  );

  const [countdown, setCountdown] = useState(30);

  const walletAddress =
    localStorage.getItem("blockseat_wallet") || "";

  const maskedWallet = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : "Not connected";

  useEffect(() => {
    const timer = setInterval(() => {

      const now = Date.now();

      const remaining =
        30 - Math.floor((now / 1000) % 30);

      setCountdown(remaining);

      // Refresh at boundary
      if (remaining === 30 || remaining === 29) {
        setTotp(createTotpCode());
      }

    }, 1000);

    return () => clearInterval(timer);

  }, []);

  const payload = useMemo(
    () =>
      JSON.stringify({
        tokenId: Number(safeTokenId),
        walletAddress,
        totp
      }),
    [safeTokenId, walletAddress, totp]
  );

  return (
    <div className="qr-shell">
      <div className="hero-card" style={{ width: "100%" }}>
        <span className="eyebrow">Entry pass</span>
        <h1 className="title">Ticket QR</h1>
        <p className="subtitle">
          Present this QR at the gate. The token updates automatically and stays bound to your wallet and ticket id.
        </p>

        <div className="stats-row" style={{ marginTop: 18 }}>
          <div className="stat">
            <span className="stat-value">#{safeTokenId}</span>
            <span className="stat-label">Token ID</span>
          </div>
          <div className="stat">
            <span className="stat-value">{maskedWallet}</span>
            <span className="stat-label">Wallet</span>
          </div>
          <div className="stat">
            <span className="stat-value">{countdown}s</span>
            <span className="stat-label">Refresh left</span>
          </div>
        </div>
      </div>

      <div className="qr-card">
        <QRCodeSVG value={payload} size={240} />
      </div>

      <div className="qr-meta">
        <p className="subtitle" style={{ marginBottom: 0 }}>
          Scan payload rotates with the timer and includes your current wallet binding.
        </p>
      </div>
    </div>
  );
}

export default QRDisplay;
