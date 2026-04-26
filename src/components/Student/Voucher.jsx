import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import logo from "../../images/logo.png";
import "./Voucher.css";

function Voucher() {
  const [searchParams] = useSearchParams();
  const [student, setStudent] = useState(null);
  const [courses, setCourses] = useState([]);
  const [aboutCourse, setAboutCourse] = useState([]);
  const [feeHistory, setFeeHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);
  const voucherRef = useRef(null);

  const API_BASE = "https://ec-backend-phi.vercel.app/api";
  const studentIdFromParams = searchParams.get("studentId");

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // First check if student data exists in localStorage (from admin registration)
        const storedStudent = localStorage.getItem("voucherStudent");
        const storedStudentId =
          localStorage.getItem("voucherStudentId") || studentIdFromParams;
        const storedFeeHistory = localStorage.getItem("feeHistory");

        let studentData = null;

        if (storedStudent) {
          studentData = JSON.parse(storedStudent);
          setStudent(studentData);
          console.log("Loaded student data from localStorage", studentData);
        } else if (storedStudentId) {
          // If only student ID is available, fetch student data
          const studentRes = await axios.get(
            `${API_BASE}/students/getStudentById/${storedStudentId}`,
            {
              headers: getAuthHeaders(),
            },
          );
          if (studentRes.data?.success) {
            studentData = studentRes.data.student;
            setStudent(studentData);
          }
        } else {
          // Fallback: get current user's profile
          const profileRes = await axios.get(`${API_BASE}/students/myProfile`, {
            headers: getAuthHeaders(),
          });
          if (profileRes.data?.success) {
            studentData = profileRes.data.student;
            setStudent(studentData);
          }
        
        }
        console.log("Student data after fetching:", studentData);
        // Fetch fee history from stored data or API
        if (storedFeeHistory) {
          setFeeHistory(JSON.parse(storedFeeHistory));
          console.log("Loaded fee history from localStorage", JSON.parse(storedFeeHistory));
        }  if (storedStudentId || studentData?._id) {
          console.log("Fetching fee history from API for student ID:", storedStudentId || studentData._id);
          try {
            const feeRes = await axios.get(
              `${API_BASE}/students/getStudentFee/${storedStudentId || studentData._id}`,
              { headers: getAuthHeaders() },
            );
            if (feeRes.data?.success && feeRes.data.fees) {
              setFeeHistory(feeRes.data.fees);
              console.log("Fetched fee history from API", feeRes.data.fees);
            }
          } catch (error) {
            console.log("Fee history not available");
          }
        }

        // Fetch courses for the student
        if (studentData) {
          let coursesRes;
          if (storedStudentId) {
            // Fetch courses for specific student by student ID
            coursesRes = await axios.get(
              `${API_BASE}/registration/getStudentCourses/${storedStudentId}`,
              {
                headers: getAuthHeaders(),
              },
            );
          } else {
            // Fetch current user's courses
            coursesRes = await axios.get(`${API_BASE}/registration/myCourses`, {
              headers: getAuthHeaders(),
            });
          }

          if (coursesRes.data?.success) {
            setCourses(coursesRes.data.courses || []);
            setAboutCourse(coursesRes.data.aboutCourse || []);
          } else if (coursesRes.data?.courses) {
            setCourses(coursesRes.data.courses);
            setAboutCourse(coursesRes.data.aboutCourse || []);
          }
        }
      } catch (error) {
        console.error("Error fetching voucher data:", error);
        toast.error("Failed to load voucher data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [studentIdFromParams]);

  // Auto-download PDF on mount
  useEffect(() => {
    if (!loading && student && aboutCourse.length > 0 && voucherRef.current) {
      const timer = setTimeout(() => {
        downloadPDF(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loading, student, aboutCourse]);

  // Cleanup localStorage when component unmounts
  useEffect(() => {
    return () => {
      // Optionally clear localStorage when leaving the page
      // localStorage.removeItem("voucherStudent");
      // localStorage.removeItem("voucherStudentId");
    };
  }, []);

  // Handle print events
  useEffect(() => {
    const handleBeforePrint = () => {
      setIsPrinting(true);
    };

    const handleAfterPrint = () => {
      setIsPrinting(false);
    };

    window.addEventListener("beforeprint", handleBeforePrint);
    window.addEventListener("afterprint", handleAfterPrint);

    return () => {
      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, []);

  const calculateTotals = () => {
    let totalOriginalFee = 0;
    let totalDiscountedFee = 0;

    aboutCourse.forEach((item) => {
      const originalFee = Number(item?.courseActualPrice || 0);
      const discountedFee = Number(item?.courseDiscountedPrice || 0);

      totalOriginalFee += originalFee;
      totalDiscountedFee += discountedFee;
    });

    const totalDiscount = totalOriginalFee - totalDiscountedFee;

    return {
      totalOriginalFee,
      totalDiscountedFee,
      totalDiscount,
    };
  };

  const calculateFeeTotals = () => {
    let paidAmount = 0;
    let remainingAmount = 0;

    feeHistory.forEach((fee) => {
      paidAmount += Number(fee.amountPaid || 0);
      remainingAmount += Number(fee.remainingFee || 0);
    });

    return {
      paidAmount,
      remainingAmount,
    };
  };

  const calculateFeeStatus = () => {
    if (feeHistory.length === 0) return "Unpaid";
    const statuses = feeHistory.map((f) => f.status);
    if (statuses.every((s) => s === "paid")) return "Paid";
    if (statuses.some((s) => s === "paid" || s === "partial")) return "Partial";
    return "Unpaid";
  };

  const totals = calculateTotals();

  const downloadPDF = async (isAuto = false) => {
    // Just show print dialog for user to print to PDF
    window.print();
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-success" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="voucher-page">
      <div
        className={`voucher-print-header ${isPrinting ? "is-printing" : ""}`}
      >
        <button
          type="button"
          className="btn btn-primary mb-3"
          onClick={() => downloadPDF()}
          style={{ display: isPrinting ? "none" : "block" }}
        >
          <i className="fas fa-print me-2"></i>
          Print / Download PDF
        </button>
      </div>
      <div className="voucher-container" ref={voucherRef}>
        {/* Watermark */}
        <div className="voucher-watermark">
          <img
            src={logo}
            alt="EC Academy Watermark"
            className="watermark-logo"
          />
        </div>

        {/* Header */}
        <div className="voucher-header">
          <div className="voucher-logo-section">
            <img src={logo} alt="EC Academy" className="voucher-logo" />
          </div>
          <div className="voucher-title-section">
            <h1 className="voucher-main-title">
              The Education's Cradle Academy
            </h1>
            <h2 className="voucher-subtitle">Fee Voucher</h2>
          </div>
        </div>

        <div className="voucher-divider"></div>

        {/* Payment Details Section - Moved to Top */}
        <section className="voucher-section payment-details-section">
          <h3 className="section-title">Payment Details</h3>
          <div className="payment-info">
            <div className="payment-item">
              <span className="payment-label">Account Title:</span>
              <span className="payment-value">
                The Education's Cradle Academy
              </span>
            </div>
            <div className="payment-item">
              <span className="payment-label">Account Number:</span>
              <span className="payment-value">1234567890</span>
            </div>
            <div className="payment-item">
              <span className="payment-label">Bank:</span>
              <span className="payment-value">HBL / MEEZAN BANK</span>
            </div>
          </div>
        </section>

        {/* Courses and Fees Section */}
        <section className="voucher-section">
          <h3 className="section-title">Student Information</h3>
          <div className="student-info-grid">
            <div className="info-item">
              <label className="info-label">Student Name</label>
              <div className="info-value">{student?.name || "N/A"}</div>
            </div>

            <div className="info-item">
              <label className="info-label">Father Name</label>
              <div className="info-value">{student?.fatherName || "N/A"}</div>
            </div>

            <div className="info-item">
              <label className="info-label">Father Contact</label>
              <div className="info-value">
                {student?.fatherContact || "N/A"}
              </div>
            </div>

            <div className="info-item">
              <label className="info-label">Roll Number</label>
              <div className="info-value">{student?.rollNumber || "N/A"}</div>
            </div>

            <div className="info-item">
              <label className="info-label">Class/Grade</label>
              <div className="info-value">{student?.classInfo || "N/A"}</div>
            </div>

            <div className="info-item">
              <label className="info-label">Due Date</label>
              <div className="info-value">
                {new Date(new Date().setDate(new Date().getDate() + 7)).toLocaleDateString("en-GB")}
              </div>
            </div>
          </div>
        </section>

        {/* Courses and Fees Section */}
        <section className="voucher-section">
          <h3 className="section-title">Registered Courses & Fees</h3>
          <table className="voucher-table">
            <thead>
              <tr>
                <th className="col-index">#</th>
                <th className="col-course">Course Name</th>
                <th className="col-original">Original Fee</th>
                <th className="col-discount">Discount</th>
                <th className="col-discounted">Discounted Fee</th>
              </tr>
            </thead>
            <tbody>
              {aboutCourse && aboutCourse.length > 0 ? (
                aboutCourse.map((item, idx) => {
                  const originalFee = Number(item?.courseActualPrice || 0);
                  const discountedFee = Number(
                    item?.courseDiscountedPrice || 0,
                  );
                  const discount = originalFee - discountedFee;
                  const courseTitle = item?.course?.title || "N/A";

                  return (
                    <tr key={item._id || idx}>
                      <td className="col-index">{idx + 1}</td>
                      <td className="col-course">{courseTitle}</td>
                      <td className="col-original">
                        PKR {originalFee.toLocaleString()}
                      </td>
                      <td className="col-discount">
                        PKR {discount.toLocaleString()}
                      </td>
                      <td className="col-discounted">
                        PKR {discountedFee.toLocaleString()}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="5" className="text-center">
                    No courses registered
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {/* Fee Status Section */}
        {feeHistory && feeHistory.length > 0 && (
          <section className="voucher-section fee-payment-section">
            <h3 className="section-title mt-2">Payment Status</h3>
            <div className="payment-status-grid">
              <div className="payment-status-item">
                <span className="payment-status-label">Status</span>
                <span
                  className={`payment-status-badge status-${calculateFeeStatus().toLowerCase()}`}
                >
                  {calculateFeeStatus()}
                </span>
              </div>
              <div className="payment-status-item">
                <span className="payment-status-label">Total Paid</span>
                <span className="payment-status-value">
                  PKR {calculateFeeTotals().paidAmount.toLocaleString()}
                </span>
              </div>
              <div className="payment-status-item">
                <span className="payment-status-label">Remaining</span>
                <span className="payment-status-value">
                  PKR {calculateFeeTotals().remainingAmount.toLocaleString()}
                </span>
              </div>
            </div>
          </section>
        )}

        {/* Summary Section */}
        <section className="voucher-section">
          <div className="summary-grid">
            <div className="summary-item">
              <span className="summary-label">Total Fee:</span>
              <span className="summary-value">
                PKR {totals.totalOriginalFee.toLocaleString()}
              </span>
            </div>

            <div className="summary-item">
              <span className="summary-label">Discount:</span>
              <span className="summary-value discount">
                - PKR {totals.totalDiscount.toLocaleString()}
              </span>
            </div>

            <div className="summary-item highlight">
              <span className="summary-label">Payable:</span>
              <span className="summary-value">
                PKR {totals.totalDiscountedFee.toLocaleString()}
              </span>
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="voucher-footer">
          <p>
            <strong>Note:</strong> Please keep this voucher safe for your
            records. Submit the proof of payment to the administration office
            within 7 days.
          </p>
          <div className="voucher-dates">
            <p className="voucher-date">
              Generated on: {new Date().toLocaleDateString("en-GB")}
            </p>
            <p className="voucher-due-date">
              Due Date: {new Date(new Date().setDate(new Date().getDate() + 7)).toLocaleDateString("en-GB")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Voucher;
