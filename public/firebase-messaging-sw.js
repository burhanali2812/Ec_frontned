importScripts(
  "https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js"
);

importScripts(
  "https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js"
);

const firebaseConfig = {
  apiKey: "AIzaSyCAAw6dmMh8kijIxm6Gw4UbpDFLbWRK6O8",
  authDomain: "the-education-s-cradle.firebaseapp.com",
  projectId: "the-education-s-cradle",
  storageBucket: "the-education-s-cradle.firebasestorage.app",
  messagingSenderId: "869963478865",
  appId: "1:869963478865:web:c8eef62da8e94312aa0570",
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log(
    "[firebase-messaging-sw.js] Background message:",
    payload
  );

  const title =
    payload.notification?.title ||
    payload.data?.title ||
    "Education Cradle";

  const body =
    payload.notification?.body ||
    payload.data?.body ||
    "You have a new notification.";

  console.log("Notification title:", title);
  console.log("Notification body:", body);

  const notificationOptions = {
    body: body,
    icon: "/logo512.png",
    data: {
      type: payload.data?.type || "GENERAL",
      url: payload.data?.url || "/",
    },
  };

  self.registration.showNotification(
    title,
    notificationOptions
  );
});