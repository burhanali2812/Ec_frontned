import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";
import Sidebar from "../Sidebar";
import Footer from "../footer";
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend as ChartLegend,
  LinearScale,
  Title,
  Tooltip as ChartTooltip,
} from "chart.js";
import { Doughnut, Bar } from "react-chartjs-2";
import "./TeacherPanel.css";

ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  ChartTooltip,
  ChartLegend,
);

const CHART_COLORS = {
  present: "#10b981",
  absent: "#f59e0b",
  approved: "#3b82f6",
  pending: "#f59e0b",
  rejected: "#ef4444",
  grid: "#e2e8f0",
  axis: "#64748b",
};

function TeacherPanel() {
  const [teacher, setTeacher] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalCourses: 0,
    totalClasses: 0,
    leavesPending: 0,
  });
  const navigate = useNavigate();

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

  useEffect(() => {
    const fetchTeacherData = async () => {
      setLoading(true);
      try {
        // Fetch teacher profile
        const profileRes = await axios.get(`${API_BASE}/teacher/profile`, {
          headers: getAuthHeaders(),
        });

        if (profileRes.data?.success) {
          setTeacher(profileRes.data.teacher);
        }

        // Fetch teacher's courses
        try {
          const coursesRes = await axios.get(
            `${API_BASE}/courses/getAllCourses`,
            {
              headers: getAuthHeaders(),
            },
          );

          if (coursesRes.data?.success) {
            const teacherCourses = coursesRes.data.courses || [];
            setCourses(teacherCourses);

            // Calculate stats
            setStats((prev) => ({
              ...prev,
              totalCourses: teacherCourses.length,
              totalClasses: teacherCourses.length * 4, // Approximate classes per course
            }));
          }
        } catch {
          setCourses([]);
        }

        // Fetch leaves info
        try {
          const leavesRes = await axios.get(
            `${API_BASE}/leave/myLeaves`,
            {
              headers: getAuthHeaders(),
            },
          );

          if (leavesRes.data?.leaves) {
            const pending = leavesRes.data.leaves.filter(
              (leave) => leave.status === "pending",
            ).length;
            setStats((prev) => ({
              ...prev,
              leavesPending: pending,
            }));
          }
        } catch {
          // Leave endpoint might not exist or fail
        }
      } catch (error) {
        toast.error(getErrorMessage(error, "Unable to load teacher data."));
      } finally {
        setLoading(false);
      }
    };

    fetchTeacherData();
  }, []);

  const quickAccessItems = useMemo(
    () => [
      {
        label: "Mark Attendance",
        icon: "fas fa-calendar-check",
        href: "/teacher/attendance",
      },
      {
        label: "View Attendance",
        icon: "fas fa-chart-line",
        href: "/teacher/view-attendance",
      },
      {
        label: "Upload Results",
        icon: "fas fa-square-poll-vertical",
        href: "/teacher/upload-result",
      },
      {
        label: "Apply Leave",
        icon: "fas fa-envelope-open-text",
        href: "/apply-leave",
      },
      {
        label: "Timetable",
        icon: "fas fa-calendar-days",
        href: "/coming-soon",
      },
      {
        label: "Assignments",
        icon: "fas fa-file-import",
        href: "/coming-soon",
      },
    ],
    [],
  );

  const chartData = useMemo(() => {
    return {
      labels: ["Courses", "Classes", "Students"],
      datasets: [
        {
          data: [stats.totalCourses, stats.totalClasses, stats.totalStudents],
          backgroundColor: ["#3b82f6", "#8b5cf6", "#10b981"],
          borderWidth: 0,
        },
      ],
    };
  }, [stats]);

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      cutout: "60%",
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: "bottom",
          labels: {
            color: "#334155",
            boxWidth: 12,
            padding: 14,
            font: { size: 12, weight: "600" },
          },
        },
      },
    }),
    [],
  );

  const overviewChartOptions = useMemo(
    () => ({
      ...chartOptions,
      plugins: {
        ...chartOptions.plugins,
        legend: {
          ...chartOptions.plugins.legend,
          display: false,
        },
      },
    }),
    [chartOptions],
  );

  if (loading) {
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

      <div className="teacher-dashboard">
        <div className="container-fluid px-0 px-lg-2 bg-transparent">
          {/* Hero Section */}
          <div className="dashboard-hero mb-2 mt-2 mb-lg-4">
            <div className="d-flex flex-column flex-md-row justify-content-between gap-2 align-items-start">
              <div className="student-identity-card">
                <div className="student-identity-avatar teacher-avatar">
                  <i className="fas fa-chalkboard-user"></i>
                </div>
                <div>
                  <h6 className="mb-1 text-dark fw-semibold">Welcome 👋</h6>
                  <h5 className="mb-1">
                    {teacher?.name || "Teacher"}'s Dashboard
                  </h5>
                  <div className="student-identity-meta">
                    <span>
                      <i className="fas fa-envelope me-1"></i>
                      {teacher?.email || "email@example.com"}
                    </span>
                    {teacher?.salary && (
                      <span className="ms-3">
                        <i className="fas fa-wallet me-1"></i>
                        Salary: PKR {teacher.salary.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Access */}
          <div className="dashboard-card quick-access-grid-card p-3 p-lg-4 mb-2">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="dashboard-section-title mb-0">Quick Access</h5>
            </div>

            <div className="quick-access-circle-grid">
              {quickAccessItems.map((item) => (
                <div
                  key={item.label}
                  className="quick-access-circle-item"
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(item.href)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate(item.href);
                    }
                  }}
                >
                  <span className="quick-access-circle-icon">
                    <i className={item.icon}></i>
                  </span>
                  <span className="quick-access-circle-text">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Overview Stats */}
          <div className="dashboard-card overview-dashboard-card py-2 px-2 mb-2">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-start gap-2 mb-2">
              <div>
                <h5 className="dashboard-section-title ms-2">Overview Stats</h5>
              </div>
            </div>

            <div className="row g-3 g-lg-4 overview-graphs-row">
              <div className="col-12 col-lg-6">
                <div className="chart-panel overview-donut-card h-100">
                  <h6 className="mb-2 text-center">Teaching Overview</h6>

                  <div className="chart-canvas-wrap">
                    <div className="chart-canvas-box chart-canvas-box--overview">
                      {chartData && (
                        <Doughnut
                          data={chartData}
                          options={overviewChartOptions}
                        />
                      )}
                    </div>
                    <div className="chart-hint-row mt-2">
                      <span className="chart-hint-item">
                        <span
                          className="chart-hint-dot"
                          style={{ backgroundColor: "#3b82f6" }}
                        ></span>
                        Courses
                      </span>
                      <span className="chart-hint-item">
                        <span
                          className="chart-hint-dot"
                          style={{ backgroundColor: "#8b5cf6" }}
                        ></span>
                        Classes
                      </span>
                      <span className="chart-hint-item">
                        <span
                          className="chart-hint-dot"
                          style={{ backgroundColor: "#10b981" }}
                        ></span>
                        Students
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-12 col-lg-6">
                <div className="dashboard-card-row h-100">
                  <div className="row g-3 h-100">
                    <div className="col-12 col-md-6">
                      <div className="stats-card stats-card-primary">
                        <div className="stats-icon">
                          <i className="fas fa-book-open"></i>
                        </div>
                        <div className="stats-content">
                          <h6 className="stats-label">Courses</h6>
                          <h4 className="stats-value">
                            {stats.totalCourses}
                          </h4>
                        </div>
                      </div>
                    </div>
                    <div className="col-12 col-md-6">
                      <div className="stats-card stats-card-success">
                        <div className="stats-icon">
                          <i className="fas fa-users"></i>
                        </div>
                        <div className="stats-content">
                          <h6 className="stats-label">Students</h6>
                          <h4 className="stats-value">
                            {stats.totalStudents}
                          </h4>
                        </div>
                      </div>
                    </div>
                    <div className="col-12 col-md-6">
                      <div className="stats-card stats-card-info">
                        <div className="stats-icon">
                          <i className="fas fa-calendar-check"></i>
                        </div>
                        <div className="stats-content">
                          <h6 className="stats-label">Classes</h6>
                          <h4 className="stats-value">{stats.totalClasses}</h4>
                        </div>
                      </div>
                    </div>
                    <div className="col-12 col-md-6">
                      <div className="stats-card stats-card-warning">
                        <div className="stats-icon">
                          <i className="fas fa-hourglass-end"></i>
                        </div>
                        <div className="stats-content">
                          <h6 className="stats-label">Pending Leaves</h6>
                          <h4 className="stats-value">
                            {stats.leavesPending}
                          </h4>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Courses Section */}
          {courses.length > 0 && (
            <div className="dashboard-card courses-dashboard-card py-3 px-3 mb-2">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="dashboard-section-title mb-0">My Courses</h5>
              </div>

              <div className="courses-grid">
                {courses.slice(0, 6).map((course) => (
                  <div
                    key={course._id}
                    className="course-card"
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      navigate("/teacher/attendance", {
                        state: { courseId: course._id },
                      })
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        navigate("/teacher/attendance", {
                          state: { courseId: course._id },
                        });
                      }
                    }}
                  >
                    <div className="course-card-header">
                      <h6 className="course-card-title">{course.title}</h6>
                    </div>
                    <div className="course-card-body">
                      <p className="course-card-meta">
                        <i className="fas fa-code-branch me-1"></i>
                        {course.courseCode || "N/A"}
                      </p>
                      <p className="course-card-meta">
                        <i className="fas fa-graduation-cap me-1"></i>
                        {course.credits || 3} Credits
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {courses.length > 6 && (
                <div className="text-center mt-3">
                  <button className="btn btn-outline-secondary btn-sm">
                    View All {courses.length} Courses
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <Footer />
        </div>
      </div>
    </Sidebar>
  );
}

export default TeacherPanel;
