import {
  collection,
  deleteDoc,
  doc,
  getDoc,
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
  "equipmentTemplates",
  "equipment",
  "worlds",
  "patrons",
  "rivals",
  "quests",
  "rumors",
  "encounters",
  "encounterEnemies",
  "enemyTemplates",
  "campaignTurns",
  "logEntries",
];

export function crewDocRef(roomId) {
  return doc(db, "rooms", roomId, "fiveParsecs", "crew");
}

export function collectionRef(roomId, collectionName) {
  return collection(
    db,
    "rooms",
    roomId,
    "fiveParsecs",
    collectionName,
    "items"
  );
}

export function recordDocRef(roomId, collectionName, recordId) {
  return doc(
    db,
    "rooms",
    roomId,
    "fiveParsecs",
    collectionName,
    "items",
    recordId
  );
}

export function logDocRef(roomId, logEntryId) {
  return recordDocRef(roomId, "logEntries", logEntryId);
}

export function subscribeCrew(roomId, callback, onError) {
  return onSnapshot(
    crewDocRef(roomId),
    (snap) => callback(snap.exists() ? snap.data() : null),
    onError
  );
}

export function subscribeCollection(roomId, collectionName, callback, onError) {
  const q = query(
    collectionRef(roomId, collectionName),
    orderBy("createdAt", "asc")
  );

  return onSnapshot(
    q,
    (snap) =>
      callback(
        snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }))
      ),
    onError
  );
}

export async function saveCrewRecord(roomId, crew, playerId, oldCrew = null) {
  const nextCrew = {
    ...crew,
    roomId,
    crewId: crew.crewId || "default",
    updatedAt: serverTimestamp(),
    updatedBy: playerId,
  };

  if (!crew.createdAt) {
    nextCrew.createdAt = serverTimestamp();
    nextCrew.createdBy = playerId;
  }

  await setDoc(crewDocRef(roomId), nextCrew, { merge: true });

  // Crew updates are silent because fields save on every keystroke.
  // Only initial crew creation is logged.
  if (!oldCrew) {
    await writeAuditLog({
      roomId,
      playerId,
      crewId: nextCrew.crewId,
      action: "create",
      targetCollection: "crew",
      targetType: "crew",
      targetId: nextCrew.crewId,
      targetName: nextCrew.crewName || "Adventure",
      oldRecord: null,
      newRecord: nextCrew,
    });
  }
}

export async function addFiveParsecsRecord(
  roomId,
  collectionName,
  record,
  playerId
) {
  const idField = getIdField(collectionName);
  const recordId = record[idField] || makeId(idField);

  const nextRecord = {
    ...record,
    [idField]: recordId,
    roomId,
    createdAt: serverTimestamp(),
    createdBy: playerId,
    updatedAt: serverTimestamp(),
    updatedBy: playerId,
  };

  await setDoc(recordDocRef(roomId, collectionName, recordId), nextRecord);

  if (collectionName !== "logEntries") {
    await writeAuditLog({
      roomId,
      playerId,
      crewId: record.crewId || "default",
      action: "create",
      targetCollection: collectionName,
      targetType: targetTypeForCollection(collectionName),
      targetId: recordId,
      targetName: getRecordName(nextRecord),
      oldRecord: null,
      newRecord: nextRecord,
    });
  }

  return recordId;
}

export async function updateFiveParsecsRecord(
  roomId,
  collectionName,
  recordId,
  patch,
  playerId,
  oldRecord = null
) {
  await updateDoc(recordDocRef(roomId, collectionName, recordId), {
    ...patch,
    updatedAt: serverTimestamp(),
    updatedBy: playerId,
  });

  // Updates are intentionally silent because fields save on every keystroke.
  // Create, delete, manual notes, and undo are still logged.
}

export async function deleteFiveParsecsRecord(
  roomId,
  collectionName,
  recordId,
  playerId,
  oldRecord = null
) {
  const currentRecord =
    oldRecord || (await fetchRecord(roomId, collectionName, recordId));

  await deleteDoc(recordDocRef(roomId, collectionName, recordId));

  if (collectionName !== "logEntries") {
    await writeAuditLog({
      roomId,
      playerId,
      crewId: currentRecord?.crewId || "default",
      action: "delete",
      targetCollection: collectionName,
      targetType: targetTypeForCollection(collectionName),
      targetId: recordId,
      targetName: getRecordName(currentRecord),
      oldRecord: currentRecord,
      newRecord: null,
    });
  }
}

export async function undoFiveParsecsLogEntry(roomId, logEntry, playerId) {
  if (!logEntry?.undo?.canUndo) return;

  const undo = logEntry.undo;

  if (undo.undoType === "deleteCreatedRecord") {
    await deleteDoc(
      recordDocRef(roomId, logEntry.targetCollection, logEntry.targetId)
    );

    await writeUndoLog({
      roomId,
      playerId,
      originalLog: logEntry,
      summary: `Undo: deleted created ${
        logEntry.targetName || logEntry.targetType
      }`,
    });

    return;
  }

  if (undo.undoType === "restoreDeletedRecord") {
    await setDoc(
      recordDocRef(roomId, logEntry.targetCollection, logEntry.targetId),
      {
        ...(undo.restoreRecord || {}),
        updatedAt: serverTimestamp(),
        updatedBy: playerId,
      },
      { merge: true }
    );

    await writeUndoLog({
      roomId,
      playerId,
      originalLog: logEntry,
      summary: `Undo: restored deleted ${
        logEntry.targetName || logEntry.targetType
      }`,
    });

    return;
  }

  if (undo.undoType === "restoreRecord") {
    await setDoc(
      recordDocRef(roomId, logEntry.targetCollection, logEntry.targetId),
      {
        ...(undo.restoreRecord || {}),
        updatedAt: serverTimestamp(),
        updatedBy: playerId,
      },
      { merge: true }
    );

    await writeUndoLog({
      roomId,
      playerId,
      originalLog: logEntry,
      summary: `Undo: restored ${logEntry.targetName || logEntry.targetType}`,
    });
  }
}

async function fetchRecord(roomId, collectionName, recordId) {
  const snap = await getDoc(recordDocRef(roomId, collectionName, recordId));
  return snap.exists() ? snap.data() : null;
}

async function writeAuditLog({
  roomId,
  playerId,
  crewId,
  action,
  targetCollection,
  targetType,
  targetId,
  targetName,
  oldRecord,
  newRecord,
}) {
  const logEntryId = makeId("log");

  await setDoc(logDocRef(roomId, logEntryId), {
    logEntryId,
    roomId,
    crewId: crewId || "default",

    action,

    targetCollection,
    targetType,
    targetId,
    targetName: targetName || "",

    fieldPath: "",
    oldValue: "",
    newValue: "",

    summary: buildSummary({
      action,
      targetName,
      targetType,
    }),

    body: "",

    undo: buildUndo({
      action,
      oldRecord,
      newRecord,
    }),

    createdAt: serverTimestamp(),
    createdBy: playerId,
  });
}

async function writeUndoLog({ roomId, playerId, originalLog, summary }) {
  const logEntryId = makeId("log");

  await setDoc(logDocRef(roomId, logEntryId), {
    logEntryId,
    roomId,
    crewId: originalLog.crewId || "default",

    action: "undo",

    targetCollection: originalLog.targetCollection,
    targetType: originalLog.targetType,
    targetId: originalLog.targetId,
    targetName: originalLog.targetName || "",

    fieldPath: "",
    oldValue: "",
    newValue: "",

    summary,
    body: "",

    undo: {
      canUndo: false,
    },

    createdAt: serverTimestamp(),
    createdBy: playerId,
  });
}

function buildUndo({ action, oldRecord }) {
  if (action === "create") {
    return {
      canUndo: true,
      undoType: "deleteCreatedRecord",
    };
  }

  if (action === "delete") {
    return {
      canUndo: Boolean(oldRecord),
      undoType: "restoreDeletedRecord",
      restoreRecord: oldRecord || null,
    };
  }

  return {
    canUndo: false,
  };
}

function buildSummary({ action, targetName, targetType }) {
  const name = targetName || targetType || "record";

  if (action === "create") return `Created ${name}`;
  if (action === "delete") return `Deleted ${name}`;

  return `${action} ${name}`;
}

function getRecordName(record) {
  if (!record) return "";

  return (
    record.name ||
    record.crewName ||
    record.title ||
    record.text ||
    record.mission ||
    record.type ||
    `Turn ${record.turnNumber || ""}`.trim() ||
    "record"
  );
}

function targetTypeForCollection(collectionName) {
  switch (collectionName) {
    case "crewMembers":
      return "crewMember";

    case "equipmentTemplates":
      return "equipmentTemplate";

    case "equipment":
      return "equipment";

    case "worlds":
      return "world";

    case "patrons":
      return "patron";

    case "rivals":
      return "rival";

    case "quests":
      return "quest";

    case "rumors":
      return "rumor";

    case "encounters":
      return "encounter";

    case "encounterEnemies":
      return "encounterEnemy";

    case "enemyTemplates":
      return "enemyTemplate";

    case "campaignTurns":
      return "campaignTurn";

    case "logEntries":
      return "note";

    default:
      return collectionName;
  }
}

export function getIdField(collectionName) {
  switch (collectionName) {
    case "crewMembers":
      return "crewMemberId";

    case "equipmentTemplates":
      return "equipmentTemplateId";

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

    case "campaignTurns":
      return "campaignTurnId";

    case "logEntries":
      return "logEntryId";

    default:
      return "id";
  }
}

function makeId(prefix) {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}