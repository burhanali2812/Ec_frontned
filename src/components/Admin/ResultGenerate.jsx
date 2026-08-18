import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast, Toaster } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import Sidebar from "../Sidebar";
import Footer from "../footer";
import "./ResultGenerate.css";
import {useAppContext} from "../../contextApi/AppContext";


const API_BASE = "https://ec-backend-phi.vercel.app/api";

function ResultGenerate({ adminLoginType = "academy" }) {
  const navigate = useNavigate();
  const { classOptions, students } = useAppContext();
const CLASS_OPTIONS = classOptions || [];

  const [selectedClass, setSelectedClass] = useState(null);

useEffect(() => {
  if (CLASS_OPTIONS.length && !selectedClass) {
    setSelectedClass(CLASS_OPTIONS[0]);
  }
}, [CLASS_OPTIONS, selectedClass]);
  const [searchText, setSearchText] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [registeredCourses, setRegisteredCourses] = useState([]);
  const [selectedCourseIds, setSelectedCourseIds] = useState(["all"]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

 

 const studentCounts = useMemo(() => {
  return CLASS_OPTIONS.reduce((acc, classData) => {
    acc[classData.name] = students.filter(
      (student) =>
        student.classInfo === classData._id ||
        student.classInfo?._id === classData._id
    ).length;

    return acc;
  }, {});
}, [students, CLASS_OPTIONS]);

  const visibleStudents = useMemo(() => {
  const byClass = students.filter(
  (student) =>
    student.classInfo === selectedClass?._id ||
    student.classInfo?._id === selectedClass?._id
);

    if (!searchText.trim()) {
      return byClass;
    }

    const query = searchText.trim().toLowerCase();
    return byClass.filter((student) => {
      const name = student.name?.toLowerCase() || "";
      const rollNumber = String(student.rollNumber || "").toLowerCase();
      return name.includes(query) || rollNumber.includes(query);
    });
  }, [students, selectedClass, searchText]);

  const normalizedCourses = useMemo(() => {
    const courseMap = new Map();

    registeredCourses.forEach((course) => {
      const id = String(course?._id || course?.id || "");
      if (!id) return;
      courseMap.set(id, {
        _id: id,
        title: course?.title || course?.name || "Course",
        description: course?.description || "",
      });
    });

    return Array.from(courseMap.values());
  }, [registeredCourses]);

  const openResultModal = async (student) => {
    setSelectedStudent(student);
    setShowModal(true);
    setModalLoading(true);
    setRegisteredCourses([]);
    setSelectedCourseIds(["all"]);
    setStartDate("");
    setEndDate("");

    try {
      const response = await axios.get(
        `${API_BASE}/registration/getStudentCourses/${student._id}`,
        {
          headers: getAuthHeaders(),
        },
      );

      const coursesFromApi = response.data?.courses || [];
      const aboutCourses = response.data?.aboutCourse || [];
      const mergedCourses = [
        ...coursesFromApi,
        ...aboutCourses.map((item) => item?.course).filter(Boolean),
      ].filter(Boolean);

      const uniqueCourses = Array.from(
        new Map(
          mergedCourses.map((course) => [String(course._id || course.id), course]),
        ).values(),
      );

      setRegisteredCourses(uniqueCourses);
    } catch (error) {
      console.error("Error loading student courses:", error);
      toast.error("Unable to load registered courses");
    } finally {
      setModalLoading(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedStudent(null);
    setRegisteredCourses([]);
    setSelectedCourseIds(["all"]);
    setStartDate("");
    setEndDate("");
    setModalLoading(false);
  };

  const isAllSelected = selectedCourseIds.includes("all");

  const toggleAllCourses = () => {
    setSelectedCourseIds((prev) =>
      prev.includes("all")
        ? []
        : ["all", ...normalizedCourses.map((course) => String(course._id))],
    );
  };

  const toggleCourse = (courseId) => {
    setSelectedCourseIds((prev) => {
      const filtered = prev.filter((value) => value !== "all");
      if (filtered.includes(courseId)) {
        return filtered.filter((value) => value !== courseId);
      }

      return [...filtered, courseId];
    });
  };

  const handleDone = () => {
    if (!selectedStudent) {
      toast.error("Select a student first");
      return;
    }

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      toast.error("Start date cannot be after end date");
      return;
    }

    const cleanCourseIds = isAllSelected
      ? "all"
      : selectedCourseIds.filter((value) => value !== "all").join(",");

    const searchParams = new URLSearchParams();
    searchParams.set("courses", cleanCourseIds || "all");
    if (startDate) searchParams.set("start", startDate);
    if (endDate) searchParams.set("end", endDate);

    const selectedCourses = isAllSelected
      ? normalizedCourses
      : normalizedCourses.filter((course) =>
          selectedCourseIds.includes(String(course._id)),
        );

    closeModal();

    navigate(
      `/admin/result-report/${selectedStudent._id}?${searchParams.toString()}`,
      {
        state: {
          student: selectedStudent,
          selectedCourses,
          startDate,
          endDate,
          courses: cleanCourseIds,
        },
      },
    );
  };

  return (
    <Sidebar>
      <div className="rg-page py-3 py-lg-4">
        <Toaster position="top-right" />

        <div className="rg-shell p-3 p-lg-4 mb-3">
          <div className="rg-header">
            <div>
              <h1 className="rg-title">Result Generate</h1>
              <p className="rg-subtitle">
                Pick a class, search a student, and generate a printable result report.
              </p>
            </div>
            <div className="rg-badge">{students.length} Students</div>
          </div>

          <div className="rg-count-grid">
            {CLASS_OPTIONS.map((classData) => (
              <div
                key={classData._id}
               className={`rg-class-card ${
  selectedClass?._id === classData._id ? "active" : ""
}`}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedClass(classData)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedClass(classData);
                  }
                }}
              >
                <div className="rg-class-label">Class</div>
                <div className="rg-class-name">{classData.name}</div>
                <div className="rg-class-count">{studentCounts[classData.name] || 0}</div>
              </div>
            ))}
          </div>

          <div className="rg-table-card">
            <div className="rg-table-head">
              <div>
                <h2 className="rg-table-title">
  {selectedClass?.name || "Students"} Students
</h2>
                <div className="text-muted small">
                 {visibleStudents.length} of {studentCounts[selectedClass?.name] || 0} students shown
                </div>
              </div>

              <div className="rg-search-wrap">
                <i className="fa-solid fa-magnifying-glass rg-search-icon" />
                <input
                  type="text"
                  className="form-control rg-search-input"
                  placeholder="Search by student name or roll number"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </div>
            </div>

            <div className="table-responsive">
              <table className="table align-middle rg-student-table">
                <thead>
                  <tr>
                    <th>Roll Number</th>
                    <th>Name</th>
                    <th>Class</th>
                    <th>Gender</th>
                    <th>Contact</th>
                    <th className="text-end">Action</th>
                  </tr>
                </thead>
                <tbody>
                  { visibleStudents.length ? (
                    visibleStudents.map((student) => (
                      <tr key={student._id}>
                        <td>
                          <span className="rg-badge">
                            {student.rollNumber || "N/A"}
                          </span>
                        </td>
                        <td className="fw-semibold">
                          {student.name || "Unnamed Student"}
                        </td>
                        <td>{student.classInfo?.name || student.className || "-"}</td>
                        <td>{student.gender || "-"}</td>
                        <td>{student.contact || "-"}</td>
                        <td className="text-end">
                          <button
                            type="button"
                            className="btn btn-dark"
                            onClick={() => openResultModal(student)}
                          >
                            Generate Report
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center py-4 text-muted">
                        No students found for the selected class.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {showModal && selectedStudent && (
          <div className="rg-modal-backdrop" onClick={closeModal}>
            <div className="rg-modal" onClick={(event) => event.stopPropagation()}>
              <div className="rg-modal-head">
                <div>
                  <h3 className="rg-modal-title">Generate Result Report</h3>
                  <div className="text-muted small">
                    {selectedStudent.name} • {selectedStudent.rollNumber}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={closeModal}
                >
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>

              <div className="rg-modal-body">
                <div className="rg-modal-card mb-3">
                  <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <div>
                      <div className="fw-bold text-dark">Registered Courses</div>
                      <div className="text-muted small">
                        Select the courses to include in the report. Choose All Courses to
                        include every registered subject.
                      </div>
                    </div>
                    <span className="rg-badge">{normalizedCourses.length} Courses</span>
                  </div>

                  {modalLoading ? (
                    <div className="text-center py-4">Loading courses...</div>
                  ) : normalizedCourses.length ? (
                    <div className="rg-course-list">
                      <label className={`rg-course-option ${isAllSelected ? "active" : ""}`}>
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          onChange={toggleAllCourses}
                        />
                        <div>
                          <div className="rg-course-name">All Courses</div>
                          <div className="rg-course-meta">
                            Include every registered course in the report
                          </div>
                        </div>
                      </label>

                      {normalizedCourses.map((course) => {
                        const courseId = String(course._id);
                        const checked = selectedCourseIds.includes(courseId) || isAllSelected;

                        return (
                          <label
                            key={courseId}
                            className={`rg-course-option ${checked ? "active" : ""}`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleCourse(courseId)}
                            />
                            <div>
                              <div className="rg-course-name">{course.title}</div>
                              {course.description ? (
                                <div className="rg-course-meta">{course.description}</div>
                              ) : null}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="alert alert-info mb-0 mt-3">
                      No registered courses found for this student.
                    </div>
                  )}
                </div>

                <div className="rg-date-grid">
                  <div className="rg-date-field">
                    <label>Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="rg-date-field">
                    <label>End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="rg-modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button type="button" className="btn btn-primary" onClick={handleDone}>
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        <Footer />
      </div>
    </Sidebar>
  );
}

export default ResultGenerate;

