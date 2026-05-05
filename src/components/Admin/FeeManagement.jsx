import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import Sidebar from "../Sidebar";
import TopBar from "../TopBar";
import "./FeeManagement.css";

function FeeManagement() {
  const { studentId } = useParams();
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [courses, setCourses] = useState([]);
  const [aboutCourse, setAboutCourse] = useState([]);
  const [feeHistory, setFeeHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingData, setEditingData] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [searchRollNumber, setSearchRollNumber] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [currentStudentId, setCurrentStudentId] = useState(studentId || null);

  const API_BASE = "https://ec-backend-phi.vercel.app/api";

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };
  console.log("Current Student ID:", currentStudentId);

  useEffect(() => {
    if (currentStudentId) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [currentStudentId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch student details
      const studentRes = await axios.get(
        `${API_BASE}/students/getStudentById/${currentStudentId}`,
        { headers: getAuthHeaders() },
      );

      if (studentRes.data?.success) {
        setStudent(studentRes.data.student);
      }

      // Fetch courses and registration info
      const coursesRes = await axios.get(
        `${API_BASE}/registration/getStudentCourses/${currentStudentId}`,
        { headers: getAuthHeaders() },
      );

      if (coursesRes.data?.success) {
        setCourses(coursesRes.data.courses || []);
        setAboutCourse(coursesRes.data.aboutCourse || []);
      }

      // Fetch fee history
      const feeRes = await axios.get(
        `${API_BASE}/students/getStudentFee/${currentStudentId}?feeFetchType=all`,
        { headers: getAuthHeaders() },
      );

      if (feeRes.data?.success && feeRes.data.fees) {
        setFeeHistory(feeRes.data.fees);
      } else {
        // Generate default fee history if none exists
        generateFeeHistory(coursesRes.data.aboutCourse || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load fee details");
    } finally {
      setLoading(false);
    }
  };

  const generateFeeHistory = (aboutCourse) => {
    const history = [];
    if (aboutCourse.length === 0) return;

    // Get current date
    const today = new Date();

    // Generate monthly entries for the last 12 months
    for (let i = 11; i >= 0; i--) {
      const monthDate = new Date();
      monthDate.setMonth(monthDate.getMonth() - i);

      const monthName = monthDate.toLocaleString("default", {
        month: "long",
        year: "numeric",
      });

      let totalFee = 0;

      aboutCourse.forEach((item) => {
        totalFee += Number(item.courseActualPrice || 0);
      });

      history.push({
        id: `${monthDate.getFullYear()}-${monthDate.getMonth()}`,
        month: monthName,
        date: monthDate,
        actualFee: totalFee,
        discount:
          totalFee -
          Number(
            aboutCourse.reduce(
              (sum, item) => sum + Number(item.courseDiscountedPrice || 0),
              0,
            ) / aboutCourse.length,
          ),
        finalFee: Number(
          aboutCourse.reduce(
            (sum, item) => sum + Number(item.courseDiscountedPrice || 0),
            0,
          ) / aboutCourse.length,
        ),
        amountPaid: 0,
        remainingFee: Number(
          aboutCourse.reduce(
            (sum, item) => sum + Number(item.courseDiscountedPrice || 0),
            0,
          ) / aboutCourse.length,
        ),
        status: "unpaid",
      });
    }

    setFeeHistory(history);
  };

  const calculateTotals = () => {
    let totalFee = 0;
    let paidAmount = 0;
    let remainingAmount = 0;

    feeHistory.forEach((fee) => {
      totalFee += Number(fee.finalFee || fee.actualFee || 0);
      paidAmount += Number(fee.amountPaid || 0);
      remainingAmount += Number(fee.remainingFee || 0);
    });

    return {
      totalFee,
      paidAmount,
      remainingAmount,
      status: calculateStatus(),
    };
  };

  const calculateStatus = () => {
    if (feeHistory.length === 0) return "Unpaid";
    const statuses = feeHistory.map((h) => h.status);
    if (statuses.every((s) => s === "paid")) return "Paid";
    if (statuses.some((s) => s === "paid" || s === "partial")) return "Partial";
    return "Unpaid";
  };

  const handleSearchStudent = async (e) => {
    e.preventDefault();
    if (!searchRollNumber.trim()) {
      toast.error("Please enter a roll number");
      return;
    }

    setSearchLoading(true);
    try {
      const res = await axios.get(
        `${API_BASE}/students/getStudentByRollNumber/${searchRollNumber}`,
        { headers: getAuthHeaders() },
      );

      if (res.data?.success && res.data?.student) {
        setCurrentStudentId(res.data.student._id);
        setSearchRollNumber("");
        toast.success("Student found! Loading fee details...");
      } else {
        toast.error("Student not found");
      }
    } catch (error) {
      console.error("Error searching student:", error);
      toast.error(error.response?.data?.message || "Failed to search student");
    } finally {
      setSearchLoading(false);
    }
  };

  const handleEditFee = (fee) => {
    setEditingData({ ...fee });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    try {
      setIsSaving(true);

      console.log("Sending amount:", editingData.amountPaid);

      const res = await axios.put(
        `${API_BASE}/students/payStudentFee/${editingData._id}`,
        {
          amountPaid: Number(editingData.amountPaid),
        },
        { headers: getAuthHeaders() },
      );

      console.log("API RESPONSE:", res.data);

      if (!res.data.success) {
        throw new Error(res.data.message);
      }

      const updatedFee = res.data.studentFee;

      setFeeHistory((prev) =>
        prev.map((fee) => (fee._id === updatedFee._id ? updatedFee : fee)),
      );

      setShowEditModal(false);

      toast.success("Fee updated successfully! Redirecting...");

      setTimeout(() => {
        localStorage.setItem("voucherStudent", JSON.stringify(student));
        localStorage.setItem("voucherStudentId", student._id);
        localStorage.setItem("feeHistory", JSON.stringify([updatedFee]));

        navigate(
          `/student/fee-voucher?studentId=${student._id}&month=${updatedFee.month}`,
        );
      }, 1000);
    } catch (error) {
      console.error("Error saving fee:", error);
      toast.error(error.message || "Failed to save fee");
    } finally {
      setIsSaving(false);
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

  const totals = calculateTotals();

  // If no studentId, show search form
  if (currentStudentId === ":studentId") {
    return (
      <Sidebar>
        <div className="fm-search-container" style={{ padding: "2rem" }}>
          <div
            className="fm-search-card"
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "0.75rem",
              padding: "2rem",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              maxWidth: "500px",
              margin: "2rem auto",
            }}
          >
            <h3 style={{ marginBottom: "1.5rem", color: "#0f172a" }}>
              Search Student for Fee Management
            </h3>
            <form onSubmit={handleSearchStudent}>
              <div style={{ marginBottom: "1.5rem" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontWeight: "600",
                    color: "#0f172a",
                  }}
                >
                  Student Roll Number
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g., ECS-10001"
                  value={searchRollNumber}
                  onChange={(e) => setSearchRollNumber(e.target.value)}
                  style={{
                    padding: "0.75rem",
                    borderRadius: "0.5rem",
                    border: "1px solid #cbd5e1",
                  }}
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary w-100"
                disabled={searchLoading}
              >
                {searchLoading ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                      aria-hidden="true"
                    ></span>
                    Searching...
                  </>
                ) : (
                  <>
                    <i className="fas fa-search me-2"></i>Search Student
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </Sidebar>
    );
  }

  if (loading) {
    return (
      <Sidebar>
        <div className="text-center py-5">
          <div className="spinner-border text-success" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </Sidebar>
    );
  }

  return (
    <Sidebar>
      <div>
        <div className="fm-header-card">
          <div className="fm-back-btn">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => navigate(-1)}
            >
              <i className="fas fa-arrow-left me-2"></i>Back
            </button>
          </div>

          <h2 className="fm-title">Fee Management</h2>

          {/* Student Details */}
          <div className="fm-student-details" style={{ marginBottom: "2rem" }}>
            <div
              className="fm-detail-card"
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "0.75rem",
                padding: "1.5rem",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              }}
            >
              <h5
                style={{
                  fontSize: "1.1rem",
                  fontWeight: "700",
                  color: "#0f172a",
                  marginBottom: "1.5rem",
                }}
              >
                Student Information
              </h5>
              <div className="row g-3">
                <div className="col-6 col-md-4">
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.3rem",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.8rem",
                        fontWeight: "600",
                        color: "#64748b",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      Name
                    </span>
                    <span
                      style={{
                        fontSize: "0.95rem",
                        fontWeight: "600",
                        color: "#0f172a",
                      }}
                    >
                      {student?.name || "N/A"}
                    </span>
                  </div>
                </div>
                <div className="col-6 col-md-4">
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.3rem",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.8rem",
                        fontWeight: "600",
                        color: "#64748b",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      Roll Number
                    </span>
                    <span
                      style={{
                        fontSize: "0.95rem",
                        fontWeight: "600",
                        color: "#0f172a",
                      }}
                    >
                      {student?.rollNumber || "N/A"}
                    </span>
                  </div>
                </div>
                <div className="col-6 col-md-4">
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.3rem",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.8rem",
                        fontWeight: "600",
                        color: "#64748b",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      Class
                    </span>
                    <span
                      style={{
                        fontSize: "0.95rem",
                        fontWeight: "600",
                        color: "#0f172a",
                      }}
                    >
                      {student?.classInfo || "N/A"}
                    </span>
                  </div>
                </div>
                <div className="col-6 col-md-4">
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.3rem",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.8rem",
                        fontWeight: "600",
                        color: "#64748b",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      Contact
                    </span>
                    <span
                      style={{
                        fontSize: "0.95rem",
                        fontWeight: "600",
                        color: "#0f172a",
                      }}
                    >
                      {student?.contact || "N/A"}
                    </span>
                  </div>
                </div>
                <div className="col-6 col-md-4">
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.3rem",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.8rem",
                        fontWeight: "600",
                        color: "#64748b",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      Father Name
                    </span>
                    <span
                      style={{
                        fontSize: "0.95rem",
                        fontWeight: "600",
                        color: "#0f172a",
                      }}
                    >
                      {student?.fatherName || "N/A"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fee History Table */}
        <div className="fm-table-card">
          <div className="table-responsive">
            <table className="table table-hover fm-fee-table">
              <thead className="fm-table-head">
                <tr>
                  <th>#</th>
                  <th>Month</th>
                  <th>Total Fee</th>
                  <th>Paid Amount</th>
                  <th>Remaining</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {feeHistory.length > 0 ? (
                  feeHistory.map((fee, idx) => (
                    <tr key={fee._id || idx}>
                      <td>{idx + 1}</td>
                      <td>
                        <strong>
                          {fee.month
                            ? (() => {
                                // Check if format is YYYY-MM (e.g., "2026-04")
                                const monthMatch =
                                  fee.month.match(/^(\d{4})-(\d{2})$/);
                                if (monthMatch) {
                                  const year = monthMatch[1];
                                  const monthNum = parseInt(monthMatch[2], 10);
                                  const date = new Date(year, monthNum - 1, 1);
                                  return date.toLocaleString("default", {
                                    month: "long",
                                    year: "numeric",
                                  });
                                }
                                // Return as-is if already formatted
                                return fee.month;
                              })()
                            : "N/A"}
                        </strong>
                      </td>
                      <td>
                        PKR{" "}
                        {(fee.finalFee || fee.actualFee || 0).toLocaleString()}
                      </td>
                      <td>PKR {(fee.amountPaid || 0).toLocaleString()}</td>
                      <td>PKR {(fee.remainingFee || 0).toLocaleString()}</td>
                      <td>
                        {fee.dueDate
                          ? new Date(fee.dueDate).toLocaleDateString()
                          : "N/A"}
                      </td>
                      <td>
                        <span
                          className={`fm-status-badge fm-status-${(fee.status || "unpaid").toLowerCase()}`}
                        >
                          {fee.status
                            ? fee.status.charAt(0).toUpperCase() +
                              fee.status.slice(1)
                            : "Unpaid"}
                        </span>
                      </td>
                      <td>
                        <div
                          className="fm-row-actions"
                          style={{ display: "flex", gap: "0.5rem" }}
                        >
                          <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            onClick={() => handleViewMonthVoucher(fee)}
                            title="View Fee Voucher"
                          >
                            <i className="fas fa-receipt"></i>
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            onClick={() => handleEditFee(fee)}
                            title="Edit Fee"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="text-center text-muted py-3">
                      No fee records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit Fee Modal */}
      <div
        className={`modal fade ${showEditModal ? "show" : ""}`}
        id="editFeeModal"
        tabIndex="-1"
        aria-hidden={!showEditModal}
        style={{ display: showEditModal ? "block" : "none" }}
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Edit Fee - {editingData.month}</h5>
              <button
                type="button"
                className="btn-close"
                onClick={() => setShowEditModal(false)}
              ></button>
            </div>
            <div className="modal-body">
              <div className="fm-edit-form">
                <div className="fm-form-group">
                  <label className="fm-form-label">Total Fee</label>
                  <input
                    type="number"
                    className="form-control"
                    value={editingData.finalFee || editingData.actualFee || 0}
                    onChange={(e) => {
                      const totalFee = Number(e.target.value);
                      const paid = editingData.amountPaid || 0;
                      const remaining = totalFee - paid;

                      // Auto-calculate status based on amounts
                      let autoStatus = "unpaid";
                      if (paid === 0) {
                        autoStatus = "unpaid";
                      } else if (remaining <= 0) {
                        autoStatus = "paid";
                      } else if (paid > 0 && remaining > 0) {
                        autoStatus = "partial";
                      }

                      setEditingData({
                        ...editingData,
                        finalFee: totalFee,
                        remainingFee: remaining > 0 ? remaining : 0,
                        status: autoStatus,
                      });
                    }}
                  />
                </div>

                <div className="fm-form-group">
                  <label className="fm-form-label">Amount Paid</label>
                  <input
                    type="number"
                    className="form-control"
                    value={editingData.amountPaid || 0}
                    onChange={(e) => {
                      const paid = Number(e.target.value);
                      const finalFee =
                        editingData.finalFee || editingData.actualFee;
                      const remaining = finalFee - paid;

                      // Auto-calculate status based on amounts
                      let autoStatus = "unpaid";
                      if (paid === 0) {
                        autoStatus = "unpaid";
                      } else if (remaining <= 0) {
                        autoStatus = "paid";
                      } else if (paid > 0 && remaining > 0) {
                        autoStatus = "partial";
                      }

                      setEditingData({
                        ...editingData,
                        amountPaid: paid,
                        remainingFee: remaining > 0 ? remaining : 0,
                        status: autoStatus,
                      });
                    }}
                  />
                </div>

                <div className="fm-form-group">
                  <label className="fm-form-label">Remaining Fee</label>
                  <input
                    type="number"
                    className="form-control"
                    value={editingData.remainingFee || 0}
                    readOnly
                    disabled
                  />
                </div>

                <div className="fm-form-group">
                  <label className="fm-form-label">Status</label>
                  <select
                    className="form-select"
                    value={editingData.status || "unpaid"}
                    onChange={(e) => {
                      const selectedStatus = e.target.value;
                      const finalFee =
                        editingData.finalFee || editingData.actualFee || 0;

                      // Auto-fill amounts based on selected status
                      if (selectedStatus === "paid") {
                        setEditingData({
                          ...editingData,
                          status: selectedStatus,
                          amountPaid: finalFee,
                          remainingFee: 0,
                        });
                      } else if (selectedStatus === "unpaid") {
                        setEditingData({
                          ...editingData,
                          status: selectedStatus,
                          amountPaid: 0,
                          remainingFee: finalFee,
                        });
                      } else {
                        // For partial, just update status
                        setEditingData({
                          ...editingData,
                          status: selectedStatus,
                        });
                      }
                    }}
                  >
                    <option value="paid">Paid</option>
                    <option value="partial">Partial</option>
                    <option value="unpaid">Unpaid</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowEditModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveEdit}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                      aria-hidden="true"
                    ></span>
                    Saving...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save me-2"></i>Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Backdrop */}
      {showEditModal && <div className="modal-backdrop fade show"></div>}
    </Sidebar>
  );
}

export default FeeManagement;
