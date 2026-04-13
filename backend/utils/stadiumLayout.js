const STADIUM_VENUE = "M. Chinnaswamy Stadium, Bengaluru";

const SECTION_DEFINITIONS = [
  {
    id: "west",
    section: "West",
    category: "Royal Lounge",
    rowPrefix: "W",
    rowCount: 3,
    seatsPerRow: 8,
    price: 12500,
    mapColor: "#df5aa3",
  },
  {
    id: "south",
    section: "South",
    category: "Pavilion Club",
    rowPrefix: "S",
    rowCount: 3,
    seatsPerRow: 8,
    price: 9000,
    mapColor: "#4fd08a",
  },
  {
    id: "north",
    section: "North",
    category: "Grand Terrace",
    rowPrefix: "N",
    rowCount: 3,
    seatsPerRow: 8,
    price: 5500,
    mapColor: "#7b95de",
  },
  {
    id: "east",
    section: "East",
    category: "Fan Zone",
    rowPrefix: "E",
    rowCount: 3,
    seatsPerRow: 8,
    price: 3500,
    mapColor: "#59d0d6",
  },
];

function buildSectionSeats(sectionConfig) {
  return Array.from({ length: sectionConfig.rowCount }, (_, rowIndex) => {
    const row = `${sectionConfig.rowPrefix}${rowIndex + 1}`;

    return Array.from({ length: sectionConfig.seatsPerRow }, (_, seatIndex) => ({
      seatId: `${row}-${seatIndex + 1}`,
      row,
      stand: sectionConfig.section,
      section: sectionConfig.section,
      category: sectionConfig.category,
      price: sectionConfig.price,
      isTaken: false,
      seatType: "normal",
    }));
  }).flat();
}

function buildStadiumSeats() {
  return SECTION_DEFINITIONS.flatMap(buildSectionSeats);
}

function buildSectionSummary(seats = []) {
  return SECTION_DEFINITIONS.map((definition) => {
    const sectionSeats = seats.filter((seat) => (seat.section || seat.stand) === definition.section);
    const availableSeats = sectionSeats.filter((seat) => !seat.isTaken).length;

    return {
      id: definition.id,
      section: definition.section,
      category: definition.category,
      price: definition.price,
      mapColor: definition.mapColor,
      totalSeats: sectionSeats.length,
      availableSeats,
    };
  });
}

module.exports = {
  STADIUM_VENUE,
  SECTION_DEFINITIONS,
  buildSectionSummary,
  buildStadiumSeats,
};
