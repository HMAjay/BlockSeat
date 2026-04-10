// App configures routes and protects authenticated pages.
import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import AdminSchedule from "./pages/AdminSchedule";
import EventsList from "./pages/EventsList";
import EventSeatMap from "./pages/EventSeatMap";
import MyTickets from "./pages/MyTickets";
import QRDisplay from "./pages/QRDisplay";
import TransferTicket from "./pages/TransferTicket";
import GateScanner from "./pages/GateScanner";
import VerifyTicket from "./pages/VerifyTicket";
import Navbar from "./components/Navbar";
import ErrorBoundary from "./components/ErrorBoundary";

function ProtectedRoute({ children }) {
  // JWT guard redirects unauthenticated users to login.
  const token = localStorage.getItem("blockseat_token");
  return token ? children : <Navigate to="/login" replace />;
}

function App() {
  const isAuthed = Boolean(localStorage.getItem("blockseat_token"));

  return (
    <div className="app-shell">
      <Navbar />
      <main className="app-main">
        <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<AdminSchedule />} />
          <Route
            path="/events"
            element={
              <ProtectedRoute>
                <EventsList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/events/:id"
            element={
              <ProtectedRoute>
                <EventSeatMap />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-tickets"
            element={
              <ProtectedRoute>
                <MyTickets />
              </ProtectedRoute>
            }
          />
          <Route
            path="/qr/:tokenId"
            element={
              <ProtectedRoute>
                <QRDisplay />
              </ProtectedRoute>
            }
          />
          <Route
            path="/transfer/:tokenId"
            element={
              <ProtectedRoute>
                <TransferTicket />
              </ProtectedRoute>
            }
          />
          <Route
            path="/verify/:tokenId"
            element={
              <ProtectedRoute>
                <VerifyTicket />
              </ProtectedRoute>
            }
          />
          <Route
            path="/gate-scanner"
            element={
              <ProtectedRoute>
                <GateScanner />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to={isAuthed ? "/" : "/login"} replace />} />
        </Routes>
        </ErrorBoundary>
      </main>
    </div>
  );
}
export default App;
