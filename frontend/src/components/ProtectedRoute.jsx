import React, { useState, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const [user, setUser] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const location = useLocation();

  useEffect(() => {
    const checkAuth = () => {
      try {
        const stored = localStorage.getItem("user");

        if (stored) {
          const parsedUser = JSON.parse(stored);
          setUser(parsedUser);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error(
          "Error reading user from localStorage:",
          error
        );
        setUser(null);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    // Check authentication immediately
    checkAuth();

    // Listen for login/logout events
    window.addEventListener("authChange", checkAuth);
    window.addEventListener("storage", checkAuth);

    return () => {
      window.removeEventListener("authChange", checkAuth);
      window.removeEventListener("storage", checkAuth);
    };
  }, []);

  // ------------------------------------------
  // WAIT UNTIL AUTHENTICATION CHECK IS COMPLETE
  // ------------------------------------------
  if (isCheckingAuth) {
    return null;
  }

  // ------------------------------------------
  // USER NOT LOGGED IN
  // ------------------------------------------
  if (!user) {
    return (
      <Navigate
        to="/Login"
        state={{
          from: location,
          message: "Please login to access this page",
        }}
        replace
      />
    );
  }

  // ------------------------------------------
  // USER LOGGED IN BUT WRONG ROLE
  // ------------------------------------------
  if (
    allowedRoles &&
    !allowedRoles.includes(
      String(user.role || "").toLowerCase()
    )
  ) {
    return (
      <Navigate
        to="/"
        state={{
          message: "You do not have permission to access this page",
        }}
        replace
      />
    );
  }

  // ------------------------------------------
  // AUTHENTICATED + CORRECT ROLE
  // ------------------------------------------
  return children;
};

export default ProtectedRoute;