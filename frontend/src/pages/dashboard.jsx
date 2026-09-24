import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import "./dashboard.css";

// Import role-specific dashboards
import CitizenDashboard from "../dashboard/citizendashboard";
import StaffDashboard from "../dashboard/staffdashboard";
import AdminDashboard from "../dashboard/admindashboard";
import VerifierDashboard from "../dashboard/verifierdashboard";

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      try {
        const stored = localStorage.getItem("user");
        if (stored) {
          setUser(JSON.parse(stored));
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Error reading user:", error);
        setUser(null);
      }
      setLoading(false);
    };

    checkAuth();

    window.addEventListener("authChange", checkAuth);
    window.addEventListener("storage", checkAuth);

    return () => {
      window.removeEventListener("authChange", checkAuth);
      window.removeEventListener("storage", checkAuth);
    };
  }, []);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading Dashboard...</p>
      </div>
    );
  }

  // ✅ No user? Redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // ✅ Load role-specific dashboard based on user role
  const userRole = String(user.role || "").toLowerCase();

  switch (userRole) {
    case "admin":
      return <AdminDashboard />;
    case "staff":
      return <StaffDashboard />;
    case "verifier":
      return <VerifierDashboard />;
    case "citizen":
    default:
      return <CitizenDashboard />;
  }
};

export default Dashboard;