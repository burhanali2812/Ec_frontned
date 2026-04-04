import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import logo from "../images/logo.png";
import "./StudentRegister.css";

function StudentRegister({ adminLoginType = "academy" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { studentId } = useParams();

  const [student, setStudent] = useState(location.state?.student || null);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState(
    studentId ||
      location.state?.student?._id ||
      location.state?.student?.id ||
      "",
  );
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingStudent, setLoadingStudent] = useState(
    !location.state?.student,
  );
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingRegistration, setLoadingRegistration] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCourseIds, setSelectedCourseIds] = useState([]);
  const [discountedPrices, setDiscountedPrices] = useState({});

  const STUDENT_API = "https://ec-backend-phi.vercel.app/api/students";
  const COURSE_API = "https://ec-backend-phi.vercel.app/api/courses";
  const REGISTRATION_API = "https://ec-backend-phi.vercel.app/api/registration";

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

  const selectedCourses = useMemo(
    () =>
      courses.filter((course) =>
        selectedCourseIds.includes(String(course._id || course.id)),
      ),
    [courses, selectedCourseIds],
  );

  const availableCourses = useMemo(
    () =>
      courses.filter(
        (course) =>
          !selectedCourseIds.includes(String(course._id || course.id)),
      ),
    [courses, selectedCourseIds],
  );

  const totalActualPrice = useMemo(
    () =>
      selectedCourses.reduce(
        (sum, course) => sum + Number(course.coursePrice || 0),
        0,
      ),
    [selectedCourses],
  );

  const totalDiscountedPrice = useMemo(
    () =>
      selectedCourses.reduce((sum, course) => {
        const courseId = String(course._id || course.id);
        return (
          sum + Number(discountedPrices[courseId] ?? course.coursePrice ?? 0)
        );
      }, 0),
    [selectedCourses, discountedPrices],
  );

  const studentName = student?.name || "Student";

  const fetchStudent = async () => {
    if (!studentId) return;
    setLoadingStudent(true);
    try {
      const res = await axios.get(
        `${STUDENT_API}/getStudentById/${studentId}`,
        {
          headers: getAuthHeaders(),
        },
      );
      if (res.data?.success) {
        setStudent(res.data.student);
      } else {
        toast.error(res.data?.message || "Failed to load student");
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to load student."));
    } finally {
      setLoadingStudent(false);
    }
  };

  const fetchStudents = async () => {
    setLoadingStudents(true);
    try {
      const res = await axios.get(`${STUDENT_API}/getAllStudents`, {
        params: {
          institutionType: adminLoginType === "academy" ? "Academy" : "School",
        },
        headers: getAuthHeaders(),
      });

      if (res.data?.success) {
        setStudents(res.data.students || []);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to load students."));
    } finally {
      setLoadingStudents(false);
    }
  };

  const fetchCourses = async () => {
    setLoadingCourses(true);
    try {
      const res = await axios.get(`${COURSE_API}/allCourses`, {
        params: {
          institutionType: adminLoginType === "academy" ? "Academy" : "School",
        },
        headers: getAuthHeaders(),
      });

      if (res.data?.success) {
        setCourses(res.data.courses || []);
      } else {
        toast.error(res.data?.message || "Failed to load courses");
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to load courses."));
    } finally {
      setLoadingCourses(false);
    }
  };

  const fetchStudentRegistration = async () => {
    if (!studentId) return;

    setLoadingRegistration(true);
    try {
      const res = await axios.get(
        `${REGISTRATION_API}/getStudentCourses/${studentId}`,
        {
          headers: getAuthHeaders(),
        },
      );

      if (res.data?.success) {
        const aboutCourse = Array.isArray(res.data.aboutCourse)
          ? res.data.aboutCourse
          : [];

        const nextCourseIds = aboutCourse
          .map((item) => String(item?.course?._id || item?.course || ""))
          .filter(Boolean);

        const nextDiscountedPrices = aboutCourse.reduce((acc, item) => {
          const courseId = String(item?.course?._id || item?.course || "");
          if (!courseId) return acc;
          acc[courseId] = String(
            item?.courseDiscountedPrice ??
              item?.discountedPrice ??
              item?.course?.coursePrice ??
              0,
          );
          return acc;
        }, {});

        setSelectedCourseIds(nextCourseIds);
        setDiscountedPrices(nextDiscountedPrices);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to load registration."));
    } finally {
      setLoadingRegistration(false);
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchCourses();
    if (!student) fetchStudent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  useEffect(() => {
    const initialId =
      selectedStudentId || studentId || student?._id || student?.id || "";

    if (initialId) {
      fetchStudentRegistrationFor(initialId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStudentId, studentId, student?._id, student?.id]);

  useEffect(() => {
    if (student && !selectedStudentId) {
      setSelectedStudentId(String(student._id || student.id));
    }
  }, [student, selectedStudentId]);

  const handleStudentChange = (value) => {
    const nextStudentId = String(value);
    setSelectedStudentId(nextStudentId);

    const foundStudent = students.find(
      (item) => String(item._id || item.id) === nextStudentId,
    );

    if (foundStudent) {
      setStudent(foundStudent);
      setSelectedCourseIds([]);
      setDiscountedPrices({});
      fetchStudentRegistrationFor(nextStudentId);
    }
  };

  const fetchStudentRegistrationFor = async (id) => {
    if (!id) return;

    setLoadingRegistration(true);
    try {
      const res = await axios.get(
        `${REGISTRATION_API}/getStudentCourses/${id}`,
        {
          headers: getAuthHeaders(),
        },
      );

      if (res.data?.success) {
        const aboutCourse = Array.isArray(res.data.aboutCourse)
          ? res.data.aboutCourse
          : [];

        const nextCourseIds = aboutCourse
          .map((item) => String(item?.course?._id || item?.course || ""))
          .filter(Boolean);

        const nextDiscountedPrices = aboutCourse.reduce((acc, item) => {
          const courseId = String(item?.course?._id || item?.course || "");
          if (!courseId) return acc;
          acc[courseId] = String(
            item?.courseDiscountedPrice ??
              item?.discountedPrice ??
              item?.course?.coursePrice ??
              0,
          );
          return acc;
        }, {});

        setSelectedCourseIds(nextCourseIds);
        setDiscountedPrices(nextDiscountedPrices);
      } else {
        setSelectedCourseIds([]);
        setDiscountedPrices({});
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to load registration."));
    } finally {
      setLoadingRegistration(false);
    }
  };

  const handleToggleCourse = (courseId) => {
    const normalized = String(courseId);
    const selected = courses.find(
      (course) => String(course._id || course.id) === normalized,
    );
    const defaultPrice = String(Number(selected?.coursePrice || 0));

    setSelectedCourseIds((prev) => {
      const exists = prev.includes(normalized);
      if (exists) {
        setDiscountedPrices((prevPrices) => {
          const next = { ...prevPrices };
          delete next[normalized];
          return next;
        });
        return prev.filter((id) => id !== normalized);
      }

      setDiscountedPrices((prevPrices) => ({
        ...prevPrices,
        [normalized]: prevPrices[normalized] ?? defaultPrice,
      }));
      return [...prev, normalized];
    });
  };

  const handleDiscountedPriceChange = (courseId, value) => {
    setDiscountedPrices((prev) => ({
      ...prev,
      [courseId]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const activeStudentId =
      selectedStudentId || studentId || student?._id || student?.id;

    if (!activeStudentId || !student) {
      toast.error("Student details are missing");
      return;
    }

    if (!selectedCourseIds.length) {
      toast.error("Please select at least one course");
      return;
    }

    setSubmitting(true);
    try {
      const aboutCourse = selectedCourseIds.map((courseId) => {
        const course = courses.find(
          (item) => String(item._id || item.id) === courseId,
        );
        const actualPrice = Number(course?.coursePrice || 0);
        const discounted = Number(discountedPrices[courseId] ?? actualPrice);

        return {
          course: courseId,
          courseActualPrice: actualPrice,
          courseDiscountedPrice: discounted,
        };
      });

      const payload = {
        aboutCourse,
        courses: selectedCourseIds,
        courseIds: selectedCourseIds,
        studentId: activeStudentId,
        institutionType:
          student.institutionType ||
          (adminLoginType === "academy" ? "Academy" : "School"),
        classInfo: student.classInfo,
      };

      const res = await axios.post(`${REGISTRATION_API}/register`, payload, {
        headers: getAuthHeaders(),
      });

      if (res.data?.success) {
        toast.success(res.data?.message || "Registration saved successfully");
        fetchStudentRegistrationFor(activeStudentId);
      } else {
        toast.error(res.data?.message || "Failed to save registration");
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to save registration"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sidebar>
      <Toaster position="top-right" />
  
      <div className="sr-page">
        <div className="sr-container">
          <div className="sr-header-card">
            <div className="sr-logo-wrap">
              <img src={logo} alt="EC Portal" className="sr-logo" />
            </div>
            <div>
              <h2 className="sr-heading mb-1">Student Registration</h2>
              <div className="sr-subheading">
                Select courses and manage discounts
              </div>
            </div>
            <button
              type="button"
              className="btn btn-outline-secondary sr-back-btn"
              onClick={() => navigate(-1)}
            >
              Back
            </button>
          </div>

          <div className="sr-card">
            <div className="sr-student-picker">
              <label className="form-label fw-semibold">Choose Student</label>
              <select
                className="form-control"
                value={selectedStudentId}
                onChange={(e) => handleStudentChange(e.target.value)}
                disabled={loadingStudents}
              >
                <option value="">Select a student</option>
                {students.map((item) => {
                  const id = String(item._id || item.id);
                  return (
                    <option key={id} value={id}>
                      {item.name} - {item.rollNumber || "No Roll"}
                    </option>
                  );
                })}
              </select>
              {loadingStudents && (
                <div className="sr-note mt-2">Loading student list...</div>
              )}
            </div>

            {loadingStudent && !student ? (
              <div className="sr-loading">Loading student details...</div>
            ) : student ? (
              <div className="sr-student-grid mt-3">
                <div className="sr-student-info">
                  <h5 className="sr-section-title">Student Details</h5>
                  <div className="sr-info-item">
                    <span>Name</span>
                    <strong>{student.name}</strong>
                  </div>
                  <div className="sr-info-item">
                    <span>Email</span>
                    <strong>{student.email}</strong>
                  </div>
                  <div className="sr-info-item">
                    <span>Contact</span>
                    <strong>{student.contact}</strong>
                  </div>
                  <div className="sr-info-item">
                    <span>Class</span>
                    <strong>{student.classInfo}</strong>
                  </div>
                  <div className="sr-info-item">
                    <span>Father Name</span>
                    <strong>{student.fatherName}</strong>
                  </div>
                  <div className="sr-info-item">
                    <span>Father Contact</span>
                    <strong>{student.fatherContact || "-"}</strong>
                  </div>
                  <div className="sr-info-item">
                    <span>Roll No</span>
                    <strong>{student.rollNumber || "-"}</strong>
                  </div>
                </div>

                <div className="sr-form-wrap">
                  <h5 className="sr-section-title">Course Selection</h5>
                  {loadingRegistration && (
                    <div className="sr-note">Loading registered courses...</div>
                  )}
                  <form onSubmit={handleSubmit}>
                    <div className="sr-summary">
                      <div>
                        <div className="sr-summary-label">Selected Courses</div>
                        <div className="sr-summary-value">
                          {selectedCourses.length}
                        </div>
                      </div>
                      <div>
                        <div className="sr-summary-label">
                          Total Actual Price
                        </div>
                        <div className="sr-summary-value">
                          {totalActualPrice}
                        </div>
                      </div>
                      <div>
                        <div className="sr-summary-label">
                          Total Discounted Price
                        </div>
                        <div className="sr-summary-value sr-positive">
                          {totalDiscountedPrice}
                        </div>
                      </div>
                    </div>

                    <div className="sr-course-columns">
                      <div>
                        <h6 className="sr-column-title">Registered Courses</h6>
                        <div className="sr-course-list">
                          {selectedCourses.length === 0 ? (
                            <div className="sr-empty">
                              No registered courses.
                            </div>
                          ) : (
                            selectedCourses.map((course) => {
                              const courseId = String(course._id || course.id);
                              return (
                                <div
                                  key={`registered-${courseId}`}
                                  className="sr-course-item"
                                >
                                  <label className="sr-course-label">
                                    <input
                                      type="checkbox"
                                      checked={selectedCourseIds.includes(
                                        courseId,
                                      )}
                                      onChange={() =>
                                        handleToggleCourse(courseId)
                                      }
                                    />
                                    <div className="sr-course-content">
                                      <div className="sr-course-title-row">
                                        <span className="sr-course-title">
                                          {course.courseTitle || course.title}
                                        </span>
                                        <span className="sr-course-price">
                                          Actual:{" "}
                                          {Number(course.coursePrice || 0)}
                                        </span>
                                      </div>
                                      <div className="sr-course-desc">
                                        {course.courseDescription ||
                                          course.description}
                                      </div>
                                      <div className="sr-price-input-wrap">
                                        <label>Discounted Price</label>
                                        <input
                                          type="number"
                                          min="0"
                                          className="form-control form-control-sm"
                                          value={
                                            discountedPrices[courseId] ?? ""
                                          }
                                          onChange={(e) =>
                                            handleDiscountedPriceChange(
                                              courseId,
                                              e.target.value,
                                            )
                                          }
                                        />
                                      </div>
                                    </div>
                                  </label>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>

                      <div>
                        <h6 className="sr-column-title">Available Courses</h6>
                        <div className="sr-course-list">
                          {loadingCourses ? (
                            <div className="sr-empty">Loading courses...</div>
                          ) : availableCourses.length === 0 ? (
                            <div className="sr-empty">
                              No available courses.
                            </div>
                          ) : (
                            availableCourses.map((course) => {
                              const courseId = String(course._id || course.id);
                              return (
                                <div
                                  key={`available-${courseId}`}
                                  className="sr-course-item"
                                >
                                  <label className="sr-course-label">
                                    <input
                                      type="checkbox"
                                      checked={selectedCourseIds.includes(
                                        courseId,
                                      )}
                                      onChange={() =>
                                        handleToggleCourse(courseId)
                                      }
                                    />
                                    <div className="sr-course-content">
                                      <div className="sr-course-title-row">
                                        <span className="sr-course-title">
                                          {course.courseTitle || course.title}
                                        </span>
                                        <span className="sr-course-price">
                                          Actual:{" "}
                                          {Number(course.coursePrice || 0)}
                                        </span>
                                      </div>
                                      <div className="sr-course-desc">
                                        {course.courseDescription ||
                                          course.description}
                                      </div>
                                      <div className="sr-price-input-wrap">
                                        <label>Discounted Price</label>
                                        <input
                                          type="number"
                                          min="0"
                                          className="form-control form-control-sm"
                                          value={
                                            discountedPrices[courseId] ?? ""
                                          }
                                          onChange={(e) =>
                                            handleDiscountedPriceChange(
                                              courseId,
                                              e.target.value,
                                            )
                                          }
                                        />
                                      </div>
                                    </div>
                                  </label>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="sr-submit-row">
                      <button
                        type="submit"
                        className="btn btn-success"
                        disabled={submitting || !selectedCourseIds.length}
                      >
                        {submitting ? "Saving..." : "Save Registration"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            ) : (
              <div className="sr-loading">
                Please choose a student to begin.
              </div>
            )}
          </div>
        </div>
      </div>
    </Sidebar>
  );
}

export default StudentRegister;
