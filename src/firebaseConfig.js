// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
export const firebaseConfig = {
  apiKey: "AIzaSyDrwnXNKNpSq8fz6jQTgoAFYjv9lhuzTBc",
  authDomain: "kuhlwaregames.firebaseapp.com",
  projectId: "kuhlwaregames",
  storageBucket: "kuhlwaregames.firebasestorage.app",
  messagingSenderId: "701807768292",
  appId: "1:701807768292:web:91599dd1a1cf309c58f2f1",
  measurementId: "G-QKRQNJQP4B"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);