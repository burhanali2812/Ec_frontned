import React from "react";

function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer
      style={{
        textAlign: "center",
        padding: "10px 12px",
        color: "#64748b",
        fontSize: "0.9rem",
      }}
    >
      EC-Portal © {year} - Developed by{" "} Syed Burhan Ali | All rights reserved.
    </footer>
  );
}

export default Footer;
