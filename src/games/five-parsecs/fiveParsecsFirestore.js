import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../firebase";

export const FP_COLLECTIONS = [
  "crewMembers",
  "equipment",
  "worlds",
  "patrons",
  "rivals",
  "quests",
  "rumors",
  "encounters",
  "encounterEnemies",
  "enemyTemplates",
  "logEntries",
];

export function fiveParsecsRoot(roomId) {
  return ["rooms", roomId, "fiveParsecs"];
}

export function crewDocRef(roomId) {
  return doc(db, "rooms", roomId, "fiveParsecs", "crew");
}

export function collectionRef(roomId, collectionName) {
  return collection(db, "rooms", roomId, "fiveParsecs", collectionName, "items");
}

export function recordDocRef(roomId, collectionName, recordId) {
  return doc(db, "rooms", roomId, "fiveParsecs", collectionName, "items", recordId);
}

export function subscribeCrew(roomId, callback, onError) {
  return onSnapshot(
    crewDocRef(roomId),
    (snap) => callback(snap.exists() ? snap.data() : null),
    onError
  );
}

export function subscribeCollection(roomId, collectionName, callback, onError) {
  const q = query(collectionRef(roomId, collectionName), orderBy("createdAt", "asc"));
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError
  );
}

export async function saveCrewRecord(roomId, crew, playerId) {
  const nowFields = {
    updatedAt: serverTimestamp(),
    updatedBy: playerId,
  };

  await setDoc(
    crewDocRef(roomId),
    {
      ...crew,
      roomId,
      crewId: crew.crewId || "default",
      createdAt: crew.createdAt || serverTimestamp(),
      ...nowFields,
    },
    { merge: true }
  );
}

export async function addFiveParsecsRecord(roomId, collectionName, record, playerId) {
  const idField = getIdField(collectionName);
  const recordId = record[idField] || crypto.randomUUID();

  await setDoc(recordDocRef(roomId, collectionName, recordId), {
    ...record,
    [idField]: recordId,
    roomId,
    createdAt: serverTimestamp(),
    createdBy: playerId,
    updatedAt: serverTimestamp(),
    updatedBy: playerId,
  });

  return recordId;
}

export async function updateFiveParsecsRecord(roomId, collectionName, recordId, patch, playerId) {
  await updateDoc(recordDocRef(roomId, collectionName, recordId), {
    ...patch,
    updatedAt: serverTimestamp(),
    updatedBy: playerId,
  });
}

export async function deleteFiveParsecsRecord(roomId, collectionName, recordId) {
  await deleteDoc(recordDocRef(roomId, collectionName, recordId));
}

export function getIdField(collectionName) {
  switch (collectionName) {
    case "crewMembers":
      return "crewMemberId";
    case "equipment":
      return "equipmentId";
    case "worlds":
      return "worldId";
    case "patrons":
      return "patronId";
    case "rivals":
      return "rivalId";
    case "quests":
      return "questId";
    case "rumors":
      return "rumorId";
    case "encounters":
      return "encounterId";
    case "encounterEnemies":
      return "encounterEnemyId";
    case "enemyTemplates":
      return "enemyTemplateId";
    case "logEntries":
      return "logEntryId";
    default:
      return "id";
  }
}
