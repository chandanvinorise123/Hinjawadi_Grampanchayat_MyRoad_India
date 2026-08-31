import React from 'react';
import './footer.css';

const Footer = () => {
    const citizenServices = [
        { label: 'Report an Issue', href: '#' },
        { label: 'Track Complaint', href: '#' },
        { label: 'Issues Map', href: '#' },
        { label: 'Road Safety', href: '#' },
    ];

    const platformLinks = [
        { label: 'About', href: '#' },
        { label: 'How It Works', href: '#' },
        { label: 'FAQ', href: '#' },
        { label: 'Contact', href: '#' },
    ];

    const legalLinks = [
        { label: 'Privacy Policy', href: '#' },
        { label: 'Accessibility', href: '#' },
        { label: 'Terms of Use', href: '#' },
    ];

    const accessLinks = [
        { label: 'System Login', href: '#' },
        { label: 'Staff Portal', href: '#' },
        { label: 'Admin Dashboard', href: '#' },
    ];

    return (
        <footer className="footer">
            <div className="footer-container">
                {/* Top Section */}
                <div className="footer-top">
                    {/* Brand Column */}
                    <div className="footer-brand">
                        <div className="footer-logo">
                            <div className="logo-icon">
                                <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="20" cy="20" r="18" fill="#1a2d4a" stroke="#ffffff" strokeWidth="1.5" />
                                    <text x="20" y="17" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="700" fontFamily="sans-serif">MY</text>
                                    <text x="20" y="27" textAnchor="middle" fill="#ff9933" fontSize="8" fontWeight="700" fontFamily="sans-serif">ROAD</text>
                                </svg>
                            </div>
                            <span className="logo-text">MyRoad India</span>
                        </div>
                        <p className="footer-description">
                            A digital public-service platform for reporting, tracking and resolving road &amp; infrastructure issues within the Gram Panchayat.
                        </p>
                        <div className="footer-badge">
                            <span className="badge-icon">🇮🇳</span>
                            <span className="badge-text">Digital Public Service Platform</span>
                        </div>
                    </div>

                    {/* Citizen Services */}
                    <div className="footer-col">
                        <h6 className="footer-heading">Citizen Services</h6>
                        <ul className="footer-links">
                            {citizenServices.map((link, index) => (
                                <li key={index}>
                                    <a href={link.href}>{link.label}</a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Platform */}
                    <div className="footer-col">
                        <h6 className="footer-heading">Platform</h6>
                        <ul className="footer-links">
                            {platformLinks.map((link, index) => (
                                <li key={index}>
                                    <a href={link.href}>{link.label}</a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Legal */}
                    <div className="footer-col">
                        <h6 className="footer-heading">Legal</h6>
                        <ul className="footer-links">
                            {legalLinks.map((link, index) => (
                                <li key={index}>
                                    <a href={link.href}>{link.label}</a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Access */}
                    <div className="footer-col">
                        <h6 className="footer-heading">Access</h6>
                        <ul className="footer-links">
                            {accessLinks.map((link, index) => (
                                <li key={index}>
                                    <a href={link.href}>{link.label}</a>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Bottom Section */}
                <div className="footer-bottom">
                    <p className="footer-copyright">
                        © 2026 MyRoad India · Gram Panchayat Digital Services
                    </p>
                    <p className="footer-tagline">
                        Built for transparency, accountability &amp; better roads.
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;