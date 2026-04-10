// Admin page: small credential box and match scheduler using default Match-001 seat pattern.
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

function AdminSchedule() {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [eventId, setEventId] = useState("Match-003");
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [venue, setVenue] = useState("");
  const [message, setMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [createdEventId, setCreatedEventId] = useState("");
  const navigate = useNavigate();

  const adminToken = localStorage.getItem("blockseat_admin_token") || "";
  const isAuthed = Boolean(adminToken);

  const errorStyle = useMemo(() => {
    const lowered = message.toLowerCase();
    return lowered.includes("failed") || lowered.includes("invalid") || lowered.includes("missing") || lowered.includes("exists");
  }, [message]);

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
    localStorage.removeItem("blockseat_admin_token");
    setMessage("Admin signed out");
    setCreatedEventId("");
  };

  const scheduleMatch = async () => {
    try {
      if (!adminToken) return setMessage("Login as admin first");
      if (!eventId || !name || !date || !venue) {
        return setMessage("Fill event ID, match name, date, and venue");
      }

      setIsBusy(true);
      const { data } = await api.post(
        "/admin/matches",
        {
          eventId,
          name,
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
        <p className="subtitle">Create a new booking event with the same seat pattern and pricing layout as Match-001.</p>
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
              <p className="section-copy">On create, a full seat map is generated and appears in Browse Events.</p>
            </div>
            <button type="button" className="btn btn-secondary" onClick={logoutAdmin}>Logout</button>
          </div>

          <div className="form-grid">
            <input className="input" placeholder="Event ID (Match-003)" value={eventId} onChange={(e) => setEventId(e.target.value)} />
            <input className="input" placeholder="Match name (SRH vs KKR)" value={name} onChange={(e) => setName(e.target.value)} />
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
        </section>
      )}

      {message ? <div className={`alert ${errorStyle ? "error" : ""}`}>{message}</div> : null}
    </div>
  );
}

export default AdminSchedule;