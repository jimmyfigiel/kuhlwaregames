import React, { useMemo, useState } from "react";

import AccordionSection from "./AccordionSection";
import CatalogModal from "./CatalogModal";
import LookupTableModal from "./LookupTableModal";

import {
  CREW_CREATION_TABLES,
  CREW_TYPE_PROFILES,
} from "../data/crewCreationTables";
import {
  createEquipmentRecordFromEquipmentRoll,
  rollOnEquipmentTable,
} from "../data/startingEquipmentTables";
import { rollShip } from "../data/shipTables";
import {
  getCampaignLookupTables,
  isEquipmentLookupTable,
  isCrewMemberLookupTable,
  isShipLookupTable,
} from "../data/lookupTables";
import { createLookupApplyTargets } from "../data/lookupApplyTargets";
import {
  findByRoll,
  rollD100,
  tableRowsForDisplay,
} from "../data/tableUtils";

const CREW_MEMBER_TABLE_IDS = [
  "basicCrewType",
  "primaryAlienType",
  "strangeCharacterType",
  "background",
  "motivation",
  "class",
];

const EQUIPMENT_TABLE_IDS = [
  "lowTechWeapon",
  "militaryWeapon",
  "highTechWeapon",
  "gear",
  "gadget",
];

function isEquipmentTable(tableId) {
  return EQUIPMENT_TABLE_IDS.includes(tableId) || isEquipmentLookupTable(tableId);
}

function isCrewMemberTable(tableId) {
  return (
    CREW_MEMBER_TABLE_IDS.includes(tableId) || isCrewMemberLookupTable(tableId)
  );
}

function safeNumber(value) {
  if (value === "" || value === null || value === undefined) return 0;

  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function appendNote(existingNotes, nextNote) {
  const cleanExisting = String(existingNotes || "").trim();
  const cleanNext = String(nextNote || "").trim();

  if (!cleanNext) return cleanExisting;
  if (!cleanExisting) return cleanNext;

  return `${cleanExisting}\n${cleanNext}`;
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

function rollDiceExpression(expression) {
  const text = String(expression || "").trim().toUpperCase();
  const match = text.match(/^(\d*)D(\d+)(?:\s*([+-])\s*(\d+))?$/);

  if (!match) {
    const number = Number(text);

    return {
      total: Number.isFinite(number) ? number : 0,
      detail: text || "0",
    };
  }

  const count = Number(match[1] || 1);
  const sides = Number(match[2] || 6);
  const sign = match[3] || "";
  const modifier = Number(match[4] || 0) * (sign === "-" ? -1 : 1);
  const rolls = [];

  for (let index = 0; index < count; index += 1) {
    rolls.push(Math.floor(Math.random() * sides) + 1);
  }

  const total = rolls.reduce((sum, roll) => sum + roll, 0) + modifier;
  const modifierText = modifier
    ? ` ${modifier > 0 ? "+" : "-"} ${Math.abs(modifier)}`
    : "";

  return {
    total,
    detail: `${text}: ${rolls.join("+")}${modifierText} = ${total}`,
  };
}

function formatResourceForNotes(resource) {
  if (!resource) return "";

  if (resource.type === "credits") return `Credits ${resource.amount}`;

  if (resource.type === "storyPoint") {
    return `${resource.count} story point${resource.count === 1 ? "" : "s"}`;
  }

  if (resource.type === "patron") {
    return `${resource.count} Patron${resource.count === 1 ? "" : "s"}`;
  }

  if (resource.type === "rival") {
    return `${resource.count} Rival${resource.count === 1 ? "" : "s"}`;
  }

  if (resource.type === "rumor") {
    return `${resource.count} Rumor${resource.count === 1 ? "" : "s"}`;
  }

  if (resource.type === "questRumor") {
    return `${resource.count} Quest Rumor${resource.count === 1 ? "" : "s"}`;
  }

  if (resource.type === "xp") return `${resource.count} XP`;

  return resource.label || resource.type || "";
}

function formatStartingRollsForNotes(startingRolls = []) {
  if (!startingRolls.length) return "";

  return startingRolls.map((roll) => roll.label || roll.type).join(", ");
}

function createCrewResourcePatch({ crew, row, tableTitle }) {
  const resources = row.resources || [];
  const patch = {};
  const notes = [];

  resources.forEach((resource) => {
    if (resource.type === "credits") {
      const rolled = rollDiceExpression(resource.amount);

      patch.credits =
        safeNumber(patch.credits ?? crew?.credits ?? 0) + rolled.total;

      notes.push(
        `${tableTitle}: added ${rolled.total} credits (${rolled.detail}).`
      );

      return;
    }

    if (resource.type === "storyPoint") {
      patch.storyPoints =
        safeNumber(patch.storyPoints ?? crew?.storyPoints ?? 0) +
        safeNumber(resource.count);

      notes.push(
        `${tableTitle}: added ${resource.count} story point${
          resource.count === 1 ? "" : "s"
        }.`
      );

      return;
    }

    if (["patron", "rival", "rumor", "questRumor"].includes(resource.type)) {
      notes.push(
        `${tableTitle}: record owed/created manually: ${formatResourceForNotes(
          resource
        )}.`
      );
    }
  });

  if (notes.length) {
    patch.notes = appendNote(crew?.notes || "", notes.join("\n"));
  }

  return patch;
}

function createCrewMemberPatch({ member, tableId, row, profile }) {
  const patch = {};
  const notes = [];

  if (profile) {
    patch.speciesType = profile.name || row.name || member.speciesType || "";

    if (profile.startingStats) {
      patch.reactions = safeNumber(profile.startingStats.reactions);
      patch.speed = safeNumber(profile.startingStats.speed);
      patch.combatSkill = safeNumber(profile.startingStats.combatSkill);
      patch.toughness = safeNumber(profile.startingStats.toughness);
      patch.savvy = safeNumber(profile.startingStats.savvy);
      patch.luck = safeNumber(profile.startingStats.luck);
    }

    patch.creationProfileKey = row.profileKey || "";
    patch.creationProfileName = profile.name || row.name || "";
    patch.creationProfileCategory = profile.category || "";

    notes.push(`Profile: ${profile.name || row.name}`);

    if (profile.notes) {
      notes.push(`Profile Notes: ${profile.notes}`);
    }

    if (profile.nextRolls?.length) {
      notes.push(`Next creation rolls: ${profile.nextRolls.join(", ")}`);
    }
  }

  if (["background", "motivation", "class"].includes(tableId)) {
    const fieldName = tableId === "class" ? "class" : tableId;
    patch[fieldName] = row.name || row.result || "";

    notes.push(
      `${tableId[0].toUpperCase()}${tableId.slice(1)}: ${
        row.name || row.result || ""
      }`
    );
  }

  const statModifiers = row.statModifiers || {};

  Object.entries(statModifiers).forEach(([key, value]) => {
    patch[key] = safeNumber(member[key]) + safeNumber(value);
  });

  if (Object.keys(statModifiers).length) {
    const modifierText = Object.entries(statModifiers)
      .map(([key, value]) => {
        return `${safeNumber(value) >= 0 ? "+" : ""}${value} ${key}`;
      })
      .join(", ");

    notes.push(`Stat modifiers applied: ${modifierText}`);
  }

  const xpResource = row.resources?.find((resource) => {
    return resource.type === "xp";
  });

  if (xpResource) {
    patch.xp = safeNumber(member.xp) + safeNumber(xpResource.count);
    notes.push(`XP added: ${xpResource.count}`);
  }

  const memberOnlyResources =
    row.resources?.filter((resource) => {
      return (
        resource.type !== "credits" &&
        resource.type !== "storyPoint" &&
        resource.type !== "xp"
      );
    }) || [];

  if (memberOnlyResources.length) {
    notes.push(
      `Resources/records to handle: ${memberOnlyResources
        .map(formatResourceForNotes)
        .join(", ")}`
    );
  }

  const startingRollsText = formatStartingRollsForNotes(row.startingRolls || []);

  if (startingRollsText) {
    notes.push(`Starting rolls owed: ${startingRollsText}`);
  }

  if (notes.length) {
    patch.notes = appendNote(member.notes || "", notes.join("\n"));
  }

  return patch;
}

function createShipPatchFromRollResult(crew, rollResult) {
  const ship = rollResult?.result;

  if (!ship) return crew;

  const generatedDebt = safeNumber(rollResult.generatedDebt);
  const hullThreshold = safeNumber(ship.hull);
  const existingStarship = crew?.starship || {};

  const starship = {
    ...existingStarship,
    name: existingStarship.name || crew?.shipName || ship.name || "",
    shipType: ship.name || "",
    hasShip: true,
    hullDamage: safeNumber(existingStarship.hullDamage),
    hullThreshold,
    debtOwed: generatedDebt,
    financedAmount: generatedDebt,
    traits: Array.isArray(ship.traits) ? [...ship.traits] : [],
    components: Array.isArray(existingStarship.components)
      ? existingStarship.components
      : [],
    notes: existingStarship.notes || "",
  };

  return {
    ...crew,

    starship,

    debt: generatedDebt,
    shipName: starship.name,
    shipType: ship.name || "",
    shipDebt: generatedDebt,
    shipDebtFormula: ship.debt || "",
    shipHull: hullThreshold,
    shipMaxHull: hullThreshold,
    shipTraits: Array.isArray(ship.traits) ? [...ship.traits] : [],
  };
}

function createStableRowKey(row) {
  if (!row) return "";

  return [
    row.rollMin ?? "",
    row.rollMax ?? "",
    row.name ?? "",
    row.result ?? "",
    row.ship ?? "",
    row.weaponKey ?? "",
    row.itemKey ?? "",
  ].join("::");
}

function rowFromRoll(table) {
  const roll = rollD100();
  const result = findByRoll(table.rows, roll);

  return {
    roll,
    result,
  };
}

function getDisplayRowsWithRawRows(rows) {
  return (rows || []).map((rawRow) => {
    const displayRow = tableRowsForDisplay([rawRow])[0] || rawRow;

    return {
      ...displayRow,
      __raw: rawRow,
      __rowKey: createStableRowKey(rawRow),
    };
  });
}

function getDisplayRowForRawRow(rawRow) {
  if (!rawRow) return null;

  return {
    ...(tableRowsForDisplay([rawRow])[0] || rawRow),
    __raw: rawRow,
    __rowKey: createStableRowKey(rawRow),
  };
}

function getRawRow(row) {
  return row?.__raw || row?.raw || row;
}

function getRowLabel(row) {
  return row?.title || row?.name || row?.result || row?.ship || "selected result";
}

function getRollSummary({ tableTitle, roll, result, extra = "" }) {
  return `${tableTitle}: rolled ${roll}. Result: ${
    getRowLabel(result) || "none"
  }.${extra ? ` ${extra}` : ""}`;
}

function makeCampaignResultNote({ table, row, roll }) {
  const rollText = roll === null || roll === undefined ? "selected" : roll;
  const title = row.title || row.name || row.result || "Result";
  const description = row.description || row.effect || "";

  return `${table.label || table.title}: ${rollText}. ${title}. ${description}`;
}

export default function CreationTablesPanel({
  crew,
  crewMembers = [],
  worlds = [],
  patrons = [],
  campaignTurns = [],
  roomId,
  crewId,
  playerId,
  onAddEquipment,
  onSaveCrew,
  onUpdate,
}) {
  const [activeTable, setActiveTable] = useState(null);
  const [activeCampaignTableId, setActiveCampaignTableId] = useState("");
  const [selectedCrewMemberId, setSelectedCrewMemberId] = useState("");
  const [highlightedRowKey, setHighlightedRowKey] = useState("");
  const [message, setMessage] = useState("");
  const [popupRollSummary, setPopupRollSummary] = useState("");

  const campaignLookupTables = useMemo(() => {
    return getCampaignLookupTables();
  }, []);

  const campaignLookupApplyTargets = useMemo(() => {
    return createLookupApplyTargets({
      tableId: activeCampaignTableId,
      crew,
      crewMembers,
      worlds,
      patrons,
      campaignTurns,
    });
  }, [activeCampaignTableId, crew, crewMembers, worlds, patrons, campaignTurns]);

  const tableRows = useMemo(() => {
    if (!activeTable) return [];

    return getDisplayRowsWithRawRows(activeTable.rows || []);
  }, [activeTable]);

  const selectedCrewMember = crewMembers.find((member) => {
    return member.crewMemberId === selectedCrewMemberId;
  });

  function openTable(tableId) {
    const table = CREW_CREATION_TABLES.find((item) => item.id === tableId);

    setActiveTable(table || null);
    setActiveCampaignTableId("");
    setHighlightedRowKey("");
    setPopupRollSummary("");

    if (!selectedCrewMemberId && crewMembers.length) {
      setSelectedCrewMemberId(crewMembers[0].crewMemberId);
    }
  }

  function openCampaignLookupTable(tableId) {
    setActiveTable(null);
    setActiveCampaignTableId(tableId);
    setHighlightedRowKey("");
    setPopupRollSummary("");
  }

  async function addEquipmentFromSelectedRow(displayRow) {
    const row = getRawRow(displayRow);

    const rollResult = {
      tableId: activeTable.id,
      tableTitle: activeTable.title,
      roll: displayRow.roll || "selected",
      result: row,
    };

    const baseRecord = createEquipmentRecordFromEquipmentRoll({
      rollResult,
      ownerCrewId: crewId,
      locationType: "stash",
      crewMemberId: "",
    });

    if (baseRecord && onAddEquipment) {
      const record = {
        ...baseRecord,
        roomId,
        crewId,
        playerId,
        ownerCrewId: crewId,
      };

      await onAddEquipment(record);

      const nextMessage = `${activeTable.title}: added ${record.name} to stash.`;

      setMessage(nextMessage);
      setPopupRollSummary(nextMessage);

      return;
    }

    const nextMessage = `${activeTable.title}: could not add ${getRowLabel(
      row
    )}.`;

    setMessage(nextMessage);
    setPopupRollSummary(nextMessage);
  }

  async function applyShipFromSelectedRow(displayRow) {
    const row = getRawRow(displayRow);
    const debtRoll = Math.floor(Math.random() * 6) + 1;

    const rollResult =
      row?.shipKey || row?.debt
        ? {
            tableId: activeTable.id,
            tableTitle: activeTable.title,
            roll: displayRow.roll || "selected",
            result: row,
            generatedDebt: rollShip(row, debtRoll)?.generatedDebt ?? 0,
            debtRoll,
          }
        : {
            tableId: activeTable.id,
            tableTitle: activeTable.title,
            roll: displayRow.roll || "selected",
            result: row,
            generatedDebt: 0,
            debtRoll,
          };

    const updatedCrew = createShipPatchFromRollResult(crew, rollResult);

    if (onSaveCrew) {
      await onSaveCrew(updatedCrew);
    }

    const nextMessage = `${activeTable.title}: applied ${
      row.name || row.ship || "ship"
    } to the adventure. Debt roll ${debtRoll}; debt ${rollResult.generatedDebt}.`;

    setMessage(nextMessage);
    setPopupRollSummary(nextMessage);
  }

  async function applyRowToCrewMember(displayRow) {
    if (!activeTable) return;

    const row = getRawRow(displayRow);
    const profile = row?.profileKey ? CREW_TYPE_PROFILES[row.profileKey] : null;

    if (!selectedCrewMember && isCrewMemberTable(activeTable.id)) {
      const nextMessage = "Select a crew member before applying this result.";

      setMessage(nextMessage);
      setPopupRollSummary(nextMessage);

      return;
    }

    if (isCrewMemberTable(activeTable.id)) {
      const patch = createCrewMemberPatch({
        member: selectedCrewMember,
        tableId: activeTable.id,
        row,
        profile,
      });

      if (onUpdate) {
        await onUpdate("crewMembers", selectedCrewMember.crewMemberId, patch);
      }

      const nextMessage = `${activeTable.title}: applied ${getRowLabel(
        row
      )} to ${selectedCrewMember.name || "crew member"}.`;

      setMessage(nextMessage);
      setPopupRollSummary(nextMessage);

      return;
    }

    const crewPatch = createCrewResourcePatch({
      crew,
      row,
      tableTitle: activeTable.title,
    });

    if (Object.keys(crewPatch).length && onSaveCrew) {
      await onSaveCrew({
        ...crew,
        ...crewPatch,
      });
    }

    const nextMessage = `${activeTable.title}: applied ${getRowLabel(row)}.`;

    setMessage(nextMessage);
    setPopupRollSummary(nextMessage);
  }

  async function applyCampaignLookupResult({ table, row, roll, applyTo }) {
    const note = makeCampaignResultNote({ table, row, roll });
    const targetType = applyTo?.targetType || "crewNotes";
    const recordId = applyTo?.recordId || "";
    const rawTarget = applyTo?.raw || null;

    if (targetType === "world" && onUpdate && recordId) {
      const existingTraits = Array.isArray(rawTarget?.traits)
        ? rawTarget.traits
        : [];

      await onUpdate("worlds", recordId, {
        traits: [
          ...existingTraits,
          {
            source: table.id,
            sourceLabel: table.label || table.title,
            roll,
            title: row.title,
            description: row.description,
          },
        ],
        worldTrait: row.title,
        worldTraitRoll: roll,
        worldTraitDescription: row.description,
        notes: appendNote(rawTarget?.notes || "", note),
      });

      setMessage(`${table.label}: applied ${row.title} to ${applyTo.label}.`);
      setActiveCampaignTableId("");
      return;
    }

    if (targetType === "campaignTurn" && onUpdate && recordId) {
      await onUpdate("campaignTurns", recordId, {
        notes: appendNote(rawTarget?.notes || "", note),
        lookupResults: [
          ...(Array.isArray(rawTarget?.lookupResults)
            ? rawTarget.lookupResults
            : []),
          {
            tableId: table.id,
            tableLabel: table.label || table.title,
            roll,
            title: row.title,
            description: row.description,
          },
        ],
      });

      setMessage(`${table.label}: applied ${row.title} to ${applyTo.label}.`);
      setActiveCampaignTableId("");
      return;
    }

    if (targetType === "crewMember" && onUpdate && recordId) {
      await onUpdate("crewMembers", recordId, {
        notes: appendNote(rawTarget?.notes || "", note),
      });

      setMessage(`${table.label}: applied ${row.title} to ${applyTo.label}.`);
      setActiveCampaignTableId("");
      return;
    }

    if (targetType === "patron" && onUpdate && recordId) {
      await onUpdate("patrons", recordId, {
        notes: appendNote(rawTarget?.notes || "", note),
        jobLookupResults: [
          ...(Array.isArray(rawTarget?.jobLookupResults)
            ? rawTarget.jobLookupResults
            : []),
          {
            tableId: table.id,
            tableLabel: table.label || table.title,
            roll,
            title: row.title,
            description: row.description,
          },
        ],
      });

      setMessage(`${table.label}: applied ${row.title} to ${applyTo.label}.`);
      setActiveCampaignTableId("");
      return;
    }

    if (targetType === "starship" && onSaveCrew && crew) {
      await onSaveCrew({
        ...crew,
        starship: {
          ...(crew.starship || {}),
          notes: appendNote(crew.starship?.notes || "", note),
          travelEvents: [
            ...(Array.isArray(crew.starship?.travelEvents)
              ? crew.starship.travelEvents
              : []),
            {
              tableId: table.id,
              tableLabel: table.label || table.title,
              roll,
              title: row.title,
              description: row.description,
            },
          ],
        },
      });

      setMessage(`${table.label}: applied ${row.title} to ${applyTo.label}.`);
      setActiveCampaignTableId("");
      return;
    }

    if (onSaveCrew && crew) {
      await onSaveCrew({
        ...crew,
        notes: appendNote(crew.notes || "", note),
      });
    }

    setMessage(`${table.label}: applied ${row.title} to Adventure Notes.`);
    setActiveCampaignTableId("");
  }

  function rollInPopup() {
    if (!activeTable) return;

    if (isEquipmentTable(activeTable.id)) {
      const rolled = rollOnEquipmentTable(activeTable.id);
      const displayRow = getDisplayRowForRawRow(rolled.result);

      setHighlightedRowKey(displayRow?.__rowKey || "");

      const nextMessage = getRollSummary({
        tableTitle: activeTable.title,
        roll: rolled.roll,
        result: rolled.result,
        extra:
          "Use the Apply button on the highlighted row to add it to the stash, or choose another row.",
      });

      setMessage(nextMessage);
      setPopupRollSummary(nextMessage);

      return;
    }

    if (activeTable.id === "ship" || isShipLookupTable(activeTable.id)) {
      const debtRoll = Math.floor(Math.random() * 6) + 1;
      const rolled = rollShip(null, debtRoll);
      const displayRow = getDisplayRowForRawRow(rolled.result);

      setHighlightedRowKey(displayRow?.__rowKey || "");

      const nextMessage = getRollSummary({
        tableTitle: activeTable.title,
        roll: rolled.roll,
        result: rolled.result,
        extra: `Debt roll ${debtRoll}; generated debt ${rolled.generatedDebt}. Use the Apply button on the highlighted row to apply it, or choose another ship.`,
      });

      setMessage(nextMessage);
      setPopupRollSummary(nextMessage);

      return;
    }

    const rolled = rowFromRoll(activeTable);
    const displayRow = getDisplayRowForRawRow(rolled.result);
    const profile = rolled.result?.profileKey
      ? CREW_TYPE_PROFILES[rolled.result.profileKey]
      : null;

    setHighlightedRowKey(displayRow?.__rowKey || "");

    const extra = profile
      ? `${profile.name}: ${statSummary(
          profile.startingStats
        )}. Use Apply to add it to the selected crew member, or choose another row.`
      : "Use Apply to add it to the selected crew member, or choose another row.";

    const nextMessage = getRollSummary({
      tableTitle: activeTable.title,
      roll: rolled.roll,
      result: rolled.result,
      extra,
    });

    setMessage(nextMessage);
    setPopupRollSummary(nextMessage);
  }

  async function selectRow(displayRow) {
    if (!activeTable) return;

    const row = getRawRow(displayRow);
    setHighlightedRowKey(displayRow?.__rowKey || createStableRowKey(row));

    if (isEquipmentTable(activeTable.id)) {
      await addEquipmentFromSelectedRow(displayRow);
      return;
    }

    if (activeTable.id === "ship" || isShipLookupTable(activeTable.id)) {
      await applyShipFromSelectedRow(displayRow);
      return;
    }

    await applyRowToCrewMember(displayRow);
  }

  return (
    <div className="fp-panel">
      <AccordionSection
        title="Creation Tables"
        subtitle="crew, equipment, ship, and shared lookup tables"
        defaultOpen
      >
        {message && <div className="fp-turn-summary">{message}</div>}

        <div className="fp-mini-title">Crew / Equipment / Ship Tables</div>

        <div className="fp-creation-button-grid">
          {CREW_CREATION_TABLES.map((table) => (
            <button
              key={table.id}
              className="fp-btn fp-primary fp-creation-table-button"
              onClick={() => openTable(table.id)}
            >
              {table.title}
            </button>
          ))}
        </div>

        <div className="fp-mini-title">Campaign Lookup Tables</div>

        <div className="fp-creation-button-grid">
          {campaignLookupTables.map((table) => (
            <button
              key={table.id}
              className="fp-btn fp-primary fp-creation-table-button"
              onClick={() => openCampaignLookupTable(table.id)}
            >
              {table.label || table.title}
            </button>
          ))}
        </div>

        {activeTable && (
          <CatalogModal
            title={activeTable.title}
            subtitle={
              isCrewMemberTable(activeTable.id)
                ? `${activeTable.dice || ""}${
                    selectedCrewMember
                      ? ` · applying to ${
                          selectedCrewMember.name || "Unnamed Crew Member"
                        }`
                      : ""
                  }`
                : activeTable.dice || ""
            }
            columns={activeTable.columns || ["roll", "result"]}
            rows={tableRows}
            actionLabel={
              isEquipmentTable(activeTable.id)
                ? "Add"
                : activeTable.id === "ship" || isShipLookupTable(activeTable.id)
                  ? "Apply"
                  : "Apply"
            }
            onSelect={selectRow}
            onClose={() => setActiveTable(null)}
            onRoll={rollInPopup}
            rollLabel="Roll"
            highlightedRowKey={highlightedRowKey}
            rollSummary={popupRollSummary}
            headerControls={
              isCrewMemberTable(activeTable.id) ? (
                <label className="fp-field fp-field-medium">
                  Apply to Crew Member
                  <select
                    value={selectedCrewMemberId}
                    onChange={(event) =>
                      setSelectedCrewMemberId(event.target.value)
                    }
                  >
                    <option value="">Select crew member</option>

                    {crewMembers.map((member) => (
                      <option
                        key={member.crewMemberId}
                        value={member.crewMemberId}
                      >
                        {member.name || "Unnamed Crew Member"}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null
            }
          />
        )}

        {activeCampaignTableId && (
          <LookupTableModal
            tableId={activeCampaignTableId}
            applyLabel="Apply"
            applyTargets={campaignLookupApplyTargets}
            onApply={applyCampaignLookupResult}
            onClose={() => setActiveCampaignTableId("")}
          />
        )}
      </AccordionSection>
    </div>
  );
}