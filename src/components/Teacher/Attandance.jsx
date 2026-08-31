import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Toaster, toast } from "react-hot-toast";
import Sidebar from "../Sidebar";
import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import TopBar from "../TopBar";
import Footer from "../footer";
import "./Attandance.css";
import { useAppContext } from "../../contextApi/AppContext";
function Attandance() {
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedClassInfo, setSelectedClassInfo] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const {classOptions}= useAppContext();
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
  const [topic, setTopic] = useState("");
  const [leavesMap, setLeavesMap] = useState({});
  const [loadingLeaves, setLoadingLeaves] = useState(false);
  // Tracks whether the currently selected course/class/date combo has been fetched
  const [hasFetched, setHasFetched] = useState(false);

  const courseIdFromState = location.state?.courseId || "";
  const directClassInfoFromState = location.state?.classInfo || "";
  const directDateFromState = location.state?.date || "";

  useEffect(() => {
    if (courseIdFromState) {
      setSelectedCourseId(courseIdFromState);
    }
    if (directClassInfoFromState) {
      console.log(
        "Setting direct class info from state:",
        directClassInfoFromState,
      );
      setSelectedClassInfo(directClassInfoFromState);
    }
    if (directDateFromState) {
      setSelectedDate(directDateFromState);
    }
  }, [courseIdFromState, directClassInfoFromState, directDateFromState]);

  const API_BASE = "https://api.theecportal.com/api/attendance";

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
    if (directClassInfoFromState) {
      return [directClassInfoFromState];
    }

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

  // Students who are on approved leave are excluded from bulk present/absent actions
  const markableStudents = useMemo(
    () => students.filter((student) => !leavesMap[student._id]),
    [students, leavesMap],
  );

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

  // Header bulk-select state: whether every markable student currently shares that status
  const allMarkedPresent = useMemo(
    () =>
      markableStudents.length > 0 &&
      markableStudents.every((student) => statusMap[student._id] === "present"),
    [markableStudents, statusMap],
  );

  const allMarkedAbsent = useMemo(
    () =>
      markableStudents.length > 0 &&
      markableStudents.every((student) => statusMap[student._id] === "absent"),
    [markableStudents, statusMap],
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
    const isTodaySunday = () => {
      const todayCheck = new Date();
      return todayCheck.getDay() === 0;
    };

    if (isTodaySunday()) {
      toast.error("Today is Sunday. No attendance required.");
      return;
    }
    setLoadingStudents(true);
    try {
      const res = await axios.get(`${API_BASE}/session`, {
        params: {
          courseId,
          classInfo,
          date: dateValue,
          fetchedBy: "teacherForMarkAttendance",
        },
        headers: getAuthHeaders(),
      });

      if (res.data?.success) {
         // Fetch leaves in parallel (don't await - let it happen in background)
        if (res.data.students && res.data.students.length > 0) {
          fetchStudentLeaves(res.data.students, dateValue);
        }
        setStudents(res.data.students || []);
        setTopic(String(res.data?.topic || ""));
        const nextMap = {};
        (res.data.students || []).forEach((student) => {
          if (student.status) {
            nextMap[student._id] = student.status;
          }
        });
        setStatusMap(nextMap);
        setHasFetched(true);
      } else {
        toast.error(res.data?.message || "Failed to load attendance session");
      }
    } catch (error) {
      setStudents([]);
      setStatusMap({});
      toast.error(getErrorMessage(error, "Unable to load students."));
    } finally {
      setLoadingStudents(false);
    }
  };

  const fetchStudentLeaves = async (studentList, dateValue) => {
    setLoadingLeaves(true);
    try {
      const studentIds = studentList.map((s) => s._id);
      const res = await axios.post(
        `https://api.theecportal.com/api/leave/checkStudentLeaves`,
        {
          studentIds,
          date: dateValue,
        },
        {
          headers: getAuthHeaders(),
        },
      );

      if (res.data?.success) {
        const nextLeavesMap = {};
        console.log("Received leaves data:", res.data.leaves);
        (res.data.leaves || []).forEach((leave) => {
          if (leave.status === "Approved") {
            nextLeavesMap[leave.studentId] = true;
          }
        });
        console.log("Leaves map:", nextLeavesMap);
        setLeavesMap(nextLeavesMap);
      }
    } catch (error) {
      console.error("Error checking leaves:", error);
      // Silently fail - don't block the main attendance flow
      setLeavesMap({});
    } finally {
      setLoadingLeaves(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  // Only picks a default class + resets state. Does NOT call the API anymore.
  useEffect(() => {
    if (!selectedCourseId) {
      setSelectedClassInfo("");
      setStudents([]);
      setStatusMap({});
      setLeavesMap({});
      setTopic("");
      setHasFetched(false);
      return;
    }

    const nextClass = selectedCourseClasses[0] || "";
    setSelectedClassInfo(nextClass);
    setStudents([]);
    setStatusMap({});
    setLeavesMap({});
    setTopic("");
    setHasFetched(false);
  }, [selectedCourseId, selectedCourseClasses]);

  // NOTE: the old "auto fetch on date change" effect has been removed on purpose.
  // Fetching now only happens when the user clicks "Fetch Students".

  const handleCourseChange = (event) => {
    const courseId = event.target.value;
    setSelectedCourseId(courseId);
    setSelectedClassInfo("");
    setStudents([]);
    setStatusMap({});
    setTopic("");
    setHasFetched(false);
  };

  const handleClassChange = (event) => {
    const classInfo = event.target.value;
    console.log("Selected class:", classInfo);
    setSelectedClassInfo(classInfo);
    setStudents([]);
    setStatusMap({});
    setLeavesMap({});
    setTopic("");
    setHasFetched(false);
  };

  const handleDateChange = (event) => {
    setSelectedDate(event.target.value);
    setStudents([]);
    setStatusMap({});
    setLeavesMap({});
    setTopic("");
    setHasFetched(false);
  };

  // Triggered only by the "Fetch Students" button
  const handleFetchStudents = () => {
    if (!selectedCourseId || !selectedClassInfo || !selectedDate) {
      toast.error("Please select course, class and date first");
      return;
    }
    fetchSession(selectedCourseId, selectedClassInfo, selectedDate);
  };

  const handleStatusChange = (studentId, status) => {
    setStatusMap((prev) => ({ ...prev, [studentId]: status }));
  };

  // Bulk action: mark every eligible (non-leave) student present/absent in one click
  const handleMarkAll = (status) => {
    setStatusMap((prev) => {
      const next = { ...prev };
      markableStudents.forEach((student) => {
        next[student._id] = status;
      });
      return next;
    });
    toast.success(
      status === "present"
        ? "All students marked present"
        : "All students marked absent",
    );
  };

  const handleSave = async () => {
    if (!selectedCourseId || !selectedClassInfo || !selectedDate) {
      toast.error("Please select course, class and date");
      return;
    }

    if (!String(topic).trim()) {
      toast.error("Please enter topic");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        courseId: selectedCourseId,
        classInfo: selectedClassInfo,
        date: selectedDate,
        topic: String(topic).trim(),
        studentStatuses: students.map((student) => ({
          studentId: student._id,
          status: statusMap[student._id] || "onLeave",
        })),
      };

      const res = await axios.post(`${API_BASE}/markAttendance`, payload, {
        headers: getAuthHeaders(),
      });

      if (res.data?.success) {
        toast.success(res.data?.message || "Attendance saved");
        setTimeout(() => {
          navigate("/teacherPanel");
        }, 1000);
      } else {
        toast.error(res.data?.message || "Failed to save attendance");
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to save attendance."));
    } finally {
      setSaving(false);
    }
  };

  const canFetch =
    Boolean(selectedCourseId) && Boolean(selectedClassInfo) && Boolean(selectedDate);

  return (
    <Sidebar>
      <Toaster position="top-right" />
      <div className="attendance-page mt-3 mt-lg-4">
        <div className="container-fluid px-0 px-lg-2">
          <div
            className="attendance-hero mb-3"
            style={{
              backgroundColor: "#ffffff",
              padding: "1rem",
              borderRadius: "0.5rem",
              border: "1px solid #e2e8f0",
            }}
          >
            <p className="mb-1 text-secondary fw-semibold">
              Teacher Attendance
            </p>
            <h3 className="mb-2">Mark present and absent students</h3>
            <p className="mb-0 text-muted">
              Select a registered course, filter its class and save attendance
              for the chosen date.
            </p>
          </div>

          <div className="row g-4">
            <div className="col-12 col-xl-4">
              <div className="attendance-card p-3 p-md-4 h-100">
                <h5 className="attendance-section-title mb-3">Filters</h5>

                <div className="attendance-form">
                  <div className="row g-2 mb-3">
                    <div className="col-6">
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

                   <div className="col-6">
  <label>Class</label>
  <select
    className="form-select"
    value={selectedClassInfo}
    onChange={handleClassChange}
    disabled={!selectedCourseId}
  >
    <option value="">Select class</option>

    {selectedCourseClasses.map((classId) => {
      const classData = classOptions.find(
        (cls) => String(cls._id) === String(classId)
      );
      console.log("Rendering class option:", classId, classData);

      return (
        <option key={classId} value={classId}>
          {classData?.name || "Unknown Class"}
        </option>
      );
    })}
  </select>
</div>
                  </div>

               <div className="row g-3 mb-3 align-items-end">
  <div className="col-md-6">
    <label className="form-label fw-semibold">Date</label>
    <input
      type="date"
      className="form-control"
      value={selectedDate}
      onChange={handleDateChange}
    />
  </div>

  <div className="col-md-6 d-grid">
    <button
      type="button"
      className="btn btn-dark w-100 "
     style={{height:"45px", borderRadius:"12px"}}
      onClick={handleFetchStudents}
      disabled={!canFetch || loadingStudents}
    >
      {loadingStudents ? "Fetching..." : "Fetch Students"}
    </button>
  </div>
</div>

                  <div className="row g-2 mb-3">
                
                    
                    <div className="col-12">
                      <label>Topic</label>
                      <input
                        type="text"
                        className="form-control"
                        value={topic}
                        placeholder="Enter lecture topic"
                        onChange={(e) => setTopic(e.target.value)}
                        disabled={!selectedCourseId || !selectedClassInfo || !selectedDate || students.length === 0}
                      />
                    </div>
                  </div>

                  <div className="row g-2 mb-4">
                    <div className="col-6">
                      <div
                        className="attendance-card p-2"
                        style={{ textAlign: "center" }}
                      >
                        <div className="small text-muted">Total Students</div>
                        <strong style={{ fontSize: "1.4rem" }}>
                          {students.length}
                        </strong>
                      </div>
                    </div>
                    <div className="col-6">
                      <div
                        className="attendance-card p-2"
                        style={{ textAlign: "center" }}
                      >
                        <div className="small text-muted">Present</div>
                        <strong
                          style={{ fontSize: "1.4rem", color: "#10b981" }}
                        >
                          {presentCount}
                        </strong>
                      </div>
                    </div>
                    <div className="col-6">
                      <div
                        className="attendance-card p-2"
                        style={{ textAlign: "center" }}
                      >
                        <div className="small text-muted">Absent</div>
                        <strong
                          style={{ fontSize: "1.4rem", color: "#ef4444" }}
                        >
                          {absentCount}
                        </strong>
                      </div>
                    </div>
                    <div className="col-6">
                      <div
                        className="attendance-card p-2"
                        style={{ textAlign: "center" }}
                      >
                        <div className="small text-muted">Date</div>
                        <strong style={{ fontSize: "1.4rem" }}>
                          {selectedDate || "-"}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-dark w-100 rounded-pill"
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
                        ? hasFetched
                          ? "Mark each student's attendance below, or use the header buttons to mark everyone at once."
                          : 'Click "Fetch Students" to load the list.'
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
                      ? hasFetched
                        ? "No registered students found for the selected class."
                        : 'Select course, class and date, then click "Fetch Students".'
                      : "Attendance list will appear here after selecting course and class."}
                  </div>
                ) : (
                  <>
                    {/* Bulk actions — mark everyone at once, works for both layouts below */}
                    <div className="attendance-bulk-actions">
                      <span className="attendance-bulk-label">Mark all:</span>
                      <button
                        type="button"
                        className={`attendance-bulk-btn attendance-bulk-btn--present ${allMarkedPresent ? "is-active" : ""}`}
                        onClick={() => handleMarkAll("present")}
                        disabled={markableStudents.length === 0}
                      >
                        Present
                      </button>
                      <button
                        type="button"
                        className={`attendance-bulk-btn attendance-bulk-btn--absent ${allMarkedAbsent ? "is-active" : ""}`}
                        onClick={() => handleMarkAll("absent")}
                        disabled={markableStudents.length === 0}
                      >
                        Absent
                      </button>
                    </div>

                    {/* Desktop / tablet: table layout */}
                    <div className="attendance-table-wrap d-none d-md-block">
                      <table className="attendance-student-table attendance-table-3col">
                        <colgroup>
                          <col style={{ width: "52%" }} />
                          <col style={{ width: "24%" }} />
                          <col style={{ width: "24%" }} />
                        </colgroup>
                        <thead>
                          <tr>
                            <th className="text-start">Student</th>
                            <th>Present</th>
                            <th>Absent</th>
                          </tr>
                        </thead>
                        <tbody>
                          {students.map((student) => {
                            const isOnLeave = Boolean(leavesMap[student._id]);
                            const status = statusMap[student._id];
                            return (
                              <tr key={student._id}>
                                <td className="attendance-student-cell">
                                  <div className="fw-semibold">
                                    {student.name}
                                  </div>
                                  <div className="text-muted small">
                                    Roll No: {student.rollNumber || "-"}
                                  </div>
                                  <div className="attendance-percentage-row">
                                    <div
                                      className="progress"
                                      style={{ height: 6, borderRadius: 999 }}
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
                                    <span className="attendance-percentage-text">
                                      {Number(student.percentage || 0)}%
                                    </span>
                                  </div>
                                </td>

                                {isOnLeave ? (
                                  <td colSpan={2} className="text-center">
                                    <span className="attendance-leave-badge">
                                      On Leave
                                    </span>
                                  </td>
                                ) : (
                                  <>
                                    <td className="text-center">
                                      <button
                                        type="button"
                                        className={`attendance-check-btn attendance-check-btn--present ${status === "present" ? "is-active" : ""}`}
                                        onClick={() =>
                                          handleStatusChange(
                                            student._id,
                                            "present",
                                          )
                                        }
                                        aria-pressed={status === "present"}
                                        aria-label={`Mark ${student.name} present`}
                                      >
                                        <span className="attendance-check-icon">
                                          ✓
                                        </span>
                                      </button>
                                    </td>
                                    <td className="text-center">
                                      <button
                                        type="button"
                                        className={`attendance-check-btn attendance-check-btn--absent ${status === "absent" ? "is-active" : ""}`}
                                        onClick={() =>
                                          handleStatusChange(
                                            student._id,
                                            "absent",
                                          )
                                        }
                                        aria-pressed={status === "absent"}
                                        aria-label={`Mark ${student.name} absent`}
                                      >
                                        <span className="attendance-check-icon">
                                          ✕
                                        </span>
                                      </button>
                                    </td>
                                  </>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile: stacked card layout, no table / no horizontal scroll */}
                    <div className="attendance-mobile-list d-md-none">
                      {students.map((student) => {
                        const isOnLeave = Boolean(leavesMap[student._id]);
                        const status = statusMap[student._id];
                        return (
                          <div className="attendance-mobile-card" key={student._id}>
                            <div className="attendance-mobile-card-top">
                              <div className="attendance-mobile-card-info">
                                <div className="fw-semibold">{student.name}</div>
                                <div className="text-muted small">
                                  Roll No: {student.rollNumber || "-"}
                                </div>
                              </div>
                              <div className="attendance-mobile-percentage">
                                {Number(student.percentage || 0)}%
                              </div>
                            </div>

                            <div
                              className="progress mb-2"
                              style={{ height: 6, borderRadius: 999 }}
                            >
                              <div
                                className={`progress-bar ${Number(student.percentage || 0) < 90 ? "bg-danger" : "bg-success"}`}
                                role="progressbar"
                                aria-valuenow={Number(student.percentage || 0)}
                                aria-valuemin="0"
                                aria-valuemax="100"
                                style={{
                                  width: `${Number(student.percentage || 0)}%`,
                                }}
                              />
                            </div>

                            {isOnLeave ? (
                              <span className="attendance-leave-badge">
                                On Leave
                              </span>
                            ) : (
                              <div className="attendance-toggle">
                                <button
                                  type="button"
                                  className={`attendance-toggle-option attendance-toggle-option--present ${status === "present" ? "is-active" : ""}`}
                                  onClick={() =>
                                    handleStatusChange(student._id, "present")
                                  }
                                  aria-pressed={status === "present"}
                                >
                                  Present
                                </button>
                                <button
                                  type="button"
                                  className={`attendance-toggle-option attendance-toggle-option--absent ${status === "absent" ? "is-active" : ""}`}
                                  onClick={() =>
                                    handleStatusChange(student._id, "absent")
                                  }
                                  aria-pressed={status === "absent"}
                                >
                                  Absent
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
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
                  {classOptions.find((cls) => cls._id === selectedClassInfo)?.name || "-"}
                </div>
                <div className="text-muted small">
                  {topic ? `Topic: ${topic}` : "Topic: -"}
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
      <Footer />
    </Sidebar>
  );
}

export default Attandance;