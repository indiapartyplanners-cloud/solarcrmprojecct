import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD5KZ_6oXrjmhsYuOK0pEinZKk-Pp0p6eA",
  authDomain: "solarproject-f1225.firebaseapp.com",
  projectId: "solarproject-f1225",
  storageBucket: "solarproject-f1225.firebasestorage.app",
  messagingSenderId: "740253053501",
  appId: "1:740253053501:web:8eead4354257d1bbe17054",
  measurementId: "G-0PXV6G4HS5",
};

const app = initializeApp(firebaseConfig);

void isSupported()
  .then((supported) => {
    if (supported) {
      getAnalytics(app);
    }
  })
  .catch(() => undefined);

export const db = getFirestore(app);
