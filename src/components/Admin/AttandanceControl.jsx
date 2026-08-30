import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast, Toaster } from "react-hot-toast";
import { useNavigate, useLocation } from "react-router-dom";
import Sidebar from "../Sidebar";
import Footer from "../footer";
import "./AttendanceControl.css";
import { useAppContext } from "../../contextApi/AppContext";


const API_BASE = "https://api.theecportal.com/api";

function AttendanceControl({ adminLoginType = "academy" }) {
  const navigate = useNavigate();
  const location = useLocation();
   const { classOptions , students , fetchStudents } = useAppContext();
  const fromTeacher = location.state?.fromteacher || false;
  const CLASS_OPTIONS = classOptions || ["Pre-9th", "9th", "10th", "11th", "12th"];
  // Student list / table states
  
const [selectedClass, setSelectedClass] = useState(CLASS_OPTIONS.length > 0 ? CLASS_OPTIONS[0] : null);
  const [searchText, setSearchText] = useState("");

   

  // Report modal states
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportStudent, setReportStudent] = useState(null);
  const [reportStartDate, setReportStartDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [reportEndDate, setReportEndDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [reportLoading, setReportLoading] = useState(false);
  const [reportCoursesLoading, setReportCoursesLoading] = useState(false);
  const [reportRegisteredCourses, setReportRegisteredCourses] = useState([]);
  const [selectedReportCourseIds, setSelectedReportCourseIds] = useState([
    "all",
  ]);


  // Edit modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editStudent, setEditStudent] = useState(null);
  const [editForm, setEditForm] = useState({ editDate: "", editCourse: "" });
  const [editAttendance, setEditAttendance] = useState(null);
  const [editStatus, setEditStatus] = useState("present");
  const [editLoading, setEditLoading] = useState(false);
  const [editCourses, setEditCourses] = useState([]);
  const [editModalMessage, setEditModalMessage] = useState("");
  const [editModalMessageType, setEditModalMessageType] = useState("");

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const showModalMessage = (message, type) => {
    setEditModalMessage(message);
    setEditModalMessageType(type);
    setTimeout(() => {
      setEditModalMessage("");
      setEditModalMessageType("");
    }, 5000);
  };


  const studentCounts = useMemo(() => {
    return CLASS_OPTIONS?.reduce((acc, classData) => {
      acc[classData.name] = students.filter(
        (student) => student.classInfo === classData._id ||
student.classInfo?._id === classData._id,
      ).length;
      return acc;
    }, {});
  }, [students]);

  const visibleStudents = useMemo(() => {
 const byClass = students.filter(
    (student) =>
        student.classInfo === selectedClass?._id ||
        student.classInfo?._id === selectedClass?._id
);

    if (!searchText.trim()) {
      return byClass;
    }

    const query = searchText.trim().toLowerCase();
    return byClass.filter((student) => {
      const name = student.name?.toLowerCase() || "";
      const rollNumber = String(student.rollNumber || "").toLowerCase();
      return name.includes(query) || rollNumber.includes(query);
    });
  }, [students, selectedClass, searchText]);

  const normalizedReportCourses = useMemo(() => {
    const courseMap = new Map();

    reportRegisteredCourses.forEach((course) => {
      const id = String(course?._id || course?.id || "");
      if (!id) return;
      courseMap.set(id, {
        _id: id,
        title: course?.title || course?.name || "Course",
        description: course?.description || "",
      });
    });

    return Array.from(courseMap.values());
  }, [reportRegisteredCourses]);

  const isAllReportCoursesSelected = selectedReportCourseIds.includes("all");

  const toggleAllReportCourses = () => {
    setSelectedReportCourseIds((prev) =>
      prev.includes("all")
        ? []
        : ["all", ...normalizedReportCourses.map((course) => String(course._id))],
    );
  };

  const toggleReportCourse = (courseId) => {
    setSelectedReportCourseIds((prev) => {
      const filtered = prev.filter((value) => value !== "all");
      if (filtered.includes(courseId)) {
        return filtered.filter((value) => value !== courseId);
      }

      return [...filtered, courseId];
    });
  };

  const fetchTeacherCourses = async () => {
    try {
      const res = await axios.get(`${API_BASE}/attendance/myCourses`, {
        headers: getAuthHeaders(),
      });

      if (res.data?.success) {
        return res.data.courses || [];
      }
      toast.error(res.data?.message || "Failed to load courses");
      return [];
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load courses");
      return [];
    }
  };

  // ---------- Generate Report flow ----------
  const openReportModal = async (student) => {
    setReportStudent(student);
    setReportStartDate(new Date().toISOString().split("T")[0]);
    setReportEndDate(new Date().toISOString().split("T")[0]);
    setReportRegisteredCourses([]);
    setSelectedReportCourseIds(["all"]);
    setShowReportModal(true);

    setReportCoursesLoading(true);
    try {
      const response = await axios.get(
        `${API_BASE}/registration/getStudentCourses/${student._id}`,
        { headers: getAuthHeaders() },
      );

      const coursesFromApi = response.data?.courses || [];
      const aboutCourses = response.data?.aboutCourse || [];
      const mergedCourses = [
        ...coursesFromApi,
        ...aboutCourses.map((item) => item?.course).filter(Boolean),
      ].filter(Boolean);

      const uniqueCourses = Array.from(
        new Map(
          mergedCourses.map((course) => [
            String(course._id || course.id),
            course,
          ]),
        ).values(),
      );

      setReportRegisteredCourses(uniqueCourses);
    } catch (error) {
      console.error("Error loading student courses:", error);
      toast.error("Unable to load registered courses");
    } finally {
      setReportCoursesLoading(false);
    }
  };

  const closeReportModal = () => {
    setShowReportModal(false);
    setReportStudent(null);
    setReportRegisteredCourses([]);
    setSelectedReportCourseIds(["all"]);
    setReportLoading(false);
  };

  const handleGenerateReport = async () => {
    if (!reportStudent) return;

    if (
      reportStartDate &&
      reportEndDate &&
      new Date(reportStartDate) > new Date(reportEndDate)
    ) {
      toast.error("Start date cannot be after end date");
      return;
    }

    setReportLoading(true);
    try {
      const attendanceRes = await axios.get(
        `${API_BASE}/attendance/getStudentAttendance`,
        {
          headers: getAuthHeaders(),
          params: {
            studentId: reportStudent._id,
            startDate: reportStartDate,
            endDate: reportEndDate,
          },
        },
      );

      if (!attendanceRes.data?.success) {
        toast.error("Failed to fetch attendance data");
        setReportLoading(false);
        return;
      }

      let attendanceRecords = attendanceRes.data.attendance || [];
      let uniqueCourses = [
        ...new Map(
          attendanceRecords
            .filter((rec) => rec.course?._id)
            .map((rec) => [rec.course._id, rec.course]),
        ).values(),
      ];

      // Restrict to the courses picked in the modal (unless "All Courses")
      if (!isAllReportCoursesSelected) {
        if (selectedReportCourseIds.length === 0) {
          toast.error("Please select at least one course");
          setReportLoading(false);
          return;
        }
        attendanceRecords = attendanceRecords.filter((rec) =>
          selectedReportCourseIds.includes(String(rec.course?._id)),
        );
        uniqueCourses = uniqueCourses.filter((course) =>
          selectedReportCourseIds.includes(String(course._id)),
        );
      }

      let reportCourses = uniqueCourses;
      if (fromTeacher) {
        const teacherCourses = await fetchTeacherCourses();
        reportCourses = uniqueCourses.filter((course) =>
          teacherCourses.some((tc) => tc._id === course._id),
        );

        if (reportCourses.length === 0) {
          toast.error("This student is not registered in your courses");
          setReportLoading(false);
          return;
        }
      }

      toast.success("Attendance data loaded");
      closeReportModal();
      navigate("/admin/attendance-report", {
        state: {
          studentData: reportStudent,
          attendanceRecords,
          courses: reportCourses,
          startDate: reportStartDate,
          endDate: reportEndDate,
          fromTeacher,
        },
      });
    } catch (error) {
      console.error("Error fetching attendance:", error);
      toast.error(
        error.response?.data?.message || "Failed to fetch attendance data",
      );
    } finally {
      setReportLoading(false);
    }
  };

  // ---------- Edit flow ----------
  const openEditModal = async (student) => {
    setEditStudent(student);
    setEditForm({ editDate: "", editCourse: "" });
    setEditAttendance(null);
    setEditStatus("present");
    setEditModalMessage("");
    setEditModalMessageType("");
    setShowEditModal(true);

    setEditLoading(true);
    try {
      const coursesRes = await axios.get(`${API_BASE}/courses/allCourses`, {
        headers: getAuthHeaders(),
      });

      if (coursesRes.data?.success && coursesRes.data?.courses) {
        setEditCourses(coursesRes.data.courses);
      }
    } catch (courseError) {
      console.error("Error fetching courses:", courseError);
    } finally {
      setEditLoading(false);
    }
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditStudent(null);
    setEditForm({ editDate: "", editCourse: "" });
    setEditAttendance(null);
    setEditStatus("present");
    setEditModalMessage("");
    setEditModalMessageType("");
  };

  const handleFetchAttendanceForEdit = async () => {
    if (!editStudent) return;

    if (!editForm.editDate || !editForm.editCourse) {
      showModalMessage("Please select date and course", "error");
      return;
    }

    setEditLoading(true);
    try {
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
        setEditLoading(false);
        return;
      }

      setEditAttendance(attendance);
      setEditStatus(attendance.status || "present");
      showModalMessage("Attendance record loaded", "success");
    } catch (error) {
      console.error("Error fetching attendance for edit:", error);
      showModalMessage(
        error.response?.data?.message || "Failed to fetch attendance",
        "error",
      );
    } finally {
      setEditLoading(false);
    }
  };

  const handleUpdateAttendance = async () => {
    if (!editAttendance) {
      showModalMessage("No attendance record selected", "error");
      return;
    }

    setEditLoading(true);
    try {
      const response = await axios.post(
        `${API_BASE}/attendance/updateAttendance/${editAttendance._id}`,
        { status: editStatus },
        { headers: getAuthHeaders() },
      );

      if (response.data?.success) {
        showModalMessage("Attendance updated successfully", "success");
        setTimeout(() => {
          closeEditModal();
        }, 1200);
      }
    } catch (error) {
      console.error("Error updating attendance:", error);
      showModalMessage(
        error.response?.data?.message || "Failed to update attendance",
        "error",
      );
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <Sidebar>
      <div className="ac-page py-3 py-lg-4">
        <Toaster
          position="top-right"
          toastOptions={{ style: { zIndex: 99999 } }}
        />

        <div className="ac-shell p-3 p-lg-4 mb-3">
          <div className="ac-header">
            <div>
              <h1 className="ac-title">Student Attendance Report</h1>
              <p className="ac-subtitle">
                Pick a class, search a student, and generate or edit attendance
                records.
              </p>
            </div>
            <div className="ac-badge">{students.length} Students</div>
          </div>

          <div className="ac-count-grid">
            {CLASS_OPTIONS.map((classData) => (
              <div
                key={classData._id || classData.name}
                className={`ac-class-card ${
                  selectedClass?._id === classData._id ? "active" : ""
                }`}
                role="button"
                tabIndex={0}
               onClick={() => setSelectedClass(classData)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedClass(classData.name);
                  }
                }}
              >
                <div className="ac-class-label">Class</div>
                <div className="ac-class-name">{classData.name}</div>
                <div className="ac-class-count">
                  {studentCounts[classData.name] || 0}
                </div>
              </div>
            ))}
          </div>

          <div className="ac-table-card">
            <div className="ac-table-head">
              <div>
                <h2 className="ac-table-title"><h2>{selectedClass?.name} Students</h2></h2>
                <div className="text-muted small">
                  {visibleStudents.length} of {studentCounts[selectedClass?.name] || 0}{" "}
                  students shown
                </div>
              </div>

              <div className="ac-search-wrap">
                <i className="fa-solid fa-magnifying-glass ac-search-icon" />
                <input
                  type="text"
                  className="form-control ac-search-input"
                  placeholder="Search by student name or roll number"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </div>
            </div>

            <div className="table-responsive">
              <table className="table align-middle ac-student-table">
                <thead>
                  <tr>
                    <th>Roll Number</th>
                    <th>Name</th>
                    <th>Class</th>
                    <th>Gender</th>
                    <th>Contact</th>
                    <th className="text-end">Action</th>
                  </tr>
                </thead>
                <tbody>
                  { visibleStudents.length ? (
                    visibleStudents.map((student) => (
                      <tr key={student._id}>
                        <td>
                          <span className="ac-badge">
                            {student.rollNumber || "N/A"}
                          </span>
                        </td>
                        <td className="fw-semibold">
                          {student.name || "Unnamed Student"}
                        </td>
                        <td>{classOptions.find((cls) => cls._id === student.classInfo)?.name || "-"}</td>
                        <td>{student.gender || "-"}</td>
                        <td>{student.contact || "-"}</td>
                        <td className="text-end">
                          <div className="ac-row-actions">
                            <button
                              type="button"
                              className="btn btn-dark"
                              onClick={() => openReportModal(student)}
                            >
                              Generate Report
                            </button>
                            {!fromTeacher && (
                              <button
                                type="button"
                                className="btn btn-outline-dark"
                                onClick={() => openEditModal(student)}
                              >
                                Edit
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center py-4 text-muted">
                        No students found for the selected class.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Generate Report Modal */}
        {showReportModal && reportStudent && (
          <div className="ac-modal-backdrop" onClick={closeReportModal}>
            <div
              className="ac-modal-box ac-modal-box-wide"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="ac-modal-box-head">
                <div>
                  <h3 className="ac-modal-box-title">Generate Attendance Report</h3>
                  <div className="text-muted small">
                    {reportStudent.name} • {reportStudent.rollNumber}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={closeReportModal}
                >
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>

              <div className="ac-modal-box-body">
                <div className="ac-modal-card mb-3">
                  <div className="ac-course-card-head">
                    <div>
                      <div className="ac-course-card-title">Registered Courses</div>
                      <div className="text-muted small">
                        Select the courses to include in the report. Choose All
                        Courses to include every registered subject.
                      </div>
                    </div>
                    <span className="ac-badge">
                      {normalizedReportCourses.length} Courses
                    </span>
                  </div>

                  {reportCoursesLoading ? (
                    <div className="text-center py-4">Loading courses...</div>
                  ) : normalizedReportCourses.length ? (
                    <div className="ac-course-list">
                      <label
                        className={`ac-course-option ${
                          isAllReportCoursesSelected ? "active" : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isAllReportCoursesSelected}
                          onChange={toggleAllReportCourses}
                        />
                        <div>
                          <div className="ac-course-name">All Courses</div>
                          <div className="ac-course-meta">
                            Include every registered course in the report
                          </div>
                        </div>
                      </label>

                      {normalizedReportCourses.map((course) => {
                        const courseId = String(course._id);
                        const checked =
                          selectedReportCourseIds.includes(courseId) ||
                          isAllReportCoursesSelected;

                        return (
                          <label
                            key={courseId}
                            className={`ac-course-option ${
                              checked ? "active" : ""
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleReportCourse(courseId)}
                            />
                            <div>
                              <div className="ac-course-name">{course.title}</div>
                              {course.description ? (
                                <div className="ac-course-meta">
                                  {course.description}
                                </div>
                              ) : null}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="alert alert-info mb-0 mt-3">
                      No registered courses found for this student.
                    </div>
                  )}
                </div>

                <div className="ac-date-grid">
                  <div className="ac-date-field">
                    <label>Start Date</label>
                    <input
                      type="date"
                      value={reportStartDate}
                      onChange={(e) => setReportStartDate(e.target.value)}
                    />
                  </div>
                  <div className="ac-date-field">
                    <label>End Date</label>
                    <input
                      type="date"
                      value={reportEndDate}
                      onChange={(e) => setReportEndDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="ac-modal-box-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={closeReportModal}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleGenerateReport}
                  disabled={reportLoading}
                >
                  {reportLoading ? "Loading..." : "Generate"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && editStudent && (
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
                  <button className="ac-modal-close" onClick={closeEditModal}>
                    ✕
                  </button>
                </div>
              </div>

              <div className="ac-modal-body">
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
                      <span className="ac-modal-info-label">Roll Number:</span>
                      <span className="ac-modal-info-value">
                        {editStudent.rollNumber}
                      </span>
                    </div>
                    <div className="ac-modal-info-item"></div>
                    <div className="ac-modal-info-item">
                      <span className="ac-modal-info-label">Contact:</span>
                      <span className="ac-modal-info-value">
                        {editStudent.contact}
                      </span>
                    </div>
                  </div>
                </div>

                {!editAttendance && (
                  <>
                    <div className="ac-modal-form-group">
                      <label htmlFor="edit-date">Date</label>
                      <input
                        id="edit-date"
                        type="date"
                        value={editForm.editDate}
                        onChange={(e) =>
                          setEditForm({ ...editForm, editDate: e.target.value })
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
                        {editCourses.map((course) => (
                          <option key={course._id} value={course._id}>
                            {course.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {editAttendance && (
                  <>
                    <div className="ac-modal-attendance-info">
                      <h4>Attendance Details</h4>
                      <div className="ac-modal-info-grid">
                        <div className="ac-modal-info-item">
                          <span className="ac-modal-info-label">Date:</span>
                          <span className="ac-modal-info-value">
                            {new Date(editForm.editDate).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="ac-modal-info-item">
                          <span className="ac-modal-info-label">Course:</span>
                          <span className="ac-modal-info-value">
                            {
                              editCourses.find(
                                (c) => c._id === editForm.editCourse,
                              )?.title
                            }
                          </span>
                        </div>
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
                        <button
                          type="button"
                          className={`ac-status-btn ${
                            editStatus === "onLeave"
                              ? "ac-status-btn-dark"
                              : "ac-status-btn-outlined"
                          }`}
                          onClick={() => setEditStatus("onLeave")}
                        >
                          On Leave
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="ac-modal-footer">
                {!editAttendance ? (
                  <button
                    className="ac-btn ac-btn-primary"
                    onClick={handleFetchAttendanceForEdit}
                    disabled={editLoading}
                  >
                    {editLoading ? "Fetching..." : "Fetch Attendance"}
                  </button>
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
                        setEditForm({ ...editForm, editDate: "", editCourse: "" });
                        setEditStatus("present");
                      }}
                    >
                      Back
                    </button>
                  </>
                )}
                <button className="ac-btn ac-btn-secondary" onClick={closeEditModal}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <Footer />
      </div>
    </Sidebar>
  );
}

export default AttendanceControl;