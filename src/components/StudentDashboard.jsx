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
  const [isMobile, setIsMobile] = useState(false);
  const [courseStatsMap, setCourseStatsMap] = useState({});

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
    const updateMobileState = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    updateMobileState();
    window.addEventListener("resize", updateMobileState);

    return () => window.removeEventListener("resize", updateMobileState);
  }, []);

  useEffect(() => {
    if (!courses.length) {
      setCoursePercentageMap({});
      setCourseStatsMap({});
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
              {
                percentage: Number(res?.data?.stats?.percentage || 0),
                present: Number(res?.data?.stats?.present || 0),
                absent: Number(res?.data?.stats?.absent || 0),
                total: Number(res?.data?.stats?.total || 0),
              },
            ];
          } catch {
            return [
              String(course._id),
              { percentage: 0, present: 0, absent: 0, total: 0 },
            ];
          }
        }),
      );

      if (!isCancelled) {
        const statsEntries = Object.fromEntries(entries);
        setCourseStatsMap(statsEntries);
        setCoursePercentageMap(
          Object.fromEntries(
            Object.entries(statsEntries).map(([courseId, stats]) => [
              courseId,
              stats.percentage,
            ]),
          ),
        );
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

  const averageAttendance = useMemo(() => {
    if (!coursesWithPercentage.length) return 0;
    return Math.round(
      coursesWithPercentage.reduce(
        (sum, course) => sum + course.percentage,
        0,
      ) / coursesWithPercentage.length,
    );
  }, [coursesWithPercentage]);

  const overallAttendanceData = useMemo(() => {
    const totals = Object.values(courseStatsMap).reduce(
      (acc, stats) => {
        acc.present += Number(stats?.present || 0);
        acc.absent += Number(stats?.absent || 0);
        return acc;
      },
      { present: 0, absent: 0 },
    );

    return [
      { name: "Present", value: totals.present },
      { name: "Absent", value: totals.absent },
    ];
  }, [courseStatsMap]);

  const overallAttendanceSummary = useMemo(() => {
    const total = overallAttendanceData.reduce(
      (sum, item) => sum + Number(item.value || 0),
      0,
    );
    const present = Number(overallAttendanceData[0]?.value || 0);
    const absent = Number(overallAttendanceData[1]?.value || 0);
    const presentPercent = total > 0 ? Math.round((present / total) * 100) : 0;
    const absentPercent = total > 0 ? 100 - presentPercent : 0;

    return { total, present, absent, presentPercent, absentPercent };
  }, [overallAttendanceData]);

  const resultPieData = useMemo(
    () => [
      { name: "Pass", value: 72 },
      { name: "Average", value: 18 },
      { name: "Need Improvement", value: 10 },
    ],
    [],
  );

  const resultSnapshotSummary = useMemo(() => {
    const total = resultPieData.reduce(
      (sum, item) => sum + Number(item.value || 0),
      0,
    );

    const buildGradient = (items) => {
      let start = 0;
      return items
        .map((item) => {
          const span = total > 0 ? (Number(item.value || 0) / total) * 100 : 0;
          const segment = `${item.color} ${start}% ${start + span}%`;
          start += span;
          return segment;
        })
        .join(", ");
    };

    const items = [
      { ...resultPieData[0], color: "#22c55e" },
      { ...resultPieData[1], color: "#f59e0b" },
      { ...resultPieData[2], color: "#ef4444" },
    ];

    return {
      total,
      items,
      gradient: buildGradient(items),
    };
  }, [resultPieData]);

  const courseAttendanceChartData = useMemo(
    () =>
      coursesWithPercentage.map((course) => ({
        name:
          course.title.length > 18
            ? `${course.title.slice(0, 18)}...`
            : course.title,
        percentage: course.percentage,
      })),
    [coursesWithPercentage],
  );

  const attendanceBreakdownData = useMemo(() => {
    const excellent = coursesWithPercentage.filter(
      (course) => course.percentage >= 75,
    ).length;
    const average = coursesWithPercentage.filter(
      (course) => course.percentage >= 50 && course.percentage < 75,
    ).length;
    const low = coursesWithPercentage.filter(
      (course) => course.percentage < 50,
    ).length;

    return [
      { name: "75%+", value: excellent },
      { name: "50-74%", value: average },
      { name: "Below 50%", value: low },
    ];
  }, [coursesWithPercentage]);

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
          {/* Hero Section */}
          <div className="dashboard-hero mb-4">
            <div className="d-flex flex-column flex-md-row justify-content-between gap-3 align-items-start">
              <div className="student-identity-card">
                <div className="student-identity-avatar">
                  {(student?.name || "S").charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="mb-1 text-white-50 fw-semibold">Welcome Back</p>
                  <h3 className="mb-1">{student?.name || "Student"}</h3>
                  <div className="student-identity-meta">
                    <span>
                      <i className="fas fa-id-badge me-1"></i>
                      {student?.rollNumber || "-"}
                    </span>
                    <span className="d-none d-sm-inline">
                      <i className="fas fa-graduation-cap me-1"></i>
                      {student?.classInfo || "-"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="dashboard-card p-3 p-md-4 mb-4">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-start gap-2 mb-3">
              <div>
                <h5 className="dashboard-section-title mb-1">
                  Overview Charts
                </h5>
                <p className="text-muted mb-0 small">
                  Attendance and result snapshots
                </p>
              </div>
            </div>

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
              <div className="row g-3">
                <div className="col-12 col-lg-6">
                  <div className="chart-panel overview-donut-card h-100">
                    <div className="d-flex align-items-center justify-content-between mb-3">
                      <h6 className="mb-0">Overall Attendance</h6>
                      <span className="text-muted small">
                        Present vs absent across all courses
                      </span>
                    </div>

                    <div className="donut-chart-wrap">
                      <div
                        className="donut-chart"
                        style={{
                          background: `conic-gradient(${CHART_COLORS.present} 0% ${overallAttendanceSummary.presentPercent}%, ${CHART_COLORS.absent} ${overallAttendanceSummary.presentPercent}% 100%)`,
                        }}
                      >
                        <div className="donut-chart-inner">
                          <div className="donut-chart-value">
                            {overallAttendanceSummary.total > 0
                              ? `${overallAttendanceSummary.presentPercent}%`
                              : "0%"}
                          </div>
                          <div className="donut-chart-label">Present</div>
                        </div>
                      </div>

                      <div className="donut-legend">
                        <div className="donut-legend-item">
                          <span className="donut-dot present"></span>
                          <span>Present</span>
                          <strong>{overallAttendanceSummary.present}</strong>
                        </div>
                        <div className="donut-legend-item">
                          <span className="donut-dot absent"></span>
                          <span>Absent</span>
                          <strong>{overallAttendanceSummary.absent}</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-12 col-lg-6">
                  <div className="chart-panel overview-donut-card h-100">
                    <div className="d-flex align-items-center justify-content-between mb-3">
                      <h6 className="mb-0">Results Snapshot</h6>
                      <span className="text-muted small">
                        Dummy result distribution
                      </span>
                    </div>

                    <div className="donut-chart-wrap">
                      <div
                        className="donut-chart"
                        style={{ background: `conic-gradient(${resultSnapshotSummary.gradient})` }}
                      >
                        <div className="donut-chart-inner">
                          <div className="donut-chart-value">72%</div>
                          <div className="donut-chart-label">Pass</div>
                        </div>
                      </div>

                      <div className="donut-legend">
                        {resultSnapshotSummary.items.map((item) => (
                          <div key={item.name} className="donut-legend-item">
                            <span
                              className="donut-dot"
                              style={{ backgroundColor: item.color }}
                            ></span>
                            <span>{item.name}</span>
                            <strong>{item.value}%</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Registered Courses */}
          <div className="dashboard-card p-3 p-md-4">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-start gap-2 mb-3">
              <div>
                <h5 className="dashboard-section-title mb-1">
                  Registered Courses
                </h5>
                <p className="text-muted mb-0 small">
                  Course cards with attendance progress
                </p>
              </div>
            </div>

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
              <div className="row g-3 course-cards-row">
                {coursesWithPercentage.map((course) => (
                  <div key={course._id} className="col-12 col-md-6 col-xl-4">
                    <div className="course-attendance-card h-100">
                      <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
                        <div>
                          <h6 className="course-card-title mb-1">
                            {course.title}
                          </h6>
                          <p className="course-card-text mb-0 d-none d-sm-block">
                            {course.teacherNames}
                          </p>
                        </div>
                        <span
                          className={`course-grade-badge ${
                            course.percentage >= 75
                              ? "success"
                              : course.percentage >= 50
                                ? "warning"
                                : "danger"
                          }`}
                        >
                          {course.percentage}%
                        </span>
                      </div>

                      <div className="course-progress-wrap mb-3">
                        <div className="progress" style={{ height: "8px" }}>
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
                        <div className="d-flex justify-content-between mt-2 small text-muted">
                          <span>Attendance</span>
                          <span>{course.percentage}%</span>
                        </div>
                      </div>

                      <div className="d-flex justify-content-between align-items-center">
                        <small className="text-muted">
                          Click for detailed chart
                        </small>
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => handleCourseClick(course)}
                        >
                          <i className="fas fa-chart-line me-1"></i>
                          Details
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
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

                {/* Recent Attendance History */}
                <div className="attendance-history mt-4">
                  <h6 className="mb-3">Recent Attendance (Last 30 Days)</h6>
                  {courseStats.recentAttendance &&
                  courseStats.recentAttendance.length > 0 ? (
                    <div className="attendance-history-grid">
                      {courseStats.recentAttendance.map((record, index) => (
                        <div key={index} className="attendance-record">
                          <div className="attendance-date">{record.date}</div>
                          <div
                            className={`attendance-status attendance-${record.status}`}
                          >
                            <i
                              className={`fas fa-${record.status === "present" ? "check-circle" : "times-circle"}`}
                            ></i>
                            <span>
                              {record.status === "present"
                                ? "Present"
                                : "Absent"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="alert alert-info mb-0">
                      No attendance history available.
                    </div>
                  )}
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
