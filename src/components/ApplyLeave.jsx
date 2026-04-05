import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Toaster, toast } from "react-hot-toast";
import Sidebar from "./Sidebar";
import "./ApplyLeave.css";

function ApplyLeave() {
  const API_BASE = "https://ec-backend-phi.vercel.app/api";

  const [profile, setProfile] = useState({ name: "", email: "" });
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState([]);

  const [formData, setFormData] = useState({
    fromDate: "",
    toDate: "",
    reason: "",
  });

  const token = localStorage.getItem("token");

  const authHeaders = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : {}),
    [token],
  );

  const userPayload = useMemo(() => {
    try {
      return token ? JSON.parse(atob(token.split(".")[1])) : null;
    } catch {
      return null;
    }
  }, [token]);

  const userRole = (userPayload?.role || "").toLowerCase();
  const isTeacher = userRole === "teacher";
  const isStudent = userRole === "student";

  const getErrorMessage = (error, fallback) => {
    const msg = error?.response?.data?.message;
    if (msg && msg !== "Server error") return msg;
    if ([401, 403].includes(error?.response?.status)) {
      return "You are not authorized. Please login again.";
    }
    return fallback;
  };

  const fetchProfile = async () => {
    if (!isTeacher && !isStudent) return;

    setLoadingProfile(true);
    try {
      const endpoint = isTeacher ? "/teacher/profile" : "/students/myProfile";
      const res = await axios.get(`${API_BASE}${endpoint}`, {
        headers: authHeaders,
      });

      const source = isTeacher ? res.data?.teacher : res.data?.student;
      setProfile({
        name: source?.name || "",
        email: source?.email || "",
      });
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to load profile."));
    } finally {
      setLoadingProfile(false);
    }
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await axios.get(`${API_BASE}/leave/viewAppliedLeaveApplications/${userRole}/${profile?.email}`, {
        headers: authHeaders,
      });

      const rows = Array.isArray(res.data?.leaveApplications)
        ? res.data.leaveApplications
        : [];
      setHistory(rows);
    } catch {
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchHistory();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.fromDate || !formData.toDate || !formData.reason.trim()) {
      toast.error("Please fill all required fields.");
      return;
    }

    if (formData.fromDate > formData.toDate) {
      toast.error("From date cannot be after To date.");
      return;
    }

    if (!profile.name || !profile.email) {
      toast.error("Profile not loaded yet. Please wait.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        applicantRole: isTeacher ? "Teacher" : "Student",
        applicantId: userPayload?.id,
        name: profile.name,
        email: profile.email,
        reason: formData.reason.trim(),
        fromDate: formData.fromDate,
        toDate: formData.toDate,
      };

      const res = await axios.post(`${API_BASE}/leave/applyLeave`, payload, {
        headers: authHeaders,
      });

      if (res.data?.success) {
        toast.success(res.data?.message || "Leave request submitted.");
        setFormData({ fromDate: "", toDate: "", reason: "" });
        fetchHistory();
      } else {
        toast.error(res.data?.message || "Failed to submit leave request.");
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to submit leave request."));
    } finally {
      setSubmitting(false);
    }
  };

  if (!isTeacher && !isStudent) {
    return (
      <Sidebar>
        <div className="container py-4">
          <div className="alert alert-warning mb-0">
            Leave application is available only for students and teachers.
          </div>
        </div>
      </Sidebar>
    );
  }

  return (
    <Sidebar>
      <Toaster position="top-right" />

      <div className="apply-leave-page mt-3 mt-lg-4">
        <div className="container-fluid px-0 px-lg-2">
          <div className="apply-leave-hero mb-4">
            <p className="mb-1 text-white-50 fw-semibold">Leave Management</p>
            <h3 className="mb-1">Apply for Leave</h3>
            <p className="mb-0 text-white-75">
              Submit your leave request with dates and reason.
            </p>
          </div>

          <div className="row g-4">
            <div className="col-12 col-lg-5">
              <div className="leave-card p-3 p-md-4">
                <h5 className="mb-3">New Leave Request</h5>

                {loadingProfile ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-success" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                      <label className="form-label">Name</label>
                      <input
                        type="text"
                        className="form-control"
                        value={profile.name || ""}
                        readOnly
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label">Email</label>
                      <input
                        type="email"
                        className="form-control"
                        value={profile.email || ""}
                        readOnly
                      />
                    </div>

                    <div className="row g-3">
                      <div className="col-12 col-md-6">
                        <label className="form-label">From Date</label>
                        <input
                          type="date"
                          name="fromDate"
                          className="form-control"
                          value={formData.fromDate}
                          onChange={handleChange}
                          required
                        />
                      </div>

                      <div className="col-12 col-md-6">
                        <label className="form-label">To Date</label>
                        <input
                          type="date"
                          name="toDate"
                          className="form-control"
                          value={formData.toDate}
                          onChange={handleChange}
                          required
                        />
                      </div>
                    </div>

                    <div className="mt-3 mb-3">
                      <label className="form-label">Reason</label>
                      <textarea
                        name="reason"
                        className="form-control"
                        rows="4"
                        placeholder="Write your leave reason"
                        value={formData.reason}
                        onChange={handleChange}
                        required
                      ></textarea>
                    </div>

                    <button
                      type="submit"
                      className="btn btn-success w-100"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <span
                            className="spinner-border spinner-border-sm me-2"
                            role="status"
                            aria-hidden="true"
                          ></span>
                          Submitting...
                        </>
                      ) : (
                        "Submit Leave Request"
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>

            <div className="col-12 col-lg-7">
              <div className="leave-card p-3 p-md-4">
                <h5 className="mb-3">Recent Leave Applications</h5>

                {loadingHistory ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-success" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                ) : history.length === 0 ? (
                  <div className="alert alert-info mb-0">
                    No leave applications found.
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table leave-history-table align-middle mb-0">
                      <thead>
                        <tr>
                          <th>Applicant</th>
                          <th>From</th>
                          <th>To</th>
                          <th>Status</th>
                          <th>Applied</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.slice(0, 20).map((item) => (
                          <tr key={item._id}>
                            <td>{item.applicant || "-"}</td>
                            <td>{item.fromDate || "-"}</td>
                            <td>{item.toDate || "-"}</td>
                            <td>
                              <span
                                className={`badge status-badge ${
                                  item.status === "Approved"
                                    ? "approved"
                                    : item.status === "Rejected"
                                      ? "rejected"
                                      : "pending"
                                }`}
                              >
                                {item.status || "Pending"}
                              </span>
                            </td>
                            <td>
                              {item.appliedAt
                                ? new Date(item.appliedAt).toLocaleDateString()
                                : "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Sidebar>
  );
}

export default ApplyLeave;
