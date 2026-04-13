const INDIAN_CURRENCY = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const EVENT_DAY_FORMATTER = new Intl.DateTimeFormat("en-IN", {
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

const TEAM_COLORS = {
  RCB: "from-[#E8001D] to-[#8a0010]",
  CSK: "from-[#FFD700] to-[#b88f00]",
  MI: "from-[#2b6dff] to-[#143a8f]",
  KKR: "from-[#6B2C91] to-[#2d1640]",
  SRH: "from-[#ff7a00] to-[#a74300]",
  RR: "from-[#ff5fa2] to-[#8f2958]",
  GT: "from-[#0d2b4d] to-[#12223d]",
  DC: "from-[#2479ff] to-[#003b8f]",
  PBKS: "from-[#d71920] to-[#781114]",
  LSG: "from-[#2dc2ff] to-[#00668a]",
};

const SPORT_KEYWORDS = {
  cricket: ["rcb", "csk", "mi", "kkr", "srh", "rr", "gt", "dc", "pbks", "lsg", "ipl", "match"],
  football: ["fc", "united", "city", "league"],
  concert: ["tour", "concert", "live show"],
};

function getTeamShortName(name) {
  const cleaned = name.replace(/[^a-zA-Z0-9 ]/g, " ").trim();
  const uppercaseWords = cleaned
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.toUpperCase());

  const prebuilt = uppercaseWords.find((word) => word.length >= 2 && word.length <= 4);
  if (prebuilt) return prebuilt;

  return uppercaseWords.slice(0, 3).map((part) => part[0]).join("").slice(0, 3) || "BST";
}

export function parseMatchup(eventName) {
  const [homeTeam, awayTeam] = eventName.split(/\s+vs\.?\s+/i);
  const firstTeam = homeTeam?.trim() || eventName;
  const secondTeam = awayTeam?.trim() || "Opponent";

  return {
    firstTeam,
    secondTeam,
    firstCode: getTeamShortName(firstTeam),
    secondCode: getTeamShortName(secondTeam),
  };
}

export function formatEventDate(date) {
  const parsed = new Date(date);
  return `${EVENT_DAY_FORMATTER.format(parsed)} · ${EVENT_TIME_FORMATTER.format(parsed).toUpperCase()} IST`;
}

export function formatEventDay(date) {
  return EVENT_DAY_FORMATTER.format(new Date(date));
}

export function formatPrice(value) {
  return INDIAN_CURRENCY.format(Number(value) || 0);
}

export function formatWalletAddress(value) {
  if (!value) return "Connect Wallet";
  if (value.length <= 12) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export function getEventSport(eventName = "") {
  const lowered = eventName.toLowerCase();
  const sport = Object.entries(SPORT_KEYWORDS).find(([, keywords]) =>
    keywords.some((keyword) => lowered.includes(keyword))
  );
  return sport ? sport[0][0].toUpperCase() + sport[0].slice(1) : "Live Event";
}

export function getEventStatus(date) {
  const eventTime = new Date(date).getTime();
  const now = Date.now();
  const diffHours = Math.abs(eventTime - now) / (1000 * 60 * 60);

  return {
    isLive: diffHours <= 4,
    isUpcoming: eventTime > now,
  };
}

export function getPriceSummary(event) {
  const minPrice = Number(event.minPrice ?? 0);
  const maxPrice = Number(event.maxPrice ?? minPrice);
  if (!minPrice && !maxPrice) return "";
  if (minPrice === maxPrice) return `From ${formatPrice(minPrice)}`;
  return `From ${formatPrice(minPrice)} to ${formatPrice(maxPrice)}`;
}

export function getSeatsSummary(event) {
  const seatsLeft = Number(event.availableSeats ?? 0);
  return `${seatsLeft} seat${seatsLeft === 1 ? "" : "s"} left`;
}

export function getTeamGradient(teamCode) {
  return TEAM_COLORS[teamCode] || "from-[#343434] to-[#161616]";
}

export function buildTierCards(seats = []) {
  if (!seats.length) return [];

  const sortedNormal = seats
    .filter((seat) => seat.seatType !== "yellow")
    .sort((left, right) => left.price - right.price);
  const vipSeats = seats.filter((seat) => seat.seatType === "yellow");

  const generalThreshold = sortedNormal[Math.max(0, Math.floor(sortedNormal.length / 3) - 1)]?.price
    ?? sortedNormal[sortedNormal.length - 1]?.price
    ?? vipSeats[0]?.price
    ?? 0;
  const premiumThreshold = sortedNormal[Math.max(0, Math.floor((sortedNormal.length * 2) / 3) - 1)]?.price
    ?? generalThreshold;

  const general = seats.filter((seat) => seat.seatType !== "yellow" && seat.price <= generalThreshold);
  const premium = seats.filter(
    (seat) => seat.seatType !== "yellow" && seat.price > generalThreshold && seat.price <= premiumThreshold
  );
  const vip = vipSeats.length
    ? vipSeats
    : seats.filter((seat) => seat.price > premiumThreshold);

  const tiers = [
    {
      id: "general",
      name: "General",
      seats: general,
      perks: ["Fast access lanes", "Standard entry", "Lower bowl availability"],
    },
    {
      id: "premium",
      name: "Premium",
      seats: premium,
      perks: ["Better sightlines", "Priority support", "Premium concourse access"],
    },
    {
      id: "vip",
      name: "VIP",
      seats: vip,
      perks: ["Best sightlines", "Hospitality-ready zone", "Exclusive premium rows"],
    },
  ].filter((tier) => tier.seats.length);

  const recommendedId = tiers[1]?.id || tiers[0]?.id;

  return tiers.map((tier) => {
    const prices = tier.seats.map((seat) => Number(seat.price));
    const minPrice = Math.min(...prices);
    const matic = (minPrice / 75).toFixed(3);

    return {
      ...tier,
      minPrice,
      matic,
      seatCount: tier.seats.filter((seat) => !seat.isTaken || seat.isMarketListed).length,
      recommended: tier.id === recommendedId,
    };
  });
}
