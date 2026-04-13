import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import SeatGrid from "../components/SeatGrid";
import api from "../services/api";
import { acquireCheckoutQueuePass } from "../services/queuePass";
import {
  buildTierCards,
  formatEventDate,
  formatPrice,
  getEventStatus,
  parseMatchup,
} from "../utils/eventPresentation";

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

function EventSeatMapRedesign() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [eventData, setEventData] = useState(null);
  const [marketListings, setMarketListings] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [selectedListing, setSelectedListing] = useState(null);
  const [activeTicketCount, setActiveTicketCount] = useState(0);
  const [activeTier, setActiveTier] = useState("all");
  const [message, setMessage] = useState("");
  const [yellowSeatWarning, setYellowSeatWarning] = useState(null);

  useEffect(() => {
    const fetchSeats = async () => {
      try {
        const [eventResp, listingResp] = await Promise.all([
          api.get(`/events/${id}/seats`),
          api.get(`/market/listings/event/${id}`),
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
        setActiveTicketCount(data.filter((ticket) => !ticket.isUsed).length);
      } catch (error) {
        setMessage(error.response?.data?.message || "Failed to load wallet tickets");
      }
    };

    fetchWalletTickets();
  }, []);

  const listingBySeat = useMemo(
    () => new Map(marketListings.map((listing) => [listing.seat, listing])),
    [marketListings]
  );

  const seatsWithListings = useMemo(() => {
    if (!eventData?.seats) return [];

    return eventData.seats.map((seat) => {
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
  }, [eventData, listingBySeat]);

  const tierCards = useMemo(() => buildTierCards(seatsWithListings), [seatsWithListings]);
  const matchup = useMemo(() => parseMatchup(eventData?.name || ""), [eventData?.name]);
  const filteredSeats = useMemo(() => {
    if (activeTier === "all") return seatsWithListings;
    const tier = tierCards.find((item) => item.id === activeTier);
    if (!tier) return seatsWithListings;
    const seatIds = new Set(tier.seats.map((seat) => seat.seatId));
    return seatsWithListings.filter((seat) => seatIds.has(seat.seatId));
  }, [activeTier, seatsWithListings, tierCards]);

  const availableCount = seatsWithListings.filter((seat) => !seat.isTaken || seat.isMarketListed).length;
  const totalSelectedPrice = selectedSeats.reduce((sum, seat) => sum + Number(seat.price), 0);
  const remainingSlots = Math.max(0, MAX_ACTIVE_TICKETS - activeTicketCount);
  const { isLive } = getEventStatus(eventData?.date);

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

    if (seat.seatType === "yellow") {
      setYellowSeatWarning(seat);
      return;
    }

    if (selectedListing) setSelectedListing(null);
    setSelectedSeats((prev) => {
      const exists = prev.some((item) => item.seatId === seat.seatId);
      if (exists) return prev.filter((item) => item.seatId !== seat.seatId);

      if (prev.length >= remainingSlots) {
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
      if (exists) return prev.filter((item) => item.seatId !== seat.seatId);

      if (prev.length >= remainingSlots) {
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
              razorpay_signature: response.razorpay_signature,
            });
            setMessage(`Purchased listed seat ${selectedListing.seat}`);
            setTimeout(() => navigate("/my-tickets"), 1000);
          } catch (error) {
            setMessage(error.response?.data?.message || "Market purchase failed after payment");
          }
        },
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
      const orderResp = await api.post(
        "/payment/create-order",
        { amount: totalAmount },
        { headers: { "X-BlockSeat-Queue-Pass": queuePass } }
      );
      const order = orderResp.data;

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
                faceValue: seat.price,
              });
              mintedCount += 1;
            }
            setMessage(`Payment successful. ${mintedCount} ticket(s) minted.`);
            setTimeout(() => navigate("/my-tickets"), 1000);
          } catch (mintError) {
            setMessage(mintError.response?.data?.message || "Payment succeeded, but one or more seats failed to mint");
          }
        },
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

  return (
    <div className="stack event-seat-page">
      <section className="seat-hero-card">
        <div className="seat-hero-copy">
          <span className="live-badge">{isLive ? "Live Match" : "Booking Open"}</span>
          <h1 className="hero-title seat-hero-title">{eventData.name}</h1>
          <p className="hero-subtitle">{formatEventDate(eventData.date)} · {eventData.venue}</p>
        </div>

        <div className="seat-hero-score">
          <div className="seat-team-pill">
            <span>{matchup.firstCode}</span>
          </div>
          <strong>VS</strong>
          <div className="seat-team-pill away">
            <span>{matchup.secondCode}</span>
          </div>
        </div>
      </section>

      <section className="events-panel">
        <div className="events-panel-header">
          <div>
            <h2 className="panel-title">Ticket categories</h2>
            <p className="panel-copy">
              Select a tier first, then choose seats. You can book {remainingSlots} more seat{remainingSlots !== 1 ? "s" : ""} before reaching the wallet limit.
            </p>
          </div>
          <div className="chain-strip prominent">
            <span className="polygon-mark" aria-hidden="true" />
            Powered by Polygon Amoy
          </div>
        </div>

        <div className="tier-grid">
          <button
            type="button"
            className={`tier-card ${activeTier === "all" ? "active" : ""}`}
            onClick={() => setActiveTier("all")}
          >
            <span className="tier-label">All Seats</span>
            <strong className="tier-price">{formatPrice(Math.min(...seatsWithListings.map((seat) => seat.price)))}</strong>
            <p className="tier-copy">See every available block in the stadium bowl.</p>
            <span className="tier-select">Select</span>
          </button>

          {tierCards.map((tier) => (
            <button
              key={tier.id}
              type="button"
              className={`tier-card ${activeTier === tier.id ? "active" : ""} ${tier.recommended ? "recommended" : ""}`}
              onClick={() => setActiveTier(tier.id)}
            >
              {tier.recommended ? <span className="tier-recommended">Recommended</span> : null}
              <span className="tier-label">{tier.name}</span>
              <strong className="tier-price">{tier.matic} MATIC</strong>
              <span className="tier-copy">{formatPrice(tier.minPrice)} equivalent</span>
              <ul className="tier-perks">
                {tier.perks.map((perk) => (
                  <li key={perk}>{perk}</li>
                ))}
              </ul>
              <div className="tier-footer">
                <span>{tier.seatCount} seats open</span>
                <span className="tier-select">Select</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="events-panel">
        <div className="events-panel-header">
          <div>
            <h2 className="panel-title">Seat map</h2>
            <p className="panel-copy">
              Green = available, red = taken, gold = resale restricted, grey = resale listing.
            </p>
          </div>
          <span className="seats-badge">{availableCount} seats available</span>
        </div>

        <div className="seat-map-shell">
          <SeatGrid
            seats={filteredSeats}
            selectedSeatIds={selectedSeats.map((seat) => seat.seatId)}
            selectedSeatId={selectedListing?.seat}
            onSeatClick={toggleSeatSelection}
          />
          <div className="legend">
            <span className="legend-item"><span className="dot good" /> Available</span>
            <span className="legend-item"><span className="dot bad" /> Taken</span>
            <span className="legend-item"><span className="dot neutral" /> Resale</span>
            <span className="legend-item"><span className="dot warn" /> VIP / restricted</span>
          </div>
        </div>

        {message ? (
          <div className={`alert ${message.toLowerCase().includes("failed") || message.toLowerCase().includes("unable") ? "error" : ""}`}>
            {message}
          </div>
        ) : null}
      </section>

      {(selectedSeats.length > 0 || selectedListing) ? (
        <div className="booking-panel">
          {selectedListing ? (
            <>
              <div className="booking-panel-info">
                <div className="booking-panel-thumbnail booking-mark">{matchup.firstCode}</div>
                <div className="booking-panel-meta">
                  <span className="booking-panel-seat">{selectedListing.row}: {selectedListing.seat}</span>
                  <span className="booking-panel-tier">Resale Opportunity</span>
                </div>
              </div>
              <div className="booking-panel-divider" />
              <div className="booking-panel-price">
                <span className="booking-panel-amount">{formatPrice(selectedListing.resalePrice)} <span>Total</span></span>
                <span className="booking-panel-desc">Service fees included</span>
              </div>
              <button type="button" className="booking-panel-button" onClick={handleBuyListedSeat}>
                Confirm Purchase
              </button>
            </>
          ) : (
            <>
              <div className="booking-panel-info">
                <div className="booking-panel-thumbnail booking-mark">{matchup.secondCode}</div>
                <div className="booking-panel-meta">
                  <span className="booking-panel-seat">{selectedSeats.length} Seat{selectedSeats.length !== 1 ? "s" : ""}</span>
                  <span className="booking-panel-tier">{eventData.name}</span>
                </div>
              </div>
              <div className="booking-panel-divider" />
              <div className="booking-panel-price">
                <span className="booking-panel-amount">{formatPrice(totalSelectedPrice)} <span>Total</span></span>
                <span className="booking-panel-desc">Service fees included</span>
              </div>
              <button type="button" className="booking-panel-button" onClick={handleBook}>
                Confirm Booking
              </button>
            </>
          )}
        </div>
      ) : null}

      {yellowSeatWarning ? (
        <div className="modal-overlay" onClick={() => setYellowSeatWarning(null)}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <h2 className="modal-title">Yellow Seat Warning</h2>
            <p className="modal-text">
              You&apos;ve selected seat <strong>{yellowSeatWarning.row}{yellowSeatWarning.seatId}</strong>, which is marked as a <strong>yellow seat</strong>.
            </p>
            <p className="modal-text">
              Once you buy this ticket, you will <strong>not</strong> be able to resale or transfer it to another person.
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
      ) : null}
    </div>
  );
}

export default EventSeatMapRedesign;
