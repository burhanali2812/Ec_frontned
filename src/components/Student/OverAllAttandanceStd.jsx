import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Sidebar from "../Sidebar";
import "./OverAllAttandanceStd.css";
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
);

function OverAllAttandanceStd() {
  const [student, setStudent] = useState(null);
  const [courses, setCourses] = useState([]);
  const [statsByCourse, setStatsByCourse] = useState({});
  const [selectedCourseId, setSelectedCourseId] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [approvedLeaveCount, setApprovedLeaveCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const API_BASE = "https://ec-backend-phi.vercel.app/api";

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const profileRes = await axios.get(`${API_BASE}/students/myProfile`, {
          headers: getAuthHeaders(),
        });
        const studentProfile = profileRes?.data?.student || null;
        setStudent(studentProfile);

        const coursesRes = await axios.get(
          `${API_BASE}/registration/myCourses`,
          {
            headers: getAuthHeaders(),
          },
        );
        const registeredCourses = coursesRes?.data?.courses || [];
        setCourses(registeredCourses);

        if (studentProfile?.email) {
          try {
            const leaveRes = await axios.get(
              `${API_BASE}/leave/viewAppliedLeaveApplications/student/${encodeURIComponent(studentProfile.email)}`,
              { headers: getAuthHeaders() },
            );
            const leaveList = leaveRes?.data?.leaveApplications || [];
            const approved = leaveList.filter(
              (item) => String(item?.status).toLowerCase() === "approved",
            ).length;
            setApprovedLeaveCount(approved);
          } catch {
            setApprovedLeaveCount(0);
          }
        }

        if (!registeredCourses.length) {
          setStatsByCourse({});
          return;
        }

        const entries = await Promise.all(
          registeredCourses.map(async (course) => {
            try {
              const statsRes = await axios.get(
                `${API_BASE}/attendance/studentStats/${course._id}`,
                { headers: getAuthHeaders() },
              );
              return [String(course._id), statsRes?.data || null];
            } catch {
              return [String(course._id), null];
            }
          }),
        );

        setStatsByCourse(Object.fromEntries(entries));
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  const currentStats = useMemo(() => {
    if (selectedCourseId !== "all") {
      const selected = statsByCourse[selectedCourseId];
      return {
        present: Number(selected?.stats?.present || 0),
        absent: Number(selected?.stats?.absent || 0),
        total: Number(selected?.stats?.total || 0),
        monthly:
          selected?.monthlyDetails ||
          (selected?.chartData || []).map((item) => ({
            monthLabel: item.month,
            present: Number(item.present || 0),
            absent: Number(item.absent || 0),
            total: Number(item.present || 0) + Number(item.absent || 0),
          })),
      };
    }

    const totals = Object.values(statsByCourse).reduce(
      (acc, item) => {
        acc.present += Number(item?.stats?.present || 0);
        acc.absent += Number(item?.stats?.absent || 0);
        return acc;
      },
      { present: 0, absent: 0 },
    );

    const monthlyMap = {};
    Object.values(statsByCourse).forEach((item) => {
      const monthly = item?.monthlyDetails || [];
      monthly.forEach((m) => {
        const key = m?.monthLabel || m?.month || "Unknown";
        if (!monthlyMap[key]) {
          monthlyMap[key] = {
            monthLabel: key,
            present: 0,
            absent: 0,
            total: 0,
            history: [],
          };
        }
        monthlyMap[key].present += Number(m?.present || 0);
        monthlyMap[key].absent += Number(m?.absent || 0);
        monthlyMap[key].total += Number(m?.total || 0);
        monthlyMap[key].history = [
          ...(monthlyMap[key].history || []),
          ...(m?.history || []),
        ];
      });
    });

    return {
      present: totals.present,
      absent: totals.absent,
      total: totals.present + totals.absent,
      monthly: Object.values(monthlyMap).map((item) => ({
        ...item,
        history: (item.history || []).slice().sort((a, b) => {
          const aDate = new Date(a.date.split("/").reverse().join("-"));
          const bDate = new Date(b.date.split("/").reverse().join("-"));
          return aDate - bDate;
        }),
      })),
    };
  }, [selectedCourseId, statsByCourse]);

  const selectedCourseLabel = useMemo(() => {
    if (selectedCourseId === "all") return "All Courses";
    const match = courses.find(
      (course) => String(course._id) === selectedCourseId,
    );
    return match?.title || "Selected Course";
  }, [courses, selectedCourseId]);

  const attendancePercent =
    currentStats.total > 0
      ? Math.round((currentStats.present / currentStats.total) * 100)
      : 0;

  const progressData = {
    labels: ["Present", "Absent"],
    datasets: [
      {
        data: [currentStats.present, currentStats.absent],
        backgroundColor: ["#65ffff", "#f97316"],
        borderWidth: 0,
      },
    ],
  };

  const progressOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "90%",
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true },
    },
  };

  const monthModalChartData = useMemo(() => {
    if (!selectedMonth?.history?.length) return null;

    return {
      labels: selectedMonth.history.map((item) => item.date),
      datasets: [
        {
          label: "Present",
          data: selectedMonth.history.map((item) =>
            item.status === "present" ? 1 : 0,
          ),
          backgroundColor: "#65ffff",
          borderRadius: 8,
        },
        {
          label: "Absent",
          data: selectedMonth.history.map((item) =>
            item.status === "absent" ? 1 : 0,
          ),
          backgroundColor: "#f97316",
          borderRadius: 8,
        },
      ],
    };
  }, [selectedMonth]);

  const monthModalOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: "top",
        },
      },
      scales: {
        x: {
          ticks: { color: "#64748b", font: { size: 10 } },
          grid: { display: false },
        },
        y: {
          ticks: {
            color: "#64748b",
            callback: (value) => (value === 1 ? "1" : "0"),
          },
          min: 0,
          max: 1,
          grid: { color: "#e2e8f0" },
        },
      },
    }),
    [],
  );

  return (
    <Sidebar>
      <div className="overall-att-page  py-3 py-lg-4">
        <div className="overall-att-card p-3 p-lg-4 mb-3">
          <h5 className="mb-3">Attendance Overview</h5>

          {loading ? (
            <div className="text-center py-4">Loading...</div>
          ) : (
            <>
              <div className="overall-att-top mb-3">
                <div className="overall-att-chart-wrap position-relative">
                  <Doughnut data={progressData} options={progressOptions} />
                  <div className="position-absolute top-50 start-50 translate-middle text-center">
                    <div className="fw-bold fs-4">{attendancePercent}%</div>
                    <div className="text-muted small">Attendance</div>
                  </div>
                </div>

                <div className="overall-att-mini-stats-row">
                  <div className="overall-att-mini-stat">
                    <div className="overall-att-mini-circle present">
                      {currentStats.present}
                    </div>
                    <div className="overall-att-mini-label">Total Present</div>
                  </div>

                  <div className="overall-att-mini-stat">
                    <div className="overall-att-mini-circle absent">
                      {currentStats.absent}
                    </div>
                    <div className="overall-att-mini-label">Total Absent</div>
                  </div>

                  <div className="overall-att-mini-stat">
                    <div className="overall-att-mini-circle leave">
                      {approvedLeaveCount}
                    </div>
                    <div className="overall-att-mini-label">
                      Approved Leaves
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-3">
                <div className="small text-muted mb-2">Registered Courses</div>
                <div className="course-filter-wrap">
                  <button
                    type="button"
                    className={`course-chip ${selectedCourseId === "all" ? "active" : ""}`}
                    onClick={() => setSelectedCourseId("all")}
                  >
                    All Courses
                  </button>
                  {courses.map((course) => (
                    <button
                      key={course._id}
                      type="button"
                      className={`course-chip ${selectedCourseId === String(course._id) ? "active" : ""}`}
                      onClick={() => setSelectedCourseId(String(course._id))}
                    >
                      {course.title}
                    </button>
                  ))}
                </div>
              </div>

              <div className="row g-3">
                {currentStats.monthly?.length ? (
                  currentStats.monthly.map((monthItem, idx) => (
                    <div
                      className="col-12 col-md-6 col-xl-4"
                      key={`${monthItem.monthLabel}-${idx}`}
                    >
                      <div
                        className="month-att-card h-100"
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedMonth(monthItem)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelectedMonth(monthItem);
                          }
                        }}
                      >
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <div className="month-att-title">
                            {monthItem.monthLabel}
                          </div>
                          <i className="fa-solid fa-angle-right text-muted"></i>
                        </div>

                        <div className="d-flex justify-content-between align-items-center gap-2">
                          <span className="month-att-badge present">
                            Present: {monthItem.present}
                          </span>
                          <span className="month-att-badge absent">
                            Absent: {monthItem.absent}
                          </span>
                        </div>
                        <div className="month-att-meta mt-2">
                          Total classes: {monthItem.total}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-12">
                    <div className="alert alert-info mb-0">
                      No monthly attendance data available.
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {selectedMonth && (
          <div
            className="overall-att-modal-backdrop"
            onClick={() => setSelectedMonth(null)}
          >
            <div
              className="overall-att-modal-card"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="d-flex justify-content-between align-items-start gap-2 mb-3">
                <div>
                  <h5 className="mb-1">{selectedMonth.monthLabel}</h5>
                  <p className="mb-0 text-muted small">
                    {selectedCourseLabel} • monthly attendance details
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => setSelectedMonth(null)}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>

              <div className="row g-3 mb-3">
                <div className="col-12 col-lg-4">
                  <div className="overall-att-modal-chart">
                    <Doughnut
                      data={{
                        labels: ["Present", "Absent"],
                        datasets: [
                          {
                            data: [selectedMonth.present, selectedMonth.absent],
                            backgroundColor: ["#65ffff", "#f97316"],
                            borderWidth: 0,
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        cutout: "80%",
                        plugins: { legend: { display: false } },
                      }}
                    />
                    <div className="overall-att-modal-chart-center">
                      <div className="fw-bold fs-4">{selectedMonth.total}</div>
                      <div className="text-muted small">Total Classes</div>
                    </div>
                  </div>

                  <div className="d-flex justify-content-between align-items-center gap-2 mt-3">
                    <span className="month-att-badge present">
                      Present: {selectedMonth.present}
                    </span>
                    <span className="month-att-badge absent">
                      Absent: {selectedMonth.absent}
                    </span>
                  </div>
                </div>

                <div className="col-12 col-lg-8">
                  <div className="overall-att-modal-bar">
                    {monthModalChartData ? (
                      <Bar
                        data={monthModalChartData}
                        options={monthModalOptions}
                      />
                    ) : (
                      <div className="alert alert-info mb-0">
                        No chart data available.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="overall-att-history">
                <h6 className="mb-3">Daily History</h6>
                <div className="overall-att-history-list">
                  {(selectedMonth.history || []).map((item, index) => (
                    <div
                      key={`${item.date}-${index}`}
                      className="overall-att-history-item"
                    >
                      <div>
                        <div className="overall-att-history-date">
                          {item.date}
                        </div>
                        {item.topic ? (
                          <div className="overall-att-history-topic">
                            Topic: {item.topic}
                          </div>
                        ) : null}
                      </div>
                      <span
                        className={`overall-att-history-badge ${item.status}`}
                      >
                        {item.status === "present" ? "Present" : "Absent"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Sidebar>
  );
}

export default OverAllAttandanceStd;
