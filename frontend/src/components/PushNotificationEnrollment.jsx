import { useCallback, useEffect, useRef, useState } from "react";
import {
  isPushConfigured,
  listenForForegroundPush,
  registerPushToken,
} from "../firebase/firebaseConfig";
import "./PushNotificationEnrollment.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3200/api";
const PUSH_API_URL = `${API_BASE_URL}/push/devices`;

const readStoredUser = () => {
  try {
    const user = localStorage.getItem("user");
    const token = localStorage.getItem("token");
    return user && token ? { user: JSON.parse(user), token } : null;
  } catch (error) {
    console.error("Unable to read login data for push notifications:", error);
    return null;
  }
};

const registerDevice = async (activeSession) => {
  const deviceToken = await registerPushToken();
  const response = await fetch(PUSH_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${activeSession.token}`,
    },
    body: JSON.stringify({ token: deviceToken }),
  });
  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.message || "Unable to register this device for notifications.");
  }
};

const PushNotificationEnrollment = () => {
  const [session, setSession] = useState(readStoredUser);
  const [permission, setPermission] = useState(
    typeof window !== "undefined" && "Notification" in window
      ? window.Notification.permission
      : "unsupported"
  );
  const [message, setMessage] = useState("");
  const [enrollmentFailed, setEnrollmentFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const registering = useRef(false);

  const enrollDevice = useCallback(async (activeSession, requestPermission = false) => {
    if (!activeSession || registering.current) return;
    registering.current = true;
    if (requestPermission) {
      setBusy(true);
      setMessage("");
      setEnrollmentFailed(false);
    }
    try {
      let nextPermission = window.Notification.permission;
      if (requestPermission && nextPermission === "default") {
        nextPermission = await window.Notification.requestPermission();
      }
      if (requestPermission) setPermission(nextPermission);
      if (nextPermission !== "granted") {
        if (nextPermission === "denied") {
          setMessage("Notifications are blocked in your browser settings.");
        }
        return;
      }

      await registerDevice(activeSession);
      if (requestPermission) setMessage("Notifications are enabled on this device.");
    } catch (error) {
      console.error("Push notification enrollment failed:", error);
      setMessage(error.message || "Unable to enable notifications.");
      setEnrollmentFailed(true);
    } finally {
      registering.current = false;
      if (requestPermission) setBusy(false);
    }
  }, []);

  useEffect(() => {
    const updateSession = () => {
      setSession(readStoredUser());
      setMessage("");
      setEnrollmentFailed(false);
    };
    window.addEventListener("authChange", updateSession);
    window.addEventListener("storage", updateSession);
    return () => {
      window.removeEventListener("authChange", updateSession);
      window.removeEventListener("storage", updateSession);
    };
  }, []);

  useEffect(() => {
    if (!session || !("Notification" in window) || !isPushConfigured()) return;
    if (window.Notification.permission !== "granted") return;
    let isActive = true;
    registerDevice(session).catch((error) => {
      console.error("Push device synchronization failed:", error);
      if (isActive) {
        setMessage(error.message || "Unable to register this device for notifications.");
        setEnrollmentFailed(true);
      }
    });
    return () => {
      isActive = false;
    };
  }, [session]);

  useEffect(() => {
    if (!session || permission !== "granted") return undefined;
    let unsubscribe;
    let isMounted = true;
    listenForForegroundPush((payload) => {
      const data = payload.data || {};
      const notification = new window.Notification(data.title || "MyRoad India", {
        body: data.body || "You have a new update.",
        icon: "/favicon.svg",
      });
      notification.onclick = () => {
        window.focus();
        if (data.url) window.location.assign(data.url);
      };
    }).then((stopListening) => {
      if (isMounted) unsubscribe = stopListening;
      else stopListening();
    }).catch((error) => {
      console.error("Unable to listen for foreground push messages:", error);
    });
    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [session, permission]);

  if (!session || !isPushConfigured() || !("Notification" in window)) return null;
  if (permission === "granted" && !message) return null;
  const displayMessage = message || (
    permission === "denied"
      ? "Notifications are blocked. Allow them in this browser's site settings."
      : "Enable notifications separately in each browser and on each device."
  );

  return (
    <aside className="push-enrollment" aria-live="polite">
      {displayMessage && <span>{displayMessage}</span>}
      {permission !== "granted" && permission !== "denied" && (
        <button
          type="button"
          onClick={() => void enrollDevice(session, true)}
          disabled={busy}
        >
          {busy ? "Enabling..." : "Enable notifications"}
        </button>
      )}
      {permission === "granted" && message && (
        enrollmentFailed
          ? <button type="button" onClick={() => void enrollDevice(session, true)} disabled={busy}>Retry</button>
          : <button type="button" onClick={() => setMessage("")} aria-label="Dismiss notification message">Dismiss</button>
      )}
    </aside>
  );
};

export default PushNotificationEnrollment;
