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

  if (!eventData) return <p style={{ padding: 20 }}>{message || "Loading event seats..."}</p>;

  return (
    <div style={{ padding: 20, fontFamily: "Arial" }}>
      <h2>{eventData.name} - Seat Map</h2>
      <p>{new Date(eventData.date).toLocaleString()} | {eventData.venue}</p>
      <SeatGrid
        seats={eventData.seats}
        selectedSeatId={selectedSeat?.seatId}
        onSeatClick={setSelectedSeat}
      />

      {selectedSeat && (
        <div style={{ marginTop: 16, padding: 12, border: "1px solid #ddd", borderRadius: 8, maxWidth: 420 }}>
          <p><strong>Stand:</strong> {selectedSeat.stand}</p>
          <p><strong>Row:</strong> {selectedSeat.row}</p>
          <p><strong>Seat:</strong> {selectedSeat.seatId}</p>
          <p><strong>Price:</strong> Rs. {selectedSeat.price}</p>
          <button onClick={handleBook} style={{ padding: "10px 16px" }}>Book Now</button>
        </div>
      )}

      {message && <p style={{ marginTop: 14 }}>{message}</p>}
    </div>
  );
}

export default EventSeatMap;
