import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// ================================
// COMPONENTS
// ================================
import Navbar from "./components/navbar";
import Footer from "./components/footer";
import ProtectedRoute from "./components/ProtectedRoute";

// ================================
// PUBLIC PAGES
// ================================
import Home from "./pages/home";
import Services from "./pages/services";
import IssuesCategory from "./pages/issuecategory";
import AboutUs from "./pages/aboutus";
import ContactUs from "./pages/contactus";
import HelpFaq from "./pages/helpfaq";
import Login from "./pages/login";
import Signup from "./pages/signup";
import ReportIssue from "./pages/report";
import Blog from "./pages/blog";
import Dashboard from "./pages/dashboard"; // Main gateway dashboard

// ================================
// ROLE-SPECIFIC DASHBOARDS
// ================================
import CitizenDashboard from "./dashboard/citizendashboard";
import StaffDashboard from "./dashboard/staffdashboard";
import VerifierDashboard from "./dashboard/verifierdashboard";
import AdminDashboard from "./dashboard/admindashboard";

function App() {
  return (
    <BrowserRouter>
      <Navbar />

      <Routes>
        {/* ================================
            PUBLIC ROUTES
        ================================= */}
        <Route path="/" element={<Home />} />
        <Route path="/services" element={<Services />} />
        <Route path="/issues-category" element={<IssuesCategory />} />
        <Route path="/aboutus" element={<AboutUs />} />
        <Route path="/contactus" element={<ContactUs />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/helpfaq" element={<HelpFaq />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/reportissue" element={<ReportIssue />} />
        
        {/* Main Dashboard Gateway Page */}
        <Route path="/dashboard" element={<Dashboard />} />
        
        {/* ================================
            PROTECTED ROLE-SPECIFIC DASHBOARDS
        ================================= */}
        <Route 
          path="/citizendashboard" 
          element={
            <ProtectedRoute allowedRoles={['citizen']}>
              <CitizenDashboard />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/staffdashboard" 
          element={
            <ProtectedRoute allowedRoles={['staff']}>
              <StaffDashboard />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/verifierdashboard" 
          element={
            <ProtectedRoute allowedRoles={['verifier']}>
              <VerifierDashboard />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/admindashboard" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />

        {/* Catch-all route for undefined paths */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Footer />
    </BrowserRouter>
  );
}

export default App;