import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Toaster, toast } from "react-hot-toast";
import Sidebar from "../Sidebar";
import "./UploadResult.css";

function UploadResult() {
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedClassInfo, setSelectedClassInfo] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  });
  const [totalMarks, setTotalMarks] = useState("100");
  const [resultMap, setResultMap] = useState({});
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);

  const ATTENDANCE_API = "https://ec-backend-phi.vercel.app/api/attendance";
  const RESULT_API = "https://ec-backend-phi.vercel.app/api/results";

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const selectedCourse = useMemo(
    () =>
      courses.find((course) => String(course._id) === String(selectedCourseId)),
    [courses, selectedCourseId],
  );

  const selectedCourseClasses = useMemo(() => {
    if (!selectedCourse) return [];
    const assignmentClasses = Array.isArray(selectedCourse.assignments)
      ? selectedCourse.assignments.flatMap((item) => item?.targetClasses || [])
      : [];
    return [...new Set(assignmentClasses.filter(Boolean))];
  }, [selectedCourse]);

  const enteredCount = useMemo(
    () =>
      students.filter((student) => {
        const marks = resultMap[student._id]?.marksObtained;
        return marks !== "" && marks !== undefined && marks !== null;
      }).length,
    [students, resultMap],
  );

  const fetchCourses = async () => {
    setLoadingCourses(true);
    try {
      const res = await axios.get(`${ATTENDANCE_API}/myCourses`, {
        headers: getAuthHeaders(),
      });
      if (res.data?.success) {
        setCourses(res.data.courses || []);
      } else {
        toast.error(res.data?.message || "Failed to load courses");
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to load courses");
    } finally {
      setLoadingCourses(false);
    }
  };

  const fetchStudents = async (courseId, classInfo, dateValue) => {
    if (!courseId || !classInfo || !dateValue) return;
    setLoadingStudents(true);
    try {
      const res = await axios.get(`${ATTENDANCE_API}/session`, {
        params: {
          courseId,
          classInfo,
          date: dateValue,
        },
        headers: getAuthHeaders(),
      });

      if (res.data?.success) {
        const list = res.data.students || [];
        setStudents(list);
        const initial = {};
        list.forEach((student) => {
          initial[student._id] = { marksObtained: "", remarks: "" };
        });
        setResultMap(initial);
      } else {
        toast.error(res.data?.message || "Failed to load students");
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to load students");
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
      setResultMap({});
      return;
    }

    const nextClass = selectedCourseClasses[0] || "";
    setSelectedClassInfo(nextClass);
    setStudents([]);
    setResultMap({});
    if (nextClass) {
      fetchStudents(selectedCourseId, nextClass, selectedDate);
    }
  }, [selectedCourseId, selectedCourseClasses]);

  useEffect(() => {
    if (selectedCourseId && selectedClassInfo && selectedDate) {
      fetchStudents(selectedCourseId, selectedClassInfo, selectedDate);
    }
  }, [selectedDate]);

  const handleCourseChange = (value) => {
    setSelectedCourseId(value);
    setSelectedClassInfo("");
    setStudents([]);
    setResultMap({});
  };

  const handleClassChange = async (value) => {
    setSelectedClassInfo(value);
    setStudents([]);
    setResultMap({});
    if (selectedCourseId && value) {
      await fetchStudents(selectedCourseId, value, selectedDate);
    }
  };

  const handleMarksChange = (studentId, value) => {
    const numeric = value === "" ? "" : Number(value);
    const maxMarks = Number(totalMarks || 0);
    const nextValue =
      numeric === ""
        ? ""
        : Number.isFinite(maxMarks) && maxMarks > 0
          ? Math.max(0, Math.min(maxMarks, numeric))
          : Math.max(0, numeric);

    setResultMap((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        marksObtained: nextValue,
      },
    }));
  };

  const handleRemarksChange = (studentId, value) => {
    setResultMap((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        remarks: value,
      },
    }));
  };

  const handleSubmitAll = async () => {
    if (!selectedCourseId || !selectedClassInfo || !selectedDate) {
      toast.error("Please select course, class, and exam date");
      return;
    }

    const total = Number(totalMarks);
    if (!Number.isFinite(total) || total <= 0) {
      toast.error("Total marks must be greater than 0");
      return;
    }

    const payloads = students
      .map((student) => ({
        studentId: student._id,
        courseId: selectedCourseId,
        marksObtained: resultMap[student._id]?.marksObtained,
        dateOfExam: selectedDate,
        totalMarks: total,
        remarks: resultMap[student._id]?.remarks || "",
      }))
      .filter(
        (item) => item.marksObtained !== "" && item.marksObtained != null,
      );

    if (!payloads.length) {
      toast.error("Please enter marks for at least one student");
      return;
    }

    setSaving(true);
    try {
      const results = await Promise.allSettled(
        payloads.map((payload) =>
          axios.post(`${RESULT_API}/submitResult`, payload, {
            headers: getAuthHeaders(),
          }),
        ),
      );

      const successCount = results.filter(
        (r) => r.status === "fulfilled",
      ).length;
      const failedCount = results.length - successCount;

      if (successCount) {
        toast.success(`${successCount} result(s) uploaded successfully`);
      }
      if (failedCount) {
        toast.error(`${failedCount} result(s) failed (possible duplicates)`);
      }
    } catch {
      toast.error("Failed to upload results");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sidebar>
      <Toaster position="top-right" />
      <div className="upload-result-page mt-3 mt-lg-4">
        <div className="container-fluid px-0 px-lg-2">
          <div className="upload-result-hero mb-4">
            <p className="mb-1 text-white-50 fw-semibold">Teacher Results</p>
            <h3 className="mb-2">Upload test results quickly</h3>
            <p className="mb-0 text-white-75">
              Select course and class, enter marks, and upload all student
              results.
            </p>
          </div>

          <div className="row g-4">
            <div className="col-12 col-xl-4">
              <div className="upload-result-card p-3 p-md-4 h-100">
                <h5 className="upload-result-section-title mb-3">Filters</h5>

                <div className="upload-result-form">
                  <div className="mb-3">
                    <label>Course</label>
                    <select
                      className="form-select"
                      value={selectedCourseId}
                      onChange={(e) => handleCourseChange(e.target.value)}
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
                      onChange={(e) => handleClassChange(e.target.value)}
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

                  <div className="mb-3">
                    <label>Exam Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                    />
                  </div>

                  <div className="mb-4">
                    <label>Total Marks</label>
                    <input
                      type="number"
                      className="form-control"
                      value={totalMarks}
                      min={1}
                      onChange={(e) => setTotalMarks(e.target.value)}
                    />
                  </div>

                  <div className="upload-result-stats mb-4">
                    <div className="upload-result-stat">
                      <span>Students</span>
                      <strong>{students.length}</strong>
                    </div>
                    <div className="upload-result-stat">
                      <span>Entered</span>
                      <strong>{enteredCount}</strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-dark w-100 rounded-pill"
                    onClick={handleSubmitAll}
                    disabled={saving || !students.length}
                  >
                    {saving ? "Uploading..." : "Upload Results"}
                  </button>
                </div>
              </div>
            </div>

            <div className="col-12 col-xl-8">
              <div className="upload-result-card p-3 p-md-4 h-100">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="upload-result-section-title mb-0">
                    Student Result Sheet
                  </h5>
                  <div className="text-muted small">
                    {loadingStudents
                      ? "Loading students..."
                      : `${students.length} records`}
                  </div>
                </div>

                {students.length === 0 ? (
                  <div className="upload-result-empty">
                    {selectedCourseId && selectedClassInfo
                      ? "No registered students found for this class."
                      : "Select course and class to start uploading results."}
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="upload-result-table">
                      <thead>
                        <tr>
                          <th>Roll</th>
                          <th>Student</th>
                          <th>Marks</th>
                          <th>Remarks</th>
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
                            </td>
                            <td style={{ minWidth: 130 }}>
                              <input
                                type="number"
                                className="form-control form-control-sm"
                                min={0}
                                max={Number(totalMarks) || undefined}
                                placeholder="0"
                                value={
                                  resultMap[student._id]?.marksObtained ?? ""
                                }
                                onChange={(e) =>
                                  handleMarksChange(student._id, e.target.value)
                                }
                              />
                              <div className="small text-muted mt-1">
                                / {totalMarks || 0}
                              </div>
                            </td>
                            <td style={{ minWidth: 220 }}>
                              <input
                                type="text"
                                className="form-control form-control-sm"
                                placeholder="Optional remarks"
                                value={resultMap[student._id]?.remarks || ""}
                                onChange={(e) =>
                                  handleRemarksChange(
                                    student._id,
                                    e.target.value,
                                  )
                                }
                              />
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
        </div>
      </div>
    </Sidebar>
  );
}

export default UploadResult;
