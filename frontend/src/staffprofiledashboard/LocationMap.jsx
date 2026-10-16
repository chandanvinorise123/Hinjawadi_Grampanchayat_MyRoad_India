import React, { useState, useMemo } from 'react';
import './LocationMap.css';

const LocationMap = ({ complaints, ward = "", onBack }) => {
    const [selectedLocationData, setSelectedLocationData] = useState(null);
    const [filterCategory, setFilterCategory] = useState('All');

    // 1. Process Data: Group complaints by Location
    const locationData = useMemo(() => {
        const groups = {};
        complaints.forEach(c => {
            const loc = c.location || "Unknown Location";
            if (!groups[loc]) {
                groups[loc] = {
                    name: loc,
                    count: 0,
                    categories: new Set(),
                    complaints: []
                };
            }
            groups[loc].count += 1;
            groups[loc].categories.add(c.category);
            groups[loc].complaints.push(c);
        });
        return Object.values(groups);
    }, [complaints]);

    // 2. Filter Logic
    const filteredLocations = useMemo(() => {
        if (filterCategory === 'All') return locationData;
        return locationData.filter(loc => 
            loc.complaints.some(c => c.category === filterCategory)
        );
    }, [locationData, filterCategory]);

    // 3. Stats Calculation
    const stats = useMemo(() => {
        const totalCats = new Set(complaints.map(c => c.category));
        return {
            totalComplaints: complaints.length,
            totalLocations: locationData.length,
            totalCategories: totalCats.size
        };
    }, [complaints, locationData]);

    const allCategories = useMemo(() => {
        return ['All', ...new Set(complaints.map(c => c.category))];
    }, [complaints]);

    const mapComplaint = complaints.find(
        (complaint) => complaint.coordinates?.latitude !== undefined && complaint.coordinates?.longitude !== undefined
    );
    const mapUrl = mapComplaint
        ? `https://www.openstreetmap.org/export/embed.html?bbox=${mapComplaint.coordinates.longitude - 0.02}%2C${mapComplaint.coordinates.latitude - 0.02}%2C${mapComplaint.coordinates.longitude + 0.02}%2C${mapComplaint.coordinates.latitude + 0.02}&layer=mapnik&marker=${mapComplaint.coordinates.latitude}%2C${mapComplaint.coordinates.longitude}`
        : "";

    const handleLocationClick = (locData) => {
        setSelectedLocationData(locData);
    };

    const closeModal = () => {
        setSelectedLocationData(null);
    };

    return (
        <div className="lm-shell">
            {/* Header */}
            <div className="lm-header">
                <button className="lm-back-btn" onClick={onBack}>← Back to Dashboard</button>
                <h2>🗺️ Location & Complaint Map</h2>
            </div>

            <div className="lm-container">
                {/* Stats Row */}
                <div className="lm-stats-row">
                    <div className="lm-stat-card lm-stat-navy">
                        <div className="lm-stat-num">{stats.totalComplaints}</div>
                        <div className="lm-stat-label">Total Complaints</div>
                    </div>
                    <div className="lm-stat-card lm-stat-green">
                        <div className="lm-stat-num">{stats.totalLocations}</div>
                        <div className="lm-stat-label">Unique Locations</div>
                    </div>
                    <div className="lm-stat-card lm-stat-amber">
                        <div className="lm-stat-num">{stats.totalCategories}</div>
                        <div className="lm-stat-label">Issue Categories</div>
                    </div>
                </div>

                {/* Main Content: List + Map */}
                <div className="lm-content-grid">
                    
                    {/* ✅ Left: Location List & Filters */}
                    <div className="lm-list-section">
                        <div className="lm-list-header">
                            <h3>Complaints by Location</h3>
                            <select 
                                className="lm-filter-select"
                                value={filterCategory}
                                onChange={(e) => setFilterCategory(e.target.value)}
                            >
                                {allCategories.map(cat => (
                                    <option key={cat} value={cat}>{cat === 'All' ? 'All Categories' : cat}</option>
                                ))}
                            </select>
                        </div>

                        <div className="lm-locations-list">
                            {filteredLocations.length === 0 ? (
                                <div className="lm-empty-list">No locations found for this category.</div>
                            ) : (
                                filteredLocations.map((loc, index) => (
                                    <div 
                                        key={index} 
                                        className="lm-location-card"
                                        onClick={() => handleLocationClick(loc)}
                                    >
                                        <div className="lm-loc-header">
                                            <span className="lm-loc-icon">📍</span>
                                            <h4>{loc.name}</h4>
                                        </div>
                                        <div className="lm-loc-stats">
                                            <span className="lm-loc-count">{loc.count} Complaints</span>
                                            <span className="lm-loc-cats">{loc.categories.size} Categories</span>
                                        </div>
                                        <div className="lm-loc-categories">
                                            {Array.from(loc.categories).slice(0, 3).map((cat, i) => (
                                                <span key={i} className="lm-cat-tag">{cat}</span>
                                            ))}
                                            {loc.categories.size > 3 && <span className="lm-cat-tag lm-cat-more">+{loc.categories.size - 3} more</span>}
                                        </div>
                                        <button className="lm-view-details-btn">View Details →</button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* ✅ Right: Map View */}
                    <div className="lm-map-section">
                        <div className="lm-map-header">
                            <h3>Live Location View</h3>
                            <span className="lm-map-subtitle">{ward}</span>
                        </div>
                        <div className="lm-map-container">
                            {/* OpenStreetMap Embed */}
                            <iframe 
                                width="100%" 
                                height="100%" 
                                frameBorder="0" 
                                scrolling="no" 
                                marginHeight="0" 
                                marginWidth="0" 
                                src={mapUrl || undefined}
                                title="Live Location Map"
                            ></iframe>
                            <div className="lm-map-overlay-info">
                                <p>📍 Interactive Map View</p>
                                <small>Click on locations to view details</small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ✅ OVERLAY MODAL for Location Details */}
            {selectedLocationData && (
                <div className="lm-modal-overlay" onClick={closeModal}>
                    <div className="lm-modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="lm-modal-header">
                            <div>
                                <span className="lm-modal-loc-badge">📍 Location Details</span>
                                <h3>{selectedLocationData.name}</h3>
                            </div>
                            <button className="lm-modal-close" onClick={closeModal}>✕</button>
                        </div>

                        <div className="lm-modal-body">
                            <div className="lm-modal-summary">
                                <div className="lm-summary-item">
                                    <span>Total Complaints</span>
                                    <b>{selectedLocationData.count}</b>
                                </div>
                                <div className="lm-summary-item">
                                    <span>Categories Involved</span>
                                    <b>{selectedLocationData.categories.size}</b>
                                </div>
                            </div>

                            <h4 className="lm-complaints-title">Complaints at this Location</h4>
                            <div className="lm-complaints-list">
                                {selectedLocationData.complaints.map((c) => (
                                    <div key={c.id} className="lm-complaint-item">
                                        <div className="lm-comp-header">
                                            <span className="lm-comp-number">{c.complaintNumber}</span>
                                            <span className={`lm-comp-status lm-status-${String(c.priority || "normal").toLowerCase()}`}>{c.priority || "Normal"}</span>
                                        </div>
                                        <div className="lm-comp-details">
                                            <div className="lm-detail-row">
                                                <span className="lm-label">Issue:</span>
                                                <span className="lm-value">{c.issue} <span className="lm-cat-inline">({c.category})</span></span>
                                            </div>
                                            <div className="lm-detail-row">
                                                <span className="lm-label">Citizen:</span>
                                                <span className="lm-value">{c.citizenName} <span className="lm-contact">({c.citizenContact})</span></span>
                                            </div>
                                            <div className="lm-detail-row">
                                                <span className="lm-label">Description:</span>
                                                <span className="lm-value lm-desc">{c.description}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="lm-modal-footer">
                            <button className="lm-modal-close-btn" onClick={closeModal}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LocationMap;