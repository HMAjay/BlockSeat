// QRDisplay rotates TOTP-based payload every 30 seconds.

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import api from "../services/api";
import { generateTotp } from "../services/totp";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

const deriveLegacySecret = (tokenId) => {
  const seed = `BlockSeat-${tokenId}`;
  let secret = "";

  for (let i = 0; i < seed.length; i += 1) {
    secret += BASE32_ALPHABET[seed.charCodeAt(i) % BASE32_ALPHABET.length];
  }

  while (secret.length < 16) {
    secret += BASE32_ALPHABET[(seed.length * 7) % BASE32_ALPHABET.length];
  }

  return secret.slice(0, 32);
};

function QRDisplay() {
  const { tokenId } = useParams();

  const safeTokenId = tokenId || "0";
  const [ticket, setTicket] = useState(null);
  const [totp, setTotp] = useState("");
  const [countdown, setCountdown] = useState(30);
  const [message, setMessage] = useState("");

  const walletAddress =
    localStorage.getItem("blockseat_wallet") || "";

  const maskedWallet = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : "Not connected";

  useEffect(() => {
    const loadTicket = async () => {
      try {
        const { data } = await api.get("/tickets");
        const current = data.find((item) => String(item.tokenId) === String(safeTokenId));
        if (!current) {
          setMessage("Ticket not found for this wallet.");
          return;
        }
        setTicket(current);
        const secret = current.qrSecret || deriveLegacySecret(safeTokenId);
        setTotp(await generateTotp(secret));
      } catch (error) {
        setMessage(error.response?.data?.message || "Failed to load ticket");
      }
    };

    loadTicket();
  }, [safeTokenId]);

  useEffect(() => {
    if (!ticket) return undefined;
    const secret = ticket.qrSecret || deriveLegacySecret(safeTokenId);
    let active = true;

    const refreshTotp = async () => {
      const nextTotp = await generateTotp(secret);
      if (active) {
        setTotp(nextTotp);
      }
    };

    const timer = setInterval(() => {
      const now = Date.now();
      const remaining = 30 - Math.floor((now / 1000) % 30);
      setCountdown(remaining);

      if (remaining === 30 || remaining === 29) {
        refreshTotp().catch(() => {});
      }
    }, 1000);

    refreshTotp().catch(() => {});

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [ticket, safeTokenId]);

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
        {message && <div className="alert error">{message}</div>}
      </div>
    </div>
  );
}

export default QRDisplay;
