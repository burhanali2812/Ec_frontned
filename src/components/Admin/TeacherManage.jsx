import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Toaster, toast } from "react-hot-toast";
import Sidebar from "../Sidebar";
import TopBar from "../TopBar";
import logo from "./../../images/logo.png";
import "./TeacherManage.css";

function TeacherManage({ adminLoginType }) {
  const [teachers, setTeachers] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingTeacherId, setEditingTeacherId] = useState("");
  const [institutionType, setInstitutionType] = useState(adminLoginType);

  const [formData, setFormData] = useState({
    name: "",
    contact: "",
    email: "",
    cnic: "",
    address: "",
    salary: "",
  });

  const API_BASE = "https://ec-backend-phi.vercel.app/api/teacher";

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const getErrorMessage = (error, fallback) => {
    const backendMessage = error?.response?.data?.message;
    if (backendMessage && backendMessage !== "Server error")
      return backendMessage;

    const raw = String(
      error?.response?.data?.error || error?.message || "",
    ).toLowerCase();
    if (raw.includes("duplicate") || raw.includes("e11000")) {
      return "Teacher already exists with this email, contact, or CNIC.";
    }
    if (error?.response?.status === 401 || error?.response?.status === 403) {
      return "You are not authorized. Please login again.";
    }
    return fallback;
  };

  const fetchTeachers = async () => {
    setLoadingTeachers(true);
    console.log("Fetching teachers with institutionType:", institutionType);
    try {
      const res = await axios.get(`${API_BASE}/getAllTeachers`, {
        params: { institutionType },
        headers: getAuthHeaders(),
      });

      if (res.data?.success) {
        setTeachers(res.data.teachers || []);
      } else {
        toast.error(res.data?.message || "Failed to load teachers");
      }
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Unable to load teachers. Please refresh."),
      );
    } finally {
      setLoadingTeachers(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const filteredTeachers = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return teachers;

    return teachers.filter((teacher) =>
      [
        teacher.name,
        teacher.contact,
        teacher.email,
        teacher.cnic,
        teacher.address,
        teacher.salary,
      ]
        .filter(Boolean)
        .some((val) => String(val).toLowerCase().includes(q)),
    );
  }, [teachers, searchText]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      name: "",
      contact: "",
      email: "",
      cnic: "",
      address: "",
      salary: "",
    });
    setEditingTeacherId("");
    setIsEditMode(false);
  };

  const validateForm = () => {
    const { name, contact, email, cnic, address, salary } = formData;

    if (!name.trim()) {
      toast.error("Name is required");
      return false;
    }
    if (name.trim().length < 3) {
      toast.error("Name must be at least 3 characters");
      return false;
    }
    if (!/^\d{10,15}$/.test(contact.trim())) {
      toast.error("Contact must be 10 to 15 digits");
      return false;
    }
    if (!/^[^\s@]+@[^^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error("Please enter a valid email address");
      return false;
    }
    if (!/^\d{13}$|^\d{5}-\d{7}-\d$/.test(cnic.trim())) {
      toast.error("CNIC must be 13 digits");
      return false;
    }
    if (!address.trim() || address.trim().length < 5) {
      toast.error("Address must be at least 5 characters");
      return false;
    }
    if (!salary.trim() || isNaN(salary.trim()) || Number(salary.trim()) <= 0) {
      toast.error("Salary must be a valid positive number");
      return false;
    }
    return true;
  };

  const handleEdit = (teacher) => {
    setIsEditMode(true);
    setEditingTeacherId(teacher._id || teacher.id);
    setFormData({
      name: teacher.name || "",
      contact: teacher.contact || "",
      email: teacher.email || "",
      cnic: teacher.cnic || "",
      address: teacher.address || "",
      salary: teacher.salary || "",
    });
    setShowModal(true);
  };

  const handleDelete = async (teacher) => {
    const ok = window.confirm(`Delete ${teacher.name}?`);
    if (!ok) return false;

    setDeleteLoading(teacher._id || teacher.id);
    try {
      const teacherId = teacher._id || teacher.id;
      const res = await axios.delete(`${API_BASE}/deleteTeacher/${teacherId}`, {
        headers: getAuthHeaders(),
      });

      if (res.data?.success) {
        toast.success("Teacher deleted successfully");
        setDeleteLoading(null);
        //quickly delete from UI without refetching
        setTeachers((prev) =>
          prev.filter((t) => String(t._id || t.id) !== String(teacherId)),
        );
        return true;
      } else {
        toast.error(res.data?.message || "Failed to delete teacher");
        setDeleteLoading(null);
        return false;
      }
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Unable to delete teacher. Please try again."),
      );
      setDeleteLoading(null);
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        contact: formData.contact.trim(),
        email: formData.email.trim(),
        cnic: formData.cnic.trim(),
        address: formData.address.trim(),
        salary: Number(formData.salary.trim()),
        institutionType: adminLoginType,
      };
      console.log("institutionType", institutionType);
      console.log("adminLoginType", adminLoginType);

      const duplicate = teachers.find((t) => {
        if (isEditMode && String(t._id || t.id) === String(editingTeacherId))
          return false;
        return (
          String(t.email || "").toLowerCase() === payload.email.toLowerCase() ||
          String(t.contact || "") === payload.contact ||
          String(t.cnic || "") === payload.cnic
        );
      });
      if (duplicate) {
        toast.error(
          "Teacher already exists with this email, contact, or CNIC.",
        );
        setSubmitting(false);
        return;
      }

      const endpoint = isEditMode
        ? `${API_BASE}/updateTeacher/${editingTeacherId}`
        : `${API_BASE}/signUp`;
      const method = isEditMode ? "put" : "post";

      const res = await axios({
        method,

        url: endpoint,
        data: payload,
        headers: getAuthHeaders(),
      });

      if (res.data?.success) {
        toast.success(
          isEditMode
            ? "Teacher updated successfully"
            : "Teacher added successfully",
        );
        setShowModal(false);
        resetForm();
        fetchTeachers();
      } else {
        toast.error(
          res.data?.message ||
            (isEditMode ? "Failed to update teacher" : "Failed to add teacher"),
        );
      }
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          isEditMode
            ? "Unable to update teacher. Please try again."
            : "Unable to add teacher. Please try again.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sidebar>
      <Toaster position="top-right" />
      <TopBar />

      <section className="tm-header-card mb-4">
        <div className="tm-logo-wrap">
          <img src={logo} alt="EC Portal" className="tm-logo" />
        </div>
        <h2 className="tm-heading mb-0">EC Teacher Manage</h2>
      </section>

      <section className="tm-toolbar mb-3">
        <button
          type="button"
          className="btn btn-success tm-add-btn"
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
        >
          <i className="fas fa-plus me-2"></i>
          Add Teacher
        </button>

        <div className="tm-search-wrap">
          <i className="fas fa-search tm-search-icon"></i>
          <input
            type="text"
            className="form-control tm-search-input"
            placeholder="Search teachers by name, contact, email, cnic, address..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
      </section>

      <section className="tm-table-card">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="tm-table-head">
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Contact</th>
                <th>Email</th>
                <th>CNIC</th>
                <th>Salary</th>
                <th>Manage</th>
              </tr>
            </thead>
            <tbody>
              {loadingTeachers ? (
                <tr>
                  <td colSpan="8" className="text-center py-4">
                    Loading teachers...
                  </td>
                </tr>
              ) : filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-4">
                    No teacher found.
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((teacher, index) => (
                  <tr key={teacher._id || index}>
                    <td>{index + 1}</td>
                    <td>{teacher.name}</td>
                    <td>{teacher.contact}</td>
                    <td>{teacher.email}</td>
                    <td>{teacher.cnic}</td>
                    <td>PKR {teacher.salary?.toLocaleString()}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => handleEdit(teacher)}
                      >
                        <i className="fas fa-sliders me-1"></i>Manage
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showModal && (
        <div
          className="tm-modal-backdrop"
          onClick={() => {
            setShowModal(false);
            resetForm();
          }}
        >
          <div className="tm-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0">
                {isEditMode ? "Edit Teacher" : "Add New Teacher"}
              </h5>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="row g-3">
                <div className="col-12 col-md-6">
                  <label className="form-label">Name</label>
                  <input
                    name="name"
                    type="text"
                    className="form-control"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter name"
                  />
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label">Contact</label>
                  <input
                    name="contact"
                    type="text"
                    className="form-control"
                    value={formData.contact}
                    onChange={handleChange}
                    placeholder="03xxxxxxxxx"
                  />
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label">Email</label>
                  <input
                    name="email"
                    type="email"
                    className="form-control"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="teacher@email.com"
                  />
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label">CNIC</label>
                  <input
                    name="cnic"
                    type="text"
                    className="form-control"
                    value={formData.cnic}
                    onChange={handleChange}
                    placeholder="xxxxxxxxxxxxx"
                  />
                </div>

                <div className="col-12">
                  <label className="form-label">Address</label>
                  <textarea
                    name="address"
                    className="form-control"
                    rows="3"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Enter address"
                  ></textarea>
                </div>

                <div className="col-12 col-md-6">
                  <label className="form-label">Salary (PKR)</label>
                  <input
                    name="salary"
                    type="number"
                    className="form-control"
                    value={formData.salary}
                    onChange={handleChange}
                    placeholder="Enter salary"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="d-flex justify-content-end gap-2 mt-4">
                {isEditMode &&
                  (deleteLoading === editingTeacherId ? (
                    <button
                      type="button"
                      className="btn btn-outline-danger"
                      disabled
                    >
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                        aria-hidden="true"
                      ></span>
                      Deleting...
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-outline-danger me-auto"
                      onClick={async () => {
                        const deleted = await handleDelete({
                          _id: editingTeacherId,
                          name: formData.name,
                        });
                        if (deleted) {
                          setShowModal(false);
                          resetForm();
                        }
                      }}
                    >
                      <i className="fas fa-trash me-1"></i>Delete Teacher
                    </button>
                  ))}

                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="btn btn-success"
                  disabled={submitting}
                >
                  {submitting
                    ? isEditMode
                      ? "Updating..."
                      : "Saving..."
                    : isEditMode
                      ? "Update Teacher"
                      : "Save Teacher"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Sidebar>
  );
}

export default TeacherManage;
