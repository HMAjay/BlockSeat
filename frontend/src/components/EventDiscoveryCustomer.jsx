import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import {
  formatEventDate,
  formatEventDay,
  getEventSport,
  getEventStatus,
  getPriceSummary,
  getSeatsSummary,
  getTeamGradient,
  parseMatchup,
} from "../utils/eventPresentation";
import BrandLogo from "./BrandLogo";
import { useAuth } from "../services/auth";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "date", label: "By Date" },
  { id: "venue", label: "By Venue" },
  { id: "sport", label: "Sport" },
];

function TeamBadge({ code }) {
  return (
    <div className={`team-badge bg-gradient-to-br ${getTeamGradient(code)}`}>
      <span>{code}</span>
    </div>
  );
}

function EventDiscoveryCustomer({ compact = false }) {
  const [events, setEvents] = useState([]);
  const [message, setMessage] = useState("");
  const [filterMode, setFilterMode] = useState("all");
  const [filterValue, setFilterValue] = useState("all");
  const navigate = useNavigate();
  const { token } = useAuth();
  const isAuthed = Boolean(token);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const { data } = await api.get("/events");
        setEvents(data);
      } catch (error) {
        setMessage(error.response?.data?.message || "Failed to load events");
      }
    };

    loadEvents();
  }, []);

  const filterOptions = useMemo(() => {
    if (filterMode === "date") {
      return ["all", ...new Set(events.map((event) => formatEventDay(event.date)))];
    }
    if (filterMode === "venue") {
      return ["all", ...new Set(events.map((event) => event.venue))];
    }
    if (filterMode === "sport") {
      return ["all", ...new Set(events.map((event) => getEventSport(event.name)))];
    }
    return ["all"];
  }, [events, filterMode]);

  useEffect(() => {
    setFilterValue("all");
  }, [filterMode]);

  const filteredEvents = useMemo(() => {
    let nextEvents = [...events];

    if (filterMode === "date" && filterValue !== "all") {
      nextEvents = nextEvents.filter((event) => formatEventDay(event.date) === filterValue);
    }
    if (filterMode === "venue" && filterValue !== "all") {
      nextEvents = nextEvents.filter((event) => event.venue === filterValue);
    }
    if (filterMode === "sport" && filterValue !== "all") {
      nextEvents = nextEvents.filter((event) => getEventSport(event.name) === filterValue);
    }

    return compact ? nextEvents.slice(0, 3) : nextEvents;
  }, [compact, events, filterMode, filterValue]);

  return (
    <div className="stack">
      <section className="hero-banner">
        <div className="hero-overlay" />
        <div className="hero-content">
          <span className="live-badge">Live Matches</span>
          <h1 className="hero-title">Browse Events</h1>
          <p className="hero-subtitle">Choose a match and book seats.</p>
        </div>
      </section>

      <section className="events-panel">
        <div className="events-panel-header">
          <div>
            <h2 className="panel-title">Matchday bookings</h2>
            <p className="panel-copy">Discover live and upcoming fixtures, compare venues, and open the seat map to lock your tickets.</p>
          </div>
        </div>

        <div className="filter-toolbar">
          {FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              className={`filter-pill ${filterMode === filter.id ? "active" : ""}`}
              onClick={() => setFilterMode(filter.id)}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {filterOptions.length > 1 ? (
          <div className="filter-toolbar secondary">
            {filterOptions.map((option) => (
              <button
                key={option}
                type="button"
                className={`filter-pill subtle ${filterValue === option ? "active" : ""}`}
                onClick={() => setFilterValue(option)}
              >
                {option === "all" ? "All Options" : option}
              </button>
            ))}
          </div>
        ) : null}

        {message ? (
          <div className="alert error">{message}</div>
        ) : filteredEvents.length ? (
          <div className="event-grid">
            {filteredEvents.map((event) => {
              const matchup = parseMatchup(event.name);
              const status = getEventStatus(event.date);
              const availabilityTone = event.availableSeats <= 8 ? "warn" : "good";

              return (
                <article className="match-card" key={event.eventId}>
                  <div className="match-card-stripe" />
                  <div className="match-card-top">
                    <div className="match-identifiers">
                      <span className="match-id">{event.eventId}</span>
                      {status.isLive ? <span className="live-badge compact">Live</span> : null}
                    </div>
                    <span className="seats-badge">{getSeatsSummary(event)}</span>
                  </div>

                  <div className="matchup-row">
                    <div className="team-block">
                      <TeamBadge code={matchup.firstCode} />
                      <div>
                        <p className="team-name">{matchup.firstTeam}</p>
                        <p className="team-meta">{getEventSport(event.name)}</p>
                      </div>
                    </div>
                    <span className="versus-copy">VS</span>
                    <div className="team-block right">
                      <div>
                        <p className="team-name">{matchup.secondTeam}</p>
                        <p className="team-meta">{event.venue}</p>
                      </div>
                      <TeamBadge code={matchup.secondCode} />
                    </div>
                  </div>

                  <div className="match-meta-list">
                    <div className="meta-line">
                      <span>{formatEventDate(event.date)}</span>
                    </div>
                    <div className="meta-line">
                      <span>{event.venue}</span>
                    </div>
                    <div className="meta-line strong">
                      <span>{getPriceSummary(event)} · {getSeatsSummary(event)}</span>
                      <span className={`availability-dot ${availabilityTone}`} />
                    </div>
                  </div>

                  <div className="match-card-actions">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => navigate(isAuthed ? `/events/${event.eventId}` : "/login")}
                    >
                      {isAuthed ? "Book Now" : "Sign In to Book"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty-booking-state">
            <div className="empty-booking-icon">
              <BrandLogo alt="BlockSeat" />
            </div>
            <h3>No matches are live right now</h3>
            <p>Fresh fixtures will appear here as soon as the next booking window opens.</p>
          </div>
        )}
      </section>
    </div>
  );
}

export default EventDiscoveryCustomer;
