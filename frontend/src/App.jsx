import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Navbar from "./components/navbar";
import Footer from "./components/footer";

import Home from "./pages/home";
import Services from "./pages/services";

import IssuesCategory from "./pages/issuecategory";
import AboutUs from "./pages/aboutus";
import ContactUs from "./pages/contactus";
import Dashboard from "./pages/dashboard";

import HelpFaq from "./pages/helpfaq";
import Login from "./pages/login";  
import Signup from "./pages/signup";
import ReportIssue from "./pages/report";
import Blog from "./pages/blog";  
// import CitizenDashboard from "./dashboard/citizendashboard";
// import StaffDashboard from "./dashboard/staffdashboard";
// import VerifierDashboard from "./dashboard/verifierdashboard";
// import AdminDashboard from "./dashboard/admindashboard";  
function App() {
  return (
    <BrowserRouter>
      <Navbar />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/services" element={<Services />} />
        <Route path="/issues-category" element={<IssuesCategory />} />
        <Route path="/AboutUs" element={<AboutUs/>} />
        <Route path="/ContactUs" element={<ContactUs />} />
        <Route path="/Blog" element={<Blog />} />
        <Route path="/Dashboard" element={<Dashboard/>} />
        <Route path="/HelpFaq" element={<HelpFaq />} />
        <Route path="/Login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/ReportIssue" element={<ReportIssue />} />
        
        {/* <Route path="/CitizenDashboard" element={<CitizenDashboard />} />
        <Route path="/StaffDashboard" element={<StaffDashboard />} />
        <Route path="/VerifierDashboard" element={<VerifierDashboard />} />
        <Route path="/admindashboard" element={<AdminDashboard />} />
       */}


        


      </Routes>

      <Footer />
    </BrowserRouter>
  );
}

export default App;