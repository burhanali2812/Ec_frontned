import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import dp from "../images/logo.png";
import Footer from "./footer";
import "./InstallApp.css";

function InstallApp() {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [checking, setChecking] = useState(true);
  const [installable, setInstallable] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressTimer = useRef(null);

  useEffect(() => {
    // 1. Already installed / running as standalone PWA -> skip straight to home
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true; // iOS Safari
    const alreadyInstalledFlag = localStorage.getItem("appInstalled") === "true";

    if (isStandalone || alreadyInstalledFlag) {
      navigate("/home", { replace: true });
      return;
    }

    // 2. Chrome fires this only if installable AND not already installed
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setInstallable(true);
      setChecking(false);
    };

    // 3. Fires once the browser confirms the install actually completed
    const handleAppInstalled = () => {
      finishInstall();
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    // Stop "checking" after a short grace period if the event never fires
    // (unsupported browser, criteria not met, etc.)
    const timeout = setTimeout(() => setChecking(false), 1500);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      clearTimeout(timeout);
      if (progressTimer.current) clearInterval(progressTimer.current);
    };
  }, [navigate]);

  const finishInstall = () => {
    if (progressTimer.current) clearInterval(progressTimer.current);
    setProgress(100);
    localStorage.setItem("appInstalled", "true");
    setTimeout(() => {
      navigate("/home", { replace: true });
    }, 500);
  };

  const startFakeProgress = () => {
    // The browser doesn't expose real install progress, so we simulate
    // a smooth progress bar while waiting for the "appinstalled" event.
    setProgress(0);
    progressTimer.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev; // hold near-complete until real event fires
        return prev + Math.random() * 12;
      });
    }, 300);
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    setInstalling(true);
    startFakeProgress();

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      // appinstalled event will usually fire and call finishInstall(),
      // but as a safety net, finish manually shortly after acceptance.
      setTimeout(() => {
        if (progress < 100) finishInstall();
      }, 2000);
    } else {
      // user dismissed the native prompt
      if (progressTimer.current) clearInterval(progressTimer.current);
      setInstalling(false);
      setProgress(0);
    }

    setDeferredPrompt(null);
  };

  return (
    <div className="install-page">
      <div className="container">
        <div className="d-flex justify-content-center align-items-center">
          <div className="card install-card p-4 p-md-5 text-dark border-0">
            <div className="d-flex justify-content-center mb-2">
              <img
                src={dp}
                alt="EC Portal Logo"
                width="130"
                height="130"
                className="d-inline-block align-text-top"
              />
            </div>

            <div className="text-center mb-4">
              <h1 className="install-title mt-1 mb-2">
                Welcome to
              </h1>
              <h2 className="install-institute-name mb-2">
                THE EDUCATION'S CRADLE INSTITUTE
              </h2>
              <p className="install-subtitle mb-2">
                Learn. Grow. Achieve.
              </p>
              <p className="install-note mb-0">
                Install our app on your device for a faster, smoother and
                more reliable experience — right from your home screen.
              </p>
            </div>

            {checking && (
              <div className="d-grid">
                <button
                  className="btn btn-dark install-btn install-loading-btn"
                  type="button"
                  disabled
                >
                  <i className="fas fa-spinner fa-spin me-2"></i>
                  <span className="install-loading-text">Checking your device...</span>
                </button>
              </div>
            )}

            {!checking && installable && !installing && (
              <div className="d-grid">
                <button
                  className="btn btn-dark install-btn"
                  type="button"
                  onClick={handleInstallClick}
                >
                  <i className="fas fa-download me-2"></i>
                  Install App
                </button>
              </div>
            )}

            {installing && (
              <div className="install-progress-wrap">
                <div className="install-progress-bar-bg">
                  <div
                    className="install-progress-bar-fill"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  ></div>
                </div>
                <p className="install-progress-text">
                  {progress < 100
                    ? `Installing... ${Math.min(Math.round(progress), 99)}%`
                    : "Installed! Redirecting..."}
                </p>
              </div>
            )}

            {!checking && !installable && !installing && (
              <div className="d-grid">
                <button
                  className="btn btn-dark install-btn"
                  type="button"
                  onClick={() => navigate("/login", { replace: true })}
                >
                  <i className="fas fa-sign-in-alt me-2"></i>
                  Continue to Login
                </button>
                <p className="install-fallback-note mt-3 text-center">
                  App install isn't available on this browser/device.
                  You can continue directly to login.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      <div style={{ marginTop: "-25px" }}>
        <Footer />
      </div>
    </div>
  );
}

export default InstallApp;