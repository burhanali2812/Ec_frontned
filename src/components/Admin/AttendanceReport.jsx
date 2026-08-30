// AttendanceReport.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import logo from "../../images/logo.png";
import "./AttendanceReport.css";
import {useAppContext} from "../../contextApi/AppContext";

const API_BASE = "https://api.theecportal.com/api";

function AttendanceReport() {
  const location = useLocation();
  const navigate = useNavigate();

  const {
    studentData,
    attendanceRecords = [],
    courses = [],
    startDate,
    endDate,
  } = location.state || {};
  const { classOptions } = useAppContext();

  const [isPrinting, setIsPrinting] = useState(false);
  const [holidays, setHolidays] = useState([]);

  useEffect(() => {
    if (!studentData) {
      navigate("/admin/attendance-control", { replace: true });
    }
  }, [studentData, navigate]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Holidays are needed so the report can explain days with no
  // attendance records (Sunday / holiday) instead of just omitting them.
  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        const res = await axios.get(`${API_BASE}/notifications/admin`, {
          headers: getAuthHeaders(),
        });
        if (res.data?.success) {
          setHolidays(
            (res.data.announcements || []).filter((n) => n.type === "Holiday"),
          );
        }
      } catch (error) {
        console.error("Error loading holidays for report:", error);
      }
    };
    fetchHolidays();
  }, []);

  const sortedRecords = useMemo(
    () => [...attendanceRecords].sort((a, b) => new Date(a.date) - new Date(b.date)),
    [attendanceRecords],
  );

  // Courses shown as columns — use the passed-in list, falling back to
  // whatever is present in the records themselves.
  const displayCourses = useMemo(() => {
    if (courses.length) return courses;
    return Array.from(
      new Map(
        sortedRecords
          .map((item) => item?.course)
          .filter(Boolean)
          .map((course) => [String(course._id || course.id), course]),
      ).values(),
    );
  }, [courses, sortedRecords]);

  // Course, Total Days, Present, Absent, Percentage — one row per course
  const summaryRows = useMemo(() => {
    return displayCourses.map((course) => {
      const courseId = String(course._id || course.id);
      const courseRecords = sortedRecords.filter(
        (record) => String(record?.course?._id || record?.course || "") === courseId,
      );

      const totalDays = courseRecords.length;
      const present = courseRecords.filter((r) => r.status === "present").length;
      const onLeave = courseRecords.filter((r) => r.status === "onLeave").length;
      const absent = totalDays - present - onLeave;
      const denom = totalDays - onLeave;
      const percentage = denom > 0 ? Math.round((present / denom) * 100) : 0;

      return {
        courseId,
        title: course.title || course.name || "Course",
        totalDays,
        present,
        absent,
        onLeave,
        percentage,
      };
    });
  }, [displayCourses, sortedRecords]);

  const toISODate = (value) => {
    if (!value) return "";
    return new Date(value).toISOString().split("T")[0];
  };

  // Group daily records by ISO date ("YYYY-MM-DD") so they can be
  // matched against the reconstructed calendar range below.
  const groupedByDate = useMemo(() => {
    const groups = {};
    sortedRecords.forEach((record) => {
      const iso = toISODate(record.date);
      if (!iso) return;
      if (!groups[iso]) groups[iso] = [];
      groups[iso].push(record);
    });
    return groups;
  }, [sortedRecords]);

  // Every calendar date between startDate and endDate, inclusive — this
  // is what lets Sundays/holidays show up even when no attendance record
  // exists for them (which is expected now that marking is blocked then).
  const allDatesInRange = useMemo(() => {
    if (!startDate || !endDate) return [];
    const dates = [];
    const cursor = new Date(`${startDate}T00:00:00.000Z`);
    const last = new Date(`${endDate}T00:00:00.000Z`);
    while (cursor <= last) {
      dates.push(cursor.toISOString().split("T")[0]);
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return dates;
  }, [startDate, endDate]);

  const isSundayISO = (isoDateStr) => {
    const d = new Date(`${isoDateStr}T00:00:00.000Z`);
    return d.getUTCDay() === 0;
  };

  const findHolidayForISODate = (isoDateStr) => {
    return holidays.find((h) => {
      const from = toISODate(h.date?.from);
      const to = toISODate(h.date?.to);
      if (!from || !to) return false;
      return isoDateStr >= from && isoDateStr <= to;
    });
  };

  // Classify every day in range as: sunday / holiday / has records / empty.
  // "empty" (an ordinary weekday with nothing to show) is filtered out
  // below so the report doesn't balloon with blank days — only Sundays,
  // holidays, and days with actual data are rendered.
  const dayEntries = useMemo(() => {
    const isoDates =
      allDatesInRange.length > 0
        ? allDatesInRange
        : Object.keys(groupedByDate).sort();

    return isoDates.map((iso) => {
      if (isSundayISO(iso)) {
        return { iso, kind: "sunday" };
      }
      const holiday = findHolidayForISODate(iso);
      if (holiday) {
        return { iso, kind: "holiday", holiday };
      }
      if (groupedByDate[iso]?.length) {
        return { iso, kind: "records", records: groupedByDate[iso] };
      }
      return { iso, kind: "empty" };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allDatesInRange, groupedByDate, holidays]);

  const visibleDayEntries = useMemo(
    () => dayEntries.filter((entry) => entry.kind !== "empty"),
    [dayEntries],
  );

  const formatDate = (dateValue) => {
    if (!dateValue) return "-";
    return new Date(dateValue).toLocaleDateString("en-GB");
  };

  const statusLabel = (status) => {
    if (!status) return "-----";
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const statusClass = (status) => {
    if (status === "present") return "ar-status-present";
    if (status === "absent") return "ar-status-absent";
    if (status === "onLeave") return "ar-status-onleave";
    return "ar-status-none";
  };

  // Mobile-safe print trigger. The DOM is always mounted (no conditional
  // render), so there's nothing async standing between the click and
  // window.print() — this is what iOS Safari needs to keep the print
  // dialog tied to the tap.
  const handlePrint = () => {
    setIsPrinting(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.print();
        setIsPrinting(false);
      });
    });
  };

  if (!studentData) return null;

  return (
    <div className={`ar-page py-3 py-lg-4 ${isPrinting ? "ar-is-printing" : ""}`}>
      <div className="ar-shell p-3 p-lg-4 mb-3">
        <div className="ar-toolbar no-print">
          <button className="ar-btn ar-btn-secondary" onClick={() => navigate(-1)}>
            <i className="fas fa-arrow-left"></i> Back
          </button>
          <button className="ar-btn ar-btn-pdf" onClick={handlePrint}>
            <i className="fas fa-file-pdf"></i> Print / Save as PDF
          </button>
        </div>

        <div className="ar-printable">
          <div className="ar-print-watermark">
            <img src={logo} alt="watermark" />
          </div>

          <div className="ar-print-header">
            <img src={logo} alt="EC Academy" className="ar-print-logo" />
            <h1 className="ar-institute-title">THE EDUCATION'S CRADLE INSTITUTE</h1>
            <h2 className="ar-report-title">Attendance Report</h2>
          </div>

          <div className="ar-info-block">
            <div className="ar-info-row">
              <span>
                <strong>Student Name:</strong> {studentData?.name || "-"}
              </span>
              <span>
                <strong>Roll Number:</strong> {studentData?.rollNumber || "-"}
              </span>
            </div>
            <div className="ar-info-row">
              <span>
                <strong>Class:</strong> {classOptions.find((cls) => cls._id === studentData?.classInfo)?.name || "-"}
              </span>
              <span>
                <strong>Date Range:</strong> {startDate ? formatDate(startDate) : "-"} to{" "}
                {endDate ? formatDate(endDate) : "-"}
              </span>
            </div>
          </div>

          {summaryRows.length > 0 && (
            <div className="ar-section">
              <h3 className="ar-section-title">Attendance Summary</h3>
              <div className="table-responsive">
                <table className="ar-summary-table">
                  <thead>
                    <tr className= "text-center">
                      <th>Course</th>
                      <th>Total Days</th>
                      <th>Present</th>
                      <th>Absent</th>
                      <th>On Leave</th>
                      <th>Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryRows.map((row) => (
                      <tr key={row.courseId}>
                        <td>{row.title}</td>
                        <td className="ar-center">{row.totalDays}</td>
                        <td className="ar-center">{row.present}</td>
                        <td className="ar-center">{row.absent}</td>
                        <td className="ar-center">{row.onLeave}</td>
                        <td className="ar-center">
                          <strong>{row.percentage}%</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {visibleDayEntries.length > 0 && (
            <div className="ar-section">
              <h3 className="ar-section-title">Daily Attendance Records</h3>
              <div className="ar-daily-records">
                {visibleDayEntries.map((entry) => {
                  if (entry.kind === "sunday") {
                    return (
                      <div key={entry.iso} className="ar-date-group">
                        <div className="ar-date-header">
                          <span>{formatDate(entry.iso)}</span>
                        </div>
                        <div className="ar-noattendance-banner ar-noattendance-sunday">
                          Sunday — No Attendance
                        </div>
                      </div>
                    );
                  }

                  if (entry.kind === "holiday") {
                    return (
                      <div key={entry.iso} className="ar-date-group">
                        <div className="ar-date-header">
                          <span>{formatDate(entry.iso)}</span>
                        </div>
                        <div className="ar-noattendance-banner ar-noattendance-holiday">
                          Holiday{entry.holiday?.title ? `: ${entry.holiday.title}` : ""} — No Attendance
                        </div>
                      </div>
                    );
                  }

                  // entry.kind === "records"
                  return (
                    <div key={entry.iso} className="ar-date-group">
                      <div className="ar-date-header">
                        <span>{formatDate(entry.iso)}</span>
                      </div>
                      <div className="table-responsive">
                        <table className="ar-daily-table">
                          <thead>
                            <tr>
                              {displayCourses.map((course) => (
                                <th key={course._id || course.id}>
                                  {course.title || course.name}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              {displayCourses.map((course) => {
                                const courseId = String(course._id || course.id);
                                const record = entry.records.find(
                                  (r) =>
                                    String(r?.course?._id || r?.course || "") ===
                                    courseId,
                                );
                                return (
                                  <td key={courseId} className="ar-center">
                                    <span
                                      className={`ar-status-badge ${statusClass(
                                        record?.status,
                                      )}`}
                                    >
                                      {record ? statusLabel(record.status) : "-----"}
                                    </span>
                                  </td>
                                );
                              })}
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {summaryRows.length === 0 && visibleDayEntries.length === 0 && (
            <div className="ar-empty-message">
              No attendance records found for the selected filters.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AttendanceReport;