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
              width={132}
            />
            <h1 className="fw-bold ec-title mt-2 mb-1">WELCOME TO</h1>
            <h5 className="ec-subtitle mb-0">
              THE EDUCATION'S CRADLE INSTITUTE STUDENT PORTAL
            </h5>
          </div>

          <div className="ec-role-grid">
            {roles.map((role) => (
              <div className="ec-role-col" key={role.title}>
                <div className="card ec-role-card h-100">
                  <div className="card-body text-center d-flex flex-column justify-content-center px-2 py-2 py-lg-4">
                    <div
                      className={`ec-icon-wrap mx-auto mb-2 ${role.iconClass}`}
                    >
                      <i className={`fas ${role.icon}`}></i>
                    </div>
                    <h5 className="mb-1 fw-semibold ec-role-title">
                      {role.title}
                    </h5>
                    <p className="mb-0 ec-role-text">{role.description}</p>
                  </div>

                  <div className="card-footer bg-transparent border-0 px-2 pb-2 pt-0">
                    <button
                      onClick={() =>
                        navigate("/login", { state: { role: role.title } })
                      }
                      className={`btn w-100 ec-login-btn ${role.buttonClass}`}
                    >
                      Login as {role.title}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="ec-splash-footer">
          <Footer />
        </div>
      </main>
    </div>
  );
}

export default Splash;
