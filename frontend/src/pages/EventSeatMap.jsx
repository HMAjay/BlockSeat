// Event seat page fetches seat map and handles booking + mint flow.
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import SeatGrid from "../components/SeatGrid";
import { acquireCheckoutQueuePass } from "../services/queuePass";

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
  const [marketListings, setMarketListings] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [selectedListing, setSelectedListing] = useState(null);
  const [activeTicketCount, setActiveTicketCount] = useState(0);
  const [message, setMessage] = useState("");
  const [yellowSeatWarning, setYellowSeatWarning] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSeats = async () => {
      try {
        const [eventResp, listingResp] = await Promise.all([
          api.get(`/events/${id}/seats`),
          api.get(`/market/listings/event/${id}`)
        ]);
        setEventData(eventResp.data);
        setMarketListings(listingResp.data || []);
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
    if (seat.isMarketListed) {
      setSelectedSeats([]);
      setSelectedListing((prev) => (prev?._id === seat.listingId ? null : {
        _id: seat.listingId,
        tokenId: seat.listingTokenId,
        seat: seat.seatId,
        stand: seat.stand,
        row: seat.row,
        resalePrice: seat.listingPrice,
      }));
      return;
    }

    // Check if this is a yellow seat
    if (seat.seatType === "yellow") {
      setYellowSeatWarning(seat);
      return;
    }

    if (selectedListing) setSelectedListing(null);
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

  const confirmYellowSeatSelection = () => {
    if (!yellowSeatWarning) return;
    const seat = yellowSeatWarning;
    setYellowSeatWarning(null);

    if (selectedListing) setSelectedListing(null);
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

  const handleBuyListedSeat = async () => {
    try {
      if (!selectedListing) return setMessage("Select a listed grey seat first");
      if (activeTicketCount + 1 > MAX_ACTIVE_TICKETS) {
        return setMessage(`Booking blocked: wallet + selected seats cannot exceed ${MAX_ACTIVE_TICKETS} active tickets.`);
      }

      setMessage("Joining checkout waiting room...");
      const queuePass = await acquireCheckoutQueuePass({ onStatus: setMessage });
      const loaded = await loadRazorpay();
      if (!loaded) return setMessage("Unable to load Razorpay SDK");

      const orderResp = await api.post(
        `/market/listing/${selectedListing._id}/create-order`,
        {},
        { headers: { "X-BlockSeat-Queue-Pass": queuePass } }
      );
      const order = orderResp.data.order;

      const options = {
        key: orderResp.data.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "BlockSeat",
        description: `Buy listed seat ${selectedListing.seat}`,
        order_id: order.id,
        handler: async (response) => {
          try {
            await api.post(`/market/listing/${selectedListing._id}/complete`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });
            setMessage(`Purchased listed seat ${selectedListing.seat}`);
            setTimeout(() => navigate("/my-tickets"), 1000);
          } catch (error) {
            setMessage(error.response?.data?.message || "Market purchase failed after payment");
          }
        }
      };
      const rz = new window.Razorpay(options);
      rz.open();
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to buy listed seat");
    }
  };

  const handleBook = async () => {
    try {
      if (!selectedSeats.length) return setMessage("Select at least one seat first");
      if (activeTicketCount + selectedSeats.length > MAX_ACTIVE_TICKETS) {
        return setMessage(`Booking blocked: wallet + selected seats cannot exceed ${MAX_ACTIVE_TICKETS} active tickets.`);
      }

      const totalAmount = selectedSeats.reduce((sum, seat) => sum + Number(seat.price), 0);

      setMessage("Joining checkout waiting room...");
      const queuePass = await acquireCheckoutQueuePass({ onStatus: setMessage });

      // Step 1: Create payment order for the combined selected seat amount.
      const orderResp = await api.post(
        "/payment/create-order",
        { amount: totalAmount },
        { headers: { "X-BlockSeat-Queue-Pass": queuePass } }
      );
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

  const listingBySeat = new Map(marketListings.map((listing) => [listing.seat, listing]));
  const seatsWithListings = eventData.seats.map((seat) => {
    const listing = listingBySeat.get(seat.seatId);
    if (!listing) return seat;
    return {
      ...seat,
      isMarketListed: true,
      listingId: listing._id,
      listingTokenId: listing.tokenId,
      listingPrice: listing.resalePrice,
    };
  });

  const availableCount = seatsWithListings.filter((seat) => !seat.isTaken || seat.isMarketListed).length;
  const totalSelectedPrice = selectedSeats.reduce((sum, seat) => sum + Number(seat.price), 0);
  const remainingSlots = Math.max(0, MAX_ACTIVE_TICKETS - activeTicketCount);

  return (
    <div className="app-main" style={{ paddingBottom: '160px' }}>
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
              <h2 className="section-title">Select Seats</h2>
              <p className="section-copy">Green = Available | Red = Taken | Yellow = Resale. Select up to {remainingSlots} more seat{remainingSlots !== 1 ? 's' : ''} (total limit: {MAX_ACTIVE_TICKETS}).</p>
            </div>
          </div>
          <div className="grid-shell">
            <SeatGrid
              seats={seatsWithListings}
              selectedSeatIds={selectedSeats.map((seat) => seat.seatId)}
              selectedSeatId={selectedListing?.seat}
              onSeatClick={toggleSeatSelection}
            />
            <div className="legend">
              <span className="legend-item"><span className="dot good" /> Available</span>
              <span className="legend-item"><span className="dot bad" /> Taken</span>
              <span className="legend-item"><span className="dot neutral" /> Resale</span>
            </div>
          </div>
        </div>

        {message && (
          <div className={`alert ${message.toLowerCase().includes("failed") || message.toLowerCase().includes("unable") ? "error" : ""}`} style={{ marginTop: 16 }}>
            {message}
          </div>
        )}
      </section>

      {(selectedSeats.length > 0 || selectedListing) && (
        <div className="booking-panel">
          {selectedListing ? (
            <>
              <div className="booking-panel-info">
                <div className="booking-panel-thumbnail">
                  <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuDHwIlMJ0HM_ocOfwn0upiAZcQXNDMDs-OrOs_ekIWJgdr_nzSWI4513JIS7Mriymv7TLg6s1-m0LcBKBhsottF_YPbMoymF4GlY5pET0oH9l07nukdA7rAkcwEgyMZ4yoCBmfzjn9egTjd7gxo0bZoe4eiFY6jj63AytRG8eFuL7HoCbCHy_p6nGoYSjFP_s6C3aLf4Qw271r0jd7TOWtWg11RN4N5ifJyaKKzvG2HsWXKKHy13L0oDMA8XuhMU1z4sJpVgqj9AXc" alt="venue" />
                </div>
                <div className="booking-panel-meta">
                  <span className="booking-panel-seat">{selectedListing.row}: {selectedListing.seat}</span>
                  <span className="booking-panel-tier">Resale Opportunity</span>
                </div>
              </div>
              <div className="booking-panel-divider"></div>
              <div className="booking-panel-price">
                <span className="booking-panel-amount">Rs. {selectedListing.resalePrice} <span>Total</span></span>
                <span className="booking-panel-desc">Service fees included</span>
              </div>
              <button type="button" className="booking-panel-button" onClick={handleBuyListedSeat}>
                Confirm Purchase
              </button>
            </>
          ) : selectedSeats.length > 0 ? (
            <>
              <div className="booking-panel-info">
                <div className="booking-panel-thumbnail">
                  <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuDHwIlMJ0HM_ocOfwn0upiAZcQXNDMDs-OrOs_ekIWJgdr_nzSWI4513JIS7Mriymv7TLg6s1-m0LcBKBhsottF_YPbMoymF4GlY5pET0oH9l07nukdA7rAkcwEgyMZ4yoCBmfzjn9egTjd7gxo0bZoe4eiFY6jj63AytRG8eFuL7HoCbCHy_p6nGoYSjFP_s6C3aLf4Qw271r0jd7TOWtWg11RN4N5ifJyaKKzvG2HsWXKKHy13L0oDMA8XuhMU1z4sJpVgqj9AXc" alt="venue" />
                </div>
                <div className="booking-panel-meta">
                  <span className="booking-panel-seat">{selectedSeats.length} Seat{selectedSeats.length !== 1 ? 's' : ''}</span>
                  <span className="booking-panel-tier">{eventData.name}</span>
                </div>
              </div>
              <div className="booking-panel-divider"></div>
              <div className="booking-panel-price">
                <span className="booking-panel-amount">Rs. {totalSelectedPrice} <span>Total</span></span>
                <span className="booking-panel-desc">Service fees included</span>
              </div>
              <button type="button" className="booking-panel-button" onClick={handleBook}>
                Confirm Booking
              </button>
            </>
          ) : null}
        </div>
      )}

      {yellowSeatWarning && (
        <div className="modal-overlay" onClick={() => setYellowSeatWarning(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">⚠️ Yellow Seat Warning</h2>
            <p className="modal-text">
              You've selected seat <strong>{yellowSeatWarning.row}{yellowSeatWarning.seatId}</strong>, which is marked as a <strong>yellow seat (resale restricted)</strong>.
            </p>
            <p className="modal-text">
              <strong>Important:</strong> Once you buy this ticket, you will <strong>NOT be able to resale or transfer it</strong> to another person. This is a one-time purchase for personal use only.
            </p>
            <div className="modal-actions">
              <button type="button" className="modal-button cancel" onClick={() => setYellowSeatWarning(null)}>
                Cancel
              </button>
              <button type="button" className="modal-button confirm" onClick={confirmYellowSeatSelection}>
                I Understand, Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EventSeatMap;
