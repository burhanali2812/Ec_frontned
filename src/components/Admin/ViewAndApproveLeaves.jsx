import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import Sidebar from "../Sidebar";
import "./ViewAndApproveLeaves.css";

function ViewAndApproveLeaves() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [applicantFilter, setApplicantFilter] = useState("all");
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [updating, setUpdating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const API_BASE = "https://ec-backend-phi.vercel.app/api";

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    const fetchLeaves = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API_BASE}/leave/allLeaveApplications`, {
          headers: getAuthHeaders(),
        });
        setLeaves(res?.data?.leaveApplications || []);
      } catch (error) {
        console.error("Error fetching leaves:", error);
        alert("Failed to load leave applications");
      } finally {
        setLoading(false);
      }
    };

    fetchLeaves();
  }, []);

  const filteredLeaves = useMemo(() => {
    let filtered = leaves;

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (leave) => leave.status.toLowerCase() === statusFilter.toLowerCase(),
      );
    }

    // Filter by applicant type
    if (applicantFilter !== "all") {
      filtered = filtered.filter(
        (leave) =>
          String(leave.applicant).toLowerCase() ===
          applicantFilter.toLowerCase(),
      );
    }

    // Filter by search term (name or email)
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (leave) =>
          leave.name.toLowerCase().includes(term) ||
          leave.email.toLowerCase().includes(term),
      );
    }

    return filtered;
  }, [leaves, statusFilter, applicantFilter, searchTerm]);

  const handleStatusUpdate = async (leaveId, newStatus) => {
    if (newStatus === "Rejected" && !rejectionReason.trim()) {
      alert("Please provide a rejection reason");
      return;
    }

    setUpdating(true);
    try {
      const updatePayload = { status: newStatus };
      if (newStatus === "Rejected") {
        updatePayload.rejectedReason = rejectionReason;
      }

      const res = await axios.put(
        `${API_BASE}/leave/leaveApplications/${leaveId}`,
        updatePayload,
        { headers: getAuthHeaders() },
      );

      // Update the leaves list
      setLeaves((prev) =>
        prev.map((leave) =>
          leave._id === leaveId
            ? {
                ...leave,
                status: newStatus,
                rejectedReason:
                  newStatus === "Rejected"
                    ? rejectionReason
                    : leave.rejectedReason,
              }
            : leave,
        ),
      );

      // Close modal
      setSelectedLeave(null);
      setRejectionReason("");
      alert("Leave application updated successfully");
    } catch (error) {
      console.error("Error updating leave:", error);
      alert(
        error?.response?.data?.message || "Failed to update leave application",
      );
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (String(status).toLowerCase()) {
      case "pending":
        return "badge-warning";
      case "approved":
        return "badge-success";
      case "rejected":
        return "badge-danger";
      default:
        return "badge-secondary";
    }
  };

  const stats = useMemo(() => {
    return {
      total: leaves.length,
      pending: leaves.filter((l) => l.status === "Pending").length,
      approved: leaves.filter((l) => l.status === "Approved").length,
      rejected: leaves.filter((l) => l.status === "Rejected").length,
      student: leaves.filter(
        (l) => String(l.applicant).toLowerCase() === "student",
      ).length,
      teacher: leaves.filter(
        (l) => String(l.applicant).toLowerCase() === "teacher",
      ).length,
    };
  }, [leaves]);

  return (
    <Sidebar>
      <div className="view-leaves-page py-3 py-lg-4">
        <div className="view-leaves-card p-3 p-lg-4 mb-4">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h5 className="mb-0">Leave Applications Management</h5>
          </div>

          {/* Stats */}
          <div className="row g-2 mb-4">
            <div className="col-6 col-md-3">
              <div className="view-leaves-stat">
                <div className="stat-value">{stats.total}</div>
                <div className="stat-label">Total</div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="view-leaves-stat pending">
                <div className="stat-value">{stats.pending}</div>
                <div className="stat-label">Pending</div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="view-leaves-stat approved">
                <div className="stat-value">{stats.approved}</div>
                <div className="stat-label">Approved</div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="view-leaves-stat rejected">
                <div className="stat-value">{stats.rejected}</div>
                <div className="stat-label">Rejected</div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="view-leaves-filters mb-4">
            <div className="row g-2 align-items-start">
              <div className="col-12 col-md-6">
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="applicant-mini-counts mt-2">
                  <span className="mini-count-chip">
                    Students: {stats.student}
                  </span>
                  <span className="mini-count-chip">
                    Teachers: {stats.teacher}
                  </span>
                </div>
              </div>
              <div className="col-12 col-md-6">
                <div className="small text-muted mb-1">Status</div>
                <div className="view-leaves-status-filter">
                  {["all", "pending", "approved", "rejected"].map((status) => (
                    <button
                      key={status}
                      type="button"
                      className={`filter-btn ${
                        statusFilter === status ? "active" : ""
                      }`}
                      onClick={() => setStatusFilter(status)}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>

                <div className="small text-muted mb-1 mt-2">Applicant</div>
                <div className="view-leaves-status-filter">
                  {["all", "student", "teacher"].map((applicant) => (
                    <button
                      key={applicant}
                      type="button"
                      className={`filter-btn ${
                        applicantFilter === applicant ? "active" : ""
                      }`}
                      onClick={() => setApplicantFilter(applicant)}
                    >
                      {applicant.charAt(0).toUpperCase() +
                        applicant.slice(1) + " (" +
                        (applicant === "all"
                          ? stats.total
                          : (stats[applicant] ?? 0))
                           + ")"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Leave List */}
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border spinner-border-sm" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : filteredLeaves.length > 0 ? (
            <div className="view-leaves-list">
              {filteredLeaves.map((leave) => (
                <div
                  key={leave._id}
                  className="view-leaves-item"
                  onClick={() => setSelectedLeave(leave)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="leave-item-header">
                    <div>
                      <h6 className="mb-1">{leave.name}</h6>
                      <p className="mb-0 text-muted small">
                        {leave.email} • {leave.applicant}
                      </p>
                    </div>
                    <span
                      className={`badge ${getStatusBadgeClass(leave.status)}`}
                    >
                      {leave.status}
                    </span>
                  </div>

                  <div className="leave-item-dates mt-2">
                    <span className="date-badge">
                      <i className="fas fa-calendar"></i> {leave.fromDate}
                    </span>
                    <span className="date-badge">
                      <i className="fas fa-calendar"></i> {leave.toDate}
                    </span>
                  </div>

                  <div className="leave-item-reason mt-2">
                    <p className="mb-0 small text-muted">
                      <strong>Reason:</strong> {leave.reason}
                    </p>
                  </div>

                  {leave.rejectedReason && (
                    <div className="leave-item-rejection mt-2">
                      <p className="mb-0 small text-danger">
                        <strong>Rejection Reason:</strong>{" "}
                        {leave.rejectedReason}
                      </p>
                    </div>
                  )}

                  <div className="leave-item-applied mt-2">
                    <p className="mb-0 small text-muted">
                      Applied: {new Date(leave.appliedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="alert alert-info mb-0 text-center">
              No leave applications found
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedLeave && (
        <div
          className="view-leaves-modal-backdrop"
          onClick={() => {
            setSelectedLeave(null);
            setRejectionReason("");
          }}
        >
          <div
            className="view-leaves-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h5 className="mb-0">Leave Application Details</h5>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => {
                  setSelectedLeave(null);
                  setRejectionReason("");
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="modal-body">
              <div className="detail-item">
                <label>Applicant Name</label>
                <p>{selectedLeave.name}</p>
              </div>

              <div className="detail-item">
                <label>Email</label>
                <p>{selectedLeave.email}</p>
              </div>

              <div className="detail-item">
                <label>Applicant Type</label>
                <p>{selectedLeave.applicant}</p>
              </div>

              <div className="detail-item">
                <label>From Date</label>
                <p>{selectedLeave.fromDate}</p>
              </div>

              <div className="detail-item">
                <label>To Date</label>
                <p>{selectedLeave.toDate}</p>
              </div>

              <div className="detail-item">
                <label>Reason</label>
                <p>{selectedLeave.reason}</p>
              </div>

              <div className="detail-item">
                <label>Current Status</label>
                <p>
                  <span
                    className={`badge ${getStatusBadgeClass(selectedLeave.status)}`}
                  >
                    {selectedLeave.status}
                  </span>
                </p>
              </div>

              {selectedLeave.rejectedReason && (
                <div className="detail-item">
                  <label>Rejection Reason</label>
                  <p className="text-danger">{selectedLeave.rejectedReason}</p>
                </div>
              )}

              <div className="detail-item">
                <label>Applied At</label>
                <p>{new Date(selectedLeave.appliedAt).toLocaleString()}</p>
              </div>

              {selectedLeave.status === "Pending" && (
                <>
                  <div className="detail-item">
                    <label>Action</label>
                    <div className="action-buttons">
                      <button
                        type="button"
                        className="btn btn-sm btn-success"
                        onClick={() =>
                          handleStatusUpdate(selectedLeave._id, "Approved")
                        }
                        disabled={updating}
                      >
                        {updating ? "Updating..." : "Approve"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() =>
                          setSelectedLeave({
                            ...selectedLeave,
                            showRejectForm: true,
                          })
                        }
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </>
              )}

              {selectedLeave.showRejectForm && (
                <div className="detail-item mt-3 p-3 border rounded bg-light">
                  <label>Rejection Reason *</label>
                  <textarea
                    className="form-control form-control-sm mb-2"
                    rows="3"
                    placeholder="Enter the reason for rejection..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                  />
                  <div className="d-flex gap-2">
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() =>
                        handleStatusUpdate(selectedLeave._id, "Rejected")
                      }
                      disabled={updating || !rejectionReason.trim()}
                    >
                      {updating ? "Rejecting..." : "Confirm Rejection"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => {
                        setSelectedLeave({
                          ...selectedLeave,
                          showRejectForm: false,
                        });
                        setRejectionReason("");
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Sidebar>
  );
}

export default ViewAndApproveLeaves;
