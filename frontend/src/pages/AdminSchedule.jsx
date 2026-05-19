import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

function AdminSchedule() {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [eventId, setEventId] = useState("Match-003");
  const [opponent, setOpponent] = useState("Mumbai Indians");
  const [date, setDate] = useState("");
  const [venue, setVenue] = useState("M. Chinnaswamy Stadium, Bengaluru");
  const [message, setMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [createdEventId, setCreatedEventId] = useState("");
  const [templateSections, setTemplateSections] = useState([]);
  const navigate = useNavigate();

  const adminToken = localStorage.getItem("blockseat_admin_token") || "";
  const isAuthed = Boolean(adminToken);

  const errorStyle = useMemo(() => {
    const lowered = message.toLowerCase();
    return lowered.includes("failed") || lowered.includes("invalid") || lowered.includes("missing") || lowered.includes("exists");
  }, [message]);

  useEffect(() => {
    const loadTemplate = async () => {
      if (!adminToken) return;

      try {
        const { data } = await api.get("/admin/match-template", {
          headers: { Authorization: `Bearer ${adminToken}` },
        });
        setVenue(data.venue);
        setTemplateSections(data.sections || []);
      } catch (error) {
        setMessage(error.response?.data?.message || "Failed to load admin template");
      }
    };

    loadTemplate();
  }, [adminToken]);

  const loginAdmin = async () => {
    try {
      setIsBusy(true);
      const { data } = await api.post("/admin/login", { userId, password });
      localStorage.setItem("blockseat_admin_token", data.token);
      setMessage("Admin login successful");
    } catch (error) {
      setMessage(error.response?.data?.message || "Admin login failed");
    } finally {
      setIsBusy(false);
    }
  };

  const logoutAdmin = () => {
    const confirmed = window.confirm("Are you sure you want to sign out?");
    if (confirmed) {
      localStorage.removeItem("blockseat_admin_token");
      setMessage("Admin signed out");
      setCreatedEventId("");
    }
  };

  const scheduleMatch = async () => {
    try {
      if (!adminToken) return setMessage("Login as admin first");
      if (!eventId || !opponent || !date || !venue) {
        return setMessage("Fill event ID, opponent, date, and venue");
      }

      setIsBusy(true);
      const { data } = await api.post(
        "/admin/matches",
        {
          eventId,
          opponent,
          date: new Date(date).toISOString(),
          venue,
        },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      setCreatedEventId(data.eventId);
      setMessage(`Scheduled ${data.eventId} successfully`);
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to schedule match");
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="stack">
      <section className="hero-card">
        <span className="eyebrow">Admin console</span>
        <h1 className="title">Schedule new match</h1>
        <p className="subtitle">Create a new RCB home fixture. Every match keeps the same East, West, North, and South stadium structure automatically.</p>
      </section>

      {!isAuthed ? (
        <section className="section" style={{ maxWidth: 380, alignSelf: "flex-end" }}>
          <div className="section-header">
            <div>
              <h2 className="section-title">Admin login</h2>
              <p className="section-copy">Use your admin user ID and password.</p>
            </div>
          </div>
          <div className="form-grid">
            <input className="input" placeholder="User ID" value={userId} onChange={(e) => setUserId(e.target.value)} />
            <input className="input" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="button" className="btn btn-primary" onClick={loginAdmin} disabled={isBusy}>
              {isBusy ? "Signing in..." : "Login"}
            </button>
          </div>
        </section>
      ) : (
        <section className="section">
          <div className="section-header">
            <div>
              <h2 className="section-title">Schedule new match</h2>
              <p className="section-copy">On create, the new match appears in the RCB fixtures list and gets the same 4-section clickable stadium map.</p>
            </div>
            <button type="button" className="btn btn-secondary" onClick={logoutAdmin}>Logout</button>
          </div>

          <div className="form-grid">
            <input className="input" placeholder="Event ID (Match-003)" value={eventId} onChange={(e) => setEventId(e.target.value)} />
            <input className="input" placeholder="Opponent (Mumbai Indians)" value={opponent} onChange={(e) => setOpponent(e.target.value)} />
            <input className="input" type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
            <input className="input" placeholder="Venue" value={venue} onChange={(e) => setVenue(e.target.value)} />
            <button type="button" className="btn btn-primary" onClick={scheduleMatch} disabled={isBusy}>
              {isBusy ? "Scheduling..." : "Schedule New Match"}
            </button>
            {createdEventId ? (
              <button type="button" className="btn btn-secondary" onClick={() => navigate(`/events/${createdEventId}`)}>
                Open Booking Form
              </button>
            ) : null}
          </div>

          {templateSections.length ? (
            <div className="admin-section-preview">
              {templateSections.map((section) => (
                <div key={section.id} className="admin-section-chip">
                  <strong>{section.section}</strong>
                  <span>{section.category}</span>
                  <span>{section.availableSeats} seats · Rs {section.price}</span>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      )}

      {message ? <div className={`alert ${errorStyle ? "error" : ""}`}>{message}</div> : null}
    </div>
  );
}

export default AdminSchedule;
