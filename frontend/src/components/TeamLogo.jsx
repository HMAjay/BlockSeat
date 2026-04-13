import React from "react";

function TeamLogo({ name, code, logo }) {
  return (
    <div className="team-logo-shell" aria-label={name}>
      {logo ? <img src={logo} alt={name} className="team-logo-image" /> : <span>{code}</span>}
    </div>
  );
}

export default TeamLogo;
