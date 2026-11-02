# Hinjawadi_Grampanchayat_MyRoad_India
MyRoad India – A Digital Road &amp; Public Infrastructure Complaint Management System for Hinjawadi Gram Panchayat, enabling citizens to report, track, and manage road and public infrastructure issues efficiently.

## Web push notifications

Authenticated citizens, staff, verifiers, and administrators can enroll each browser/device independently. A subscription in Edge does not enroll Chrome, even on the same computer. Open the same site origin in each browser, sign in, and choose **Enable notifications** when prompted. Notifications are sent to enrolled devices when complaint events are recorded; email is not used. Push delivery requires the browser to support Firebase web messaging, service workers, and notifications, and the site must be served over HTTPS (localhost is allowed for development). Some mobile browsers require the site to be installed as a PWA.

Complaint creation and updates send a generic push alert to all enrolled account devices. Detailed in-app notifications remain scoped to administrators, the complainant, and assigned staff/verifiers.

Configure these values without committing secrets:

- Frontend: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, and `VITE_FIREBASE_VAPID_KEY`.
- Frontend API origin: `VITE_API_BASE_URL` (defaults to `http://localhost:3200/api`).
- Backend: `JWT_SECRET`, `FIREBASE_SERVICE_ACCOUNT_PATH` (defaults to `backend/config/serviceAccountKey.json` when started from the backend directory), `FRONTEND_ORIGINS` (comma-separated frontend origins allowed by CORS), and `PENDING_COMPLAINT_ALERT_DAYS` (defaults to 7).

Keep the Firebase service-account JSON out of source control. The backend must be able to reach Firebase and MongoDB, and its CORS configuration must allow the deployed frontend origin. Login tokens expire after 30 days; users must sign in again after expiry.
