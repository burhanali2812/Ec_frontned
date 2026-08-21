
import { getToken } from "firebase/messaging";
import { messaging } from "../firebase";

export const getFCMToken = async () => {
  try {
    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      console.log("❌ Notification permission denied");
      return null;
    }

    const registration =
      await navigator.serviceWorker.register(
        "/firebase-messaging-sw.js"
      );

    console.log("✅ Firebase service worker registered");

    const token = await getToken(messaging, {
      vapidKey: "BHjs62vR2_HU7oKqnXh-mfXctz4ymNUB67GjAoT1ycVYQEgB44_N2ijsYvnBD4Hx0RtsBGKaoOj6Lw1lpGHTFKQ",
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