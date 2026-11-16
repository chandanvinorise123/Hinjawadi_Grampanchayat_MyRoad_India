import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next"; // ✅ ADDED
import "./UpdatedComplaints.css";
import { toMediaUrl } from "../utils/dashboardApi";
import { getTimestamp, getUpdateHistory } from "./updatedComplaintsUtils";

const formatDateTime = (value, notRecordedText = "Time not recorded") => {
  if (!value) return notRecordedText;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    // ✅ Updated to use browser's active locale for better i18n support
    : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};

const getPhotoItems = (photos, label) => photos
  .filter((photo) => typeof photo === "string" && photo.trim())
  .map((photo, index) => ({
    label: photos.length > 1 ? `${label} ${index + 1}` : label,
    photo,
  }));

const getCitizenPhotos = (complaint, t) => {
  const photos = Array.isArray(complaint.citizenPhotos)
    ? complaint.citizenPhotos
    : Array.isArray(complaint.images) ? complaint.images : [];
  return getPhotoItems(photos, t('updated_complaints.citizen_evidence'));
};

const getWorkPhotos = (complaint, t) => {
  const inspection = complaint.inspection || {};
  return [
    ...getPhotoItems([inspection.sitePhoto || complaint.photos?.site || ""], t('updated_complaints.before_site')),
    ...getPhotoItems([inspection.completionPhoto || complaint.photos?.after || ""], t('updated_complaints.after_work')),
    ...getPhotoItems([inspection.verificationPhoto || ""], t('updated_complaints.verification')),
  ];
};

const UpdatedComplaints = ({
  complaints = [],
  onBack,
  actorRoles = ["staff", "verifier"],
  audienceLabel = "Staff & verifier activity",
  listTitle = "Staff & Verifier Updates",
  showUpdateHistory = true,
}) => {
  const { t } = useTranslation(); // ✅ ADDED
  const notRecorded = t('updated_complaints.not_recorded');

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedComplaintId, setSelectedComplaintId] = useState("");

  const updatedComplaints = useMemo(() => complaints
    .map((complaint) => {
      const history = getUpdateHistory(complaint, actorRoles);
      const latestUpdate = history[0] || null;
      return {
        complaint,
        history,
        latestUpdate,
        latestTimestamp: Math.max(
          getTimestamp(latestUpdate?.time),
          getTimestamp(complaint.updatedAt),
          getTimestamp(complaint.createdAt)
        ),
      };
    })
    .filter(({ latestUpdate }) => latestUpdate)
    .sort((left, right) => right.latestTimestamp - left.latestTimestamp), [complaints, actorRoles]);

  const filteredComplaints = updatedComplaints.filter(({ complaint, latestUpdate }) => {
    const query = searchTerm.trim().toLowerCase();
    return !query || [
      complaint.complaintNumber,
      complaint.citizenName,
      complaint.issue,
      complaint.category,
      complaint.location,
      complaint.status,
      latestUpdate.actor,
    ].some((value) => String(value || "").toLowerCase().includes(query));
  });
  
  const selectedRecord = updatedComplaints.find(
    ({ complaint }) => String(complaint.id || complaint._id) === String(selectedComplaintId)
  );

  return (
    <main className="uc-shell">
      <header className="uc-header">
        <button className="uc-back-btn" type="button" onClick={selectedRecord ? () => setSelectedComplaintId("") : onBack}>
          ← {selectedRecord ? t('updated_complaints.back_to_updated') : t('updated_complaints.back_to_dashboard')}
        </button>
        <div>
          <span className="uc-eyebrow">{audienceLabel}</span>
          <h1>{selectedRecord ? t('updated_complaints.updated_complaint_details') : t('updated_complaints.updated_complaints')}</h1>
          <p>
            {selectedRecord
              ? selectedRecord.complaint.complaintNumber
              : t('updated_complaints.review_latest_updates')}
          </p>
        </div>
      </header>

      {selectedRecord ? (
        <div className="uc-detail-layout">
          <section className="uc-panel">
            <div className="uc-panel-heading">
              <span className="uc-eyebrow">{t('updated_complaints.original_report')}</span>
              <h2>{t('updated_complaints.complaint_information')}</h2>
            </div>
            <dl className="uc-facts">
              <div><dt>{t('updated_complaints.complaint_number')}</dt><dd>{selectedRecord.complaint.complaintNumber || notRecorded}</dd></div>
              <div><dt>{t('updated_complaints.citizen')}</dt><dd>{selectedRecord.complaint.citizenName || t('updated_complaints.guest')}</dd></div>
              <div><dt>{t('updated_complaints.contact')}</dt><dd>{selectedRecord.complaint.citizenContact || selectedRecord.complaint.citizenMobile || notRecorded}</dd></div>
              <div><dt>{t('updated_complaints.email')}</dt><dd>{selectedRecord.complaint.citizenEmail || selectedRecord.complaint.citizenProfile?.email || notRecorded}</dd></div>
              <div><dt>{t('updated_complaints.category')}</dt><dd>{selectedRecord.complaint.category || notRecorded}</dd></div>
              <div><dt>{t('updated_complaints.issue')}</dt><dd>{selectedRecord.complaint.issue || selectedRecord.complaint.issueType || notRecorded}</dd></div>
              <div><dt>{t('updated_complaints.location')}</dt><dd>{typeof selectedRecord.complaint.location === "string" ? selectedRecord.complaint.location : selectedRecord.complaint.location?.address || notRecorded}</dd></div>
              <div><dt>{t('updated_complaints.priority')}</dt><dd>{selectedRecord.complaint.priority || t('updated_complaints.normal')}</dd></div>
              <div><dt>{t('updated_complaints.current_status')}</dt><dd>{selectedRecord.complaint.status || notRecorded}</dd></div>
              <div><dt>{t('updated_complaints.assigned_staff')}</dt><dd>{selectedRecord.complaint.assignedStaff || t('updated_complaints.not_assigned')}</dd></div>
              <div><dt>{t('updated_complaints.assigned_verifier')}</dt><dd>{selectedRecord.complaint.assignedVerifier || t('updated_complaints.not_assigned')}</dd></div>
              <div><dt>{t('updated_complaints.submitted')}</dt><dd>{formatDateTime(selectedRecord.complaint.createdAt || selectedRecord.complaint.date, notRecorded)}</dd></div>
              <div><dt>{t('updated_complaints.last_updated')}</dt><dd>{formatDateTime(selectedRecord.complaint.updatedAt, notRecorded)}</dd></div>
              <div><dt>{t('updated_complaints.landmark')}</dt><dd>{selectedRecord.complaint.landmark || notRecorded}</dd></div>
              <div className="uc-fact-wide"><dt>{t('updated_complaints.description')}</dt><dd>{selectedRecord.complaint.description || t('updated_complaints.no_description_provided')}</dd></div>
            </dl>
            <div className="uc-evidence">
              <h3>{t('updated_complaints.citizen_evidence')}</h3>
              {getCitizenPhotos(selectedRecord.complaint, t).length ? (
                <div className="uc-photo-grid">
                  {getCitizenPhotos(selectedRecord.complaint, t).map(({ label, photo }, index) => (
                    <a href={toMediaUrl(photo)} target="_blank" rel="noopener noreferrer" key={`${label}-${index}`}>
                      <img src={toMediaUrl(photo)} alt={`${label} evidence`} loading="lazy" />
                      <span>{label}</span>
                    </a>
                  ))}
                </div>
              ) : <p className="uc-empty">{t('updated_complaints.no_citizen_images')}</p>}
            </div>
          </section>

          <section className="uc-panel">
            <div className="uc-panel-heading">
              <span className="uc-eyebrow">{t('updated_complaints.latest_activity_first')}</span>
              <h2>{t('updated_complaints.update_information')}</h2>
            </div>
            <dl className="uc-facts">
              <div><dt>{t('updated_complaints.work_performed')}</dt><dd>{selectedRecord.complaint.inspection?.actionTaken || notRecorded}</dd></div>
              <div><dt>{t('updated_complaints.staff_remarks')}</dt><dd>{selectedRecord.complaint.inspection?.remarks || notRecorded}</dd></div>
              <div><dt>{t('updated_complaints.inspection_date')}</dt><dd>{formatDateTime(selectedRecord.complaint.inspection?.inspectionDate, notRecorded)}</dd></div>
              <div><dt>{t('updated_complaints.completion_date')}</dt><dd>{formatDateTime(selectedRecord.complaint.inspection?.completionDate, notRecorded)}</dd></div>
              <div className="uc-fact-wide"><dt>{t('updated_complaints.verifier_feedback')}</dt><dd>{selectedRecord.complaint.verifierRemarks || selectedRecord.complaint.previousRemarks || t('updated_complaints.no_verifier_feedback')}</dd></div>
            </dl>
            {showUpdateHistory && (
              <div className="uc-evidence">
                <h3>{t('updated_complaints.update_history')}</h3>
                <ol className="uc-history">
                  {selectedRecord.history.map((entry) => (
                    <li key={entry.id}>
                      <div className="uc-history-topline">
                        <strong>{entry.actor}</strong>
                        <time>{formatDateTime(entry.time, notRecorded)}</time>
                      </div>
                      <p>{entry.details}</p>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            <div className="uc-evidence">
              <h3>{t('updated_complaints.work_evidence')}</h3>
              {getWorkPhotos(selectedRecord.complaint, t).length ? (
                <div className="uc-photo-grid">
                  {getWorkPhotos(selectedRecord.complaint, t).map(({ label, photo }, index) => (
                    <a href={toMediaUrl(photo)} target="_blank" rel="noopener noreferrer" key={`${label}-${index}`}>
                      <img src={toMediaUrl(photo)} alt={`${label} evidence`} loading="lazy" />
                      <span>{label}</span>
                    </a>
                  ))}
                </div>
              ) : <p className="uc-empty">{t('updated_complaints.no_work_images')}</p>}
            </div>
          </section>
        </div>
      ) : (
        <section className="uc-panel uc-table-panel">
          <div className="uc-table-heading">
            <div>
              <h2>{listTitle}</h2>
              <p>{filteredComplaints.length} {filteredComplaints.length === 1 ? t('updated_complaints.updated_complaint_singular') : t('updated_complaints.updated_complaints_plural')}</p>
            </div>
            <input
              type="search"
              aria-label={t('updated_complaints.search_aria')}
              placeholder={t('updated_complaints.search_placeholder')}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          <div className="uc-table-wrap">
            <table className="uc-table">
              <thead>
                <tr>
                  <th>{t('updated_complaints.col_complaint_no')}</th>
                  <th>{t('updated_complaints.col_citizen')}</th>
                  <th>{t('updated_complaints.col_issue')}</th>
                  <th>{t('updated_complaints.col_updated_by')}</th>
                  <th>{t('updated_complaints.col_latest_update')}</th>
                  <th>{t('updated_complaints.col_date_time')}</th>
                  <th>{t('updated_complaints.col_action')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredComplaints.length ? filteredComplaints.map(({ complaint, latestUpdate }) => (
                  <tr key={complaint.id || complaint._id}>
                    <td className="uc-mono">{complaint.complaintNumber || t('updated_complaints.na')}</td>
                    <td>{complaint.citizenName || t('updated_complaints.guest')}</td>
                    <td>
                      <strong>{complaint.issue || complaint.issueType || complaint.category || t('updated_complaints.complaint')}</strong>
                      <small>{typeof complaint.location === "string" ? complaint.location : complaint.location?.address || t('updated_complaints.location_not_recorded')}</small>
                    </td>
                    <td><span className="uc-actor-badge">{latestUpdate.actor}</span></td>
                    <td className="uc-update-summary">{latestUpdate.details}</td>
                    <td>{formatDateTime(latestUpdate.time, notRecorded)}</td>
                    <td>
                      <button
                        className="uc-view-btn"
                        type="button"
                        onClick={() => setSelectedComplaintId(String(complaint.id || complaint._id))}
                      >
                        {t('updated_complaints.view_details')}
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr><td className="uc-empty-row" colSpan="7">{t('updated_complaints.no_updates_match_search')}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
};

export default UpdatedComplaints;