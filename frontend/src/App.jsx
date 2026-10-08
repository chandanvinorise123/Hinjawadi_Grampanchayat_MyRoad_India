import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Navbar from "./components/navbar";
import Footer from "./components/footer";

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

import UserProfile from "./userprofiledashboard/userprofile";
import Dashboard from "./pages/dashboard"; // ✅ Main gateway dashboard

// ✅ Import ProtectedRoute
import ProtectedRoute from "./components/ProtectedRoute";

// ✅ Import Role-Specific Dashboards (for direct access if needed)
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
        <Route path="/AboutUs" element={<AboutUs />} />
        <Route path="/ContactUs" element={<ContactUs />} />
        <Route path="/Blog" element={<Blog />} />
        <Route path="/HelpFaq" element={<HelpFaq />} />
        <Route path="/Login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/ReportIssue" element={<ReportIssue />} />
        
        {/* ✅ FIXED: Removed duplicate CitizenDashboard route that was overriding the gateway */}
        <Route path="/profile" element={<UserProfile />} />

        {/* ✅ MAIN DASHBOARD GATEWAY PAGE */}
        <Route path="/dashboard" element={<Dashboard />} />
        
        {/* ================================
            ✅ PROTECTED ROLE-SPECIFIC DASHBOARDS
            (Direct access routes)
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

        {/* Catch-all route */}
        <Route path="*" element={<Navigate to="/" replace />} />
        
      </Routes>

      <Footer />
    </BrowserRouter>
  );
}

export default App;