// MyTickets page separates active and used tickets with actions.
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

function TicketCard({ ticket, used, onViewQr, onTransfer }) {
  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: 8,
        padding: 12,
        marginBottom: 10,
        background: used ? "#e5e7eb" : "white"
      }}
    >
      <p><strong>Token:</strong> {ticket.tokenId}</p>
      <p><strong>Event:</strong> {ticket.eventId}</p>
      <p><strong>Seat:</strong> {ticket.seat}</p>
      {!used ? (
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => onViewQr(ticket)}>View QR</button>
          <button onClick={() => onTransfer(ticket)}>Transfer</button>
        </div>
      ) : (
        <p>Used ticket</p>
      )}
    </div>
  );
}

function MyTickets() {
  const [tickets, setTickets] = useState([]);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const { data } = await api.get("/tickets");
        setTickets(data);
      } catch (error) {
        setMessage(error.response?.data?.message || "Failed to fetch tickets");
      }
    };
    fetchTickets();
  }, []);

  const active = tickets.filter((t) => !t.isUsed);
  const used = tickets.filter((t) => t.isUsed);

  return (
    <div style={{ maxWidth: 680, margin: "24px auto", fontFamily: "Arial" }}>
      <h2>My Tickets</h2>
      <h3>Active</h3>
      {active.map((ticket) => (
        <TicketCard
          key={ticket.tokenId}
          ticket={ticket}
          used={false}
          onViewQr={() => navigate(`/qr/${ticket.tokenId}`)}
          onTransfer={() => navigate(`/transfer/${ticket.tokenId}`)}
        />
      ))}

      <h3>Used</h3>
      {used.map((ticket) => (
        <TicketCard key={ticket.tokenId} ticket={ticket} used />
      ))}

      {message && <p>{message}</p>}
    </div>
  );
}

export default MyTickets;
