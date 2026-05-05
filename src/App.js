import "./App.css";
import { useState } from "react";

import Home from "./components/Home";
import Login from "./components/Login";
import Signup from "./components/Signup";
import AdminPanel from "./components/Admin/AdminPanel";
import TeacherPanel from "./components/Teacher/TeacherPanel";
import { Routes, Route, Navigate } from "react-router-dom";
import TeacherManage from "./components/Admin/TeacherManage";
import CourseManage from "./components/Admin/CourseManage";
import StudentManage from "./components/Admin/StudentManage";
import StudentRegister from "./components/Admin/StudentRegister";
import FeeManagement from "./components/Admin/FeeManagement";
import Attandance from "./components/Teacher/Attandance";
import ViewAttandance from "./components/Teacher/ViewAttandance";
import UploadResult from "./components/Teacher/UploadResult";
import StudentDashboard from "./components/Student/StudentDashboard";
import ComingSoon from "./components/ComingSoon";
import ApplyLeave from "./components/Teacher/ApplyLeave";
import OverAllAttandanceStd from "./components/Student/OverAllAttandanceStd";
import OverAllResult from "./components/Student/OverAllResult";
import Voucher from "./components/Student/Voucher";
import ViewTimeTable from "./components/Student/ViewTimeTable";
import ViewAndApproveLeaves from "./components/Admin/ViewAndApproveLeaves";
import TimeTableManage from "./components/Admin/TimeTableManage";
import ViewFeeStatuses from "./components/Student/ViewFeeStatuses";
import AttendanceControl from "./components/Admin/AttandanceControl";
import PasswordReset from "./components/PasswordReset";
import Footer from "./components/footer";

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
      <Route path="/teacher/dashboard" element={<TeacherPanel />} />
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

      <Route path="/password-reset" element={<PasswordReset />} />
      <Route path="/fee-management/:studentId" element={<FeeManagement />} />
      <Route path="/teacher/attendance" element={<Attandance />} />
      <Route path="/teacher/view-attendance" element={<ViewAttandance />} />
      <Route path="/teacher/upload-result" element={<UploadResult />} />
      <Route path="/student/dashboard" element={<StudentDashboard />} />
      <Route
        path="/student/attendance-overview"
        element={<OverAllAttandanceStd />}
      />
      <Route path="/student/result-overview" element={<OverAllResult />} />

      <Route path="/student/viewFeeStatuses" element={<ViewFeeStatuses />} />
      <Route path="/student/fee-voucher" element={<Voucher />} />
      <Route path="/student/timetable" element={<ViewTimeTable />} />
      <Route path="/teacher/timetable" element={<ViewTimeTable />} />
      <Route path="/apply-leave" element={<ApplyLeave />} />
      <Route
        path="/admin/view-and-approve-leaves"
        element={<ViewAndApproveLeaves />}
      />
      <Route
        path="/admin/timetable-manage"
        element={<TimeTableManage adminLoginType={adminLoginType} />}
      />
      <Route path="/admin/attendance-control" element={<AttendanceControl />} />
      <Route path="/coming-soon" element={<ComingSoon />} />
      <Route path="/footer" element={<Footer />} />

      {/* Optional: Redirect unknown routes */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;
