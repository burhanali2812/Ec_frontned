import React, { useState, useEffect } from "react";
import "./Sidebar.css";
import logo from "../images/logo.png";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { useAppContext } from "../contextApi/AppContext";
import { Toaster , toast} from "react-hot-toast";

function Sidebar({ children }) {
  const [lengthOfPendingLeaves, setLengthOfPendingLeaves] = useState(null);
  const [switching, setSwitching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const userRole = token ? JSON.parse(atob(token.split(".")[1])).role : null;
  const { logout, user, login , API_BASE_URL} = useAppContext();

  const currentType = user?.institution?.type || user?.institutionType;
  const targetType = currentType === "School" ? "Academy" : "School";
  const isSchool = currentType === "School";
  console.log("Sidebar: currentType =", currentType, ", targetType =", targetType, ", isSchool =", isSchool, "userRole =", userRole, "user =", user);

  useEffect(() => {
    const fetchPendingLeaves = async () => {
      try {
        const res = await axios.get(
          `${API_BASE_URL}/leave/lengthOfPendingLeaves`,
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

  const handleSwitchInstitution = async () => {
    if (switching) return;

    const confirmed = window.confirm(
      `Switch to ${targetType}?\n\nAll data will change to the ${targetType} institution.`,
    );
    if (!confirmed) return;

    setSwitching(true);
    try {
      const res = await axios.post(
        `${API_BASE_URL}/admin/switchInstitution`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.data.success) {
     
        localStorage.setItem("token", res.data.token);
         await login(res?.data.token, res?.data.user);
        toast.success(`Switched to ${targetType} successfully`);
           setSwitching(false);
        navigate("/adminPanel");
      } else {
        throw new Error(res.data.message);
      }
    } catch (error) {
      setSwitching(false);
      alert(
        error.response?.data?.message ||
          error.message ||
          "Could not switch institution.",
      );
    }
  };

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

  const menuItems = userRole ? roleList[userRole] || [] : [];

  const toggleMenu = () => setIsOpen((prev) => !prev);
  const closeMenu = () => setIsOpen(false);

  // Institution switch card (admin only), shown at the top of the nav
  const renderSwitchCard = (beforeSwitch) =>
    userRole === "admin" && currentType ? (
      <div className="sb-switch-card">
        <span className="sb-switch-label">Current institution</span>
        <div className="sb-switch-current">
          <span className="sb-switch-dot"></span>
          {currentType}
        </div>
        <button
          type="button"
          className="sb-switch-btn"
          disabled={switching}
          onClick={() => {
            beforeSwitch?.();
            handleSwitchInstitution();
          }}
        >
          <i className="fas fa-right-left"></i>
          Switch to {targetType}
        </button>
      </div>
    ) : null;

  const renderMenuLink = (item, onNavigate) => (
    <Link key={item.title} to={item.to} className="sb-link" onClick={onNavigate}>
      <i className={`fas ${item.icon}`}></i>
      <span className="sb-link-text">{item.title}</span>

      {userRole === "admin" &&
        item.to === "/admin/view-and-approve-leaves" &&
        Number(lengthOfPendingLeaves) > 0 && (
          <span className="sb-pending-badge">{lengthOfPendingLeaves}</span>
        )}
    </Link>
  );

  return (
    <div className="sb-layout">
      <Toaster position="top-right" reverseOrder={false} />
      {switching && (
        <div className="sb-switching-overlay">
          <div className="sb-spinner"></div>
          <p>Switching to {targetType}...</p>
        </div>
      )}

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
            {`Strive Together - ${currentType || "Unknown Institution"}`}
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
          className="mt-4"
        >
          <img src={logo} alt="EC Portal" width={120} />
        </div>
        <div className="sb-header">
          <h1 className="text-dark text-center fw-bold">EC Portal</h1>
          <div style={{ display: "flex", justifyContent: "center" }}>
          </div>
        </div>

        <nav className="sb-nav">
          {renderSwitchCard()}
          {menuItems.map((item) => renderMenuLink(item))}
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
          {renderSwitchCard(closeMenu)}
          {menuItems.map((item) => renderMenuLink(item, closeMenu))}

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