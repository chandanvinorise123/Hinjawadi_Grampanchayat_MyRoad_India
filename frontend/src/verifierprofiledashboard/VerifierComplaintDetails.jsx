import React from "react";
import { useTranslation } from "react-i18next"; // ✅ ADDED
import "./VerifierComplaintDetails.css";
import ComplaintImage from "./ComplaintImage";

const formatDate = (value, notRecordedText = "Not recorded") => {
  if (!value) return notRecordedText;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
};

const VerifierComplaintDetails = ({ complaint }) => {
  const { t } = useTranslation(); // ✅ ADDED
  const notRecorded = t('verifier_complaint_details.not_recorded');

  if (!complaint) return null;

  const citizenDetails = [
    [t('verifier_complaint_details.citizen'), complaint.citizenName || t('verifier_complaint_details.not_available')],
    [t('verifier_complaint_details.citizen_contact'), complaint.citizenContact || t('verifier_complaint_details.not_available')],
    [t('verifier_complaint_details.citizen_email'), complaint.citizenProfile?.email || t('verifier_complaint_details.not_available')],
    [t('verifier_complaint_details.department'), complaint.department || t('verifier_complaint_details.not_assigned')],
    [t('verifier_complaint_details.assigned_staff'), complaint.assignedStaff || t('verifier_complaint_details.not_assigned')],
    [t('verifier_complaint_details.assigned_verifier'), complaint.assignedVerifier || t('verifier_complaint_details.not_assigned')],
    [t('verifier_complaint_details.priority'), complaint.priority || t('verifier_complaint_details.normal')],
    [t('verifier_complaint_details.submitted'), formatDate(complaint.createdAt || complaint.date, notRecorded)],
    [t('verifier_complaint_details.last_updated'), formatDate(complaint.updatedAt, notRecorded)],
    [t('verifier_complaint_details.landmark'), complaint.landmark || t('verifier_complaint_details.not_provided')],
  ];

  const workDetails = [
    [t('verifier_complaint_details.inspection_date'), formatDate(complaint.inspection?.inspectionDate, notRecorded)],
    [t('verifier_complaint_details.work_completion_date'), formatDate(complaint.inspection?.completionDate, notRecorded)],
  ];

  return (
    <div className="vcd-layout" aria-label={t('verifier_complaint_details.aria_complaint_work_details')}>
      <section className="vcd-panel" aria-labelledby="vcd-citizen-heading">
        <h4 id="vcd-citizen-heading">{t('verifier_complaint_details.citizen_complaint_details')}</h4>
        <div className="vcd-grid">
          {citizenDetails.map(([label, value]) => (
            <div className="vcd-item" key={label}>
              <span>{label}</span>
              <b>{value}</b>
            </div>
          ))}
          <div className="vcd-item vcd-wide">
            <span>{t('verifier_complaint_details.reported_description')}</span>
            <b>{complaint.description || t('verifier_complaint_details.no_description_provided')}</b>
          </div>
          <div className="vcd-item vcd-wide">
            <span>{t('verifier_complaint_details.complaint_location')}</span>
            <b>{complaint.location || t('verifier_complaint_details.location_pending')}</b>
          </div>
          {complaint.coordinates?.latitude != null && complaint.coordinates?.longitude != null && (
            <div className="vcd-item vcd-wide">
              <span>{t('verifier_complaint_details.gps_coordinates')}</span>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${complaint.coordinates.latitude},${complaint.coordinates.longitude}`)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {complaint.coordinates.latitude}, {complaint.coordinates.longitude} · {t('verifier_complaint_details.open_map')}
              </a>
            </div>
          )}
        </div>
      </section>

      <section className="vcd-panel" aria-labelledby="vcd-work-heading">
        <h4 id="vcd-work-heading">{t('verifier_complaint_details.inspection_work_details')}</h4>
        <div className="vcd-grid">
          {workDetails.map(([label, value]) => (
            <div className="vcd-item" key={label}>
              <span>{label}</span>
              <b>{value}</b>
            </div>
          ))}
          <div className="vcd-item vcd-wide">
            <span>{t('verifier_complaint_details.staff_inspection_remarks')}</span>
            <b>{complaint.inspection?.remarks || t('verifier_complaint_details.no_staff_inspection_remarks')}</b>
          </div>
          <div className="vcd-item vcd-wide">
            <span>{t('verifier_complaint_details.action_taken_by_staff')}</span>
            <b>{complaint.inspection?.actionTaken || t('verifier_complaint_details.no_work_action_recorded')}</b>
          </div>
          {complaint.verifierRemarks && (
            <div className="vcd-item vcd-wide">
              <span>{t('verifier_complaint_details.latest_verifier_feedback')}</span>
              <b>{complaint.verifierRemarks}</b>
            </div>
          )}
        </div>
        {complaint.photos?.verification && (
          <div className="vcd-verification-photo">
            <span>{t('verifier_complaint_details.physical_verification_evidence')}</span>
            <ComplaintImage
              src={complaint.photos.verification}
              alt={t('verifier_complaint_details.physical_verification_evidence')}
              fallbackClassName="vcd-photo-fallback"
            />
          </div>
        )}
      </section>
    </div>
  );
};

export default VerifierComplaintDetails;