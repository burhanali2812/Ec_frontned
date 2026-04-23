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
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const API_BASE = "https://ec-backend-phi.vercel.app/api";

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    const fetchAdminData = async () => {
      setLoading(true);
      try {
        const [studentsRes, teachersRes, coursesRes] = await Promise.all([
          axios.get(`${API_BASE}/students/getAllStudents`, {
            headers: getAuthHeaders(),
          }),
          axios.get(`${API_BASE}/teachers/getAllTeachers`, {
            headers: getAuthHeaders(),
          }),
          axios.get(`${API_BASE}/courses/getAllCourses`, {
            headers: getAuthHeaders(),
          }),
        ]);

        setAdminData({
          students: studentsRes?.data?.students || [],
          teachers: teachersRes?.data?.teachers || [],
          courses: coursesRes?.data?.courses || [],
        });
      } catch (error) {
        toast.error("Failed to load admin data");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, []);

  const quickAccessItems = useMemo(
    () => [
      {
        label: "Students",
        icon: "fas fa-user-graduate",
        href: "/studentManage",
      },
      {
        label: "Teachers",
        icon: "fas fa-chalkboard-user",
        href: "/teacherManage",
      },
      {
        label: "Courses",
        icon: "fas fa-book-open",
        href: "/courseManage",
      },
      {
        label: "Attendance",
        icon: "fas fa-calendar-check",
        href: "/coming-soon",
      },
      {
        label: "Timetable",
        icon: "fas fa-calendar-days",
        href: "/admin/timetable-manage",
      },
      {
        label: "Leaves",
        icon: "fas fa-envelope-open-text",
        href: "/admin/view-and-approve-leaves",
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

          {/* Overview Charts */}
          <div className="dashboard-card overview-dashboard-card py-2 px-2 mb-2">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-start gap-2 mb-2">
              <div>
                <h5 className="dashboard-section-title ms-2">Overview Stats</h5>
              </div>
            </div>

            <div className="row g-3 g-lg-4 overview-graphs-row">
              <div className="col-12 col-lg-6">
                <div className="chart-panel overview-donut-card h-100">
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
                        Students
                      </span>
                      <span className="chart-hint-item">
                        <span
                          className="chart-hint-dot"
                          style={{ backgroundColor: CHART_COLORS.teachers }}
                        ></span>
                        Teachers
                      </span>
                      <span className="chart-hint-item">
                        <span
                          className="chart-hint-dot"
                          style={{ backgroundColor: CHART_COLORS.courses }}
                        ></span>
                        Courses
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-12 col-lg-6">
                <div className="chart-panel overview-donut-card h-100">
                  <h6 className="mb-2 text-center">Key Metrics</h6>

                  <div className="admin-metrics-wrap">
                    <div className="admin-metric-item">
                      <div className="admin-metric-circle students">
                        {dashboardStats?.totalStudents || 0}
                      </div>
                      <div className="admin-metric-label">Total Students</div>
                    </div>

                    <div className="admin-metric-item">
                      <div className="admin-metric-circle teachers">
                        {dashboardStats?.totalTeachers || 0}
                      </div>
                      <div className="admin-metric-label">Total Teachers</div>
                    </div>

                    <div className="admin-metric-item">
                      <div className="admin-metric-circle courses">
                        {dashboardStats?.totalCourses || 0}
                      </div>
                      <div className="admin-metric-label">Active Courses</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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
