import React, { useMemo, useState } from "react";
import "./fiveParsecs.css";

import { useFiveParsecsRecords } from "./fiveParsecsHooks";
import {
  createCrew,
  createCrewMember,
  createEquipment,
  createWorld,
  createPatron,
  createRival,
  createQuest,
  createRumor,
  createEncounter,
  createEncounterEnemy,
  createEnemyTemplate,
  createLogEntry,
} from "./utils/recordFactories";

import CrewPanel from "./components/CrewPanel";
import CrewMembersPanel from "./components/CrewMembersPanel";
import EquipmentPanel from "./components/EquipmentPanel";
import WorldsPanel from "./components/WorldsPanel";
import EncountersPanel from "./components/EncountersPanel";
import EnemyTemplatesPanel from "./components/EnemyTemplatesPanel";
import LogsPanel from "./components/LogsPanel";

const TABS = [
  { id: "crew", label: "Crew" },
  { id: "members", label: "People" },
  { id: "equipment", label: "Gear" },
  { id: "worlds", label: "Worlds" },
  { id: "encounters", label: "Encounters" },
  { id: "templates", label: "Enemies" },
  { id: "logs", label: "Logs" },
];

function getRoomId(props) {
  return props.roomId || props.room?.id || props.room?.roomId || "";
}

function getPlayerId(props) {
  return (
    props.playerId ||
    props.currentPlayerId ||
    props.currentPlayer?.id ||
    props.currentPlayer?.playerId ||
    props.user?.uid ||
    props.user?.id ||
    "unknown-player"
  );
}

export default function FiveParsecsGame(props) {
  const roomId = getRoomId(props);
  const playerId = getPlayerId(props);
  const [activeTab, setActiveTab] = useState("crew");

  const recordsApi = useFiveParsecsRecords(roomId, playerId);
  const {
    loading,
    error,
    crew,
    crewMembers,
    equipment,
    worlds,
    patrons,
    rivals,
    quests,
    rumors,
    encounters,
    encounterEnemies,
    enemyTemplates,
    logEntries,
    saveCrew,
    addRecord,
    updateRecord,
    deleteRecord,
  } = recordsApi;

  const crewId = crew?.crewId || "default";

  const worldLookups = useMemo(() => {
    const map = {};
    worlds.forEach((w) => {
      map[w.worldId] = w;
    });
    return map;
  }, [worlds]);

  async function ensureCrew() {
    if (crew) return crew;
    const newCrew = createCrew({ roomId, playerId });
    await saveCrew(newCrew);
    return newCrew;
  }

  async function addCrewMember() {
    await ensureCrew();
    await addRecord("crewMembers", createCrewMember({ roomId, crewId, playerId }));
  }

  async function addEquipment() {
    await ensureCrew();
    await addRecord("equipment", createEquipment({ roomId, crewId, playerId }));
  }

  async function addWorld() {
    await ensureCrew();
    await addRecord("worlds", createWorld({ roomId, crewId, playerId }));
  }

  async function addPatron(worldId = "") {
    await ensureCrew();
    await addRecord("patrons", createPatron({ roomId, crewId, worldId, playerId }));
  }

  async function addRival(worldId = "") {
    await ensureCrew();
    await addRecord("rivals", createRival({ roomId, crewId, worldId, playerId }));
  }

  async function addQuest() {
    await ensureCrew();
    await addRecord("quests", createQuest({ roomId, crewId, playerId }));
  }

  async function addRumor() {
    await ensureCrew();
    await addRecord("rumors", createRumor({ roomId, crewId, playerId }));
  }

  async function addEncounter() {
    await ensureCrew();
    await addRecord("encounters", createEncounter({ roomId, crewId, playerId }));
  }

  async function addEncounterEnemy(encounterId, template = null) {
    await ensureCrew();
    await addRecord(
      "encounterEnemies",
      createEncounterEnemy({ roomId, crewId, encounterId, template, playerId })
    );
  }

  async function addEnemyTemplate() {
    await ensureCrew();
    await addRecord("enemyTemplates", createEnemyTemplate({ roomId, crewId, playerId }));
  }

  async function addLogEntry(targetType = "crew", targetId = crewId) {
    await ensureCrew();
    await addRecord("logEntries", createLogEntry({ roomId, crewId, targetType, targetId, playerId }));
  }

  if (!roomId) {
    return <div className="fp-wrap">Missing room id. Pass roomId or room into FiveParsecsGame.</div>;
  }

  return (
    <div className="fp-wrap">
      <div className="fp-header">
        <div>
          <div className="fp-title">Five Parsecs Records</div>
          <div className="fp-subtitle">{crew?.crewName || "No crew created yet"}</div>
        </div>
        {!crew && (
          <button className="fp-btn fp-primary" onClick={ensureCrew}>
            Create Crew
          </button>
        )}
      </div>

      {error && <div className="fp-error">{error}</div>}
      {loading && <div className="fp-muted">Loading...</div>}

      <div className="fp-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`fp-tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "crew" && (
        <CrewPanel
          crew={crew}
          crewMembers={crewMembers}
          quests={quests}
          rumors={rumors}
          onSaveCrew={saveCrew}
          onUpdate={updateRecord}
          onDelete={deleteRecord}
          onAddQuest={addQuest}
          onAddRumor={addRumor}
          onAddLog={() => addLogEntry("crew", crewId)}
        />
      )}

      {activeTab === "members" && (
        <CrewMembersPanel
          crewMembers={crewMembers}
          equipment={equipment}
          logEntries={logEntries}
          onAdd={addCrewMember}
          onUpdate={updateRecord}
          onDelete={deleteRecord}
          onAddLog={(memberId) => addLogEntry("crewMember", memberId)}
        />
      )}

      {activeTab === "equipment" && (
        <EquipmentPanel
          equipment={equipment}
          crewMembers={crewMembers}
          onAdd={addEquipment}
          onUpdate={updateRecord}
          onDelete={deleteRecord}
          onAddLog={(equipmentId) => addLogEntry("equipment", equipmentId)}
        />
      )}

      {activeTab === "worlds" && (
        <WorldsPanel
          worlds={worlds}
          patrons={patrons}
          rivals={rivals}
          logEntries={logEntries}
          onAdd={addWorld}
          onUpdate={updateRecord}
          onDelete={deleteRecord}
          onAddPatron={addPatron}
          onAddRival={addRival}
          onAddLog={(worldId) => addLogEntry("world", worldId)}
        />
      )}

      {activeTab === "encounters" && (
        <EncountersPanel
          encounters={encounters}
          encounterEnemies={encounterEnemies}
          enemyTemplates={enemyTemplates}
          worldLookups={worldLookups}
          onAdd={addEncounter}
          onUpdate={updateRecord}
          onDelete={deleteRecord}
          onAddEnemy={addEncounterEnemy}
          onAddLog={(encounterId) => addLogEntry("encounter", encounterId)}
        />
      )}

      {activeTab === "templates" && (
        <EnemyTemplatesPanel
          enemyTemplates={enemyTemplates}
          onAdd={addEnemyTemplate}
          onUpdate={updateRecord}
          onDelete={deleteRecord}
        />
      )}

      {activeTab === "logs" && (
        <LogsPanel
          logEntries={logEntries}
          crewMembers={crewMembers}
          worlds={worlds}
          encounters={encounters}
          onAdd={() => addLogEntry("crew", crewId)}
          onUpdate={updateRecord}
          onDelete={deleteRecord}
        />
      )}
    </div>
  );
}
