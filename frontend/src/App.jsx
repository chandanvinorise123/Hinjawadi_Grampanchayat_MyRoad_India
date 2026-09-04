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
import ReportIssue from "./pages/report";
import CitizenDashboard from "./dashboard/citizendashboard";
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
        <Route path="/Dashboard" element={<Dashboard/>} />
        <Route path="/HelpFaq" element={<HelpFaq />} />
        <Route path="/Login" element={<Login />} />
        <Route path="/ReportIssue" element={<ReportIssue />} />
        <Route path="/CitizenDashboard" element={<CitizenDashboard />} />
      


        


      </Routes>

      <Footer />
    </BrowserRouter>
  );
}

export default App;