import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import "./VisitorsOverview.css";
import { API_BASE_URL } from "../../utils/dashboardApi";

const VisitorsOverview = () => {
  const { t } = useTranslation();
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
      title: t("admin_dashboard.visitors_total_citizen_visits"),
      value: stats.totalCitizenVisits,
      description: t("admin_dashboard.visitors_portal_visits_description"),
      color: "#1e40af", // Blue
    },
    {
      icon: "🔐",
      title: t("admin_dashboard.visitors_citizen_logins"),
      value: stats.totalCitizenLogins,
      description: t("admin_dashboard.visitors_successful_logins_description"),
      color: "#047857", // Green
    },
    {
      icon: "📝",
      title: t("admin_dashboard.visitors_reported_issues"),
      value: stats.totalReportedIssues,
      description: t("admin_dashboard.visitors_reported_issues_description"),
      color: "#b45309", // Saffron / Orange
    },
  ];

  return (
    <section className="visitors-overview">
      <div className="visitors-overview-header">
        <h2>{t("admin_dashboard.visitors_overview_title")}</h2>
        <p>{t("admin_dashboard.visitors_overview_subtitle")}</p>
      </div>

      {loading ? (
        <div className="visitors-loading">{t("admin_dashboard.visitors_loading_statistics")}</div>
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