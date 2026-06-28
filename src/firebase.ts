import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyD-mock-api-key-for-preview",
  authDomain: "united-factor-xf4nj.firebaseapp.com",
  projectId: "united-factor-xf4nj",
  storageBucket: "united-factor-xf4nj.appspot.com",
  messagingSenderId: "450410710689",
  appId: "1:450410710689:web:a6fcf74094a9a08a"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
