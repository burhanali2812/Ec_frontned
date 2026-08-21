import {
  getToken,
  onMessage,
} from "firebase/messaging";

import { messaging } from "../firebase";

// Get FCM Token
export const getFCMToken = async () => {
  try {
    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      console.log("❌ Notification permission denied");
      return null;
    }

    // Register Firebase service worker
    const registration = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js"
    );

    console.log("✅ Firebase service worker registered");

    // Wait until service worker is active
    await navigator.serviceWorker.ready;

    console.log("✅ Firebase service worker is active");

    const token = await getToken(messaging, {
      vapidKey:
        "BHjs62vR2_HU7oKqnXh-mfXctz4ymNUB67GjAoT1ycVYQEgB44_N2ijsYvnBD4Hx0RtsBGKaoOj6Lw1lpGHTFKQ",

      serviceWorkerRegistration: registration,
    });

    if (token) {
      console.log("✅ FCM Token:", token);
      return token;
    }

    console.log("❌ No FCM token received");

    return null;
  } catch (error) {
    console.error("❌ FCM Token Error:", error);
    return null;
  }
};


// FOREGROUND MESSAGE LISTENER
export const listenForMessages = () => {
 onMessage(messaging, (payload) => {
  console.log("🔔 FULL FCM PAYLOAD:", JSON.stringify(payload, null, 2));

  const title =
    payload.notification?.title ||
    payload.data?.title ||
    "Education Cradle";

  const body =
    payload.notification?.body ||
    payload.data?.body ||
    "You have a new notification.";

  console.log("🔔 TITLE:", title);
  console.log("🔔 BODY:", body);

  if (Notification.permission === "granted") {
    new Notification(title, {
      body: body,
      icon: "/frontend/public/logo512.png",
    });
  }
});
};