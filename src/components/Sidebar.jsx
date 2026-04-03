import React, { useState } from "react";
import "./Sidebar.css";
import logo from "../images/logo.png";
function Sidebar({ children }) {
  const token = localStorage.getItem("token");
  const userRole = token ? JSON.parse(atob(token.split(".")[1])).role : null;


  const [isOpen, setIsOpen] = useState(false);


  const roleList = {
   admin: [
    { title: "Dashboard", icon: "fa-house", href: "#" },
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
    { title: "Attendance Control", icon: "fa-calendar-check", href: "#" },
    { title: "Results Manage", icon: "fa-chart-column", href: "#" },
    { title: "Notifications", icon: "fa-bell", href: "#" },
  ],
     teacher: [
  { title: "Dashboard", icon: "fa-house", href: "/teacher/dashboard" },
  { title: "Attendance", icon: "fa-calendar-check", href: "/teacher/attendance" },
  { title: "Students Manage", icon: "fa-user-graduate", href: "/teacher/students" },
  { title: "Add Lectures & Notes", icon: "fa-file-import", href: "/teacher/add-notes" },
  { title: "Apply for Leave", icon: "fa-envelope-open-text", href: "/teacher/leave" },
  { title: "Test Marks", icon: "fa-square-poll-vertical", href: "/teacher/test-marks" },
  { title: "Test Generator", icon: "fa-gears", href: "/teacher/test-generator" },
  { title: "Notifications", icon: "fa-bell", href: "/teacher/notifications" },
],
     student: [
  { title: "Dashboard", icon: "fa-house", href: "/student/dashboard" },
  { title: "View Attendance", icon: "fa-calendar-check", href: "/student/attendance" },
  { title: "Registered Courses", icon: "fa-book-open", href: "/student/courses" },
  { title: "Lectures & Notes", icon: "fa-file-pdf", href: "/student/notes" },
  { title: "Fee History", icon: "fa-file-invoice-dollar", href: "/student/fees" },
  { title: "Results", icon: "fa-chart-column", href: "/student/results" },
  { title: "Notifications", icon: "fa-bell", href: "/student/notifications" },
]
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
              <span>{item.title}</span>
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
              <span>{item.title}</span>
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
