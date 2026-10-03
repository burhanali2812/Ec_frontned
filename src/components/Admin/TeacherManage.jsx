import React, { useEffect, useMemo, useState , useRef} from "react";
import axios from "axios";
import { Toaster, toast } from "react-hot-toast";
import Sidebar from "../Sidebar";
import TopBar from "../TopBar";
import Footer from "../footer";
import logo from "./../../images/logo.png";
import "./TeacherManage.css";
import { useAppContext } from "../../contextApi/AppContext";

function TeacherManage() {
  const [searchText, setSearchText] = useState("");
  const [showModal, setShowModal] = useState(false);

  const [deleteLoading, setDeleteLoading] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingTeacherId, setEditingTeacherId] = useState("");
  const CNIC_REGEX = /^\d{13}$|^\d{5}-\d{7}-\d$/;
  const lastLookedUpCnic = useRef("");

  // Result of looking the CNIC up against the whole system (not just this
  // institution). "matched" locks name/contact/email/address so the admin
  // can't accidentally create a second, slightly different profile for
  // the same real person - only salary stays editable in that case.
  const [cnicLookup, setCnicLookup] = useState({
    checking: false,
    matched: false,
    alreadyHere: false,
  });

  const [formData, setFormData] = useState({
    name: "",
    contact: "",
    email: "",
    cnic: "",
    address: "",
    salary: "",
  });
  

  const API_BASE = "https://api.theecportal.com/api/teacher";
  const { teachers, fetchTeachers, setTeachers, user } = useAppContext();

  // The institution this admin session is acting as. Every teacher in
  // `teachers` already belongs to this institution (getAllTeachers is
  // scoped server-side), but salary is stored per-institution, so we
  // still need this id to pick the right entry out of salaryByInstitution.
  const currentInstitutionId =
    user?.institution?._id || user?.institution?.id || user?.institution;

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

  // Salary now lives in salaryByInstitution: [{ institution, salary }],
  // so pull out the entry that matches the institution we're managing.
  const getTeacherSalary = (teacher) => {
    const entry = teacher.salaryByInstitution?.find(
      (s) =>
        String(s.institution?._id || s.institution) ===
        String(currentInstitutionId),
    );
    return entry ? entry.salary : null;
  };

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
        getTeacherSalary(teacher),
      ]
        .filter(Boolean)
        .some((val) => String(val).toLowerCase().includes(q)),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teachers, searchText, currentInstitutionId]);

const handleChange = (e) => {
  const { name, value } = e.target;
  setFormData((prev) => ({ ...prev, [name]: value }));

  if (name === "cnic") {
    // Editing the CNIC invalidates any previous match / "already here" state
    if (cnicLookup.matched || cnicLookup.alreadyHere) {
      setCnicLookup({ checking: false, matched: false, alreadyHere: false });
    }
    if (value.trim() !== lastLookedUpCnic.current) {
      lastLookedUpCnic.current = "";
    }
    // Auto-fetch as soon as the CNIC is complete
    lookupCnic(value);
  }
};

const lookupCnic = async (rawCnic) => {
  if (isEditMode) return; // autofill only makes sense when adding
  const cnic = rawCnic.trim();
  if (!CNIC_REGEX.test(cnic)) return; // not complete yet
  if (lastLookedUpCnic.current === cnic) return; // already fetched this one
  lastLookedUpCnic.current = cnic;

  setCnicLookup({ checking: true, matched: false, alreadyHere: false });
  try {
    const res = await axios.get(
      `${API_BASE}/lookupByCnic/${encodeURIComponent(cnic)}`,
      { headers: getAuthHeaders() },
    );

    if (res.data?.found) {
      if (res.data.alreadyAtThisInstitution) {
        toast.error("A teacher with this CNIC is already at this institution.");
        setCnicLookup({ checking: false, matched: false, alreadyHere: true });
        return;
      }

      const { name, email, contact, address } = res.data.teacher;
      setFormData((prev) => ({ ...prev, name, email, contact, address }));
      setCnicLookup({ checking: false, matched: true, alreadyHere: false });
      toast.success(
        "Existing teacher found - details filled in. You can edit them if needed.",
      );
    } else {
      setCnicLookup({ checking: false, matched: false, alreadyHere: false });
    }
  } catch (error) {
    lastLookedUpCnic.current = ""; // allow a retry
    setCnicLookup({ checking: false, matched: false, alreadyHere: false });
  }
};

const resetForm = () => {
  setFormData({ name: "", contact: "", email: "", cnic: "", address: "", salary: "" });
  setEditingTeacherId("");
  setIsEditMode(false);
  setCnicLookup({ checking: false, matched: false, alreadyHere: false });
  lastLookedUpCnic.current = "";
};

  // Fires when the admin leaves the CNIC field on the Add form. Looks the
  // CNIC up across every institution; if it's an existing teacher, fills
  // in their details and locks them so only salary is left to enter.
  const handleCnicBlur = async () => {
    if (isEditMode) return; // autofill only makes sense when adding
    const cnic = formData.cnic.trim();
    if (!/^\d{13}$|^\d{5}-\d{7}-\d$/.test(cnic)) return; // wait for a valid CNIC

    setCnicLookup({ checking: true, matched: false, alreadyHere: false });
    try {
      const res = await axios.get(
        `${API_BASE}/lookupByCnic/${encodeURIComponent(cnic)}`,
        { headers: getAuthHeaders() },
      );

      if (res.data?.found) {
        if (res.data.alreadyAtThisInstitution) {
          toast.error("A teacher with this CNIC is already at this institution.");
          setCnicLookup({ checking: false, matched: false, alreadyHere: true });
          return;
        }

        const { name, email, contact, address } = res.data.teacher;
        setFormData((prev) => ({ ...prev, name, email, contact, address }));
        setCnicLookup({ checking: false, matched: true, alreadyHere: false });
        toast.success(
          "Existing teacher found - details filled in. You can edit them if needed.",
        );
      } else {
        setCnicLookup({ checking: false, matched: false, alreadyHere: false });
      }
    } catch (error) {
      // A failed lookup shouldn't block manual entry - just let the admin
      // type the rest of the form normally.
      setCnicLookup({ checking: false, matched: false, alreadyHere: false });
    }
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
      salary: getTeacherSalary(teacher) ?? "",
    });
    setShowModal(true);
  };

  const handleDelete = async (teacher) => {
    const ok = window.confirm(
      `Remove ${teacher.name} from this institution?`,
    );
    if (!ok) return false;

    setDeleteLoading(teacher._id || teacher.id);
    try {
      const teacherId = teacher._id || teacher.id;
      const res = await axios.delete(`${API_BASE}/deleteTeacher/${teacherId}`, {
        headers: getAuthHeaders(),
      });

      if (res.data?.success) {
        toast.success(res.data.message || "Teacher removed successfully");
        setDeleteLoading(null);
        // deleteTeacher only detaches the teacher from THIS institution;
        // the backend deletes the whole record only if it was their last
        // one. Either way, they should disappear from this institution's
        // list, so it's safe to drop them from local state.
        setTeachers((prev) =>
          prev.filter((t) => String(t._id || t.id) !== String(teacherId)),
        );
        return true;
      } else {
        toast.error(res.data?.message || "Failed to remove teacher");
        setDeleteLoading(null);
        return false;
      }
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Unable to remove teacher. Please try again."),
      );
      setDeleteLoading(null);
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (!isEditMode && cnicLookup.alreadyHere) {
      toast.error("A teacher with this CNIC is already at this institution.");
      return;
    }

    setSubmitting(true);
    try {
      // institution is no longer sent - both signUp and updateTeacher
      // read req.user.institution from the auth token, not the body.
      const payload = {
        name: formData.name.trim(),
        contact: formData.contact.trim(),
        email: formData.email.trim(),
        cnic: formData.cnic.trim(),
        address: formData.address.trim(),
        salary: Number(formData.salary.trim()),
      };

   

      // `teachers` is already scoped to this institution (getAllTeachers
      // filters server-side), so this only blocks a true duplicate at
      // THIS institution. It will correctly let through a teacher who
      // already exists at a different institution - the backend adds
      // them here instead of rejecting them.
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
          "Teacher already exists with this email, contact, or CNIC at this institution.",
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
          res.data.message ||
            (isEditMode
              ? "Teacher updated successfully"
              : "Teacher added successfully"),
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

      {cnicLookup.checking && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0, 0, 0, 0.45)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.75rem",
            zIndex: 2000, // above the modal backdrop
          }}
        >
          <span
            className="spinner-border text-light"
            style={{ width: "3rem", height: "3rem" }}
            role="status"
            aria-hidden="true"
          ></span>
          <span className="text-light fw-semibold">
            Fetching teacher data for this CNIC...
          </span>
        </div>
      )}

      <section className="tm-header-card mb-4">
        <div className="tm-logo-wrap">
          <img src={logo} alt="EC Portal" className="tm-logo" />
        </div>
        <h2 className="tm-heading mb-0">EC Teacher Manage</h2>
      </section>

      <section className="tm-toolbar mb-3">
        <button
          type="button"
          className="btn btn-dark tm-add-btn"
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
                <th>WhatsApp</th>
                <th>Email</th>
                <th>CNIC</th>
                <th>Salary</th>
                <th>Manage</th>
              </tr>
            </thead>
            <tbody>
              {filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-4">
                    No teacher found.
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((teacher, index) => {
                  const salary = getTeacherSalary(teacher);
                  return (
                    <tr key={teacher._id || index}>
                      <td>{index + 1}</td>
                      <td>{teacher.name}</td>
                      <td>
                        {teacher.contact ? (
                          <a
                            href={`https://wa.me/${teacher.contact.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="tm-whatsapp-link"
                            title="Open WhatsApp chat"
                            style={{
                              color: "#25D366",
                              textDecoration: "none",
                              fontWeight: "600",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.5rem",
                            }}
                          >
                            <i className="fab fa-whatsapp"></i>
                            {teacher.contact}
                          </a>
                        ) : (
                          <span className="text-muted">N/A</span>
                        )}
                      </td>
                      <td>{teacher.email}</td>
                      <td>{teacher.cnic}</td>
                      <td>
                        {salary != null ? `PKR ${salary.toLocaleString()}` : "N/A"}
                      </td>
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
                  );
                })
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
                {cnicLookup.matched && (
                  <div className="col-12">
                    <div className="alert alert-info py-2 mb-0">
                      <i className="fas fa-circle-info me-2"></i>
                      Existing teacher found by CNIC. Details below were
                      filled in automatically - feel free to edit them,
                      and set the salary for this institution.
                    </div>
                  </div>
                )}

                <div className="col-12 col-md-6">
                  <label className="form-label">CNIC</label>
                 <input
  name="cnic"
  type="text"
  className="form-control"
  value={formData.cnic}
  onChange={handleChange}
  onBlur={(e) => lookupCnic(e.target.value)}
  placeholder="xxxxxxxxxxxxx"
  maxLength={15}
  disabled={isEditMode}
/>
                </div>

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
                  <label className="form-label">
                    Salary (PKR){" "}
                    {isEditMode && (
                      <small className="text-muted">
                        — for this institution only
                      </small>
                    )}
                  </label>
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
                      Removing...
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
                      <i className="fas fa-trash me-1"></i>Remove from
                      Institution
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
      <Footer />
    </Sidebar>
  );
}

export default TeacherManage;