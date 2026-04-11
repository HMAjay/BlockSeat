// VerifyOwner is a public page to check who owns any ticket by tokenId.
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

function VerifyOwner() {
  const navigate = useNavigate();
  const [tokenId, setTokenId] = useState("");
  const [ownerData, setOwnerData] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const checkOwner = async () => {
    const trimmedId = tokenId.trim();
    
    if (!trimmedId) {
      setMessage("Please enter a token ID.");
      return;
    }

    // Validate that it's a positive integer
    const id = Number(trimmedId);
    if (!Number.isInteger(id) || id <= 0) {
      setMessage("Token ID must be a positive integer.");
      return;
    }

    setLoading(true);
    setMessage("");
    setOwnerData(null);

    try {
      const { data } = await api.get(`/tickets/public/${id}/owner`);
      setOwnerData(data);
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to fetch ticket owner");
      setOwnerData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      checkOwner();
    }
  };

  const resetForm = () => {
    setTokenId("");
    setOwnerData(null);
    setMessage("");
  };

  return (
    <div className="page-grid">
      <section className="hero-card">
        <span className="eyebrow">Public lookup</span>
        <h1 className="title">Verify ticket owner</h1>
        <p className="subtitle">
          Look up any ticket by ID to verify ownership on-chain. Enter the token ID and we'll fetch the current owner wallet address.
        </p>
      </section>

      <aside className="section">
        <div className="section-header">
          <div>
            <h2 className="section-title">Ticket ownership lookup</h2>
            <p className="section-copy">The owner data is pulled directly from the blockchain and backend records.</p>
          </div>
        </div>

        <div className="form-grid">
          <input
            className="input"
            type="text"
            value={tokenId}
            onChange={(e) => setTokenId(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter token ID (e.g., 1001)"
            disabled={loading}
          />
          <button
            type="button"
            className="btn btn-primary"
            onClick={checkOwner}
            disabled={loading || !tokenId.trim()}
          >
            {loading ? "Looking up..." : "Search owner"}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={resetForm}
            disabled={loading}
          >
            Clear
          </button>
        </div>

        {ownerData && (
          <div className="stack" style={{ marginTop: 18 }}>
            <div className="detail">
              <span className="detail-label">Token ID</span>
              <span className="detail-value">{ownerData.tokenId}</span>
            </div>
            <div className="detail">
              <span className="detail-label">Event ID</span>
              <span className="detail-value">{ownerData.eventId || "N/A"}</span>
            </div>
            <div className="detail">
              <span className="detail-label">Seat</span>
              <span className="detail-value">{ownerData.seat || "N/A"}</span>
            </div>
            <div className="detail">
              <span className="detail-label">Backend wallet address</span>
              <span className="detail-value" style={{ wordBreak: "break-all", fontSize: "13px" }}>
                {ownerData.ownerWalletAddress || "-"}
              </span>
            </div>
            <div className="detail">
              <span className="detail-label">On-chain owner (Polygon)</span>
              <span className="detail-value" style={{ wordBreak: "break-all", fontSize: "13px" }}>
                {ownerData.onChainOwner || "-"}
              </span>
            </div>
            {ownerData.ownerMatches !== undefined && (
              <div className={`alert ${ownerData.ownerMatches ? "success" : "error"}`}>
                {ownerData.ownerMatches
                  ? "✓ Owner match confirmed. Backend and on-chain addresses match."
                  : "⚠ Owner mismatch. Backend and on-chain addresses do not match."}
              </div>
            )}
          </div>
        )}

        {message && <div className="alert error">{message}</div>}
      </aside>
    </div>
  );
}

export default VerifyOwner;
