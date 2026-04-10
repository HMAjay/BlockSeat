import React from "react";
import { useNavigate } from "react-router-dom";

function Home() {
  const navigate = useNavigate();
  const bstId = localStorage.getItem("blockseat_bstId");

  return (
    <div className="stack">
      <section className="hero-card">
        <span className="eyebrow">Welcome to BlockSeat</span>
        <h1 className="title">Own the ticket. Control the entry. Kill the resale chaos.</h1>
        <p className="subtitle">
          BlockSeat gives fans a cleaner way to book, hold, transfer, and verify event tickets
          with blockchain-backed ownership and dynamic QR-based gate validation.
        </p>

        <div className="stats-row">
          <div className="stat">
            <span className="stat-value">OTP + BST ID</span>
            <span className="stat-label">Fast user onboarding</span>
          </div>
          <div className="stat">
            <span className="stat-value">Polygon Amoy</span>
            <span className="stat-label">NFT ticket ownership</span>
          </div>
          <div className="stat">
            <span className="stat-value">Dynamic QR</span>
            <span className="stat-label">Gate-ready verification</span>
          </div>
        </div>

        <div className="btn-row" style={{ marginTop: 22 }}>
          <button type="button" className="btn btn-primary" onClick={() => navigate("/events/Match-001")}>
            Browse Events
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate("/my-tickets")}>
            Open My Tickets
          </button>
        </div>
      </section>

      <div className="home-grid">
        <section className="section">
          <div className="section-header">
            <div>
              <h2 className="section-title">What you can do here</h2>
              <p className="section-copy">Use this page as the launch point for the full BlockSeat flow.</p>
            </div>
          </div>

          <div className="home-cards">
            <article className="ticket-card">
              <span className="status-badge good">1</span>
              <h3 className="section-title" style={{ marginTop: 14 }}>Browse and book seats</h3>
              <p className="section-copy">
                Open the live event seat map, choose available seats, and move into the payment and minting flow.
              </p>
              <div className="btn-row" style={{ marginTop: 16 }}>
                <button type="button" className="btn btn-secondary" onClick={() => navigate("/events/Match-001")}>
                  Go to Events
                </button>
              </div>
            </article>

            <article className="ticket-card">
              <span className="status-badge">2</span>
              <h3 className="section-title" style={{ marginTop: 14 }}>Manage your ticket</h3>
              <p className="section-copy">
                View active tickets, open QR codes, verify transaction hashes, and handle transfer requests.
              </p>
              <div className="btn-row" style={{ marginTop: 16 }}>
                <button type="button" className="btn btn-secondary" onClick={() => navigate("/my-tickets")}>
                  Open Ticket
                </button>
              </div>
            </article>
          </div>
        </section>

        <aside className="section">
          <div className="section-header">
            <div>
              <h2 className="section-title">Session snapshot</h2>
              <p className="section-copy">A quick overview of who is currently inside the app.</p>
            </div>
          </div>

          <div className="stack">
            <div className="detail">
              <span className="detail-label">BST ID</span>
              <span className="detail-value">{bstId || "Guest session"}</span>
            </div>
            <div className="detail">
              <span className="detail-label">Primary event</span>
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
