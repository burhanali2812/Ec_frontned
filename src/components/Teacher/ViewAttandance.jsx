import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Toaster, toast } from "react-hot-toast";
import Sidebar from "../Sidebar";
import Footer from "../footer";
import "./AttandanceView.css";
import { useAppContext } from "../../contextApi/AppContext";

const STATUS_OPTIONS = ["present", "absent", "onLeave"];

function ViewAttandance() {
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedClassInfo, setSelectedClassInfo] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [pendingStatus, setPendingStatus] = useState("");
  const [savingStudentId, setSavingStudentId] = useState(null);
  const{classOptions} = useAppContext()

  const API_BASE = "https://ec-backend-phi.vercel.app/api/attendance";

  const getLocalToday = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    setSelectedDate(getLocalToday());
  }, []);

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

  const presentCount = useMemo(
    () => students.filter((s) => s.status === "present").length,
    [students],
  );
  const absentCount = useMemo(
    () => students.filter((s) => s.status === "absent").length,
    [students],
  );
  const leaveCount = useMemo(
    () => students.filter((s) => s.status === "leave").length,
    [students],
  );
  const notMarkedCount = useMemo(
    () => students.filter((s) => !s.status).length,
    [students],
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

  const fetchStudentPercentages = async () => {
    if (!selectedCourseId || !selectedClassInfo || !selectedDate) {
      toast.error("Please select course, class, and date first.");
      return;
    }

    setEditingStudentId(null);
    setPendingStatus("");
    setLoadingStudents(true);

    try {
      const res = await axios.get(`${API_BASE}/session`, {
        params: {
          courseId: selectedCourseId,
          classInfo: selectedClassInfo,
          date: selectedDate,
          fetchedBy: "teacherForViewAttendance",
        },
        headers: getAuthHeaders(),
      });

      if (res.data?.success) {
        setStudents(res.data.students || []);
        setHasFetched(true);
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
    setSelectedClassInfo("");
    setStudents([]);
    setHasFetched(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCourseId]);

  const handleClassChange = (event) => {
    setSelectedClassInfo(event.target.value);
    setStudents([]);
    setHasFetched(false);
  };

  const handleDateChange = (event) => {
    setSelectedDate(event.target.value);
    setStudents([]);
    setHasFetched(false);
  };

  const startEditing = (student) => {
    setEditingStudentId(student._id);
    setPendingStatus(student.status || "present");
  };

  const cancelEditing = () => {
    setEditingStudentId(null);
    setPendingStatus("");
  };

  const saveStatus = async (student) => {
    if (!pendingStatus) return;



  setSavingStudentId(student._id);
  const payload = {
    status: pendingStatus,
    studentId: student._id, 
   courseId : selectedCourseId,
   classInfo : selectedClassInfo,
   date : selectedDate,
  };
  try {
    const res = await axios.post(
      `${API_BASE}/updateAttendanceByStudent`,
      payload,
      { headers: getAuthHeaders() },
    );

    if (res.data?.success) {
      toast.success("Attendance updated successfully");
      setStudents((prev) =>
        prev.map((s) =>
          s._id === student._id ? { ...s, status: pendingStatus } : s,
        ),
      );
      setEditingStudentId(null);
      setPendingStatus("");
    } else {
      toast.error(res.data?.message || "Failed to update attendance");
    }
  } catch (error) {
    toast.error(getErrorMessage(error, "Unable to update attendance."));
  } finally {
    setSavingStudentId(null);
  }
};

  const statusMeta = (status) => {
    if (status === "present")
      return { label: "Present", className: "status-present" };
    if (status === "absent")
      return { label: "Absent", className: "status-absent" };
    if (status === "onLeave")
      return { label: "On Leave", className: "status-leave" };
    return { label: "Not marked", className: "status-unmarked" };
  };

  const canFetch = selectedCourseId && selectedClassInfo && selectedDate;

  const renderStatusControl = (student, isEditing, isSaving) => {
  
    if (isEditing) {
  
      return (
        <select
          className="form-select form-select-sm status-select"
          value={pendingStatus}
          onChange={(e) => setPendingStatus(e.target.value)}
          disabled={isSaving}
        >
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </option>
          ))}
        </select>
      );
    }
    const meta = statusMeta(student.status);
    return <span className={`status-pill ${meta.className}`}>{meta.label}</span>;
  };

  const renderActionControl = (student, isEditing, isSaving) => {
    if (isEditing) {
      return (
        <div className="d-flex gap-2 justify-content-end row-actions">
          <button
            className="btn btn-sm btn-save"
            onClick={() => saveStatus(student)}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
          <button
            className="btn btn-sm btn-cancel"
            onClick={cancelEditing}
            disabled={isSaving}
          >
            Cancel
          </button>
        </div>
      );
    }
    return (
      <button
        className="btn btn-sm btn-edit"
        onClick={() => startEditing(student)}
      >
        Edit
      </button>
    );
  };

  return (
    <Sidebar>
      <Toaster position="top-right" />

      <div className="attendance-page mt-3 mt-lg-4">
        <div className="container-fluid px-0 px-lg-2">
          <div className="attendance-header mb-4">
            <p className="attendance-eyebrow">Teacher Attendance</p>
            <h4 className="attendance-title">Attendance Register</h4>
            <p className="attendance-subtitle">
              Select a course, class, and date to fetch student records and
              update attendance status.
            </p>
          </div>

          {/* Filter toolbar */}
          <div className="attendance-toolbar mb-3">
            <div className="row g-3 align-items-end">
              <div className="col-12 col-sm-6 col-lg-3">
                <label className="toolbar-label">Course</label>
                <select
                  className="form-select"
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  disabled={loadingCourses}
                >
                  <option value="">
                    {loadingCourses ? "Loading..." : "Select course"}
                  </option>
                  {courses.map((course) => (
                    <option key={course._id} value={course._id}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-12 col-sm-6 col-lg-3">
                <label className="toolbar-label">Class</label>
                <select
                  className="form-select"
                  value={selectedClassInfo}
                  onChange={handleClassChange}
                  disabled={!selectedCourseId}
                >
                  <option value="">Select class</option>
                  {selectedCourseClasses.map((classInfo) => (
                    <option key={classInfo} value={classInfo}>
                      {classOptions.find((c) => c._id === classInfo)?.name || classInfo}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-12 col-sm-6 col-lg-3">
                <label className="toolbar-label">Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={selectedDate}
                  max={getLocalToday()}
                  onChange={handleDateChange}
                  disabled={!selectedCourseId || !selectedClassInfo}
                />
              </div>

              <div className="col-12 col-sm-6 col-lg-3">
                <button
                  type="button"
                  className="btn btn-fetch w-100"
                  onClick={fetchStudentPercentages}
                  disabled={!canFetch || loadingStudents}
                >
                  {loadingStudents ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                        aria-hidden="true"
                      />
                      Fetching...
                    </>
                  ) : (
                    "Fetch Attendance"
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Summary strip */}
          {hasFetched && students.length > 0 && (
            <div className="summary-strip mb-3">
              <div className="summary-tile">
                <span className="summary-label">Students</span>
                <span className="summary-value">{students.length}</span>
              </div>
              <div className="summary-tile">
                <span className="summary-label">Avg %</span>
                <span className="summary-value">{averagePercentage}%</span>
              </div>
              <div className="summary-tile accent-present">
                <span className="summary-label">Present</span>
                <span className="summary-value">{presentCount}</span>
              </div>
              <div className="summary-tile accent-absent">
                <span className="summary-label">Absent</span>
                <span className="summary-value">{absentCount}</span>
              </div>
              <div className="summary-tile accent-leave">
                <span className="summary-label">Leave</span>
                <span className="summary-value">{leaveCount}</span>
              </div>
              <div className="summary-tile accent-unmarked">
                <span className="summary-label">Not Marked</span>
                <span className="summary-value">{notMarkedCount}</span>
              </div>
            </div>
          )}

          {/* Records panel */}
          <div className="records-panel">
            <div className="records-panel-header">
              <span className="records-title">Student Attendance</span>
              {hasFetched && !loadingStudents && students.length > 0 && (
                <span className="records-context">
                  {selectedCourse?.title} &middot; {classOptions.find((c) => c._id === selectedClassInfo)?.name || selectedClassInfo} &middot;{" "}
                  {selectedDate}
                </span>
              )}
            </div>

            <div className="records-panel-body">
              {!hasFetched && !loadingStudents ? (
                <div className="attendance-empty">
                  <p className="mb-0">
                    Select course, class, and date, then click{" "}
                    <strong>Fetch Attendance</strong> to view student records.
                  </p>
                </div>
              ) : loadingStudents ? (
                <div className="attendance-empty">
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  />
                  Loading students...
                </div>
              ) : students.length === 0 ? (
                <div className="attendance-empty">
                  No students found for the selected course, class, and date.
                </div>
              ) : (
                <>
                  {/* Desktop / tablet table */}
                  <div className="table-responsive attendance-table-wrap">
                    <table className="table align-middle mb-0 attendance-table-pro">
                      <thead>
                        <tr>
                          <th style={{ width: "8%" }}>Roll No.</th>
                          <th style={{ width: "27%" }}>Student</th>
                          <th style={{ width: "20%" }}>Attendance %</th>
                          <th style={{ width: "15%" }}>Status</th>
                          <th style={{ width: "15%" }}>Date</th>
                          <th className="text-end" style={{ width: "15%" }}>
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((student) => {
                          const percentage = Math.round(
                            Number(student.percentage || 0),
                          );
                          const isEditing = editingStudentId === student._id;
                          const isSaving = savingStudentId === student._id;
                          const meta = statusMeta(student.status);

                          return (
                            <tr key={student._id} className={meta.className}>
                              <td className="fw-semibold">
                                {student.rollNumber || "-"}
                              </td>
                              <td>
                                <div className="fw-semibold">
                                  {student.name}
                                </div>
                                <div className="text-muted small">
                                  {student.email || "-"}
                                </div>
                              </td>
                              <td style={{ minWidth: 140 }}>
                                <div className="pct-row">
                                  <span>{percentage}%</span>
                                </div>
                                <div className="progress attendance-progress">
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
                              <td>
                                {renderStatusControl(student, isEditing, isSaving)}
                              </td>
                              <td className="text-muted small">
                                {selectedDate}
                              </td>
                              <td className="text-end">
                                {renderActionControl(student, isEditing, isSaving)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile stacked cards */}
                  <div className="attendance-card-list">
                    {students.map((student) => {
                      const percentage = Math.round(
                        Number(student.percentage || 0),
                      );
                      const isEditing = editingStudentId === student._id;
                      const isSaving = savingStudentId === student._id;
                      const meta = statusMeta(student.status);

                      return (
                        <div
                          className={`student-row-card ${meta.className}`}
                          key={student._id}
                        >
                          <div className="student-row-card-top">
                            <div>
                              <div className="fw-semibold">
                                {student.name}
                              </div>
                              <div className="text-muted small">
                                Roll {student.rollNumber || "-"}
                              </div>
                            </div>
                            {renderStatusControl(student, isEditing, isSaving)}
                          </div>

                          <div className="pct-row">
                            <span className="text-muted small">
                              Attendance
                            </span>
                            <span className="small fw-semibold">
                              {percentage}%
                            </span>
                          </div>
                          <div className="progress attendance-progress">
                            <div
                              className={`progress-bar ${percentage < 90 ? "bg-danger" : "bg-success"}`}
                              role="progressbar"
                              aria-valuenow={percentage}
                              aria-valuemin="0"
                              aria-valuemax="100"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>

                          <div className="student-row-card-bottom">
                            <span className="text-muted small">
                              {selectedDate}
                            </span>
                            {renderActionControl(student, isEditing, isSaving)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </Sidebar>
  );
}

export default ViewAttandance;