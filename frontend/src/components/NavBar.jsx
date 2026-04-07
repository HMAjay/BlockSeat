import React from "react";
import { useNavigate, useLocation } from "react-router-dom";

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
    <div>
      <span>🎟 BlockSeat</span>
      <span>{bstId}</span>
      <button onClick={() => navigate("/my-tickets")}>My Tickets</button>
      <button onClick={handleSignOut}>Sign Out</button>
    </div>
  );
}

export default Navbar;