// src/games/pokemon-only-one/rules.js

import { GameController } from "./controller/gameController.js";

const controller = new GameController();

export function createInitialState(options = {}) {
  return controller.createInitialModel(options);
}

export function submitAction(stateOrEnvelope, arg1, arg2, arg3) {
  // GameLoader calls game rules with one envelope object:
  //   rules.submitAction({ state: room.gameState, playerSlot, action })
  // This is the actual room/game boundary contract.
  if (isSubmitEnvelope(stateOrEnvelope)) {
    const model = unwrapModel(stateOrEnvelope.state) || controller.createInitialModel();
    const submitted = readSubmittedAction(
      stateOrEnvelope.action,
      undefined,
      undefined,
      {
        selectedShape: "GameLoader envelope: submitAction({ state, playerSlot, action })",
        playerSlot: stateOrEnvelope.playerSlot,
      }
    );

    if (submitted.bridgeError) {
      return controller.handleBridgeError(model, submitted.debug);
    }

    return controller.handleAction(model, submitted.action, submitted.debug);
  }

  // Backward-compatible direct call shapes, useful for tests and older shells.
  const model = unwrapModel(stateOrEnvelope) || controller.createInitialModel();
  const submitted = readSubmittedAction(arg1, arg2, arg3);

  if (submitted.bridgeError) {
    return controller.handleBridgeError(model, submitted.debug);
  }

  return controller.handleAction(model, submitted.action, submitted.debug);
}

function readSubmittedAction(arg1, arg2, arg3, boundaryDebug = {}) {
  const debug = {
    argumentCountAfterState: countPresentArguments(arg1, arg2, arg3),
    arg1: describeArg(arg1),
    arg2: describeArg(arg2),
    arg3: describeArg(arg3),
    ...boundaryDebug,
  };

  // Preferred explicit contract from the room shell into this game:
  // submitAction(state, actionObject)
  if (isAction(arg1)) {
    const action = flattenAction(arg1);
    if (!action.playerSlot && debug.playerSlot) {
      action.playerSlot = debug.playerSlot;
    }
    return {
      action,
      debug: { ...debug, selectedShape: debug.selectedShape || "submitAction(state, action)" },
    };
  }

  // Backward-compatible shapes are kept here only so rules.js can describe what arrived.
  // They are not used by the view. The view now expects props.onAction(action).
  if (typeof arg1 === "string" && isAction(arg2)) {
    return {
      action: flattenAction({ ...arg2, playerSlot: looksLikePlayerSlot(arg1) ? arg1 : arg2.playerSlot }),
      debug: { ...debug, selectedShape: "submitAction(state, string, action)" },
    };
  }

  if (typeof arg1 === "string" && typeof arg2 === "string") {
    return {
      action: flattenAction({ type: arg2, playerSlot: arg1, ...(isPlainObject(arg3) ? arg3 : {}) }),
      debug: { ...debug, selectedShape: "submitAction(state, playerSlot, type, payload)" },
    };
  }

  if (typeof arg1 === "string") {
    return {
      action: flattenAction({ type: arg1, ...(isPlainObject(arg2) ? arg2 : {}) }),
      debug: { ...debug, selectedShape: "submitAction(state, type, payload)" },
    };
  }

  if (isAction(arg2)) {
    return { action: flattenAction(arg2), debug: { ...debug, selectedShape: "submitAction(state, ?, action)" } };
  }

  return {
    bridgeError: true,
    debug: {
      ...debug,
      selectedShape: "missing-action",
      message:
        "rules.submitAction was called without an action object. The game view/room shell action bridge is not wired to pass actions into rules.js.",
      expected: "submitAction(state, actionObject)",
    },
  };
}

function isSubmitEnvelope(value) {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.prototype.hasOwnProperty.call(value, "state") &&
      Object.prototype.hasOwnProperty.call(value, "action")
  );
}

function flattenAction(action) {
  const payload = isPlainObject(action.payload) ? action.payload : {};
  const params = isPlainObject(action.params) ? action.params : {};
  const nestedAction = isPlainObject(action.action) ? action.action : {};

  return {
    ...payload,
    ...params,
    ...nestedAction,
    ...action,
    type: action.type || payload.type || params.type || nestedAction.type || "UNKNOWN",
  };
}

function isAction(value) {
  return isPlainObject(value) && typeof value.type === "string";
}

function looksLikePlayerSlot(value) {
  return /^p\d+$/i.test(value) || value === "player1" || value === "player2";
}

function unwrapModel(value) {
  const candidates = [
    value,
    value?.gameState,
    value?.state,
    value?.game?.state,
    value?.room?.gameState,
    value?.room?.state,
  ];

  return candidates.find(isPokemonModel) || null;
}

function isPokemonModel(value) {
  return Boolean(value && value.gameId === "pokemon-only-one" && value.area !== undefined && value.spaces && value.cards && value.display && Array.isArray(value.log));
}

function countPresentArguments(...values) {
  return values.filter((value) => value !== undefined).length;
}

function describeArg(value) {
  if (value === undefined) return "undefined";
  if (value === null) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return `[array:${value.length}]`;
  if (typeof value === "object") {
    return {
      keys: Object.keys(value),
      type: value.type,
      cardId: value.cardId,
      playerSlot: value.playerSlot,
    };
  }
  return typeof value;
}

function isPlainObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export default {
  createInitialState,
  submitAction,
};
