import React from "react";
import "./TopBar.css";

function TopBar() {
  return (
    <header className="tp-wrapper mb-4 ">
      <nav className="navbar tp-navbar px-3 px-md-4">
        <a
          className="navbar-brand tp-brand"
          href="#"
          style={{ color: "#198754" }}
        >
          <i className="fas fa-graduation-cap me-2"></i>
          EC Portal
        </a>

        <form className="tp-search-wrap" role="search">
          <i className="fas fa-magnifying-glass tp-search-icon"></i>
          <input
            className="form-control tp-search-input"
            type="search"
            placeholder="Search students, teachers, courses..."
            aria-label="Search students teachers courses"
          />
        </form>

        <div className="tp-actions">
          <button
            type="button"
            className="tp-icon-btn"
            aria-label="Notifications"
          >
            <i className="fas fa-bell"></i>
            <span className="tp-dot" aria-hidden="true"></span>
          </button>

          <button type="button" className="tp-icon-btn" aria-label="Profile">
            <i className="fas fa-user-circle"></i>
          </button>
        </div>
      </nav>
    </header>
  );
}

export default TopBar;
