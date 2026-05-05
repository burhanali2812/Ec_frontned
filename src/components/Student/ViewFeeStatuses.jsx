import React, { useEffect, useState } from "react";
import axios from "axios";
import { Toaster, toast } from "react-hot-toast";
import Sidebar from "../Sidebar";
import { useNavigate } from "react-router-dom";
import "./ViewFeeStatuses.css";

function ViewFeeStatuses() {
  const [fees, setFees] = useState([]);
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterMonth, setFilterMonth] = useState("");
  const navigate = useNavigate();

  const API_BASE = "https://ec-backend-phi.vercel.app/api";


  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const getErrorMessage = (error, fallback) => {
    const backendMessage = error?.response?.data?.message;
    if (backendMessage && backendMessage !== "Server error") {
      return backendMessage;
    }
    if (error?.response?.status === 401 || error?.response?.status === 403) {
      return "You are not authorized. Please login again.";
    }
    return fallback;
  };

  const fetchStudentData = async () => {
    try {
      const res = await axios.get(`${API_BASE}/students/myProfile`, {
        headers: getAuthHeaders(),
      });
      if (res.data?.success) {
        setStudent(res.data.student);
        return res.data.student._id;
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to load student profile"));
    }
  };

  const fetchFees = async (studentId) => {
    setLoading(true);
    try {
      const res = await axios.get(
        `${API_BASE}/students/getStudentFee/${studentId}?feeFetchType=all`,
        {
          headers: getAuthHeaders(),
        },
      );
      if (res.data?.success) {
        setFees(res.data.fees || []);
      } else {
        toast.error(res.data?.message || "Failed to load fees");
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to load fees"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      const studentId = await fetchStudentData();
      if (studentId) {
        fetchFees(studentId);
      }
    };
    initializeData();
  }, []);

  const filteredFees = fees.filter((fee) => {
    const matchesStatus = filterStatus === "all" || fee.status === filterStatus;
    const matchesMonth = !filterMonth || fee.month === filterMonth;
    return matchesStatus && matchesMonth;
  });

  const uniqueMonths = [...new Set(fees.map((fee) => fee.month))]
    .sort()
    .reverse();

  const monthToReadable = (monthString) => {
    if (!monthString) return "";
    const [year, month] = monthString.split("-");
    const date = new Date(`${year}-${month}-01`);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
    });
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "paid":
        return "badge-success";
      case "unpaid":
        return "badge-danger";
      case "partial":
        return "badge-warning";
      default:
        return "badge-secondary";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "paid":
        return "fas fa-check-circle";
      case "unpaid":
        return "fas fa-times-circle";
      case "partial":
        return "fas fa-minus-circle";
      default:
        return "fas fa-circle";
    }
  };
    const handleViewMonthVoucher = (fee) => {
      if (!student) {
        toast.error("Student data not loaded");
        return;
      }
      // Store only the current month's fee as an array
      const monthFeeArray = [fee];
      localStorage.setItem("voucherStudent", JSON.stringify(student));
      localStorage.setItem("voucherStudentId", student._id);
      localStorage.setItem("feeHistory", JSON.stringify(monthFeeArray));
      navigate(
        `/student/fee-voucher?studentId=${student._id}&month=${fee.month}`,
      );
    };

  return (
    <Sidebar>
      <Toaster position="top-right" />

      <div className="view-fee-statuses">
        <div className=" px-lg-3 py-3">
          {/* Header */}
          <div className="vfs-header mb-4">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-start gap-2">
              <div>
                <h3 className="vfs-title mb-1">Fee Status</h3>
                <p className="vfs-subtitle mb-0">
                  View and manage your fee payments
                </p>
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => window.history.back()}
              >
                <i className="fas fa-arrow-left me-2"></i>Back
              </button>
            </div>
          </div>

          {/* Student Info Card */}
          {student && (
            <div className="vfs-student-info-card mb-4">
              <div className="row g-3">
                <div className="col-12 col-sm-6">
                  <div className="info-item">
                    <span className="info-label">
                      <i className="fas fa-user me-2"></i>Student Name
                    </span>
                    <span className="info-value">{student.name}</span>
                  </div>
                </div>
                <div className="col-12 col-sm-6">
                  <div className="info-item">
                    <span className="info-label">
                      <i className="fas fa-id-badge me-2"></i>Roll Number
                    </span>
                    <span className="info-value">
                      {student.rollNumber || "-"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="vfs-filters-card mb-3">
            <div className="row g-2">
              <div className="col-12 col-md-6">
                <label className="form-label fw-semibold">
                  Filter by Status
                </label>
                <select
                  className="form-select form-select-sm"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="paid">Paid</option>
                  <option value="unpaid">Unpaid</option>
                  <option value="partial">Partial</option>
                </select>
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label fw-semibold">
                  Filter by Month
                </label>
                <select
                  className="form-select form-select-sm"
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                >
                  <option value="">All Months</option>
                  {uniqueMonths.map((month) => (
                    <option key={month} value={month}>
                      {monthToReadable(month)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-12">
                <button
                  className="btn btn-outline-secondary btn-sm w-100"
                  onClick={() => {
                    setFilterStatus("all");
                    setFilterMonth("");
                  }}
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>

          {/* Fees Cards */}
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : filteredFees.length === 0 ? (
            <div className="alert alert-info text-center py-5">
              <i className="fas fa-info-circle me-2"></i>
              {fees.length === 0
                ? "No fees records found"
                : "No fees match your filters"}
            </div>
          ) : (
            <div className="row g-3">
              {filteredFees.map((fee) => (
                <div key={fee._id} className="col-12 col-md-6 col-lg-4">
                  <div className="vfs-fee-card">
                    {/* Card Header */}
                    <div className="vfs-fee-header">
                      <div className="vfs-month-badge">
                        {monthToReadable(fee.month)}
                      </div>
                      <div
                        className={`badge ${getStatusBadgeClass(fee.status)}`}
                      >
                        <i className={`${getStatusIcon(fee.status)} me-1`}></i>
                        {fee.status.charAt(0).toUpperCase() +
                          fee.status.slice(1)}
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="vfs-fee-body">
                      {/* Amount Details */}
                      <div className="vfs-amount-group mb-3">
                        <div className="amount-row">
                          <span className="amount-label">Total Amount</span>
                          <span className="amount-value">
                            Rs. {fee.finalFee}
                          </span>
                        </div>

                        {fee.status === "partial" && (
                          <>
                            <div className="amount-row">
                              <span className="amount-label">Paid Amount</span>
                              <span className="amount-value text-success">
                                Rs. {fee.amountPaid}
                              </span>
                            </div>
                            <div className="amount-row">
                              <span className="amount-label">Remaining</span>
                              <span className="amount-value text-danger">
                                Rs. {fee.remainingFee}
                              </span>
                            </div>
                          </>
                        )}

                        {fee.discount > 0 && (
                          <div className="amount-row">
                            <span className="amount-label">Discount</span>
                            <span className="amount-value text-info">
                              Rs. {fee.discount}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Divider */}
                      <div className="vfs-divider"></div>

                      {/* Fee Details */}
                      <div className="vfs-details-group">
                        {fee.dueDate && (
                          <div className="detail-row">
                            <span className="detail-label">
                              <i className="fas fa-calendar me-1"></i>Due Date
                            </span>
                            <span className="detail-value">
                              {new Date(fee.dueDate).toLocaleDateString(
                                "en-GB",
                              )}
                            </span>
                          </div>
                        )}

                        {fee.status === "paid" && fee.updatedAt && (
                          <div className="detail-row">
                            <span className="detail-label">
                              <i className="fas fa-check me-1"></i>Paid On
                            </span>
                            <span className="detail-value">
                              {new Date(fee.updatedAt).toLocaleDateString(
                                "en-GB",
                              )}
                            </span>
                          </div>
                        )}

                        {fee.isProrated && (
                          <div className="detail-row proration-note">
                            <span className="detail-label">
                              <i className="fas fa-info-circle me-1"></i>
                              Prorated Fee
                            </span>
                            <span className="detail-value">
                              {fee.proratedDays} days
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="vfs-fee-footer">
                      <button
                        className="btn btn-sm btn-outline-primary w-100"
                        onClick={() => {
                          handleViewMonthVoucher(fee);
                        }}
                      >
                        <i className="fas fa-receipt me-1"></i>View Voucher
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Sidebar>
  );
}

export default ViewFeeStatuses;
