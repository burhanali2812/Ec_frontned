import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Toaster, toast } from "react-hot-toast";
import Sidebar from "../Sidebar";
import { useNavigate } from "react-router-dom";
import Footer from "../footer";
import "./UploadResult.css";
import {useAppContext} from "../../contextApi/AppContext";
function UploadResult() {
  const [mode, setMode] = useState("upload"); // "upload" | "edit"
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(false);

  const navigate = useNavigate();

  const getLocalToday = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const ATTENDANCE_API = "https://ec-backend-phi.vercel.app/api/attendance";
  // const RESULT_API = "https://ec-backend-phi.vercel.app/api/results";
  const RESULT_API = "https://ec-backend-phi.vercel.app/api/results";

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

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

  useEffect(() => {
    fetchCourses();
  }, []);

  const getCourseClasses = (course) => {
    if (!course) return [];
    const assignmentClasses = Array.isArray(course.assignments)
      ? course.assignments.flatMap((item) => item?.targetClasses || [])
      : [];
    return [...new Set(assignmentClasses.filter(Boolean))];
  };

  return (
    <Sidebar>
      <Toaster position="top-right" />
      <div className="upload-result-page mt-3 mt-lg-4">
        <div className="container-fluid px-0 px-lg-2">
          <div className="upload-result-hero mb-4">
            <p className="mb-1 text-dark fw-semibold">Teacher Results</p>
            <h3 className="mb-2">Manage test results</h3>
            <p className="mb-0 text-dark-75">
              Upload new results for a class, or fetch and edit results
              already entered.
            </p>
          </div>

          {/* Mode switcher */}
          <div className="mode-switch mb-4">
            <button
              type="button"
              className={`mode-switch-btn ${mode === "upload" ? "active" : ""}`}
              onClick={() => setMode("upload")}
            >
              <span className="mode-switch-icon">+</span>
              <span className="mode-switch-text">
                <span className="mode-switch-title">Upload New Results</span>
                <span className="mode-switch-sub">
                  Enter marks for a course, class, and exam date
                </span>
              </span>
            </button>

            <button
              type="button"
              className={`mode-switch-btn ${mode === "edit" ? "active" : ""}`}
              onClick={() => setMode("edit")}
            >
              <span className="mode-switch-icon">✎</span>
              <span className="mode-switch-text">
                <span className="mode-switch-title">Edit Existing Results</span>
                <span className="mode-switch-sub">
                  Fetch already-uploaded results and update them
                </span>
              </span>
            </button>
          </div>

          {mode === "upload" ? (
            <UploadPanel
              courses={courses}
              loadingCourses={loadingCourses}
              getCourseClasses={getCourseClasses}
              getAuthHeaders={getAuthHeaders}
              getLocalToday={getLocalToday}
              ATTENDANCE_API={ATTENDANCE_API}
              RESULT_API={RESULT_API}
              navigate={navigate}
            />
          ) : (
            <EditPanel
              courses={courses}
              loadingCourses={loadingCourses}
              getCourseClasses={getCourseClasses}
              getAuthHeaders={getAuthHeaders}
              getLocalToday={getLocalToday}
              RESULT_API={RESULT_API}
            />
          )}
        </div>
      </div>
      <Footer />
    </Sidebar>
  );
}

/* ============================================================
   UPLOAD PANEL — enter marks for students, create new results
   Topic is a single session-wide field (like Exam Date / Total
   Marks) that applies to every student's result in this batch.
   ============================================================ */

function UploadPanel({
  courses,
  loadingCourses,
  getCourseClasses,
  getAuthHeaders,
  getLocalToday,
  ATTENDANCE_API,
  RESULT_API,
  navigate,
}) {
  const [students, setStudents] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedClassInfo, setSelectedClassInfo] = useState("");
  const [selectedDate, setSelectedDate] = useState(getLocalToday());
  const [totalMarks, setTotalMarks] = useState("100");
  const [topic, setTopic] = useState("");
  const [resultMap, setResultMap] = useState({});
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);
  const {classOptions} = useAppContext();

  const selectedCourse = useMemo(
    () =>
      courses.find((course) => String(course._id) === String(selectedCourseId)),
    [courses, selectedCourseId],
  );

  const selectedCourseClasses = useMemo(
    () => getCourseClasses(selectedCourse),
    [selectedCourse, getCourseClasses],
  );

  const enteredCount = useMemo(
    () =>
      students.filter((student) => {
        const marks = resultMap[student._id]?.marksObtained;
        return marks !== "" && marks !== undefined && marks !== null;
      }).length,
    [students, resultMap],
  );

  const fetchStudents = async (courseId, classInfo, dateValue) => {
    if (!courseId || !classInfo || !dateValue) return;
    setLoadingStudents(true);
    try {
      const res = await axios.get(`${ATTENDANCE_API}/session`, {
        params: {
          courseId,
          classInfo,
          date: dateValue,
          fetchedBy: "teacher",
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCourseId, selectedCourseClasses]);

  useEffect(() => {
    if (selectedCourseId && selectedClassInfo && selectedDate) {
      fetchStudents(selectedCourseId, selectedClassInfo, selectedDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    if (!topic.trim()) {
      toast.error("Please enter a topic for this exam");
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
        topic: topic.trim(),
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
        setTimeout(() => {
          navigate("/teacherPanel");
        }, 1000);
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
                  {classOptions.find((c) => c._id === classInfo)?.name || classInfo}
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

            <div className="mb-3">
              <label>Topic</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Algebra Basics"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
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
              className="btn btn-primary-solid w-100"
              onClick={handleSubmitAll}
              disabled={saving || !students.length}
            >
              {saving ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  />
                  Uploading...
                </>
              ) : (
                "Upload Results"
              )}
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
                          {classOptions.find((c) => c._id === student.classId)?.name || "-"}
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
                          value={resultMap[student._id]?.marksObtained ?? ""}
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
                            handleRemarksChange(student._id, e.target.value)
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
  );
}

/* ============================================================
   EDIT PANEL — fetch already-entered results and update them.

   Behavior:
   - Fetching pulls EVERY result for the selected course + class,
     across all exam dates and topics.
   - Results are grouped by (exam date, topic) pair, most recent
     date first, so entries with the same date but different
     topics render as separate groups.
   - A filter is available AFTER results have been fetched — it
     doesn't trigger a new API call, it just narrows which
     date+topic group(s) are shown from the data already in
     memory. The dropdown shows both the date and the topic for
     each group.
   - Each row starts read-only with an "Edit" button. Clicking
     Edit unlocks just that row's fields (including Topic);
     clicking Save persists the change via the API, then locks
     the row again.
   ============================================================ */

function EditPanel({
  courses,
  loadingCourses,
  getCourseClasses,
  getAuthHeaders,
  getLocalToday,
  RESULT_API,
}) {
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedClassInfo, setSelectedClassInfo] = useState("");
  const [results, setResults] = useState([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  // Client-side only — filters the already-fetched results by
  // a "date|||topic" group key. Doesn't refetch anything.
  const [groupFilter, setGroupFilter] = useState("");
  // Topic is edited once per date+topic group, not per student row —
  // editing it applies to every result in that group in one go.
  const [editingTopicKey, setEditingTopicKey] = useState(null);
  const [topicDraft, setTopicDraft] = useState("");
  const [savingTopicKey, setSavingTopicKey] = useState(null);
  const {classOptions} = useAppContext();

  const selectedCourse = useMemo(
    () =>
      courses.find((course) => String(course._id) === String(selectedCourseId)),
    [courses, selectedCourseId],
  );

  const selectedCourseClasses = useMemo(
    () => getCourseClasses(selectedCourse),
    [selectedCourse, getCourseClasses],
  );

  const handleCourseChange = (value) => {
    setSelectedCourseId(value);
    setSelectedClassInfo("");
    setResults([]);
    setHasFetched(false);
    setEditingId(null);
    setGroupFilter("");
    setEditingTopicKey(null);
  };

  const handleClassChange = (value) => {
    setSelectedClassInfo(value);
    setResults([]);
    setHasFetched(false);
    setEditingId(null);
    setGroupFilter("");
    setEditingTopicKey(null);
  };

  const canFetch = Boolean(selectedCourseId && selectedClassInfo);

  const fetchResults = async () => {
    if (!canFetch) {
      toast.error("Please select course and class first.");
      return;
    }

    setLoadingResults(true);
    setEditingId(null);
    try {
      // NOTE: no `date` param — pull every result for this course+class.
      const res = await axios.get(`${RESULT_API}/getResultsByClass`, {
        params: {
          courseId: selectedCourseId,
          classInfo: selectedClassInfo,
        },
        headers: getAuthHeaders(),
      });

      if (res.data?.success) {
        const list = (res.data.results || []).map((item) => ({
          _id: item._id,
          studentId: item.studentId || item.student?._id,
          name: item.name || item.student?.name,
          rollNumber: item.rollNumber || item.student?.rollNumber,
          email: item.email || item.student?.email,
          marksObtained: item.marksObtained ?? "",
          totalMarks: item.totalMarks ?? "",
          topic: item.topic || "",
          dateOfExam: item.dateOfExam
            ? String(item.dateOfExam).slice(0, 10)
            : "",
          remarks: item.remarks || "",
        }));
        setResults(list);
        setHasFetched(true);
        setGroupFilter("");
      } else {
        toast.error(res.data?.message || "Failed to load results");
      }
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Unable to load results.",
      );
    } finally {
      setLoadingResults(false);
    }
  };

  const updateField = (resultId, field, value) => {
    setResults((prev) =>
      prev.map((r) => (r._id === resultId ? { ...r, [field]: value } : r)),
    );
  };

  const handleMarksChange = (resultId, value, totalMarks) => {
    const numeric = value === "" ? "" : Number(value);
    const max = Number(totalMarks || 0);
    const nextValue =
      numeric === ""
        ? ""
        : Number.isFinite(max) && max > 0
          ? Math.max(0, Math.min(max, numeric))
          : Math.max(0, numeric);
    updateField(resultId, "marksObtained", nextValue);
  };

  const startEditing = (resultId) => {
    setEditingId(resultId);
  };

  const saveResult = async (result) => {
    if (result.marksObtained === "" || result.marksObtained === null) {
      toast.error("Marks obtained cannot be empty.");
      return;
    }
    const total = Number(result.totalMarks);
    if (!Number.isFinite(total) || total <= 0) {
      toast.error("Total marks must be greater than 0.");
      return;
    }
    if (!result.topic || !result.topic.trim()) {
      toast.error("Topic cannot be empty.");
      return;
    }

    setSavingId(result._id);
    try {
      const res = await axios.put(
        `${RESULT_API}/updateResult/${result._id}`,
        {
          marksObtained: result.marksObtained,
          totalMarks: total,
          dateOfExam: result.dateOfExam,
          topic: result.topic.trim(),
          remarks: result.remarks,
        },
        { headers: getAuthHeaders() },
      );

      if (res.data?.success) {
        toast.success(`Updated ${result.name || "student"}'s result`);
        setEditingId(null);
      } else {
        toast.error(res.data?.message || "Failed to update result");
      }
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Unable to update result.",
      );
    } finally {
      setSavingId(null);
    }
  };

  const startEditingTopic = (group) => {
    setEditingTopicKey(group.key);
    const singleTopic = group.topics.length === 1 ? group.topics[0] : "";
    setTopicDraft(singleTopic === "No topic" ? "" : singleTopic);
  };

  const cancelEditingTopic = () => {
    setEditingTopicKey(null);
    setTopicDraft("");
  };

  // Applies the new topic to every result on this specific exam date at
  // once, instead of requiring the topic to be edited row by row.
  const saveGroupTopic = async (group) => {
    const trimmed = topicDraft.trim();
    if (!trimmed) {
      toast.error("Topic cannot be empty.");
      return;
    }
    if (group.topics.length === 1 && trimmed === group.topics[0]) {
      cancelEditingTopic();
      return;
    }

    setSavingTopicKey(group.key);
    try {
      const outcomes = await Promise.allSettled(
        group.items.map((item) =>
          axios.put(
            `${RESULT_API}/updateResult/${item._id}`,
            {
              marksObtained: item.marksObtained,
              totalMarks: item.totalMarks,
              dateOfExam: item.dateOfExam,
              topic: trimmed,
              remarks: item.remarks,
            },
            { headers: getAuthHeaders() },
          ),
        ),
      );

      const succeededIds = group.items
        .filter((_, idx) => outcomes[idx].status === "fulfilled")
        .map((item) => item._id);
      const failedCount = outcomes.length - succeededIds.length;

      if (succeededIds.length) {
        setResults((prev) =>
          prev.map((r) =>
            succeededIds.includes(r._id) ? { ...r, topic: trimmed } : r,
          ),
        );
        toast.success(`Topic updated for ${succeededIds.length} student(s)`);
      }
      if (failedCount) {
        toast.error(`${failedCount} update(s) failed`);
      }
      cancelEditingTopic();
    } catch {
      toast.error("Failed to update topic");
    } finally {
      setSavingTopicKey(null);
    }
  };

  // Group fetched results by exam date only, most recent first. Editing
  // the topic for a group applies to every result on that specific date,
  // regardless of what topic each row currently has.
  const groupedByDate = useMemo(() => {
    const groups = {};
    results.forEach((result) => {
      const dateKey = result.dateOfExam || "unknown";
      if (!groups[dateKey]) {
        groups[dateKey] = { date: dateKey, items: [] };
      }
      groups[dateKey].items.push(result);
    });
    return Object.entries(groups)
      .map(([dateKey, group]) => {
        const topics = [
          ...new Set(group.items.map((item) => item.topic || "No topic")),
        ];
        return [
          dateKey,
          {
            key: dateKey,
            ...group,
            topics,
            topic: topics.length === 1 ? topics[0] : `${topics.length} topics`,
          },
        ];
      })
      .sort(([a], [b]) => (a < b ? 1 : -1));
  }, [results]);

  // Apply the client-side date filter on top of the grouped data — no
  // network call, just narrows which date group(s) render.
  const visibleGroups = useMemo(() => {
    if (!groupFilter) return groupedByDate;
    return groupedByDate.filter(([date]) => date === groupFilter);
  }, [groupedByDate, groupFilter]);

  const availableGroups = useMemo(
    () => groupedByDate.map(([date, group]) => ({ key: date, ...group })),
    [groupedByDate],
  );

  return (
    <>
      {/* Filter toolbar — course + class only, no date required to fetch */}
      <div className="upload-result-card p-3 p-md-4 mb-3">
        <div className="row g-3 align-items-end">
          <div className="col-12 col-sm-6 col-lg-4">
            <label>Course</label>
            <select
              className="form-select"
              value={selectedCourseId}
              onChange={(e) => handleCourseChange(e.target.value)}
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

          <div className="col-12 col-sm-6 col-lg-4">
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
                  {classOptions.find((c) => c._id === classInfo)?.name || classInfo}
                </option>
              ))}
            </select>
          </div>

          <div className="col-12 col-sm-6 col-lg-4">
            <button
              type="button"
              className="btn btn-primary-solid w-100"
              onClick={fetchResults}
              disabled={!canFetch || loadingResults}
            >
              {loadingResults ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  />
                  Fetching...
                </>
              ) : (
                "Fetch Results"
              )}
            </button>
          </div>
        </div>

        {/* Date filter — only shown/enabled once we actually have data
            to filter. Purely client-side, doesn't refetch anything. */}
        {hasFetched && availableGroups.length > 0 && (
          <div className="row g-3 align-items-end mt-1">
            <div className="col-12 col-sm-8 col-lg-6">
              <label>Filter by Exam Date</label>
              <select
                className="form-select"
                value={groupFilter}
                onChange={(e) => setGroupFilter(e.target.value)}
              >
                <option value="">
                  All dates ({availableGroups.length})
                </option>
                {availableGroups.map((group) => (
                  <option key={group.key} value={group.key}>
                    {(group.date === "unknown" ? "No date" : group.date)} —{" "}
                    {group.topic}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Results, grouped by exam date */}
      <div className="upload-result-card p-3 p-md-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="upload-result-section-title mb-0">
            Existing Results
          </h5>
          {hasFetched && !loadingResults && results.length > 0 && (
            <span className="text-muted small">
              {selectedCourse?.title} &middot;{" "}
              {classOptions.find((c) => c._id === selectedClassInfo)?.name ||
                selectedClassInfo}{" "}
              &middot; {results.length} result(s) across{" "}
              {availableGroups.length} date(s)
            </span>
          )}
        </div>

        {!hasFetched && !loadingResults ? (
          <div className="upload-result-empty">
            Select course and class, then click <strong>Fetch Results</strong>{" "}
            to view and edit entries across all exam dates.
          </div>
        ) : loadingResults ? (
          <div className="upload-result-empty">Loading results...</div>
        ) : results.length === 0 ? (
          <div className="upload-result-empty">
            No results found for the selected course and class.
          </div>
        ) : visibleGroups.length === 0 ? (
          <div className="upload-result-empty">
            No results match the selected filter.
          </div>
        ) : (
          visibleGroups.map(([key, group]) => (
            <div key={key} className="mb-4">
                <hr className="my-3" />

              <div className="upload-result-date-group-header mb-2 d-flex align-items-center flex-wrap gap-2">
                <span className="fw-semibold bg-dark text-white px-2 py-1 rounded">
                  {group.date === "unknown" ? "No date on record" : group.date}
                </span>

                {editingTopicKey === group.key ? (
                  <>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      style={{ maxWidth: 220, display: "inline-block" }}
                      placeholder="Topic"
                      value={topicDraft}
                      onChange={(e) => setTopicDraft(e.target.value)}
                      disabled={savingTopicKey === group.key}
                      autoFocus
                    />
                    <button
                      type="button"
                      className="btn btn-sm btn-save-result"
                      onClick={() => saveGroupTopic(group)}
                      disabled={savingTopicKey === group.key}
                    >
                      {savingTopicKey === group.key ? "Saving..." : "Save"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={cancelEditingTopic}
                      disabled={savingTopicKey === group.key}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    {group.topics.length > 1 ? (
                      <span
                        className="fw-semibold bg-warning text-dark px-2 py-1 rounded"
                        title={group.topics.join(", ")}
                      >
                        {group.topic}
                      </span>
                    ) : (
                      <span className="fw-semibold bg-secondary text-white px-2 py-1 rounded">
                        {group.topic}
                      </span>
                    )}
                    <button
                      type="button"
                      className="btn btn-sm btn-edit-result"
                      onClick={() => startEditingTopic(group)}
                      disabled={savingTopicKey !== null || editingId !== null}
                    >
                      Edit Topic
                    </button>
                  </>
                )}

                <span className="text-muted small ms-2">
                  {group.items.length} student
                  {group.items.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="table-responsive">
                <table className="upload-result-table">
                  <thead>
                    <tr>
                      <th>Roll</th>
                      <th>Student</th>
                      <th>Marks</th>
                      <th>Total</th>
                      <th>Exam Date</th>
                      <th>Remarks</th>
                      <th className="text-end">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map((result) => {
                      const isSaving = savingId === result._id;
                      const isRowEditing = editingId === result._id;
                      const fieldsDisabled = !isRowEditing || isSaving;

                      return (
                        <tr key={result._id}>
                          <td>
                            <div className="fw-semibold">
                              {result.rollNumber || "-"}
                            </div>
                          </td>
                          <td>
                            <div className="fw-semibold">
                              {result.name || "-"}
                            </div>
                            <div className="text-muted small">
                              {result.email || "-"}
                            </div>
                          </td>
                          <td style={{ minWidth: 110 }}>
                            <input
                              type="number"
                              className="form-control form-control-sm"
                              min={0}
                              value={result.marksObtained}
                              onChange={(e) =>
                                handleMarksChange(
                                  result._id,
                                  e.target.value,
                                  result.totalMarks,
                                )
                              }
                              readOnly={fieldsDisabled}
                              disabled={isSaving}
                            />
                          </td>
                          <td style={{ minWidth: 100 }}>
                            <input
                              type="number"
                              className="form-control form-control-sm"
                              min={1}
                              value={result.totalMarks}
                              onChange={(e) =>
                                updateField(
                                  result._id,
                                  "totalMarks",
                                  e.target.value,
                                )
                              }
                              readOnly={fieldsDisabled}
                              disabled={isSaving}
                            />
                          </td>
                          <td style={{ minWidth: 160 }}>
                            <input
                              type="date"
                              className="form-control form-control-sm"
                              value={result.dateOfExam}
                              max={getLocalToday()}
                              onChange={(e) =>
                                updateField(
                                  result._id,
                                  "dateOfExam",
                                  e.target.value,
                                )
                              }
                              disabled={fieldsDisabled}
                            />
                          </td>
                          <td style={{ minWidth: 200 }}>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              placeholder="Optional remarks"
                              value={result.remarks}
                              onChange={(e) =>
                                updateField(
                                  result._id,
                                  "remarks",
                                  e.target.value,
                                )
                              }
                              readOnly={fieldsDisabled}
                              disabled={isSaving}
                            />
                          </td>
                          <td className="text-end">
                            {isRowEditing ? (
                              <button
                                type="button"
                                className="btn btn-sm btn-save-result"
                                onClick={() => saveResult(result)}
                                disabled={isSaving}
                              >
                                {isSaving ? "Saving..." : "Save"}
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-sm btn-edit-result"
                                onClick={() => startEditing(result._id)}
                                disabled={
                                  savingId !== null ||
                                  editingTopicKey === key ||
                                  savingTopicKey === key
                                }
                              >
                                Edit
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}

export default UploadResult;