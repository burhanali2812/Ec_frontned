import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Toaster, toast } from "react-hot-toast";
import Sidebar from "../Sidebar";
import TopBar from "../TopBar";
import logo from "./../../images/logo.png";
import "./CourseManage.css";

function CourseManage({ adminLoginType = "academy" }) {
  const CLASS_OPTIONS = ["Pre-9th", "9th", "10th", "11th", "12th"];

  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    coursePrice: "",
    teacherAssignments: [],
  });

  const COURSE_API = "https://ec-backend-phi.vercel.app/api/courses";
  const TEACHER_API = "https://ec-backend-phi.vercel.app/api/teacher";

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

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      coursePrice: "",
      teacherAssignments: [],
    });
    setIsEditMode(false);
    setEditingCourseId("");
  };

  const fetchCourses = async () => {
    setLoadingCourses(true);
    try {
      const res = await axios.get(`${COURSE_API}/allCourses`, {
        headers: getAuthHeaders(),
      });

      if (res.data?.success) {
        setCourses(res.data.courses || []);
      } else {
        toast.error(res.data?.message || "Failed to load courses");
      }
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Unable to load courses. Please refresh."),
      );
    } finally {
      setLoadingCourses(false);
    }
  };

  const fetchTeachers = async () => {
    setLoadingTeachers(true);
    try {
      const res = await axios.get(`${TEACHER_API}/getAllTeachers`, {
        params: { institutionType: adminLoginType },
        headers: getAuthHeaders(),
      });

      if (res.data?.success) {
        setTeachers(res.data.teachers || []);
      } else {
        toast.error(res.data?.message || "Failed to load teachers");
      }
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Unable to load teachers. Please refresh."),
      );
    } finally {
      setLoadingTeachers(false);
    }
  };

  useEffect(() => {
    fetchCourses();
    fetchTeachers();
  }, []);

  const teacherMap = useMemo(() => {
    return teachers.reduce((acc, teacher) => {
      const id = String(teacher._id || teacher.id);
      acc[id] = teacher.name || "Unknown Teacher";
      return acc;
    }, {});
  }, [teachers]);

  const formatTeacherName = (teacherValue, fallbackId = "") => {
    if (!teacherValue) {
      return teacherMap[fallbackId] || "Unknown Teacher";
    }

    if (typeof teacherValue === "string") {
      return teacherMap[teacherValue] || teacherValue || "Unknown Teacher";
    }

    if (typeof teacherValue === "object") {
      return (
        teacherValue.name ||
        teacherValue.fullName ||
        teacherMap[String(teacherValue._id || teacherValue.id || fallbackId)] ||
        "Unknown Teacher"
      );
    }

    return teacherMap[fallbackId] || "Unknown Teacher";
  };

  const normalizeAssignments = (course) => {
    const raw = Array.isArray(course?.assignments)
      ? course.assignments
      : Array.isArray(course?.classTarget)
        ? course.classTarget
        : [];

    return raw
      .map((item) => {
        if (!item) return null;

        if (typeof item === "string") {
          const [teacherId, classesPart] = item.split("|");
          return {
            teacherId: teacherId ? String(teacherId) : "",
            classes: classesPart ? classesPart.split(",").filter(Boolean) : [],
            teacher: null,
          };
        }

        return {
          teacherId: String(
            item.teacher?._id || item.teacher || item.teacherId || "",
          ),
          classes: Array.isArray(item.targetClasses)
            ? item.targetClasses
            : Array.isArray(item.classes)
              ? item.classes
              : [],
          teacher: item.teacher || null,
        };
      })
      .filter((item) => item && item.teacherId);
  };

  const getCourseAssignments = (course) => {
    const assignments = normalizeAssignments(course);
    return assignments.map((assignment) => ({
      teacherId: assignment.teacherId,
      teacherName: formatTeacherName(assignment.teacher, assignment.teacherId),
      classes: assignment.classes || [],
    }));
  };

  const getCourseSearchText = (course) => {
    return getCourseAssignments(course)
      .map((assignment) => {
        const classText = assignment.classes.length
          ? ` ${assignment.classes.join(", ")} class${assignment.classes.length > 1 ? "es" : ""}`
          : "";
        return `${assignment.teacherName}${classText}`;
      })
      .join(" ")
      .toLowerCase();
  };

  const filteredCourses = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return courses;

    return courses.filter((course) => {
      return (
        String(course.title || "")
          .toLowerCase()
          .includes(q) ||
        String(course.description || "")
          .toLowerCase()
          .includes(q) ||
        getCourseSearchText(course).includes(q)
      );
    });
  }, [courses, searchText, teacherMap]);

  const getTeacherAssignment = (teacherId) => {
    return formData.teacherAssignments.find(
      (item) => item.teacherId === teacherId,
    );
  };

  const toggleTeacherSelection = (teacherId) => {
    setFormData((prev) => {
      const exists = prev.teacherAssignments.some(
        (item) => item.teacherId === teacherId,
      );
      if (exists) {
        return {
          ...prev,
          teacherAssignments: prev.teacherAssignments.filter(
            (item) => item.teacherId !== teacherId,
          ),
        };
      }

      return {
        ...prev,
        teacherAssignments: [
          ...prev.teacherAssignments,
          { teacherId, classes: [] },
        ],
      };
    });
  };

  const toggleTeacherClass = (teacherId, className) => {
    setFormData((prev) => {
      const exists = prev.teacherAssignments.some(
        (item) => item.teacherId === teacherId,
      );

      if (!exists) {
        return {
          ...prev,
          teacherAssignments: [
            ...prev.teacherAssignments,
            { teacherId, classes: [className] },
          ],
        };
      }

      return {
        ...prev,
        teacherAssignments: prev.teacherAssignments.map((item) => {
          if (item.teacherId !== teacherId) return item;

          const hasClass = item.classes.includes(className);
          return {
            ...item,
            classes: hasClass
              ? item.classes.filter((itemClass) => itemClass !== className)
              : [...item.classes, className],
          };
        }),
      };
    });
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      toast.error("Course title is required");
      return false;
    }

    if (formData.title.trim().length < 3) {
      toast.error("Course title must be at least 3 characters");
      return false;
    }

    if (!formData.description.trim()) {
      toast.error("Course description is required");
      return false;
    }

    if (formData.description.trim().length < 10) {
      toast.error("Description must be at least 10 characters");
      return false;
    }

    if (formData.coursePrice === "" || Number(formData.coursePrice) < 0) {
      toast.error("Please enter a valid course price");
      return false;
    }

    if (!formData.teacherAssignments.length) {
      toast.error("Please select at least one teacher");
      return false;
    }

    const missingClasses = formData.teacherAssignments.some(
      (assignment) => !assignment.classes.length,
    );
    if (missingClasses) {
      toast.error("Please select at least one class for each teacher");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        coursePrice: Number(formData.coursePrice),
        assignments: formData.teacherAssignments.map((item) => ({
          teacher: item.teacherId,
          targetClasses: item.classes,
        })),
      };

      const endpoint = isEditMode
        ? `${COURSE_API}/updateCourse/${editingCourseId}`
        : `${COURSE_API}/addCourse`;
      const method = isEditMode ? "put" : "post";

      const res = await axios({
        method,
        url: endpoint,
        data: payload,
        headers: getAuthHeaders(),
      });

      if (res.status === 201 || res.data?.success || res.data?.message) {
        toast.success(
          res.data?.message ||
            (isEditMode
              ? "Course updated successfully"
              : "Course added successfully"),
        );
        setShowModal(false);
        resetForm();
        fetchCourses();
      } else {
        toast.error(
          res.data?.message ||
            (isEditMode ? "Failed to update course" : "Failed to add course"),
        );
      }
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          isEditMode
            ? "Unable to update course. Please try again."
            : "Unable to add course. Please try again.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (course) => {
    const assignments = normalizeAssignments(course).map((item) => ({
      teacherId: item.teacherId,
      classes: item.classes,
    }));

    setIsEditMode(true);
    setEditingCourseId(String(course._id || course.id));
    setFormData({
      title: course.title || "",
      description: course.description || "",
      coursePrice:
        course.coursePrice !== undefined && course.coursePrice !== null
          ? String(course.coursePrice)
          : "",
      teacherAssignments: assignments,
    });
    setShowModal(true);
  };

  const handleDelete = async () => {
    const ok = window.confirm("Delete this course?");
    if (!ok) return;

    setDeleteLoading(true);
    try {
      const res = await axios.delete(
        `${COURSE_API}/deleteCourse/${editingCourseId}`,
        {
          headers: getAuthHeaders(),
        },
      );

      if (res.data?.success) {
        toast.success(res.data?.message || "Course deleted successfully");
        setShowModal(false);
        resetForm();
        //fast ui update without refetching
        setCourses((prev) =>
          prev.filter(
            (course) => String(course._id || course.id) !== editingCourseId,
          ),
        );
      } else {
        toast.error(res.data?.message || "Failed to delete course");
      }
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Unable to delete course. Please try again."),
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <Sidebar>
      <Toaster position="top-right" />
      <TopBar />

      <section className="cm-header-card mb-4">
        <div className="cm-logo-wrap">
          <img src={logo} alt="EC Portal" className="cm-logo" />
        </div>
        <h2 className="cm-heading mb-0">EC Course Manage</h2>
      </section>

      <section className="cm-toolbar mb-3">
        <button
          type="button"
          className="btn btn-success cm-add-btn"
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
        >
          <i className="fas fa-plus me-2"></i>
          Add Course
        </button>

        <div className="cm-search-wrap">
          <i className="fas fa-search cm-search-icon"></i>
          <input
            type="text"
            className="form-control cm-search-input"
            placeholder="Search courses by title, description, teacher, class..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
      </section>

      <section className="cm-table-card">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="cm-table-head">
              <tr>
                <th>#</th>
                <th>Title</th>
                <th>Description</th>
                <th>Price</th>
                <th>Teachers / Classes</th>
                <th>Manage</th>
              </tr>
            </thead>
            <tbody>
              {loadingCourses ? (
                <tr>
                  <td colSpan="6" className="text-center py-4">
                    Loading courses...
                  </td>
                </tr>
              ) : filteredCourses.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-4">
                    No course found.
                  </td>
                </tr>
              ) : (
                filteredCourses.map((course, index) => {
                  const assignments = getCourseAssignments(course);
                  return (
                    <tr key={course._id || index}>
                      <td>{index + 1}</td>
                      <td>{course.title}</td>
                      <td className="cm-desc-cell">{course.description}</td>
                      <td>{Number(course.coursePrice || 0)}</td>
                      <td>
                        {assignments.length ? (
                          <div className="cm-teacher-listing">
                            {assignments.map((assignment) => (
                              <div
                                className="cm-teacher-row"
                                key={assignment.teacherId}
                              >
                                <span className="cm-teacher-name">
                                  {assignment.teacherName}
                                </span>
                                <span className="cm-teacher-classes">
                                  {assignment.classes.length
                                    ? `${assignment.classes.join(", ")} class${assignment.classes.length > 1 ? "es" : ""}`
                                    : "No class selected"}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted">No teacher linked</span>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => handleEdit(course)}
                        >
                          <i className="fas fa-sliders me-1"></i>Manage
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showModal && (
        <div
          className="cm-modal-backdrop"
          onClick={() => {
            setShowModal(false);
            resetForm();
          }}
        >
          <div className="cm-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0">
                {isEditMode ? "Manage Course" : "Add New Course"}
              </h5>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="row g-3">
                <div className="col-12">
                  <label className="form-label">Course Title</label>
                  <input
                    name="title"
                    type="text"
                    className="form-control"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    placeholder="Enter course title"
                  />
                </div>

                <div className="col-12">
                  <label className="form-label">Description</label>
                  <textarea
                    name="description"
                    className="form-control"
                    rows="3"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Enter course description"
                  ></textarea>
                </div>

                <div className="col-12">
                  <label className="form-label">Course Price</label>
                  <input
                    name="coursePrice"
                    type="number"
                    min="0"
                    className="form-control"
                    value={formData.coursePrice}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        coursePrice: e.target.value,
                      }))
                    }
                    placeholder="Enter course price"
                  />
                </div>

                <div className="col-12">
                  <label className="form-label d-flex justify-content-between align-items-center">
                    <span>Select Teachers and Classes</span>
                    {loadingTeachers && (
                      <small className="text-muted">Loading...</small>
                    )}
                  </label>

                  <div className="cm-teacher-list">
                    {teachers.length === 0 ? (
                      <div className="text-muted small">
                        No teacher available.
                      </div>
                    ) : (
                      teachers.map((teacher) => {
                        const teacherId = String(teacher._id || teacher.id);
                        const isSelected = formData.teacherAssignments.some(
                          (item) => item.teacherId === teacherId,
                        );
                        const selectedClasses =
                          getTeacherAssignment(teacherId)?.classes || [];

                        return (
                          <div className="cm-teacher-item" key={teacherId}>
                            <label className="cm-teacher-item-head">
                              <input
                                type="checkbox"
                                className="form-check-input"
                                checked={isSelected}
                                onChange={() =>
                                  toggleTeacherSelection(teacherId)
                                }
                              />
                              <span>
                                {teacher.name}{" "}
                                <small className="text-muted">
                                  ({teacher.email})
                                </small>
                              </span>
                            </label>

                            {isSelected && (
                              <div className="cm-class-button-wrap">
                                {CLASS_OPTIONS.map((className) => {
                                  const active =
                                    selectedClasses.includes(className);
                                  return (
                                    <button
                                      key={className}
                                      type="button"
                                      className={`cm-class-btn ${active ? "active" : ""}`}
                                      onClick={() =>
                                        toggleTeacherClass(teacherId, className)
                                      }
                                    >
                                      {className}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              <div className="d-flex justify-content-end gap-2 mt-4">
                {isEditMode &&
                  (deleteLoading ? (
                    <button
                      type="button"
                      className="btn btn-outline-danger me-auto"
                      disabled
                    >
                      Deleting...
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-outline-danger me-auto"
                      onClick={handleDelete}
                    >
                      <i className="fas fa-trash me-1"></i>Delete Course
                    </button>
                  ))}

                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="btn btn-success"
                  disabled={submitting}
                >
                  {submitting
                    ? isEditMode
                      ? "Updating..."
                      : "Saving..."
                    : isEditMode
                      ? "Update Course"
                      : "Save Course"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Sidebar>
  );
}

export default CourseManage;
