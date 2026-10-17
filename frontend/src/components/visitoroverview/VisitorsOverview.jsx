import React, { useState, useEffect } from "react";
import "./VisitorsOverview.css";
import { API_BASE_URL } from "../../utils/dashboardApi";

const VisitorsOverview = () => {
  const [stats, setStats] = useState({
    totalCitizenVisits: 0,
    totalCitizenLogins: 0,
    totalReportedIssues: 0,
  });

  const [loading, setLoading] = useState(true);

  // Format number with Indian commas (e.g., 12,450)
  const formatNumber = (num) => {
    if (num === null || num === undefined) return "0";
    return num.toLocaleString("en-IN");
  };

  // Fetch live stats from backend
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/stats/overview`);
        const data = await response.json();
        
        if (response.ok && data.success) {
          setStats(data.data);
        }
      } catch (err) {
        console.error("Error fetching visitor overview:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, []);

  const statistics = [
    {
      icon: "👥",
      title: "Total Citizen Visits",
      value: stats.totalCitizenVisits,
      description: "Total visits to the MyRoad India portal",
      color: "#1e40af", // Blue
    },
    {
      icon: "🔐",
      title: "Citizen Logins",
      value: stats.totalCitizenLogins,
      description: "Total successful citizen login events",
      color: "#047857", // Green
    },
    {
      icon: "📝",
      title: "Reported Issues",
      value: stats.totalReportedIssues,
      description: "Total complaints reported by citizens",
      color: "#b45309", // Saffron / Orange
    },
  ];

  return (
    <section className="visitors-overview">
      <div className="visitors-overview-header">
        <h2>Visitors Overview</h2>
        <p>Citizen activity and reporting statistics</p>
      </div>

      {loading ? (
        <div className="visitors-loading">Loading statistics...</div>
      ) : (
        <div className="visitor-stats-grid">
          {statistics.map((item, index) => (
            <div className="visitor-stat-card" key={index}>
              <div
                className="visitor-stat-icon"
                style={{ backgroundColor: `${item.color}15`, color: item.color }}
              >
                {item.icon}
              </div>
              <div className="visitor-stat-content">
                <h3>{item.title}</h3>
                <div className="visitor-stat-value">
                  {formatNumber(item.value)}
                </div>
                <p>{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default VisitorsOverview;