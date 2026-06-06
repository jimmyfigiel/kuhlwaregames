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

function normalizeCount(value, defaultValue = 1) {
  const numericValue = Number(value ?? defaultValue);

  if (!Number.isFinite(numericValue)) {
    return defaultValue;
  }

  return Math.max(0, Math.floor(numericValue));
}

function makeEffectId({ crewMemberId, resultKind, sourceLabel, effectType, index }) {
  return [
    crewMemberId || "crew",
    cleanResultKind(resultKind),
    makeSafeIdPart(sourceLabel),
    effectType || "effect",
    index,
  ]
    .filter((part) => part !== undefined && part !== null && part !== "")
    .join("-");
}

function makeBasePendingEffect({
  crewMemberId,
  crewMemberNumber,
  result,
  resultKind,
  sourcePath,
  sourceLabel,
  effectType,
  index,
}) {
  return removeUndefinedValues({
    id: makeEffectId({ crewMemberId, resultKind, sourceLabel, effectType, index }),
    status: "pending",
    effectType,
    source: sourceLabel,
    sourcePath,
    resultKind: cleanResultKind(resultKind),
    crewMemberId,
    crewMemberNumber,
    tableResult: result?.label || result?.value || sourceLabel,
  });
}

function makePendingEffectFromResource({
  resource,
  index,
  crewMemberId,
  crewMemberNumber,
  result,
  resultKind,
  sourcePath,
  sourceLabel,
}) {
  const resourceType = resource?.type || "resource";
  const count = normalizeCount(resource?.count, 1);
  const base = makeBasePendingEffect({
    crewMemberId,
    crewMemberNumber,
    result,
    resultKind,
    sourcePath,
    sourceLabel,
    effectType: resourceType,
    index,
  });

  if (resourceType === "credits" && resource?.amount) {
    return {
      target: "crew",
      effect: removeUndefinedValues({
        ...base,
        effectType: "creditRoll",
        resourceType: "credits",
        dice: resource.amount,
        label: resource.label || `${resource.amount} credits`,
      }),
    };
  }

  if (resourceType === "storyPoint") {
    return {
      target: "world",
      effect: removeUndefinedValues({
        ...base,
        effectType: "addStoryPoints",
        count,
        label: resource.label || `+${count} Story Point${count === 1 ? "" : "s"}`,
      }),
    };
  }

  if (resourceType === "rumor") {
    return {
      target: "world",
      effect: removeUndefinedValues({
        ...base,
        effectType: "addRumors",
        count,
        label: resource.label || `+${count} Rumor${count === 1 ? "" : "s"}`,
      }),
    };
  }

  if (resourceType === "questRumor") {
    return {
      target: "world",
      effect: removeUndefinedValues({
        ...base,
        effectType: "addQuestRumors",
        count,
        label: resource.label || `+${count} Quest Rumor${count === 1 ? "" : "s"}`,
      }),
    };
  }

  if (resourceType === "patron") {
    return {
      target: "world",
      effect: removeUndefinedValues({
        ...base,
        effectType: "addPatrons",
        count,
        label: resource.label || `+${count} Patron${count === 1 ? "" : "s"}`,
      }),
    };
  }

  if (resourceType === "rival") {
    return {
      target: "world",
      effect: removeUndefinedValues({
        ...base,
        effectType: "addRivals",
        count,
        label: resource.label || `+${count} Rival${count === 1 ? "" : "s"}`,
      }),
    };
  }

  if (resourceType === "xp") {
    return {
      target: "crewMember",
      effect: removeUndefinedValues({
        ...base,
        effectType: "addXp",
        count,
        label: resource.label || `+${count} XP`,
      }),
    };
  }

  return {
    target: "crewMember",
    effect: removeUndefinedValues({
      ...base,
      effectType: "resource",
      resourceType,
      count,
      amount: resource?.amount,
      label: resource?.label || resourceType,
      raw: resource,
    }),
  };
}

function makePendingEffectFromStartingRoll({
  startingRoll,
  index,
  crewMemberId,
  crewMemberNumber,
  result,
  resultKind,
  sourcePath,
  sourceLabel,
}) {
  const rollType = startingRoll?.type || "startingRoll";
  const count = normalizeCount(startingRoll?.count, 1);
  const base = makeBasePendingEffect({
    crewMemberId,
    crewMemberNumber,
    result,
    resultKind,
    sourcePath,
    sourceLabel,
    effectType: "startingRoll",
    index,
  });

  return {
    target: "crewMember",
    effect: removeUndefinedValues({
      ...base,
      effectType: "startingRoll",
      rollType,
      count,
      label: startingRoll?.label || `+${count} ${rollType}`,
      raw: startingRoll,
    }),
  };
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

  if (Array.isArray(result?.saves)) {
    result.saves.forEach((save, index) => {
      if (!save || typeof save !== "object") {
        return;
      }

      operations.push({
        op: "append",
        path: "saves",
        value: removeUndefinedValues({
          id: `${makeSafeIdPart(sourceLabel)}-save-${index}`,
          source: save.source || sourceLabel,
          ...save,
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

function buildPendingEffectOperations({
  crewMemberId,
  crewMemberNumber,
  sourcePath,
  resultKind,
  result,
}) {
  const sourceLabel = result?.label || result?.value || cleanResultKind(resultKind);
  const operationsByTarget = {
    crewMember: [],
    crew: [],
    world: [],
  };

  (result?.resources || []).forEach((resource, index) => {
    const pending = makePendingEffectFromResource({
      resource,
      index,
      crewMemberId,
      crewMemberNumber,
      result,
      resultKind,
      sourcePath,
      sourceLabel,
    });

    if (pending?.target && pending?.effect) {
      operationsByTarget[pending.target].push({
        op: "append",
        path: "pendingEffects",
        value: pending.effect,
      });
    }
  });

  (result?.startingRolls || []).forEach((startingRoll, index) => {
    const pending = makePendingEffectFromStartingRoll({
      startingRoll,
      index,
      crewMemberId,
      crewMemberNumber,
      result,
      resultKind,
      sourcePath,
      sourceLabel,
    });

    if (pending?.target && pending?.effect) {
      operationsByTarget[pending.target].push({
        op: "append",
        path: "pendingEffects",
        value: pending.effect,
      });
    }
  });

  return operationsByTarget;
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
  const pendingEffectOperations = buildPendingEffectOperations({
    crewMemberId,
    crewMemberNumber,
    sourcePath,
    resultKind: safeResultKind,
    result,
  });

  const commands = [
    commandFactory.updateState({
      id: `${crewMemberId}-apply-${safeResultKind}-${makeSafeIdPart(sourceLabel)}`,
      title: `Crew Member ${crewMemberNumber}: Apply ${sourceLabel}`,
      targetPath: detailPath,
      operations: buildTableResultOperations({ result, resultKind: safeResultKind, sourcePath }),
      pauseAfter: false,
      visible: false,
    }),
  ];

  if (pendingEffectOperations.crewMember.length > 0) {
    commands.push(
      commandFactory.updateState({
        id: `${crewMemberId}-queue-character-effects-${safeResultKind}-${makeSafeIdPart(sourceLabel)}`,
        title: `Crew Member ${crewMemberNumber}: Queue Character Effects from ${sourceLabel}`,
        targetPath: detailPath,
        operations: pendingEffectOperations.crewMember,
        pauseAfter: false,
        visible: false,
      })
    );
  }

  if (pendingEffectOperations.crew.length > 0) {
    commands.push(
      commandFactory.updateState({
        id: `${crewMemberId}-queue-crew-effects-${safeResultKind}-${makeSafeIdPart(sourceLabel)}`,
        title: `Crew Member ${crewMemberNumber}: Queue Crew Effects from ${sourceLabel}`,
        operations: pendingEffectOperations.crew.map((operation) => ({
          ...operation,
          path: `crewLog.${operation.path}`,
        })),
        pauseAfter: false,
        visible: false,
      })
    );
  }

  if (pendingEffectOperations.world.length > 0) {
    commands.push(
      commandFactory.updateState({
        id: `${crewMemberId}-queue-world-effects-${safeResultKind}-${makeSafeIdPart(sourceLabel)}`,
        title: `Crew Member ${crewMemberNumber}: Queue World Effects from ${sourceLabel}`,
        operations: pendingEffectOperations.world.map((operation) => ({
          ...operation,
          path: `worldLog.${operation.path}`,
        })),
        pauseAfter: false,
        visible: false,
      })
    );
  }

  return commands;
}
