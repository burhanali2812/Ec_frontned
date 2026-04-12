import React, { useState } from "react";
import "./Sidebar.css";
import logo from "../images/logo.png";
import { useEffect } from "react";
import axios from "axios";
function Sidebar({ children }) {
  const [lengthOfPendingLeaves, setLengthOfPendingLeaves] = useState(null);
  const token = localStorage.getItem("token");
  const userRole = token ? JSON.parse(atob(token.split(".")[1])).role : null;

  const [isOpen, setIsOpen] = useState(false);
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

  const roleList = {
    admin: [
      { title: "Dashboard", icon: "fa-house", href: "/adminPanel" },
      {
        title: "Students Manage",
        icon: "fa-user-graduate",
        href: "/studentManage",
      },
      {
        title: "Register Student",
        icon: "fa-user-plus",
        href: "/student-register",
      },
      {
        title: "Teachers Manage",
        icon: "fa-chalkboard-teacher",
        href: "/teacherManage",
      },
      { title: "Courses Manage", icon: "fa-book-open", href: "/courseManage" },

      {
        title: "Attendance Control",
        icon: "fa-calendar-check",
        href: "/coming-soon",
      },
      {
        title: "Leave Applications",
        icon: "fa-envelope-open-text",
        href: "/admin/view-and-approve-leaves",
      },
      {
        title: "Timetable & Scheduling",
        icon: "fa-calendar-days",
        href: "/admin/timetable-manage",
      },
      {
        title: "Results Manage",
        icon: "fa-chart-column",
        href: "/coming-soon",
      },
      { title: "Notifications", icon: "fa-bell", href: "/coming-soon" },
    ],
    teacher: [
      { title: "Dashboard", icon: "fa-house", href: "/teacher/dashboard" },
      {
        title: "Mark Attendance",
        icon: "fa-calendar-check",
        href: "/teacher/attendance",
      },
      {
        title: "View Attendance",
        icon: "fa-chart-line",
        href: "/teacher/view-attendance",
      },
      {
        title: "Students Manage",
        icon: "fa-user-graduate",
        href: "/coming-soon",
      },
      {
        title: "Add Lectures & Notes",
        icon: "fa-file-import",
        href: "/coming-soon",
      },
      {
        title: "Apply for Leave",
        icon: "fa-envelope-open-text",
        href: "/apply-leave",
      },
      {
        title: "Test Marks",
        icon: "fa-square-poll-vertical",
        href: "/teacher/upload-result",
      },
      {
        title: "Test Generator",
        icon: "fa-gears",
        href: "/coming-soon",
      },
      {
        title: "Notifications",
        icon: "fa-bell",
        href: "/coming-soon",
      },
    ],
    student: [
      { title: "Dashboard", icon: "fa-house", href: "/student/dashboard" },
      {
        title: "TimeTable",
        icon: "fa-calendar-days",
        href: "/student/timetable",
      },
      {
        title: "Attendance",
        icon: "fa-calendar-check",
        href: "/student/attendance-overview",
      },
      {
        title: "Lectures & Notes",
        icon: "fa-file-pdf",
        href: "/coming-soon",
      },
      {
        title: "Fee History",
        icon: "fa-file-invoice-dollar",
        href: "/coming-soon",
      },
      {
        title: "Results",
        icon: "fa-chart-column",
        href: "/student/result-overview",
      },
      {
        title: "Apply for Leave",
        icon: "fa-envelope-open-text",
        href: "/apply-leave",
      },
      {
        title: "Add Teacher Feedback",
        icon: "fa-comment-dots",
        href: "/coming-soon",
      },
      {
        title: "Notifications",
        icon: "fa-bell",
        href: "/coming-soon",
      },
    ],
  };
  console.log("User Role:", userRole);

  const menuItems = userRole ? roleList[userRole] || [] : [];
  const handlelogOut = () => {
    localStorage.removeItem("token");
    window.location.href = "/";
  };

  const toggleMenu = () => setIsOpen((prev) => !prev);
  const closeMenu = () => setIsOpen(false);

  return (
    <div className="sb-layout">
      <header className="sb-mobile-topbar">
        <div className="sb-brand-wrap">
          <img src={logo} alt="EC Portal" width={50} />
          <h6 className="sb-brand-title mb-0">EC Portal</h6>
        </div>

        <div className="sb-mobile-actions">
          <button
            className="sb-hamburger"
            onClick={toggleMenu}
            aria-label="Toggle sidebar menu"
            aria-expanded={isOpen}
            type="button"
          >
            <i className="fas fa-bars"></i>
          </button>

          <button
            className="sb-mobile-logout"
            onClick={handlelogOut}
            aria-label="Logout"
            type="button"
            title="Logout"
          >
            <i className="fas fa-right-from-bracket"></i>
          </button>
        </div>
      </header>

      <aside className="sb-desktop-sidebar">
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
          className="mt-3"
        >
          <img src={logo} alt="EC Portal" width={120} />
        </div>
        <div className="sb-header">
          <h1 className="mb-1 text-dark text-center fw-bold">EC Portal</h1>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <span
              className="mb-0 px-3 py-1 rounded-2 fw-semibold"
              style={{ backgroundColor: "#e6f4ea", color: "#198754" }}
            >
              Academy
            </span>
          </div>
        </div>

        <nav className="sb-nav">
          {menuItems.map((item) => (
            <a key={item.title} href={item.href} className="sb-link">
              <i className={`fas ${item.icon}`}></i>
              <span className="sb-link-text">{item.title}</span>
              {userRole === "admin" &&
              item.href === "/admin/view-and-approve-leaves" &&
              Number(lengthOfPendingLeaves) > 0 ? (
                <span className="sb-pending-badge">
                  {lengthOfPendingLeaves}
                </span>
              ) : null}
            </a>
          ))}
        </nav>

        <div className="sb-footer">
          <button
            className="sb-logout-btn"
            type="button"
            onClick={handlelogOut}
          >
            <i className="fas fa-right-from-bracket"></i>
            Logout
          </button>
        </div>
      </aside>

      <aside className={`sb-mobile-panel ${isOpen ? "open" : ""}`}>
        <div className="sb-mobile-panel-head">
          <h6 className="mb-0">Menu</h6>
          <button
            className="sb-close"
            onClick={closeMenu}
            aria-label="Close sidebar menu"
            type="button"
          >
            <i className="fas fa-xmark"></i>
          </button>
        </div>

        <nav className="sb-nav sb-mobile-nav">
          {menuItems.map((item) => (
            <a
              key={item.title}
              href={item.href}
              className="sb-link"
              onClick={closeMenu}
            >
              <i className={`fas ${item.icon}`}></i>
              <span className="sb-link-text">{item.title}</span>
              {userRole === "admin" &&
              item.href === "/admin/view-and-approve-leaves" &&
              Number(lengthOfPendingLeaves) > 0 ? (
                <span className="sb-pending-badge">
                  {lengthOfPendingLeaves}
                </span>
              ) : null}
            </a>
          ))}
        </nav>
      </aside>

      {isOpen && <div className="sb-overlay" onClick={closeMenu}></div>}

      <main className="sb-main-content">{children}</main>
    </div>
  );
}

export default Sidebar;
