const INDIAN_CURRENCY = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const EVENT_DAY_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

const EVENT_TIME_FORMATTER = new Intl.DateTimeFormat("en-IN", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "Asia/Kolkata",
});

const TEAM_META = {
  "royal challengers bengaluru": {
    code: "RCB",
    primary: "#c9a44a",
    secondary: "#20170a",
    accent: "#f6df91",
  },
  "chennai super kings": {
    code: "CSK",
    primary: "#ffd447",
    secondary: "#1d3f92",
    accent: "#ff8a00",
  },
  "mumbai indians": {
    code: "MI",
    primary: "#2f7eff",
    secondary: "#0e2d74",
    accent: "#ffb448",
  },
  "kolkata knight riders": {
    code: "KKR",
    primary: "#6d48a8",
    secondary: "#25153d",
    accent: "#f1c861",
  },
};

const SECTION_META = {
  West: {
    id: "west",
    label: "West",
    category: "Royal Lounge",
    perks: ["Closest premium bowl view", "Fastest gate access"],
  },
  South: {
    id: "south",
    label: "South",
    category: "Pavilion Club",
    perks: ["Straight-on pitch angle", "Lively fan block"],
  },
  North: {
    id: "north",
    label: "North",
    category: "Grand Terrace",
    perks: ["Balanced sightline", "Family-friendly zone"],
  },
  East: {
    id: "east",
    label: "East",
    category: "Fan Zone",
    perks: ["Best value section", "High-energy supporters stand"],
  },
};

function encodeSvg(svg) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function createTeamLogo({ code, primary, secondary, accent }) {
  return encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" role="img" aria-label="${code}">
      <defs>
        <linearGradient id="shield" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${primary}" />
          <stop offset="100%" stop-color="${secondary}" />
        </linearGradient>
      </defs>
      <path d="M60 10 102 25v31c0 28-18 46-42 54C36 102 18 84 18 56V25Z" fill="url(#shield)" stroke="${accent}" stroke-width="4" />
      <circle cx="60" cy="42" r="16" fill="${accent}" fill-opacity="0.18" />
      <path d="M38 78c8-10 18-15 22-15s14 5 22 15" fill="none" stroke="${accent}" stroke-width="6" stroke-linecap="round" />
      <text x="60" y="53" text-anchor="middle" font-size="24" font-family="Arial, sans-serif" font-weight="700" fill="${accent}">${code}</text>
      <text x="60" y="96" text-anchor="middle" font-size="10" font-family="Arial, sans-serif" letter-spacing="2" fill="${accent}">${code}</text>
    </svg>
  `);
}

const TEAM_DETAILS = Object.fromEntries(
  Object.entries(TEAM_META).map(([name, details]) => [
    name,
    {
      ...details,
      logo: createTeamLogo(details),
    },
  ])
);

function getTeamShortName(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

export function parseMatchup(eventName) {
  const [homeTeamRaw, awayTeamRaw] = eventName.split(/\s+vs\.?\s+/i);
  const homeTeam = homeTeamRaw?.trim() || eventName.trim();
  const awayTeam = awayTeamRaw?.trim() || "Opponent";
  const homeMeta = TEAM_DETAILS[homeTeam.toLowerCase()] || null;
  const awayMeta = TEAM_DETAILS[awayTeam.toLowerCase()] || null;

  return {
    firstTeam: homeTeam,
    secondTeam: awayTeam,
    firstCode: homeMeta?.code || getTeamShortName(homeTeam),
    secondCode: awayMeta?.code || getTeamShortName(awayTeam),
    firstLogo: homeMeta?.logo || null,
    secondLogo: awayMeta?.logo || null,
  };
}

export function formatEventDate(date) {
  const parsed = new Date(date);
  return `${EVENT_DAY_FORMATTER.format(parsed)} ${EVENT_TIME_FORMATTER.format(parsed).toUpperCase()} IST`;
}

export function formatMatchDateStrip(date) {
  const parsed = new Date(date);
  return `${EVENT_DAY_FORMATTER.format(parsed)} ${EVENT_TIME_FORMATTER.format(parsed).toUpperCase()}`;
}

export function formatPrice(value) {
  return INDIAN_CURRENCY.format(Number(value) || 0);
}

export function getPriceSummary(event) {
  const minPrice = Number(event.minPrice ?? 0);
  const maxPrice = Number(event.maxPrice ?? minPrice);
  if (!minPrice && !maxPrice) return "";
  return minPrice === maxPrice
    ? formatPrice(minPrice)
    : `${formatPrice(minPrice)} - ${formatPrice(maxPrice)}`;
}

export function getEventStatus(date) {
  const eventTime = new Date(date).getTime();
  const now = Date.now();

  return {
    isLive: eventTime > now - (1000 * 60 * 60 * 4) && eventTime < now + (1000 * 60 * 60 * 2),
    isUpcoming: eventTime >= now,
  };
}

export function getSectionSummary(seats = [], sections = []) {
  if (sections.length) {
    return sections.map((section) => ({
      ...section,
      id: section.id || section.section.toLowerCase(),
      label: section.section,
      category: section.category || SECTION_META[section.section]?.category || "Matchday Section",
      perks: SECTION_META[section.section]?.perks || [],
    }));
  }

  const grouped = seats.reduce((accumulator, seat) => {
    const key = seat.section || seat.stand;
    if (!key) return accumulator;
    accumulator[key] = accumulator[key] || [];
    accumulator[key].push(seat);
    return accumulator;
  }, {});

  return Object.entries(grouped).map(([section, sectionSeats]) => ({
    id: section.toLowerCase(),
    label: section,
    section,
    category: sectionSeats[0]?.category || SECTION_META[section]?.category || "Matchday Section",
    price: Math.min(...sectionSeats.map((seat) => Number(seat.price) || 0)),
    totalSeats: sectionSeats.length,
    availableSeats: sectionSeats.filter((seat) => !seat.isTaken || seat.isMarketListed).length,
    perks: SECTION_META[section]?.perks || [],
  }));
}
