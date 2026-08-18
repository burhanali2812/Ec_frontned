import React, { useEffect, useState, useCallback } from "react";
import "./CreateAnnouncement.css";
import Sidebar from "../Sidebar";

// Adjust this to wherever your app centralizes the API base URL.
const API_BASE = "https://ec-backend-phi.vercel.app/api";

const AUDIENCE_LABEL = {
  students: "Students",
  teachers: "Teachers",
  both: "Everyone",
};

const TYPE_LABEL = {
  Announcement: "Announcement",
  Holiday: "Holiday",
};

const EMPTY_FORM = {
  title: "",
  message: "",
  target: "both",
  type: "Announcement",
  dateFrom: "",
  dateTo: "",
};

function authHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateRange(date) {
  if (!date || !date.from || !date.to) return null;
  return `${formatDate(date.from)} – ${formatDate(date.to)}`;
}

function CreateAnnouncement() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [toast, setToast] = useState(null);

  const showToast = (text, tone = "success") => {
    setToast({ text, tone });
    setTimeout(() => setToast(null), 3200);
  };

  const fetchAnnouncements = useCallback(async (searchTerm) => {
    setLoading(true);
    setLoadError("");
    try {
      const qs = searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : "";
      const res = await fetch(`${API_BASE}/notifications/admin${qs}`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Failed to load announcements.");
      setAnnouncements(data.announcements);
    } catch (err) {
      setLoadError(err.message || "Something went wrong while loading announcements.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const id = setTimeout(() => {
      fetchAnnouncements(search);
    }, 350);
    return () => clearTimeout(id);
  }, [search, fetchAnnouncements]);

  const openCreateModal = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingId(item.id);
    setForm({
      title: item.title,
      message: item.message,
      target: item.target,
      type: item.type,
      dateFrom: item.date?.from ? item.date.from.slice(0, 10) : "",
      dateTo: item.date?.to ? item.date.to.slice(0, 10) : "",
    });
    setFormError("");
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.title.trim() || !form.message.trim()) {
      setFormError("Title and message can't be empty.");
      return;
    }

    if (form.type === "Holiday") {
      if (!form.dateFrom || !form.dateTo) {
        setFormError("Start and end dates are required for a holiday.");
        return;
      }
      if (form.dateTo < form.dateFrom) {
        setFormError("End date can't be before the start date.");
        return;
      }
    }

    setSaving(true);
    setFormError("");

    try {
      const isEdit = Boolean(editingId);
      const url = isEdit
        ? `${API_BASE}/notifications/admin/${editingId}`
        : `${API_BASE}/notifications`;

      const payload = {
        title: form.title,
        message: form.message,
        target: form.target,
        type: form.type,
        ...(form.type === "Holiday"
          ? { date: { from: form.dateFrom, to: form.dateTo } }
          : {}),
      };

      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!data.success) throw new Error(data.message || "Something went wrong.");

      showToast(isEdit ? "Notification updated." : "Notification created.");
      setModalOpen(false);
      fetchAnnouncements(search);
    } catch (err) {
      setFormError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/notifications/admin/${deleteTarget.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Delete failed.");

      setAnnouncements((prev) => prev.filter((a) => a.id !== deleteTarget.id));
      showToast("Notification deleted.");
      setDeleteTarget(null);
    } catch (err) {
      showToast(err.message || "Couldn't delete notification.", "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
  <Sidebar>
      <div className="ann-page">
      <header className="ann-header">
        <div>
          <h1 className="ann-title">Announcements</h1>
          <p className="ann-subtitle">Post updates or declare holidays for students, teachers, or everyone.</p>
        </div>
        <button className="ann-btn ann-btn-primary" onClick={openCreateModal}>
          <span className="ann-btn-icon">+</span>
          Create notification
        </button>
      </header>

      <div className="ann-toolbar">
        <div className="ann-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <line x1="16.6" y1="16.6" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Search by title…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search notifications"
          />
        </div>
        <span className="ann-count">
          {loading ? "Loading…" : `${announcements.length} item${announcements.length === 1 ? "" : "s"}`}
        </span>
      </div>

      <div className="ann-card">
        {loading ? (
          <div className="ann-state">
            <div className="ann-spinner" />
            <p>Loading…</p>
          </div>
        ) : loadError ? (
          <div className="ann-state ann-state-error">
            <p>{loadError}</p>
            <button className="ann-btn ann-btn-ghost" onClick={() => fetchAnnouncements(search)}>
              Try again
            </button>
          </div>
        ) : announcements.length === 0 ? (
          <div className="ann-state">
            <div className="ann-empty-pin" />
            <p className="ann-empty-title">
              {search ? "Nothing matches your search." : "No announcements or holidays yet."}
            </p>
            <p className="ann-empty-sub">
              {search ? "Try a different title." : "Create your first notification to notify students and teachers."}
            </p>
            {!search && (
              <button className="ann-btn ann-btn-primary" onClick={openCreateModal}>
                Create notification
              </button>
            )}
          </div>
        ) : (
          <table className="ann-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Message</th>
                <th>Type</th>
                <th>Audience</th>
                <th>Created</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {announcements.map((item) => (
                <tr key={item.id} className={`ann-row ann-row-${item.target}`}>
                  <td data-label="Title">
                    <span className="ann-row-title">{item.title}</span>
                    {item.type === "Holiday" && formatDateRange(item.date) && (
                      <span className="ann-row-daterange">{formatDateRange(item.date)}</span>
                    )}
                  </td>
                  <td data-label="Message">
                    <span className="ann-row-message">{item.message}</span>
                  </td>
                  <td data-label="Type">
                    <span className={`ann-type-pill ann-type-${item.type}`}>{TYPE_LABEL[item.type] || item.type}</span>
                  </td>
                  <td data-label="Audience">
                    <span className={`ann-pill ann-pill-${item.target}`}>
                      <span className="ann-pill-dot" />
                      {AUDIENCE_LABEL[item.target]}
                    </span>
                  </td>
                  <td data-label="Created">{formatDate(item.createdAt)}</td>
                  <td data-label="Actions" className="ann-actions">
                    <button className="ann-icon-btn" onClick={() => openEditModal(item)} aria-label={`Edit ${item.title}`}>
                      Edit
                    </button>
                    <button
                      className="ann-icon-btn ann-icon-btn-danger"
                      onClick={() => setDeleteTarget(item)}
                      aria-label={`Delete ${item.title}`}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && (
        <div className="ann-overlay" onMouseDown={closeModal}>
          <div className="ann-modal" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="ann-modal-header">
              <h2>{editingId ? "Edit notification" : "Create notification"}</h2>
              <button className="ann-close" onClick={closeModal} aria-label="Close">
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="ann-form">
              <div className="ann-field">
                <span>Type</span>
                <div className="ann-target-group">
                  {["Announcement", "Holiday"].map((opt) => (
                    <label
                      key={opt}
                      className={`ann-target-option ann-type-option-${opt} ${form.type === opt ? "is-active" : ""}`}
                    >
                      <input
                        type="radio"
                        name="type"
                        value={opt}
                        checked={form.type === opt}
                        onChange={(e) => setForm({ ...form, type: e.target.value })}
                      />
                      {TYPE_LABEL[opt]}
                    </label>
                  ))}
                </div>
              </div>

              <label className="ann-field">
                <span>Title</span>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder={
                    form.type === "Holiday"
                      ? "e.g. Eid Holidays"
                      : "e.g. Mid-term exam schedule released"
                  }
                  maxLength={120}
                  autoFocus
                />
              </label>

              <label className="ann-field">
                <span>Message</span>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder={
                    form.type === "Holiday"
                      ? "e.g. The institute will remain closed during this period."
                      : "Write the announcement details…"
                  }
                  rows={5}
                />
              </label>

              {form.type === "Holiday" && (
                <div className="ann-field">
                  <span>Holiday dates</span>
                  <div className="ann-date-range">
                    <input
                      type="date"
                      value={form.dateFrom}
                      onChange={(e) => setForm({ ...form, dateFrom: e.target.value })}
                    />
                    <span className="ann-date-range-sep">to</span>
                    <input
                      type="date"
                      value={form.dateTo}
                      min={form.dateFrom || undefined}
                      onChange={(e) => setForm({ ...form, dateTo: e.target.value })}
                    />
                  </div>
                  <span className="ann-field-hint">
                    Attendance will be blocked for teachers on these dates.
                  </span>
                </div>
              )}

              <div className="ann-field">
                <span>Audience</span>
                <div className="ann-target-group">
                  {["students", "teachers", "both"].map((opt) => (
                    <label key={opt} className={`ann-target-option ann-target-${opt} ${form.target === opt ? "is-active" : ""}`}>
                      <input
                        type="radio"
                        name="target"
                        value={opt}
                        checked={form.target === opt}
                        onChange={(e) => setForm({ ...form, target: e.target.value })}
                      />
                      {AUDIENCE_LABEL[opt]}
                    </label>
                  ))}
                </div>
              </div>

              {formError && <p className="ann-form-error">{formError}</p>}

              <div className="ann-modal-actions">
                <button type="button" className="ann-btn ann-btn-ghost" onClick={closeModal} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="ann-btn ann-btn-primary" disabled={saving}>
                  {saving ? "Saving…" : editingId ? "Save changes" : "Create notification"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="ann-overlay" onMouseDown={() => !deleting && setDeleteTarget(null)}>
          <div className="ann-modal ann-modal-small" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="ann-modal-header">
              <h2>Delete {deleteTarget.type === "Holiday" ? "holiday" : "announcement"}?</h2>
            </div>
            <p className="ann-confirm-text">
              This removes "<strong>{deleteTarget.title}</strong>" for all {deleteTarget.recipientCount} recipient
              {deleteTarget.recipientCount === 1 ? "" : "s"}.
              {deleteTarget.type === "Holiday" && " Attendance will no longer be blocked for these dates."} This can't be undone.
            </p>
            <div className="ann-modal-actions">
              <button className="ann-btn ann-btn-ghost" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                Cancel
              </button>
              <button className="ann-btn ann-btn-danger" onClick={confirmDelete} disabled={deleting}>
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`ann-toast ann-toast-${toast.tone}`}>{toast.text}</div>}
    </div>
  </Sidebar>
  );
}

export default CreateAnnouncement;