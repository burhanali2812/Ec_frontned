import React, { useState } from "react";
// import { useNavigate, Link } from "react-router-dom";
import dp from "../images/dp.png";
function Navbar() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const bgColor = "rgb(9, 28, 50)";
  const textColor = "#FF9800";

  const toggleDrawer = () => {
    setIsDrawerOpen(!isDrawerOpen);
  };

  return (
    <div>
      {/* Top Navbar */}
      <nav
        className="navbar navbar-dark px-3"
        style={{
          height: "70px",
          backgroundColor: bgColor,
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000, // makes sure it stays above other elements
        }}
      >
        {isDrawerOpen ? (
          ""
        ) : (
          <button
            className="btn"
            type="button"
            onClick={toggleDrawer}
            style={{
              color: bgColor, // orange color for icon/text
              backgroundColor: textColor, // navy background (optional)
              border: "none", // remove border if needed
              padding: "8px 12px", // better spacing
              borderRadius: "8px", // smooth corners
            }}
          >
            <i className="fas fa-bars"></i>
          </button>
        )}

        <span
          className="navbar-brand mb-0 h5 ms-3 fw-bold"
          style={{ color: textColor }}
        >
          Bright Star Grammer School
        </span>
      </nav>

      {/* Sidebar Drawer */}
      <div
        className={`drawer ${isDrawerOpen ? "open" : ""}`}
        style={{
          width: "250px",
          backgroundColor: bgColor,
          position: "fixed",
          top: 0,
          left: 0,
          height: "635px",
          zIndex: 1000,
          marginTop: "80px",
          marginLeft: isDrawerOpen ? "08px" : "",
          borderRadius: "15px", // ✅ rounded corners
          transform: isDrawerOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.7s ease-in-out",
        }}
      >
        {/* Header */}
        <div
          className="drawer-header p-3 d-flex justify-content-between align-items-center"
          style={{ backgroundColor: bgColor, borderRadius: "15px" }}
        >
          <div className="d-flex align-items-center">
            {/* Profile Picture */}
            <div
              style={{
                width: "70px",
                height: "70px",
                borderRadius: "100%",
                overflow: "hidden",
                border: "2px solid #FF9800",
              }}
              className="p-1"
            >
              <img
                src={dp} // Replace with your DP URL
                alt="User DP"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            </div>

            {/* Name & Role to the Right */}
            <div className="ms-3">
              <h6 className="mb-0 fw-bolder" style={{ color: textColor }}>
                Burhan Ali
              </h6>{" "}
              {/* Name */}
              <small className="text-secondary">Student</small> {/* Role */}
            </div>
          </div>

          {isDrawerOpen && (
            <button
              type="button"
              onClick={toggleDrawer}
              className="d-flex align-items-center"
              style={{
                position: "absolute",
                top: "10px",
                right: "10px",
                borderRadius: "20%", // circular
                width: "30px",
                height: "30px",
                justifyContent: "center",
                backgroundColor: textColor, // ✅ navy blue background
                border: "none",
                color: bgColor, // ✅ orange icon color
                cursor: "pointer",
              }}
            >
              <i className="fas fa-angle-left"></i>
            </button>
          )}
        </div>
        <hr
          className="mx-3"
          style={{
            borderTop: "2px solid #FF9800",
            opacity: 1,
            marginTop: "-0px",
            color: "#FF9800",
          }}
        />

        {/* Body */}
        <div className="drawer-body p-0">
          <ul className="list-unstyled m-0 p-0 ">
            <li className="nav-item">
              <a
                href="/signup"
                className="d-flex align-items-center py-3 px-4 text-decoration-none "
                onClick={toggleDrawer}
                style={{ color: textColor }}
              >
                <i className="material-icons me-2">home</i>
                Dashboard
              </a>
            </li>

            <li>
              <a
                href="/students"
                className="d-flex align-items-center py-3 px-4 text-decoration-none"
                style={{ color: textColor }}
              >
                <i className="material-icons me-2">notifications</i>
                Notifications
              </a>
            </li>
            <li>
              <a
                href="/students"
                className="d-flex align-items-center py-3 px-4 text-decoration-none "
                style={{ color: textColor }}
              >
                <i className="material-icons me-2">today</i>
                My Attendance
              </a>
            </li>
            <li>
              <a
                href="/attendance"
                className="d-flex align-items-center py-3 px-4  text-decoration-none "
                style={{ color: textColor }}
              >
                <i className="material-icons me-2">quiz</i>
                My Quizes
              </a>
            </li>
            <li>
              <a
                href="/logout"
                className="d-flex align-items-center py-3 px-4 text-decoration-none "
                style={{ color: textColor }}
              >
                <i className="material-icons me-2">assignment</i>
                My Assignments
              </a>
            </li>
                 <li>
              <a
                href="/logout"
                className="d-flex align-items-center py-3 px-4 text-decoration-none "
                style={{ color: textColor }}
              >
                <i className="material-icons me-2">analytics</i>
                Result Card
              </a>
            </li>
            <li>
              <a
                href="/"
                className="d-flex align-items-center py-3 px-4  text-decoration-none "
                style={{ color: textColor }}
              >
                <i className="material-icons me-2">manage_accounts</i>
                Profile Setting
              </a>
            </li>
            <hr
              className="mx-3"
              style={{
                borderTop: "2px solid #FF9800",
                opacity: 1,
                marginTop: "-0px",
                color: "#FF9800",
              }}
            />
            <li>
              <a
                href="/logout"
                className="d-flex align-items-center py-3 px-4  text-decoration-none"
                style={{ color: textColor }}
              >
                <i className="material-icons me-2">logout</i>
                Log Out
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* Overlay when drawer is open */}
      {isDrawerOpen && (
        <div
          className="overlay"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,

            zIndex: 999,
          }}
          onClick={toggleDrawer}
        />
      )}

      {/* Add some styles */}
      <style>{`
        .drawer {
          box-shadow: 2px 0 5px rgba(0,0,0,0.1);
        }
        .drawer-body a:hover {
          background-color: rgba(255,255,255,0.1);
        }
      `}</style>
    </div>
  );
}

export default Navbar;
