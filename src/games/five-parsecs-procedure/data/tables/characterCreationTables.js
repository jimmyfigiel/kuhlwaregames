import { BACKGROUND_TABLE } from "./backgroundTables";
import { MOTIVATION_TABLE } from "./motivationTables";
import { CLASS_TABLE } from "./classTables";

export function makeQueueCrewMemberTableResultUpdateCommandsCommand({ crewMemberId, crewMemberNumber, sourcePath, resultKind }) {
  return {
    id: `${crewMemberId}-queue-update-${resultKind}-${sourcePath.replace(/[^a-zA-Z0-9_-]/g, "-")}`,
    type: "queueCrewMemberTableResultUpdateCommands",
    title: `Crew Member ${crewMemberNumber}: Queue ${resultKind} Updates`,
    crewMemberId,
    crewMemberNumber,
    sourcePath,
    resultKind,
    pauseAfter: false,
    visible: false,
  };
}

function makeTableRollCommand({ id, title, table, saveTo, crewMemberId, crewMemberNumber, resultKind }) {
  return {
    id,
    type: "tableRoll",
    title,
    table,
    saveTo,
    afterSelectionCommands: [
      makeQueueCrewMemberTableResultUpdateCommandsCommand({
        crewMemberId,
        crewMemberNumber,
        sourcePath: saveTo,
        resultKind,
      }),
    ],
    buttonText: "Select",
    rollButtonText: "Roll with App Dice",
    pauseAfter: false,
    visible: true,
  };
}

function makeFinalizeCrewMemberCommand({ crewMemberId, crewMemberNumber }) {
  return {
    id: `${crewMemberId}-finalize-character-creation`,
    type: "finalizeCrewMember",
    title: `Crew Member ${crewMemberNumber}: Finish Character`,
    crewMemberId,
    crewMemberNumber,
    pauseAfter: false,
    visible: false,
  };
}

function summarizeModifiers(statModifiers = {}) {
  const entries = Object.entries(statModifiers || {}).filter(([, value]) => Number(value) !== 0);

  if (entries.length === 0) {
    return "";
  }

  return entries
    .map(([key, value]) => {
      const label = key
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (letter) => letter.toUpperCase());
      const amount = Number(value) > 0 ? `+${value}` : String(value);
      return `${label} ${amount}`;
    })
    .join(", ");
}

function summarizeResources(resources = []) {
  if (!Array.isArray(resources) || resources.length === 0) {
    return "";
  }

  return resources
    .map((resource) => {
      const amount = resource.amount ?? resource.count ?? "";
      const label = resource.label || resource.type || "Resource";
      return amount ? `${amount} ${label}` : label;
    })
    .join(", ");
}

function summarizeStartingRolls(startingRolls = []) {
  if (!Array.isArray(startingRolls) || startingRolls.length === 0) {
    return "";
  }

  return startingRolls
    .map((roll) => roll.label || `${roll.count || 1} ${roll.type || "starting roll"}`)
    .join(", ");
}

function makeDescription(row) {
  const parts = [
    summarizeModifiers(row.statModifiers),
    summarizeResources(row.resources),
    summarizeStartingRolls(row.startingRolls),
  ].filter(Boolean);

  return parts.join(" · ");
}

function convertRows(rows) {
  return rows.map((row) => ({
    min: row.rollMin,
    max: row.rollMax,
    label: row.name,
    value: row.name,
    description: makeDescription(row),
    statModifiers: row.statModifiers || {},
    resources: row.resources || [],
    startingRolls: row.startingRolls || [],
  }));
}

export const characterCreationTables = {
  background: {
    id: "background",
    title: "Background Table",
    dice: "D100",
    sides: 100,
    columns: ["roll", "result", "effect", "resources", "startingRolls"],
    entries: convertRows(BACKGROUND_TABLE),
  },
  motivation: {
    id: "motivation",
    title: "Motivation Table",
    dice: "D100",
    sides: 100,
    columns: ["roll", "result", "effect", "resources", "startingRolls"],
    entries: convertRows(MOTIVATION_TABLE),
  },
  class: {
    id: "class",
    title: "Class Table",
    dice: "D100",
    sides: 100,
    columns: ["roll", "result", "effect", "resources", "startingRolls"],
    entries: convertRows(CLASS_TABLE),
  },
};

function getRollLabel(rollType) {
  switch (rollType) {
    case "background":
      return "Background";
    case "motivation":
      return "Motivation";
    case "class":
      return "Class";
    default:
      return rollType;
  }
}

export function buildCharacterCreationRollCommands({
  crewMemberId,
  crewMemberNumber,
  rollTypes = [],
  includeFinalize = true,
}) {
  const detailBasePath = `crewLog.crewDetails.${crewMemberId}`;
  const totals = rollTypes.reduce((accumulator, rollType) => {
    accumulator[rollType] = (accumulator[rollType] || 0) + 1;
    return accumulator;
  }, {});
  const seen = {};

  const commands = rollTypes
    .map((rollType, index) => {
      const table = characterCreationTables[rollType];

      if (!table) {
        return null;
      }

      seen[rollType] = (seen[rollType] || 0) + 1;
      const occurrence = seen[rollType];
      const fieldName = totals[rollType] > 1 ? `${rollType}${occurrence}` : rollType;
      const label = getRollLabel(rollType);
      const titleSuffix = totals[rollType] > 1 ? ` ${occurrence}` : "";

      return makeTableRollCommand({
        id: `${crewMemberId}-${rollType}-${occurrence}-${index}`,
        title: `Crew Member ${crewMemberNumber}: ${label}${titleSuffix}`,
        table,
        saveTo: `${detailBasePath}.${fieldName}`,
        crewMemberId,
        crewMemberNumber,
        resultKind: fieldName,
      });
    })
    .filter(Boolean);

  if (includeFinalize) {
    commands.push(makeFinalizeCrewMemberCommand({ crewMemberId, crewMemberNumber }));
  }

  return commands;
}
