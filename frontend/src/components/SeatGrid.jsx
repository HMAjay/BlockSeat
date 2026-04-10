// SeatGrid renders a compact selectable, color-coded ticket map.
import React from "react";

function SeatGrid({ seats, selectedSeatId, selectedSeatIds = [], onSeatClick }) {
  const selectedSet = new Set(selectedSeatIds);

  return (
    <div className="seat-grid">
      {seats.map((seat) => {
        const isSelected = selectedSet.has(seat.seatId) || seat.seatId === selectedSeatId;
        const isListed = Boolean(seat.isMarketListed);
        const isDisabled = seat.isTaken && !isListed;
        const seatClass = isListed ? "listed" : seat.isTaken ? "taken" : "available";
        return (
          <button
            key={seat.seatId}
            type="button"
            onClick={() => onSeatClick(seat)}
            disabled={isDisabled}
            className={`seat ${seatClass} ${isSelected ? "selected" : ""}`}
            title={`${seat.row}${seat.seatId} - ${isListed ? "Listed" : seat.isTaken ? "Taken" : "Available"}`}
          >
            {seat.seatId}
          </button>
        );
      })}
    </div>
  );
}

export default SeatGrid;
