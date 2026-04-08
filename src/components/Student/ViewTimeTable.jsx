import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Sidebar from "../Sidebar";
import "./ViewTimeTable.css";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function ViewTimeTable() {
  const [timeTables, setTimeTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dayFilter, setDayFilter] = useState("all");

  const API_BASE = "https://ec-backend-phi.vercel.app/api";

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    const fetchTimeTable = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API_BASE}/timetable/viewTimeTable`, {
          headers: getAuthHeaders(),
        });
        setTimeTables(res?.data?.timeTables || []);
      } catch (error) {
        console.error("Failed to load timetable:", error);
        setTimeTables([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTimeTable();
  }, []);

  const filteredRows = useMemo(() => {
    const source = (timeTables || []).filter((item) => item?.dayOfWeek !== "Sunday");
    if (dayFilter === "all") return source;
    return source.filter((item) => String(item?.dayOfWeek) === dayFilter);
  }, [timeTables, dayFilter]);

  const groupedByDay = useMemo(() => {
    const targetDays = dayFilter === "all" ? DAYS : [dayFilter];
    return targetDays.map((day) => ({
      day,
      rows: filteredRows.filter((item) => String(item?.dayOfWeek) === day),
    }));
  }, [filteredRows, dayFilter]);

  return (
    <Sidebar>
      <div className="std-tt-page py-3 py-lg-4">
        <div className="container-fluid px-0 px-lg-2">
          <div className="std-tt-hero mb-3">
            <p className="mb-1 small text-muted fw-semibold">Student Timetable</p>
            <h4 className="mb-1">Registered Courses Schedule</h4>
            <p className="mb-0 text-muted small">View your weekly timetable for Monday to Saturday.</p>
          </div>

          <div className="std-tt-card p-3 p-md-4">
            <div className="d-flex flex-column flex-md-row justify-content-between gap-2 align-items-start align-items-md-center mb-3">
              <h5 className="mb-0">Weekly Timetable</h5>
              <div className="std-tt-filter-wrap">
                <label className="small text-muted mb-1">Day</label>
                <select
                  className="form-select form-select-sm"
                  value={dayFilter}
                  onChange={(e) => setDayFilter(e.target.value)}
                >
                  <option value="all">All Days</option>
                  {DAYS.map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-success" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : filteredRows.length === 0 ? (
              <div className="alert alert-info mb-0">
                No timetable entries found for your registered courses.
              </div>
            ) : (
              <div className="std-tt-day-grid">
                {groupedByDay.map((group) => (
                  <div key={group.day} className="std-tt-day-card">
                    <div className="std-tt-day-head">
                      <span className="std-tt-day-pill">{group.day}</span>
                      <span className="small text-muted">
                        {group.rows.length} {group.rows.length === 1 ? "class" : "classes"}
                      </span>
                    </div>

                    {group.rows.length === 0 ? (
                      <div className="std-tt-day-empty">No classes scheduled.</div>
                    ) : (
                      <div className="table-responsive">
                        <table className="std-tt-table">
                          <thead>
                            <tr>
                              <th>Time</th>
                              <th>Course</th>
                              <th>Teacher</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.rows.map((item) => (
                              <tr key={item._id}>
                                <td>
                                  <span className="fw-semibold">
                                    {item.startTime} - {item.endTime}
                                  </span>
                                </td>
                                <td>{item?.course?.title || "-"}</td>
                                <td>{item?.teacher?.name || "-"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Sidebar>
  );
}

export default ViewTimeTable;
