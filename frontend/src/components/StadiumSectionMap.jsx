import React from "react";

const SECTION_PATHS = [
  { id: "north", label: "North", category: "Grand Terrace", priceLabel: "Rs 5,500", path: "M130 78 A120 120 0 0 1 270 78 L228 118 A72 72 0 0 0 172 118 Z", textX: 200, textY: 98 },
  { id: "east", label: "East", category: "Fan Zone", priceLabel: "Rs 3,500", path: "M282 90 A120 120 0 0 1 322 170 L274 180 A72 72 0 0 0 246 118 Z", textX: 280, textY: 148 },
  { id: "south", label: "South", category: "Pavilion Club", priceLabel: "Rs 9,000", path: "M270 282 A120 120 0 0 1 130 282 L172 242 A72 72 0 0 0 228 242 Z", textX: 200, textY: 260 },
  { id: "west", label: "Royal Lounge", category: "West", priceLabel: "Rs 12,500", path: "M78 170 A120 120 0 0 1 118 90 L154 118 A72 72 0 0 0 126 180 Z", textX: 118, textY: 150 },
];

function StadiumSectionMap({ activeSection, onSectionChange }) {
  return (
    <div className="stadium-map-card">
      <div className="stadium-map-header">
        <div>
          <span className="venue-label">Venue</span>
          <h2>M. Chinnaswamy Stadium, Bengaluru</h2>
        </div>
        <p>Choose a section on the bowl, then pick individual seats below.</p>
      </div>

      <svg viewBox="0 0 400 360" className="stadium-map" role="img" aria-label="Interactive stadium map">
        <ellipse cx="200" cy="180" rx="120" ry="120" fill="#f2f2f2" />
        <ellipse cx="200" cy="180" rx="72" ry="72" fill="#acd95c" />
        <rect x="193" y="157" width="14" height="46" rx="3" fill="#efcb72" transform="rotate(-12 200 180)" />

        {SECTION_PATHS.map((section) => {
          const isActive = activeSection === section.id;
          return (
            <g key={section.id}>
              <path
                d={section.path}
                className={`stadium-section ${section.id} ${isActive ? "active" : ""}`}
                onClick={() => onSectionChange(section.id)}
              />
              <text x={section.textX} y={section.textY} textAnchor="middle" className="stadium-section-text">
                <tspan x={section.textX} dy="0">{section.label}</tspan>
                <tspan x={section.textX} dy="16">{section.category}</tspan>
                <tspan x={section.textX} dy="16">{section.priceLabel}</tspan>
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default StadiumSectionMap;
