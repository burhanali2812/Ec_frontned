import React, { useState, useEffect } from "react";
import "./AddTeacherReviews.css";
import { toast, Toaster } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Sidebar from "../Sidebar";
import Footer from "../footer";

function AddTeacherReviews() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    teacherId: "",
    teachingStyleRating: 0,
    behaviourRating: 0,
    communicationRating: 0,
    punctualityRating: 0,
    knowledgeRating: 0,
    comment: "",
  });

  const ratingCategories = [
    { key: "teachingStyleRating", label: "Teaching Style" },
    { key: "behaviourRating", label: "Behaviour & Attitude" },
    { key: "communicationRating", label: "Communication" },
    { key: "punctualityRating", label: "Punctuality" },
    { key: "knowledgeRating", label: "Knowledge & Expertise" },
  ];

  // Fetch all teachers on component mount
  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      // Fetch student's registered courses with teachers
      const coursesResponse = await fetch(
        "https://api.theecportal.com/api/registration/myCourses",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!coursesResponse.ok) {
        toast.error("Failed to fetch your courses");
      }

      const coursesData = await coursesResponse.json();
      const courses = coursesData.courses || [];

      if (courses.length === 0) {
        setTeachers([]);
        toast.error(
          "You are not registered in any courses with assigned teachers",
        );
        setLoading(false);
        return;
      }

      // Extract unique teachers from all registered courses
      const teachersSet = new Set();
      const teachersArray = [];

      courses.forEach((course) => {
        if (course.assignments && Array.isArray(course.assignments)) {
          course.assignments.forEach((assignment) => {
            const teacher = assignment.teacher;
            if (teacher && teacher._id && !teachersSet.has(teacher._id)) {
              teachersSet.add(teacher._id);
              teachersArray.push({
                _id: teacher._id,
                name: teacher.name,
                course: course.title,
              });
            }
          });
        }
      });

      setTeachers(teachersArray);
    } catch (error) {
      console.error("Error fetching teachers:", error);
      toast.error("An error occurred while fetching teachers");
    } finally {
      setLoading(false);
    }
  };

  const handleTeacherChange = (e) => {
    setFormData({ ...formData, teacherId: e.target.value });
  };

  const handleRatingClick = (ratingKey, rating) => {
    setFormData({ ...formData, [ratingKey]: rating });
  };

  const handleCommentChange = (e) => {
    setFormData({ ...formData, comment: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const {
      teacherId,
      teachingStyleRating,
      behaviourRating,
      communicationRating,
      punctualityRating,
      knowledgeRating,
    } = formData;

    if (
      !teacherId ||
      !teachingStyleRating ||
      !behaviourRating ||
      !communicationRating ||
      !punctualityRating ||
      !knowledgeRating
    ) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (formData.comment.trim() === "") {
      toast.error("Please provide a comment for your review");
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem("token");

      const response = await fetch(
        "https://api.theecportal.com/api/students/teacherReview",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            teacherId,
            teachingStyleRating,
            behaviourRating,
            communicationRating,
            punctualityRating,
            knowledgeRating,
            comment: formData.comment,
          }),
        },
      );

      const data = await response.json();

      if (response.ok) {
        toast.success("Review submitted successfully!");
        navigate("/student/dashboard");
        // Reset form
        setFormData({
          teacherId: "",
          teachingStyleRating: 0,
          behaviourRating: 0,
          communicationRating: 0,
          punctualityRating: 0,
          knowledgeRating: 0,
          comment: "",
        });
        // Clear message after 3 seconds
      } else {
        toast.error(data.message || "Failed to submit review");
      }
    } catch (error) {
      console.error("Error submitting review:", error);
      toast.error("An error occurred while submitting your review");
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (ratingKey) => {
    const currentRating = formData[ratingKey];
    return (
      <div className="stars-container">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={`star ${star <= currentRating ? "active" : ""}`}
            onClick={() => handleRatingClick(ratingKey, star)}
            aria-label={`Rate ${star} stars`}
          >
            ★
          </button>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <Sidebar>
        <div className="add-review-container">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading teachers...</p>
          </div>
        </div>
      </Sidebar>
    );
  }

  return (
    <Sidebar>
      <div className="add-review-container">
        <Toaster />
        <div className="review-card">
          <h2 className="review-title">Add Teacher Review</h2>
          <p className="review-subtitle">
            Share your detailed feedback about your teachers
          </p>

          <form onSubmit={handleSubmit} className="review-form">
            {/* Teacher Selection */}
            <div className="form-group">
              <label htmlFor="teacher" className="form-label">
                Select Teacher <span className="required">*</span>
              </label>
              <select
                id="teacher"
                value={formData.teacherId}
                onChange={handleTeacherChange}
                className="form-input select-input"
                required
              >
                <option value="">-- Choose a Teacher --</option>
                {teachers.map((teacher) => (
                  <option key={teacher._id} value={teacher._id}>
                    {teacher.name} ({teacher.course || "Course N/A"})
                  </option>
                ))}
              </select>
            </div>

            {/* Rating Categories */}
            <div className="ratings-section">
              <h3 className="ratings-title">
                Rate the Teacher Across Different Criteria
              </h3>
              {ratingCategories.map((category) => (
                <div key={category.key} className="form-group rating-group">
                  <label className="form-label">
                    {category.label} <span className="required">*</span>
                  </label>
                  <div className="rating-category">
                    {renderStars(category.key)}
                    {formData[category.key] > 0 && (
                      <p className="rating-display">
                        {formData[category.key]}/5
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Comment */}
            <div className="form-group">
              <label htmlFor="comment" className="form-label">
                Additional Comments <span className="required">*</span>
              </label>
              <textarea
                id="comment"
                value={formData.comment}
                onChange={handleCommentChange}
                placeholder="Share any additional feedback... (max 500 characters)"
                maxLength={500}
                className="form-input textarea-input"
                rows="4"
              />
              <p className="char-count">{formData.comment.length}/500</p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="submit-btn"
              disabled={
                submitting ||
                !formData.teacherId ||
                formData.teachingStyleRating === 0 ||
                formData.behaviourRating === 0 ||
                formData.communicationRating === 0 ||
                formData.punctualityRating === 0 ||
                formData.knowledgeRating === 0
              }
            >
              {submitting ? (
                <>
                  <span className="spinner-small"></span> Submitting...
                </>
              ) : (
                "Submit Review"
              )}
            </button>
          </form>

          {teachers.length === 0 && !loading && (
            <div className="no-teachers">
              <p>No teachers available. Please try again later.</p>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </Sidebar>
  );
}

export default AddTeacherReviews;
