import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Sidebar from "../Sidebar";
import "./OverAllResult.css";
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

function OverAllResult() {
  const [courses, setCourses] = useState([]);
  const [statsByCourse, setStatsByCourse] = useState({});
  const [selectedCourseId, setSelectedCourseId] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState(null);
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
        const coursesRes = await axios.get(
          `${API_BASE}/registration/myCourses`,
          {
            headers: getAuthHeaders(),
          },
        );
        const registeredCourses = coursesRes?.data?.courses || [];
        setCourses(registeredCourses);

        if (!registeredCourses.length) {
          setStatsByCourse({});
          return;
        }

        const entries = await Promise.all(
          registeredCourses.map(async (course) => {
            try {
              const statsRes = await axios.get(
                `${API_BASE}/results/studentStats/${course._id}`,
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
        obtainedMarks: Number(selected?.stats?.obtainedMarks || 0),
        totalMarks: Number(selected?.stats?.totalMarks || 0),
        totalExams: Number(selected?.stats?.totalExams || 0),
        monthly: selected?.monthlyDetails || [],
      };
    }

    const totals = Object.values(statsByCourse).reduce(
      (acc, item) => {
        acc.obtainedMarks += Number(item?.stats?.obtainedMarks || 0);
        acc.totalMarks += Number(item?.stats?.totalMarks || 0);
        acc.totalExams += Number(item?.stats?.totalExams || 0);
        return acc;
      },
      { obtainedMarks: 0, totalMarks: 0, totalExams: 0 },
    );

    const monthlyMap = {};
    Object.values(statsByCourse).forEach((item) => {
      const monthly = item?.monthlyDetails || [];
      monthly.forEach((m) => {
        const key =
          m?.year && m?.monthNumber
            ? `${m.year}-${String(m.monthNumber).padStart(2, "0")}`
            : m?.monthLabel || m?.month || "Unknown";

        if (!monthlyMap[key]) {
          monthlyMap[key] = {
            monthLabel: m?.monthLabel || m?.month || "Unknown",
            obtainedMarks: 0,
            totalMarks: 0,
            exams: 0,
            year: m?.year,
            monthNumber: m?.monthNumber,
            history: [],
          };
        }

        monthlyMap[key].obtainedMarks += Number(m?.obtainedMarks || 0);
        monthlyMap[key].totalMarks += Number(m?.totalMarks || 0);
        monthlyMap[key].exams += Number(m?.exams || 0);
        monthlyMap[key].history = [
          ...(monthlyMap[key].history || []),
          ...(m?.history || []),
        ];
      });
    });

    return {
      ...totals,
      monthly: Object.values(monthlyMap)
        .map((item) => ({
          ...item,
          percentage:
            item.totalMarks > 0
              ? Math.round((item.obtainedMarks / item.totalMarks) * 100)
              : 0,
          history: (item.history || []).slice().sort((a, b) => {
            const aDate = new Date(a.date.split("/").reverse().join("-"));
            const bDate = new Date(b.date.split("/").reverse().join("-"));
            return aDate - bDate;
          }),
        }))
        .sort((a, b) => {
          const keyA = `${a.year || 0}-${String(a.monthNumber || 0).padStart(2, "0")}`;
          const keyB = `${b.year || 0}-${String(b.monthNumber || 0).padStart(2, "0")}`;
          return String(keyB).localeCompare(String(keyA));
        }),
    };
  }, [selectedCourseId, statsByCourse]);

  const selectedCourseLabel = useMemo(() => {
    if (selectedCourseId === "all") return "All Courses";
    const match = courses.find(
      (course) => String(course._id) === selectedCourseId,
    );
    return match?.title || "Selected Course";
  }, [courses, selectedCourseId]);

  const overallPercent =
    currentStats.totalMarks > 0
      ? Math.round((currentStats.obtainedMarks / currentStats.totalMarks) * 100)
      : 0;

  const remainingMarks = Math.max(
    0,
    Number(currentStats.totalMarks || 0) -
      Number(currentStats.obtainedMarks || 0),
  );

  const progressData = {
    labels: ["Obtained", "Remaining"],
    datasets: [
      {
        data: [currentStats.obtainedMarks, remainingMarks],
        backgroundColor: ["#2563eb", "#f97316"],
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
          label: "Result %",
          data: selectedMonth.history.map((item) =>
            Number(item.percentage || 0),
          ),
          backgroundColor: "#2563eb",
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
          ticks: { color: "#64748b" },
          min: 0,
          max: 100,
          grid: { color: "#e2e8f0" },
        },
      },
    }),
    [],
  );

  return (
    <Sidebar>
      <div className="overall-res-page py-3 py-lg-4">
        <div className="overall-res-card p-3 p-lg-4 mb-3">
          <h5 className="mb-3">Overall Result</h5>

          {loading ? (
            <div className="text-center py-4">Loading...</div>
          ) : (
            <>
              <div className="overall-res-top mb-3">
                <div className="overall-res-chart-wrap position-relative">
                  <Doughnut data={progressData} options={progressOptions} />
                  <div className="position-absolute top-50 start-50 translate-middle text-center">
                    <div className="fw-bold fs-4">{overallPercent}%</div>
                    <div className="text-muted small">Overall Score</div>
                  </div>
                </div>

                <div className="overall-res-mini-stats-row">
                  <div className="overall-res-mini-stat">
                    <div className="overall-res-mini-circle obtained">
                      {currentStats.obtainedMarks}
                    </div>
                    <div className="overall-res-mini-label">Obtained Marks</div>
                  </div>

                  <div className="overall-res-mini-stat">
                    <div className="overall-res-mini-circle total">
                      {currentStats.totalMarks}
                    </div>
                    <div className="overall-res-mini-label">Total Marks</div>
                  </div>

                  <div className="overall-res-mini-stat">
                    <div className="overall-res-mini-circle exams">
                      {currentStats.totalExams}
                    </div>
                    <div className="overall-res-mini-label">Total Exams</div>
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
                        className="month-res-card h-100"
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
                          <div className="month-res-title">
                            {monthItem.monthLabel}
                          </div>
                          <i className="fa-solid fa-angle-right text-muted"></i>
                        </div>

                        <div className="d-flex justify-content-between align-items-center gap-2">
                          <span className="month-res-badge obtained">
                            Score: {monthItem.obtainedMarks}
                          </span>
                          <span className="month-res-badge total">
                            Out of: {monthItem.totalMarks}
                          </span>
                        </div>
                        <div className="month-res-meta mt-2">
                          Exams: {monthItem.exams} • {monthItem.percentage || 0}
                          %
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-12">
                    <div className="alert alert-info mb-0">
                      No monthly result data available.
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {selectedMonth && (
          <div
            className="overall-res-modal-backdrop"
            onClick={() => setSelectedMonth(null)}
          >
            <div
              className="overall-res-modal-card"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="d-flex justify-content-between align-items-start gap-2 mb-3">
                <div>
                  <h5 className="mb-1">{selectedMonth.monthLabel}</h5>
                  <p className="mb-0 text-muted small">
                    {selectedCourseLabel} • monthly result details
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
                  <div className="overall-res-modal-chart">
                    <Doughnut
                      data={{
                        labels: ["Obtained", "Remaining"],
                        datasets: [
                          {
                            data: [
                              selectedMonth.obtainedMarks,
                              Math.max(
                                0,
                                Number(selectedMonth.totalMarks || 0) -
                                  Number(selectedMonth.obtainedMarks || 0),
                              ),
                            ],
                            backgroundColor: ["#2563eb", "#f97316"],
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
                    <div className="overall-res-modal-chart-center">
                      <div className="fw-bold fs-4">
                        {selectedMonth.percentage || 0}%
                      </div>
                      <div className="text-muted small">Month Score</div>
                    </div>
                  </div>
                </div>

                <div className="col-12 col-lg-8">
                  <div className="overall-res-modal-bar">
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

              <div className="overall-res-history">
                <h6 className="mb-3">Daily Results</h6>
                <div className="overall-res-history-list">
                  {(selectedMonth.history || []).map((item, index) => (
                    <div
                      key={`${item.date}-${index}`}
                      className="overall-res-history-item"
                    >
                      <div>
                        <div className="overall-res-history-date">
                          {item.date}
                        </div>
                        <div className="overall-res-history-topic">
                          Marks: {item.marksObtained}/{item.totalMarks}
                          {item.remarks ? ` • ${item.remarks}` : ""}
                        </div>
                      </div>
                      <span className="overall-res-history-badge">
                        {item.percentage || 0}%
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

export default OverAllResult;
