import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  if (location.pathname === "/login") return null;

  const handleSignOut = () => {
    localStorage.removeItem("blockseat_token");
    localStorage.removeItem("blockseat_bstId");
    localStorage.removeItem("blockseat_wallet");
    navigate("/login");
  };

  const token = localStorage.getItem("blockseat_token");
  const bstId = localStorage.getItem("blockseat_bstId");
  const isAuthed = Boolean(localStorage.getItem("blockseat_token"));

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <button type="button" className="brand btn-ghost" onClick={() => navigate("/")}>
          <span className="brand-mark">B</span>
          <span className="brand-copy">
            <span className="brand-name">BlockSeat</span>
            <span className="brand-tag">NFT ticketing for live events</span>
          </span>
        </button>

        <div className="nav-actions">
          {bstId && (
            <span className="bst-pill">
              BST ID <strong>{bstId}</strong>
            </span>
          )}
          <button type="button" className="btn btn-secondary" onClick={() => navigate("/")}>
            Home
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate("/events")}>
            Browse Events
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate("/verify-owner")}>
            Verify Owner
          </button>
          {isAuthed && (
            <button type="button" className="btn btn-secondary" onClick={() => navigate("/admin")}>
              Admin
            </button>
          )}
          {isAuthed ? (
            <button type="button" className="btn btn-primary" onClick={handleSignOut}>
              Sign Out
            </button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={() => navigate("/login")}>
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
