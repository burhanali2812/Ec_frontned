import React from "react";
import comingSoon from "../images/comingSoon.png";
import Sidebar from "./Sidebar";

function ComingSoon() {
  return (
   <Sidebar>
     <div className="container py-5">
      <div
        className="mx-auto text-center bg-white border rounded-4 p-4 p-md-5 shadow-sm"
        style={{ maxWidth: 760 }}
      >
        <img
          src={comingSoon}
          alt="Coming soon"
          className="img-fluid mb-4"
          style={{ maxHeight: 220, objectFit: "contain" }}
        />

        <h2 className="fw-bold mb-2">Coming Soon</h2>
        <p className="text-muted mb-0 fs-6 fs-md-5">
          This page is under building. When it is ready, you will be notified.
        </p>
      </div>
    </div>
   </Sidebar>
  );
}

export default ComingSoon;
