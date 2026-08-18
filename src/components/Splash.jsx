import React from "react";
import "./Splash.css";
import Logo from "../images/logo.png";
import Footer from "./footer";
import { useNavigate } from "react-router-dom";
function Splash() {
  const navigate = useNavigate();
  const roles = [
    {
      title: "Admin",
      icon: "fa-user-shield",
      description: "Manage users, courses, and platform settings",
      buttonClass: "ec-btn-admin",
      iconClass: "ec-icon-admin",
    },
    {
      title: "Teacher",
      icon: "fa-chalkboard-teacher",
      description: "Track attendance, quizzes, and student progress",
      buttonClass: "ec-btn-teacher",
      iconClass: "ec-icon-teacher",
    },
    {
      title: "Student",
      icon: "fa-user-graduate",
      description: "Access classes, assignments, and announcements",
      buttonClass: "ec-btn-student",
      iconClass: "ec-icon-student",
    },
  ];

  return (
    <div className="ec-splash-shell">
      <main className="ec-splash-page">
        <div className="container ec-content-wrap">
          <div className="text-center ec-head-wrap">
            <img
              src={Logo}
              alt="EC Portal Logo"
              className="img-fluid"
              width={200}
            />
            <h1 className="fw-bold ec-title mt-2 mb-1">WELCOME TO</h1>
            <h5 className="ec-subtitle mb-0 font">
              THE EDUCATION'S CRADLE INSTITUTE STUDENT PORTAL
            </h5>
          </div>

          <div className="ec-role-grid">
            {roles.map((role) => (
              <div
                key={role.title}
                className="ec-role-card"
                onClick={() =>
                  navigate("/login", { state: { role: role.title } })
                }
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate("/login", { state: { role: role.title } });
                  }
                }}
              >
                <div className="ec-card-icon">
                  <div className={`ec-icon-wrap ${role.iconClass}`}>
                    <i className={`fas ${role.icon}`}></i>
                  </div>
                </div>
                <div className="ec-card-content">
                  <h5 className="ec-card-title">{role.title}</h5>
                  <p className="ec-card-description">{role.description}</p>
                </div>
                <div className="ec-card-action">
                  <i className="fas fa-arrow-right"></i>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <div className="ec-splash-footer">
        <Footer />
      </div>
    </div>
  );
}

export default Splash;
