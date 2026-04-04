import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Toaster, toast } from "react-hot-toast";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import Sidebar from "./Sidebar";
import "./StudentDashboard.css";

const CHART_COLORS = {
  present: "#0ea5a4",
  absent: "#f97316",
  grid: "#e2e8f0",
  axis: "#64748b",
};

function StudentDashboard() {
  const [student, setStudent] = useState(null);
  const [courses, setCourses] = useState([]);
  const [coursePercentageMap, setCoursePercentageMap] = useState({});
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseStats, setCourseStats] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);

  const API_BASE = "https://ec-backend-phi.vercel.app/api";

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

  const fetchProfile = async () => {
    setLoadingProfile(true);
    try {
      const res = await axios.get(`${API_BASE}/students/myProfile`, {
        headers: getAuthHeaders(),
      });

      if (res.data?.success) {
        setStudent(res.data.student);
      } else {
        toast.error(res.data?.message || "Failed to load profile");
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to load profile."));
    } finally {
      setLoadingProfile(false);
    }
  };

  const fetchCourses = async () => {
    setLoadingCourses(true);
    try {
      const res = await axios.get(`${API_BASE}/registration/myCourses`, {
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

  const fetchCourseStats = async (courseId) => {
    setLoadingStats(true);
    try {
      const res = await axios.get(
        `${API_BASE}/attendance/studentStats/${courseId}`,
        {
          headers: getAuthHeaders(),
        },
      );

      if (res.data?.success) {
        setCourseStats(res.data);
      } else {
        toast.error(res.data?.message || "Failed to load course stats");
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to load attendance stats."));
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchCourses();
  }, []);

  useEffect(() => {
    if (!courses.length) {
      setCoursePercentageMap({});
      return;
    }

    let isCancelled = false;

    const fetchPercentages = async () => {
      const entries = await Promise.all(
        courses.map(async (course) => {
          try {
            const res = await axios.get(
              `${API_BASE}/attendance/studentStats/${course._id}`,
              {
                headers: getAuthHeaders(),
              },
            );

            return [
              String(course._id),
              Number(res?.data?.stats?.percentage || 0),
            ];
          } catch {
            return [String(course._id), 0];
          }
        }),
      );

      if (!isCancelled) {
        setCoursePercentageMap(Object.fromEntries(entries));
      }
    };

    fetchPercentages();

    return () => {
      isCancelled = true;
    };
  }, [courses]);

  const getTeacherNamesForClass = (course, classInfo) => {
    const assignments = Array.isArray(course?.assignments)
      ? course.assignments
      : [];

    const filteredAssignments = assignments.filter((assignment) => {
      const targetClasses = Array.isArray(assignment?.targetClasses)
        ? assignment.targetClasses
        : [];
      return classInfo ? targetClasses.includes(classInfo) : true;
    });

    const names = filteredAssignments
      .map((assignment) => {
        const teacher = assignment?.teacher;
        if (teacher && typeof teacher === "object") {
          return teacher.name || "Unknown";
        }
        return "Unknown";
      })
      .filter(Boolean);

    return names.length ? [...new Set(names)].join(", ") : "N/A";
  };

  const handleCourseClick = (course) => {
    setSelectedCourse(course);
    setShowModal(true);
    fetchCourseStats(course._id);
  };

  const coursesWithPercentage = useMemo(
    () =>
      courses.map((course) => {
        const percentage = Number(coursePercentageMap[String(course._id)] || 0);
        const teacherNames = getTeacherNamesForClass(
          course,
          student?.classInfo,
        );
        return { ...course, percentage, teacherNames };
      }),
    [courses, coursePercentageMap, student],
  );

  if (loadingProfile) {
    return (
      <Sidebar>
        <div className="text-center py-5">
          <div className="spinner-border text-success" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </Sidebar>
    );
  }

  return (
    <Sidebar>
      <Toaster position="top-right" />

      <div className="student-dashboard mt-3 mt-lg-4">
        <div className="container-fluid px-0 px-lg-2">
          {/* Hero Section with Profile Card */}
          <div className="dashboard-hero mb-4">
            <div className="d-flex flex-column flex-lg-row justify-content-between gap-4 align-items-start">
              <div>
                <p className="mb-1 text-white-50 fw-semibold">Welcome Back</p>
                <h3 className="mb-2">{student?.name || "Student"}</h3>
                <p className="mb-0 text-white-75">
                  View your profile, registered courses, and attendance
                  statistics.
                </p>
              </div>
            </div>
          </div>

          {/* Profile Cards Grid */}
          <div className="row g-3 mb-4">
            <div className="col-12 col-sm-6 col-lg-3">
              <div className="dashboard-stat-card">
                <div className="stat-icon bg-primary">
                  <i className="fas fa-user"></i>
                </div>
                <div className="stat-content">
                  <div className="stat-label">Roll Number</div>
                  <div className="stat-value">{student?.rollNumber || "-"}</div>
                </div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-lg-3">
              <div className="dashboard-stat-card">
                <div className="stat-icon bg-success">
                  <i className="fas fa-book"></i>
                </div>
                <div className="stat-content">
                  <div className="stat-label">Courses Enrolled</div>
                  <div className="stat-value">
                    {coursesWithPercentage.length}
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-lg-3">
              <div className="dashboard-stat-card">
                <div className="stat-icon bg-info">
                  <i className="fas fa-graduation-cap"></i>
                </div>
                <div className="stat-content">
                  <div className="stat-label">Class</div>
                  <div className="stat-value">{student?.classInfo || "-"}</div>
                </div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-lg-3">
              <div className="dashboard-stat-card">
                <div className="stat-icon bg-warning">
                  <i className="fas fa-envelope"></i>
                </div>
                <div className="stat-content">
                  <div className="stat-label">Email</div>
                  <div className="stat-value-email">
                    {student?.email || "-"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Full Profile Card */}
          <div className="dashboard-card dashboard-profile-card p-3 p-md-4 mb-4">
            <h5 className="dashboard-section-title mb-4">Complete Profile</h5>

            <div className="row g-3">
              <div className="col-12 col-md-6">
                <div className="profile-field compact">
                  <label className="profile-label">Full Name</label>
                  <div className="profile-value compact">
                    {student?.name || "-"}
                  </div>
                </div>
              </div>

              <div className="col-12 col-md-6">
                <div className="profile-field compact">
                  <label className="profile-label">Email</label>
                  <div className="profile-value compact">
                    {student?.email || "-"}
                  </div>
                </div>
              </div>

              <div className="col-12 col-md-6">
                <div className="profile-field compact">
                  <label className="profile-label">Contact</label>
                  <div className="profile-value compact">
                    {student?.contact || "-"}
                  </div>
                </div>
              </div>

              <div className="col-12 col-md-6">
                <div className="profile-field compact">
                  <label className="profile-label">Gender</label>
                  <div className="profile-value compact">
                    {student?.gender || "-"}
                  </div>
                </div>
              </div>

              <div className="col-12 col-md-6">
                <div className="profile-field compact">
                  <label className="profile-label">Class</label>
                  <div className="profile-value compact">
                    {student?.classInfo || "-"}
                  </div>
                </div>
              </div>

              <div className="col-12 col-md-6">
                <div className="profile-field compact">
                  <label className="profile-label">Father's Name</label>
                  <div className="profile-value compact">
                    {student?.fatherName || "-"}
                  </div>
                </div>
              </div>

              <div className="col-12 col-md-6">
                <div className="profile-field compact">
                  <label className="profile-label">Father's Contact</label>
                  <div className="profile-value compact">
                    {student?.fatherContact || "-"}
                  </div>
                </div>
              </div>

              <div className="col-12 col-md-6">
                <div className="profile-field compact">
                  <label className="profile-label">Address</label>
                  <div className="profile-value compact">
                    {student?.address || "-"}
                  </div>
                </div>
              </div>

              <div className="col-12 col-md-6">
                <div className="profile-field compact">
                  <label className="profile-label">Roll Number</label>
                  <div className="profile-value compact">
                    {student?.rollNumber || "-"}
                  </div>
                </div>
              </div>

              <div className="col-12 col-md-6">
                <div className="profile-field compact">
                  <label className="profile-label">Institution Type</label>
                  <div className="profile-value compact">
                    {student?.institutionType || "-"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Registered Courses Table */}
          <div className="dashboard-card p-3 p-md-4">
            <h5 className="dashboard-section-title mb-3">Registered Courses</h5>

            {loadingCourses ? (
              <div className="text-center py-4">
                <div className="spinner-border text-success" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : coursesWithPercentage.length === 0 ? (
              <div className="alert alert-info mb-0">
                No courses registered yet.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Course Title</th>
                      <th>Teacher(s)</th>
                      <th>Price</th>
                      <th>Attendance</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coursesWithPercentage.map((course, index) => (
                      <tr key={course._id}>
                        <td>{index + 1}</td>
                        <td>
                          <div className="fw-semibold">{course.title}</div>
                          <div className="text-muted small">
                            {course.description}
                          </div>
                        </td>
                        <td>
                          <small>{course.teacherNames}</small>
                        </td>
                        <td>
                          <strong>Rs. {Number(course.coursePrice || 0)}</strong>
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <div
                              className="progress flex-grow-1"
                              style={{ height: "6px", borderRadius: 999 }}
                            >
                              <div
                                className={`progress-bar ${
                                  course.percentage >= 75
                                    ? "bg-success"
                                    : course.percentage >= 50
                                      ? "bg-warning"
                                      : "bg-danger"
                                }`}
                                style={{ width: `${course.percentage}%` }}
                              ></div>
                            </div>
                            <small className="fw-semibold">
                              {course.percentage}%
                            </small>
                          </div>
                        </td>
                        <td>
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => handleCourseClick(course)}
                          >
                            <i className="fas fa-chart-line me-1"></i>
                            Details
                          </button>
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

      {/* Attendance Modal */}
      {showModal && (
        <div
          className="dashboard-modal-backdrop"
          onClick={() => setShowModal(false)}
        >
          <div
            className="dashboard-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0">{selectedCourse?.title} - Attendance</h5>
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={() => setShowModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {loadingStats ? (
              <div className="text-center py-5">
                <div className="spinner-border text-success" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : courseStats ? (
              <>
                <div className="row g-3 mb-4">
                  <div className="col-12 col-sm-6 col-lg-3">
                    <div className="stats-card ">
                      <div className="stats-icon">
                        <i className="fas fa-calendar-days"></i>
                      </div>
                      <div className="stats-content">
                        <div className="stats-label">Total Classes</div>
                        <div className="stats-value">
                          {courseStats.stats.total}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-12 col-sm-6 col-lg-3">
                    <div className="stats-card ">
                      <div className="stats-icon">
                        <i className="fas fa-check-circle"></i>
                      </div>
                      <div className="stats-content">
                        <div className="stats-label">Present</div>
                        <div className="stats-value">
                          {courseStats.stats.present}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-12 col-sm-6 col-lg-3">
                    <div className="stats-card ">
                      <div className="stats-icon">
                        <i className="fas fa-times-circle"></i>
                      </div>
                      <div className="stats-content">
                        <div className="stats-label">Absent</div>
                        <div className="stats-value">
                          {courseStats.stats.absent}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-12 col-sm-6 col-lg-3">
                    <div className="stats-card ">
                      <div className="stats-icon">
                        <i className="fas fa-percentage"></i>
                      </div>
                      <div className="stats-content">
                        <div className="stats-label">Percentage</div>
                        <div className="stats-value">
                          {courseStats.stats.percentage}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="row g-3 mb-2">
                  <div className="col-12 col-lg-4">
                    <div className="chart-panel h-100">
                      <h6 className="mb-3">Attendance Split</h6>
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={[
                              {
                                name: "Present",
                                value: Number(courseStats?.stats?.present || 0),
                              },
                              {
                                name: "Absent",
                                value: Number(courseStats?.stats?.absent || 0),
                              },
                            ]}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={60}
                            outerRadius={88}
                            paddingAngle={3}
                          >
                            <Cell fill={CHART_COLORS.present} />
                            <Cell fill={CHART_COLORS.absent} />
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="col-12 col-lg-8">
                    <div className="chart-panel h-100">
                      <h6 className="mb-3">Monthly Attendance Trend</h6>
                      {courseStats.chartData &&
                      courseStats.chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart data={courseStats.chartData}>
                            <CartesianGrid
                              strokeDasharray="4 4"
                              stroke={CHART_COLORS.grid}
                            />
                            <XAxis dataKey="month" stroke={CHART_COLORS.axis} />
                            <YAxis stroke={CHART_COLORS.axis} />
                            <Tooltip />
                            <Legend />
                            <Bar
                              dataKey="present"
                              fill={CHART_COLORS.present}
                              radius={[8, 8, 0, 0]}
                              name="Present"
                            />
                            <Bar
                              dataKey="absent"
                              fill={CHART_COLORS.absent}
                              radius={[8, 8, 0, 0]}
                              name="Absent"
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="alert alert-info mb-0">
                          No attendance data available.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="alert alert-warning mb-0">
                Failed to load attendance details.
              </div>
            )}
          </div>
        </div>
      )}
    </Sidebar>
  );
}

export default StudentDashboard;
