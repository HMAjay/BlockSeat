// MyTickets page separates active and used tickets with actions.
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { acquireCheckoutQueuePass } from "../services/queuePass";

const loadRazorpay = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

function TicketCard({ ticket, used, onViewQr, onTransfer, onVerify, onCantAttend, transferLocked, listedPrice }) {
  return (
    <article className="ticket-card">
      <div className="ticket-topline">
        <div className="ticket-meta">
          <span className={`status-badge ${used ? "bad" : "good"}`}>{used ? "Used" : "Active"}</span>
          <span className="ticket-id">#{ticket.tokenId}</span>
        </div>
        <span className="status-badge">{ticket.eventId}</span>
      </div>

      <div className="ticket-details">
        <div className="detail">
          <span className="detail-label">Seat</span>
          <span className="detail-value">{ticket.seat}</span>
        </div>
        <div className="detail">
          <span className="detail-label">Face value</span>
          <span className="detail-value">Rs. {ticket.faceValue}</span>
        </div>
        <div className="detail">
          <span className="detail-label">Max resale</span>
          <span className="detail-value">Rs. {ticket.maxResalePrice}</span>
        </div>
        <div className="detail">
          <span className="detail-label">Transfers</span>
          <span className="detail-value">{ticket.transferCount}</span>
        </div>
        <div className="detail" style={{ gridColumn: "1 / -1" }}>
          <span className="detail-label">Tx hash</span>
          <span className="detail-value" style={{ wordBreak: "break-all" }}>{ticket.txHash}</span>
        </div>
      </div>

      {!used ? (
        <div className="btn-row" style={{ marginTop: 16 }}>
          <button type="button" className="btn btn-secondary" onClick={() => onViewQr(ticket)}>
            View QR
          </button>
          <button type="button" className="btn btn-primary" onClick={() => onTransfer(ticket)} disabled={transferLocked}>
            {transferLocked ? "Transfer Pending" : "Transfer"}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onVerify(ticket)}
          >
            Verify Ticket
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => onCantAttend(ticket)}>
            {listedPrice ? `Update Can't Attend (Rs. ${listedPrice})` : "Can't Attend"}
          </button>
        </div>
      ) : (
        <p className="hint">This ticket has already been scanned at the gate.</p>
      )}
    </article>
  );
}

function MyTickets() {
  const [tickets, setTickets] = useState([]);
  const [requests, setRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [marketListings, setMarketListings] = useState([]);
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

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const { data } = await api.get("/transfer/requests/incoming");
        setRequests(data);
      } catch (error) {
        if (!message) {
          setMessage(error.response?.data?.message || "Failed to fetch transfer requests");
        }
      }
    };
    fetchRequests();
  }, []);

  useEffect(() => {
    const fetchSentRequests = async () => {
      try {
        const { data } = await api.get("/transfer/requests/sent");
        setSentRequests(data);
      } catch (error) {
        if (!message) {
          setMessage(error.response?.data?.message || "Failed to fetch sent transfer requests");
        }
      }
    };
    fetchSentRequests();
  }, []);

  useEffect(() => {
    const fetchMarketListings = async () => {
      try {
        const { data } = await api.get("/market/listings/my");
        setMarketListings(data);
      } catch (error) {
        if (!message) {
          setMessage(error.response?.data?.message || "Failed to fetch market listings");
        }
      }
    };
    fetchMarketListings();
  }, []);

  const active = tickets.filter((t) => !t.isUsed);
  const used = tickets.filter((t) => t.isUsed);
  const pendingTransferIds = new Set(
    sentRequests.filter((request) => request.status === "pending").map((request) => String(request.tokenId))
  );
  const listingByTokenId = new Map(marketListings.map((listing) => [String(listing.tokenId), listing]));

  const listTicketForMarket = async (ticket) => {
    try {
      const existing = listingByTokenId.get(String(ticket.tokenId));
      const input = window.prompt(
        `Set resale price for seat ${ticket.seat} (max Rs. ${ticket.maxResalePrice})`,
        String(existing?.resalePrice || ticket.faceValue)
      );
      if (input === null) return;
      const price = Number(input);
      if (!Number.isFinite(price) || price <= 0) {
        return setMessage("Enter a valid resale price");
      }

      await api.post("/market/listings", {
        tokenId: Number(ticket.tokenId),
        resalePrice: price,
      });

      const { data } = await api.get("/market/listings/my");
      setMarketListings(data);
      setMessage(`Seat ${ticket.seat} is now listed on market`);
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to list seat");
    }
  };

  const completeTransfer = async (request) => {
    try {
      setMessage("Joining checkout waiting room...");
      const queuePass = await acquireCheckoutQueuePass({ onStatus: setMessage });
      const loaded = await loadRazorpay();
      if (!loaded) return setMessage("Unable to load Razorpay SDK");

      const orderResp = await api.post(
        `/transfer/request/${request._id}/create-order`,
        {},
        { headers: { "X-BlockSeat-Queue-Pass": queuePass } }
      );
      const order = orderResp.data.order;

      const options = {
        key: orderResp.data.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "BlockSeat",
        description: `Buy ticket #${request.tokenId}`,
        order_id: order.id,
        handler: async (response) => {
          try {
            await api.post(`/transfer/request/${request._id}/complete`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });
            setMessage(`Ticket bought from ${request.sellerBstId}`);
            const [ticketsResp, requestsResp] = await Promise.all([
              api.get("/tickets"),
              api.get("/transfer/requests/incoming")
            ]);
            setTickets(ticketsResp.data);
            setRequests(requestsResp.data);
          } catch (err) {
            setMessage(err.response?.data?.message || "Transfer completion failed after payment");
          }
        }
      };

      const rz = new window.Razorpay(options);
      rz.open();
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to complete transfer");
    }
  };

  const declineTransfer = async (requestId) => {
    try {
      await api.post(`/transfer/request/${requestId}/decline`);
      const { data } = await api.get("/transfer/requests/incoming");
      setRequests(data);
      setMessage("Transfer request declined");
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to decline transfer request");
    }
  };

  return (
    <div className="stack">
      <section className="hero-card">
        <span className="eyebrow">Wallet view</span>
        <h1 className="title">My tickets</h1>
        <p className="subtitle">
          Track your active entry passes, open QR codes, and move tickets using the resale guardrails built into the platform.
        </p>
        <div className="stats-row">
          <div className="stat">
            <span className="stat-value">{active.length}</span>
            <span className="stat-label">Active tickets</span>
          </div>
          <div className="stat">
            <span className="stat-value">{used.length}</span>
            <span className="stat-label">Used tickets</span>
          </div>
          <div className="stat">
            <span className="stat-value">{tickets.length}</span>
            <span className="stat-label">Total in wallet</span>
          </div>
        </div>

      </section>

      <div className="layout-split">
        <section className="section">
          <div className="section-header">
            <div>
              <h2 className="section-title">Active tickets</h2>
              <p className="section-copy">These tickets can still be scanned, viewed, or transferred.</p>
            </div>
          </div>

          <div className="stack">
            {active.length ? active.map((ticket) => (
              <TicketCard
                key={ticket.tokenId}
                ticket={ticket}
                used={false}
                onViewQr={() => navigate(`/qr/${ticket.tokenId}`)}
                onTransfer={() => navigate(`/transfer/${ticket.tokenId}`)}
                onVerify={() => navigate(`/verify/${ticket.tokenId}`)}
                onCantAttend={() => listTicketForMarket(ticket)}
                transferLocked={pendingTransferIds.has(String(ticket.tokenId))}
                listedPrice={listingByTokenId.get(String(ticket.tokenId))?.resalePrice}
              />
            )) : <div className="empty-state">No active tickets yet. Book one from the event seat map.</div>}
          </div>
        </section>

        <section className="section">
          <div className="section-header">
            <div>
              <h2 className="section-title">Used tickets</h2>
              <p className="section-copy">Past entries stay here for reference.</p>
            </div>
          </div>

          <div className="stack">
            {used.length ? used.map((ticket) => (
              <TicketCard key={ticket.tokenId} ticket={ticket} used />
            )) : <div className="empty-state">No used tickets yet.</div>}
          </div>
        </section>
      </div>

      <section className="section">
        <div className="section-header">
          <div>
            <h2 className="section-title">Transferred tickets</h2>
            <p className="section-copy">Completed transfer requests remain here so you can see tickets that moved to another buyer.</p>
          </div>
        </div>

        <div className="stack">
          {sentRequests.length ? sentRequests.map((request) => {
            const isCompleted = request.status === "completed";
            return (
              <article className="ticket-card" key={request._id}>
                <div className="ticket-topline">
                  <div className="ticket-meta">
                    <span className={`status-badge ${isCompleted ? "good" : ""}`}>
                      {isCompleted ? "Ticket transferred" : request.status}
                    </span>
                    <span className="ticket-id">#{request.tokenId}</span>
                  </div>
                  <span className="status-badge">{request.eventId}</span>
                </div>
                <div className="ticket-details">
                  <div className="detail">
                    <span className="detail-label">To</span>
                    <span className="detail-value">{request.buyerBstId}</span>
                  </div>
                  <div className="detail">
                    <span className="detail-label">Seat</span>
                    <span className="detail-value">{request.seat}</span>
                  </div>
                  <div className="detail">
                    <span className="detail-label">Price</span>
                    <span className="detail-value">Rs. {request.resalePrice}</span>
                  </div>
                  <div className="detail">
                    <span className="detail-label">Tx hash</span>
                    <span className="detail-value" style={{ wordBreak: "break-all" }}>{request.txHash || request.paymentOrderId || "-"}</span>
                  </div>
                </div>
              </article>
            );
          }) : <div className="empty-state">No transferred tickets yet.</div>}
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <div>
            <h2 className="section-title">Incoming transfer requests</h2>
            <p className="section-copy">Sellers can request a transfer to your BST ID. Approve one to buy the ticket.</p>
          </div>
        </div>

        <div className="stack">
          {requests.length ? requests.map((request) => (
            <article className="ticket-card" key={request._id}>
              <div className="ticket-topline">
                <div className="ticket-meta">
                  <span className="status-badge">{request.status}</span>
                  <span className="ticket-id">#{request.tokenId}</span>
                </div>
                <span className="status-badge">{request.eventId}</span>
              </div>
              <div className="ticket-details">
                <div className="detail">
                  <span className="detail-label">From</span>
                  <span className="detail-value">{request.sellerBstId}</span>
                </div>
                <div className="detail">
                  <span className="detail-label">Buyer</span>
                  <span className="detail-value">{request.buyerBstId}</span>
                </div>
                <div className="detail">
                  <span className="detail-label">Seat</span>
                  <span className="detail-value">{request.seat}</span>
                </div>
                <div className="detail">
                  <span className="detail-label">Price</span>
                  <span className="detail-value">Rs. {request.resalePrice}</span>
                </div>
              </div>
              <div className="btn-row" style={{ marginTop: 16 }}>
                <button type="button" className="btn btn-primary" onClick={() => completeTransfer(request)}>
                  Accept & Buy
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => declineTransfer(request._id)}>
                  Decline
                </button>
              </div>
            </article>
          )) : <div className="empty-state">No incoming transfer requests.</div>}
        </div>
      </section>

      {message && <div className={`alert ${message.toLowerCase().includes("fail") ? "error" : ""}`}>{message}</div>}
    </div>
  );
}

export default MyTickets;
