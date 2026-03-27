import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import dp from "../images/logo.png";
import axios from "axios";
import "./Login.css";
import { toast, Toaster } from "react-hot-toast";
import { useLocation } from "react-router-dom";
function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const role = location.state?.role || "Student"; // Default to Student if no role is passed
  const [passwordVisible, setPasswordVisible] = useState(false);

  const togglePassword = () => {
    setPasswordVisible(!passwordVisible);
  };
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [loginType, setLoginType] = useState("student");
  const [Loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    if (role === "Admin" || role === "Teacher") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(email)) {
        toast.error("Invalid email format");
        setLoading(false);
        return;
      }
    }

    if (role === "Admin" || role === "Teacher") {
      if (!email || !password) {
        toast.error("Please fill all the fields");
        setLoading(false);
        return;
      }
      try {
        const res = await axios.post(`https://ec-backend-phi.vercel.app/api/${role.toLowerCase()}/login`, {
          email,
          password,
        });
        if(res.data.success){
          toast.success(`${role} Login successful`);
          localStorage.setItem("token", res.data.token);
          navigate(`/${role.toLowerCase()}Panel`);
          setLoading(false);
        } else {
          setLoading(false);
          toast.error(res.data.message || "Login failed");
        }
      } catch (error) {
        setLoading(false);
        toast.error(error.response.data.message || "Login failed");
      }
    }
  };

  return (
    <div className="login-page">
      <Toaster />
      <div className="container">
        <div className="d-flex justify-content-center align-items-center min-vh-100 py-4">
          <div className="card login-card p-4 p-md-5 text-dark border-0">
            <div className="d-flex justify-content-center mb-2">
              <img
                src={dp}
                alt="EC Portal Logo"
                width="130"
                height="130"
                className="d-inline-block align-text-top"
              />
            </div>

            <div className="text-center mb-4">
              <h1 className="login-title mt-1 mb-2">
                <i
                  style={{ marginRight: "10px" }}
                  className={` fa-solid ${role === "Admin" ? "fa-user-shield" : role === "Teacher" ? "fa-chalkboard-teacher" : "fa-user-graduate"}`}
                ></i>
                Login
              </h1>
              <p className="login-subtitle mb-2">
                Sign in to continue to your dashboard.
              </p>
              <p className="login-note mb-0">
                Use your Identity/roll number and password provided by the
                administration.
              </p>
            </div>

            {role &&
              (role !== "Student" ? (
                <div className="input-group flex-nowrap mb-3">
                  <span className="input-group-text" id="addon-Email">
                    <i
                      className={`fa-solid ${role !== "Student" ? "fa-envelope" : "fa-user-graduate"}`}
                    ></i>
                  </span>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="Eg : abc@gmail.com"
                    aria-label="email"
                    aria-describedby="addon-Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}  
                  />
                </div>
              ) : (
                <div className="input-group flex-nowrap mb-3">
                  <span className="input-group-text" id="addon-Roll Number">
                    <i className="fa-solid fa-user-graduate"></i>
                  </span>
                  <select className="form-select " aria-label="Login Type">
                    <option value="student">ECS</option>
                    <option value="teacher">ECA</option>
                  </select>

                  <input
                    type="number"
                    className="form-control"
                    placeholder="Eg : 10001"
                    aria-label="rollNumber"
                    aria-describedby="addon-Roll Number"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                  />
                </div>
              ))}
            {/* Password Field */}

            <div className="input-group flex-nowrap mb-1">
              <span className="input-group-text" id="addon-password">
                <i className="fa-solid fa-lock"></i>
              </span>
              <input
                type={passwordVisible ? "text" : "password"}
                className="form-control"
                placeholder="Password"
                aria-label="Password"
                aria-describedby="addon-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                className="btn btn-dark"
                type="button"
                onClick={togglePassword}
                tabIndex={-1}
              >
                <i
                  className={`fas ${passwordVisible ? "fa-eye-slash" : "fa-eye"}`}
                ></i>
              </button>
            </div>
            <span className="login-forgot d-flex justify-content-end mb-3">
              Forgot password?
            </span>

            <div className="d-grid">
              {Loading ? (
                <button className="btn btn-dark login-btn" type="button" disabled>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  <span className="visually-hidden">Verifying...</span>
                </button>
              ) : (
                <button className="btn btn-dark login-btn" type="button" onClick={handleLogin}>
                  <i className="fas fa-sign-in-alt me-2"></i>
                  Login
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
