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

  const bstId = localStorage.getItem("blockseat_bstId");

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <button type="button" className="brand btn-ghost" onClick={() => navigate("/my-tickets")}>
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
          <button type="button" className="btn btn-secondary" onClick={() => navigate("/my-tickets")}>
            My Tickets
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSignOut}>
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
