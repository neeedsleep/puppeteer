import { initializeApp } from "firebase/app";
import { getFirestore } from 'firebase/firestore';
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDh61V0KYe5cMEkI523R134iTNqIDUMaGY",
  authDomain: "tower-1eaf9.firebaseapp.com",
  projectId: "tower-1eaf9",
  storageBucket: "tower-1eaf9.appspot.com",
  messagingSenderId: "455458026408",
  appId: "1:455458026408:web:4ae3ac252b55d56722a39d"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);