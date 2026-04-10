// Small landing page that orients users and points them to key app actions.
import React from "react";
import { useNavigate } from "react-router-dom";

function Home() {
  const navigate = useNavigate();
  const isAuthed = Boolean(localStorage.getItem("blockseat_token"));
  const bstId = localStorage.getItem("blockseat_bstId");

  return (
    <div className="stack">
      <section className="hero-card">
        <span className="eyebrow">BlockSeat</span>
        <h1 className="title">Tickets without the scalper noise.</h1>
        <p className="subtitle">
          BlockSeat keeps event access tied to verified ownership, seat selection, and secure checkout so you can move fast without giving bots an opening.
        </p>

        <div className="stats-row" style={{ marginTop: 18 }}>
          <div className="stat">
            <span className="stat-value">NFT</span>
            <span className="stat-label">Ticket ownership</span>
          </div>
          <div className="stat">
            <span className="stat-value">OTP</span>
            <span className="stat-label">Secure sign-in</span>
          </div>
          <div className="stat">
            <span className="stat-value">Queue</span>
            <span className="stat-label">Bot-resistant checkout</span>
          </div>
        </div>

        <div className="btn-row" style={{ marginTop: 24 }}>
          <button type="button" className="btn btn-primary" onClick={() => navigate("/events/Match-001")}>
            Browse Events
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate(isAuthed ? "/my-tickets" : "/login")}>
            {isAuthed ? "My Tickets" : "Sign In"}
          </button>
        </div>
      </section>

      <div className="layout-split">
        <section className="section">
          <div className="section-header">
            <div>
              <h2 className="section-title">How it works</h2>
              <p className="section-copy">Pick seats, pass through the queue, and keep resale capped automatically.</p>
            </div>
          </div>

          <div className="stack">
            <div className="ticket-card">
              <strong>1. Sign in</strong>
              <p className="hint" style={{ marginTop: 8 }}>
                Use your phone number and OTP to create or access your BST wallet identity.
              </p>
            </div>
            <div className="ticket-card">
              <strong>2. Choose seats</strong>
              <p className="hint" style={{ marginTop: 8 }}>
                Select up to four total active tickets across your wallet and new booking.
              </p>
            </div>
            <div className="ticket-card">
              <strong>3. Checkout safely</strong>
              <p className="hint" style={{ marginTop: 8 }}>
                The waiting room and queue pass keep scripts out of the payment path.
              </p>
            </div>
          </div>
        </section>

        <aside className="section">
          <div className="section-header">
            <div>
              <h2 className="section-title">Session snapshot</h2>
              <p className="section-copy">A quick view of your current BlockSeat session.</p>
            </div>
          </div>

          <div className="stack">
            <div className="detail">
              <span className="detail-label">BST ID</span>
              <span className="detail-value">{bstId || "Guest session"}</span>
            </div>
            <div className="detail">
              <span className="detail-label">Featured event</span>
              <span className="detail-value">Match-001</span>
            </div>
            <div className="detail">
              <span className="detail-label">Best next step</span>
              <span className="detail-value">Open Browse Events and book your seats</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default Home;
