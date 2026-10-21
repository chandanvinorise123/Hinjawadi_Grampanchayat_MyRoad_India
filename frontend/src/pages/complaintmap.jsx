import React from "react";
import { useTranslation } from "react-i18next";
import HomeComplaintsMap from "../components/maps/HomeComplaintsMap";
import "./home.css";

const ComplaintMapPage = () => {
  const { t } = useTranslation();

  return <HomeComplaintsMap t={t} fullPage />;
};

export default ComplaintMapPage;
