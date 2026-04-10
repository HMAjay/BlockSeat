// Small landing page that orients users and points them to key app actions.
import React from "react";
import { useNavigate } from "react-router-dom";

function Home() {
  const navigate = useNavigate();
  const isAuthed = Boolean(localStorage.getItem("blockseat_token"));

  return (
    <div className="stack">
      <section className="hero-card">
        <span className="eyebrow">BlockSeat</span>
        <h1 className="title">Book Live Matches</h1>
        <p className="subtitle">Choose an event and reserve seats fast.</p>

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
          <button type="button" className="btn btn-primary" onClick={() => navigate("/events")}>
            Browse Events
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate(isAuthed ? "/my-tickets" : "/login")}>
            {isAuthed ? "My Tickets" : "Sign In"}
          </button>
        </div>
      </section>
    </div>
  );
}

export default Home;
