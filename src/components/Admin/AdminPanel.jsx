import React, { useMemo, useState } from "react";
import Sidebar from "../Sidebar";
import TopBar from "../TopBar";
import "./AdminPanel.css";

function AdminPanel() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Demo data (replace with API response later)
  const students = [
    { id: 1, paid: true, amount: 12000, date: "2026-03-02" },
    { id: 2, paid: true, amount: 12000, date: "2026-03-04" },
    { id: 3, paid: false, amount: 12000, date: "2026-03-10" },
    { id: 4, paid: true, amount: 12000, date: "2026-03-16" },
    { id: 5, paid: false, amount: 12000, date: "2026-03-22" },
  ];

  const teachers = [
    { id: 1, paid: true, amount: 30000, date: "2026-03-03" },
    { id: 2, paid: false, amount: 30000, date: "2026-03-09" },
    { id: 3, paid: true, amount: 30000, date: "2026-03-15" },
    { id: 4, paid: false, amount: 30000, date: "2026-03-24" },
  ];

  const isInRange = (valueDate) => {
    if (!startDate && !endDate) return true;

    const value = new Date(valueDate);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    if (start && value < start) return false;
    if (end && value > end) return false;
    return true;
  };

  const summary = useMemo(() => {
    const filteredStudents = students.filter((s) => isInRange(s.date));
    const filteredTeachers = teachers.filter((t) => isInRange(t.date));

    const studentPaid = filteredStudents.filter((s) => s.paid);
    const studentRemaining = filteredStudents.filter((s) => !s.paid);

    const teacherPaid = filteredTeachers.filter((t) => t.paid);
    const teacherRemaining = filteredTeachers.filter((t) => !t.paid);

    return {
      studentPaidCount: studentPaid.length,
      studentRemainingCount: studentRemaining.length,
      studentTotalCount: filteredStudents.length,
      teacherPaidCount: teacherPaid.length,
      teacherRemainingCount: teacherRemaining.length,
      teacherTotalCount: filteredTeachers.length,
      studentPaidAmount: studentPaid.reduce(
        (sum, item) => sum + item.amount,
        0,
      ),
      studentRemainingAmount: studentRemaining.reduce(
        (sum, item) => sum + item.amount,
        0,
      ),
      teacherPaidAmount: teacherPaid.reduce(
        (sum, item) => sum + item.amount,
        0,
      ),
      teacherRemainingAmount: teacherRemaining.reduce(
        (sum, item) => sum + item.amount,
        0,
      ),
    };
  }, [startDate, endDate]);

  const formatPKR = (amount) =>
    new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      maximumFractionDigits: 0,
    }).format(amount);

  return (
    <Sidebar>
      <TopBar />

      <section className="ap-filter-card p-3 p-md-4 mb-4">
        <div className="row g-3 align-items-end">
          <div className="col-12 col-md-4" >
            <label className="form-label fw-semibold">Start Date</label>
            <input
              type="date"
              className="form-control"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{cursor: "pointer"}}
            />
          </div>

          <div className="col-12 col-md-4" >
            <label className="form-label fw-semibold">End Date</label>
            <input
              type="date"
              className="form-control"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{cursor: "pointer"}}
            />
          </div>

          <div className="col-12 col-md-4">
            <button
              className="btn btn-outline-secondary w-100"
              type="button"
              onClick={() => {
                setStartDate("");
                setEndDate("");
              }}
            >
              Clear Date Filter
            </button>
          </div>
        </div>
      </section>

      <section className="row g-4">
        <div className="col-12 col-md-6 col-xl-3">
          <div className="ap-stat-card p-3 p-md-4" style={{cursor: "pointer"}}>
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h6 className="mb-0 fw-semibold">Students Paid Amount</h6>
              <span className="ap-icon ap-icon-student-paid">
                <i className="fas fa-user-graduate"></i>
              </span>
            </div>
            <p className="ap-amount">{formatPKR(summary.studentPaidAmount)}</p>
            <p className="ap-sub mb-0">
              {summary.studentPaidCount} paid / {summary.studentTotalCount}{" "}
              total students
            </p>
          </div>
        </div>

        <div className="col-12 col-md-6 col-xl-3">
          <div className="ap-stat-card p-3 p-md-4" style={{cursor: "pointer"}}>
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h6 className="mb-0 fw-semibold">
                Students Remaining Amount
              </h6>
              <span className="ap-icon ap-icon-student-remaining">
                <i className="fas fa-user-clock"></i>
              </span>
            </div>
            <p className="ap-amount">
              {formatPKR(summary.studentRemainingAmount)}
            </p>
            <p className="ap-sub mb-0">
              {summary.studentRemainingCount} remaining /{" "}
              {summary.studentTotalCount} total students
            </p>
          </div>
        </div>

        <div className="col-12 col-md-6 col-xl-3">
          <div className="ap-stat-card p-3 p-md-4" style={{cursor: "pointer"}}>
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h6 className="mb-0 fw-semibold">Teachers Paid Amount</h6>
              <span className="ap-icon ap-icon-teacher-paid">
                <i className="fas fa-chalkboard-teacher"></i>
              </span>
            </div>
            <p className="ap-amount">{formatPKR(summary.teacherPaidAmount)}</p>
            <p className="ap-sub mb-0">
              {summary.teacherPaidCount} paid / {summary.teacherTotalCount}{" "}
              total teachers
            </p>
          </div>
        </div>

        <div className="col-12 col-md-6 col-xl-3">
          <div className="ap-stat-card p-3 p-md-4" style={{cursor: "pointer"}}>
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h6 className="mb-0 fw-semibold">
                Teachers Remaining Amount
              </h6>
              <span className="ap-icon ap-icon-teacher-remaining">
                <i className="fas fa-user-clock"></i>
              </span>
            </div>
            <p className="ap-amount">
              {formatPKR(summary.teacherRemainingAmount)}
            </p>
            <p className="ap-sub mb-0">
              {summary.teacherRemainingCount} remaining /{" "}
              {summary.teacherTotalCount} total teachers
            </p>
          </div>
        </div>
      </section>
    </Sidebar>
  );
}

export default AdminPanel;
