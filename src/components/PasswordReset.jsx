import React, { useState } from "react";
import axios from "axios";
import { Toaster, toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import "./PasswordReset.css";

function PasswordReset() {
  const [step, setStep] = useState(1); // Step 1: Email, Step 2: Security, Step 3: Password
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [userDetails, setUserDetails] = useState(null);
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [securityQuestion, setSecurityQuestion] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  
  //role is coming from navigation of login
  const role = location.state?.role ; 
  console.log("role", role)

  const finalRole = role === "Student" ? "students" : "teacher"
  console.log("finalRole", finalRole)

  const API_BASE = `https://ec-backend-phi.vercel.app/api/${finalRole}`;   

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Step 1: Verify Email
  const handleVerifyEmail = async (e) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error("Please enter your email");
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post(
        `${API_BASE}/auth/verify-email-for-reset`,
        { email },
        { headers: getAuthHeaders() },
      );

      if (res.data?.success) {
        setUserDetails(res.data.user);
        setSecurityQuestion(res.data.user.securityQuestion);
        console.log("Security Question:", res.data.user.securityQuestion);

        setStep(2);
        toast.success("Email verified! Proceeding to security verification");
      }
    } catch (error) {
      console.error("Error verifying email:", error);
      toast.error(
        error.response?.data?.message ||
          "Failed to verify email. Please check and try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify Security Answer or Set Security
  const handleSecurityVerification = async (e) => {
    e.preventDefault();

    if (!securityAnswer.trim()) {
      toast.error("Please enter the security answer");
      return;
    }

    try {
      setLoading(true);
      const endpoint = userDetails?.isSecuritySet
        ? `${API_BASE}/verifySecurityAnswer`
        : `${API_BASE}/setSecurityQuestion`;

      const payload = userDetails?.isSecuritySet
        ? { email, securityAnswer }
        : { email, securityQuestion, securityAnswer };

      const res = await axios.post(endpoint, payload, {
        headers: getAuthHeaders(),
      });

      if (res.data?.success) {
        setStep(3);
        toast.success(
          userDetails?.isSecuritySet
            ? "Security answer verified! Now reset your password"
            : "Security answer set! Now reset your password",
        );
      }
    } catch (error) {
      console.error("Error in security verification:", error);
      toast.error(
        error.response?.data?.message ||
          "Security answer is incorrect. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (!oldPassword.trim()) {
      toast.error("Please enter your old password");
      return;
    }
    if (!newPassword.trim()) {
      toast.error("Please enter a new password");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (oldPassword === newPassword) {
      toast.error("New password must be different from old password");
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post(
        `${API_BASE}/resetPassword`,
        {
          email,
          currentPassword: oldPassword,
          newPassword,
        },
        { headers: getAuthHeaders() },
      );

      if (res.data?.success) {
        toast.success("Password reset successfully!");
        // Reset form
        setEmail("");
        setUserDetails(null);
        setSecurityAnswer("");
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setSecurityQuestion("");
        navigate("/");
      }
    } catch (error) {
      console.error("Error resetting password:", error);
      toast.error(
        error.response?.data?.message ||
          "Failed to reset password. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setEmail("");
    setUserDetails(null);
    setSecurityAnswer("");
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setSecurityQuestion("");
  };

  return (
    <div className="password-reset-container">
        <Toaster />
      <div className="password-reset-wrapper">
        {/* Header */}
        <div className="reset-header">
          <div className="reset-icon">
            <i className="fas fa-lock"></i>
          </div>
          <h1 className="reset-title">Password Reset</h1>
          <p className="reset-subtitle">Securely reset your account password</p>
        </div>

        {/* Progress Indicator */}
        <div className="progress-container">
          <div className={`progress-step ${step >= 1 ? "active" : ""}`}>
            <div className="step-number">1</div>
            <div className="step-label">Email</div>
          </div>
          <div className={`progress-line ${step > 1 ? "active" : ""}`}></div>
          <div className={`progress-step ${step >= 2 ? "active" : ""}`}>
            <div className="step-number">2</div>
            <div className="step-label">Security</div>
          </div>
          <div className={`progress-line ${step > 2 ? "active" : ""}`}></div>
          <div className={`progress-step ${step >= 3 ? "active" : ""}`}>
            <div className="step-number">3</div>
            <div className="step-label">Password</div>
          </div>
        </div>

        {/* Step 1: Email Verification */}
        {step === 1 && (
          <form onSubmit={handleVerifyEmail} className="reset-form">
            <div className="form-section">
              <label className="form-label">Email Address</label>
              <div className="input-group">
                <i className="fas fa-envelope input-icon"></i>
                <input
                  type="email"
                  placeholder="Enter your registered email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                  disabled={loading}
                />
              </div>
        
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin me-2"></i>
                  Verifying...
                </>
              ) : (
                <>
                  <i className="fas fa-arrow-right me-2"></i>
                  Continue
                </>
              )}
            </button>
          </form>
        )}

        {/* Step 2: Security Verification or Setup */}
        {step === 2 && userDetails && (
          <form onSubmit={handleSecurityVerification} className="reset-form">
            {/* User Details Display */}
            <div className="user-details-box">
              <div className="user-detail">
                <i className="fas fa-user-circle"></i>
                <div>
                  <span className="detail-label">Name</span>
                  <span className="detail-value">{userDetails.name}</span>
                </div>
              </div>
              <div className="user-detail">
                <i className="fas fa-envelope"></i>
                <div>
                  <span className="detail-label">Email</span>
                  <span className="detail-value">{userDetails.email}</span>
                </div>
              </div>
            </div>

            {/* Security Section */}
            <div className="form-section">
              {userDetails.isSecuritySet ? (
                <>
                  <label className="form-label">
                    <i className="fas fa-shield-alt"></i> Security Question
                  </label>
                  <div className="security-question-box">
                    <p>{securityQuestion}</p>
                  </div>
                </>
              ) : (
                <>
                  <label className="form-label">
                    <i className="fas fa-shield-alt"></i> Setup Security
                    Question
                  </label>
                  <p className="form-hint">
                    This is your first time setting up security. Choose a
                    security question below:
                  </p>
                  <select
                    value={securityQuestion}
                    onChange={(e) => setSecurityQuestion(e.target.value)}
                    className="form-select"
                    disabled={loading}
                  >
                    <option value="">Select a security question</option>
                    <option value="What is your mother's maiden name?">
                      What is your mother's maiden name?
                    </option>
                    <option value="What was the name of your first pet?">
                      What was the name of your first pet?
                    </option>
                    <option value="In what city were you born?">
                      In what city were you born?
                    </option>
                    <option value="What is your favorite movie?">
                      What is your favorite movie?
                    </option>
                    <option value="What was your high school name?">
                      What was your high school name?
                    </option>
                      <option value="What was your first mobile name?">
                      What was your first mobile name?
                    </option>
                  </select>
                </>
              )}

              <label className="form-label">Answer</label>
              <div className="input-group">
                <i className="fas fa-key input-icon"></i>
                <input
                  type="text"
                  placeholder="Enter your security answer"
                  value={securityAnswer}
                  onChange={(e) => setSecurityAnswer(e.target.value)}
                  className="form-input"
                  disabled={loading}
                />
              </div>
             <p className="form-hint">
  {userDetails.isSecuritySet
    ? "Verify your security answer to proceed"
    : "This answer will be used to verify your identity in the future, so choose something memorable but not easily guessable. This is case-sensitive (Abc and abc are different)."}
</p>

{!userDetails.isSecuritySet && (
  <div className="security-warning">
    <i className="fa-solid fa-triangle-exclamation"></i>{" "}
    <span>
      Warning: Please note down your answer somewhere safe. Incorrect or forgotten answers may block future account recovery.
    </span>
  </div>
)}
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setStep(1)}
                disabled={loading}
              >
                <i className="fas fa-arrow-left me-2"></i>
                Back
              </button>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? (
                  <>
                    <i className="fas fa-spinner fa-spin me-2"></i>
                    Verifying...
                  </>
                ) : (
                  <>
                    <i className="fas fa-arrow-right me-2"></i>
                    Continue
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Password Reset */}
        {step === 3 && (
          <form onSubmit={handleResetPassword} className="reset-form">
            <div className="form-section">
              <label className="form-label">Current Password</label>
              <div className="input-group">
                <i className="fas fa-lock input-icon"></i>
                <input
                  type={showOldPassword ? "text" : "password"}
                  placeholder="Enter your current password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="form-input"
                  disabled={loading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowOldPassword(!showOldPassword)}
                >
                  <i
                    className={`fas fa-eye${!showOldPassword ? "-slash" : ""}`}
                  ></i>
                </button>
              </div>
            </div>

            <div className="form-section">
              <label className="form-label">New Password</label>
              <div className="input-group">
                <i className="fas fa-lock input-icon"></i>
                <input
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Enter your new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="form-input"
                  disabled={loading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  <i
                    className={`fas fa-eye${!showNewPassword ? "-slash" : ""}`}
                  ></i>
                </button>
              </div>
              <div className="password-strength">
                <div
                  className={`strength-bar ${getPasswordStrength(newPassword)}`}
                ></div>
                <span className="strength-text">
                  {getPasswordStrengthText(newPassword)}
                </span>
              </div>
            </div>

            <div className="form-section">
              <label className="form-label">Confirm Password</label>
              <div className="input-group">
                <i className="fas fa-lock input-icon"></i>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="form-input"
                  disabled={loading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <i
                    className={`fas fa-eye${!showConfirmPassword ? "-slash" : ""}`}
                  ></i>
                </button>
              </div>
              {confirmPassword && newPassword === confirmPassword && (
                <p className="match-success">
                  <i className="fas fa-check-circle"></i> Passwords match!
                </p>
              )}
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="match-error">
                  <i className="fas fa-times-circle"></i> Passwords do not match
                </p>
              )}
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setStep(2)}
                disabled={loading}
              >
                <i className="fas fa-arrow-left me-2"></i>
                Back
              </button>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? (
                  <>
                    <i className="fas fa-spinner fa-spin me-2"></i>
                    Resetting...
                  </>
                ) : (
                  <>
                    <i className="fas fa-check me-2"></i>
                    Reset Password
                  </>
                )}
              </button>
            </div>
          </form>
        )}

      
      </div>
    </div>
  );
}

// Helper function to get password strength
function getPasswordStrength(password) {
  if (!password) return "weak";
  if (password.length < 6) return "weak";
  if (password.length < 10) return "medium";
  if (/[A-Z]/.test(password) && /[0-9]/.test(password)) return "strong";
  return "medium";
}

// Helper function to get password strength text
function getPasswordStrengthText(password) {
  const strength = getPasswordStrength(password);
  if (strength === "weak") return "Weak";
  if (strength === "medium") return "Medium";
  if (strength === "strong") return "Strong";
  return "Very Weak";
}

export default PasswordReset;
