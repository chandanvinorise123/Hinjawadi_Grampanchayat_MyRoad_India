import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next"; // ✅ ADDED
import "./ComplaintDetails.css";
import StaffComplaintDetails from "./StaffComplaintDetails";
import { toMediaUrl } from "../utils/dashboardApi";

const formatDate = (value, notRecordedText = "Not recorded") => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleString()
    : notRecordedText;
};

const getTimestamp = (value) => {
  const timestamp = new Date(value || 0).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const ComplaintDetails = ({ complaints = [], onBack }) => {
  const { t } = useTranslation(); // ✅ ADDED
  const notRecorded = t('complaint_updated_details.not_recorded');

  const [viewingComplaintId, setViewingComplaintId] = useState("");
  
  const updatedComplaints = useMemo(
    () => complaints
      .map((complaint) => {
        const updates = (Array.isArray(complaint.log) ? complaint.log : [])
          .filter((entry) => /staff|admin|verifier/i.test(String(entry.actor || "")))
          .map((entry) => ({
            ...entry,
            time: entry.time || complaint.updatedAt || "",
            timestamp: getTimestamp(entry.time || complaint.updatedAt),
          }))
          .sort((first, second) => second.timestamp - first.timestamp);
        const latestUpdate = updates[0];
        return latestUpdate
          ? { complaint, latestUpdate, latestTimestamp: latestUpdate.timestamp }
          : null;
      })
      .filter(Boolean)
      .sort((first, second) => second.latestTimestamp - first.latestTimestamp),
    [complaints]
  );
  
  const selectedEntry = updatedComplaints.find(({ complaint }) =>
    String(complaint.id) === String(viewingComplaintId)
  );

  return (
    <div className="cd-shell">
      <div className="cd-header">
        <button className="cd-back-btn" type="button" onClick={onBack}>
          {t('complaint_updated_details.back_to_dashboard')}
        </button>
        <div>
          <span className="cd-eyebrow">{t('complaint_updated_details.staff_workspace')}</span>
          <h2>{selectedEntry ? t('complaint_updated_details.updated_work_details') : t('complaint_updated_details.complaint_updated_details_title')}</h2>
          <p className="cd-subtitle">
            {selectedEntry
              ? t('complaint_updated_details.update_for', { 
                  actor: selectedEntry.latestUpdate.actor || t('complaint_updated_details.dashboard'), 
                  complaintNumber: selectedEntry.complaint.complaintNumber || t('complaint_updated_details.this_complaint') 
                })
              : t('complaint_updated_details.review_updates_subtitle')}
          </p>
        </div>
      </div>

      {!selectedEntry ? (
        <main className="cd-container">
          <section className="cd-list-panel" aria-label={t('complaint_updated_details.aria_updated_complaints')}>
            <div className="cd-list-heading">
              <div>
                <span className="cd-eyebrow">{t('complaint_updated_details.complaint_activity')}</span>
                <h3>{t('complaint_updated_details.recently_updated_complaints')}</h3>
                <p>{t('complaint_updated_details.see_latest_update')}</p>
              </div>
              <span className="cd-count">{t('complaint_updated_details.complaints_count', { count: updatedComplaints.length })}</span>
            </div>
            <div className="cd-table-wrap">
              <table className="cd-table">
                <thead>
                  <tr>
                    <th>{t('complaint_updated_details.col_complaint')}</th>
                    <th>{t('complaint_updated_details.col_issue_location')}</th>
                    <th>{t('complaint_updated_details.col_status')}</th>
                    <th>{t('complaint_updated_details.col_updated_by')}</th>
                    <th>{t('complaint_updated_details.col_latest_update')}</th>
                    <th>{t('complaint_updated_details.col_updated_at')}</th>
                    <th>{t('complaint_updated_details.col_details')}</th>
                  </tr>
                </thead>
                <tbody>
                  {updatedComplaints.length ? updatedComplaints.map(
                    ({ complaint, latestUpdate }) => (
                      <tr key={complaint.id}>
                        <td>
                          <b className="cd-complaint-number">{complaint.complaintNumber || t('complaint_updated_details.col_complaint')}</b>
                          <span className="cd-cell-note">{complaint.citizenName || t('complaint_updated_details.citizen_not_available')}</span>
                        </td>
                        <td>
                          <b>{complaint.issue || complaint.issueType || t('complaint_updated_details.issue_not_specified')}</b>
                          <span className="cd-cell-note">
                            {typeof complaint.location === "string"
                              ? complaint.location
                              : complaint.location?.address || complaint.location?.name || t('complaint_updated_details.location_not_recorded')}
                          </span>
                        </td>
                        <td><span className="cd-status">{complaint.status || notRecorded}</span></td>
                        <td><span className="cd-status">{latestUpdate.actor || t('complaint_updated_details.dashboard')}</span></td>
                        <td className="cd-update-summary">{latestUpdate.text || t('complaint_updated_details.complaint_details_updated')}</td>
                        <td>{formatDate(latestUpdate.time, notRecorded)}</td>
                        <td>
                          <button
                            className="cd-view-btn"
                            type="button"
                            onClick={() => setViewingComplaintId(complaint.id)}
                          >
                            {t('complaint_updated_details.view_details')}
                          </button>
                        </td>
                      </tr>
                    )
                  ) : (
                    <tr>
                      <td className="cd-empty" colSpan="7">
                        {t('complaint_updated_details.no_updates_available')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      ) : (
        <main className="cd-container">
          <button
            className="cd-return-btn"
            type="button"
            onClick={() => setViewingComplaintId("")}
          >
            {t('complaint_updated_details.back_to_updated_complaints')}
          </button>
          <div className="cd-detail-layout">
            <section className="cd-information-panel">
              <header className="cd-panel-heading">
                <div>
                  <span className="cd-eyebrow">{t('complaint_updated_details.original_report')}</span>
                  <h3>{t('complaint_updated_details.complaint_information')}</h3>
                </div>
                <span className="cd-status">{selectedEntry.complaint.status || notRecorded}</span>
              </header>
              <StaffComplaintDetails
                complaint={selectedEntry.complaint}
                showActivity={false}
              />
            </section>

            <section className="cd-work-panel">
              <header className="cd-panel-heading">
                <div>
                  <span className="cd-eyebrow">{selectedEntry.latestUpdate.actor || t('complaint_updated_details.dashboard')} {t('complaint_updated_details.update')}</span>
                  <h3>{t('complaint_updated_details.updated_complaint_information')}</h3>
                </div>
                <span className="cd-update-date">{formatDate(selectedEntry.latestUpdate.time, notRecorded)}</span>
              </header>
              <div className="cd-work-content">
                <div className="cd-work-fact">
                  <span>{t('complaint_updated_details.latest_update')}</span>
                  <p>{selectedEntry.latestUpdate.text || t('complaint_updated_details.complaint_details_updated_desc')}</p>
                </div>
                <div className="cd-work-fact">
                  <span>{t('complaint_updated_details.work_performed')}</span>
                  <p>{selectedEntry.complaint.inspection?.actionTaken || t('complaint_updated_details.no_work_description')}</p>
                </div>
                <div className="cd-work-fact">
                  <span>{t('complaint_updated_details.work_remarks')}</span>
                  <p>{selectedEntry.complaint.inspection?.remarks || t('complaint_updated_details.no_additional_remarks')}</p>
                </div>
                <div className="cd-work-fact">
                  <span>{t('complaint_updated_details.completion_datetime')}</span>
                  <p>{formatDate(selectedEntry.complaint.inspection?.completionDate, notRecorded)}</p>
                </div>
                <div className="cd-work-fact">
                  <span>{t('complaint_updated_details.work_status')}</span>
                  <p>{selectedEntry.complaint.status || notRecorded}</p>
                </div>
                <div className="cd-work-fact">
                  <span>{t('complaint_updated_details.verifier_feedback')}</span>
                  <p>{selectedEntry.complaint.verifierRemarks || selectedEntry.complaint.previousRemarks || t('complaint_updated_details.no_verifier_feedback')}</p>
                </div>
                <section className="cd-work-evidence">
                  <h4>{t('complaint_updated_details.work_evidence')}</h4>
                  {[
                    [t('complaint_updated_details.before_site_photo'), selectedEntry.complaint.inspection?.sitePhoto || selectedEntry.complaint.photos?.site],
                    [t('complaint_updated_details.after_work_photo'), selectedEntry.complaint.inspection?.completionPhoto || selectedEntry.complaint.photos?.after],
                  ].some(([, photo]) => photo) ? (
                    <div className="cd-work-photos">
                      {[
                        [t('complaint_updated_details.before_site_photo'), selectedEntry.complaint.inspection?.sitePhoto || selectedEntry.complaint.photos?.site],
                        [t('complaint_updated_details.after_work_photo'), selectedEntry.complaint.inspection?.completionPhoto || selectedEntry.complaint.photos?.after],
                      ].filter(([, photo]) => photo).map(([label, photo]) => (
                        <a
                          className="cd-work-photo"
                          href={toMediaUrl(photo)}
                          target="_blank"
                          rel="noopener noreferrer"
                          key={label}
                        >
                          <img src={toMediaUrl(photo)} alt={label} loading="lazy" />
                          <span>{label}</span>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="cd-no-evidence">{t('complaint_updated_details.no_staff_work_photos')}</p>
                  )}
                </section>
              </div>
            </section>
          </div>
        </main>
      )}
    </div>
  );
};

export default ComplaintDetails;