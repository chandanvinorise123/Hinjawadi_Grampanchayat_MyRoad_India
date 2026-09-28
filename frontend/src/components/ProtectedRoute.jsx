import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const [user, setUser] = useState(null);
  const location = useLocation();

  useEffect(() => {
    const checkAuth = () => {
      try {
        const stored = localStorage.getItem('user');
        if (stored) {
          setUser(JSON.parse(stored));
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Error reading user from localStorage:', error);
        setUser(null);
      }
    };

    // Check immediately on mount
    checkAuth();

    // Listen for login/logout events from other components
    window.addEventListener('authChange', checkAuth);
    window.addEventListener('storage', checkAuth);

    return () => {
      window.removeEventListener('authChange', checkAuth);
      window.removeEventListener('storage', checkAuth);
    };
  }, []);

  // 1. ✅ NO LOGIN? Redirect to /login
  if (!user) {
    return <Navigate to="/login" state={{ from: location, message: "Please login to access this page" }} replace />;
  }

  // 2. ✅ LOGGED IN, BUT WRONG ROLE? Redirect to Home (or an Unauthorized page)
  if (allowedRoles && !allowedRoles.includes(user.role?.toLowerCase())) {
    return <Navigate to="/" state={{ message: "You do not have permission to access this page" }} replace />;
  }

  // 3. ✅ ALL GOOD? Render the requested dashboard/component
  return children;
};

export default ProtectedRoute;