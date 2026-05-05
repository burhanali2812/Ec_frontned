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
import "./AdminPanel.css";

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
  students: "#3b82f6",
  teachers: "#8b5cf6",
  courses: "#10b981",
  paid: "#10b981",
  pending: "#f59e0b",
  grid: "#e2e8f0",
  axis: "#64748b",
};

function AdminPanel() {
  const [adminData, setAdminData] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [lengthOfPendingLeaves, setLengthOfPendingLeaves] = useState(null);
  const [todayAttendanceStatus, setTodayAttendanceStatus] = useState([]);
  const [loadingTodayAttendance, setLoadingTodayAttendance] = useState(false);
  const navigate = useNavigate();

  const API_BASE = "https://ec-backend-phi.vercel.app/api";

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const getLocalToday = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const fetchTodayAttendanceStatus = async (teachersList, coursesList) => {
    console.log("Fetching attendance for courses:", coursesList);
    
    if (!coursesList || coursesList.length === 0) {
      console.log("No courses available");
      return;
    }
    
    setLoadingTodayAttendance(true);
    const dateValue = getLocalToday();
    const requestQueue = [];
    const requestMap = {};

    try {
      // Build all requests in parallel
      for (const course of coursesList) {
        // Get all classes for course - safely handle undefined items
        const assignmentClasses = Array.isArray(course.assignments)
          ? course.assignments
              .filter((item) => item) // Filter out undefined items
              .flatMap(
                (item) => item?.targetClasses || item?.classes || []
              )
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

        for (const classItem of allClasses) {
          const requestKey = `${course._id}|${classItem}`;
          requestMap[requestKey] = {
            courseId: course._id,
            courseName: course.title || course.name,
            class: classItem,
          };

          requestQueue.push(
            axios.get(
              `${API_BASE}/attendance/session?courseId=${course._id}&classInfo=${classItem}&date=${dateValue}`,
              { headers: getAuthHeaders(), timeout: 8000 }
            ).catch(err => ({ error: true, courseId: course._id, classItem }))
          );
        }
      }

      console.log(`Making ${requestQueue.length} parallel requests...`);

      // Execute all requests in parallel
      const responses = await Promise.all(requestQueue);

      // Process all responses
      const courseMap = {};
      responses.forEach((res, idx) => {
        const requestKey = Object.keys(requestMap)[idx];
        const { courseId, courseName, class: classItem } = requestMap[requestKey];

        if (!courseMap[courseId]) {
          courseMap[courseId] = {
            courseId,
            courseName,
            classes: [],
          };
        }

        let isDone = false;
        if (!res.error && res.data?.success && res.data?.hasAttendanceToday === true) {
          isDone = true;
        }

        courseMap[courseId].classes.push({
          class: classItem,
          status: isDone ? "Done" : "Pending",
        });
      });

      const attendanceData = Object.values(courseMap);
      console.log("Attendance data:", attendanceData);
      setTodayAttendanceStatus(attendanceData);
    } catch (error) {
      console.error("Error fetching today attendance status:", error);
    } finally {
      setLoadingTodayAttendance(false);
    }
  };

  useEffect(() => {
    if (adminData?.courses) {
      fetchTodayAttendanceStatus(adminData.teachers, adminData.courses);
    }
  }, [adminData]);

  const token = localStorage.getItem("token");
  const userRole = token ? JSON.parse(atob(token.split(".")[1])).role : null;

  useEffect(() => {
    const fetchPendingLeaves = async () => {
      try {
        const res = await axios.get(
          `https://ec-backend-phi.vercel.app/api/leave/lengthOfPendingLeaves`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
        const data = res?.data || {};
        if (data.success) {
          setLengthOfPendingLeaves(data.pendingLeaves);
        }
      } catch (error) {
        console.error("Error fetching pending leaves:", error);
      }
    };

    if (userRole === "admin" && token) {
      fetchPendingLeaves();
    }
  }, [userRole, token]);

  useEffect(() => {
    const fetchAdminData = async () => {
      const headers = getAuthHeaders();

      try {
        // Profile loads first (quick)
        setLoadingProfile(true);
        setLoadingProfile(false);

        // Run all 3 data APIs in parallel
        const [studentsRes, teachersRes, coursesRes] = await Promise.allSettled(
          [
            axios.get(
              `${API_BASE}/students/getAllStudents?institutionType=Academy`,
              { headers },
            ),
            axios.get(
              `${API_BASE}/teacher/getAllTeachers?institutionType=academy`,
              { headers },
            ),
            axios.get(`${API_BASE}/courses/getAllCourses`, { headers }),
          ],
        );

        const students =
          studentsRes.status === "fulfilled"
            ? studentsRes.value?.data?.students || []
            : [];
        const teachers =
          teachersRes.status === "fulfilled"
            ? teachersRes.value?.data?.teachers || []
            : [];
        const courses =
          coursesRes.status === "fulfilled"
            ? coursesRes.value?.data?.courses || []
            : [];

        setAdminData({ students, teachers, courses });
      } catch (error) {
        toast.error("Failed to load admin data");
        console.error(error);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchAdminData();
  }, []);

  const quickAccessItems = useMemo(
    () => [
      {
        label: "Students Manage",
        icon: "fas fa-user-graduate",
        href: "/studentManage",
      },
      {
        label: "Teachers & Staff",
        icon: "fas fa-chalkboard-user",
        href: "/teacherManage",
      },
      {
        label: "Courses Manage",
        icon: "fas fa-book-open",
        href: "/courseManage",
      },
      {
        label: "Attendance Control",
        icon: "fas fa-calendar-check",
        href: "/admin/attendance-control",
      },
      {
        label: "Timetable & Scheduling",
        icon: "fas fa-calendar-days",
        href: "/admin/timetable-manage",
      },
      {
        label: "Approve Leaves",
        icon: "fas fa-envelope-open-text",
        href: "/admin/view-and-approve-leaves",
      },

      {
        label: "Fee Management",
        icon: "fas fa-money-bill-transfer",
        href: "/fee-management/:studentId",
      },
      {
        label: "Report Generation",
        icon: "fas fa-chart-column",
        href: "/coming-soon",
      },
      {
        label: "Results Management",
        icon: "fas fa-chart-simple",
        href: "/coming-soon",
      },
    ],
    [],
  );

  const dashboardStats = useMemo(() => {
    if (!adminData) return null;

    return {
      totalStudents: adminData.students?.length || 0,
      totalTeachers: adminData.teachers?.length || 0,
      totalCourses: adminData.courses?.length || 0,
    };
  }, [adminData]);

  const chartData = useMemo(() => {
    if (!dashboardStats) return null;

    return {
      labels: ["Students", "Teachers", "Courses"],
      datasets: [
        {
          data: [
            dashboardStats.totalStudents,
            dashboardStats.totalTeachers,
            dashboardStats.totalCourses,
          ],
          backgroundColor: [
            CHART_COLORS.students,
            CHART_COLORS.teachers,
            CHART_COLORS.courses,
          ],
          borderWidth: 0,
        },
      ],
    };
  }, [dashboardStats]);

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

  return (
    <Sidebar>


     
      <Toaster position="top-right" />

      <div className="admin-dashboard">
        <div className="container-fluid px-0 px-lg-2 bg-transparent">
          {/* Hero Section */}
          <div className="dashboard-hero mb-2 mt-2 mb-lg-4">
            <div className="d-flex flex-column flex-md-row justify-content-between gap-2 align-items-start">
              <div className="student-identity-card">
                <div className="student-identity-avatar">
                  <i className="fas fa-shield"></i>
                </div>
                <div>
                  <h6 className="mb-1 text-dark fw-semibold">Welcome 👋</h6>
                  <h5 className="mb-1">Admin Dashboard</h5>
                  <div className="student-identity-meta">
                    <span>
                      <i className="fas fa-cog me-1"></i>
                      Academy Management System
                    </span>
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
                  className="quick-access-circle-item position-relative"
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
                  {item.label === "Approve Leaves" &&
                    lengthOfPendingLeaves > 0 && (
                      <span className="badge bg-danger position-absolute top-0 end-0 translate-middle">
                        {lengthOfPendingLeaves}
                      </span>
                    )}
                  <span className="quick-access-circle-text">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Today's Attendance Alert */}
          <div className="dashboard-card attendance-alert-card p-3 p-lg-4 mb-2">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h5 className="dashboard-section-title mb-1">Today's Attendance Alert</h5>
                <small className="text-muted">
                  <i className="fas fa-calendar me-1"></i>
                  {new Date().toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </small>
              </div>
            </div>

            {loadingTodayAttendance ? (
              <div className="text-center py-4">
                <div className="spinner-border spinner-border-sm text-success" role="status">
                  <span className="visually-hidden">Loading attendance status...</span>
                </div>
              </div>
            ) : todayAttendanceStatus && todayAttendanceStatus.length > 0 ? (
              <div className="attendance-alert-container">
                <div className="attendance-scroll-wrapper">
                  <table className="attendance-alert-table">
                    <thead>
                      <tr>
                        <th className="course-col">Course</th>
                        {todayAttendanceStatus[0]?.classes?.map((cls, idx) => (
                          <th key={idx} className="class-col">
                            {cls.class}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {todayAttendanceStatus.map((course, idx) => (
                        <tr key={idx}>
                          <td className="course-col">
                            <small className="fw-semibold">{course.courseName}</small>
                          </td>
                          {course.classes?.map((cls, classIdx) => (
                            <td key={classIdx} className="class-col">
                              <span
                                className={`badge ${
                                  cls.status === "Done"
                                    ? "bg-success"
                                    : "bg-warning text-dark"
                                }`}
                              >
                                {cls.status}
                              </span>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="alert alert-info mb-0">
                <i className="fas fa-info-circle me-2"></i>
                No courses data available for today's attendance check.
              </div>
            )}
          </div>

          {/* Overview Charts */}
          <div className="dashboard-card overview-dashboard-card py-2 px-2 mb-2">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-start gap-2 mb-2">
              <div>
                <h5 className="dashboard-section-title ms-2">Overview Stats</h5>
              </div>
            </div>

            {loadingStats ? (
              <div className="text-center py-5">
                <div className="spinner-border text-success" role="status">
                  <span className="visually-hidden">Loading charts...</span>
                </div>
              </div>
            ) : (
              <div className="overview-graphs-row px-2">
                <div className="chart-panel overview-donut-card h-100 w-100">
                  <h6 className="mb-2 text-center">Academy Overview</h6>

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
                          style={{ backgroundColor: CHART_COLORS.students }}
                        ></span>
                        Students ({dashboardStats?.totalStudents || 0})
                      </span>
                      <span className="chart-hint-item">
                        <span
                          className="chart-hint-dot"
                          style={{ backgroundColor: CHART_COLORS.teachers }}
                        ></span>
                        Teachers ({dashboardStats?.totalTeachers || 0})
                      </span>
                      <span className="chart-hint-item">
                        <span
                          className="chart-hint-dot"
                          style={{ backgroundColor: CHART_COLORS.courses }}
                        ></span>
                        Courses ({dashboardStats?.totalCourses || 0})
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Statistics Cards */}
          <div className="dashboard-card result-progress-dashboard-card py-2">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-start gap-2 mb-1">
              <div>
                <h5 className="dashboard-section-title ms-2 mb-1">
                  Resource Summary
                </h5>
              </div>
            </div>

            <div className="row g-3">
              <div className="col-12 col-md-6 col-lg-4">
                <div className="admin-stat-card students">
                  <div className="stat-icon">
                    <i className="fas fa-user-graduate"></i>
                  </div>
                  <div className="stat-content">
                    <div className="stat-value">
                      {dashboardStats?.totalStudents || 0}
                    </div>
                    <div className="stat-label">Students Enrolled</div>
                  </div>
                </div>
              </div>

              <div className="col-12 col-md-6 col-lg-4">
                <div className="admin-stat-card teachers">
                  <div className="stat-icon">
                    <i className="fas fa-chalkboard-user"></i>
                  </div>
                  <div className="stat-content">
                    <div className="stat-value">
                      {dashboardStats?.totalTeachers || 0}
                    </div>
                    <div className="stat-label">Faculty Members</div>
                  </div>
                </div>
              </div>

              <div className="col-12 col-md-6 col-lg-4">
                <div className="admin-stat-card courses">
                  <div className="stat-icon">
                    <i className="fas fa-book-open"></i>
                  </div>
                  <div className="stat-content">
                    <div className="stat-value">
                      {dashboardStats?.totalCourses || 0}
                    </div>
                    <div className="stat-label">Courses Running</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
      
    </Sidebar>
  );
}

export default AdminPanel;
