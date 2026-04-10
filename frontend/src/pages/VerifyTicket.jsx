// VerifyTicket opens the Polygon Amoy explorer for a ticket tx hash.
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";

function VerifyTicket() {
  const { tokenId } = useParams();
  const navigate = useNavigate();
  const [txHash, setTxHash] = useState("");
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

  return (
    <div className="page-grid">
      <section className="hero-card">
        <span className="eyebrow">On-chain proof</span>
        <h1 className="title">Verify ticket #{tokenId}</h1>
        <p className="subtitle">
          Use the transaction hash from MongoDB or paste a different hash if you want to inspect it on Polygon Amoy.
        </p>
      </section>

      <aside className="section">
        <div className="section-header">
          <div>
            <h2 className="section-title">Polygon Amoy explorer</h2>
            <p className="section-copy">The tx hash is prefilled from the ticket record, but you can edit it before opening the explorer.</p>
          </div>
        </div>

        <div className="form-grid">
          <input
            className="input"
            value={txHash}
            onChange={(e) => setTxHash(e.target.value)}
            placeholder="Paste tx hash"
          />
          <button type="button" className="btn btn-primary" onClick={openExplorer}>
            Open Explorer
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate("/my-tickets")}>
            Back to Tickets
          </button>
        </div>

        {message && <div className="alert error">{message}</div>}
      </aside>
    </div>
  );
}

export default VerifyTicket;
