// Lists live events from backend so newly seeded matches appear without UI code changes.
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

function EventsList() {
  const [events, setEvents] = useState([]);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

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

  return (
    <div className="stack">
      <section className="hero-card">
        <span className="eyebrow">Live matches</span>
        <h1 className="title">Browse events</h1>
        <p className="subtitle">Choose a match and book seats.</p>
      </section>

      <section className="section">
        <div className="section-header">
          <div>
            <h2 className="section-title">Available now</h2>
            <p className="section-copy">All live matches.</p>
          </div>
        </div>

        {message ? (
          <div className="alert error">{message}</div>
        ) : (
          <div className="stack">
            {events.length ? events.map((event) => (
              <article className="ticket-card" key={event.eventId}>
                <div className="ticket-topline">
                  <div className="ticket-meta">
                    <span className="status-badge good">Live</span>
                    <span className="ticket-id">{event.eventId}</span>
                  </div>
                  <span className="status-badge">{event.availableSeats}/{event.totalSeats} open</span>
                </div>

                <h3 className="section-title" style={{ marginTop: 14 }}>{event.name}</h3>
                <p className="section-copy">
                  {new Date(event.date).toLocaleString()} | {event.venue}
                </p>

                <div className="btn-row" style={{ marginTop: 14 }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => navigate(`/events/${event.eventId}`)}
                  >
                    Open Seat Map
                  </button>
                </div>
              </article>
            )) : <div className="empty-state">No events available yet.</div>}
          </div>
        )}
      </section>
    </div>
  );
}

export default EventsList;