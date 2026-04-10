import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  // Hide navbar on login page
  if (location.pathname === "/login") return null;

  const handleBrandClick = () => {
    navigate("/");
  };

  const handleSignOut = () => {
    localStorage.removeItem("blockseat_token");
    localStorage.removeItem("blockseat_bstId");
    localStorage.removeItem("blockseat_wallet");
    navigate("/login");
  };

  const bstId = localStorage.getItem("blockseat_bstId");

  return (
    <header className="navbar">
      <div className="navbar-inner">
        {/* Brand Logo */}
        <button
          type="button"
          className="brand btn-ghost"
          onClick={handleBrandClick}
          title="Go to home"
        >
          <span className="brand-mark">B</span>
          <span className="brand-copy">
            <span className="brand-name">BlockSeat</span>
            <span className="brand-tag">
              NFT ticketing for live events
            </span>
          </span>
        </button>

        {/* Navigation Buttons */}
        <div className="nav-actions">
          {bstId && (
            <span className="bst-pill">
              BST ID <strong>{bstId}</strong>
            </span>
          )}

          {/* NEW: Browse Events Button */}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate("/events/Match-001")}
          >
            Browse Events
          </button>

          {/* Existing My Tickets Button */}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate("/my-tickets")}
          >
            My Tickets
          </button>

          {/* Sign Out Button */}
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSignOut}
          >
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
