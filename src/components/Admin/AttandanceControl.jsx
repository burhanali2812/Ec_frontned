import React, { useState } from "react";
import axios from "axios";
import { toast, Toaster } from "react-hot-toast";
import "./AttendanceControl.css";
import logo from "../../images/logo.png";
import Sidebar from "../Sidebar";

function AttendanceControl() {
  const API_BASE = "https://ec-backend-phi.vercel.app/api";

  // Filter states
  const [rollNumber, setRollNumber] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [courseFilter, setCourseFilter] = useState("all");

  // Data states
  const [studentData, setStudentData] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPrintReport, setShowPrintReport] = useState(false);

  // Edit Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    rollNumber: "",
    editDate: "",
    editCourse: "",
  });
  const [editStudent, setEditStudent] = useState(null);
  const [editAttendance, setEditAttendance] = useState(null);
  const [editStatus, setEditStatus] = useState("present");
  const [editLoading, setEditLoading] = useState(false);
  const [editModalMessage, setEditModalMessage] = useState("");
  const [editModalMessageType, setEditModalMessageType] = useState(""); // "success", "error", or ""

  const showModalMessage = (message, type) => {
    setEditModalMessage(message);
    setEditModalMessageType(type);
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Fetch attendance data based on filters
  const handleFetchAttendance = async (e) => {
    e.preventDefault();

    if (!rollNumber.trim() || !selectedClass) {
      toast.error("Please enter roll number and select class");
      return;
    }

    setLoading(true);
    try {
      // Fetch student data by roll number
      const studentRes = await axios.get(
        `${API_BASE}/students/getStudentByRollNumber/${rollNumber}`,
        {
          headers: getAuthHeaders(),
        },
      );

      if (!studentRes.data?.success || !studentRes.data?.student) {
        toast.error("Student not found");
        setLoading(false);
        return;
      }

      const student = studentRes.data.student;

      // Verify student class
      if (student.classInfo !== selectedClass) {
        toast.error("Student class does not match selected class");
        setLoading(false);
        return;
      }

      setStudentData(student);

      // Fetch attendance records for the date range
      const attendanceRes = await axios.get(
        `${API_BASE}/attendance/getStudentAttendance`,
        {
          headers: getAuthHeaders(),
          params: {
            studentId: student._id,
            startDate,
            endDate,
          },
        },
      );

      if (attendanceRes.data?.success) {
        setAttendanceRecords(attendanceRes.data.attendance || []);

        // Extract unique courses from attendance
        const uniqueCourses = [
          ...new Map(
            (attendanceRes.data.attendance || []).map((rec) => [
              rec.course?._id,
              rec.course,
            ]),
          ).values(),
        ];
        setCourses(uniqueCourses);
        setCourseFilter("all");
        toast.success("Attendance data loaded");
      }
    } catch (error) {
      console.error("Error fetching attendance:", error);
      toast.error(
        error.response?.data?.message || "Failed to fetch attendance data",
      );
    } finally {
      setLoading(false);
    }
  };

  // Calculate attendance percentage for a course
  const calculateCourseAttendance = (courseId) => {
    const courseRecords = courseId
      ? attendanceRecords.filter((rec) => rec.course?._id === courseId)
      : attendanceRecords;

    if (courseRecords.length === 0) return 0;
    const presentDays = courseRecords.filter(
      (rec) => rec.status === "present",
    ).length;
    return Math.round((presentDays / courseRecords.length) * 100);
  };

  // Get filtered attendance records based on course filter
  const filteredRecords =
    courseFilter === "all"
      ? attendanceRecords
      : attendanceRecords.filter((rec) => rec.course?._id === courseFilter);

  // Sort records by date
  const sortedRecords = [...filteredRecords].sort(
    (a, b) => new Date(a.date) - new Date(b.date),
  );

  // Handle print report
  const handlePrintReport = () => {
    setShowPrintReport(true);
    setTimeout(() => {
      window.print();
      setShowPrintReport(false);
    }, 500);
  };

  // Fetch student for editing
  const handleFetchStudentForEdit = async () => {
    if (!editForm.rollNumber.trim()) {
      showModalMessage("Please enter a roll number", "error");
      setTimeout(() => {
        setEditModalMessage("");
        setEditModalMessageType("");
      }, 5000);
      return;
    }

    setEditLoading(true);
    try {
      const studentRes = await axios.get(
        `${API_BASE}/students/getStudentByRollNumber/${editForm.rollNumber}`,
        {
          headers: getAuthHeaders(),
        },
      );

      if (!studentRes.data?.success || !studentRes.data?.student) {
        showModalMessage("Student not found", "error");
        setTimeout(() => {
          setEditModalMessage("");
          setEditModalMessageType("");
        }, 5000);
        setEditLoading(false);
        return;
      }

      setEditStudent(studentRes.data.student);

      // Fetch all courses for the modal
      try {
        const coursesRes = await axios.get(`${API_BASE}/courses/allCourses`, {
          headers: getAuthHeaders(),
        });

        if (coursesRes.data?.success && coursesRes.data?.courses) {
          setCourses(coursesRes.data.courses);
        }
      } catch (courseError) {
        console.error("Error fetching courses:", courseError);
      }

      showModalMessage("Student fetched successfully", "success");
      setTimeout(() => {
        setEditModalMessage("");
        setEditModalMessageType("");
      }, 5000);
    } catch (error) {
      console.error("Error fetching student for edit:", error);
      showModalMessage(
        error.response?.data?.message || "Failed to fetch student",
        "error",
      );
      setTimeout(() => {
        setEditModalMessage("");
        setEditModalMessageType("");
      }, 5000);
    } finally {
      setEditLoading(false);
    }
  };

  // Fetch attendance for editing
  const handleFetchAttendanceForEdit = async () => {
    if (!editStudent) {
      showModalMessage("Please fetch student first", "error");
      setTimeout(() => {
        setEditModalMessage("");
        setEditModalMessageType("");
      }, 5000);
      return;
    }

    if (!editForm.editDate || !editForm.editCourse) {
      showModalMessage("Please select date and course", "error");
      setTimeout(() => {
        setEditModalMessage("");
        setEditModalMessageType("");
      }, 5000);
      return;
    }

    setEditLoading(true);
    try {
      // Fetch attendance for specific date and course
      const attendanceRes = await axios.get(
        `${API_BASE}/attendance/getStudentAttendance`,
        {
          headers: getAuthHeaders(),
          params: {
            studentId: editStudent._id,
            startDate: editForm.editDate,
            endDate: editForm.editDate,
          },
        },
      );

      const attendance = attendanceRes.data.attendance?.find(
        (rec) =>
          rec.course?._id === editForm.editCourse &&
          new Date(rec.date).toISOString().split("T")[0] === editForm.editDate,
      );

      if (!attendance) {
        showModalMessage(
          "No attendance record found for this date and course",
          "error",
        );
        setTimeout(() => {
          setEditModalMessage("");
          setEditModalMessageType("");
        }, 5000);
        setEditLoading(false);
        return;
      }

      setEditAttendance(attendance);
      setEditStatus(attendance.status || "present");
      showModalMessage("Attendance record loaded", "success");
      setTimeout(() => {
        setEditModalMessage("");
        setEditModalMessageType("");
      }, 5000);
    } catch (error) {
      console.error("Error fetching attendance for edit:", error);
      showModalMessage(
        error.response?.data?.message || "Failed to fetch attendance",
        "error",
      );
      setTimeout(() => {
        setEditModalMessage("");
        setEditModalMessageType("");
      }, 5000);
    } finally {
      setEditLoading(false);
    }
  };

  // Update attendance status
  const handleUpdateAttendance = async () => {
    if (!editAttendance) {
      showModalMessage("No attendance record selected", "error");
      setTimeout(() => {
        setEditModalMessage("");
        setEditModalMessageType("");
      }, 5000);
      return;
    }

    setEditLoading(true);
    try {
      const response = await axios.post(
        `${API_BASE}/attendance/updateAttendance/${editAttendance._id}`,
        { status: editStatus },
        {
          headers: getAuthHeaders(),
        },
      );

      if (response.data?.success) {
        showModalMessage("Attendance updated successfully", "success");
        setTimeout(() => {
          setShowEditModal(false);
          setEditForm({ rollNumber: "", editDate: "", editCourse: "" });
          setEditAttendance(null);
          setEditStatus("present");
          setEditStudent(null);
          setEditModalMessage("");
          setEditModalMessageType("");
        }, 1500);
      }
    } catch (error) {
      console.error("Error updating attendance:", error);
      showModalMessage(
        error.response?.data?.message || "Failed to update attendance",
        "error",
      );
      setTimeout(() => {
        setEditModalMessage("");
        setEditModalMessageType("");
      }, 5000);
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <>
      {showPrintReport ? (
        // Print View
        <div className="ac-print-container">
          {/* Watermark */}
          <div className="ac-print-watermark">
            <img src={logo} alt="watermark" />
          </div>

          {/* Logo and Header */}
          <div className="ac-print-header">
            <img src={logo} alt="EC Academy" className="voucher-logo" />
            <h1 className="ac-print-institute-title">
              THE EDUCATION'S GRADE INSTITUTE
            </h1>
            <h2 className="ac-print-report-title">Attendance Report</h2>
            <p className="ac-print-date-range">
              From: {new Date(startDate).toLocaleDateString("en-GB")} | To:{" "}
              {new Date(endDate).toLocaleDateString("en-GB")}
            </p>
          </div>

          {/* Student Details */}
          {studentData && (
            <div className="ac-print-student-section">
              <h3 className="ac-print-section-title">Student Information</h3>
              <div className="ac-print-student-grid">
                <div className="ac-print-info-row">
                  <span className="ac-print-label">Name:</span>
                  <span className="ac-print-value">{studentData.name}</span>
                </div>
                <div className="ac-print-info-row">
                  <span className="ac-print-label">Roll Number:</span>
                  <span className="ac-print-value">
                    {studentData.rollNumber}
                  </span>
                </div>
                <div className="ac-print-info-row">
                  <span className="ac-print-label">Class:</span>
                  <span className="ac-print-value">
                    {studentData.classInfo}
                  </span>
                </div>
                <div className="ac-print-info-row">
                  <span className="ac-print-label">Email:</span>
                  <span className="ac-print-value">{studentData.email}</span>
                </div>
              </div>
            </div>
          )}

          {/* Attendance Summary Table */}
          {courses.length > 0 && (
            <div className="ac-print-summary-section">
              <h3 className="ac-print-section-title">Attendance Summary</h3>
              <table className="ac-print-table">
                <thead>
                  <tr>
                    <th>Course</th>
                    <th>Total Days</th>
                    <th>Present</th>
                    <th>Absent</th>
                    <th>Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((course) => {
                    const courseRecs = attendanceRecords.filter(
                      (rec) => rec.course?._id === course._id,
                    );
                    const present = courseRecs.filter(
                      (rec) => rec.status === "present",
                    ).length;
                    const absent = courseRecs.length - present;
                    const percentage = calculateCourseAttendance(course._id);

                    return (
                      <tr key={course._id}>
                        <td>{course.title}</td>
                        <td className="ac-print-center">{courseRecs.length}</td>
                        <td className="ac-print-center">{present}</td>
                        <td className="ac-print-center">{absent}</td>
                        <td className="ac-print-center">
                          <strong>{percentage}%</strong>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Daily Records */}
          {sortedRecords.length > 0 && (
            <div className="ac-print-daily-section">
              <h3 className="ac-print-section-title">
                Daily Attendance Records
              </h3>
              <div className="ac-print-daily-records">
                {(() => {
                  const groupedByDate = {};
                  sortedRecords.forEach((record) => {
                    const date = new Date(record.date).toLocaleDateString(
                      "en-GB",
                    );
                    if (!groupedByDate[date]) {
                      groupedByDate[date] = [];
                    }
                    groupedByDate[date].push(record);
                  });

                  const displayCourses =
                    courseFilter === "all"
                      ? courses
                      : courses.filter((c) => c._id === courseFilter);

                  return Object.entries(groupedByDate).map(
                    ([date, records]) => (
                      <div key={date} className="ac-print-date-group">
                        <div className="ac-print-date-header">{date}</div>
                        <table className="ac-print-daily-table">
                          <thead>
                            <tr>
                              {displayCourses.map((course) => (
                                <th key={course._id}>{course.title}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              {displayCourses.map((course) => {
                                const record = records.find(
                                  (r) => r.course?._id === course._id,
                                );
                                return (
                                  <td
                                    key={course._id}
                                    className="ac-print-center"
                                  >
                                    {record
                                      ? record.status.charAt(0).toUpperCase() +
                                        record.status.slice(1)
                                      : "-----"}
                                  </td>
                                );
                              })}
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    ),
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      ) : (
        // Normal View
        <Sidebar>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                zIndex: 99999,
              },
            }}
          />

          <div className="ac-container">
            {/* Hero Section */}
            <div className="ac-hero">
              <h1 className="ac-title">Student Attendance Report</h1>
              <p className="ac-subtitle">
                Search by roll number to view detailed attendance records
              </p>
            </div>

            {/* Filter Form */}
            <div className="ac-card ac-filter-card">
              <form onSubmit={handleFetchAttendance}>
                <div className="ac-form-grid">
                  <div className="ac-form-group">
                    <label className="ac-label">Student Roll Number</label>
                    <input
                      type="text"
                      className="ac-input"
                      placeholder="e.g., ECS-10001"
                      value={rollNumber}
                      onChange={(e) => setRollNumber(e.target.value)}
                      required
                    />
                  </div>

                  <div className="ac-form-group">
                    <label className="ac-label">Class</label>
                    <select
                      className="ac-select"
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      required
                    >
                      <option value="">Select class</option>
                      <option value="Pre-9th">Pre-9th</option>
                      <option value="9th">9th</option>
                      <option value="10th">10th</option>
                      <option value="11th">11th</option>
                      <option value="12th">12th</option>
                    </select>
                  </div>

                  <div className="ac-form-group">
                    <label className="ac-label">Start Date</label>
                    <input
                      type="date"
                      className="ac-input"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>

                  <div className="ac-form-group">
                    <label className="ac-label">End Date</label>
                    <input
                      type="date"
                      className="ac-input"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="ac-button-group">
                  <button
                    type="submit"
                    className="ac-btn ac-btn-primary"
                    disabled={loading}
                  >
                    <i className="fas fa-search me-2"></i>
                    {loading ? "Loading..." : "Search"}
                  </button>
                  <button
                    type="button"
                    className="ac-btn ac-btn-primary"
                    onClick={() => setShowEditModal(true)}
                  >
                    <i className="fas fa-edit"></i> Edit
                  </button>
                </div>
              </form>
            </div>

            {/* Results */}
            {studentData && (
              <>
                {/* Student Info Card */}
                <div className="ac-card ac-student-card">
                  <div className="ac-student-header">
                    <h3 className="ac-card-title">Student Information</h3>
                  </div>
                  <div className="ac-student-grid">
                    <div className="ac-info-item">
                      <span className="ac-info-label">Name:</span>
                      <span className="ac-info-value">{studentData.name}</span>
                    </div>
                    <div className="ac-info-item">
                      <span className="ac-info-label">Roll Number:</span>
                      <span className="ac-info-value">
                        {studentData.rollNumber}
                      </span>
                    </div>
                    <div className="ac-info-item">
                      <span className="ac-info-label">Class:</span>
                      <span className="ac-info-value">
                        {studentData.classInfo}
                      </span>
                    </div>
                    <div className="ac-info-item">
                      <span className="ac-info-label">Email:</span>
                      <span className="ac-info-value">{studentData.email}</span>
                    </div>
                  </div>
                </div>

                {/* Attendance Summary */}
                {courses.length > 0 && (
                  <div className="ac-card ac-summary-card">
                    <div className="ac-summary-header">
                      <h3 className="ac-card-title">Attendance Summary</h3>
                      <button
                        className="ac-btn ac-btn-pdf"
                        onClick={handlePrintReport}
                      >
                        <i className="fas fa-file-pdf"></i> Generate Report
                      </button>
                    </div>
                    <div className="ac-table-wrapper mt-3">
                      <table className="ac-table">
                        <thead>
                          <tr>
                            <th>Course</th>
                            <th>Total Days</th>
                            <th>Present</th>
                            <th>Absent</th>
                            <th>Percentage</th>
                          </tr>
                        </thead>
                        <tbody>
                          {courses.map((course) => {
                            const courseRecs = attendanceRecords.filter(
                              (rec) => rec.course?._id === course._id,
                            );
                            const present = courseRecs.filter(
                              (rec) => rec.status === "present",
                            ).length;
                            const absent = courseRecs.length - present;
                            const percentage = calculateCourseAttendance(
                              course._id,
                            );

                            return (
                              <tr key={course._id}>
                                <td className="ac-course-name">
                                  {course.title}
                                </td>
                                <td className="ac-center">
                                  {courseRecs.length}
                                </td>
                                <td className="ac-present">{present}</td>
                                <td className="ac-absent">{absent}</td>
                                <td className="ac-center">
                                  <span
                                    className={`ac-badge ${
                                      percentage >= 75
                                        ? "ac-badge-success"
                                        : "ac-badge-danger"
                                    }`}
                                  >
                                    {percentage}%
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Course Filter Buttons */}
                {courses.length > 0 && (
                  <div className="ac-card ac-course-filter-card">
                    <h3 className="ac-card-title">Filter by Course</h3>
                    <div className="ac-button-group-filter">
                      <button
                        className={`ac-btn ac-btn-filter ${
                          courseFilter === "all" ? "ac-btn-active" : ""
                        }`}
                        onClick={() => setCourseFilter("all")}
                      >
                        All Courses
                      </button>
                      {courses.map((course) => (
                        <button
                          key={course._id}
                          className={`ac-btn ac-btn-filter ${
                            courseFilter === course._id ? "ac-btn-active" : ""
                          }`}
                          onClick={() => setCourseFilter(course._id)}
                        >
                          {course.title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Daily Records - Date Grouped with Horizontal Layout */}
                {sortedRecords.length > 0 && (
                  <div className="ac-card ac-daily-card">
                    <h3 className="ac-card-title">Daily Attendance Records</h3>
                    <div className="ac-daily-records-container mt-3">
                      {(() => {
                        // Group records by date
                        const groupedByDate = {};
                        sortedRecords.forEach((record) => {
                          const date = new Date(record.date).toLocaleDateString(
                            "en-GB",
                          );
                          if (!groupedByDate[date]) {
                            groupedByDate[date] = [];
                          }
                          groupedByDate[date].push(record);
                        });

                        // Get courses for current filter
                        const displayCourses =
                          courseFilter === "all"
                            ? courses
                            : courses.filter((c) => c._id === courseFilter);

                        return Object.entries(groupedByDate).map(
                          ([date, records]) => (
                            <div key={date} className="ac-date-group">
                              <div className="ac-date-header">{date}</div>
                              <div className="ac-table-wrapper">
                                <table className="ac-table ac-horizontal-table">
                                  <thead>
                                    <tr>
                                      {displayCourses.map((course) => (
                                        <th key={course._id}>{course.title}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    <tr>
                                      {displayCourses.map((course) => {
                                        const record = records.find(
                                          (r) => r.course?._id === course._id,
                                        );
                                        return (
                                          <td
                                            key={course._id}
                                            className="ac-center"
                                          >
                                            {record ? (
                                              <span
                                                className={`ac-status-badge ${
                                                  record.status === "present"
                                                    ? "ac-status-present"
                                                    : "ac-status-absent"
                                                }`}
                                              >
                                                {record.status
                                                  .charAt(0)
                                                  .toUpperCase() +
                                                  record.status.slice(1)}
                                              </span>
                                            ) : (
                                              <span className="ac-no-record">
                                                -----
                                              </span>
                                            )}
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          ),
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {sortedRecords.length === 0 && courses.length > 0 && (
                  <div className="ac-empty-state">
                    <p>No attendance records found for the selected filters</p>
                  </div>
                )}
              </>
            )}

            {/* Edit Modal */}
            {showEditModal && (
              <div className="ac-modal-overlay">
                <div className="ac-modal">
                  <div className="ac-modal-header">
                    {editModalMessage && (
                      <div
                        className={`ac-modal-message ${
                          editModalMessageType === "success"
                            ? "ac-modal-message-success"
                            : "ac-modal-message-error"
                        }`}
                      >
                        <i
                          className={`fas ${
                            editModalMessageType === "success"
                              ? "fa-check-circle"
                              : "fa-exclamation-circle"
                          }`}
                        ></i>
                        <span>{editModalMessage}</span>
                      </div>
                    )}
                    <div className="ac-modal-header-title">
                      <h3>Edit Attendance Record</h3>
                      <button
                        className="ac-modal-close"
                        onClick={() => {
                          setShowEditModal(false);
                          setEditForm({
                            rollNumber: "",
                            editDate: "",
                            editCourse: "",
                          });
                          setEditStudent(null);
                          setEditAttendance(null);
                          setEditStatus("present");
                          setEditModalMessage("");
                          setEditModalMessageType("");
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  <div className="ac-modal-body">
                    {/* Step 1: Fetch Student */}
                    {!editStudent ? (
                      <>
                        <div className="ac-modal-form-group">
                          <label htmlFor="edit-roll">Roll Number</label>
                          <input
                            id="edit-roll"
                            type="text"
                            placeholder="Enter student roll number"
                            value={editForm.rollNumber}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                rollNumber: e.target.value,
                              })
                            }
                            className="ac-input"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Show Student Details */}
                        <div className="ac-modal-student-info">
                          <h4>Student Details</h4>
                          <div className="ac-modal-info-grid">
                            <div className="ac-modal-info-item">
                              <span className="ac-modal-info-label">Name:</span>
                              <span className="ac-modal-info-value">
                                {editStudent.name}
                              </span>
                            </div>
                            <div className="ac-modal-info-item">
                              <span className="ac-modal-info-label">
                                Roll Number:
                              </span>
                              <span className="ac-modal-info-value">
                                {editStudent.rollNumber}
                              </span>
                            </div>
                            <div className="ac-modal-info-item">
                              <span className="ac-modal-info-label">
                                Email:
                              </span>
                              <span className="ac-modal-info-value">
                                {editStudent.email}
                              </span>
                            </div>
                            <div className="ac-modal-info-item">
                              <span className="ac-modal-info-label">
                                Contact:
                              </span>
                              <span className="ac-modal-info-value">
                                {editStudent.contact}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Step 2: Select Date and Course */}
                        {!editAttendance && (
                          <>
                            <div className="ac-modal-form-group">
                              <label htmlFor="edit-date">Date</label>
                              <input
                                id="edit-date"
                                type="date"
                                value={editForm.editDate}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    editDate: e.target.value,
                                  })
                                }
                                className="ac-input"
                              />
                            </div>

                            <div className="ac-modal-form-group">
                              <label htmlFor="edit-course">Course</label>
                              <select
                                id="edit-course"
                                value={editForm.editCourse}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    editCourse: e.target.value,
                                  })
                                }
                                className="ac-select"
                              >
                                <option value="">Select a course</option>
                                {courses.map((course) => (
                                  <option key={course._id} value={course._id}>
                                    {course.title}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </>
                        )}

                        {/* Step 3: Show Status and Update */}
                        {editAttendance && (
                          <>
                            <div className="ac-modal-attendance-info">
                              <h4>Attendance Details</h4>
                              <div className="ac-modal-info-grid">
                                <div className="ac-modal-info-item">
                                  <span className="ac-modal-info-label">
                                    Date:
                                  </span>
                                  <span className="ac-modal-info-value">
                                    {new Date(
                                      editForm.editDate,
                                    ).toLocaleDateString()}
                                  </span>
                                </div>
                                <div className="ac-modal-info-item">
                                  <span className="ac-modal-info-label">
                                    Course:
                                  </span>
                                  <span className="ac-modal-info-value">
                                    {
                                      courses.find(
                                        (c) => c._id === editForm.editCourse,
                                      )?.title
                                    }
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="ac-modal-form-group">
                              <label>Current Status</label>
                              <div className="ac-status-display">
                                <span
                                  className={`ac-status-badge ac-status-${editStatus.toLowerCase()}`}
                                >
                                  {editStatus
                                    ? editStatus.charAt(0).toUpperCase() +
                                      editStatus.slice(1)
                                    : "N/A"}
                                </span>
                              </div>
                            </div>

                            <div className="ac-modal-form-group">
                              <label>Change Status</label>
                              <div className="ac-status-button-group">
                                <button
                                  type="button"
                                  className={`ac-status-btn ${
                                    editStatus === "present"
                                      ? "ac-status-btn-dark"
                                      : "ac-status-btn-outlined"
                                  }`}
                                  onClick={() => setEditStatus("present")}
                                >
                                  Present
                                </button>
                                <button
                                  type="button"
                                  className={`ac-status-btn ${
                                    editStatus === "absent"
                                      ? "ac-status-btn-dark"
                                      : "ac-status-btn-outlined"
                                  }`}
                                  onClick={() => setEditStatus("absent")}
                                >
                                  Absent
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </div>

                  <div className="ac-modal-footer">
                    {!editStudent ? (
                      <button
                        className="ac-btn ac-btn-primary"
                        onClick={handleFetchStudentForEdit}
                        disabled={editLoading}
                      >
                        {editLoading ? "Fetching..." : "Fetch Student"}
                      </button>
                    ) : !editAttendance ? (
                      <>
                        <button
                          className="ac-btn ac-btn-primary"
                          onClick={handleFetchAttendanceForEdit}
                          disabled={editLoading}
                        >
                          {editLoading ? "Fetching..." : "Fetch Attendance"}
                        </button>
                        <button
                          className="ac-btn ac-btn-secondary"
                          onClick={() => {
                            setEditStudent(null);
                            setEditForm({
                              rollNumber: "",
                              editDate: "",
                              editCourse: "",
                            });
                          }}
                        >
                          Back
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="ac-btn ac-btn-primary"
                          onClick={handleUpdateAttendance}
                          disabled={editLoading}
                        >
                          {editLoading ? "Updating..." : "Update"}
                        </button>
                        <button
                          className="ac-btn ac-btn-secondary"
                          onClick={() => {
                            setEditAttendance(null);
                            setEditForm({
                              ...editForm,
                              editDate: "",
                              editCourse: "",
                            });
                            setEditStatus("present");
                          }}
                        >
                          Back
                        </button>
                      </>
                    )}
                    <button
                      className="ac-btn ac-btn-secondary"
                      onClick={() => {
                        setShowEditModal(false);
                        setEditForm({
                          rollNumber: "",
                          editDate: "",
                          editCourse: "",
                        });
                        setEditStudent(null);
                        setEditAttendance(null);
                        setEditStatus("present");
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Initial Empty State */}
            {!studentData && !loading && (
              <div className="ac-empty-state ac-initial">
                <div className="ac-empty-icon">📋</div>
                <h3>No Student Selected</h3>
                <p>
                  Enter a student roll number and class to view attendance
                  records
                </p>
              </div>
            )}
          </div>
        </Sidebar>
      )}
    </>
  );
}

export default AttendanceControl;
