// App configures routes and protects authenticated pages.
import React, { Suspense, lazy } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import Navbar from "./components/NavBar";
import ErrorBoundary from "./components/ErrorBoundary";
import { useAuth } from "./services/auth";

const Home = lazy(() => import("./pages/Home"));
const Login = lazy(() => import("./pages/Login"));
const AdminSchedule = lazy(() => import("./pages/AdminSchedule"));
const EventsList = lazy(() => import("./pages/EventsList"));
const EventSeatMap = lazy(() => import("./pages/RcbSeatMap"));
const MyTickets = lazy(() => import("./pages/MyTickets"));
const QRDisplay = lazy(() => import("./pages/QRDisplay"));
const TransferTicket = lazy(() => import("./pages/TransferTicket"));
const GateScanner = lazy(() => import("./pages/GateScanner"));
const VerifyOwner = lazy(() => import("./pages/VerifyOwner"));

function ProtectedRoute({ children }) {
  // JWT guard redirects unauthenticated users to login.
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}

function Footer() {
  const location = useLocation();
  const navigate = useNavigate();
  if (location.pathname === "/login") return null;

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <p>BlockSeat</p>
        <div className="site-footer-links">
          <button type="button" className="footer-link-button" onClick={() => navigate("/")}>Home</button>
        </div>
      </div>
    </footer>
  );
}

function RouteLoadingFallback() {
  return (
    <div className="events-panel">
      <div className="empty-state">Loading page...</div>
    </div>
  );
}

function App() {
  const location = useLocation();
  const { token } = useAuth();
  const isAuthed = Boolean(token);

  return (
    <div className="app-shell">
      <Navbar />
      <main className="app-main">
        <ErrorBoundary key={location.pathname}>
        <Suspense fallback={<RouteLoadingFallback />}>
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/verify-owner" element={<VerifyOwner />} />
            <Route path="/admin" element={<AdminSchedule />} />
            <Route path="/events" element={<EventsList />} />
            <Route path="/events/:id" element={<EventSeatMap />} />
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
            <Route path="*" element={<Navigate to={isAuthed ? "/" : "/login"} replace />} />
          </Routes>
        </Suspense>
        </ErrorBoundary>
      </main>
      <Footer />
    </div>
  );
}
export default App;
