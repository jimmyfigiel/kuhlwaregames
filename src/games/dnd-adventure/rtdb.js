// Interim bridge: this game's real resolution runs server-side
// (aidm-server, Python, calling a local Ollama model) against the fpfh-vtt
// Firebase project's Realtime Database -- not this app's own Firestore
// project. Migrating the Python server to this project's Firestore needs a
// new service-account credential, deferred for now. This is a second,
// independent Firebase app instance scoped to just this game; it never
// touches kuhlwaregames' own Firestore data.
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { getDatabase, onValue, push, ref, set } from "firebase/database";

const rtdbConfig = {
  apiKey: "AIzaSyADa_QRcOmjrssrxgh5b3EHRoZFD2BtGxU",
  authDomain: "fpfh-vtt.firebaseapp.com",
  databaseURL: "https://fpfh-vtt-default-rtdb.firebaseio.com",
  projectId: "fpfh-vtt",
  storageBucket: "fpfh-vtt.firebasestorage.app",
  messagingSenderId: "661393712377",
  appId: "1:661393712377:web:b64ac5467f4603a8f2ae28",
};

const rtdbApp = initializeApp(rtdbConfig, "dnd-adventure-rtdb");
const rtdbAuth = getAuth(rtdbApp);
const rtdb = getDatabase(rtdbApp);

let signInPromise = null;

export function ensureSignedIn() {
  if (!signInPromise) {
    signInPromise = new Promise((resolve, reject) => {
      onAuthStateChanged(rtdbAuth, (user) => {
        if (user) resolve(user.uid);
      });
      signInAnonymously(rtdbAuth).catch(reject);
    });
  }
  return signInPromise;
}

export function sendCommand(sessionId, playerId, text) {
  return push(ref(rtdb, `sessions/${sessionId}/commands`), {
    player_id: playerId,
    text,
    ts: Date.now(),
    status: "pending",
  });
}

export function listenLog(sessionId, onEntries) {
  return onValue(ref(rtdb, `sessions/${sessionId}/log`), (snapshot) => {
    const raw = snapshot.val() || {};
    onEntries(Object.values(raw).sort((a, b) => a.ts - b.ts));
  });
}

export function listenCharacter(sessionId, playerId, onCharacter) {
  return onValue(
    ref(rtdb, `sessions/${sessionId}/players/${playerId}/character`),
    (snapshot) => onCharacter(snapshot.val())
  );
}

// Character sheets are keyed on the player's own stable identity (their
// kuhlwaregames player code), not join order -- so `set` with that id as
// the path, not `push` with an auto-generated key.
export function submitCharacterRequest(sessionId, playerId, { name, race, charClass, abilities }) {
  return set(ref(rtdb, `sessions/${sessionId}/character_requests/${playerId}`), {
    name,
    race,
    char_class: charClass,
    abilities,
    status: "pending",
    ts: Date.now(),
  });
}

export function listenCharacterRequest(sessionId, playerId, onRequest) {
  return onValue(
    ref(rtdb, `sessions/${sessionId}/character_requests/${playerId}`),
    (snapshot) => onRequest(snapshot.val())
  );
}
