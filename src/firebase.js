import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { firebaseConfig } from "./firebaseConfig.js";

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);