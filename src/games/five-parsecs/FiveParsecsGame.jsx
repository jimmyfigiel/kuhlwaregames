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
  createCampaignTurn,
  createLogEntry,
} from "./utils/recordFactories";

import CrewPanel from "./components/CrewPanel";
import CreationTablesPanel from "./components/CreationTablesPanel";
import EquipmentPanel from "./components/EquipmentPanel";
import WorldsPanel from "./components/WorldsPanel";
import EncountersPanel from "./components/EncountersPanel";
import EnemyTemplatesPanel from "./components/EnemyTemplatesPanel";
import TurnPanel from "./components/TurnPanel";
import RulesPanel from "./components/RulesPanel";
import LogsPanel from "./components/LogsPanel";
import DiceBar from "./components/DiceBar";

const TABS = [
  { id: "crew", label: "Adventure" },
  { id: "equipment", label: "Gear" },
  { id: "worlds", label: "Worlds" },
  { id: "encounters", label: "Encounters" },
  { id: "templates", label: "Enemies" },
  { id: "turn", label: "Turn" },
  { id: "rules", label: "Rules" },
  { id: "creation", label: "Creation" },
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

function getNextTurnNumber(campaignTurns, crew) {
  if (campaignTurns.length === 0) {
    return crew?.campaignTurn || 1;
  }

  const highestTurn = campaignTurns.reduce((highest, turn) => {
    return Math.max(highest, Number(turn.turnNumber || 0));
  }, 0);

  return highestTurn + 1;
}

export default function FiveParsecsGame(props) {
  const roomId = getRoomId(props);
  const playerId = getPlayerId(props);

  const [activeTab, setActiveTab] = useState("crew");
  const [rulesPage, setRulesPage] = useState(1);

  const [localRulesPdfUrl, setLocalRulesPdfUrl] = useState("");
  const [localRulesPdfName, setLocalRulesPdfName] = useState("");

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
    campaignTurns,
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

    const newCrew = createCrew({
      roomId,
      playerId,
    });

    await saveCrew(newCrew);

    return newCrew;
  }

  async function addCrewMember() {
    await ensureCrew();

    await addRecord(
      "crewMembers",
      createCrewMember({
        roomId,
        crewId,
        playerId,
      })
    );
  }

  async function addBlankEquipment() {
    await ensureCrew();

    await addRecord(
      "equipment",
      createEquipment({
        roomId,
        crewId,
        playerId,
      })
    );
  }

  async function addCatalogEquipment(equipmentRecord) {
    await ensureCrew();

    await addRecord("equipment", equipmentRecord);
  }

  async function addWorld() {
    await ensureCrew();

    await addRecord(
      "worlds",
      createWorld({
        roomId,
        crewId,
        playerId,
      })
    );
  }

  async function addPatron(worldId = "") {
    await ensureCrew();

    await addRecord(
      "patrons",
      createPatron({
        roomId,
        crewId,
        worldId,
        playerId,
      })
    );
  }

  async function addRival(worldId = "") {
    await ensureCrew();

    await addRecord(
      "rivals",
      createRival({
        roomId,
        crewId,
        worldId,
        playerId,
      })
    );
  }

  async function addQuest() {
    await ensureCrew();

    await addRecord(
      "quests",
      createQuest({
        roomId,
        crewId,
        playerId,
      })
    );
  }

  async function addRumor() {
    await ensureCrew();

    await addRecord(
      "rumors",
      createRumor({
        roomId,
        crewId,
        playerId,
      })
    );
  }

  async function addEncounter() {
    await ensureCrew();

    await addRecord(
      "encounters",
      createEncounter({
        roomId,
        crewId,
        playerId,
      })
    );
  }

  async function addEncounterEnemy(encounterId, template = null) {
    await ensureCrew();

    await addRecord(
      "encounterEnemies",
      createEncounterEnemy({
        roomId,
        crewId,
        encounterId,
        template,
        playerId,
      })
    );
  }

  async function addEnemyTemplate() {
    await ensureCrew();

    await addRecord(
      "enemyTemplates",
      createEnemyTemplate({
        roomId,
        crewId,
        playerId,
      })
    );
  }

  async function addCampaignTurn() {
    await ensureCrew();

    const turnNumber = getNextTurnNumber(campaignTurns, crew);

    const newTurn = createCampaignTurn({
      roomId,
      crewId,
      playerId,
      turnNumber,
    });

    await addRecord("campaignTurns", newTurn);

    if (crew) {
      await saveCrew({
        ...crew,
        campaignTurn: turnNumber,
      });
    }
  }

  async function addManualLogEntry(targetType = "crew", targetId = crewId) {
    await ensureCrew();

    await addRecord(
      "logEntries",
      createLogEntry({
        roomId,
        crewId,
        targetType,
        targetId,
        playerId,
      })
    );
  }

  function openRulesPage(page) {
    const cleanPage = Math.max(1, Number(page || 1));

    setRulesPage(cleanPage);
    setActiveTab("rules");

    if (crew) {
      saveCrew({
        ...crew,
        rulesCurrentPage: cleanPage,
      });
    }
  }

  function loadLocalRulesPdf(file) {
    if (!file) return;

    if (localRulesPdfUrl) {
      URL.revokeObjectURL(localRulesPdfUrl);
    }

    const nextUrl = URL.createObjectURL(file);

    setLocalRulesPdfUrl(nextUrl);
    setLocalRulesPdfName(file.name || "Local rules PDF");
  }

  function clearLocalRulesPdf() {
    if (localRulesPdfUrl) {
      URL.revokeObjectURL(localRulesPdfUrl);
    }

    setLocalRulesPdfUrl("");
    setLocalRulesPdfName("");
  }

  if (!roomId) {
    return (
      <div className="fp-wrap">
        Missing room id. Pass roomId or room into FiveParsecsGame.
      </div>
    );
  }

  return (
    <div className="fp-wrap">
      <div className="fp-header">
        <div className="fp-header-main">
          <div className="fp-title">Five Parsecs Records</div>

          <div className="fp-subtitle">
            {crew?.crewName || "No adventure created yet"}
          </div>
        </div>

        <div className="fp-header-right">
          {!crew && (
            <button className="fp-btn fp-primary" onClick={ensureCrew}>
              Create Adventure
            </button>
          )}

          <DiceBar />
        </div>
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
          equipment={equipment}
          quests={quests}
          rumors={rumors}
          playerId={playerId}
          onSaveCrew={saveCrew}
          onUpdate={updateRecord}
          onDelete={deleteRecord}
          onAddQuest={addQuest}
          onAddRumor={addRumor}
          onAddCrewMember={addCrewMember}
          onAddCrewMemberLog={(memberId) =>
            addManualLogEntry("crewMember", memberId)
          }
          onAddLog={() => addManualLogEntry("crew", crewId)}
        />
      )}

      {activeTab === "equipment" && (
        <EquipmentPanel
          roomId={roomId}
          crewId={crewId}
          playerId={playerId}
          equipment={equipment}
          crewMembers={crewMembers}
          onAddBlankEquipment={addBlankEquipment}
          onAddCatalogEquipment={addCatalogEquipment}
          onUpdate={updateRecord}
          onDelete={deleteRecord}
          onAddLog={(equipmentId) =>
            addManualLogEntry("equipment", equipmentId)
          }
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
          onAddLog={(worldId) => addManualLogEntry("world", worldId)}
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
          onAddLog={(encounterId) =>
            addManualLogEntry("encounter", encounterId)
          }
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

      {activeTab === "turn" && (
        <TurnPanel
          campaignTurns={campaignTurns}
          crew={crew}
          onAddTurn={addCampaignTurn}
          onUpdate={updateRecord}
          onDelete={deleteRecord}
          onAddLog={(campaignTurnId) =>
            addManualLogEntry("campaignTurn", campaignTurnId)
          }
          onOpenRulesPage={openRulesPage}
        />
      )}

      {activeTab === "rules" && (
        <RulesPanel
          roomId={roomId}
          crew={crew}
          rulesPage={rulesPage || crew?.rulesCurrentPage || 1}
          localPdfUrl={localRulesPdfUrl}
          localPdfName={localRulesPdfName}
          onLoadLocalPdf={loadLocalRulesPdf}
          onClearLocalPdf={clearLocalRulesPdf}
          onRulesPageChange={setRulesPage}
          onSaveCrew={saveCrew}
        />
      )}

      {activeTab === "creation" && (
        <CreationTablesPanel
          crew={crew}
          crewMembers={crewMembers}
          roomId={roomId}
          crewId={crewId}
          playerId={playerId}
          onAddEquipment={addCatalogEquipment}
          onSaveCrew={saveCrew}
          onUpdate={updateRecord}
        />
      )}

      {activeTab === "logs" && (
        <LogsPanel
          logEntries={logEntries}
          onAdd={() => addManualLogEntry("crew", crewId)}
        />
      )}
    </div>
  );
}