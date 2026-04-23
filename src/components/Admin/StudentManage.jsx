import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Toaster, toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import Sidebar from "../Sidebar";
import TopBar from "../TopBar";
import logo from "./../../images/logo.png";
import "./StudentManage.css";

function StudentManage({ adminLoginType = "academy" }) {
  const navigate = useNavigate();
  const CLASS_OPTIONS = ["Pre-9th", "9th", "10th", "11th", "12th"];

  const [students, setStudents] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingStudent, setDeletingStudent] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
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

  const STUDENT_API = "https://ec-backend-phi.vercel.app/api/students";

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
  };

  const fetchStudents = async () => {
    setLoadingStudents(true);
    try {
      const res = await axios.get(`${STUDENT_API}/getAllStudents`, {
        params: {
          institutionType: adminLoginType === "academy" ? "Academy" : "School",
        },
        headers: getAuthHeaders(),
      });

      if (res.data?.success) {
        setStudents(res.data.students || []);
      } else {
        toast.error(res.data?.message || "Failed to load students");
      }
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Unable to load students. Please refresh."),
      );
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const filteredStudents = useMemo(() => {
    if (!searchText.trim()) return students;
    const q = searchText.toLowerCase();
    return students.filter(
      (student) =>
        student.name?.toLowerCase().includes(q) ||
        student.email?.toLowerCase().includes(q) ||
        student.contact?.includes(searchText) ||
        student.rollNumber?.toString().includes(searchText),
    );
  }, [students, searchText]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
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
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        contact: formData.contact.trim(),
        gender: formData.gender,
        address: formData.address.trim(),
        classInfo: formData.classInfo,
        fatherName: formData.fatherName.trim(),
        fatherContact: formData.fatherContact.trim(),
        institutionType: adminLoginType === "academy" ? "Academy" : "School",
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

    const confirmed = window.confirm(
      "Delete this student? This will also delete all course registrations for this student.",
    );
    if (!confirmed) return;

    setDeletingStudent(true);
    try {
      const res = await axios.delete(
        `${STUDENT_API}/deleteStudent/${editingStudentId}`,
        {
          headers: getAuthHeaders(),
        },
      );

      if (res.data?.success) {
        toast.success(res.data?.message || "Student deleted successfully!");
        setShowModal(false);
        resetForm();
        fetchStudents();
      } else {
        toast.error(res.data?.message || "Failed to delete student");
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to delete student"));
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
    // Store student data for fee management
    localStorage.setItem("voucherStudent", JSON.stringify(student));
    localStorage.setItem("voucherStudentId", student._id || student.id);

    // Navigate to fee management page
    navigate(`/fee-management/${student._id || student.id}`);
  };

  return (
    <Sidebar>
      <Toaster position="top-right" />
   
      <div className="sm-content-wrapper">
        <section className="sm-header-card">
          <div className="sm-logo-wrap">
            <img src={logo} alt="EC Portal" className="sm-logo" />
          </div>
          <h2 className="sm-heading mb-0">EC Student Manage</h2>
        </section>

        <section className="sm-toolbar mb-3 mt-3">
          <button
            type="button"
            className="btn btn-success sm-add-btn"
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
                  <th>Contact</th>
                  <th>Roll No.</th>
                  <th>Class</th>
                  <th>Father Name</th>
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
                      <td>{student.contact}</td>
                      <td>{student.rollNumber}</td>
                      <td>
                        <span className="sm-class-badge">
                          {student.classInfo}
                        </span>
                      </td>
                      <td>{student.fatherName}</td>
                      <td>
                        <div className="sm-manage-actions">
                          <button
                            type="button"
                            className="btn btn-sm btn-primary"
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
                      <option key={option} value={option}>
                        {option}
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

                <div className="col-12">
                  <label className="form-label">Father Contact</label>
                  <input
                    name="fatherContact"
                    type="text"
                    className="form-control"
                    value={formData.fatherContact}
                    onChange={handleChange}
                    placeholder="Enter father's contact"
                  />
                </div>
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
                    {deletingStudent ? "Deleting..." : "Delete Student"}
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
    </Sidebar>
  );
}

export default StudentManage;
