const fs = require("fs");
const path = require("path");
const { applicationDefault, getApps, initializeApp } = require("firebase-admin/app");
const { getMessaging: getFirebaseMessaging } = require("firebase-admin/messaging");

const getMessaging = () => {
  const appName = "myroad-india-push";
  let app = getApps().find((configuredApp) => configuredApp.name === appName);
  if (!app) {
    const configuredPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || "config/serviceAccountKey.json";
    const serviceAccountPath = path.isAbsolute(configuredPath)
      ? configuredPath
      : path.resolve(__dirname, "..", configuredPath);

    if (!fs.existsSync(serviceAccountPath)) {
      throw new Error("Firebase service account credentials were not found.");
    }

    process.env.GOOGLE_APPLICATION_CREDENTIALS = serviceAccountPath;
    app = initializeApp({
      credential: applicationDefault(),
    }, appName);
  }

  return getFirebaseMessaging(app);
};

module.exports = { getMessaging };
