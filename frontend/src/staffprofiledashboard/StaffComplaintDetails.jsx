import React from "react";
import { useTranslation } from "react-i18next"; // ✅ ADDED
import { toMediaUrl } from "../utils/dashboardApi";
import ComplaintLocationMap from "../components/maps/ComplaintLocationMap";
import "./StaffComplaintDetails.css";

const formatDate = (value, notRecordedText = "Not recorded") => {
  if (!value) return notRecordedText;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
};

const StaffComplaintDetails = ({ complaint, showMap = true, showActivity = true, layout = "default", hideEvidence = false }) => {
  const { t } = useTranslation(); // ✅ ADDED
  const notRecorded = t('staff_complaint_details.not_recorded');

  if (!complaint) return null;

  const coordinates = complaint.coordinates || {};
  const hasCoordinates = coordinates.latitude !== null
    && coordinates.latitude !== undefined
    && coordinates.latitude !== ""
    && coordinates.longitude !== null
    && coordinates.longitude !== undefined
    && coordinates.longitude !== ""
    && Number.isFinite(Number(coordinates.latitude))
    && Number.isFinite(Number(coordinates.longitude));
    
  const mapQuery = hasCoordinates
    ? `${coordinates.latitude},${coordinates.longitude}`
    : complaint.location;
  const mapPosition = hasCoordinates
    ? { lat: Number(coordinates.latitude), lng: Number(coordinates.longitude) }
    : null;
    
  const citizenPhotos = Array.isArray(complaint.citizenPhotos)
    ? complaint.citizenPhotos
    : Array.isArray(complaint.images) ? complaint.images : [];
    
  const beforeWorkPhoto = citizenPhotos[0] || complaint.photos?.before;
  const workPhotos = [
    [t('staff_complaint_details.before_work_citizen_guest'), beforeWorkPhoto],
    [t('staff_complaint_details.after_work'), complaint.inspection?.completionPhoto || complaint.photos?.after],
  ].filter(([, photo]) => photo);
  
  const activity = showActivity && Array.isArray(complaint.log) ? [...complaint.log].reverse() : [];

  if (layout === "split") {
    const complaintInformation = [
      [t('staff_complaint_details.citizen'), complaint.citizenName],
      [t('staff_complaint_details.contact'), complaint.citizenContact],
      [t('staff_complaint_details.email'), complaint.citizenProfile?.email],
      [t('staff_complaint_details.department'), complaint.department],
      [t('staff_complaint_details.priority'), complaint.priority],
      [t('staff_complaint_details.assigned_staff'), complaint.assignedStaff],
      [t('staff_complaint_details.assigned_verifier'), complaint.assignedVerifier],
      [t('staff_complaint_details.submitted'), formatDate(complaint.createdAt || complaint.date, notRecorded)],
      [t('staff_complaint_details.last_updated'), formatDate(complaint.updatedAt, notRecorded)],
      [t('staff_complaint_details.landmark'), complaint.landmark],
    ];
    const workInformation = [
      [t('staff_complaint_details.current_status'), complaint.status],
      [t('staff_complaint_details.inspection_date'), formatDate(complaint.inspection?.inspectionDate, notRecorded)],
      [t('staff_complaint_details.completion_date'), formatDate(complaint.inspection?.completionDate, notRecorded)],
      [t('staff_complaint_details.work_performed'), complaint.inspection?.actionTaken],
      [t('staff_complaint_details.staff_remarks'), complaint.inspection?.remarks],
      [t('staff_complaint_details.verifier_feedback'), complaint.verifierRemarks || complaint.previousRemarks],
    ];

    return (
      <div className="scd-split-layout">
        <section className="scd-split-section" aria-label={t('staff_complaint_details.complaint_information')}>
          <h4>{t('staff_complaint_details.complaint_information')}</h4>
          <dl className="scd-point-list">
            {complaintInformation.map(([label, value]) => (
              <div className="scd-point" key={label}>
                <dt>{label}</dt>
                <dd>{value || notRecorded}</dd>
              </div>
            ))}
            <div className="scd-point scd-point-wide">
              <dt>{t('staff_complaint_details.description')}</dt>
              <dd>{complaint.description || t('staff_complaint_details.no_description_provided')}</dd>
            </div>
            <div className="scd-point scd-point-wide">
              <dt>{t('staff_complaint_details.location')}</dt>
              <dd>
                {complaint.location || t('staff_complaint_details.location_not_recorded')}
                {mapQuery && (
                  <a
                    className="scd-map-link"
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t('staff_complaint_details.open_location_in_map')}
                  </a>
                )}
                {showMap && mapPosition && (
                  <ComplaintLocationMap complaint={complaint} position={mapPosition} />
                )}
              </dd>
            </div>
          </dl>
          <div className="scd-split-evidence">
            <h5>{t('staff_complaint_details.citizen_photographs')}</h5>
            {citizenPhotos.length ? (
              <div className="scd-photo-grid">
                {citizenPhotos.map((photo, index) => (
                  <a
                    className="scd-photo"
                    href={toMediaUrl(photo)}
                    target="_blank"
                    rel="noopener noreferrer"
                    key={`${photo}-${index}`}
                  >
                    <img src={toMediaUrl(photo)} alt={`${t('staff_complaint_details.initial_evidence', { index: index + 1 })}`} loading="lazy" />
                    <span>{t('staff_complaint_details.initial_evidence', { index: index + 1 })}</span>
                  </a>
                ))}
              </div>
            ) : <p className="scd-empty">{t('staff_complaint_details.no_citizen_photographs_attached')}</p>}
          </div>
        </section>

        <section className="scd-split-section" aria-label={t('staff_complaint_details.work_information')}>
          <h4>{t('staff_complaint_details.work_information')}</h4>
          <dl className="scd-point-list">
            {workInformation.map(([label, value]) => (
              <div className="scd-point" key={label}>
                <dt>{label}</dt>
                <dd>{value || notRecorded}</dd>
              </div>
            ))}
          </dl>
          <div className="scd-split-evidence">
            <h5>{t('staff_complaint_details.before_after_work_evidence')}</h5>
            {workPhotos.length ? (
              <div className="scd-photo-grid">
                {workPhotos.map(([label, photo]) => (
                  <a
                    className="scd-photo"
                    href={toMediaUrl(photo)}
                    target="_blank"
                    rel="noopener noreferrer"
                    key={label}
                  >
                    <img src={toMediaUrl(photo)} alt={`${label} work evidence`} loading="lazy" />
                    <span>{label}</span>
                  </a>
                ))}
              </div>
            ) : <p className="scd-empty">{t('staff_complaint_details.no_staff_work_photographs_attached')}</p>}
          </div>
        </section>
      </div>
    );
  }

  if (layout === "complaint-only") {
    const complaintInformation = [
      [t('staff_complaint_details.citizen'), complaint.citizenName],
      [t('staff_complaint_details.contact'), complaint.citizenContact],
      [t('staff_complaint_details.email'), complaint.citizenProfile?.email],
      [t('staff_complaint_details.department'), complaint.department],
      [t('staff_complaint_details.priority'), complaint.priority],
      [t('staff_complaint_details.assigned_staff'), complaint.assignedStaff],
      [t('staff_complaint_details.assigned_verifier'), complaint.assignedVerifier],
      [t('staff_complaint_details.submitted'), formatDate(complaint.createdAt || complaint.date, notRecorded)],
      [t('staff_complaint_details.last_updated'), formatDate(complaint.updatedAt, notRecorded)],
      [t('staff_complaint_details.landmark'), complaint.landmark],
    ];

    return (
      <div className="scd-complaint-only">
        <dl className="scd-point-list">
          {complaintInformation.map(([label, value]) => (
            <div className="scd-point" key={label}>
              <dt>{label}</dt>
              <dd>{value || notRecorded}</dd>
            </div>
          ))}
          <div className="scd-point scd-point-wide">
            <dt>{t('staff_complaint_details.description')}</dt>
            <dd>{complaint.description || t('staff_complaint_details.no_description_provided')}</dd>
          </div>
          <div className="scd-point scd-point-wide">
            <dt>{t('staff_complaint_details.location')}</dt>
            <dd>
              {complaint.location || t('staff_complaint_details.location_not_recorded')}
              {mapQuery && (
                <a
                  className="scd-map-link"
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t('staff_complaint_details.open_location_in_map')}
                </a>
              )}
              {showMap && mapPosition && (
                <ComplaintLocationMap complaint={complaint} position={mapPosition} />
              )}
            </dd>
          </div>
        </dl>
        <div className="scd-split-evidence">
          <h5>{t('staff_complaint_details.citizen_photographs')}</h5>
          {citizenPhotos.length ? (
            <div className="scd-photo-grid">
              {citizenPhotos.map((photo, index) => (
                <a
                  className="scd-photo"
                  href={toMediaUrl(photo)}
                  target="_blank"
                  rel="noopener noreferrer"
                  key={`${photo}-${index}`}
                >
                  <img src={toMediaUrl(photo)} alt={`${t('staff_complaint_details.initial_evidence', { index: index + 1 })}`} loading="lazy" />
                  <span>{t('staff_complaint_details.initial_evidence', { index: index + 1 })}</span>
                </a>
              ))}
            </div>
          ) : <p className="scd-empty">{t('staff_complaint_details.no_citizen_photographs_attached')}</p>}
        </div>
        <div className="scd-split-evidence">
          <h5>{t('staff_complaint_details.after_work_photograph')}</h5>
          {complaint.inspection?.completionPhoto ? (
            <div className="scd-photo-grid">
              <a
                className="scd-photo"
                href={toMediaUrl(complaint.inspection.completionPhoto)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  src={toMediaUrl(complaint.inspection.completionPhoto)}
                  alt={t('staff_complaint_details.staff_after_work_completion_evidence')}
                  loading="lazy"
                />
                <span>{t('staff_complaint_details.work_completed')}</span>
              </a>
            </div>
          ) : <p className="scd-empty">{t('staff_complaint_details.no_after_work_photograph_attached')}</p>}
        </div>
      </div>
    );
  }

  return (
    <section className="scd-panel" aria-label={t('staff_complaint_details.full_complaint_workflow_details')}>
      <div className="scd-heading">
        <h3>{t('staff_complaint_details.complaint_assignment_work_details')}</h3>
        <span>{complaint.status || t('staff_complaint_details.status_unavailable')}</span>
      </div>

      <div className="scd-grid">
        {[
          [t('staff_complaint_details.citizen'), complaint.citizenName],
          [t('staff_complaint_details.contact'), complaint.citizenContact],
          [t('staff_complaint_details.citizen_email'), complaint.citizenProfile?.email],
          [t('staff_complaint_details.department'), complaint.department],
          [t('staff_complaint_details.priority'), complaint.priority],
          [t('staff_complaint_details.assigned_staff'), complaint.assignedStaff],
          [t('staff_complaint_details.assigned_verifier'), complaint.assignedVerifier],
          [t('staff_complaint_details.submitted'), formatDate(complaint.createdAt || complaint.date, notRecorded)],
          [t('staff_complaint_details.last_updated'), formatDate(complaint.updatedAt, notRecorded)],
          [t('staff_complaint_details.landmark'), complaint.landmark],
          [t('staff_complaint_details.inspection_date'), formatDate(complaint.inspection?.inspectionDate, notRecorded)],
          [t('staff_complaint_details.completion_date'), formatDate(complaint.inspection?.completionDate, notRecorded)],
        ].map(([label, value]) => (
          <div className="scd-item" key={label}>
            <span>{label}</span>
            <b>{value || notRecorded}</b>
          </div>
        ))}
        <div className="scd-item scd-wide">
          <span>{t('staff_complaint_details.verifier_feedback')}</span>
          <p>{complaint.verifierRemarks || complaint.previousRemarks || t('staff_complaint_details.no_verifier_feedback_recorded')}</p>
        </div>
        <div className="scd-item scd-wide">
          <span>{t('staff_complaint_details.location')}</span>
          <p>{complaint.location || t('staff_complaint_details.location_not_recorded')}</p>
          {mapQuery && (
            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`} target="_blank" rel="noopener noreferrer">
              {hasCoordinates ? `${coordinates.latitude}, ${coordinates.longitude} · ${t('staff_complaint_details.open_map')}` : t('staff_complaint_details.open_location_in_map')}
            </a>
          )}
          {showMap && mapPosition && (
            <ComplaintLocationMap complaint={complaint} position={mapPosition} />
          )}
        </div>
      </div>

      {!hideEvidence && (
        <>
          <div className="scd-evidence-section">
            <h4>{t('staff_complaint_details.citizen_photographs')}</h4>
            {citizenPhotos.length ? (
              <div className="scd-photo-grid">
                {citizenPhotos.map((photo, index) => (
                  <a className="scd-photo" href={toMediaUrl(photo)} target="_blank" rel="noopener noreferrer" key={`${photo}-${index}`}>
                    <img src={toMediaUrl(photo)} alt={`${t('staff_complaint_details.initial_evidence', { index: index + 1 })}`} loading="lazy" />
                    <span>{t('staff_complaint_details.initial_evidence', { index: index + 1 })}</span>
                  </a>
                ))}
              </div>
            ) : <p className="scd-empty">{t('staff_complaint_details.no_citizen_photographs_attached')}</p>}
          </div>

          <div className="scd-evidence-section">
            <h4>{t('staff_complaint_details.before_after_work_evidence')}</h4>
            {workPhotos.length ? (
              <div className="scd-photo-grid">
                {workPhotos.map(([label, photo]) => (
                  <a className="scd-photo" href={toMediaUrl(photo)} target="_blank" rel="noopener noreferrer" key={label}>
                    <img src={toMediaUrl(photo)} alt={`${label} work evidence`} loading="lazy" />
                    <span>{label}</span>
                  </a>
                ))}
              </div>
            ) : <p className="scd-empty">{t('staff_complaint_details.no_staff_work_photographs_attached')}</p>}
          </div>
        </>
      )}

      {showActivity && (
        <div className="scd-evidence-section">
          <h4>{t('staff_complaint_details.admin_staff_verifier_activity')}</h4>
          {activity.length ? (
            <ol className="scd-activity">
              {activity.map((entry, index) => (
                <li key={`${entry.time || "event"}-${index}`}>
                  <b>{entry.actor || t('staff_complaint_details.dashboard')}</b>
                  <span>{formatDate(entry.time, notRecorded)}</span>
                  <p>{entry.text}</p>
                </li>
              ))}
            </ol>
          ) : <p className="scd-empty">{t('staff_complaint_details.no_activity_history_recorded_yet')}</p>}
        </div>
      )}
    </section>
  );
};

export default StaffComplaintDetails;