import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast, Toaster } from "react-hot-toast";
import Sidebar from "../Sidebar";
import "./TimeTableManage.css";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const CLASS_OPTIONS = ["Pre-9th", "9th", "10th", "11th", "12th"];

function TimeTableManage() {
  const API_BASE = "https://ec-backend-phi.vercel.app/api";
  const [courses, setCourses] = useState([]);
  const [timeTables, setTimeTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [applyToAll, setApplyToAll] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dayFilter, setDayFilter] = useState("all");
  const [form, setForm] = useState({
    course: "",
    classInfo: "",
    teacher: "",
    dayOfWeek: "",
    startTime: "",
    endTime: "",
  });

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const selectedCourse = useMemo(
    () => courses.find((course) => String(course._id) === String(form.course)),
    [courses, form.course],
  );

  const availableTeachers = useMemo(() => {
    const assignments = Array.isArray(selectedCourse?.assignments)
      ? selectedCourse.assignments
      : [];

    const teachers = assignments
      .filter((item) => {
        if (!form.classInfo) return true;
        return Array.isArray(item?.targetClasses)
          ? item.targetClasses.includes(form.classInfo)
          : false;
      })
      .map((item) => item?.teacher)
      .filter(Boolean)
      .map((teacher) => ({
        _id: String(teacher._id || teacher),
        name: teacher.name || "Unknown",
        email: teacher.email || "",
      }));

    return teachers.filter(
      (teacher, index, arr) =>
        index === arr.findIndex((item) => item._id === teacher._id),
    );
  }, [selectedCourse, form.classInfo]);

  const filteredTimeTables = useMemo(() => {
    return timeTables.filter((item) => {
      const matchesDay =
        dayFilter === "all" || String(item.dayOfWeek) === String(dayFilter);

      const haystack =
        `${item?.course?.title || ""} ${item?.classInfo || ""} ${item?.teacher?.name || ""} ${item?.dayOfWeek || ""}`.toLowerCase();
      const matchesSearch = searchTerm.trim()
        ? haystack.includes(searchTerm.toLowerCase())
        : true;

      return matchesDay && matchesSearch;
    });
  }, [timeTables, dayFilter, searchTerm]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [coursesRes, timetableRes] = await Promise.all([
        axios.get(`${API_BASE}/courses/allCourses`, {
          headers: getAuthHeaders(),
        }),
        axios.get(`${API_BASE}/timetable/allTimeTables`, {
          headers: getAuthHeaders(),
        }),
      ]);

      setCourses(coursesRes?.data?.courses || []);
      setTimeTables(timetableRes?.data?.timeTables || []);
    } catch (error) {
      console.error(error);
      toast.error(
        error?.response?.data?.message || "Failed to load timetable data",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setForm({
      course: "",
      classInfo: "",
      teacher: "",
      dayOfWeek: "",
      startTime: "",
      endTime: "",
    });
    setEditingId("");
    setApplyToAll(false);
    setModalOpen(false);
  };

  const handleChange = (field, value) => {
    setForm((prev) => {
      if (field === "startTime") {
        const [hours, minutes] = String(value || "")
          .split(":")
          .map(Number);
        if (Number.isFinite(hours) && Number.isFinite(minutes)) {
          const next = new Date();
          next.setHours(hours, minutes + 40, 0, 0);
          const endHours = String(next.getHours()).padStart(2, "0");
          const endMinutes = String(next.getMinutes()).padStart(2, "0");
          return {
            ...prev,
            startTime: value,
            endTime: `${endHours}:${endMinutes}`,
          };
        }
      }

      return { ...prev, [field]: value };
    });
  };

  const handleCourseChange = (value) => {
    setForm((prev) => ({ ...prev, course: value, teacher: "" }));
  };

  const handleClassInfoChange = (value) => {
    setForm((prev) => ({ ...prev, classInfo: value, teacher: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !form.course ||
      !form.classInfo ||
      !form.teacher ||
      !form.dayOfWeek ||
      !form.endTime
    ) {
      toast.error("Please fill all fields");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        course: form.course,
        classInfo: form.classInfo,
        teacher: form.teacher,
        dayOfWeek: form.dayOfWeek,
        startTime: form.startTime,
        endTime: form.endTime,
      };

      if (editingId) {
        await axios.put(
          `${API_BASE}/timetable/updateTimeTableEntry/${editingId}`,
          payload,
          {
            headers: getAuthHeaders(),
          },
        );
        toast.success("Timetable updated successfully");
      } else {
        if (applyToAll) {
          const promises = DAYS.map((d) =>
            axios.post(
              `${API_BASE}/timetable/addTimeTableEntry`,
              { ...payload, dayOfWeek: d },
              { headers: getAuthHeaders() },
            ),
          );

          const results = await Promise.allSettled(promises);
          const succeeded = results.filter(
            (r) => r.status === "fulfilled",
          ).length;
          const failed = results.filter((r) => r.status === "rejected");

          if (succeeded > 0) {
            toast.success(`${succeeded} timetable entries added`);
          }

          if (failed.length > 0) {
            const messages = failed
              .slice(0, 3)
              .map(
                (f) => f.reason?.response?.data?.message || f.reason?.message,
              )
              .filter(Boolean);
            toast.error(
              `Failed to add ${failed.length} entries${messages.length ? ": " + messages.join(", ") : ""}`,
            );
          }
        } else {
          await axios.post(`${API_BASE}/timetable/addTimeTableEntry`, payload, {
            headers: getAuthHeaders(),
          });
          toast.success("Timetable added successfully");
        }
      }

      resetForm();
      await fetchData();
      setModalOpen(false);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to save timetable");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (entry) => {
    setEditingId(entry._id);
    setForm({
      course: String(entry?.course?._id || entry?.course || ""),
      classInfo: entry.classInfo || "",
      teacher: String(entry?.teacher?._id || entry?.teacher || ""),
      dayOfWeek: entry.dayOfWeek || "",
      startTime: entry.startTime || "",
      endTime: entry.endTime || "",
    });
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this timetable entry?")) return;
    try {
      await axios.delete(`${API_BASE}/timetable/deleteTimeTableEntry/${id}`, {
        headers: getAuthHeaders(),
      });
      toast.success("Timetable deleted successfully");
      await fetchData();
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to delete timetable",
      );
    }
  };

  const summary = useMemo(() => {
    return {
      total: timeTables.length,
      teachers: new Set(
        timeTables.map((item) => String(item?.teacher?._id || item?.teacher)),
      ).size,
      courses: new Set(
        timeTables.map((item) => String(item?.course?._id || item?.course)),
      ).size,
    };
  }, [timeTables]);

  return (
    <Sidebar>
      <Toaster position="top-right" />
      <div className="ttm-page py-3 py-lg-4">
        <div className="container-fluid px-0 px-lg-2">
          <div className="ttm-hero mb-3">
            <div>
              <p className="mb-1 text-muted fw-semibold">
                Admin Timetable Manager
              </p>
              <h4 className="mb-1">
                Add, update, and delete schedules quickly
              </h4>
              <p className="mb-0 text-muted small">
                Pick course and teacher from dropdowns to keep timetable updates
                fast and accurate.
              </p>
            </div>
          </div>

          <div className="row g-3 mb-3">
            <div className="col-6 col-md-4">
              <div className="ttm-stat-card">
                <div className="ttm-stat-value">{summary.total}</div>
                <div className="ttm-stat-label">Total Entries</div>
              </div>
            </div>
            <div className="col-6 col-md-4">
              <div className="ttm-stat-card">
                <div className="ttm-stat-value">{summary.courses}</div>
                <div className="ttm-stat-label">Courses</div>
              </div>
            </div>
            <div className="col-12 col-md-4">
              <div className="ttm-stat-card">
                <div className="ttm-stat-value">{summary.teachers}</div>
                <div className="ttm-stat-label">Teachers</div>
              </div>
            </div>
          </div>

          <div className="row g-3">
            {/* Modal form for add/update timetable */}
            {modalOpen && (
              <div className="ttm-modal-backdrop">
                <div className="ttm-modal">
                  <div className="ttm-modal-header d-flex justify-content-between align-items-center mb-2">
                    <h5 className="mb-0">
                      {editingId ? "Update Entry" : "Add Entry"}
                    </h5>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => {
                        resetForm();
                      }}
                    >
                      Close
                    </button>
                  </div>

                  <div className="ttm-card p-3 p-md-4">
                    <form onSubmit={handleSubmit} className="ttm-form">
                      <div className="mb-3">
                        <label>Course</label>
                        <select
                          className="form-select"
                          value={form.course}
                          onChange={(e) => handleCourseChange(e.target.value)}
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
                          className="form-select mb-2"
                          value={form.classInfo}
                          onChange={(e) =>
                            handleClassInfoChange(e.target.value)
                          }
                        >
                          <option value="">Select class</option>
                          {CLASS_OPTIONS.map((className) => (
                            <option key={className} value={className}>
                              {className}
                            </option>
                          ))}
                        </select>

                        <label>Teacher</label>
                        <select
                          className="form-select"
                          value={form.teacher}
                          onChange={(e) =>
                            handleChange("teacher", e.target.value)
                          }
                          disabled={
                            !selectedCourse ||
                            !form.classInfo ||
                            !availableTeachers.length
                          }
                        >
                          <option value="">Select teacher</option>
                          {availableTeachers.map((teacher) => (
                            <option key={teacher._id} value={teacher._id}>
                              {teacher.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="mb-3">
                        <label>Day</label>
                        <select
                          className="form-select"
                          value={form.dayOfWeek}
                          onChange={(e) =>
                            handleChange("dayOfWeek", e.target.value)
                          }
                        >
                          <option value="">Select day</option>
                          {DAYS.map((day) => (
                            <option key={day} value={day}>
                              {day}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="row g-2 mb-3">
                        <div className="col-6">
                          <label>Start</label>
                          <input
                            type="time"
                            className="form-control"
                            value={form.startTime}
                            onChange={(e) =>
                              handleChange("startTime", e.target.value)
                            }
                          />
                        </div>
                        <div className="col-6">
                          <label>End</label>
                          <input
                            type="time"
                            className="form-control"
                            value={form.endTime}
                            onChange={(e) =>
                              handleChange("endTime", e.target.value)
                            }
                          />
                        </div>
                      </div>

                      <div className="mb-3 form-check">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          id="applyToAll"
                          checked={applyToAll}
                          disabled={!!editingId}
                          onChange={(e) => setApplyToAll(e.target.checked)}
                        />
                        <label
                          className="form-check-label"
                          htmlFor="applyToAll"
                        >
                          Apply this time slot to all weekdays (Mon - Sat)
                        </label>
                      </div>

                      <div className="d-flex gap-2">
                        <button
                          type="submit"
                          className="btn btn-dark"
                          disabled={saving}
                        >
                          {saving
                            ? "Saving..."
                            : editingId
                              ? "Update Timetable"
                              : "Add Timetable"}
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => resetForm()}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}

            <div className="col-12 col-xl-12">
              <div className="ttm-card p-3 p-md-4 h-100">
                <div className="d-flex flex-column flex-md-row justify-content-between gap-2 align-items-start align-items-md-center mb-3">
                  <div>
                    <h5 className="mb-1">Timetable Entries</h5>
                    <p className="text-muted mb-0 small">
                      View, edit, or delete entries quickly.
                    </p>
                  </div>
                  <div className="ttm-filters d-flex align-items-center">
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="Search course or teacher"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <select
                      className="form-select form-select-sm"
                      value={dayFilter}
                      onChange={(e) => setDayFilter(e.target.value)}
                    >
                      <option value="all">All Days</option>
                      {DAYS.map((day) => (
                        <option key={day} value={day}>
                          {day}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn btn-sm btn-primary ms-2"
                      onClick={() => {
                        resetForm();
                        setModalOpen(true);
                      }}
                    >
                      Add Timetable
                    </button>
                  </div>
                </div>

                {loading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-success" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                ) : filteredTimeTables.length === 0 ? (
                  <div className="alert alert-info mb-0">
                    No timetable entries found.
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="ttm-table">
                      <thead>
                        <tr>
                          <th>Day</th>
                          <th>Class</th>
                          <th>Course</th>
                          <th>Teacher</th>
                          <th>Time</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTimeTables.map((entry) => (
                          <tr key={entry._id}>
                            <td>
                              <span className="ttm-day-pill">
                                {entry.dayOfWeek}
                              </span>
                            </td>
                            <td>
                              <div className="fw-semibold">
                                {entry.classInfo || "-"}
                              </div>
                            </td>
                            <td>
                              <div className="fw-semibold">
                                {entry?.course?.title || "-"}
                              </div>
                            </td>
                            <td>
                              <div className="fw-semibold">
                                {entry?.teacher?.name || "-"}
                              </div>
                              <div className="text-muted small">
                                {entry?.teacher?.email || ""}
                              </div>
                            </td>
                            <td>
                              <div className="fw-semibold">
                                {entry.startTime} - {entry.endTime}
                              </div>
                            </td>
                            <td>
                              <div className="ttm-actions">
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-primary"
                                  onClick={() => handleEdit(entry)}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => handleDelete(entry._id)}
                                >
                                  Delete
                                </button>
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
        </div>
      </div>
    </Sidebar>
  );
}

export default TimeTableManage;
