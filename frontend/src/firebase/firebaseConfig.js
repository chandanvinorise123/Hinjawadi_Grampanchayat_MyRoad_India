import { getApps, initializeApp } from "firebase/app";
import { getMessaging, isSupported, onMessage, getToken } from "firebase/messaging";

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
const firebaseConfigured = Object.values(firebaseConfig).every(Boolean) && Boolean(vapidKey);

export const isPushConfigured = () => firebaseConfigured;

const getApp = () => {
  if (!firebaseConfigured) {
    throw new Error("Firebase web push configuration is incomplete.");
  }
  return getApps()[0] || initializeApp(firebaseConfig);
};

export const registerPushToken = async () => {
  if (!(await isSupported())) {
    throw new Error("This browser does not support web push notifications.");
  }

  const workerUrl = new URL("/firebase-messaging-sw.js", window.location.origin);
  workerUrl.searchParams.set("config", JSON.stringify(firebaseConfig));
  const serviceWorkerRegistration = await navigator.serviceWorker.register(workerUrl);
  const messaging = getMessaging(getApp());
  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration,
  });

  if (!token) {
    throw new Error("Firebase did not provide a device registration token.");
  }
  return token;
};

export const listenForForegroundPush = async (onNotification) => {
  if (!(await isSupported())) return () => {};
  return onMessage(getMessaging(getApp()), onNotification);
};
