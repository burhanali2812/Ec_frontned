import React, { useState } from "react";
import dp from "../images/dp.png";
import { useNavigate } from "react-router-dom";
import imageCompression from "browser-image-compression";

function Signup() {
  const navigate = useNavigate();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewURL, setPreviewURL] = useState(null);
  const [selectedClassType, setSelectedClassType] =
    useState("Choose Class Type");
  const bgColor = "rgb(9, 28, 50)";
  const textColor = "#FF9800";

  const togglePassword = () => {
    setPasswordVisible(!passwordVisible);
  };
  const handleLogin = () => {
    navigate("/login");
  };

  const compressAndSetImage = async (e, setPreview, setFileState) => {
    const file = e.target.files[0];
    if (!file) return;

    const options = {
      maxSizeMB: 0.6,
      maxWidthOrHeight: 800,
      useWebWorker: true,
    };

    try {
      const compressedFile = await imageCompression(file, options);
      console.log("Original:", file.size / 1024 / 1024, "MB");
      console.log("Compressed:", compressedFile.size / 1024 / 1024, "MB");

      setPreview(URL.createObjectURL(compressedFile));
      setFileState(compressedFile);
      console.log(selectedImage);
    } catch (error) {
      console.error("Compression failed:", error);
    }
  };
  return (
    <div className="container">
      <div className="d-flex justify-content-center align-items-center min-vh-100 ">
        <div
          className="card  p-4 text-dark"
          style={{
            width: "100%",
            maxWidth: "400px",
            background: bgColor, // light grey gradient
            border: "none",
            borderRadius: "15px",
          }}
        >
          <div className="d-flex justify-content-center mb-4">
            <img
              src={dp}
              alt="Logo3"
              width="110"
              height="110"
              class="d-inline-block align-text-top"
            />
          </div>
          <hr
            className="mx-0"
            style={{
              borderTop: "2px solid #FF9800",
              opacity: 1,
              marginTop: "-0px",
              color: "#FF9800",
            }}
          />

          {/* profile image*/}

          <div className="text-center mt-3 d-flex justify-content-center">
            <div
              style={{
                width: "110px",
                height: "130px",
                borderRadius: "5%",
                border: "3px solid #FF9800",
                backgroundColor: "#203a43",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "80px",
                color: "white",
              }}
              className="mb-2"
            >
              {previewURL ? (
                <img
                  src={previewURL}
                  alt="Profile"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <>
                <i className="fas fa-user"></i>
                </>
              )}
            </div>
          </div>

          <div className="mb-3 input-group mt-2">
            <span
              className="input-group-text"
              id="addon-profileimage"
              style={{
                backgroundColor: textColor, // Navy blue background
                color: bgColor, // Optional: Orange icon/text
                border: "none",
              }}
            >
              <i className="fas fa-image"></i>
            </span>
            <input
              type="file"
              className="form-control"
              aria-describedby="addon-profileimage"
              onChange={(e) =>
                compressAndSetImage(e, setPreviewURL, setSelectedImage)
              }
            />
          </div>

          {/* Username Field */}
          <div className="input-group flex-nowrap mb-3">
            <span
              className="input-group-text"
              id="addon-name"
              style={{
                backgroundColor: textColor, // Navy blue background
                color: bgColor, // Optional: Orange icon/text
                border: "none",
              }}
            >
              <i className="fas fa-user"></i>
            </span>
            <input
              type="text"
              className="form-control"
              placeholder="Enter Your Name"
              aria-label="Name"
              aria-describedby="addon-name"
            />
          </div>
          {/* email Field */}
          <div className="input-group flex-nowrap mb-3">
            <span
              className="input-group-text"
              id="addon-email"
              style={{
                backgroundColor: textColor, // Navy blue background
                color: bgColor, // Optional: Orange icon/text
                border: "none",
              }}
            >
              <i class="fa-solid fa-envelope"></i>
            </span>
            <input
              type="email"
              className="form-control"
              placeholder="Enter Your Email"
              aria-label="email"
              aria-describedby="addon-email"
            />
          </div>

          {/* {Contact} */}
          <div className="input-group flex-nowrap mb-3">
            <span
              className="input-group-text"
              id="addon-Contact Number"
              style={{
                backgroundColor: textColor, // Navy blue background
                color: bgColor, // Optional: Orange icon/text
                border: "none",
              }}
            >
              <i className="fas fa-phone"></i>
            </span>
            <input
              type="number"
              className="form-control"
              placeholder="Contact Number"
              aria-label="Contact Number"
              aria-describedby="addon-Contact Number"
            />
          </div>
          {/* gender Field */}
          <div className="input-group flex-nowrap mb-3">
            <span
              className="input-group-text"
              id="addon-Gender"
              style={{
                backgroundColor: textColor, // Navy blue background
                color: bgColor, // Orange icon/text
                border: "none",
              }}
            >
              <i className="fas fa-venus-mars"></i>
            </span>
            <select
              className="form-select"
              aria-label="Gender"
              aria-describedby="addon-Gender"
              style={{
                borderLeft: "none", // To blend with icon box
              }}
            >
              <option value="">Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>

          {/* address Field */}
          <div className="input-group flex-nowrap mb-3">
            <span
              className="input-group-text"
              id="addon-Address"
              style={{
                backgroundColor: textColor, // Navy blue background
                color: bgColor, // Optional: Orange icon/text
                border: "none",
              }}
            >
              <i className="fas fa-map-marker-alt"></i>
            </span>
            <input
              type="text"
              className="form-control"
              placeholder="Home Address"
              aria-label="Home Address"
              aria-describedby="addon-Address"
            />
          </div>

          <hr
            className="mx-0"
            style={{
              borderTop: "2px solid #FF9800",
              opacity: 1,
              marginTop: "-0px",
              color: "#FF9800",
            }}
          />

          <div
            className="d-flex flex-wrap gap-2 justify-content-xl-center mb-3"
            style={{ maxWidth: "100%" }}
          >
            <input type="checkbox" className="btn-check" id="btncheck9" />
            <label className="btn btn-outline-warning" htmlFor="btncheck9">
              Basic CSC
            </label>
            <input type="checkbox" className="btn-check" id="btncheck9" />
            <label className="btn btn-outline-warning" htmlFor="btncheck9">
              Advance CSC
            </label>
            <input type="checkbox" className="btn-check" id="btncheck9" />
            <label className="btn btn-outline-warning" htmlFor="btncheck9">
              kids CSC
            </label>
          </div>

          <div className="dropdown w-100">
            <button
              className="btn dropdown-toggle w-100 mb-4"
              type="button"
              id="dropdownMenuButton1"
              data-bs-toggle="dropdown"
              aria-expanded="false"
              style={{
                background: textColor,
                color: bgColor,
              }}
            >
              {selectedClassType}
            </button>

            <ul
              className="dropdown-menu w-100"
              aria-labelledby="dropdownMenuButton1"
            >
              <li>
                <button
                  className="dropdown-item btn btn-light"
                  onClick={() => setSelectedClassType("Physical")}
                >
                  Physical
                </button>
              </li>
              <li>
                <button
                  className="dropdown-item btn btn-light"
                  onClick={() => setSelectedClassType("Online")}
                >
                  Online
                </button>
              </li>
            </ul>
          </div>

          <div className="input-group flex-nowrap mb-3">
            <span
              className="input-group-text"
              id="addon-Shop Number"
              style={{
                backgroundColor: textColor, // Navy blue background
                color: bgColor, // Optional: Orange icon/text
                border: "none",
              }}
            >
              <i className="fas fa-store"></i>
            </span>
            <input
              type="number"
              className="form-control "
              placeholder="Shop Number"
              aria-label="Shop Number"
              aria-describedby="addon-Shop Number"
            />
          </div>
          {/* Password Field */}
          <div className="input-group flex-nowrap mb-4">
            <span
              className="input-group-text"
              id="addon-password"
              style={{
                backgroundColor: textColor, // Navy blue background
                color: bgColor, // Optional: Orange icon/text
                border: "none",
              }}
            >
              <i className="fas fa-lock"></i>
            </span>
            <input
              type={passwordVisible === true ? "text" : "password"}
              className="form-control"
              placeholder="Password"
              aria-label="Password"
              aria-describedby="addon-password"
            />
            <button
              className="btn"
              type="button"
              onClick={togglePassword}
              tabIndex={-1}
              style={{ color: bgColor, background: textColor }}
            >
              <i
                className={`fas ${passwordVisible ? "fa-eye-slash" : "fa-eye"}`}
              ></i>
            </button>
          </div>

          <div className="d-grid">
            <button
              className="btn"
              style={{ color: bgColor, background: textColor }}
            >
              <i className="fas fa-user-plus me-2"></i>
              Create Account
            </button>
          </div>
          <div className="d-flex justify-content-center mt-4">
            <p className="fst-italic" style={{ color: textColor }}>
              Already have an account?{" "}
              <span className="text-light fw-bold" onClick={handleLogin}>
                Login
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Signup;
