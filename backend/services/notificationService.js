const PushDevice = require("../models/PushDevice");
const Notification = require("../models/Notification");
const { getMessaging } = require("./firebaseMessaging");

const dashboardUrls = {
  admin: (notificationId, complaintId) =>
    `/admindashboard?view=notification-monitoring&notificationId=${encodeURIComponent(notificationId)}${complaintId ? `&complaintId=${encodeURIComponent(complaintId)}` : ""}`,
  citizen: (notificationId, complaintId) =>
    `/citizendashboard?view=notifications&notificationId=${encodeURIComponent(notificationId)}${complaintId ? `&complaintId=${encodeURIComponent(complaintId)}` : ""}`,
  staff: (notificationId, complaintId) =>
    `/staffdashboard?view=notifications&notificationId=${encodeURIComponent(notificationId)}${complaintId ? `&complaintId=${encodeURIComponent(complaintId)}` : ""}`,
  verifier: (notificationId, complaintId) =>
    `/verifierdashboard?view=notifications&notificationId=${encodeURIComponent(notificationId)}${complaintId ? `&complaintId=${encodeURIComponent(complaintId)}` : ""}`,
};

const dashboardHomeUrls = {
  admin: "/admindashboard",
  citizen: "/citizendashboard",
  staff: "/staffdashboard",
  verifier: "/verifierdashboard",
};

const sendPushNotifications = async (notifications, { broadcast = false } = {}) => {
  if (!notifications.length) return;

  const events = broadcast
    ? [...new Map(notifications.map((notification) => [
        String(notification.complaintId || notification._id),
        notification,
      ])).values()]
    : notifications;
  const roles = broadcast ? Object.keys(dashboardHomeUrls) : null;
  const recipients = await Promise.all(events.flatMap((notification) =>
    (roles || [notification.role]).map(async (role) => {
      const filter = { role };
      if (!broadcast && notification.userId) {
        filter.userId = notification.userId;
      } else if (!broadcast && role === "citizen") {
        return { notification, role, devices: [] };
      }
      return {
        notification,
        role,
        devices: await PushDevice.find(filter).select("_id token").lean(),
      };
    })
  ));
  const deliveries = recipients.filter(({ devices }) => devices.length > 0);
  if (!deliveries.length) return;

  const messaging = getMessaging();
  for (const { notification, role, devices } of deliveries) {
    const notificationId = String(notification._id);
    const complaintId = notification.complaintId ? String(notification.complaintId) : "";
    for (let offset = 0; offset < devices.length; offset += 500) {
      const batch = devices.slice(offset, offset + 500);
      try {
        const response = await messaging.sendEachForMulticast({
          tokens: batch.map((device) => device.token),
          data: {
            title: broadcast ? "Complaint Update" : String(notification.type || "MyRoad India"),
            body: broadcast
              ? "A complaint was updated in MyRoad India."
              : String(notification.message || "You have a new update."),
            url: broadcast
              ? dashboardHomeUrls[role]
              : dashboardUrls[role](notificationId, complaintId),
            notificationId: broadcast ? "" : notificationId,
            complaintId: broadcast ? "" : complaintId,
            role: String(role),
          },
          webpush: {
            headers: { TTL: "86400" },
          },
        });

        const invalidTokens = response.responses.flatMap((result, index) => {
          if (result.success) return [];
          const code = result.error?.code || "unknown";
          if (code === "messaging/registration-token-not-registered" || code === "messaging/invalid-registration-token") {
            return [batch[index].token];
          }
          console.error("Firebase push delivery failed:", {
            notificationId,
            role,
            errorCode: code,
          });
          return [];
        });

        if (invalidTokens.length) {
          await PushDevice.deleteMany({ token: { $in: invalidTokens } });
        }
      } catch (error) {
        console.error("Firebase push batch failed:", {
          notificationId,
          role,
          errorCode: error.code || "unknown",
        });
      }
    }
  }
};

const createNotifications = async (entries, options) => {
  if (!Array.isArray(entries) || entries.length === 0) return [];
  const notifications = await Notification.insertMany(entries);

  try {
    await sendPushNotifications(notifications, options);
  } catch (error) {
    console.error("Push delivery failed; in-app notifications were saved:", error);
  }

  return notifications;
};

const sendComplaintUpdatePush = async (complaintId) => {
  try {
    await sendPushNotifications(
      [{ _id: complaintId, complaintId, role: "admin" }],
      { broadcast: true }
    );
  } catch (error) {
    console.error("Complaint update push delivery failed:", {
      complaintId: String(complaintId),
      errorCode: error.code || "unknown",
    });
  }
};

module.exports = { createNotifications, sendComplaintUpdatePush, sendPushNotifications };
