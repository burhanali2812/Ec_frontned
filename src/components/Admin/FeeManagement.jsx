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

  const API_BASE = "https://ec-backend-phi.vercel.app/api";

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    fetchData();
  }, [studentId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch student details
      const studentRes = await axios.get(
        `${API_BASE}/students/getStudentById/${studentId}`,
        { headers: getAuthHeaders() },
      );

      if (studentRes.data?.success) {
        setStudent(studentRes.data.student);
      }

      // Fetch courses and registration info
      const coursesRes = await axios.get(
        `${API_BASE}/registration/getStudentCourses/${studentId}`,
        { headers: getAuthHeaders() },
      );

      if (coursesRes.data?.success) {
        setCourses(coursesRes.data.courses || []);
        setAboutCourse(coursesRes.data.aboutCourse || []);
      }

      // Fetch fee history
      const feeRes = await axios.get(
        `${API_BASE}/students/getStudentFee/${studentId}`,
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

  const handleEditFee = (fee) => {
    setEditingData({ ...fee });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    try {
      setIsSaving(true);

      // Update fee in backend
      if (editingData._id) {
        await axios.put(
          `${API_BASE}/students/payStudentFee/${editingData._id}`,
          {
            amountPaid: editingData.amountPaid,
          },
          { headers: getAuthHeaders() },
        );
      }

      // Update local state
      const updatedHistory = feeHistory.map((fee) =>
        fee._id === editingData._id ? editingData : fee,
      );
      setFeeHistory(updatedHistory);
      setShowEditModal(false);

      toast.success("Fee updated successfully! Redirecting to voucher...");

      // Store updated fee history and navigate to voucher
      setTimeout(() => {
        localStorage.setItem("voucherStudent", JSON.stringify(student));
        localStorage.setItem("voucherStudentId", student._id);
        localStorage.setItem("feeHistory", JSON.stringify(updatedHistory));
        navigate(`/student/fee-voucher?studentId=${student._id}`);
      }, 1000);
    } catch (error) {
      console.error("Error saving fee:", error);
      toast.error("Failed to save fee");
    } finally {
      setIsSaving(false);
    }
  };

  const handleViewVoucher = () => {
    if (!student) {
      toast.error("Student data not loaded");
      return;
    }
    localStorage.setItem("voucherStudent", JSON.stringify(student));
    localStorage.setItem("voucherStudentId", student._id);
    localStorage.setItem("feeHistory", JSON.stringify(feeHistory));
    navigate(`/student/fee-voucher?studentId=${student._id}`);
  };

  const totals = calculateTotals();

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
          <div className="fm-student-details">
            <div className="fm-detail-card">
              <h5>Student Information</h5>
              <div className="fm-detail-grid">
                <div className="fm-detail-item">
                  <span className="fm-label">Name:</span>
                  <span className="fm-value">{student?.name || "N/A"}</span>
                </div>
                <div className="fm-detail-item">
                  <span className="fm-label">Roll Number:</span>
                  <span className="fm-value">
                    {student?.rollNumber || "N/A"}
                  </span>
                </div>
                <div className="fm-detail-item">
                  <span className="fm-label">Email:</span>
                  <span className="fm-value">{student?.email || "N/A"}</span>
                </div>
                <div className="fm-detail-item">
                  <span className="fm-label">Contact:</span>
                  <span className="fm-value">{student?.contact || "N/A"}</span>
                </div>
                <div className="fm-detail-item">
                  <span className="fm-label">Class:</span>
                  <span className="fm-value">
                    {student?.classInfo || "N/A"}
                  </span>
                </div>
                <div className="fm-detail-item">
                  <span className="fm-label">Father Name:</span>
                  <span className="fm-value">
                    {student?.fatherName || "N/A"}
                  </span>
                </div>
              </div>
            </div>

            {/* Fee Summary */}
            <div className="fm-summary-card">
              <h5>Fee Summary</h5>
              <div className="fm-summary-grid">
                <div className="fm-summary-item">
                  <span className="fm-summary-label">Total Fee</span>
                  <span className="fm-summary-value">
                    PKR {totals.totalFee.toLocaleString()}
                  </span>
                </div>
                <div className="fm-summary-item">
                  <span className="fm-summary-label">Paid Amount</span>
                  <span className="fm-summary-value paid">
                    PKR {totals.paidAmount.toLocaleString()}
                  </span>
                </div>
                <div className="fm-summary-item">
                  <span className="fm-summary-label">Remaining</span>
                  <span className="fm-summary-value pending">
                    PKR {totals.remainingAmount.toLocaleString()}
                  </span>
                </div>
                <div className="fm-summary-item">
                  <span className="fm-summary-label">Status</span>
                  <span
                    className={`fm-status-badge fm-status-${totals.status.toLowerCase()}`}
                  >
                    {totals.status}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fee History Table */}
        <div className="fm-table-card">
          <div className="fm-table-header">
            <h5 className="mb-0">Monthly Fee History</h5>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={handleViewVoucher}
            >
              <i className="fas fa-receipt me-2"></i>View Voucher
            </button>
          </div>

          <div className="table-responsive">
            <table className="table table-hover fm-fee-table">
              <thead className="fm-table-head">
                <tr>
                  <th>#</th>
                  <th>Month</th>
                  <th>Total Fee</th>
                  <th>Paid Amount</th>
                  <th>Remaining</th>
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
                        <strong>{fee.month || "N/A"}</strong>
                      </td>
                      <td>
                        `PKR 
                        {(fee.finalFee || fee.actualFee || 0).toLocaleString()}`
                      </td>
                      <td>`PKR{(fee.amountPaid || 0).toLocaleString()}`</td>
                      <td>`PKR{(fee.remainingFee || 0).toLocaleString()}`</td>
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
                        <div className="fm-row-actions">
                          <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            onClick={() => handleEditFee(fee)}
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="text-center text-muted py-3">
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
                      const finalFee = editingData.finalFee || editingData.actualFee || 0;
                      
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
