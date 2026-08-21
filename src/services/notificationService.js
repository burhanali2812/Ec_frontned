import { getToken } from "firebase/messaging";
import { messaging } from "../firebase";

export const getFCMToken = async () => {
  try {
    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      console.log("❌ Notification permission denied");
      return null;
    }

    // Register Firebase service worker
    await navigator.serviceWorker.register("/firebase-messaging-sw.js");

    // IMPORTANT: Wait until an active service worker is available
    const registration = await navigator.serviceWorker.ready;

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