// src/core/command/commandObjects.js
// Generic command object helpers. No game-specific logic belongs here.

let commandCounter = 0;

export function makeCommand(type, options = {}) {
  commandCounter += 1;
  const safeType = String(type || "UNKNOWN");
  return removeUndefinedDeep({
    id: options.id || `${safeType}_${Date.now()}_${commandCounter}`,
    type: safeType,
    mode: options.mode || "immediate",
    status: options.status || "queued",
    actor: options.actor || options.playerId || "System",
    playerId: options.playerId || null,
    source: options.source || "command-constructor",
    params: options.params || {},
  });
}

export function normalizeAction(...args) {
  // The room shell has not had a single stable action bridge shape across this project.
  // This function is intentionally defensive and accepts all shapes we have seen:
  //   submitAction(state, actionObject)
  //   submitAction(state, playerSlot, actionObject)
  //   submitAction(state, commandType, payload)
  //   submitAction(state, commandType)
  //   nested wrappers: { action }, { payload }, { pokemonAction }, { gameAction }, { data:{action} }
  const [first, second] = args;

  // Shape: submitAction(state, "OPEN_CARD_ZOOM")
  if (typeof first === "string" && second === undefined) {
    return buildAction({ type: first });
  }

  // Shape: submitAction(state, "OPEN_CARD_ZOOM", { cardId })
  // Also handles submitAction(state, "p1", { type:"OPEN_CARD_ZOOM" }).
  if (typeof first === "string" && second && typeof second === "object") {
    const extracted = extractNestedAction(second) || second;

    if (first === "p1" || first === "p2") {
      return buildAction({
        ...extracted,
        playerSlot: extracted.playerSlot || first,
        playerId: extracted.playerId || first,
      });
    }

    return buildAction({
      ...extracted,
      type: validType(extracted.type) ? extracted.type : first,
    });
  }

  // Shape: submitAction(state, actionObject)
  if (first && typeof first === "object") {
    const extracted = extractNestedAction(first) || first;
    if (validType(extracted.type)) {
      return buildAction(extracted);
    }
  }

  return { type: "UNKNOWN" };
}

function extractNestedAction(value) {
  if (!value || typeof value !== "object") return null;

  const candidates = [
    value.pokemonAction,
    value.gameAction,
    value.action,
    value.payload,
    value.data?.action,
    value.data?.payload,
  ];

  return candidates.find((candidate) => candidate && typeof candidate === "object" && validType(candidate.type)) || null;
}

function buildAction(raw) {
  const params = raw?.params && typeof raw.params === "object" ? raw.params : {};

  // Command constructors receive the normalized action directly. Flatten params so both
  // { type, cardId } and { type, params:{ cardId } } work the same way.
  return removeUndefinedDeep({
    ...params,
    ...raw,
    type: validType(raw?.type) ? raw.type : "UNKNOWN",
    playerSlot: raw?.playerSlot || raw?.playerId || params.playerSlot || params.playerId || "p1",
    playerId: raw?.playerId || raw?.playerSlot || params.playerId || params.playerSlot || "p1",
    params,
  });
}

function validType(type) {
  return Boolean(type && typeof type === "string" && type !== "UNKNOWN");
}

export function cloneState(state) {
  if (typeof structuredClone === "function") return structuredClone(state);
  return JSON.parse(JSON.stringify(state));
}

export function removeUndefinedDeep(value) {
  if (value === undefined) return null;
  if (value === null) return null;
  if (Array.isArray(value)) {
    return value.map((item) => (item === undefined ? null : removeUndefinedDeep(item)));
  }
  if (typeof value === "object") {
    const result = {};
    for (const [key, child] of Object.entries(value)) {
      if (child !== undefined) {
        result[key] = removeUndefinedDeep(child);
      }
    }
    return result;
  }
  return value;
}

export function actorLabel(actor) {
  if (!actor || actor === "System") return "System";
  if (actor === "p1") return "p1";
  if (actor === "p2") return "p2";
  return String(actor);
}
