import React, { useMemo, useState } from "react";

import AccordionSection from "./AccordionSection";
import CatalogModal from "./CatalogModal";

import { CREW_CREATION_TABLES, CREW_TYPE_PROFILES } from "../data/crewCreationTables";
import { createEquipmentRecordFromEquipmentRoll, rollOnEquipmentTable } from "../data/startingEquipmentTables";
import { applyShipToCrew, rollShip } from "../data/shipTables";
import { findByRoll, rollD100, tableRowsForDisplay } from "../data/tableUtils";

function isEquipmentTable(tableId) {
  return ["lowTechWeapon", "militaryWeapon", "highTechWeapon", "gear", "gadget"].includes(tableId);
}

function statSummary(stats = {}) {
  return [
    `Rea ${stats.reactions ?? ""}`,
    `Spd ${stats.speed ?? ""}`,
    `Cbt ${stats.combatSkill ?? ""}`,
    `Tgh ${stats.toughness ?? ""}`,
    `Sav ${stats.savvy ?? ""}`,
  ].join(" · ");
}

export default function CreationTablesPanel({ crew, roomId, crewId, playerId, onAddEquipment, onSaveCrew }) {
  const [activeTable, setActiveTable] = useState(null);
  const [message, setMessage] = useState("");

  const tableRows = useMemo(() => {
    if (!activeTable) return [];
    return tableRowsForDisplay(activeTable.rows || []);
  }, [activeTable]);

  function openTable(tableId) {
    const table = CREW_CREATION_TABLES.find((item) => item.id === tableId);
    setActiveTable(table || null);
  }

  function showRoll(tableId) {
    const table = CREW_CREATION_TABLES.find((item) => item.id === tableId);
    if (!table) return;

    if (isEquipmentTable(tableId)) {
      const rollResult = rollOnEquipmentTable(tableId);
      const record = createEquipmentRecordFromEquipmentRoll({ rollResult, roomId, crewId, playerId });

      if (record && onAddEquipment) {
        onAddEquipment(record);
        setMessage(`${table.title}: rolled ${rollResult.roll}, added ${record.name} to stash.`);
        return;
      }

      setMessage(`${table.title}: rolled ${rollResult.roll}, result ${rollResult.result?.name || "none"}.`);
      return;
    }

    if (tableId === "ship") {
      const rollResult = rollShip();
      if (crew && onSaveCrew) {
        onSaveCrew(applyShipToCrew(crew, rollResult));
      }
      setMessage(`Ship Table: rolled ${rollResult.roll}, ship ${rollResult.result?.name || "none"}, debt ${rollResult.generatedDebt}.`);
      return;
    }

    const roll = rollD100();
    const result = findByRoll(table.rows, roll);
    const profile = result?.profileKey ? CREW_TYPE_PROFILES[result.profileKey] : null;
    const extra = profile ? ` ${profile.name}: ${statSummary(profile.startingStats)}.` : "";
    setMessage(`${table.title}: rolled ${roll}, result ${result?.name || "none"}.${extra}`);
  }

  function selectRow(row) {
    if (!activeTable) return;

    if (isEquipmentTable(activeTable.id)) {
      const rollResult = {
        tableId: activeTable.id,
        tableTitle: activeTable.title,
        roll: row.roll || "selected",
        result: row,
      };
      const record = createEquipmentRecordFromEquipmentRoll({ rollResult, roomId, crewId, playerId });
      if (record && onAddEquipment) {
        onAddEquipment(record);
        setMessage(`Added ${record.name} from ${activeTable.title} to stash.`);
      }
      setActiveTable(null);
      return;
    }

    if (activeTable.id === "ship" && crew && onSaveCrew) {
      const debtRoll = Math.floor(Math.random() * 6) + 1;
      const rollResult = {
        roll: row.roll || "selected",
        result: row,
        debtRoll,
        generatedDebt: debtRoll + Number(row.debtBonus || 0),
      };
      onSaveCrew(applyShipToCrew(crew, rollResult));
      setMessage(`Applied ${row.name} to the ship record. Starting debt ${rollResult.generatedDebt}.`);
      setActiveTable(null);
      return;
    }

    const profile = row.profileKey ? CREW_TYPE_PROFILES[row.profileKey] : null;
    setMessage(profile ? `${row.name}: ${statSummary(profile.startingStats)} ${profile.notes}` : `Selected ${row.name || row.result}.`);
    setActiveTable(null);
  }

  return (
    <AccordionSection title="Creation Tables" subtitle="crew, equipment, and ship" defaultOpen={false}>
      {message && <div className="fp-turn-summary">{message}</div>}

      <div className="fp-creation-table-grid">
        {CREW_CREATION_TABLES.map((table) => (
          <div key={table.id} className="fp-inline-card fp-creation-table-card">
            <div className="fp-card-title">{table.title}</div>
            <div className="fp-muted-inline">{table.dice}</div>
            <div className="fp-actions fp-tight-actions">
              <button className="fp-btn" onClick={() => openTable(table.id)}>View</button>
              <button className="fp-btn fp-primary" onClick={() => showRoll(table.id)}>
                {isEquipmentTable(table.id) ? "Roll + Add" : table.id === "ship" ? "Roll + Apply" : "Roll"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {activeTable && (
        <CatalogModal
          title={activeTable.title}
          subtitle={activeTable.dice || ""}
          columns={activeTable.columns || ["roll", "result"]}
          rows={tableRows}
          actionLabel={isEquipmentTable(activeTable.id) ? "Add" : activeTable.id === "ship" ? "Apply" : "Select"}
          onSelect={selectRow}
          onClose={() => setActiveTable(null)}
        />
      )}
    </AccordionSection>
  );
}
