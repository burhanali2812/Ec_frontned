import React, { useEffect, useState, useCallback, useMemo } from "react";
import "./Notifications.css";
import Sidebar from "../Sidebar";
import { useAppContext } from "../../contextApi/AppContext";

const API_BASE = "https://api.theecportal.com/api";

const TYPE_LABEL = {
  Announcement: "Announcement",
  Result: "Result",
  Fee: "Fee",
  General: "General",
  Attendance: "Attendance",
  Leave: "Leave",
};

function authHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function Notifications() {

  const [loading, setLoading] = useState(true);

  const [filter, setFilter] = useState("all"); // all | unread
  const [markingAll, setMarkingAll] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const { notifications, setNotifications, error, setError, fetchNotifications } = useAppContext();




  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  const visible = useMemo(
    () => (filter === "unread" ? notifications.filter((n) => !n.isRead) : notifications),
    [notifications, filter]
  );

  const markAsRead = async (id) => {
    setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
    try {
      await fetch(`${API_BASE}/notifications/${id}/read`, {
        method: "PATCH",
        headers: authHeaders(),
      });
    } catch {
      // Revert on failure
      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: false } : n)));
    }
  };

  const markAllAsRead = async () => {
    if (unreadCount === 0) return;
    setMarkingAll(true);
    const prevState = notifications;
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await fetch(`${API_BASE}/notifications/read-all`, {
        method: "PATCH",
        headers: authHeaders(),
      });
    } catch {
      setNotifications(prevState);
    } finally {
      setMarkingAll(false);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation(); // don't trigger the card's mark-as-read click

    const confirmed = window.confirm("Delete this notification?");
    if (!confirmed) return;

    const prevState = notifications;
    setDeletingId(id);
    setNotifications((prev) => prev.filter((n) => n._id !== id));

    try {
      const res = await fetch(`${API_BASE}/notifications/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Delete failed.");
    } catch {
      setNotifications(prevState); // revert on failure
    } finally {
      setDeletingId(null);
    }
  };

  return (
  <Sidebar>
      <div className="ntf-page">
      <header className="ntf-header">
        <div>
          <h1 className="ntf-title">Notifications</h1>
          <p className="ntf-subtitle">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}` : "You're all caught up"}
          </p>
        </div>
        <button
          className="ntf-btn ntf-btn-ghost"
          onClick={markAllAsRead}
          disabled={unreadCount === 0 || markingAll}
        >
          {markingAll ? "Marking…" : "Mark all as read"}
        </button>
      </header>

      <div className="ntf-tabs">
        <button
          className={`ntf-tab ${filter === "all" ? "is-active" : ""}`}
          onClick={() => setFilter("all")}
        >
          All
        </button>
        <button
          className={`ntf-tab ${filter === "unread" ? "is-active" : ""}`}
          onClick={() => setFilter("unread")}
        >
          Unread {unreadCount > 0 && <span className="ntf-tab-badge">{unreadCount}</span>}
        </button>
      </div>

      { error ? (
        <div className="ntf-state ntf-state-error">
          <p>{error}</p>
          <button className="ntf-btn ntf-btn-ghost" onClick={fetchNotifications}>
            Try again
          </button>
        </div>
      ) : visible.length === 0 ? (
        <div className="ntf-state">
          <div className="ntf-empty-pin" />
          <p className="ntf-empty-title">
            {filter === "unread" ? "No unread notifications." : "Nothing here yet."}
          </p>
          <p className="ntf-empty-sub">
            {filter === "unread"
              ? "New notifications will show up here."
              : "Announcements and updates will appear here when they're posted."}
          </p>
        </div>
      ) : (
        <ul className="ntf-list">
          {visible.map((n) => (
            <li
              key={n._id}
              className={`ntf-card ${!n.isRead ? "is-unread" : ""} ${deletingId === n._id ? "is-deleting" : ""}`}
              onClick={() => !n.isRead && markAsRead(n._id)}
            >
              <div className="ntf-card-top">
                <span className={`ntf-type ntf-type-${n.type}`}>{TYPE_LABEL[n.type] || n.type}</span>
                <div className="ntf-card-top-right">
                  <span className="ntf-date">{formatDate(n.createdAt)}</span>
                  <button
                    className="ntf-delete-btn"
                    onClick={(e) => handleDelete(e, n._id)}
                    disabled={deletingId === n._id}
                    aria-label={`Delete notification: ${n.title}`}
                    title="Delete"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m3 0-1 13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 7h14Z"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              </div>
              <h3 className="ntf-card-title">
                {!n.isRead && <span className="ntf-dot" aria-hidden="true" />}
                {n.title}
              </h3>
              <p className="ntf-card-message">{n.message}</p>
              {!n.isRead && <span className="ntf-mark-hint">Tap to mark as read</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  </Sidebar>
  );
}

export default Notifications;