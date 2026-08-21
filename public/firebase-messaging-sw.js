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

  const notificationTitle =
    payload.notification?.title || "The 'Education's Cradle";

  const notificationOptions = {
    body:
      payload.notification?.body ||
      "You have a new notification.",
    icon: "/logo512.png",
  };

  self.registration.showNotification(
    notificationTitle,
    notificationOptions
  );
});