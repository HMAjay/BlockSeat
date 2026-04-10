// Event seat page fetches seat map and handles booking + mint flow.
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import SeatGrid from "../components/SeatGrid";

const MAX_ACTIVE_TICKETS = 4;

const loadRazorpay = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

function EventSeatMap() {
  const { id } = useParams();
  const [eventData, setEventData] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [activeTicketCount, setActiveTicketCount] = useState(0);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSeats = async () => {
      try {
        const { data } = await api.get(`/events/${id}/seats`);
        setEventData(data);
      } catch (error) {
        setMessage(error.response?.data?.message || "Failed to load seat map");
      }
    };
    fetchSeats();
  }, [id]);

  useEffect(() => {
    const fetchWalletTickets = async () => {
      try {
        const { data } = await api.get("/tickets");
        const active = data.filter((ticket) => !ticket.isUsed).length;
        setActiveTicketCount(active);
      } catch (error) {
        setMessage(error.response?.data?.message || "Failed to load wallet tickets");
      }
    };
    fetchWalletTickets();
  }, []);

  const toggleSeatSelection = (seat) => {
    setSelectedSeats((prev) => {
      const exists = prev.some((item) => item.seatId === seat.seatId);
      if (exists) {
        return prev.filter((item) => item.seatId !== seat.seatId);
      }
      const remainingLimit = Math.max(0, MAX_ACTIVE_TICKETS - activeTicketCount);
      if (prev.length >= remainingLimit) {
        setMessage(`You can hold at most ${MAX_ACTIVE_TICKETS} active tickets. Wallet has ${activeTicketCount}.`);
        return prev;
      }
      return [...prev, seat];
    });
  };

  const handleBook = async () => {
    try {
      if (!selectedSeats.length) return setMessage("Select at least one seat first");
      if (activeTicketCount + selectedSeats.length > MAX_ACTIVE_TICKETS) {
        return setMessage(`Booking blocked: wallet + selected seats cannot exceed ${MAX_ACTIVE_TICKETS} active tickets.`);
      }

      const totalAmount = selectedSeats.reduce((sum, seat) => sum + Number(seat.price), 0);

      // Step 1: Create payment order for the combined selected seat amount.
      const orderResp = await api.post("/payment/create-order", { amount: totalAmount });
      const order = orderResp.data;

      // Step 2: Launch Razorpay popup and mint ticket only after successful payment.
      const loaded = await loadRazorpay();
      if (!loaded) return setMessage("Unable to load Razorpay SDK");

      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "BlockSeat",
        description: `${selectedSeats.length} ticket(s) for ${eventData.name}`,
        order_id: order.id,
        handler: async () => {
          try {
            let mintedCount = 0;
            for (const [index, seat] of selectedSeats.entries()) {
              const tokenId = Date.now() + index;
              await api.post("/tickets/mint", {
                tokenId,
                eventId: eventData.eventId,
                seat: seat.seatId,
                faceValue: seat.price
              });
              mintedCount += 1;
            }
            setMessage(`Payment successful. ${mintedCount} ticket(s) minted.`);
            setTimeout(() => navigate("/my-tickets"), 1000);
          } catch (mintError) {
            setMessage(mintError.response?.data?.message || "Payment succeeded, but one or more seats failed to mint");
          }
        }
      };
      const rz = new window.Razorpay(options);
      rz.open();
    } catch (error) {
      setMessage(error.response?.data?.message || "Booking failed");
    }
  };

  if (!eventData) {
    return <div className="empty-state">{message || "Loading event seats..."}</div>;
  }

  const availableCount = eventData.seats.filter((seat) => !seat.isTaken).length;
  const totalSelectedPrice = selectedSeats.reduce((sum, seat) => sum + Number(seat.price), 0);
  const remainingSlots = Math.max(0, MAX_ACTIVE_TICKETS - activeTicketCount);

  return (
    <div className="page-grid">
      <section className="hero-card">
        <span className="eyebrow">Live booking</span>
        <h1 className="title">{eventData.name}</h1>
        <p className="subtitle">
          {new Date(eventData.date).toLocaleString()} | {eventData.venue}
        </p>

        <div className="stats-row" style={{ marginTop: 18 }}>
          <div className="stat">
            <span className="stat-value">{eventData.seats.length}</span>
            <span className="stat-label">Total seats</span>
          </div>
          <div className="stat">
            <span className="stat-value">{availableCount}</span>
            <span className="stat-label">Available</span>
          </div>
          <div className="stat">
            <span className="stat-value">Polygon</span>
            <span className="stat-label">Minted ticket chain</span>
          </div>
        </div>

        <div className="section" style={{ marginTop: 22, padding: 0, background: "transparent", boxShadow: "none", border: 0 }}>
          <div className="section-header">
            <div>
              <h2 className="section-title">Choose your seat</h2>
              <p className="section-copy">Green seats are open, red seats are already claimed. Max 4 active tickets in wallet. Remaining slots: {remainingSlots}.</p>
            </div>
          </div>
          <div className="grid-shell">
            <SeatGrid
              seats={eventData.seats}
              selectedSeatIds={selectedSeats.map((seat) => seat.seatId)}
              onSeatClick={toggleSeatSelection}
            />
            <div className="legend">
              <span className="legend-item"><span className="dot good" /> Available</span>
              <span className="legend-item"><span className="dot bad" /> Taken</span>
              <span className="legend-item"><span className="dot warn" /> Selected</span>
            </div>
          </div>
        </div>
      </section>

      <aside className="stack">
        <div className="section">
          <div className="section-header">
            <div>
              <h2 className="section-title">Booking summary</h2>
              <p className="section-copy">Wallet active: {activeTicketCount} | Selected now: {selectedSeats.length} | Limit: {MAX_ACTIVE_TICKETS}</p>
            </div>
          </div>

          {selectedSeats.length ? (
            <div className="ticket-card">
              <div className="ticket-topline">
                <div className="ticket-meta">
                  <span className="status-badge good">{selectedSeats.length} Selected</span>
                  <span className="ticket-id">{selectedSeats.map((seat) => seat.seatId).join(", ")}</span>
                </div>
                <span className="status-badge">Multi-seat</span>
              </div>

              <div className="ticket-details">
                <div className="detail">
                  <span className="detail-label">Seats</span>
                  <span className="detail-value">{selectedSeats.map((seat) => seat.seatId).join(", ")}</span>
                </div>
                <div className="detail">
                  <span className="detail-label">Stands</span>
                  <span className="detail-value">{[...new Set(selectedSeats.map((seat) => seat.stand))].join(", ")}</span>
                </div>
                <div className="detail">
                  <span className="detail-label">Rows</span>
                  <span className="detail-value">{[...new Set(selectedSeats.map((seat) => seat.row))].join(", ")}</span>
                </div>
                <div className="detail">
                  <span className="detail-label">Total price</span>
                  <span className="detail-value">Rs. {totalSelectedPrice}</span>
                </div>
              </div>

              <div className="btn-row" style={{ marginTop: 16 }}>
                <button type="button" className="btn btn-primary" onClick={handleBook}>
                  Book Now
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedSeats([])}>
                  Clear All
                </button>
              </div>
            </div>
          ) : (
            <div className="empty-state">Select one or more seats to unlock the booking summary.</div>
          )}
        </div>

        <div className="section">
          <h3 className="section-title" style={{ fontSize: 18 }}>Status</h3>
          <p className="section-copy">We’ll show payment and minting updates here.</p>
          {message ? (
            <div className={`alert ${message.toLowerCase().includes("failed") || message.toLowerCase().includes("unable") ? "error" : ""}`}>
              {message}
            </div>
          ) : (
            <div className="empty-state">No action yet. Pick a seat and continue.</div>
          )}
        </div>
      </aside>
    </div>
  );
}

export default EventSeatMap;
