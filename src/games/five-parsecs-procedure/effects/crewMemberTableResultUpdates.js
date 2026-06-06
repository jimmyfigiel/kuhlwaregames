import { removeUndefinedValues } from "../../../procedure-core/utils";

const DEFAULT_HUMAN_STATS = {
  reactions: 1,
  speed: 4,
  combatSkill: 0,
  toughness: 3,
  savvy: 0,
  luck: 0,
};

const DEFAULT_HUMAN_MAX_STATS = {
  reactions: 6,
  speed: 8,
  combatSkill: 5,
  toughness: 6,
  savvy: 5,
};

function cleanResultKind(value) {
  return String(value || "tableResult").trim() || "tableResult";
}

function makeSafeIdPart(value) {
  return String(value || "value").replace(/[^a-zA-Z0-9_-]/g, "-");
}

function toTitleCaseStatName(key) {
  return String(key || "")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (letter) => letter.toUpperCase());
}

function summarizeStatModifiers(statModifiers = {}) {
  return Object.entries(statModifiers || {})
    .filter(([, amount]) => Number(amount) !== 0)
    .map(([key, amount]) => {
      const numericAmount = Number(amount);
      const sign = numericAmount > 0 ? "+" : "";
      return `${toTitleCaseStatName(key)} ${sign}${numericAmount}`;
    })
    .join(", ");
}

function makeTableResultSummary({ result, resultKind, sourcePath }) {
  const { followUpCommands, ...resultWithoutFollowUps } = result || {};

  return removeUndefinedValues({
    kind: cleanResultKind(resultKind),
    sourcePath,
    tableId: resultWithoutFollowUps.tableId,
    tableTitle: resultWithoutFollowUps.tableTitle,
    roll: resultWithoutFollowUps.roll,
    label: resultWithoutFollowUps.label,
    value: resultWithoutFollowUps.value,
    profileKey: resultWithoutFollowUps.profileKey,
    category: resultWithoutFollowUps.category,
    description: resultWithoutFollowUps.description,
  });
}

function buildTableResultOperations({ result, resultKind, sourcePath }) {
  const operations = [
    {
      op: "append",
      path: "tableResults",
      value: makeTableResultSummary({ result, resultKind, sourcePath }),
    },
    {
      op: "setIfMissing",
      path: "stats",
      value: DEFAULT_HUMAN_STATS,
    },
    {
      op: "setIfMissing",
      path: "maxStats",
      value: DEFAULT_HUMAN_MAX_STATS,
    },
  ];

  if (result?.startingStats && typeof result.startingStats === "object") {
    operations.push(
      {
        op: "set",
        path: "baseStats",
        value: result.startingStats,
      },
      {
        op: "set",
        path: "stats",
        value: result.startingStats,
      }
    );
  }

  if (result?.maxStats && typeof result.maxStats === "object") {
    operations.push({
      op: "set",
      path: "maxStats",
      value: result.maxStats,
    });
  }

  Object.entries(result?.statModifiers || {}).forEach(([key, amount]) => {
    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount === 0) {
      return;
    }

    operations.push({
      op: "increment",
      path: `stats.${key}`,
      amount: numericAmount,
    });
  });

  const modifierSummary = summarizeStatModifiers(result?.statModifiers || {});
  const sourceLabel = result?.label || result?.value || cleanResultKind(resultKind);

  if (modifierSummary) {
    operations.push({
      op: "append",
      path: "statModifierNotes",
      value: `${sourceLabel}: ${modifierSummary}`,
    });
  }

  if (Array.isArray(result?.resources)) {
    result.resources.forEach((resource, index) => {
      if (!resource || typeof resource !== "object") {
        return;
      }

      operations.push({
        op: "append",
        path: "resources",
        value: removeUndefinedValues({
          id: `${makeSafeIdPart(sourceLabel)}-resource-${index}`,
          source: sourceLabel,
          ...resource,
        }),
      });
    });
  }

  if (Array.isArray(result?.startingRolls)) {
    result.startingRolls.forEach((startingRoll, index) => {
      if (!startingRoll || typeof startingRoll !== "object") {
        return;
      }

      operations.push({
        op: "append",
        path: "startingRolls",
        value: removeUndefinedValues({
          id: `${makeSafeIdPart(sourceLabel)}-starting-roll-${index}`,
          source: sourceLabel,
          ...startingRoll,
        }),
      });
    });
  }

  if (result?.description) {
    operations.push({
      op: "append",
      path: "resultNotes",
      value: `${sourceLabel}: ${result.description}`,
    });
  }

  if (Array.isArray(result?.specialRules)) {
    result.specialRules.forEach((specialRule) => {
      operations.push({
        op: "append",
        path: "specialRules",
        value: specialRule,
      });
    });
  }

  if (result?.category) {
    operations.push({
      op: "set",
      path: "category",
      value: result.category,
    });
  }

  if (result?.profileKey) {
    operations.push({
      op: "set",
      path: "profileKey",
      value: result.profileKey,
    });
  }

  return operations;
}

export function buildCrewMemberTableResultUpdateCommands({
  commandFactory,
  crewMemberId,
  crewMemberNumber,
  sourcePath,
  resultKind,
  result,
}) {
  const detailPath = `crewLog.crewDetails.${crewMemberId}`;
  const safeResultKind = cleanResultKind(resultKind);
  const sourceLabel = result?.label || result?.value || safeResultKind;

  return [
    commandFactory.updateState({
      id: `${crewMemberId}-apply-${safeResultKind}-${makeSafeIdPart(sourceLabel)}`,
      title: `Crew Member ${crewMemberNumber}: Apply ${sourceLabel}`,
      targetPath: detailPath,
      operations: buildTableResultOperations({ result, resultKind: safeResultKind, sourcePath }),
      pauseAfter: false,
      visible: false,
    }),
  ];
}
