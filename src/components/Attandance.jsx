import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Toaster, toast } from "react-hot-toast";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import "./Attandance.css";

function Attandance() {
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedClassInfo, setSelectedClassInfo] = useState("");

  const getLocalToday = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [selectedDate, setSelectedDate] = useState(getLocalToday());
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMap, setStatusMap] = useState({});

  const API_BASE = "https://ec-backend-phi.vercel.app/api/attendance";

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
      : Array.isArray(selectedCourse.classTarget)
        ? selectedCourse.classTarget
            .filter(
              (item) =>
                !currentTeacherId ||
                String(item?.teacher?._id || item?.teacher) ===
                  currentTeacherId,
            )
            .flatMap((item) => item?.classes || [])
        : [];

    const directClasses = Array.isArray(selectedCourse.classes)
      ? selectedCourse.classes
      : [];

    return [
      ...new Set([...directClasses, ...assignmentClasses].filter(Boolean)),
    ];
  }, [selectedCourse, currentTeacherId]);

  const presentCount = useMemo(
    () =>
      students.filter((student) => statusMap[student._id] === "present").length,
    [students, statusMap],
  );

  const absentCount = useMemo(
    () =>
      students.filter((student) => statusMap[student._id] === "absent").length,
    [students, statusMap],
  );

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

  const fetchSession = async (courseId, classInfo, dateValue) => {
    if (!courseId || !classInfo || !dateValue) return;
    setLoadingStudents(true);
    try {
      const res = await axios.get(`${API_BASE}/session`, {
        params: {
          courseId,
          classInfo,
          date: dateValue,
        },
        headers: getAuthHeaders(),
      });

      if (res.data?.success) {
        setStudents(res.data.students || []);
        const nextMap = {};
        (res.data.students || []).forEach((student) => {
          if (student.status) {
            nextMap[student._id] = student.status;
          }
        });
        setStatusMap(nextMap);
      } else {
        toast.error(res.data?.message || "Failed to load attendance session");
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to load students."));
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
      setStatusMap({});
      return;
    }

    const nextClass = selectedCourseClasses[0] || "";
    setSelectedClassInfo(nextClass);
    setStudents([]);
    setStatusMap({});

    if (nextClass) {
      fetchSession(selectedCourseId, nextClass, selectedDate);
    }
  }, [selectedCourseId, selectedCourseClasses]);

  useEffect(() => {
    if (selectedCourseId && selectedClassInfo && selectedDate) {
      fetchSession(selectedCourseId, selectedClassInfo, selectedDate);
    }
  }, [selectedDate]);

  const handleCourseChange = (event) => {
    const courseId = event.target.value;
    setSelectedCourseId(courseId);
    setSelectedClassInfo("");
    setStudents([]);
    setStatusMap({});
  };

  const handleClassChange = async (event) => {
    const classInfo = event.target.value;
    setSelectedClassInfo(classInfo);
    setStudents([]);
    setStatusMap({});
    if (selectedCourseId && classInfo) {
      await fetchSession(selectedCourseId, classInfo, selectedDate);
    }
  };

  const handleStatusChange = (studentId, status) => {
    setStatusMap((prev) => ({ ...prev, [studentId]: status }));
  };

  const handleSave = async () => {
    if (!selectedCourseId || !selectedClassInfo || !selectedDate) {
      toast.error("Please select course, class and date");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        courseId: selectedCourseId,
        classInfo: selectedClassInfo,
        date: selectedDate,
        studentStatuses: students.map((student) => ({
          studentId: student._id,
          status: statusMap[student._id] || "absent",
        })),
      };

      const res = await axios.post(`${API_BASE}/markAttendance`, payload, {
        headers: getAuthHeaders(),
      });

      if (res.data?.success) {
        toast.success(res.data?.message || "Attendance saved");
      } else {
        toast.error(res.data?.message || "Failed to save attendance");
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to save attendance."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sidebar>
      <Toaster position="top-right" />
      <div className="attendance-page mt-3 mt-lg-4">
        <div className="container-fluid px-0 px-lg-2">
          <div className="attendance-hero mb-4">
            <div className="d-flex flex-column flex-lg-row justify-content-between gap-3 align-items-start align-items-lg-center">
              <div>
                <p className="mb-1 text-white-50 fw-semibold">
                  Teacher Attendance
                </p>
                <h3 className="mb-2">Mark present and absent students</h3>
                <p className="mb-0 text-white-75">
                  Select a registered course, filter its class and save
                  attendance for the chosen date.
                </p>
              </div>
              <div
                className="attendance-card bg-white text-dark p-3"
                style={{ minWidth: 240 }}
              >
                <div className="small text-muted">Selected course</div>
                <div className="fw-bold">{selectedCourse?.title || "None"}</div>
                <div className="small text-muted mt-2">Selected class</div>
                <div className="fw-bold">{selectedClassInfo || "None"}</div>
              </div>
            </div>
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
                      onChange={handleCourseChange}
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

                  <div className="mb-4">
                    <label>Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      disabled
                    />
                  </div>

                  <div className="attendance-stats mb-4">
                    <div className="attendance-stat">
                      <span>Students</span>
                      <strong>{students.length}</strong>
                    </div>
                    <div className="attendance-stat">
                      <span>Present</span>
                      <strong>{presentCount}</strong>
                    </div>
                    <div className="attendance-stat">
                      <span>Absent</span>
                      <strong>{absentCount}</strong>
                    </div>
                    <div className="attendance-stat">
                      <span>Status</span>
                      <strong>{selectedDate || "-"}</strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-success w-100 rounded-pill"
                    onClick={handleSave}
                    disabled={saving || !students.length}
                  >
                    {saving ? "Saving..." : "Save Attendance"}
                  </button>
                </div>
              </div>
            </div>

            <div className="col-12 col-xl-8">
              <div className="attendance-card p-3 p-md-4 h-100">
                <div className="d-flex flex-column flex-md-row justify-content-between gap-2 mb-3">
                  <div>
                    <h5 className="attendance-section-title mb-1">
                      Student list
                    </h5>
                    <p className="text-muted mb-0">
                      {selectedCourseId && selectedClassInfo
                        ? "Mark each student's attendance below."
                        : "Choose a course and class to load students."}
                    </p>
                  </div>
                  <div className="text-muted small align-self-md-end">
                    {loadingStudents
                      ? "Loading students..."
                      : `${students.length} records`}
                  </div>
                </div>

                {students.length === 0 ? (
                  <div className="attendance-empty">
                    {selectedCourseId && selectedClassInfo
                      ? "No registered students found for the selected class."
                      : "Attendance list will appear here after selecting course and class."}
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="attendance-student-table">
                      <thead>
                        <tr>
                          <th>Roll</th>
                          <th>Student</th>
                          <th>Contact</th>
                          <th>Attendance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((student) => (
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
                              <div className="fw-semibold">{student.name}</div>
                              <div className="text-muted small">
                                {student.email || "-"}
                              </div>
                              <div className="mt-2">
                                <div className="d-flex justify-content-between align-items-center mb-1 small text-muted">
                                  <span>Attendance</span>
                                  <span>
                                    {Number(student.percentage || 0)}%
                                  </span>
                                </div>
                                <div
                                  className="progress"
                                  style={{ height: 8, borderRadius: 999 }}
                                >
                                  <div
                                    className={`progress-bar ${Number(student.percentage || 0) < 90 ? "bg-danger" : "bg-success"}`}
                                    role="progressbar"
                                    aria-valuenow={Number(
                                      student.percentage || 0,
                                    )}
                                    aria-valuemin="0"
                                    aria-valuemax="100"
                                    style={{
                                      width: `${Number(student.percentage || 0)}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td>
                              <div>{student.contact || "-"}</div>
                              <div className="text-muted small">
                                {student.fatherName || ""}
                              </div>
                            </td>
                            <td>
                              <div className="attendance-radio-group">
                                <label className="attendance-radio-pill">
                                  <input
                                    type="radio"
                                    name={`attendance-${student._id}`}
                                    checked={
                                      statusMap[student._id] === "present"
                                    }
                                    onChange={() =>
                                      handleStatusChange(student._id, "present")
                                    }
                                  />
                                  Present
                                </label>
                                <label className="attendance-radio-pill">
                                  <input
                                    type="radio"
                                    name={`attendance-${student._id}`}
                                    checked={
                                      statusMap[student._id] === "absent"
                                    }
                                    onChange={() =>
                                      handleStatusChange(student._id, "absent")
                                    }
                                  />
                                  Absent
                                </label>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="attendance-sticky-actions mt-4">
            <div className="attendance-card p-3 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
              <div>
                <div className="fw-semibold">Quick summary</div>
                <div className="text-muted small">
                  {selectedCourse?.title || "No course selected"}{" "}
                  {selectedClassInfo ? `• ${selectedClassInfo}` : ""}
                </div>
              </div>
              <button
                type="button"
                className="btn btn-dark rounded-pill px-4"
                onClick={handleSave}
                disabled={saving || !students.length}
              >
                {saving ? "Saving..." : "Submit Attendance"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Sidebar>
  );
}

export default Attandance;
