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

const sendPushNotifications = async (notifications) => {
  if (!notifications.length) return;

  const recipients = await Promise.all(notifications.map(async (notification) => {
    const filter = { role: notification.role };
    if (notification.userId) {
      filter.userId = notification.userId;
    } else if (notification.role === "citizen") {
      return { notification, devices: [] };
    }
    return {
      notification,
      devices: await PushDevice.find(filter).select("_id token").lean(),
    };
  }));
  const deliveries = recipients.filter(({ devices }) => devices.length > 0);
  if (!deliveries.length) return;

  const messaging = getMessaging();
  for (const { notification, devices } of deliveries) {
    const notificationId = String(notification._id);
    const complaintId = notification.complaintId ? String(notification.complaintId) : "";
    for (let offset = 0; offset < devices.length; offset += 500) {
      const batch = devices.slice(offset, offset + 500);
      try {
        const response = await messaging.sendEachForMulticast({
          tokens: batch.map((device) => device.token),
          data: {
            title: String(notification.type || "MyRoad India"),
            body: String(notification.message || "You have a new update."),
            url: dashboardUrls[notification.role](notificationId, complaintId),
            notificationId,
            complaintId,
            role: String(notification.role),
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
            role: notification.role,
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
          role: notification.role,
          errorCode: error.code || "unknown",
        });
      }
    }
  }
};

const createNotifications = async (entries) => {
  if (!Array.isArray(entries) || entries.length === 0) return [];
  const notifications = await Notification.insertMany(entries);

  try {
    await sendPushNotifications(notifications);
  } catch (error) {
    console.error("Push delivery failed; in-app notifications were saved:", error);
  }

  return notifications;
};

module.exports = { createNotifications, sendPushNotifications };
