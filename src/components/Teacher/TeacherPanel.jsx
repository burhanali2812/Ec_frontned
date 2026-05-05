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
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
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

  const handleLogOut = () => {
    const confirmed = window.confirm("Are you sure you want to logout?");
    if (confirmed) {
      localStorage.removeItem("token");
      navigate("/");
    }
  };

  useEffect(() => {
    const fetchTeacherData = async () => {
      const headers = getAuthHeaders();

      try {
        // Fetch profile first (quick)
        try {
          const profileRes = await axios.get(`${API_BASE}/teacher/profile`, {
            headers,
          });
          if (profileRes.data?.success) {
            setTeacher(profileRes.data.teacher);
          }
        } catch (error) {
          console.error("Profile fetch error:", error);
        } finally {
          setLoadingProfile(false);
        }

        // Run all 4 remaining APIs in parallel
        const [coursesRes, leavesRes, studentsRes] = await Promise.allSettled([
          axios.get(`${API_BASE}/courses/getTeacherCourses`, { headers }),
          axios.get(`${API_BASE}/leave/myLeaves`, { headers }),
          axios.get(`${API_BASE}/teacher/totalStudents`, { headers }),
        ]);

        // Handle courses response
        if (
          coursesRes.status === "fulfilled" &&
          coursesRes.value?.data?.success
        ) {
          const teacherCourses = coursesRes.value.data.courses || [];
          setCourses(teacherCourses);
          setStats((prev) => ({
            ...prev,
            totalCourses: teacherCourses.length,
            totalClasses: teacherCourses.length * 4,
          }));
        } else {
          setCourses([]);
        }
        setLoadingCourses(false);

        // Handle leaves response
        if (
          leavesRes.status === "fulfilled" &&
          leavesRes.value?.data?.success
        ) {
          setStats((prev) => ({
            ...prev,
            leavesPending: leavesRes.value.data.pendingCount || 0,
          }));
        }

        // Handle students response
        if (
          studentsRes.status === "fulfilled" &&
          studentsRes.value?.data?.success
        ) {
          setStats((prev) => ({
            ...prev,
            totalStudents: studentsRes.value.data.totalStudents || 0,
          }));
        }

        setLoadingStats(false);
      } catch (error) {
        toast.error(getErrorMessage(error, "Unable to load teacher data."));
        setLoadingStats(false);
        setLoadingCourses(false);
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
        href: "/teacher/timetable",
      },
      {
        label: "Add Lectures & Notes",
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

  const showPasswordResetDialog =
    !loadingProfile && teacher?.isPasswordChanged === false;

  return (
    <Sidebar>
      <Toaster position="top-right" />

      {showPasswordResetDialog && (
        <div className="dashboard-modal-backdrop teacher-password-reset-backdrop">
          <div className="dashboard-modal-card teacher-password-reset-card">
            <div className="teacher-password-reset-icon">
              <i className="fas fa-user-shield"></i>
            </div>

            <h3 className="teacher-password-reset-title">
              Reset Your Password
            </h3>
            <p className="teacher-password-reset-text">
              Your account password has not been changed yet. Please reset your
              password to continue using the teacher portal securely.
            </p>

            <div className="teacher-password-reset-info">
              <div className="password-reset-info-row">
                <span>Name</span>
                <strong>{teacher?.name || "Teacher"}</strong>
              </div>
              <div className="password-reset-info-row">
                <span>Email</span>
                <strong>{teacher?.email || "-"}</strong>
              </div>
              <div className="password-reset-info-row">
                <span>Status</span>
                <strong className="password-reset-status-badge">
                  Password Pending
                </strong>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-outline-dark px-4 py-2 w-100 rounded-4 "
              onClick={() =>
                navigate("/password-reset", { state: { role: "teacher" } })
              }
            >
              <i className="fas fa-key me-2"></i>
              Reset Password Now
            </button>
            <button
              type="button"
              className="btn btn-danger px-4 py-2 w-100 rounded-4 mt-3"
              onClick={handleLogOut}
            >
              <i className="fas fa-sign-out-alt me-2"></i>
              Log Out
            </button>
          </div>
        </div>
      )}

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
                  {loadingProfile ? (
                    <>
                      <div
                        className="placeholder-glow"
                        style={{ maxWidth: "300px" }}
                      >
                        <span
                          className="placeholder col-8"
                          style={{ height: "1.5rem" }}
                        ></span>
                      </div>
                      <div className="placeholder-glow mt-2">
                        <span
                          className="placeholder col-10"
                          style={{ height: "1rem" }}
                        ></span>
                      </div>
                    </>
                  ) : (
                    <>
                      <h5 className="mb-1">{teacher?.name || "Teacher"}</h5>
                      <div className="student-identity-meta">
                        <span>{"Your ClassRoom, Your Impact"}</span>
                      </div>
                    </>
                  )}
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
          <div className="dashboard-card overview-dashboard-card py-2 px-3  mb-2">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-start gap-2 mb-2">
              <div>
                <h5 className="dashboard-section-title ms-2">Overview Stats</h5>
              </div>
            </div>

            <div className="px-3">
              <div>
                <div className="col-12 col-lg-6">
                  <div className="chart-panel overview-donut-card h-100">
                    <h6 className="mb-2 text-center">Teaching Overview</h6>

                    {loadingStats ? (
                      <div className="text-center py-5">
                        <div
                          className="spinner-border text-success"
                          role="status"
                        >
                          <span className="visually-hidden">Loading...</span>
                        </div>
                      </div>
                    ) : (
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
                            Courses({stats.totalCourses})
                          </span>
                          <span className="chart-hint-item">
                            <span
                              className="chart-hint-dot"
                              style={{ backgroundColor: "#8b5cf6" }}
                            ></span>
                            Classes({stats.totalClasses})
                          </span>
                          <span className="chart-hint-item">
                            <span
                              className="chart-hint-dot"
                              style={{ backgroundColor: "#10b981" }}
                            ></span>
                            Students({stats.totalStudents})
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Courses Section */}
          {loadingCourses ? (
            <div className="dashboard-card courses-dashboard-card py-3 px-3 mb-2">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="dashboard-section-title mb-0">My Courses</h5>
              </div>
              <div className="text-center py-4">
                <div className="spinner-border text-success" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            </div>
          ) : courses.length > 0 ? (
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
                    <div>
                      <h6 className="course-card-title">{course.title}</h6>
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
          ) : null}

          {/* Footer */}
          <Footer />
        </div>
      </div>
    </Sidebar>
  );
}

export default TeacherPanel;
