import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Navbar from "./components/navbar";
import Footer from "./components/footer";

import Home from "./pages/home";
import Services from "./pages/services";

//import IssuesCategory from "./pages/IssuesCategory";
// import About from "./pages/About";
// import Contact from "./pages/Contact";
// import Dashboard from "./pages/Dashboard";
// import Help from "./pages/Help";

function App() {
  return (
    <BrowserRouter>
      <Navbar />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/services" element={<Services />} />

        {/* <Route path="/issues-category" element={<IssuesCategory />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/help" element={<Help />} /> */}



      </Routes>

      <Footer />
    </BrowserRouter>
  );
}

export default App;