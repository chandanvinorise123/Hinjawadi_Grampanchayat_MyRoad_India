import React, { useState, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    console.log("🛡️ ProtectedRoute: Checking authentication...");
    const stored = localStorage.getItem("user");
    console.log("📦 Raw localStorage 'user':", stored);

    if (!stored) {
      console.warn("🚫 ProtectedRoute: No user in localStorage. Redirecting to /login");
      setIsAllowed(false);
      setIsChecking(false);
      return;
    }

    try {
      const user = JSON.parse(stored);
      console.log("✅ ProtectedRoute: Parsed user object:", user);
      console.log("👤 ProtectedRoute: User role is exactly -> '", user.role, "'");

      const userRole = String(user.role || "").toLowerCase();
      const hasRole = allowedRoles.includes(userRole);

      console.log("🔑 ProtectedRoute: Allowed roles:", allowedRoles, "| Has role?", hasRole);

      if (!hasRole) {
        console.warn("🚫 ProtectedRoute: Role mismatch! Redirecting to /");
        setIsAllowed(false);
      } else {
        console.log("🎉 ProtectedRoute: Access GRANTED. Rendering component.");
        setIsAllowed(true);
      }
    } catch (error) {
      console.error("❌ ProtectedRoute: Failed to parse user from localStorage", error);
      setIsAllowed(false);
    } finally {
      setIsChecking(false);
    }
  }, [allowedRoles]);

  if (isChecking) {
    return <div style={{ padding: "50px", textAlign: "center", fontSize: "20px" }}>🔄 Verifying access...</div>;
  }

  if (!isAllowed) {
    return <Navigate to="/login" state={{ from: location, message: "Please login to access this page" }} replace />;
  }

  return children;
};

export default ProtectedRoute;