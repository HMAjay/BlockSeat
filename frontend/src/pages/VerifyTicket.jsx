// VerifyTicket opens the Polygon Amoy explorer for a ticket tx hash.
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";

function VerifyTicket() {
  const { tokenId } = useParams();
  const navigate = useNavigate();
  const [txHash, setTxHash] = useState("");
  const [storedOwner, setStoredOwner] = useState("");
  const [liveOwner, setLiveOwner] = useState("");
  const [ownerMatches, setOwnerMatches] = useState(null);
  const [isCheckingOwner, setIsCheckingOwner] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const loadTicket = async () => {
      try {
        const { data } = await api.get("/tickets");
        const current = data.find((ticket) => String(ticket.tokenId) === String(tokenId));
        if (!current) {
          setMessage("Ticket not found");
          return;
        }
        setTxHash(current.txHash || "");
        setStoredOwner(current.ownerWalletAddress || "");
      } catch (error) {
        setMessage(error.response?.data?.message || "Failed to load ticket");
      }
    };

    loadTicket();
  }, [tokenId]);

  const openExplorer = () => {
    if (!txHash.trim()) {
      setMessage("Enter a transaction hash first.");
      return;
    }
    window.open(`https://amoy.polygonscan.com/tx/${txHash.trim()}`, "_blank", "noopener,noreferrer");
  };

  const checkLiveOwner = async () => {
    try {
      setIsCheckingOwner(true);
      setMessage("");
      const { data } = await api.get(`/tickets/${tokenId}/owner`);
      setLiveOwner(data.onChainOwner || "");
      setStoredOwner(data.ownerWalletAddress || "");
      setOwnerMatches(Boolean(data.ownerMatches));
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to load live owner");
      setLiveOwner("");
      setOwnerMatches(null);
    } finally {
      setIsCheckingOwner(false);
    }
  };

  return (
    <div className="page-grid">
      <section className="hero-card">
        <span className="eyebrow">On-chain proof</span>
        <h1 className="title">Verify ticket #{tokenId}</h1>
        <p className="subtitle">
          Open the mint/transfer transaction on Polygon Amoy and fetch the live owner directly from the smart contract.
        </p>
      </section>

      <aside className="section">
        <div className="section-header">
          <div>
            <h2 className="section-title">Polygon Amoy explorer</h2>
            <p className="section-copy">The TX hash is auto-filled from the verified ticket record (read-only). Query the live `ownerOf(tokenId)` result below to confirm on-chain ownership.</p>
          </div>
        </div>

        <div className="form-grid">
          <input
            className="input"
            value={txHash}
            placeholder="Paste tx hash"
            readOnly
          />
          <button type="button" className="btn btn-primary" onClick={openExplorer}>
            Open Explorer
          </button>
          <button type="button" className="btn btn-secondary" onClick={checkLiveOwner} disabled={isCheckingOwner}>
            {isCheckingOwner ? "Checking owner..." : "Check Live Owner"}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate("/my-tickets")}>
            Back to Tickets
          </button>
        </div>

        {(storedOwner || liveOwner) && (
          <div className="stack" style={{ marginTop: 18 }}>
            <div className="detail">
              <span className="detail-label">Stored owner (backend)</span>
              <span className="detail-value" style={{ wordBreak: "break-all" }}>{storedOwner || "-"}</span>
            </div>
            <div className="detail">
              <span className="detail-label">Live owner (Polygon ownerOf)</span>
              <span className="detail-value" style={{ wordBreak: "break-all" }}>{liveOwner || "Not checked yet"}</span>
            </div>
            {ownerMatches !== null && (
              <div className={`alert ${ownerMatches ? "success" : "error"}`}>
                {ownerMatches ? "Owner match confirmed on-chain." : "Owner mismatch detected between backend and Polygon."}
              </div>
            )}
          </div>
        )}

        {message && <div className="alert error">{message}</div>}
      </aside>
    </div>
  );
}

export default VerifyTicket;
