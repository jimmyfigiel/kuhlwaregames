import { useEffect, useState } from "react";

import {
  FP_COLLECTIONS,
  addFiveParsecsRecord,
  deleteFiveParsecsRecord,
  saveCrewRecord,
  subscribeCollection,
  subscribeCrew,
  updateFiveParsecsRecord,
  getIdField,
  undoFiveParsecsLogEntry,
} from "./fiveParsecsFirestore";

const emptyState = {
  crewMembers: [],
  equipmentTemplates: [],
  equipment: [],
  worlds: [],
  patrons: [],
  rivals: [],
  quests: [],
  rumors: [],
  encounters: [],
  encounterEnemies: [],
  enemyTemplates: [],
  campaignTurns: [],
  logEntries: [],
};

export function useFiveParsecsRecords(roomId, playerId) {
  const [crew, setCrew] = useState(null);
  const [records, setRecords] = useState(emptyState);
  const [loading, setLoading] = useState(Boolean(roomId));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!roomId) return undefined;

    setLoading(true);
    setError("");

    const unsubs = [];

    unsubs.push(
      subscribeCrew(
        roomId,
        (nextCrew) => {
          setCrew(nextCrew);
          setLoading(false);
        },
        (err) => {
          setError(err.message || String(err));
          setLoading(false);
        }
      )
    );

    FP_COLLECTIONS.forEach((collectionName) => {
      unsubs.push(
        subscribeCollection(
          roomId,
          collectionName,
          (items) => {
            setRecords((prev) => ({
              ...prev,
              [collectionName]: items,
            }));
          },
          (err) => {
            setError(err.message || String(err));
            setLoading(false);
          }
        )
      );
    });

    return () => {
      unsubs.forEach((unsub) => {
        if (unsub) unsub();
      });
    };
  }, [roomId]);

  async function saveCrew(crewRecord) {
    await saveCrewRecord(roomId, crewRecord, playerId, crew);
  }

  async function addRecord(collectionName, record) {
    return addFiveParsecsRecord(roomId, collectionName, record, playerId);
  }

  async function updateRecord(collectionName, recordOrId, patch = null) {
    const idField = getIdField(collectionName);

    const recordId =
      typeof recordOrId === "string"
        ? recordOrId
        : recordOrId[idField] || recordOrId.id;

    const updatePatch = patch || recordOrId;

    const oldRecord = records[collectionName]?.find(
      (item) => item[idField] === recordId || item.id === recordId
    );

    return updateFiveParsecsRecord(
      roomId,
      collectionName,
      recordId,
      updatePatch,
      playerId,
      oldRecord
    );
  }

  async function deleteRecord(collectionName, recordOrId) {
    const idField = getIdField(collectionName);

    const recordId =
      typeof recordOrId === "string"
        ? recordOrId
        : recordOrId[idField] || recordOrId.id;

    const oldRecord = records[collectionName]?.find(
      (item) => item[idField] === recordId || item.id === recordId
    );

    return deleteFiveParsecsRecord(
      roomId,
      collectionName,
      recordId,
      playerId,
      oldRecord
    );
  }

  async function undoLogEntry(logEntry) {
    return undoFiveParsecsLogEntry(roomId, logEntry, playerId);
  }

  return {
    loading,
    error,

    crew,

    crewMembers: records.crewMembers,
    equipmentTemplates: records.equipmentTemplates,
    equipment: records.equipment,
    worlds: records.worlds,
    patrons: records.patrons,
    rivals: records.rivals,
    quests: records.quests,
    rumors: records.rumors,
    encounters: records.encounters,
    encounterEnemies: records.encounterEnemies,
    enemyTemplates: records.enemyTemplates,
    campaignTurns: records.campaignTurns,
    logEntries: records.logEntries,

    saveCrew,
    addRecord,
    updateRecord,
    deleteRecord,
    undoLogEntry,
  };
}