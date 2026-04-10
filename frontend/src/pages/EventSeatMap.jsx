// Event seat page fetches seat map and handles booking + mint flow.
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import SeatGrid from "../components/SeatGrid";

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
  const [selectedSeat, setSelectedSeat] = useState(null);
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

  const handleBook = async () => {
    try {
      if (!selectedSeat) return setMessage("Select a seat first");

      // Step 1: Create payment order for selected seat price.
      const orderResp = await api.post("/payment/create-order", { amount: selectedSeat.price });
      const order = orderResp.data;

      // Step 2: Launch Razorpay popup and mint ticket only after successful payment.
      const loaded = await loadRazorpay();
      if (!loaded) return setMessage("Unable to load Razorpay SDK");

      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "BlockSeat",
        description: `Ticket for ${selectedSeat.seatId}`,
        order_id: order.id,
        handler: async () => {
          const tokenId = Date.now();
          await api.post("/tickets/mint", {
            tokenId,
            eventId: eventData.eventId,
            seat: selectedSeat.seatId,
            faceValue: selectedSeat.price
          });
          setMessage("Payment successful. Ticket minted.");
          setTimeout(() => navigate("/my-tickets"), 1000);
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
              <p className="section-copy">Green seats are open, red seats are already claimed. Your selection appears on the right.</p>
            </div>
          </div>
          <div className="grid-shell">
            <SeatGrid
              seats={eventData.seats}
              selectedSeatId={selectedSeat?.seatId}
              onSeatClick={setSelectedSeat}
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
              <p className="section-copy">Review the seat, price, and stand before you open Razorpay.</p>
            </div>
          </div>

          {selectedSeat ? (
            <div className="ticket-card">
              <div className="ticket-topline">
                <div className="ticket-meta">
                  <span className="status-badge good">Selected</span>
                  <span className="ticket-id">{selectedSeat.seatId}</span>
                </div>
                <span className="status-badge">{selectedSeat.stand}</span>
              </div>

              <div className="ticket-details">
                <div className="detail">
                  <span className="detail-label">Stand</span>
                  <span className="detail-value">{selectedSeat.stand}</span>
                </div>
                <div className="detail">
                  <span className="detail-label">Row</span>
                  <span className="detail-value">{selectedSeat.row}</span>
                </div>
                <div className="detail">
                  <span className="detail-label">Seat</span>
                  <span className="detail-value">{selectedSeat.seatId}</span>
                </div>
                <div className="detail">
                  <span className="detail-label">Price</span>
                  <span className="detail-value">Rs. {selectedSeat.price}</span>
                </div>
              </div>

              <div className="btn-row" style={{ marginTop: 16 }}>
                <button type="button" className="btn btn-primary" onClick={handleBook}>
                  Book Now
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedSeat(null)}>
                  Clear
                </button>
              </div>
            </div>
          ) : (
            <div className="empty-state">Select a seat to unlock the booking summary.</div>
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
