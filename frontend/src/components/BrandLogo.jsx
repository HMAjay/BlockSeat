import React from "react";
import brandLogo from "../assets/blockseat-logo.png";

function BrandLogo({ className = "", alt = "BlockSeat logo" }) {
  const classes = ["brand-logo-image", className].filter(Boolean).join(" ");
  return <img src={brandLogo} alt={alt} className={classes} />;
}

export default BrandLogo;
