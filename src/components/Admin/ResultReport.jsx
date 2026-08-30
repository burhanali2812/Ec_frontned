import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Sidebar from "../Sidebar";
import Footer from "../footer";
import "./ResultReport.css";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const API_BASE = "https://api.theecportal.com/api";

function ResultReport() {
  const { studentId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const cachedStudent = location.state?.student || null;

  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState(cachedStudent);
  const [registrationCourses, setRegistrationCourses] = useState(
    location.state?.selectedCourses || [],
  );
  const [results, setResults] = useState([]);

  const searchParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );

  const selectedCourseIds = useMemo(() => {
    const coursesParam = searchParams.get("courses") || "all";
    if (coursesParam === "all") {
      return "all";
    }

    return coursesParam
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }, [searchParams]);

  const startDate = searchParams.get("start") || location.state?.startDate || "";
  const endDate = searchParams.get("end") || location.state?.endDate || "";

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    const fetchReport = async () => {
      if (!studentId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const studentPromise = cachedStudent
          ? Promise.resolve({ data: { student: cachedStudent } })
          : axios.get(`${API_BASE}/students/getStudentById/${studentId}`, {
              headers: getAuthHeaders(),
            });

        const coursesPromise = axios.get(
          `${API_BASE}/registration/getStudentCourses/${studentId}`,
          { headers: getAuthHeaders() },
        );

        const resultsPromise = axios.get(`${API_BASE}/results/getResults/${studentId}`, {
          headers: getAuthHeaders(),
        });

        const [studentRes, coursesRes, resultsRes] = await Promise.all([
          studentPromise,
          coursesPromise,
          resultsPromise,
        ]);

        if (studentRes.data?.student) {
          setStudent(studentRes.data.student);
        }

        const coursesFromApi = coursesRes.data?.courses || [];
        const aboutCourses = coursesRes.data?.aboutCourse || [];
        const mergedCourses = [
          ...coursesFromApi,
          ...aboutCourses.map((item) => item?.course).filter(Boolean),
        ].filter(Boolean);

        const uniqueCourses = Array.from(
          new Map(
            mergedCourses.map((course) => [String(course._id || course.id), course]),
          ).values(),
        );

        setRegistrationCourses(uniqueCourses);
        setResults(resultsRes.data?.results || []);
      } catch (error) {
        console.error("Error loading report:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [studentId, cachedStudent]);

  const selectedCourses = useMemo(() => {
    const availableCourses = registrationCourses.length
      ? registrationCourses
      : Array.from(
          new Map(
            results
              .map((item) => item?.course)
              .filter(Boolean)
              .map((course) => [String(course._id || course.id), course]),
          ).values(),
        );

    if (selectedCourseIds === "all") {
      return availableCourses;
    }

    return availableCourses.filter((course) =>
      selectedCourseIds.includes(String(course._id || course.id)),
    );
  }, [registrationCourses, results, selectedCourseIds]);

  const filteredResults = useMemo(() => {
    const start = startDate ? new Date(`${startDate}T00:00:00`) : null;
    const end = endDate ? new Date(`${endDate}T23:59:59`) : null;
    const allowedCourseIds =
      selectedCourseIds === "all"
        ? null
        : new Set(selectedCourseIds.map((id) => String(id)));

    return results.filter((record) => {
      const recordCourseId = String(record?.course?._id || record?.course || "");
      const recordDate = new Date(record.dateOfExam);

      if (allowedCourseIds && !allowedCourseIds.has(recordCourseId)) {
        return false;
      }

      if (start && recordDate < start) return false;
      if (end && recordDate > end) return false;
      return true;
    });
  }, [results, selectedCourseIds, startDate, endDate]);

  const courseSections = useMemo(() => {
    const sectionCourseList = selectedCourses.length
      ? selectedCourses
      : Array.from(
          new Map(
            filteredResults
              .map((item) => item?.course)
              .filter(Boolean)
              .map((course) => [String(course._id || course.id), course]),
          ).values(),
        );

    return sectionCourseList
      .map((course) => {
        const courseId = String(course._id || course.id);
        const courseResults = filteredResults.filter((record) => {
          const recordCourseId = String(record?.course?._id || record?.course || "");
          return recordCourseId === courseId;
        });

        const totalTests = courseResults.length;
        const totalMarks = courseResults.reduce(
          (sum, record) => sum + Number(record.totalMarks || 0),
          0,
        );
        const obtainedMarks = courseResults.reduce(
          (sum, record) => sum + Number(record.marksObtained || 0),
          0,
        );
        const percentage =
          totalMarks > 0 ? Math.round((obtainedMarks / totalMarks) * 100) : 0;

        return {
          courseId,
          title: course.title || course.name || "Course",
          results: courseResults,
          totalTests,
          totalMarks,
          obtainedMarks,
          percentage,
        };
      })
      .filter((section) => section.results.length || selectedCourseIds === "all");
  }, [filteredResults, selectedCourses, selectedCourseIds]);

  const summary = useMemo(() => {
    const totalTests = filteredResults.length;
    const totalMarks = filteredResults.reduce(
      (sum, record) => sum + Number(record.totalMarks || 0),
      0,
    );
    const obtainedMarks = filteredResults.reduce(
      (sum, record) => sum + Number(record.marksObtained || 0),
      0,
    );
    const overallPercentage =
      totalMarks > 0 ? Math.round((obtainedMarks / totalMarks) * 100) : 0;

    return {
      totalTests,
      totalMarks,
      obtainedMarks,
      overallPercentage,
    };
  }, [filteredResults]);

  const chartData = {
    labels: ["Total Tests", "Total Marks", "Obtained Marks", "Overall %"],
    datasets: [
      {
        label: "Summary",
        data: [
          summary.totalTests,
          summary.totalMarks,
          summary.obtainedMarks,
          summary.overallPercentage,
        ],
        backgroundColor: ["#2563eb", "#f97316", "#14b8a6", "#65ffff"],
        borderRadius: 10,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: {
        ticks: { color: "#64748b" },
        grid: { display: false },
      },
      y: {
        ticks: { color: "#64748b" },
        grid: { color: "#e2e8f0" },
        beginAtZero: true,
      },
    },
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return "-";
    return new Date(dateValue).toLocaleDateString("en-GB");
  };

  const handlePrint = () => {
    window.print();
  };

  if (!studentId) {
    return (
      <Sidebar>
        <div className="rr-page py-3 py-lg-4">
          <div className="rr-shell p-3 p-lg-4">
            <div className="alert alert-warning mb-0">
              No student selected for the report.
            </div>
          </div>
        </div>
      </Sidebar>
    );
  }

  return (
    <Sidebar>
      <div className="rr-page py-3 py-lg-4">
        <div className="rr-shell p-3 p-lg-4 mb-3">
          <div className="rr-header">
            <div>
              <h1 className="rr-title">Result Report</h1>
              <p className="rr-subtitle">
                Course-wise performance report with date filters and printable summary.
              </p>
            </div>

            <div className="rr-actions no-print">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => navigate(-1)}
              >
                Back
              </button>
              <button type="button" className="btn btn-primary" onClick={handlePrint}>
                Print Report
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-5">Loading report...</div>
          ) : (
            <div className="rr-printable">
              <div className="rr-student-card mb-3">
                <div className="d-flex justify-content-between align-items-start gap-2 flex-wrap">
                  <div>
                    <div className="rr-detail-chip mb-2">
                      <span className="dot" /> Student Details
                    </div>
                    <h2 className="mb-1 fw-bold text-dark">{student?.name || "Student"}</h2>
                    <p className="mb-0 text-muted">
                      {student?.rollNumber || "-"} • {student?.classInfo || "-"}
                    </p>
                  </div>

                  <div className="text-end">
                    <div className="rr-detail-chip mb-2">
                      <span className="dot" /> Report Filters
                    </div>
                    <div className="text-muted small">
                      Courses:{" "}
                      {selectedCourseIds === "all" ? "All Courses" : selectedCourseIds.join(", ")}
                    </div>
                    <div className="text-muted small">
                      Date Range: {startDate || "Start"} to {endDate || "End"}
                    </div>
                  </div>
                </div>

                <div className="rr-student-grid">
                  <div className="rr-student-meta">
                    <span className="label">Roll Number</span>
                    <span className="value">{student?.rollNumber || "-"}</span>
                  </div>
                  <div className="rr-student-meta">
                    <span className="label">Class</span>
                    <span className="value">{student?.classInfo || "-"}</span>
                  </div>
                  <div className="rr-student-meta">
                    <span className="label">Contact</span>
                    <span className="value">{student?.contact || "-"}</span>
                  </div>
                  <div className="rr-student-meta">
                    <span className="label">Email</span>
                    <span className="value">{student?.email || "-"}</span>
                  </div>
                </div>
              </div>

              <div className="rr-summary-grid mb-3">
                <div className="rr-summary-card">
                  <div className="rr-summary-label">Total Tests</div>
                  <div className="rr-summary-value">{summary.totalTests}</div>
                  <div className="rr-summary-note">Filtered result entries</div>
                </div>
                <div className="rr-summary-card">
                  <div className="rr-summary-label">Total Marks</div>
                  <div className="rr-summary-value">{summary.totalMarks}</div>
                  <div className="rr-summary-note">Combined maximum marks</div>
                </div>
                <div className="rr-summary-card">
                  <div className="rr-summary-label">Obtained Marks</div>
                  <div className="rr-summary-value">{summary.obtainedMarks}</div>
                  <div className="rr-summary-note">Combined scored marks</div>
                </div>
                <div className="rr-summary-card">
                  <div className="rr-summary-label">Overall Percentage</div>
                  <div className="rr-summary-value">{summary.overallPercentage}%</div>
                  <div className="rr-summary-note">Overall performance</div>
                </div>
              </div>

              <div className="rr-chart-card mb-3">
                <h3 className="h6 fw-bold mb-3">Summary Chart</h3>
                <div className="rr-chart-wrap">
                  <Bar data={chartData} options={chartOptions} />
                </div>
              </div>

              <div className="rr-course-grid">
                {courseSections.length ? (
                  courseSections.map((section) => (
                    <div key={section.courseId} className="rr-course-card">
                      <div className="rr-course-head">
                        <div>
                          <h4 className="rr-course-title">{section.title}</h4>
                          <div className="text-muted small">
                            Course-wise result details for the selected date range.
                          </div>
                        </div>
                        <span className="rr-course-stat">
                          Tests: {section.totalTests} • {section.percentage}%
                        </span>
                      </div>

                      {section.results.length ? (
                        <div className="table-responsive">
                          <table className="table rr-table">
                            <thead>
                              <tr>
                                <th>Test Date</th>
                                <th>Total Marks</th>
                                <th>Obtained Marks</th>
                                <th>Percentage</th>
                              </tr>
                            </thead>
                            <tbody>
                              {section.results.map((record) => {
                                const total = Number(record.totalMarks || 0);
                                const obtained = Number(record.marksObtained || 0);
                                const percentage =
                                  total > 0 ? Math.round((obtained / total) * 100) : 0;

                                return (
                                  <tr key={record._id}>
                                    <td>{formatDate(record.dateOfExam)}</td>
                                    <td>{total}</td>
                                    <td>{obtained}</td>
                                    <td>{percentage}%</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="rr-empty-card">
                          <div className="rr-empty-message">
                            No result records found for this course within the selected date range.
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="rr-empty-card">
                    <div className="rr-empty-message">
                      No result records found for the selected filters.
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <Footer />
      </div>
    </Sidebar>
  );
}

export default ResultReport;