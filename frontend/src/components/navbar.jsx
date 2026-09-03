
import React from 'react';
import './navbar.css';
import logo from '../assets/logo.jpeg';
import { NavLink } from 'react-router-dom';

const Navbar = () => {
  return (
    <>
      {/* Top Bar */}
      <div className="topbar">
        <div className="topbar-inner">
          <span>Government Digital Service · Gram Panchayat Portal</span>

          <div className="topbar-right">
            <a href="#" className="sr-link">Screen Reader Access</a>
            <span className="sep">·</span>

            <button className="font-btn">A-</button>
            <button className="font-btn">A</button>
            <button className="font-btn">A+</button>

            <span className="sep">·</span>

            <button className="lang-btn">हिंदी</button>

            <span className="sep">·</span>

            <button className="lang-btn">मराठी</button>
          </div>
        </div>
      </div>

      {/* Main Header / Navbar */}
      <header className="main-header">
        <div className="header-inner">

          {/* Brand */}
          <div className="brand">
            <div className="brand-logo">
              <img
                src={logo}
                alt="MyRoad India Logo"
              />
            </div>

            <div className="brand-text">
              <b>MyRoad India</b>
              <span>Report · Track · Resolve</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="primary">

        <NavLink    to="/" className={({ isActive }) => isActive ? 'active' : '' } > Home </NavLink>
          
           

        <NavLink  to="/services" className={({ isActive }) =>  isActive ? 'active' : '' }  >  Services </NavLink>
            
        <NavLink to="/issues-category" className={({ isActive }) => isActive ? 'active' : ''} > Issues Category </NavLink>
             
        <NavLink to="/aboutus" className={({ isActive }) => isActive ? 'active' : '' } >   About Us </NavLink>

        <NavLink to="/contactus"  className={({ isActive }) =>    isActive ? 'active' : ''   } >Contact Us </NavLink>
              
        <NavLink to="/Dashboard" className={({ isActive }) => isActive ? 'active' : '' }> Dashboard </NavLink>
        
        <NavLink to="/HelpFaq" className={({ isActive }) => isActive ? 'active' : ''}  > Help / FAQ </NavLink>

        <NavLink to="/Login" className={({ isActive }) => isActive ? 'active' : ''} > Login </NavLink>

        <NavLink to="/ReportIssue" className={({ isActive }) => isActive ? 'active' : ''} > Report an Issue </NavLink>
            
        </nav>    
              
                
              
              
            
           

        

          {/* Header Actions */}
          <div className="header-actions">

            <button className="icon-btn" title="Accessibility">
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="4" r="2" />
                <path d="M5 8l7 2 7-2M12 10v5m-4 7l4-7 4 7" />
              </svg>
            </button>

            <button className="lang-select">
              EN{' '}
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            <button className="btn btn-login">
              Login
            </button>

            <button className="btn btn-primary">
              Report an Issue
            </button>

          </div>
        </div>
      </header>
    </>
  );
};

export default Navbar;

