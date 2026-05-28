import { CAMPAIGN_TABLES } from "./campaignTables";
import { CREW_CREATION_TABLES } from "./crewCreationTables";
import { rollOnEquipmentTable } from "./startingEquipmentTables";
import { rollShip } from "./shipTables";
import { findByRoll, rollD100, tableRowsForDisplay } from "./tableUtils";

export const LOOKUP_GROUPS = {
  CAMPAIGN: "campaign",
  CREW_CREATION: "crewCreation",
  EQUIPMENT: "equipment",
  SHIP: "ship",
};

export const CAMPAIGN_LOOKUP_TABLE_IDS = [
  "worldTraits",
  "starshipTravelEvents",
  "tradeTable",
  "explorationTable",
  "patronTable",
  "dangerPayTable",
  "timeFrameTable",
  "benefitsSubtable",
  "hazardsSubtable",
  "conditionsSubtable",
];

export const CREW_MEMBER_LOOKUP_TABLE_IDS = [
  "basicCrewType",
  "primaryAlienType",
  "strangeCharacterType",
  "background",
  "motivation",
  "class",
];

export const EQUIPMENT_LOOKUP_TABLE_IDS = [
  "lowTechWeapon",
  "militaryWeapon",
  "highTechWeapon",
  "gear",
  "gadget",
];

export const SHIP_LOOKUP_TABLE_IDS = ["ship"];

function getRangeMin(row) {
  return row?.min ?? row?.rollMin ?? row?.roll ?? row?.value ?? "";
}

function getRangeMax(row) {
  return row?.max ?? row?.rollMax ?? row?.roll ?? row?.value ?? getRangeMin(row);
}

function getRowTitle(row) {
  return (
    row?.title ||
    row?.name ||
    row?.result ||
    row?.ship ||
    row?.label ||
    "Result"
  );
}

function getRowDescription(row) {
  return (
    row?.description ||
    row?.effect ||
    row?.notes ||
    row?.text ||
    row?.details ||
    ""
  );
}

function getDiceForTable(table) {
  return table?.dice || table?.die || "D100";
}

function normalizeRow(row, tableId) {
  const min = getRangeMin(row);
  const max = getRangeMax(row);
  const title = getRowTitle(row);
  const description = getRowDescription(row);

  return {
    ...row,
    lookupTableId: tableId,
    min,
    max,
    title,
    description,
    raw: row,
  };
}

function normalizeRows(rows, tableId) {
  return (rows || []).map((row) => normalizeRow(row, tableId));
}

function normalizeCreationTable(table, group) {
  const displayRows = tableRowsForDisplay(table.rows || []);

  const rows = displayRows.map((displayRow, index) => {
    const rawRow = table.rows?.[index] || displayRow;

    return normalizeRow(
      {
        ...displayRow,
        ...rawRow,
      },
      table.id
    );
  });

  return {
    ...table,
    id: table.id,
    label: table.label || table.title || table.name || table.id,
    title: table.title || table.label || table.name || table.id,
    dice: getDiceForTable(table),
    group,
    rows,
    raw: table,
  };
}

function normalizeCampaignTable(table) {
  return {
    ...table,
    id: table.id,
    label: table.label || table.title || table.id,
    title: table.title || table.label || table.id,
    dice: getDiceForTable(table),
    group: LOOKUP_GROUPS.CAMPAIGN,
    rows: normalizeRows(table.rows || [], table.id),
    raw: table,
  };
}

function buildLookupTables() {
  const registry = {};

  Object.values(CAMPAIGN_TABLES || {}).forEach((table) => {
    if (!table?.id) return;
    registry[table.id] = normalizeCampaignTable(table);
  });

  (CREW_CREATION_TABLES || []).forEach((table) => {
    if (!table?.id) return;

    const group = EQUIPMENT_LOOKUP_TABLE_IDS.includes(table.id)
      ? LOOKUP_GROUPS.EQUIPMENT
      : SHIP_LOOKUP_TABLE_IDS.includes(table.id)
        ? LOOKUP_GROUPS.SHIP
        : LOOKUP_GROUPS.CREW_CREATION;

    registry[table.id] = normalizeCreationTable(table, group);
  });

  return registry;
}

export const LOOKUP_TABLES = buildLookupTables();

export function getLookupTable(tableId) {
  return LOOKUP_TABLES[tableId] || null;
}

export function getLookupTablesByGroup(group) {
  return Object.values(LOOKUP_TABLES).filter((table) => table.group === group);
}

export function getCampaignLookupTables() {
  return CAMPAIGN_LOOKUP_TABLE_IDS.map((tableId) => LOOKUP_TABLES[tableId]).filter(
    Boolean
  );
}

export function getCrewCreationLookupTables() {
  return CREW_MEMBER_LOOKUP_TABLE_IDS.map((tableId) => LOOKUP_TABLES[tableId]).filter(
    Boolean
  );
}

export function getEquipmentLookupTables() {
  return EQUIPMENT_LOOKUP_TABLE_IDS.map((tableId) => LOOKUP_TABLES[tableId]).filter(
    Boolean
  );
}

export function isCampaignLookupTable(tableId) {
  return CAMPAIGN_LOOKUP_TABLE_IDS.includes(tableId);
}

export function isCrewMemberLookupTable(tableId) {
  return CREW_MEMBER_LOOKUP_TABLE_IDS.includes(tableId);
}

export function isEquipmentLookupTable(tableId) {
  return EQUIPMENT_LOOKUP_TABLE_IDS.includes(tableId);
}

export function isShipLookupTable(tableId) {
  return SHIP_LOOKUP_TABLE_IDS.includes(tableId);
}

export function getLookupRowKey(row) {
  if (!row) return "";

  return [
    row.lookupTableId || "",
    row.min ?? "",
    row.max ?? "",
    row.title ?? "",
    row.description ?? "",
    row.name ?? "",
    row.result ?? "",
    row.ship ?? "",
    row.weaponKey ?? "",
    row.itemKey ?? "",
  ].join("::");
}

export function formatLookupRollRange(row) {
  if (!row) return "";

  if (row.min === row.max) {
    return String(row.min);
  }

  return `${row.min}-${row.max}`;
}

function rollByDice(dice) {
  const cleanDice = String(dice || "D100").toUpperCase();

  if (cleanDice === "D6") {
    return Math.floor(Math.random() * 6) + 1;
  }

  if (cleanDice === "D10") {
    return Math.floor(Math.random() * 10) + 1;
  }

  return rollD100();
}

function findNormalizedRow(table, roll) {
  if (!table?.rows?.length) return null;

  return (
    table.rows.find((row) => {
      const min = Number(row.min);
      const max = Number(row.max);

      if (!Number.isFinite(min) || !Number.isFinite(max)) return false;

      return roll >= min && roll <= max;
    }) || null
  );
}

export function rollOnLookupTable(tableId) {
  const table = getLookupTable(tableId);

  if (!table) {
    return {
      tableId,
      table: null,
      roll: null,
      row: null,
      rawRow: null,
      error: `Unknown lookup table: ${tableId}`,
    };
  }

  if (isEquipmentLookupTable(tableId)) {
    const result = rollOnEquipmentTable(tableId);
    const row = normalizeRow(result.result, tableId);

    return {
      tableId,
      table,
      roll: result.roll,
      row,
      rawRow: result.result,
      error: "",
    };
  }

  if (isShipLookupTable(tableId)) {
    const result = rollShip();
    const row = normalizeRow(result.result, tableId);

    return {
      tableId,
      table,
      roll: result.roll,
      row,
      rawRow: result.result,
      generatedDebt: result.generatedDebt,
      debtRoll: result.debtRoll,
      error: "",
    };
  }

  const roll = rollByDice(table.dice);
  const row =
    findNormalizedRow(table, roll) ||
    normalizeRow(findByRoll(table.raw?.rows || [], roll), tableId);

  return {
    tableId,
    table,
    roll,
    row,
    rawRow: row?.raw || row,
    error: row ? "" : `Rolled ${roll}, but no matching row was found.`,
  };
}