import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Toaster, toast } from "react-hot-toast";
import Sidebar from "../Sidebar";
import "./Attandance.css";

function ViewAttandance() {
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedClassInfo, setSelectedClassInfo] = useState("");
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const API_BASE = "https://ec-backend-phi.vercel.app/api/attendance";

  const getLocalToday = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const selectedDate = useMemo(() => getLocalToday(), []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const currentTeacherId = useMemo(() => {
    const token = localStorage.getItem("token");
    if (!token) return "";

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return String(payload?.id || "");
    } catch {
      return "";
    }
  }, []);

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

  const selectedCourse = useMemo(
    () =>
      courses.find((course) => String(course._id) === String(selectedCourseId)),
    [courses, selectedCourseId],
  );

  const selectedCourseClasses = useMemo(() => {
    if (!selectedCourse) return [];

    const assignmentClasses = Array.isArray(selectedCourse.assignments)
      ? selectedCourse.assignments
          .filter(
            (item) =>
              !currentTeacherId ||
              String(item?.teacher?._id || item?.teacher) === currentTeacherId,
          )
          .flatMap((item) => item?.targetClasses || item?.classes || [])
      : [];

    return [...new Set(assignmentClasses.filter(Boolean))];
  }, [selectedCourse, currentTeacherId]);

  const averagePercentage = useMemo(() => {
    if (!students.length) return 0;
    const total = students.reduce(
      (acc, student) => acc + Number(student.percentage || 0),
      0,
    );
    return Math.round(total / students.length);
  }, [students]);

  const fetchCourses = async () => {
    setLoadingCourses(true);
    try {
      const res = await axios.get(`${API_BASE}/myCourses`, {
        headers: getAuthHeaders(),
      });

      if (res.data?.success) {
        setCourses(res.data.courses || []);
      } else {
        toast.error(res.data?.message || "Failed to load courses");
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to load courses."));
    } finally {
      setLoadingCourses(false);
    }
  };

  const fetchStudentPercentages = async (courseId, classInfo) => {
    if (!courseId || !classInfo) return;
    setLoadingStudents(true);

    try {
      const res = await axios.get(`${API_BASE}/session`, {
        params: {
          courseId,
          classInfo,
          date: selectedDate,
        },
        headers: getAuthHeaders(),
      });

      if (res.data?.success) {
        setStudents(res.data.students || []);
      } else {
        toast.error(res.data?.message || "Failed to load students");
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to load student attendance."));
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (!selectedCourseId) {
      setSelectedClassInfo("");
      setStudents([]);
      return;
    }

    const firstClass = selectedCourseClasses[0] || "";
    setSelectedClassInfo(firstClass);
    setStudents([]);

    if (firstClass) {
      fetchStudentPercentages(selectedCourseId, firstClass);
    }
  }, [selectedCourseId, selectedCourseClasses]);

  const handleClassChange = async (event) => {
    const classInfo = event.target.value;
    setSelectedClassInfo(classInfo);
    setStudents([]);

    if (selectedCourseId && classInfo) {
      await fetchStudentPercentages(selectedCourseId, classInfo);
    }
  };

  return (
    <Sidebar>
      <Toaster position="top-right" />

      <div className="attendance-page mt-3 mt-lg-4">
        <div className="container-fluid px-0 px-lg-2">
          <div className="attendance-hero mb-4">
            <p className="mb-1 text-white-50 fw-semibold">Teacher Attendance</p>
            <h3 className="mb-2">View class-wise attendance percentage</h3>
            <p className="mb-0 text-white-75">
              Choose your course, choose class, then see each student attendance
              percentage.
            </p>
          </div>

          <div className="row g-4">
            <div className="col-12 col-xl-4">
              <div className="attendance-card p-3 p-md-4 h-100">
                <h5 className="attendance-section-title mb-3">Filters</h5>

                <div className="attendance-form">
                  <div className="mb-3">
                    <label>Course</label>
                    <select
                      className="form-select"
                      value={selectedCourseId}
                      onChange={(e) => setSelectedCourseId(e.target.value)}
                      disabled={loadingCourses}
                    >
                      <option value="">Select course</option>
                      {courses.map((course) => (
                        <option key={course._id} value={course._id}>
                          {course.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label>Class</label>
                    <select
                      className="form-select"
                      value={selectedClassInfo}
                      onChange={handleClassChange}
                      disabled={!selectedCourseId}
                    >
                      <option value="">Select class</option>
                      {selectedCourseClasses.map((classInfo) => (
                        <option key={classInfo} value={classInfo}>
                          {classInfo}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="attendance-stats mt-4">
                    <div className="attendance-stat">
                      <span>Students</span>
                      <strong>{students.length}</strong>
                    </div>
                    <div className="attendance-stat">
                      <span>Avg %</span>
                      <strong>{averagePercentage}%</strong>
                    </div>
                    <div className="attendance-stat">
                      <span>Course</span>
                      <strong>{selectedCourse?.title || "-"}</strong>
                    </div>
                    <div className="attendance-stat">
                      <span>Class</span>
                      <strong>{selectedClassInfo || "-"}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-xl-8">
              <div className="attendance-card p-3 p-md-4 h-100">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="attendance-section-title mb-0">
                    Student list
                  </h5>
                  <div className="text-muted small">
                    {loadingStudents
                      ? "Loading students..."
                      : `${students.length} records`}
                  </div>
                </div>

                {students.length === 0 ? (
                  <div className="attendance-empty">
                    {selectedCourseId && selectedClassInfo
                      ? "No students found for selected class."
                      : "Select course and class to view attendance."}
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="attendance-student-table">
                      <thead>
                        <tr>
                          <th>Roll</th>
                          <th>Student</th>
                          <th>Contact</th>
                          <th>Attendance %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((student) => {
                          const percentage = Math.round(
                            Number(student.percentage || 0),
                          );
                          return (
                            <tr key={student._id}>
                              <td>
                                <div className="fw-semibold">
                                  {student.rollNumber || "-"}
                                </div>
                                <div className="text-muted small">
                                  {student.classInfo || "-"}
                                </div>
                              </td>
                              <td>
                                <div className="fw-semibold">
                                  {student.name}
                                </div>
                                <div className="text-muted small">
                                  {student.email || "-"}
                                </div>
                              </td>
                              <td>{student.contact || "-"}</td>
                              <td>
                                <div className="d-flex justify-content-between align-items-center mb-1 small text-muted">
                                  <span>Attendance</span>
                                  <span>{percentage}%</span>
                                </div>
                                <div
                                  className="progress"
                                  style={{ height: 8, borderRadius: 999 }}
                                >
                                  <div
                                    className={`progress-bar ${percentage < 90 ? "bg-danger" : "bg-success"}`}
                                    role="progressbar"
                                    aria-valuenow={percentage}
                                    aria-valuemin="0"
                                    aria-valuemax="100"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Sidebar>
  );
}

export default ViewAttandance;
