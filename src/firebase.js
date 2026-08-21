import { initializeApp } from "firebase/app";
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyCAAw6dmMh8kijIxm6Gw4UbpDFLbWRK6O8",
  authDomain: "the-education-s-cradle.firebaseapp.com",
  projectId: "the-education-s-cradle",
  storageBucket: "the-education-s-cradle.firebasestorage.app",
  messagingSenderId: "869963478865",
  appId: "1:869963478865:web:c8eef62da8e94312aa0570",
  measurementId: "G-NT6ZWK6K88",
};

const app = initializeApp(firebaseConfig);

export const messaging = getMessaging(app);
export default app;