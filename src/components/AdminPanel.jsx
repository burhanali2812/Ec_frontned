import React from 'react'
import { useNavigate } from 'react-router-dom'
function AdminPanel() {
  const navigate = useNavigate();
  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };
  return (
    <div>
      <h1>Admin Panel</h1>
      <p>Welcome to the Admin Panel. Here you can manage users, courses, and platform settings.</p>
        <button className="btn btn-danger" onClick={handleLogout}>
          Logout
        </button>   
    </div>
  )
}

export default AdminPanel
