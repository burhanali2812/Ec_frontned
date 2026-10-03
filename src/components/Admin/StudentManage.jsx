import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { Toaster, toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import Sidebar from "../Sidebar";
import TopBar from "../TopBar";
import Footer from "../footer";
import logo from "./../../images/logo.png";
import "./StudentManage.css";
import { useAppContext } from "../../contextApi/AppContext";

function StudentManage({ adminLoginType = "academy" }) {
  const navigate = useNavigate();
  const [CLASS_OPTIONS, setCLASS_OPTIONS] = useState([]);

  const [searchText, setSearchText] = useState("");
  const [selectedClass, setSelectedClass] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingStudent, setDeletingStudent] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const FATHER_CONTACT_LENGTH = 11;
  const lastLookedUpFatherContact = useRef("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    contact: "",
    gender: "",
    address: "",
    classInfo: "",
    fatherName: "",
    fatherContact: "",
  });

  // Result of looking up existing students by father's contact number.
  // Unlike the teacher CNIC lookup, this can hold MULTIPLE matches
  // (siblings often share a father's contact), so the admin picks one.
  const [fatherLookup, setFatherLookup] = useState({
    checking: false,
    matches: [],
  });

  const { classOptions, students, fetchStudents, user } = useAppContext();

  const STUDENT_API = "https://api.theecportal.com/api/students";

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const getErrorMessage = (error, fallback) => {
    const backendMessage = error?.response?.data?.message;
    if (backendMessage && backendMessage !== "Server error") {
      return backendMessage;
    }

    if (error?.response?.status === 401 || error?.response?.status === 403) {
      return "You are not authorized. Please login again.";
    }

    return fallback;
  };

  useEffect(() => {
    setCLASS_OPTIONS(classOptions);
  }, [classOptions]);

 const resetForm = () => {
  setFormData({
    name: "",
    email: "",
    contact: "",
    gender: "",
    address: "",
    classInfo: "",
    fatherName: "",
    fatherContact: "",
  });
  setIsEditMode(false);
  setEditingStudentId("");
  setFatherLookup({ checking: false, matches: [] });
  lastLookedUpFatherContact.current = "";
};

  // student.classInfo / student.rollNumber / student.isActive are already
  // flattened by the backend to match the enrollment at this institution
  // (see shapeStudent server-side), so this filtering logic is unchanged.
  const filteredStudents = useMemo(() => {
    let filtered = students;

    if (selectedClass) {
      filtered = filtered.filter(
        (student) => student.classInfo === selectedClass._id,
      );
    }

    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      filtered = filtered.filter(
        (student) =>
          student.name?.toLowerCase().includes(q) ||
          student.email?.toLowerCase().includes(q) ||
          student.contact?.includes(searchText) ||
          student.rollNumber?.toString().includes(searchText),
      );
    }

    return filtered;
  }, [students, searchText, selectedClass]);

  const getStudentCountByClass = (classInfo) => {
    return students.filter((student) => student.classInfo === classInfo._id)
      .length;
  };

  const handleChange = (e) => {
  const { name, value } = e.target;
  setFormData((prev) => ({
    ...prev,
    [name]: value,
  }));

  if (name === "fatherContact") {
    // Editing the number invalidates any previous results
    setFatherLookup({ checking: false, matches: [] });
    if (value.trim() !== lastLookedUpFatherContact.current) {
      lastLookedUpFatherContact.current = "";
    }
    // Auto-fetch as soon as the number is complete
    lookupFatherContact(value);
  }
};

const lookupFatherContact = async (rawContact) => {
  if (isEditMode) return; // lookup only makes sense when adding
  const fatherContact = rawContact.trim();
  if (fatherContact.replace(/\D/g, "").length !== FATHER_CONTACT_LENGTH) return; // not complete yet
  if (lastLookedUpFatherContact.current === fatherContact) return; // already fetched
  lastLookedUpFatherContact.current = fatherContact;

  setFatherLookup({ checking: true, matches: [] });
  try {
    const res = await axios.get(
      `${STUDENT_API}/lookupByFatherContact/${encodeURIComponent(fatherContact)}`,
      { headers: getAuthHeaders() },
    );

    // The number was changed while the request was in flight - ignore this result
    if (lastLookedUpFatherContact.current !== fatherContact) return;

    if (res.data?.found) {
      setFatherLookup({ checking: false, matches: res.data.matches });
    } else {
      setFatherLookup({ checking: false, matches: [] });
    }
  } catch (error) {
    // A failed lookup shouldn't block manual entry - allow a retry
    if (lastLookedUpFatherContact.current === fatherContact) {
      lastLookedUpFatherContact.current = "";
    }
    setFatherLookup({ checking: false, matches: [] });
  }
};

  // Fires when the admin leaves the Father Contact field on the Add form.
  // Looks up every student who shares that father's contact number -
  // could be the same student enrolling at a second institution, or a
  // sibling whose family details are worth reusing.
  const handleFatherContactBlur = async () => {
    if (isEditMode) return; // lookup only makes sense when adding
    const fatherContact = formData.fatherContact.trim();
    if (fatherContact.length < 7) return; // wait for something plausible

    setFatherLookup({ checking: true, matches: [] });
    try {
      const res = await axios.get(
        `${STUDENT_API}/lookupByFatherContact/${encodeURIComponent(fatherContact)}`,
        { headers: getAuthHeaders() },
      );

      if (res.data?.found) {
        setFatherLookup({ checking: false, matches: res.data.matches });
      } else {
        setFatherLookup({ checking: false, matches: [] });
      }
    } catch (error) {
      // A failed lookup shouldn't block manual entry.
      setFatherLookup({ checking: false, matches: [] });
    }
  };

  // Admin picked one of the matched students to base the form on.
  const applyFatherLookupMatch = (match) => {
    if (match.alreadyAtThisInstitution) {
      toast.error("This student is already enrolled at this institution.");
      return;
    }
    setFormData((prev) => ({
      ...prev,
      name: match.name,
      email: match.email,
      contact: match.contact,
      address: match.address,
      gender: match.gender,
      fatherName: match.fatherName,
      fatherContact: match.fatherContact,
    }));
    toast.success(
      "Details filled in from an existing family record. Edit anything that's different for this student.",
    );
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast.error("Student name is required");
      return false;
    }
    if (!formData.email.trim()) {
      toast.error("Email is required");
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error("Please enter a valid email address");
      return false;
    }
    if (!formData.contact.trim()) {
      toast.error("Contact number is required");
      return false;
    }
    if (formData.contact.length < 10) {
      toast.error("Contact number must be at least 10 digits");
      return false;
    }
    if (!formData.classInfo) {
      toast.error("Please select a class");
      return false;
    }
    if (!formData.fatherName.trim()) {
      toast.error("Father's name is required");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      // institution is no longer sent - both signUp and updateStudent
      // read req.user.institution from the auth token, not the body.
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        contact: formData.contact.trim(),
        gender: formData.gender,
        address: formData.address.trim(),
        classInfo: formData.classInfo,
        fatherName: formData.fatherName.trim(),
        fatherContact: formData.fatherContact.trim(),
      };

      const endpoint = isEditMode
        ? `${STUDENT_API}/updateStudent/${editingStudentId}`
        : `${STUDENT_API}/signUp`;

      const res = await axios({
        method: isEditMode ? "put" : "post",
        url: endpoint,
        data: payload,
        headers: getAuthHeaders(),
      });

      if (res.data?.success) {
        toast.success(
          res.data?.message ||
            (isEditMode
              ? "Student updated successfully!"
              : "Student added successfully!"),
        );
        setShowModal(false);
        resetForm();
        fetchStudents();
      } else {
        toast.error(
          res.data?.message ||
            (isEditMode ? "Failed to update student" : "Failed to add student"),
        );
      }
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          isEditMode ? "Failed to update student" : "Failed to add student",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditStudent = (student) => {
    setIsEditMode(true);
    setEditingStudentId(String(student._id || student.id));
    setFormData({
      name: student.name || "",
      email: student.email || "",
      contact: student.contact || "",
      gender: student.gender || "",
      address: student.address || "",
      classInfo: student.classInfo || "",
      fatherName: student.fatherName || "",
      fatherContact: student.fatherContact || "",
    });
    setShowModal(true);
  };

  const handleDeleteStudent = async () => {
    if (!editingStudentId) return;

    // deleteStudent now deactivates just this institution's enrollment -
    // the student's record (and any enrollment elsewhere) is untouched.
    const confirmed = window.confirm(
      "Deactivate this student at this institution? Their course registration here will remain on record but they'll show as inactive.",
    );
    if (!confirmed) return;

    setDeletingStudent(true);
    try {
      const res = await axios.put(
        `${STUDENT_API}/deleteStudent/${editingStudentId}`,
        {},
        {
          headers: getAuthHeaders(),
        },
      );

      if (res.data?.success) {
        toast.success(res.data?.message || "Student deactivated successfully!");
        setShowModal(false);
        resetForm();
        fetchStudents();
      } else {
        toast.error(res.data?.message || "Failed to deactivate student");
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to deactivate student"));
    } finally {
      setDeletingStudent(false);
    }
  };

  const openRegistrationPage = (student) => {
    navigate(`/student-register/${student._id || student.id}`, {
      state: { student },
    });
  };

  const handleFeeManage = (student) => {
    localStorage.setItem("voucherStudent", JSON.stringify(student));
    localStorage.setItem("voucherStudentId", student._id || student.id);
    navigate(`/fee-management/${student._id || student.id}`);
  };

  return (
    <Sidebar>
      <Toaster position="top-right" />

      {fatherLookup.checking && (
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
            zIndex: 2000,
          }}
        >
          <span
            className="spinner-border text-light"
            style={{ width: "3rem", height: "3rem" }}
            role="status"
            aria-hidden="true"
          ></span>
          <span className="text-light fw-semibold">
            Looking up students for this contact number...
          </span>
        </div>
      )}

      <div className="sm-content-wrapper">
        <section className="sm-header-card">
          <div className="sm-logo-wrap">
            <img src={logo} alt="EC Portal" className="sm-logo" />
          </div>
          <h2 className="sm-heading mb-0">EC Student Manage</h2>
        </section>

        {/* Class Filter Boxes */}
        <section className="sm-class-filter-section mt-4 mb-4">
          <div className="sm-class-filter-grid">
            {CLASS_OPTIONS?.map((classOption) => (
              <div
                key={classOption._id || classOption}
                className={`sm-class-filter-box ${selectedClass === classOption ? "active" : ""}`}
                onClick={() =>
                  setSelectedClass(
                    selectedClass === classOption ? null : classOption,
                  )
                }
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    setSelectedClass(
                      selectedClass === classOption._id ? null : classOption,
                    );
                  }
                }}
              >
                <div className="sm-class-title">{classOption.name}</div>
                <div className="sm-class-count">
                  {getStudentCountByClass(classOption)} Students
                </div>
              </div>
            ))}
          </div>
        </section>

        {selectedClass && (
          <>
            <section className="sm-toolbar mb-3 mt-3">
              <button
                type="button"
                className="btn btn-dark sm-add-btn"
                onClick={() => {
                  resetForm();
                  setShowModal(true);
                }}
              >
                <i className="fas fa-plus me-2"></i>
                Add Student
              </button>

              <div className="sm-search-wrap">
                <i className="fas fa-search sm-search-icon"></i>
                <input
                  type="text"
                  className="form-control sm-search-input"
                  placeholder="Search students by name, email, contact, roll number..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </div>
            </section>

            <section className="sm-table-card">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="sm-table-head">
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Father Contact</th>
                      <th>Roll No.</th>
                      <th>Father Name</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingStudents ? (
                      <tr>
                        <td colSpan="8" className="text-center py-4">
                          Loading students...
                        </td>
                      </tr>
                    ) : filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="text-center py-4">
                          No student found.
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((student, index) => (
                        <tr key={student._id || index}>
                          <td>{index + 1}</td>
                          <td>{student.name}</td>
                          <td>
                            {student.fatherContact ? (
                              <a
                                href={`https://wa.me/${student.fatherContact.replace(/\D/g, "")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="sm-whatsapp-link"
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
                                {student.fatherContact}
                              </a>
                            ) : (
                              <span className="text-muted">N/A</span>
                            )}
                          </td>
                          <td>{student.rollNumber}</td>

                          <td>{student.fatherName}</td>
                          <td className="text-center text-dark fw-bold">
                            {student.isActive ? "Active" : "Inactive"}
                          </td>
                          <td>
                            <div className="sm-manage-actions">
                              <button
                                type="button"
                                className="btn btn-sm btn-dark "
                                onClick={() => handleEditStudent(student)}
                              >
                                <i className="fas fa-edit me-1"></i>Edit
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-info"
                                onClick={() => openRegistrationPage(student)}
                              >
                                <i className="fas fa-book me-1"></i>Register
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-warning"
                                onClick={() => handleFeeManage(student)}
                              >
                                <i className="fas fa-dollar-sign me-1"></i>Fees
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {!selectedClass && (
          <div className="alert alert-info mt-4" role="alert">
            <i className="fas fa-info-circle me-2"></i>
            Please select a class above to view and manage students.
          </div>
        )}
      </div>

      {showModal && (
        <div
          className="sm-modal-backdrop"
          onClick={() => {
            setShowModal(false);
            resetForm();
          }}
        >
          <div className="sm-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0">
                {isEditMode ? "Edit Student" : "Add New Student"}
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
                {!isEditMode && (
                  <div className="col-12">
                    <label className="form-label">Father Contact</label>
                    <input
                      name="fatherContact"
                      type="text"
                      className="form-control"
                      value={formData.fatherContact}
                      onChange={handleChange}
                      onBlur={handleFatherContactBlur}
                      placeholder="Enter father's contact"
                    />
                  </div>
                )}

                {fatherLookup.matches.length > 0 && (
                  <div className="col-12">
                    <div className="alert alert-info py-2 mb-0">
                      <i className="fas fa-circle-info me-2"></i>
                      Found {fatherLookup.matches.length} student
                      {fatherLookup.matches.length > 1 ? "s" : ""} with this
                      father's contact. Pick one to reuse their details, or
                      keep typing manually if this is a new student.
                      <div className="d-flex flex-column gap-2 mt-2">
                        {fatherLookup.matches.map((match) => (
                          <div
                            key={match._id}
                            className="d-flex justify-content-between align-items-center border rounded px-2 py-1 bg-white"
                          >
                            <div>
                              <strong>{match.name}</strong>{" "}
                              <span className="text-muted">
                                ({match.email})
                              </span>
                              {match.alreadyAtThisInstitution && (
                                <span className="badge bg-secondary ms-2">
                                  Already here
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary"
                              disabled={match.alreadyAtThisInstitution}
                              onClick={() => applyFatherLookupMatch(match)}
                            >
                              Use this
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="col-12">
                  <label className="form-label">Student Name</label>
                  <input
                    name="name"
                    type="text"
                    className="form-control"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter student name"
                  />
                </div>

                <div className="col-12">
                  <label className="form-label">Email</label>
                  <input
                    name="email"
                    type="email"
                    className="form-control"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter email"
                  />
                </div>

                <div className="col-12">
                  <label className="form-label">Contact</label>
                  <input
                    name="contact"
                    type="text"
                    className="form-control"
                    value={formData.contact}
                    onChange={handleChange}
                    placeholder="Enter contact number"
                  />
                </div>

                <div className="col-12">
                  <label className="form-label">Gender</label>
                  <select
                    name="gender"
                    className="form-control"
                    value={formData.gender}
                    onChange={handleChange}
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="col-12">
                  <label className="form-label">Address</label>
                  <input
                    name="address"
                    type="text"
                    className="form-control"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Enter address"
                  />
                </div>

                <div className="col-12">
                  <label className="form-label">Class</label>
                  <select
                    name="classInfo"
                    className="form-control"
                    value={formData.classInfo}
                    onChange={handleChange}
                  >
                    <option value="">Select Class</option>
                    {CLASS_OPTIONS.map((option) => (
                      <option key={option._id} value={option._id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-12">
                  <label className="form-label">Father Name</label>
                  <input
                    name="fatherName"
                    type="text"
                    className="form-control"
                    value={formData.fatherName}
                    onChange={handleChange}
                    placeholder="Enter father's name"
                  />
                </div>

                {isEditMode && (
                  <div className="col-12">
                    <label className="form-label">Father Contact</label>
                   <input
  name="fatherContact"
  type="text"
  className="form-control"
  value={formData.fatherContact}
  onChange={handleChange}
  onBlur={(e) => lookupFatherContact(e.target.value)}
  placeholder="03xxxxxxxxx"
  maxLength={15}
/>
                  </div>
                )}
              </div>

              <div className="d-flex justify-content-between gap-2 mt-4 flex-wrap">
                {isEditMode ? (
                  <button
                    type="button"
                    className="btn btn-outline-danger"
                    onClick={handleDeleteStudent}
                    disabled={deletingStudent || submitting}
                  >
                    <i className="fas fa-trash me-1"></i>
                    {deletingStudent ? "Deactivating..." : "Deactivate Student"}
                  </button>
                ) : (
                  <span></span>
                )}

                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    disabled={deletingStudent}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-success"
                    disabled={submitting || deletingStudent}
                  >
                    {submitting
                      ? isEditMode
                        ? "Updating..."
                        : "Saving..."
                      : isEditMode
                        ? "Update Student"
                        : "Save Student"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      <Footer />
    </Sidebar>
  );
}

export default StudentManage;