import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./ClassManagement.css";
import Sidebar from "../Sidebar";
import Footer from "../footer";
import { useAppContext } from "../../contextApi/AppContext";

const API_BASE_URL = "https://api.theecportal.com/api/classes";

function getToken() {
  return localStorage.getItem("token") || "";
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Generates a consistent gradient for a card header based on the class name


function getInitials(name = "") {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function extractErrorMessage(err, fallback) {
  return err?.response?.data?.message || err?.message || fallback || "Something went wrong";
}

function ClassManagement() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null); // { type, message }
  const [searchTerm, setSearchTerm] = useState("");

  // Add/Edit modal state
  const [showFormModal, setShowFormModal] = useState(false);
  const [formMode, setFormMode] = useState("add"); // 'add' | 'edit'
  const [formClassId, setFormClassId] = useState(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // {_id, name}
  const [deleting, setDeleting] = useState(false);

  const { classOptions, fetchClasses } = useAppContext();
  useEffect(() => {
   setClasses(classOptions);
  }, [classOptions]);



  useEffect(() => {
    if (!alert) return;
    const timer = setTimeout(() => setAlert(null), 4000);
    return () => clearTimeout(timer);
  }, [alert]);

  /* ============================================================
     API CALLS
     ============================================================ */


  const handleSave = async (e) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError("Class name is required.");
      return;
    }
    setFormError("");
    setSaving(true);

    const payload = { name: formName.trim(), description: formDescription.trim() };

    try {
      const res =
        formMode === "edit"
          ? await axios.put(`${API_BASE_URL}/updateClass/${formClassId}`, payload, {
              headers: authHeaders(),
            })
          : await axios.post(`${API_BASE_URL}/addClass`, payload, {
              headers: authHeaders(),
            });

      if (!res.data.success) {
        throw new Error(res.data.message || "Failed to save class");
      }

      setAlert({
        type: "success",
        message: formMode === "edit" ? "Class updated successfully" : "Class added successfully",
      });
      closeFormModal();
      fetchClasses();
    } catch (err) {
      setFormError(extractErrorMessage(err, "Failed to save class"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await axios.delete(`${API_BASE_URL}/deleteClass/${deleteTarget._id}`, {
        headers: authHeaders(),
      });
      if (!res.data.success) {
        throw new Error(res.data.message || "Failed to delete class");
      }
      setAlert({ type: "success", message: "Class deleted successfully" });
      setShowDeleteModal(false);
      setDeleteTarget(null);
      fetchClasses();
    } catch (err) {
      setAlert({ type: "error", message: extractErrorMessage(err, "Failed to delete class") });
    } finally {
      setDeleting(false);
    }
  };

  /* ============================================================
     MODAL HELPERS
     ============================================================ */
  const openAddModal = () => {
    setFormMode("add");
    setFormClassId(null);
    setFormName("");
    setFormDescription("");
    setFormError("");
    setShowFormModal(true);
  };

  const openEditModal = (cls) => {
    setFormMode("edit");
    setFormClassId(cls._id);
    setFormName(cls.name || "");
    setFormDescription(cls.description || "");
    setFormError("");
    setShowFormModal(true);
  };

  const closeFormModal = () => setShowFormModal(false);

  const openDeleteModal = (cls) => {
    setDeleteTarget(cls);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setDeleteTarget(null);
  };

  /* ============================================================
     DERIVED DATA
     ============================================================ */
  const filteredClasses = useMemo(() => {
    if (!searchTerm.trim()) return classes;
    const term = searchTerm.trim().toLowerCase();
    return classes.filter(
      (cls) =>
        cls.name?.toLowerCase().includes(term) || cls.description?.toLowerCase().includes(term)
    );
  }, [classes, searchTerm]);

  /* ============================================================
     RENDER
     ============================================================ */
  return (
   <Sidebar>
     <div className="cm-page">
      {/* Header */}
      <header className="cm-header">
        <div className="cm-header-inner">
          <div className="cm-header-text">
            <h1>Class Management</h1>
            <p>Create, update and organize all your classes in one place</p>
          </div>
          <button className="cm-btn cm-btn-primary" onClick={openAddModal}>
            <span className="cm-icon-plus">+</span> Add Class
          </button>
        </div>
      </header>

      <main className="cm-container">
        {/* Alert */}
        {alert && (
          <div className={`cm-alert cm-alert-${alert.type}`}>
            <span>{alert.message}</span>
            <button className="cm-alert-close" onClick={() => setAlert(null)}>
              &times;
            </button>
          </div>
        )}

        {/* Toolbar */}
        <div className="cm-toolbar">
          <div className="cm-search">
       
            <input
              type="text"
              placeholder="Search classes by name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="cm-count-badge">
            {filteredClasses.length} {filteredClasses.length === 1 ? "class" : "classes"}
          </div>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="cm-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div className="cm-skeleton-card" key={i}>
                <div className="cm-skeleton-header" />
                <div className="cm-skeleton-line cm-skeleton-line-lg" />
                <div className="cm-skeleton-line" />
                <div className="cm-skeleton-line cm-skeleton-line-sm" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredClasses.length === 0 && (
          <div className="cm-empty-state">
            <div className="cm-empty-icon"><i className="fas fa-book"></i></div>
            <h3>{searchTerm ? "No matching classes" : "No classes yet"}</h3>
            <p>
              {searchTerm ? "Try adjusting your search term." : 'Click "Add Class" to create your first class.'}
            </p>
          </div>
        )}

        {/* Cards grid: 4 per row on laptop, 2 per row on mobile */}
        {!loading && filteredClasses.length > 0 && (
          <div className="cm-grid">
            {filteredClasses.map((cls) => (
              <div className="cm-card" key={cls._id}>
                <div className="cm-card-header" style={{ background: "blue" }}>
                  <div className="cm-avatar">{getInitials(cls.name)}</div>
                </div>
                <div className="cm-card-body">
                  <h3 className="cm-class-name" title={cls.name}>
                    {cls.name}
                  </h3>
                  <p className="cm-class-description">
                    {cls.description ? cls.description : <span className="cm-no-desc">No description provided</span>}
                  </p>
                  <div className="cm-class-meta">
                    <span className="cm-meta-icon"><i className="fas fa-clock"></i></span> Updated {formatDate(cls.updatedAt)}
                  </div>
                </div>
                <div className="cm-card-actions">
                  <button className="cm-btn cm-btn-outline" onClick={() => openEditModal(cls)}>
                    <i className="fas fa-edit"></i> Edit
                  </button>
                  <button className="cm-btn cm-btn-outline cm-btn-danger" onClick={() => openDeleteModal(cls)}>
                    <i className="fas fa-trash"></i> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ===== Add/Edit Modal ===== */}
      {showFormModal && (
        <div className="cm-modal-overlay" onClick={closeFormModal}>
          <div className="cm-modal" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSave}>
              <div className="cm-modal-header">
                <h2>{formMode === "edit" ? "Edit Class" : "Add New Class"}</h2>
                <button type="button" className="cm-modal-close" onClick={closeFormModal} aria-label="Close">
                  &times;
                </button>
              </div>
              <div className="cm-modal-body">
                {formError && <div className="cm-form-error">{formError}</div>}

                <div className="cm-form-group">
                  <label>
                    Class Name <span className="cm-required">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Grade 10 - A"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="cm-form-group">
                  <label>Description</label>
                  <textarea
                    rows="4"
                    placeholder="Optional description"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                  />
                </div>
              </div>
              <div className="cm-modal-footer">
                <button type="button" className="cm-btn cm-btn-secondary" onClick={closeFormModal}>
                  Cancel
                </button>
                <button type="submit" className="cm-btn cm-btn-primary" disabled={saving}>
                  {saving ? "Saving..." : "Save Class"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== Delete Confirmation Modal ===== */}
      {showDeleteModal && (
        <div className="cm-modal-overlay" onClick={closeDeleteModal}>
          <div className="cm-modal cm-modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="cm-modal-header">
              <h2>Delete Class</h2>
              <button type="button" className="cm-modal-close" onClick={closeDeleteModal} aria-label="Close">
                &times;
              </button>
            </div>
            <div className="cm-modal-body">
              <p className="cm-delete-text">
                Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone.
              </p>
            </div>
            <div className="cm-modal-footer">
              <button type="button" className="cm-btn cm-btn-secondary" onClick={closeDeleteModal}>
                Cancel
              </button>
              <button type="button" className="cm-btn cm-btn-danger-solid" onClick={handleDelete} disabled={deleting}>
                {deleting ? "Deleting..." : "Delete Class"}
              </button>
            </div>
          </div>
        </div>
      )}
      <Footer/>
    </div>
   </Sidebar>
  );
}

export default ClassManagement;