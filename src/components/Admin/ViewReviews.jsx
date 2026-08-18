import React, { useState, useEffect } from "react";
import "./ViewReviews.css";
import Sidebar from "../Sidebar";
import Footer from "../footer";
import { toast, Toaster } from "react-hot-toast";

function ViewReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [marking, setMarking] = useState(null);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const response = await fetch(
        "https://ec-backend-phi.vercel.app/api/admin/getTeacherReviews",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch reviews");
      }

      const data = await response.json();
      setReviews(data.reviews || []);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      toast.error("An error occurred while fetching reviews");
    } finally {
      setLoading(false);
    }
  };

  // Group reviews by teacher
  const groupedByTeacher = reviews.reduce((acc, review) => {
    const teacherId = review.teacher._id;
    if (!acc[teacherId]) {
      acc[teacherId] = {
        teacher: review.teacher,
        reviews: [],
      };
    }
    acc[teacherId].reviews.push(review);
    return acc;
  }, {});

  const teacherCards = Object.values(groupedByTeacher);

  const selectedTeacherData = selectedTeacher
    ? groupedByTeacher[selectedTeacher]
    : null;
  const filteredReviews = selectedTeacherData
    ? selectedTeacherData.reviews
    : [];

  const handleMarkAsSeen = async (reviewId) => {
    try {
      setMarking(reviewId);
      const token = localStorage.getItem("token");

      const response = await fetch(
        `https://ec-backend-phi.vercel.app/api/admin/updateReviewStatus/${reviewId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to update review status");
      }

      // Remove the review from the list
      const updatedReviews = reviews.filter((r) => r._id !== reviewId);
      setReviews(updatedReviews);
      toast.success("Review marked as seen");
    } catch (error) {
      console.error("Error updating review status:", error);
      toast.error("Failed to update review status. Please try again.");
    } finally {
      setMarking(null);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
      time: date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  };

  const renderStars = (rating) => {
    return (
      <div className="stars-container">
        {[...Array(5)].map((_, i) => (
          <span key={i} className={`star ${i < rating ? "filled" : "empty"}`}>
            ★
          </span>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <Sidebar>
        <div className="view-reviews-container">
          <Toaster />
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading reviews...</p>
          </div>
        </div>
      </Sidebar>
    );
  }

  return (
    <Sidebar>
      <div className="view-reviews-container">
        <div className="reviews-header">
          <h1 className="reviews-title">Teacher Reviews</h1>
          <p className="reviews-subtitle">Manage and review student feedback</p>
        </div>

        {reviews.length === 0 ? (
          <div className="no-reviews">
            <p>No pending reviews to display</p>
          </div>
        ) : (
          <>
            {/* Teacher Cards */}
            <div className="teachers-cards-section">
              <h2 className="section-title">Teachers with Reviews</h2>
              <div className="teachers-cards-grid">
                {teacherCards.map((card) => (
                  <div
                    key={card.teacher._id}
                    className={`teacher-card ${selectedTeacher === card.teacher._id ? "active" : ""}`}
                    onClick={() => setSelectedTeacher(card.teacher._id)}
                  >
                    <div className="teacher-card-content">
                      <h3 className="teacher-name">{card.teacher.name}</h3>

                      <div className="review-count-badge">
                        {card.reviews.length}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Reviews Table */}
            {selectedTeacherData && (
              <div className="reviews-table-section">
                <div className="table-header">
                  <h2 className="section-title">
                    Reviews for {selectedTeacherData.teacher.name}
                  </h2>
                  <button
                    className="clear-selection-btn"
                    onClick={() => setSelectedTeacher(null)}
                  >
                    ✕ Clear Selection
                  </button>
                </div>

                {filteredReviews.length === 0 ? (
                  <div className="no-reviews-for-teacher">
                    <p>No reviews for this teacher</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="reviews-table text-center">
                      <thead>
                        <tr className="text-center">
                          <th className="text-center">Teaching Style</th>
                          <th className="text-center">Behaviour</th>
                          <th className="text-center">Communication</th>
                          <th className="text-center">Punctuality</th>
                          <th className="text-center">Knowledge</th>
                          <th className="text-center">Comment</th>
                          <th className="text-center">Date & Time</th>
                          <th className="text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredReviews.map((review) => {
                          const { date, time } = formatDate(review.createdAt);
                          return (
                            <tr key={review._id}>
                              <td className="rating-cell">
                                {renderStars(review.teachingStyleRating)}
                              </td>
                              <td className="rating-cell">
                                {renderStars(review.behaviourRating)}
                              </td>
                              <td className="rating-cell">
                                {renderStars(review.communicationRating)}
                              </td>
                              <td className="rating-cell">
                                {renderStars(review.punctualityRating)}
                              </td>
                              <td className="rating-cell">
                                {renderStars(review.knowledgeRating)}
                              </td>
                              <td className="comment-cell">
                                <div className="comment-text">
                                  {review.comment || "No comment"}
                                </div>
                              </td>
                              <td className="datetime-cell">
                                <div className="datetime">
                                  <div className="date">{date}</div>
                                  <div className="time">{time}</div>
                                </div>
                              </td>
                              <td className="action-cell">
                                <button
                                  className="seen-btn"
                                  onClick={() => handleMarkAsSeen(review._id)}
                                  disabled={marking === review._id}
                                >
                                  {marking === review._id
                                    ? "Marking..."
                                    : "Mark Seen"}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
      <Footer />
    </Sidebar>
  );
}

export default ViewReviews;
