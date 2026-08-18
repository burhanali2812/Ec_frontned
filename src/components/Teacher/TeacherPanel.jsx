import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";
import Sidebar from "../Sidebar";
import Footer from "../footer";
import {useAppContext} from "../../contextApi/AppContext";
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
  const [showAllMenuItems, setShowAllMenuItems] = useState(false);
  const [courses, setCourses] = useState([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [todayAttendanceStatus, setTodayAttendanceStatus] = useState([]);
  const [loadingTodayAttendance, setLoadingTodayAttendance] = useState(false);
  const [isSundayToday, setIsSundayToday] = useState(false);
  const { classOptions , getLocalToday, notifications} = useAppContext();
  const unReadNotificationsCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );
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

  const classOrder = classOptions;
  console.log("Class Order:", classOrder);
  const fetchTodayAttendanceStatus = async (coursesList) => {
    if (!coursesList || coursesList.length === 0) return;

    setLoadingTodayAttendance(true);

    try {
      const today = getLocalToday();
  
      const API_ATTENDANCE = `${API_BASE}/attendance`;
      const requestQueue = [];
      const requestMap = {};
      const courseMap = {};
        const isTodaySunday = () => {
  const todayCheck = new Date();
  return todayCheck.getDay() === 0; // 0 = Sunday
};

if (isTodaySunday()) {
  setIsSundayToday(true);
  setTodayAttendanceStatus([]);
  setLoadingTodayAttendance(false);
  toast.info("Today is Sunday. No attendance required.");
  return;
}

      // Build all requests in parallel
      for (const course of coursesList) {
        // Get all classes for course
        const assignmentClasses = Array.isArray(course.assignments)
          ? course.assignments
              .filter((item) => item)
              .flatMap((item) => item?.targetClasses || item?.classes || [])
          : Array.isArray(course.classTarget)
            ? course.classTarget
                .filter((item) => item)
                .flatMap((item) => item?.classes || [])
            : [];

        const directClasses = Array.isArray(course.classes)
          ? course.classes
          : [];

        const allClasses = [
          ...new Set([...directClasses, ...assignmentClasses].filter(Boolean)),
        ];

        if (allClasses.length === 0) continue;

        courseMap[course._id] = {
          courseName: course.title,
          courseId: course._id,
          classes: {},
        };

        // Add all requests to queue
        for (const classInfo of allClasses) {
          const requestKey = `${course._id}|${classInfo}`;
          requestMap[requestKey] = { courseId: course._id, classInfo };

          requestQueue.push(
            axios
              .get(`${API_ATTENDANCE}/session`, {
                params: {
                  courseId: course._id,
                  classInfo,
                  date: today,
                  fetchedBy: "teacherDailyAttendanceCheck",
                },
                headers: getAuthHeaders(),
                timeout: 8000,
              })
              .catch((err) => ({
                error: true,
                isClassAllowed: err.response?.status !== 403,
                courseId: course._id,
                classInfo,
              })),
          );
        }
      }

      console.log(
        `Making ${requestQueue.length} parallel attendance requests...`,
      );

      // Execute all requests in parallel
      const responses = await Promise.all(requestQueue);

      // Process all responses
      responses.forEach((res, idx) => {
        const requestKey = Object.keys(requestMap)[idx];
        const { courseId, classInfo } = requestMap[requestKey];

        let status = "pending";
        if (res.error && res.isClassAllowed === false) {
          status = "not-assigned";
        } else if (
          !res.error &&
          res.data?.success &&
          res.data?.hasAttendanceToday
        ) {
            status = "done";
        }
          else if (!res.error && res.data?.success && res.data?.totalStudents === 0) {
            status = "no-students";
        }

        courseMap[courseId].classes[classInfo] = status;
      });

      const statusData = Object.values(courseMap);
      console.log("Today's attendance status data:", statusData);
      setTodayAttendanceStatus(statusData);
    } catch (error) {
      console.error("Error fetching today's attendance status:", error);
    } finally {
      setLoadingTodayAttendance(false);
    }
  };

  useEffect(() => {
    if (courses.length > 0) {
      fetchTodayAttendanceStatus(courses);
    }
  }, [courses]);

  const quickAccessItems = useMemo(
    () => [
      {
        label: "Mark Attendance",
        icon: "fas fa-calendar-check",
        href: "/teacher/attendance",
      },
      {
        label: "Attendance Manage",
        icon: "fas fa-chart-line",
        href: "/teacher/view-attendance",
      },
      {
        label: "Results Manage",
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
        label: "Notifications",
        icon: "fas fa-bell",
        href: "/student/notifications",
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
          backgroundColor: ["#3b82f6", "#f59e0b", "#65ffff"],
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
  const handleDirectAttendance = (courseData, classInfo) => () => {
    console.log("Direct attendance for course:", courseData, "class:", classInfo);
    navigate("/teacher/attendance", {
      state: { courseId: courseData.courseId, directClass: true, classInfo: classInfo, date: getLocalToday() },
    });
  }

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
    {quickAccessItems.length > 5 && (
      <span
        role="button"
        tabIndex={0}
        onClick={() => setShowAllMenuItems(!showAllMenuItems)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setShowAllMenuItems(!showAllMenuItems);
          }
        }}
        style={{
          color: "#3b82f6",
          cursor: "pointer",
          fontSize: "0.9rem",
          fontWeight: "600",
          transition: "all 0.3s ease",
          textDecoration: "underline",
        }}
        onMouseEnter={(e) => (e.target.style.color = "#2563eb")}
        onMouseLeave={(e) => (e.target.style.color = "#3b82f6")}
      >
        {showAllMenuItems ? "View Less" : "View All"}
      </span>
    )}
  </div>

 <div className="quick-access-circle-grid">
  {(showAllMenuItems ? quickAccessItems : quickAccessItems.slice(0, 6)).map(
    (item) => {
      const showUnreadBadge =
        item.label === "Notifications" && unReadNotificationsCount > 0;

      return (
        <div
          key={item.label}
          className="quick-access-circle-item"
          role="button"
          tabIndex={0}
          style={{ position: "relative" }}
          onClick={() => navigate(item.href, { state: { fromteacher: true } })}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              navigate(item.href, { state: { fromteacher: true } });
            }
          }}
        >
          {showUnreadBadge && (
            <span
              style={{
                position: "absolute",
                top: "-2px",
                right: "6px",
                minWidth: "18px",
                height: "18px",
                padding: "0 4px",
                borderRadius: "999px",
                backgroundColor: "#ef4444",
                color: "#ffffff",
                fontSize: "0.65rem",
                fontWeight: "700",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                lineHeight: 1,
                boxShadow: "0 0 0 2px #ffffff",
              }}
            >
              {unReadNotificationsCount > 99 ? "99+" : unReadNotificationsCount}
            </span>
          )}
          <span className="quick-access-circle-icon">
            <i className={item.icon}></i>
          </span>
          <span className="quick-access-circle-text">{item.label}</span>
        </div>
      );
    },
  )}
</div>
</div>

          {/* Today's Attendance Alert Card */}
          <div
            className="dashboard-card today-attendance-card p-3 p-lg-4 mb-2"
            style={{
              backgroundColor: "#f0f9ff",
              border: "2px solid #0ea5e9",
              borderRadius: "0.75rem",
            }}
          >
            <div className="d-flex align-items-center mb-3">
              <i
                className="fas fa-bell me-2"
                style={{ color: "black", fontSize: "1.3rem" }}
              ></i>
              <div>
                <h5
                  className="dashboard-section-title mb-0"
                  style={{ color: "black" }}
                >
                  Today's Attendance Alert
                </h5>
                <small style={{ color: "black" }}>
                  Date: {new Date(getLocalToday()).toLocaleDateString()}
                </small>
              </div>
            </div>

            {loadingTodayAttendance ? (
              <div className="text-center text-muted py-3">
                <div
                  className="spinner-border spinner-border-sm me-2"
                  role="status"
                ></div>
                Loading attendance status...
              </div>
            ) : todayAttendanceStatus.length === 0 ? (
              isSundayToday ? (
                <div className="text-center text-muted py-3">
                  <i className="fas fa-sun me-2"></i>
                  Today is Sunday. No attendance required.
                </div>
              ) : (
                <div className="text-center text-muted py-3">
                  <i className="fas fa-check-circle me-2"></i>
                  No course assigned yet.
                </div>
              )
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "0.95rem",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        backgroundColor: "#ffffff",
                        borderBottom: "2px solid #cbd5e1",
                      }}
                    >
                      <th
                        style={{
                          padding: "1rem",
                          textAlign: "left",
                          fontWeight: "600",
                          color: "#0f172a",
                        }}
                      >
                        Course
                      </th>
                      {todayAttendanceStatus.length > 0 &&
                        classOrder.map((classData) => (
                          <th
                            key={classData._id}
                            style={{
                              padding: "1rem",
                              textAlign: "center",
                              fontWeight: "600",
                              color: "#0f172a",
                            }}
                          >
                            {classData.name}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {todayAttendanceStatus.map((courseData, idx) => (
                      <tr
                        key={idx}
                        style={{
                          borderBottom: "1px solid #e2e8f0",
                        }}
                      >
                        <td
                          style={{
                            padding: "1rem",
                            fontWeight: "600",
                            color: "#0f172a",
                          }}
                        >
                          {courseData.courseName}
                        </td>
                        {classOrder.map((classData) => {
                          const status = courseData.classes[classData._id];

                          return (
                            <td
                              key={classData._id}
                              style={{
                                padding: "1rem",
                                textAlign: "center",
                              }}
                            >
                              {status === "done" ? (
                                <span
                                  className="badge"
                                  style={{
                                    backgroundColor: "#10b981",
                                    color: "#ffffff",
                                    fontSize: "0.75rem",
                                  }}
                                >
                                  Done
                                </span>
                              ) : status === "not-assigned" ? (
                                <span
                                  className="badge"
                                  style={{
                                    backgroundColor: "#ff3c00ff",
                                    color: "#ffffff",
                                    fontSize: "0.75rem",
                                  }}
                                >
                                  <i className="fas fa-xmark"></i>
                                </span>
                              ) : status === "pending" ? (
                                <span
                                  className="badge"
                                  style={{
                                    backgroundColor: "#f59e0b",
                                    color: "#ffffff",
                                    fontSize: "0.75rem",
                                    cursor: "pointer",
                                  }}
                                  onClick={handleDirectAttendance(courseData, classData._id)}
                                >
                                  Pending
                                </span >
                              ) : status === "no-students"? (
                                  <span
                                  className="badge"
                                  style={{
                                    backgroundColor: "#000000ff",
                                    color: "#ffffff",
                                    fontSize: "0.75rem",
                                  }}
                                >
                                  No Students
                                </span>
                              ):(
                                <span>-</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {todayAttendanceStatus.length > 0 && (
              <div
                className="mt-3 pt-3"
                style={{ borderTop: "1px solid #bae6fd" }}
              >
                <div className="d-flex gap-3 justify-content-between small">
                  <div>
                    <strong style={{ color: "#10b981" }}>
                      {todayAttendanceStatus.reduce(
                        (count, course) =>
                          count +
                          Object.values(course.classes).filter(
                            (s) => s === "done",
                          ).length,
                        0,
                      )}
                    </strong>
                    <span style={{ color: "#64748b" }}> Done</span>
                  </div>
                  <div>
                    <strong style={{ color: "#f59e0b" }}>
                      {todayAttendanceStatus.reduce(
                        (count, course) =>
                          count +
                          Object.values(course.classes).filter(
                            (s) => s === "pending",
                          ).length,
                        0,
                      )}
                    </strong>
                    <span style={{ color: "#64748b" }}> Pending</span>
                  </div>
                </div>
              </div>
            )}
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
                              style={{ backgroundColor: "#f59e0b" }}
                            ></span>
                            Classes({stats.totalClasses})
                          </span>
                          <span className="chart-hint-item">
                            <span
                              className="chart-hint-dot"
                              style={{ backgroundColor: "#65ffff" }}
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
