importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

const configParam = new URL(self.location.href).searchParams.get("config");
if (!configParam) {
  throw new Error("Firebase configuration was not provided to the messaging worker.");
}

firebase.initializeApp(JSON.parse(configParam));
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {};
  const title = data.title || "MyRoad India";
  const options = {
    body: data.body || "You have a new update.",
    icon: "/favicon.svg",
    data: {
      url: data.url || "/",
      notificationId: data.notificationId || "",
    },
  };
  return self.registration.showNotification(title, options);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existingClient = clients.find(
        (client) => new URL(client.url).origin === self.location.origin
      );
      if (existingClient) {
        return existingClient.navigate(targetUrl).then(() => existingClient.focus());
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
