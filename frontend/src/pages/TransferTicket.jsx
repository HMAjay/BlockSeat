// TransferTicket executes buyer lookup, capped resale, and transfer call.
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";

function TransferTicket() {
  const { tokenId } = useParams();
  const [ticket, setTicket] = useState(null);
  const [recipientBstId, setRecipientBstId] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [resalePrice, setResalePrice] = useState("");
  const [message, setMessage] = useState("");
  const [request, setRequest] = useState(null);

  useEffect(() => {
    const loadTicket = async () => {
      const { data } = await api.get("/tickets");
      const current = data.find((t) => String(t.tokenId) === String(tokenId));
      setTicket(current || null);
    };
    loadTicket().catch(() => setMessage("Failed to load ticket"));
  }, [tokenId]);

  const lookupUser = async () => {
    try {
      const { data } = await api.get(`/users/lookup/${recipientBstId}`);
      setRecipientName(data.name);
    } catch (error) {
      setMessage(error.response?.data?.message || "Recipient lookup failed");
    }
  };

  const payAndTransfer = async () => {
    try {
      if (!ticket) return setMessage("Ticket not found");
      if (Number(resalePrice) > ticket.maxResalePrice) return setMessage("Price exceeds cap");

      const { data } = await api.post("/transfer/request", {
        tokenId: Number(tokenId),
        buyerBstId: recipientBstId,
        resalePrice: Number(resalePrice)
      });

      setRequest(data.request);
      setMessage(`Transfer request sent to ${recipientName || recipientBstId}.`);
    } catch (error) {
      setMessage(error.response?.data?.message || "Transfer request failed");
    }
  };

  const isError =
    message.toLowerCase().includes("fail") ||
    message.toLowerCase().includes("exceeds") ||
    message.toLowerCase().includes("not found");

  return (
    <div className="page-grid">
      <section className="hero-card">
        <span className="eyebrow">Resale transfer</span>
        <h1 className="title">Transfer ticket #{tokenId}</h1>
        <p className="subtitle">
          Resale stays capped, lookup confirms the buyer, and the transfer finalizes only after payment succeeds.
        </p>

        <div className="stats-row" style={{ marginTop: 18 }}>
          <div className="stat">
            <span className="stat-value">Rs. {ticket?.maxResalePrice ?? "-"}</span>
            <span className="stat-label">Max resale cap</span>
          </div>
          <div className="stat">
            <span className="stat-value">{ticket?.seat ?? "-"}</span>
            <span className="stat-label">Seat</span>
          </div>
          <div className="stat">
            <span className="stat-value">{ticket?.eventId ?? "-"}</span>
            <span className="stat-label">Event</span>
          </div>
        </div>
      </section>

      <aside className="section">
        <div className="section-header">
          <div>
            <h2 className="section-title">Transfer details</h2>
            <p className="section-copy">Fill the recipient BST ID, verify the user, and confirm the price.</p>
          </div>
        </div>

        <div className="form-grid">
          <input
            className="input"
            value={recipientBstId}
            onChange={(e) => setRecipientBstId(e.target.value)}
            placeholder="Interested buyer BST ID"
          />
          <button type="button" className="btn btn-secondary" onClick={lookupUser}>
            Lookup Buyer
          </button>
          {recipientName && (
            <div className="alert success">
              Recipient: <strong>{recipientName}</strong>
            </div>
          )}

          <input
            className="input"
            type="number"
            value={resalePrice}
            onChange={(e) => setResalePrice(e.target.value)}
            placeholder="Resale price in INR"
          />
          <button type="button" className="btn btn-primary" onClick={payAndTransfer}>
            Send Transfer Request
          </button>
        </div>

        {request && (
          <div className="alert success" style={{ marginTop: 16 }}>
            Request created for <strong>{request.buyerBstId}</strong>. The buyer can now approve and pay from My Tickets.
          </div>
        )}
        {message && <div className={`alert ${isError ? "error" : ""}`}>{message}</div>}
      </aside>
    </div>
  );
}

export default TransferTicket;
