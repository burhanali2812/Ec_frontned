import React, { useState } from "react";
import "./Sidebar.css";
import logo from "../images/logo.png";
import { useEffect } from "react";
import axios from "axios";
import {Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import {useAppContext} from "../contextApi/AppContext";
function Sidebar({ children }) {
  const [lengthOfPendingLeaves, setLengthOfPendingLeaves] = useState(null);
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const userRole = token ? JSON.parse(atob(token.split(".")[1])).role : null;
  const { logout } = useAppContext();

  const [isOpen, setIsOpen] = useState(false);
  useEffect(() => {
    const fetchPendingLeaves = async () => {
      try {
        const res = await axios.get(
          `https://api.theecportal.com/api/leave/lengthOfPendingLeaves`,
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

  const handlelogOut = () => {
    const confirmed = window.confirm("Are you sure you want to logout?");
    if (confirmed) {
      localStorage.clear();
      logout();
      navigate("/");
    }
  };

  const roleList = {
    admin: [
      { title: "Dashboard", icon: "fa-house", to: "/adminPanel" },
      {
        title: "Students Manage",
        icon: "fa-user-graduate",
        to: "/studentManage",
      },
      {
        title: "Register Student",
        icon: "fa-user-plus",
        to: "/student-register",
      },
      {
        title: "Teachers Manage",
        icon: "fa-chalkboard-teacher",
        to: "/teacherManage",
      },
      { title: "Courses Manage", icon: "fa-book-open", to: "/courseManage" },

      {
        title: "Attendance Control",
        icon: "fa-calendar-check",
        to: "/admin/attendance-control",
      },

      {
        title: "View Teacher Reviews",
        icon: "fa-star",
        to: "/admin/viewReviews",
      },

      {
        title: "Leave Applications",
        icon: "fa-envelope-open-text",
        to: "/admin/view-and-approve-leaves",
      },
      {
        title: "Timetable & Scheduling",
        icon: "fa-calendar-days",
        to: "/admin/timetable-manage",
      },
      {
        title: "Results Manage",
        icon: "fa-chart-column",
        to: "/admin/result-generate",
      },
      {
        title: "Classes Manage",
        icon: "fa-chalkboard",
        to: "/admin/classes",
      },
     
      {
        title: "Announcements & Notices",
        icon: "fas fa-bullhorn",
        to: "/admin/announcements",
      }, 
      
    ],
    teacher: [
      { title: "Dashboard", icon: "fa-house", to: "/teacher/dashboard" },
      {
        title: "Mark Attendance",
        icon: "fa-calendar-check",
        to: "/teacher/attendance",
      },
      {
        title: "Attendance Manage",
        icon: "fa-chart-line",
        to: "/teacher/view-attendance",
      },
      {
        title: "Add Lectures & Notes",
        icon: "fa-file-import",
        to: "/coming-soon",
      },
      {
        title: "Apply for Leave",
        icon: "fa-envelope-open-text",
        to: "/apply-leave",
      },
      {
        title: "Results Manage",
        icon: "fa-square-poll-vertical",
        to: "/teacher/upload-result",
      },
      
      // {
      //   title: "Test Generator",
      //   icon: "fa-gears",
      //   to: "/coming-soon",
      // },
    {
        title: "Notifications",
        icon: "fas fa-bell",
        to: "/student/notifications",
      }, 
    ],
    student: [
      { title: "Dashboard", icon: "fa-house", to: "/student/dashboard" },
      {
        title: "TimeTable",
        icon: "fa-calendar-days",
        to: "/student/timetable",
      },
      {
        title: "Attendance",
        icon: "fa-calendar-check",
        to: "/student/attendance-overview",
      },
      {
        title: "Lectures & Notes",
        icon: "fa-file-pdf",
        to: "/coming-soon",
      },
      {
        title: "Fee History",
        icon: "fa-file-invoice-dollar",
        to: "/coming-soon",
      },
      {
        title: "Results",
        icon: "fa-chart-column",
        to: "/student/result-overview",
      },

      {
        title: "Apply for Leave",
        icon: "fa-envelope-open-text",
        to: "/apply-leave",
      },
      {
        title: "Add Teacher Feedback",
        icon: "fa-comment-dots",
        to: "/student/reviews",
      },
    {
        title: "Notifications",
        icon: "fas fa-bell",
        to: "/student/notifications",
      }, 
  
    ],
  };
  console.log("User Role:", userRole);

  const menuItems = userRole ? roleList[userRole] || [] : [];

  const toggleMenu = () => setIsOpen((prev) => !prev);
  const closeMenu = () => setIsOpen(false);

  return (
    <div className="sb-layout">
      <header className="sb-mobile-topbar py-3">
        <div className="sb-brand-wrap">
          <img src={logo} alt="EC Portal" width={50} />
        </div>

        <div className="sb-topbar-center">
          <h5 className="mt-0 fw-semibold sb-mobile-title">
            THE EDUCATION'S CRADLE INSTITUTE
          </h5>
          <p
            className="text-secondary fw-semibold"
            style={{
              fontStyle: "italic",
              margin: "0",
              fontSize: "13px",
            }}
          >
            Strive Together
          </p>
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
  {menuItems.map((item) => {
    if (item.onClick) {
      return (
        <button
          key={item.title}
          type="button"
          className="sb-link sb-btn-link"
          onClick={item.onClick}
        >
          <i className={`fas ${item.icon}`}></i>
          <span className="sb-link-text">{item.title}</span>
        </button>
      );
    }

    return (
      <Link
        key={item.title}
        to={item.to}
        className="sb-link"
      >
        <i className={`fas ${item.icon}`}></i>
        <span className="sb-link-text">{item.title}</span>

        {userRole === "admin" &&
          item.to === "/admin/view-and-approve-leaves" &&
          Number(lengthOfPendingLeaves) > 0 && (
            <span className="sb-pending-badge">
              {lengthOfPendingLeaves}
            </span>
          )}
      </Link>
    );
  })}
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
  {menuItems.map((item) => {
    if (item.onClick) {
      return (
        <button
          key={item.title}
          type="button"
          className="sb-link sb-btn-link"
          onClick={() => {
            item.onClick();
            closeMenu();
          }}
        >
          <i className={`fas ${item.icon}`}></i>
          <span className="sb-link-text">{item.title}</span>
        </button>
      );
    }

    return (
      <Link
        key={item.title}
        to={item.to}
        className="sb-link"
        onClick={closeMenu}
      >
        <i className={`fas ${item.icon}`}></i>
        <span className="sb-link-text">{item.title}</span>

        {userRole === "admin" &&
          item.to === "/admin/view-and-approve-leaves" &&
          Number(lengthOfPendingLeaves) > 0 && (
            <span className="sb-pending-badge">
              {lengthOfPendingLeaves}
            </span>
          )}
      </Link>
    );
  })}

  {/* Mobile Logout Button */}
  <button
    type="button"
    className="sb-link sb-btn-link sb-mobile-logout"
    onClick={() => {
      closeMenu();
      handlelogOut();
    }}
  >
    <i className="fas fa-right-from-bracket"></i>
    <span className="sb-link-text">Logout</span>
  </button>
</nav>
      </aside>

      {isOpen && <div className="sb-overlay" onClick={closeMenu}></div>}

      <main className="sb-main-content">{children}</main>
    </div>
  );
}

export default Sidebar;
