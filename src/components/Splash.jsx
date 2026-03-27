import React from "react";
import "./Splash.css";
import Logo from "../images/logo.png";
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
    <div className="ec-splash-page py-4" style={{ backgroundColor: "#65ffff" }}>
      <div className="container ec-content-wrap">
        <div className="text-center mb-4">
          <img
            src={Logo}
            alt="EC Portal Logo"
            className="img-fluid "
            width={170}
          />
          <h1 className="fw-bold ec-title mt-3 mb-2">WELCOME TO</h1>
          <h5 className="ec-subtitle mb-0">THE EDUCATION'S CRADLE INSTITUTE 
STUDENT PORTAL</h5>
        </div>

        <div className="row g-4 justify-content-center">
          {roles.map((role) => (
            <div className="col-10 col-md-6 col-lg-4" key={role.title}>
              <div className="card ec-role-card h-100" >
                <div className="card-body text-center d-flex flex-column justify-content-center px-4 py-4 py-lg-5">
                  <div
                    className={`ec-icon-wrap mx-auto mb-3 ${role.iconClass}`}
                  >
                    <i className={`fas ${role.icon} fa-2x`}></i>
                  </div>
                  <h4 className="mb-2 fw-semibold ec-role-title">
                    {role.title}
                  </h4>
                  <p className="mb-0 ec-role-text">{role.description}</p>
                </div>

                <div className="card-footer bg-transparent border-0 px-4 pb-4 pt-0">
                  <button
           onClick={() => navigate("/login", { state: { role: role.title } })}
                    className={`btn w-100 ec-login-btn ${role.buttonClass}`}
                  >
                    <i className="fas fa-sign-in-alt me-2"></i>
                    Login as {role.title}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Splash;
