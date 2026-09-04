import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import dp from "../images/logo.png";
import Footer from "./footer";
import "./InstallApp.css";

function InstallApp() {
  const navigate = useNavigate();

  // Computed synchronously on first render, BEFORE anything paints.
  // If true, we skip rendering the install UI entirely — no flash.
  const [shouldRedirectHome] = useState(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true; // iOS Safari
    const alreadyInstalledFlag =
      localStorage.getItem("appInstalled") === "true";
    return isStandalone || alreadyInstalledFlag;
  });

  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [checking, setChecking] = useState(true);
  const [installable, setInstallable] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressTimer = useRef(null);

  useEffect(() => {
    // Already decided to redirect home — no need to set up install listeners.
    if (shouldRedirectHome) return;

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setInstallable(true);
      setChecking(false);
    };

    const handleAppInstalled = () => {
      finishInstall();
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    const timeout = setTimeout(() => setChecking(false), 1500);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      clearTimeout(timeout);
      if (progressTimer.current) clearInterval(progressTimer.current);
    };
  }, [shouldRedirectHome]);

  const finishInstall = () => {
    if (progressTimer.current) clearInterval(progressTimer.current);
    setProgress(100);
    localStorage.setItem("appInstalled", "true");
    setTimeout(() => {
      navigate("/home", { replace: true });
    }, 500);
  };

  const startFakeProgress = () => {
    setProgress(0);
    progressTimer.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
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
      setTimeout(() => {
        if (progress < 100) finishInstall();
      }, 2000);
    } else {
      if (progressTimer.current) clearInterval(progressTimer.current);
      setInstalling(false);
      setProgress(0);
    }

    setDeferredPrompt(null);
  };

  // Skip rendering the install UI completely — redirect right away.
  if (shouldRedirectHome) {
    return <Navigate to="/home" replace />;
  }

  return (
    <div className="install-page">
      {/* ...rest of your existing JSX stays exactly the same... */}
    </div>
  );
}

export default InstallApp;