import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import {
  formatMatchDateStrip,
  getEventStatus,
  getPriceSummary,
  parseMatchup,
} from "../utils/rcbPresentation";
import BrandLogo from "./BrandLogo";
import TeamLogo from "./TeamLogo";
import { useAuth } from "../services/auth";

function RcbEventFixtures({ compact = false }) {
  const [events, setEvents] = useState([]);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  const { token } = useAuth();

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const { data } = await api.get("/events");
        setEvents(data);
        setMessage("");
      } catch (error) {
        setMessage(error.response?.data?.message || "Failed to load events");
      }
    };

    loadEvents();

    const handleVisible = () => {
      if (document.visibilityState === "visible") {
        loadEvents();
      }
    };

    window.addEventListener("focus", loadEvents);
    document.addEventListener("visibilitychange", handleVisible);

    const retryTimer = window.setTimeout(() => {
      if (!events.length) {
        loadEvents();
      }
    }, 1500);

    return () => {
      window.removeEventListener("focus", loadEvents);
      document.removeEventListener("visibilitychange", handleVisible);
      window.clearTimeout(retryTimer);
    };
  }, []);

  const filteredEvents = useMemo(() => {
    const nextEvents = [...events].sort((left, right) => new Date(left.date) - new Date(right.date));
    return compact ? nextEvents.slice(0, 3) : nextEvents;
  }, [compact, events]);

  const handleOpenMatch = (eventId) => {
    if (token) {
      navigate(`/events/${eventId}`);
      return;
    }

    navigate("/login");
  };

  return (
    <div className="stack">
      <section className="hero-card fixture-hero">
        <span className="eyebrow">RCB Matches</span>
        <h1 className="title">Upcoming Matches</h1>
        <p className="subtitle">Select a match to view seats.</p>
      </section>

      <section className="events-panel">
        <div className="events-panel-header">
          <div>
            <h2 className="panel-title">Available Fixtures</h2>
            <p className="panel-copy">M. Chinnaswamy Stadium, Bengaluru</p>
          </div>
        </div>

        {message ? (
          <div className="alert error">{message}</div>
        ) : filteredEvents.length ? (
          <div className="fixture-list">
            {filteredEvents.map((event) => {
              const matchup = parseMatchup(event.name);
              const status = getEventStatus(event.date);
              const isSoldOut = Number(event.availableSeats || 0) === 0;

              return (
                <article className="fixture-card" key={event.eventId}>
                  <div className="fixture-card-date">{formatMatchDateStrip(event.date)}</div>
                  <div className="fixture-card-body">
                    <div className="fixture-matchup">
                      <div className="fixture-team">
                        <TeamLogo name={matchup.firstTeam} code={matchup.firstCode} logo={matchup.firstLogo} />
                        <p>{matchup.firstTeam}</p>
                      </div>

                      <span className="fixture-versus">VS</span>

                      <div className="fixture-team">
                        <TeamLogo name={matchup.secondTeam} code={matchup.secondCode} logo={matchup.secondLogo} />
                        <p>{matchup.secondTeam}</p>
                      </div>
                    </div>

                    <div className="fixture-actions">
                      {isSoldOut ? (
                        <div className="fixture-status sold-out">Sold Out</div>
                      ) : (
                        <>
                          <div className="fixture-price">{getPriceSummary(event)}</div>
                          <button
                            type="button"
                            className="btn btn-primary fixture-buy"
                            onClick={() => handleOpenMatch(event.eventId)}
                          >
                            {status.isLive ? "Open Seat Map" : "Buy Tickets"}
                          </button>
                        </>
                      )}
                    </div>
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
            <h3>Login to view the matches.</h3>
            <p>New home fixtures will appear here as soon as they are scheduled.</p>
          </div>
        )}
      </section>
    </div>
  );
}

export default RcbEventFixtures;
