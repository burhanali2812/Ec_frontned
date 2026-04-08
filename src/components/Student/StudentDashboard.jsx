import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Toaster, toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
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
import { Doughnut } from "react-chartjs-2";
import Sidebar from "../Sidebar";
import "./StudentDashboard.css";

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
  present: "#65ffff",
  absent: "#f97316",
  grid: "#e2e8f0",
  axis: "#64748b",
  pass: "#3b82f6",
  average: "#f59e0b",
  improve: "#ef4444",
};

function StudentDashboard() {
  const [student, setStudent] = useState(null);
  const [courses, setCourses] = useState([]);
  const [coursePercentageMap, setCoursePercentageMap] = useState({});
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [courseStatsMap, setCourseStatsMap] = useState({});
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

  useEffect(() => {
    fetchProfile();
    fetchCourses();
  }, []);

  useEffect(() => {
    const isMobile = window.matchMedia("(max-width: 768px)").matches;

    if (!isMobile) {
      document.documentElement.classList.add("no-dashboard-scroll");
      document.body.classList.add("no-dashboard-scroll");
    }

    return () => {
      document.documentElement.classList.remove("no-dashboard-scroll");
      document.body.classList.remove("no-dashboard-scroll");
    };
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

  const overallAttendancePieData = useMemo(
    () => ({
      labels: overallAttendanceData.map((item) => item.name),
      datasets: [
        {
          data: overallAttendanceData.map((item) => item.value),
          backgroundColor: [CHART_COLORS.present, CHART_COLORS.absent],
          borderWidth: 0,
        },
      ],
    }),
    [overallAttendanceData],
  );

  const resultPieData = useMemo(
    () => [
      { name: "Pass", value: 72 },
      { name: "Average", value: 18 },
      { name: "Need Improvement", value: 10 },
    ],
    [],
  );

  const resultProgressSummary = useMemo(() => {
    const pass = Number(resultPieData[0]?.value || 0);
    const average = Number(resultPieData[1]?.value || 0);
    const needImprovement = Number(resultPieData[2]?.value || 0);
    const total = pass + average + needImprovement;
    const passPercent = total > 0 ? Math.round((pass / total) * 100) : 0;

    return {
      pass,
      average,
      needImprovement,
      passPercent,
    };
  }, [resultPieData]);

  const pieOptions = useMemo(
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

  const overviewAttendanceOptions = useMemo(
    () => ({
      ...pieOptions,
      plugins: {
        ...pieOptions.plugins,
        legend: {
          ...pieOptions.plugins.legend,
          display: false,
        },
      },
    }),
    [pieOptions],
  );

  const courseResultProgressList = useMemo(
    () =>
      coursesWithPercentage.map((course) => {
        const rawPercent = Number(
          course?.resultPercentage ?? course?.percentage ?? 0,
        );
        const percent = Math.max(0, Math.min(100, Math.round(rawPercent)));
        return {
          id: String(course?._id || course?.title || "course"),
          title: course?.title || "Course",
          percent,
        };
      }),
    [coursesWithPercentage],
  );

  const quickAccessItems = useMemo(
    () => [
      {
        label: "TimeTable",
        icon: "fas fa-calendar-alt",
        href: "/student/timetable",
      },
      {
        label: "Courses",
        icon: "fas fa-book-open",
        href: "/coming-soon",
      },
      {
        label: "E-Learning",
        icon: "fas fa-laptop-code",
        href: "/coming-soon",
      },
      {
        label: "Attandance",
        icon: "fas fa-calendar-check",
        href: "/student/attendance-overview",
      },
      {
        label: "Result",
        icon: "fas fa-chart-column",
        href: "/coming-soon",
      },
      {
        label: "Apply leave",
        icon: "fas fa-envelope-open-text",
        href: "/apply-leave",
      },
    ],
    [],
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

      <div className="student-dashboard">
        <div className="container-fluid px-0 px-lg-2 bg-transparent">
          {/* Hero Section */}
          <div className="dashboard-hero mb-2  mt-2 mb-lg-4">
            <div className="d-flex flex-column flex-md-row justify-content-between gap-2 align-items-start">
              <div className="student-identity-card">
                <div className="student-identity-avatar">
                  {(student?.name || "S").charAt(0).toUpperCase()}
                </div>
                <div>
                  <h6 className="mb-1 text-dark fw-semibold">Hi 👋</h6>
                  <h5 className="mb-1">{student?.name || "Student"}</h5>

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

          <div className="dashboard-card overview-dashboard-card  py-2 px-2 mb-2">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-start gap-2 mb-2">
              <div>
                <h5 className="dashboard-section-title  ms-2">
                  Overview Charts
                </h5>
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
              <>
                <div className="row g-3 g-lg-4 overview-graphs-row">
                  <div
                    className="col-6 col-lg-6"
                    onClick={() => navigate("/student/attendance-overview")}
                  >
                    <div className="chart-panel overview-donut-card h-100">
                      <h6 className="mb-2 text-center">Attendance</h6>

                      <div className="chart-canvas-wrap">
                        <div className="chart-canvas-box chart-canvas-box--overview">
                          <Doughnut
                            data={overallAttendancePieData}
                            options={overviewAttendanceOptions}
                          />
                        </div>
                        <div className="chart-hint-row mt-2">
                          <span className="chart-hint-item">
                            <span className="chart-hint-dot present"></span>
                            Present
                          </span>
                          <span className="chart-hint-item">
                            <span className="chart-hint-dot absent"></span>
                            Absent
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div
                    className="col-6 col-lg-6"
                    onClick={() => navigate("/coming-soon")}
                  >
                    <div className="chart-panel overview-donut-card h-100">
                      <h6 className="mb-2 text-center">Results</h6>

                      <div className="chart-canvas-wrap">
                        <div className="result-progress-wrap">
                          <div
                            className="result-progress"
                            style={{
                              background: `conic-gradient(${CHART_COLORS.pass} 0% ${resultProgressSummary.passPercent}%, #e2e8f0 ${resultProgressSummary.passPercent}% 100%)`,
                            }}
                          >
                            <div className="result-progress-inner">
                              <div className="result-progress-value">
                                {resultProgressSummary.passPercent}%
                              </div>
                              <div className="result-progress-label">
                                Pass Rate
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="dashboard-card result-progress-dashboard-card py-2 ">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-start gap-2 mb-1">
              <div>
                <h5 className="dashboard-section-title ms-2 mb-1">
                  Course Result Progress
                </h5>
              </div>
            </div>

            {loadingCourses ? (
              <div className="text-center py-4">
                <div className="spinner-border text-success" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : courseResultProgressList.length === 0 ? (
              <div className="alert alert-info mb-0">
                No courses registered yet.
              </div>
            ) : (
              <div className="result-course-progress-card mt-1">
                <div className="result-course-progress-list">
                  {courseResultProgressList.map((item) => (
                    <div key={item.id} className="result-course-progress-item">
                      <div className="result-course-progress-head">
                        <span className="result-course-name">{item.title}</span>
                        <span className="result-course-percent">
                          {item.percent}%
                        </span>
                      </div>
                      <div className="result-course-track">
                        <div
                          className="result-course-fill"
                          style={{ width: `${item.percent}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </Sidebar>
  );
}

export default StudentDashboard;
