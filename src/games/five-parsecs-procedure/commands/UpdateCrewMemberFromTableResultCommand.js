import BaseCommand from "../../../procedure-core/commands/BaseCommand";
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

function toTitleCaseStatName(key) {
  return String(key || "")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (letter) => letter.toUpperCase());
}

function cloneObject(value, fallback = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...fallback };
  }

  return { ...value };
}

function normalizeArray(value) {
  return Array.isArray(value) ? [...value] : [];
}

function normalizeResultKind(value) {
  const cleanValue = String(value || "").trim();

  if (cleanValue) {
    return cleanValue;
  }

  return "tableResult";
}

function appendUniqueText(existing, text) {
  const cleanText = String(text || "").trim();

  if (!cleanText) {
    return normalizeArray(existing);
  }

  const nextValues = normalizeArray(existing);

  if (!nextValues.includes(cleanText)) {
    nextValues.push(cleanText);
  }

  return nextValues;
}

function appendResourceList(existing, resources, sourceLabel) {
  const nextValues = normalizeArray(existing);

  if (!Array.isArray(resources)) {
    return nextValues;
  }

  resources.forEach((resource, index) => {
    if (!resource || typeof resource !== "object") {
      return;
    }

    nextValues.push(
      removeUndefinedValues({
        id: `${sourceLabel || "resource"}-${Date.now()}-${index}`,
        source: sourceLabel,
        ...resource,
      })
    );
  });

  return nextValues;
}

function appendStartingRollList(existing, startingRolls, sourceLabel) {
  const nextValues = normalizeArray(existing);

  if (!Array.isArray(startingRolls)) {
    return nextValues;
  }

  startingRolls.forEach((startingRoll, index) => {
    if (!startingRoll || typeof startingRoll !== "object") {
      return;
    }

    nextValues.push(
      removeUndefinedValues({
        id: `${sourceLabel || "starting-roll"}-${Date.now()}-${index}`,
        source: sourceLabel,
        ...startingRoll,
      })
    );
  });

  return nextValues;
}

function applyStatModifiers(existingStats, statModifiers = {}) {
  const nextStats = cloneObject(existingStats, DEFAULT_HUMAN_STATS);

  Object.entries(statModifiers || {}).forEach(([key, amount]) => {
    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount === 0) {
      return;
    }

    const currentValue = Number(nextStats[key] || 0);
    nextStats[key] = currentValue + numericAmount;
  });

  return nextStats;
}

function summarizeStatModifiers(statModifiers = {}) {
  const parts = Object.entries(statModifiers || {})
    .filter(([, amount]) => Number(amount) !== 0)
    .map(([key, amount]) => {
      const numericAmount = Number(amount);
      const sign = numericAmount > 0 ? "+" : "";
      return `${toTitleCaseStatName(key)} ${sign}${numericAmount}`;
    });

  return parts.join(", ");
}

export default class UpdateCrewMemberFromTableResultCommand extends BaseCommand {
  constructor({
    id,
    crewMemberId,
    crewMemberNumber = 1,
    sourcePath,
    resultKind = "tableResult",
    title = null,
    status = "pending",
    pauseAfter = false,
    visible = false,
  }) {
    super({
      id,
      type: "updateCrewMemberFromTableResult",
      title: title || `Crew Member ${crewMemberNumber}: Update Table Result`,
      status,
      pauseAfter,
      visible,
    });

    this.crewMemberId = crewMemberId;
    this.crewMemberNumber = crewMemberNumber;
    this.sourcePath = sourcePath;
    this.resultKind = normalizeResultKind(resultKind);
  }

  execute(engineContext) {
    const result = engineContext.getStateValue(this.sourcePath);
    const detailPath = `crewLog.crewDetails.${this.crewMemberId}`;
    const detail = engineContext.getStateValue(detailPath) || {};

    if (!result || typeof result !== "object") {
      this.status = "complete";
      engineContext.setStatus("idle");
      engineContext.addLogEntry({
        type: "commandSkipped",
        text: `No table result found at ${this.sourcePath}.`,
        commandId: this.id,
      });
      return;
    }

    const sourceLabel = result.label || result.value || this.resultKind;
    const tableResultSummary = removeUndefinedValues({
      kind: this.resultKind,
      sourcePath: this.sourcePath,
      tableId: result.tableId,
      tableTitle: result.tableTitle,
      roll: result.roll,
      label: result.label,
      value: result.value,
      profileKey: result.profileKey,
      category: result.category,
      description: result.description,
    });

    const tableResults = normalizeArray(detail.tableResults);
    tableResults.push(tableResultSummary);

    engineContext.setStateValue(`${detailPath}.tableResults`, tableResults);

    if (result.startingStats && typeof result.startingStats === "object") {
      engineContext.setStateValue(
        `${detailPath}.baseStats`,
        cloneObject(result.startingStats, DEFAULT_HUMAN_STATS)
      );
      engineContext.setStateValue(
        `${detailPath}.stats`,
        cloneObject(result.startingStats, DEFAULT_HUMAN_STATS)
      );
    } else if (!detail.stats) {
      engineContext.setStateValue(`${detailPath}.stats`, cloneObject(detail.stats, DEFAULT_HUMAN_STATS));
    }

    if (result.maxStats && typeof result.maxStats === "object") {
      engineContext.setStateValue(
        `${detailPath}.maxStats`,
        cloneObject(result.maxStats, DEFAULT_HUMAN_MAX_STATS)
      );
    } else if (!detail.maxStats) {
      engineContext.setStateValue(`${detailPath}.maxStats`, DEFAULT_HUMAN_MAX_STATS);
    }

    if (result.statModifiers && typeof result.statModifiers === "object") {
      const currentStats = engineContext.getStateValue(`${detailPath}.stats`) || detail.stats || DEFAULT_HUMAN_STATS;
      engineContext.setStateValue(
        `${detailPath}.stats`,
        applyStatModifiers(currentStats, result.statModifiers)
      );

      const modifierSummary = summarizeStatModifiers(result.statModifiers);
      if (modifierSummary) {
        engineContext.setStateValue(
          `${detailPath}.statModifierNotes`,
          appendUniqueText(detail.statModifierNotes, `${sourceLabel}: ${modifierSummary}`)
        );
      }
    }

    if (Array.isArray(result.resources) && result.resources.length > 0) {
      engineContext.setStateValue(
        `${detailPath}.resources`,
        appendResourceList(detail.resources, result.resources, sourceLabel)
      );
    }

    if (Array.isArray(result.startingRolls) && result.startingRolls.length > 0) {
      engineContext.setStateValue(
        `${detailPath}.startingRolls`,
        appendStartingRollList(detail.startingRolls, result.startingRolls, sourceLabel)
      );
    }

    if (result.description) {
      engineContext.setStateValue(
        `${detailPath}.resultNotes`,
        appendUniqueText(detail.resultNotes, `${sourceLabel}: ${result.description}`)
      );
    }

    if (Array.isArray(result.specialRules) && result.specialRules.length > 0) {
      engineContext.setStateValue(
        `${detailPath}.specialRules`,
        [...normalizeArray(detail.specialRules), ...result.specialRules]
      );
    }

    if (result.category) {
      engineContext.setStateValue(`${detailPath}.category`, result.category);
    }

    if (result.profileKey) {
      engineContext.setStateValue(`${detailPath}.profileKey`, result.profileKey);
    }

    this.status = "complete";
    engineContext.setStatus("idle");

    engineContext.addLogEntry({
      type: "commandCompleted",
      text: `Updated crew member ${this.crewMemberNumber} from ${result.tableTitle || "table"}: ${sourceLabel}`,
      commandId: this.id,
    });
  }

  toJSON() {
    return removeUndefinedValues({
      ...super.toJSON(),
      crewMemberId: this.crewMemberId,
      crewMemberNumber: this.crewMemberNumber,
      sourcePath: this.sourcePath,
      resultKind: this.resultKind,
    });
  }
}
