// SeatGrid renders a compact selectable, color-coded ticket map.
import React from "react";

function SeatGrid({ seats, selectedSeatId, onSeatClick }) {
  return (
    <div className="seat-grid">
      {seats.map((seat) => {
        const isSelected = seat.seatId === selectedSeatId;
        return (
          <button
            key={seat.seatId}
            type="button"
            onClick={() => onSeatClick(seat)}
            disabled={seat.isTaken}
            className={`seat ${seat.isTaken ? "taken" : "available"} ${isSelected ? "selected" : ""}`}
            title={`${seat.row}${seat.seatId} - ${seat.isTaken ? "Taken" : "Available"}`}
          >
            {seat.seatId}
          </button>
        );
      })}
    </div>
  );
}

export default SeatGrid;
