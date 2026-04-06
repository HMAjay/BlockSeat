// SeatGrid renders a compact selectable, color-coded ticket map.
import React from "react";

const cellStyle = {
  width: 56,
  height: 40,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 8,
  border: "1px solid #d4d4d4",
  cursor: "pointer",
  fontWeight: 600
};

function SeatGrid({ seats, selectedSeatId, onSeatClick }) {
  return (
    <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(6, minmax(56px, 1fr))" }}>
      {seats.map((seat) => {
        const isSelected = seat.seatId === selectedSeatId;
        const background = seat.isTaken ? "#ef4444" : "#22c55e";
        return (
          <button
            key={seat.seatId}
            type="button"
            onClick={() => onSeatClick(seat)}
            disabled={seat.isTaken}
            style={{
              ...cellStyle,
              background,
              color: "white",
              outline: isSelected ? "3px solid #f59e0b" : "none",
              opacity: seat.isTaken ? 0.8 : 1
            }}
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
