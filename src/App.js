import "./App.css";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Home from "./components/Home";
import Login from "./components/Login";
import Signup from "./components/Signup";
import AdminPanel from "./components/AdminPanel";
import TeacherPanel from "./components/TeacherPanel";
import { Routes, Route, Navigate } from "react-router-dom";
import TeacherManage from "./components/TeacherManage";
import CourseManage from "./components/CourseManage";
import StudentManage from "./components/StudentManage";
import StudentRegister from "./components/StudentRegister";

function App() {
  const token = localStorage.getItem("token");
  const [adminLoginType, setAdminLoginType] = useState("academy");
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/login" element={<Login />} />
      <Route path="/adminPanel" element={<AdminPanel />} />
      <Route path="/teacherPanel" element={<TeacherPanel />} />
      <Route
        path="/teacherManage"
        element={<TeacherManage adminLoginType={adminLoginType} />}
      />
      <Route
        path="/courseManage"
        element={<CourseManage adminLoginType={adminLoginType} />}
      />
      <Route
        path="/studentManage"
        element={<StudentManage adminLoginType={adminLoginType} />}
      />
      <Route
        path="/student-register/:studentId"
        element={<StudentRegister adminLoginType={adminLoginType} />}
      />
      <Route
        path="/student-register"
        element={<StudentRegister adminLoginType={adminLoginType} />}
      />

      {/* Optional: Redirect unknown routes */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;
