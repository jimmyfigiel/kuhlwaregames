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
} from "./fiveParsecsFirestore";

const emptyState = {
  crewMembers: [],
  equipment: [],
  worlds: [],
  patrons: [],
  rivals: [],
  quests: [],
  rumors: [],
  encounters: [],
  encounterEnemies: [],
  enemyTemplates: [],
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
            setRecords((prev) => ({ ...prev, [collectionName]: items }));
          },
          (err) => {
            setError(err.message || String(err));
            setLoading(false);
          }
        )
      );
    });

    return () => {
      unsubs.forEach((unsub) => unsub && unsub());
    };
  }, [roomId]);

  async function saveCrew(crewRecord) {
    await saveCrewRecord(roomId, crewRecord, playerId);
  }

  async function addRecord(collectionName, record) {
    return addFiveParsecsRecord(roomId, collectionName, record, playerId);
  }

  async function updateRecord(collectionName, recordOrId, patch = null) {
    const idField = getIdField(collectionName);
    const recordId = typeof recordOrId === "string" ? recordOrId : recordOrId[idField] || recordOrId.id;
    const updatePatch = patch || recordOrId;
    return updateFiveParsecsRecord(roomId, collectionName, recordId, updatePatch, playerId);
  }

  async function deleteRecord(collectionName, recordOrId) {
    const idField = getIdField(collectionName);
    const recordId = typeof recordOrId === "string" ? recordOrId : recordOrId[idField] || recordOrId.id;
    return deleteFiveParsecsRecord(roomId, collectionName, recordId);
  }

  return {
    loading,
    error,
    crew,
    ...records,
    saveCrew,
    addRecord,
    updateRecord,
    deleteRecord,
  };
}
