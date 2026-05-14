import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, serverTimestamp } from "firebase/firestore";

/*
  Get these values from:

  Firebase Console
  → Project settings
  → General
  → Your apps
  → Web app
  → SDK setup and configuration
  → Config

  It will look like:

  const firebaseConfig = {
    apiKey: "...",
    authDomain: "...",
    projectId: "kuhlwaregames",
    storageBucket: "...",
    messagingSenderId: "...",
    appId: "..."
  };
*/

const firebaseConfig = {
  apiKey: "PASTE-YOUR-apiKey-HERE",
  authDomain: "PASTE-YOUR-authDomain-HERE",
  projectId: "kuhlwaregames",
  storageBucket: "PASTE-YOUR-storageBucket-HERE",
  messagingSenderId: "PASTE-YOUR-messagingSenderId-HERE",
  appId: "PASTE-YOUR-appId-HERE",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seed() {
  console.log("Seeding Firestore starter data...");

  await setDoc(doc(db, "players", "jimmy"), {
    displayName: "Jimmy",
    pin: "1234",
    isSuperuser: true,
    active: true,
    authorizedToPlay: ["player-portal"],
    authorizedToCreate: ["player-portal"],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await setDoc(doc(db, "games", "player-portal"), {
    title: "Player Portal",
    gameId: "player-portal",
    enabled: true,
    minPlayers: 1,
    maxPlayers: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  console.log("Done.");
  console.log("Created:");
  console.log("- players/jimmy");
  console.log("- games/player-portal");
}

seed().catch((error) => {
  console.error("Seed failed:");
  console.error(error);
  process.exit(1);
});