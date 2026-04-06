// App configures routes and protects authenticated pages.
import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/Login";
import EventSeatMap from "./pages/EventSeatMap";
import MyTickets from "./pages/MyTickets";
import QRDisplay from "./pages/QRDisplay";
import TransferTicket from "./pages/TransferTicket";
import GateScanner from "./pages/GateScanner";

function ProtectedRoute({ children }) {
  // JWT guard redirects unauthenticated users to login.
  const token = localStorage.getItem("blockseat_token");
  return token ? children : <Navigate to="/login" replace />;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
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
        path="/gate-scanner"
        element={
          <ProtectedRoute>
            <GateScanner />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;