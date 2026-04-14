import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import BrandLogo from "./BrandLogo";
import { signOut, useAuth } from "../services/auth";

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const { token, bstId } = useAuth();
  const hideNavbar = location.pathname === "/login";

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  const handleSignOut = () => {
    signOut();
    navigate("/login", { replace: true });
  };

  const isAuthed = Boolean(token);

  if (hideNavbar) return null;

  const navItems = [
    { label: "Home", path: "/" },
  ];

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <button type="button" className="brand btn-ghost" onClick={() => navigate("/")}>
          <span className="brand-mark">
            <BrandLogo />
          </span>
          <span className="brand-copy">
            <span className="brand-name">BlockSeat</span>
            <span className="brand-tag">Match Tickets</span>
          </span>
        </button>

        <button
          type="button"
          className={`mobile-menu-toggle ${mobileMenuOpen ? "active" : ""}`}
          onClick={() => setMobileMenuOpen((open) => !open)}
          aria-expanded={mobileMenuOpen}
          aria-label="Toggle navigation menu"
        >
          <span />
          <span />
          <span />
        </button>

        <div className={`nav-actions ${mobileMenuOpen ? "mobile-open" : ""}`}>
          <nav className="nav-links" aria-label="Primary">
            {navItems.map((item) => {
              const isActive = item.path === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.path);

              return (
                <button
                  key={item.path}
                  type="button"
                  className={`nav-link ${isActive ? "active" : ""}`}
                  onClick={() => {
                    navigate(item.path);
                    setMobileMenuOpen(false);
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {isAuthed ? (
            <button
              type="button"
              className="wallet-pill"
              onClick={() => {
                navigate("/my-tickets");
                setMobileMenuOpen(false);
              }}
            >
              My Tickets
            </button>
          ) : (
            <button
              type="button"
              className="wallet-pill"
              onClick={() => {
                navigate("/login");
                setMobileMenuOpen(false);
              }}
            >
              Sign In
            </button>
          )}

          <div className="profile-menu" ref={menuRef}>
            <button
              type="button"
              className="profile-trigger"
              onClick={() => setProfileOpen((open) => !open)}
              aria-expanded={profileOpen}
            >
              <span className="profile-trigger-label">Profile</span>
            </button>

            {profileOpen ? (
              <div className="profile-dropdown">
                <div className="profile-dropdown-copy">
                  <span className="profile-label">Account</span>
                  <strong>{isAuthed ? "Signed in" : "Guest"}</strong>
                  {isAuthed && bstId ? (
                    <span className="profile-bst">BST ID: {bstId}</span>
                  ) : null}
                </div>
                {isAuthed ? (
                  <button type="button" className="profile-dropdown-link" onClick={() => navigate("/my-tickets")}>
                    My Tickets
                  </button>
                ) : (
                  <button type="button" className="profile-dropdown-link" onClick={() => navigate("/login")}>
                    Sign In
                  </button>
                )}
                <button
                  type="button"
                  className="profile-dropdown-link danger"
                  onClick={isAuthed ? handleSignOut : () => navigate("/login")}
                >
                  {isAuthed ? "Sign Out" : "Sign In"}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
