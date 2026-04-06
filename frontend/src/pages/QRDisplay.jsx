// QRDisplay rotates TOTP-based payload every 70 seconds.

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { authenticator } from "@otplib/preset-browser";

// 70-second rotation
authenticator.options = {
  step: 70,
  window: 1
};

// Valid Base32 secret (DO NOT MODIFY FORMAT)
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

  const [countdown, setCountdown] = useState(70);

  const walletAddress =
    localStorage.getItem("blockseat_wallet") || "";

  useEffect(() => {
    const timer = setInterval(() => {

      const now = Date.now();

      const remaining =
        70 - Math.floor((now / 1000) % 70);

      setCountdown(remaining);

      // refresh TOTP at cycle boundary
      if (remaining === 70 || remaining === 69) {
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
    <div
      style={{
        maxWidth: 500,
        margin: "24px auto",
        textAlign: "center",
        fontFamily: "Arial"
      }}
    >
      <h2>Ticket QR</h2>

      <p>
        Event: Demo Event | Seat info is bound on backend
      </p>

      <QRCodeSVG
        value={payload}
        size={240}
      />

      <p style={{ marginTop: 12 }}>
        <strong>TOTP:</strong> {totp}
      </p>

      <p>
        Refresh in: {countdown}s
      </p>

    </div>
  );
}

export default QRDisplay;