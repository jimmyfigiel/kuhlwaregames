// src/games/skyteam/rules.js

import { SCENARIO_MAP, SCENARIOS } from "./scenarios.js";

const GAME_ID = "skyteam";
const ROLES = ["pilot", "copilot"];
const ROLE_COLORS = { pilot: "blue", copilot: "orange" };
const ALTITUDES = [6000, 5000, 4000, 3000, 2000, 1000, 0];
const STARTERS_BY_ALTITUDE_INDEX = ["pilot", "copilot", "pilot", "copilot", "pilot", "copilot", "pilot"];
const REROLL_ALTITUDE_INDEXES = new Set([0, 4]);
const SAFE_AXIS_LIMIT = 2;

const DEFAULT_SCENARIO_ID = "yul-a";

const GEAR_SPACES = [
  { id: "gear-1", label: "1/2", allowed: [1, 2] },
  { id: "gear-2", label: "3/4", allowed: [3, 4] },
  { id: "gear-3", label: "5/6", allowed: [5, 6] },
];
const FLAP_SPACES = [
  { id: "flap-1", label: "1/2", allowed: [1, 2] },
  { id: "flap-2", label: "2/3", allowed: [2, 3] },
  { id: "flap-3", label: "4/5", allowed: [4, 5] },
  { id: "flap-4", label: "5/6", allowed: [5, 6] },
];
const BRAKE_SPACES = [
  { id: "brake-1", label: "2", allowed: [2] },
  { id: "brake-2", label: "4", allowed: [4] },
  { id: "brake-3", label: "6", allowed: [6] },
];
const BRAKE_THRESHOLDS = [1.5, 2.5, 4.5, 6.5];

export function createInitialState(options = {}) {
  const optionMode = options?.options?.mode || options?.mode || "twoPlayer";
  const mode = optionMode === "solo" || optionMode === "onePlayerTest" ? optionMode : "twoPlayer";
  const scenarioId = options?.scenarioId || DEFAULT_SCENARIO_ID;
  const scenario = SCENARIO_MAP[scenarioId] || SCENARIO_MAP[DEFAULT_SCENARIO_ID];
  const now = Date.now();
  const state = {
    gameId: GAME_ID,
    version: 2,
    scenarioId: scenario.id,
    scenarioName: `${scenario.code} ${scenario.airport}`,
    mode,
    phase: "setup",
    status: "setup",
    round: 0,
    altitudeIndex: 0,
    currentAltitude: ALTITUDES[0],
    activeRole: null,
    turnNumber: 0,
    briefingChat: [],
    solo: createEmptySoloState(),
    roles: {
      pilot: createRoleState("pilot"),
      copilot: createRoleState("copilot"),
    },
    cockpit: createEmptyCockpit(),
    approach: {
      currentIndex: 0,
      spaces: scenario.spaces.map((space) => ({ ...space })),
      lastAdvance: 0,
      pendingAdvance: 0,
    },
    markers: {
      blueAerodynamics: 4.5,
      orangeAerodynamics: 8.5,
      brakeIndex: 0,
      brakeThreshold: BRAKE_THRESHOLDS[0],
    },
    switches: {
      landingGear: GEAR_SPACES.map((space) => ({ ...space, deployed: false })),
      flaps: FLAP_SPACES.map((space) => ({ ...space, deployed: false })),
      brakes: BRAKE_SPACES.map((space) => ({ ...space, deployed: false })),
    },
    tokens: {
      coffee: 0,
      rerolls: 0,
    },
    lossReason: null,
    winReason: null,
    message: "Choose a scenario and game mode, then claim your seat.",
    commandLog: [createLogEntry("SYSTEM", `Sky Team loaded. ${scenario.code} ${scenario.airport} (${scenario.difficulty}, side ${scenario.side}).`, now)],
    ruleChecks: [],
    lastAction: null,
    lastSpeed: null,
    lastEngineMode: null,
  };
  return state;
}

function createRoleState(role) {
  return {
    role,
    label: role === "pilot" ? "Pilot" : "Co-Pilot",
    color: ROLE_COLORS[role],
    playerId: null,
    playerName: null,
    dice: [],
    placedThisRound: 0,
    rolledThisRound: false,
  };
}

function createEmptyCockpit() {
  return {
    axis: { pilot: null, copilot: null, position: 0, resolvedThisRound: false },
    engines: { pilot: null, copilot: null, speed: null, resolvedThisRound: false },
    radio: { pilot: [], copilotA: [], copilotB: [] },
    concentration: [null, null, null],
  };
}

function createEmptySoloState() {
  return {
    starterRole: null,
    responseRole: null,
    responseDiceRolled: 0,
  };
}

export function submitAction(input, directArg1, directArg2) {
  const envelope = isEnvelope(input) ? input : { state: input, playerSlot: null, action: directArg1 || directArg2 };
  const state = clone(envelope.state || createInitialState());
  const action = flattenAction(envelope.action || {});
  const actor = {
    playerSlot: envelope.playerSlot || action.playerSlot || null,
    playerId: action.playerId || null,
    playerName: action.playerName || null,
  };

  if (!action.type) {
    return addWarning(state, "Unknown action ignored.");
  }

  if (state.phase === "won" || state.phase === "lost") {
    if (action.type === "RESET_GAME") return createInitialState({ mode: state.mode, scenarioId: state.scenarioId });
    return addWarning(state, "The game is over. Reset to play again.");
  }

  try {
    switch (action.type) {
      case "SET_SCENARIO":
        return setScenario(state, action.scenarioId);
      case "SET_MODE":
        return setMode(state, action.mode, actor);
      case "CLAIM_ROLE":
        return claimRole(state, action.role, actor);
      case "RELEASE_ROLE":
        return releaseRole(state, action.role, actor);
      case "START_GAME":
        return startGame(state, actor);
      case "START_ROUND_ROLL":
        return startRoundRoll(state, actor);
      case "ROLL_ROLE_DICE":
        return rollRoleDice(state, action, actor);
      case "ADD_BRIEFING_CHAT":
        return addBriefingChat(state, action, actor);
      case "PLACE_DIE":
        return placeDie(state, action, actor);
      case "SPEND_COFFEE":
        return spendCoffeePreview(state, action, actor);
      case "REROLL_DICE":
        return rerollDice(state, action, actor);
      case "END_ROUND":
        return endRound(state, actor);
      case "RESET_GAME":
        return createInitialState({ mode: state.mode });
      default:
        return addWarning(state, `Unknown Sky Team action: ${action.type}`);
    }
  } catch (error) {
    return addWarning(state, error.message || String(error));
  }
}

function setScenario(state, scenarioId) {
  if (state.phase !== "setup") return addWarning(state, "Scenario can only be changed before the game starts.");
  const scenario = SCENARIO_MAP[scenarioId];
  if (!scenario) return addWarning(state, `Unknown scenario: ${scenarioId}`);
  state.scenarioId = scenario.id;
  state.scenarioName = `${scenario.code} ${scenario.airport}`;
  state.approach.spaces = scenario.spaces.map((space) => ({ ...space }));
  state.approach.currentIndex = 0;
  state.message = `Scenario: ${scenario.code} ${scenario.airport} · ${scenario.difficulty} · Side ${scenario.side}`;
  return log(state, "SET_SCENARIO", state.message);
}

function setMode(state, mode, actor) {
  if (state.phase !== "setup") return addWarning(state, "Mode can only be changed before the game starts.");
  const cleanMode = mode === "solo" || mode === "onePlayerTest" ? mode : "twoPlayer";
  state.mode = cleanMode;
  if ((cleanMode === "solo" || cleanMode === "onePlayerTest") && actor.playerId) {
    for (const role of ROLES) {
      state.roles[role].playerId = actor.playerId;
      state.roles[role].playerName = actor.playerName || (cleanMode === "solo" ? "Solo Pilot" : "Solo Tester");
    }
  }
  if (cleanMode === "solo") state.message = "Solo mode enabled. Roll only the starting color, then alternate with one die at a time from the other color.";
  else if (cleanMode === "onePlayerTest") state.message = "One-player test mode enabled. You control both Pilot and Co-Pilot with normal two-player dice rolling.";
  else state.message = "Two-player mode enabled. Each player should claim a role.";
  return log(state, "SET_MODE", state.message);
}

function claimRole(state, role, actor) {
  assertRole(role);
  if (state.phase !== "setup") return addWarning(state, "Roles can only be claimed before the game starts.");
  if (!actor.playerId) return addWarning(state, "Could not identify the player claiming the role.");

  if (state.mode === "solo" || state.mode === "onePlayerTest") {
    for (const eachRole of ROLES) {
      state.roles[eachRole].playerId = actor.playerId;
      state.roles[eachRole].playerName = actor.playerName || (state.mode === "solo" ? "Solo Pilot" : "Solo Tester");
    }
    state.message = state.mode === "solo" ? "Solo mode: you control both seats with the solo dice flow." : "One-player test mode: you control both seats.";
    return log(state, "CLAIM_ROLE", state.message);
  }

  const otherRole = role === "pilot" ? "copilot" : "pilot";
  if (state.roles[role].playerId && state.roles[role].playerId !== actor.playerId) {
    return addWarning(state, `${state.roles[role].label} is already claimed.`);
  }
  if (state.roles[otherRole].playerId === actor.playerId) {
    state.roles[otherRole].playerId = null;
    state.roles[otherRole].playerName = null;
  }
  state.roles[role].playerId = actor.playerId;
  state.roles[role].playerName = actor.playerName || actor.playerId;
  state.message = `${state.roles[role].label} claimed.`;
  return log(state, "CLAIM_ROLE", state.message);
}

function releaseRole(state, role, actor) {
  assertRole(role);
  if (state.phase !== "setup") return addWarning(state, "Roles can only be released before the game starts.");
  if (state.roles[role].playerId && state.roles[role].playerId !== actor.playerId) {
    return addWarning(state, `Only the current ${state.roles[role].label} can release that role.`);
  }
  state.roles[role].playerId = null;
  state.roles[role].playerName = null;
  state.message = `${state.roles[role].label} released.`;
  return log(state, "RELEASE_ROLE", state.message);
}

function startGame(state, actor) {
  if (state.phase !== "setup") return addWarning(state, "The approach has already started.");
  if ((state.mode === "solo" || state.mode === "onePlayerTest") && actor.playerId) {
    for (const role of ROLES) {
      state.roles[role].playerId = state.roles[role].playerId || actor.playerId;
      state.roles[role].playerName = state.roles[role].playerName || actor.playerName || (state.mode === "solo" ? "Solo Pilot" : "Solo Tester");
    }
  }
  if (state.mode === "twoPlayer" && (!state.roles.pilot.playerId || !state.roles.copilot.playerId)) {
    return addWarning(state, "Two-player mode needs both Pilot and Co-Pilot claimed before starting.");
  }
  state.round = 1;
  state.altitudeIndex = 0;
  state.currentAltitude = ALTITUDES[0];
  state.phase = "briefing";
  state.status = "playing";
  state.activeRole = STARTERS_BY_ALTITUDE_INDEX[0];
  state.turnNumber = 0;
  state.briefingChat = [];
  state.solo = createEmptySoloState();
  state.message = state.mode === "solo"
    ? "Round 1 briefing. Solo mode: roll only the starting color shown by the altitude arrow."
    : "Round 1 briefing. Discuss your plan in chat, then each player rolls their own dice.";
  log(state, "START_GAME", state.message);
  rollTrafficDice(state);
  return state;
}

function startRoundRoll(state, actor) {
  if (state.phase !== "briefing" && state.phase !== "rolling") return addWarning(state, "Dice can only be rolled from the briefing phase.");
  if (state.mode === "solo") {
    const starter = STARTERS_BY_ALTITUDE_INDEX[state.altitudeIndex] || "pilot";
    return startSoloRoundRoll(state, starter, actor);
  }
  if (state.mode !== "onePlayerTest") return addWarning(state, "In two-player mode, each player must roll their own dice.");
  beginRollingIfNeeded(state);
  for (const role of ROLES) {
    rollRoleNow(state, role);
  }
  return finishRollingIfReady(state, "Both seats rolled dice. Silent placement begins.");
}

function rollRoleDice(state, action, actor) {
  if (state.phase !== "briefing" && state.phase !== "rolling") return addWarning(state, "Dice can only be rolled after the briefing starts.");
  const role = action.role;
  assertRole(role);
  assertCanActAsRole(state, role, actor);
  if (state.mode === "solo") return startSoloRoundRoll(state, role, actor);
  if (state.roles[role].rolledThisRound || state.roles[role].dice.length > 0) return addWarning(state, `${roleLabel(role)} has already rolled this round.`);
  beginRollingIfNeeded(state);
  rollRoleNow(state, role);
  const waiting = ROLES.filter((eachRole) => !state.roles[eachRole].rolledThisRound).map(roleLabel);
  if (waiting.length > 0) {
    state.phase = "rolling";
    state.activeRole = null;
    state.message = `${roleLabel(role)} rolled. Waiting for ${waiting.join(" and ")} to roll.`;
    return log(state, "ROLL_DICE", state.message);
  }
  return finishRollingIfReady(state, `${roleLabel(role)} rolled. Both crews are ready.`);
}

function startSoloRoundRoll(state, role, actor) {
  if (state.mode !== "solo") return addWarning(state, "Solo rolling is only available in solo mode.");
  assertRole(role);
  assertCanActAsRole(state, role, actor);
  const starter = STARTERS_BY_ALTITUDE_INDEX[state.altitudeIndex] || "pilot";
  if (role !== starter) return addWarning(state, `Solo mode starts this round with ${roleLabel(starter)} dice.`);
  if (state.roles[role].rolledThisRound || state.roles[role].dice.length > 0) return addWarning(state, `${roleLabel(role)} has already rolled this round.`);

  beginRollingIfNeeded(state);
  rollRoleNow(state, starter);
  const responseRole = otherRole(starter);
  state.roles[responseRole].dice = [];
  state.roles[responseRole].placedThisRound = 0;
  state.roles[responseRole].rolledThisRound = false;
  state.solo = { starterRole: starter, responseRole, responseDiceRolled: 0 };
  state.phase = "placement";
  state.activeRole = starter;
  state.turnNumber = 0;
  const rerollText = REROLL_ALTITUDE_INDEXES.has(state.altitudeIndex) ? " Reroll token collected." : "";
  state.message = `Solo mode: ${roleLabel(starter)} rolled 4 dice and places first. After each ${roleLabel(starter)} die, one ${roleLabel(responseRole)} die is rolled and placed.${rerollText}`;
  return log(state, "START_SOLO_PLACEMENT", state.message);
}

function beginRollingIfNeeded(state) {
  if (REROLL_ALTITUDE_INDEXES.has(state.altitudeIndex) && !state.altitudeRerollCollected) {
    state.tokens.rerolls += 1;
    state.altitudeRerollCollected = true;
  }
  if (state.phase === "briefing") {
    clearRoundPlacements(state);
    state.turnNumber = 0;
    for (const role of ROLES) {
      state.roles[role].dice = [];
      state.roles[role].placedThisRound = 0;
      state.roles[role].rolledThisRound = false;
    }
  }
  state.phase = "rolling";
}

function rollRoleNow(state, role) {
  state.roles[role].dice = rollDiceForRole(role);
  state.roles[role].placedThisRound = 0;
  state.roles[role].rolledThisRound = true;
}

function finishRollingIfReady(state, prefix) {
  if (!ROLES.every((role) => state.roles[role].rolledThisRound)) return state;
  state.phase = "placement";
  state.activeRole = STARTERS_BY_ALTITUDE_INDEX[state.altitudeIndex] || "pilot";
  state.turnNumber = 0;
  const rerollText = REROLL_ALTITUDE_INDEXES.has(state.altitudeIndex) ? " Reroll token collected." : "";
  state.message = `${prefix} ${roleLabel(state.activeRole)} places first.${rerollText}`;
  return log(state, "START_PLACEMENT", state.message);
}

function addBriefingChat(state, action, actor) {
  if (state.phase !== "briefing") return addWarning(state, "Briefing chat is only open before dice are rolled.");
  const text = String(action.text || "").trim();
  if (!text) return addWarning(state, "Chat message cannot be empty.");
  if (text.length > 400) return addWarning(state, "Briefing chat messages must be 400 characters or fewer.");
  state.briefingChat = state.briefingChat || [];
  state.briefingChat.push({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    at: Date.now(),
    playerId: actor.playerId || null,
    playerName: actor.playerName || "Player",
    text,
  });
  state.briefingChat = state.briefingChat.slice(-80);
  state.message = `${actor.playerName || "Player"} added a briefing message.`;
  return log(state, "BRIEFING_CHAT", state.message);
}

function placeDie(state, action, actor) {
  if (state.phase !== "placement") return addWarning(state, "Dice can only be placed during the placement phase.");
  const role = action.role;
  assertRole(role);
  assertCanActAsRole(state, role, actor);
  if (role !== state.activeRole) return addWarning(state, `It is ${roleLabel(state.activeRole)}'s turn.`);

  const dieId = action.dieId;
  const targetId = action.targetId;
  const coffeeDelta = Number(action.coffeeDelta || 0);
  const roleState = state.roles[role];
  const die = roleState.dice.find((candidate) => candidate.id === dieId);
  if (!die) return addWarning(state, "That die was not found.");
  if (die.placed) return addWarning(state, "That die has already been placed.");
  if (coffeeDelta !== 0 && Math.abs(coffeeDelta) > state.tokens.coffee) return addWarning(state, "Not enough Coffee tokens for that modifier.");

  const modifiedValue = die.value + coffeeDelta;
  if (modifiedValue < 1 || modifiedValue > 6) return addWarning(state, "Coffee can only modify a die to a value from 1 to 6.");

  const placement = validateTarget(state, role, targetId, modifiedValue);
  if (!placement.ok) return addWarning(state, placement.message);

  const tokensSpent = Math.abs(coffeeDelta);
  state.tokens.coffee -= tokensSpent;
  // Clear one concentration slot per token spent (LIFO — last filled first)
  if (tokensSpent > 0) {
    let remaining = tokensSpent;
    for (let i = state.cockpit.concentration.length - 1; i >= 0 && remaining > 0; i--) {
      if (state.cockpit.concentration[i]) {
        state.cockpit.concentration[i] = null;
        remaining--;
      }
    }
  }
  die.placed = true;
  die.targetId = targetId;
  die.originalValue = die.value;
  die.value = modifiedValue;
  die.coffeeDelta = coffeeDelta;
  roleState.placedThisRound += 1;

  applyPlacement(state, role, targetId, die);
  state.turnNumber += 1;

  if (state.phase === "lost") return state;
  if (allDicePlaced(state)) {
    state.activeRole = null;
    state.phase = "endRound";
    state.message = "All dice placed. Resolve end of round.";
    return log(state, "ROUND_FULL", state.message);
  }

  if (state.mode === "solo") {
    advanceSoloAfterPlacement(state, role);
    state.message = `${roleLabel(role)} placed ${die.value} on ${placement.label}. ${roleLabel(state.activeRole)} is next.`;
    return log(state, "PLACE_DIE", state.message);
  }

  state.activeRole = otherRole(role);
  state.message = `${roleLabel(role)} placed ${die.value} on ${placement.label}. ${roleLabel(state.activeRole)} is next.`;
  return log(state, "PLACE_DIE", state.message);
}

function advanceSoloAfterPlacement(state, role) {
  const starter = state.solo?.starterRole || STARTERS_BY_ALTITUDE_INDEX[state.altitudeIndex] || "pilot";
  const responseRole = state.solo?.responseRole || otherRole(starter);

  if (role === starter) {
    const nextIndex = Number(state.solo?.responseDiceRolled || 0) + 1;
    const newDie = rollOneDieForRole(responseRole, nextIndex);
    state.roles[responseRole].dice.push(newDie);
    state.roles[responseRole].rolledThisRound = state.roles[responseRole].dice.length >= 4;
    state.solo.responseDiceRolled = nextIndex;
    state.activeRole = responseRole;
    state.message = `Solo mode: rolled one ${roleLabel(responseRole)} die. Place it now.`;
    return;
  }

  const starterHasUnplacedDice = state.roles[starter].dice.some((die) => !die.placed);
  if (starterHasUnplacedDice) {
    state.activeRole = starter;
    return;
  }

  state.activeRole = responseRole;
}

function validateTarget(state, role, targetId, value) {
  if (targetId === `axis-${role}`) return state.cockpit.axis[role] ? invalid("That Axis space is already filled.") : valid("Axis");
  if (targetId === `engine-${role}`) return state.cockpit.engines[role] ? invalid("That Engine space is already filled.") : valid("Engines");

  if (targetId === "radio-pilot") {
    if (role !== "pilot") return invalid("Only the Pilot can use the blue Radio space.");
    if (state.cockpit.radio.pilot.length >= 1) return invalid("The Pilot Radio space is already filled this round.");
    return valid("Radio");
  }
  if (targetId === "radio-copilot-a" || targetId === "radio-copilot-b") {
    if (role !== "copilot") return invalid("Only the Co-Pilot can use orange Radio spaces.");
    const key = targetId === "radio-copilot-a" ? "copilotA" : "copilotB";
    if (state.cockpit.radio[key].length >= 1) return invalid("That Co-Pilot Radio space is already filled this round.");
    return valid("Radio");
  }

  const gearIndex = GEAR_SPACES.findIndex((space) => space.id === targetId);
  if (gearIndex >= 0) {
    if (role !== "pilot") return invalid("Only the Pilot can deploy Landing Gear.");
    const gear = state.switches.landingGear[gearIndex];
    if (gear.deployed) return invalid("That Landing Gear switch is already green.");
    if (!gear.allowed.includes(value)) return invalid(`Landing Gear ${gear.label} needs ${gear.label}.`);
    return valid(`Landing Gear ${gear.label}`);
  }

  const flapIndex = FLAP_SPACES.findIndex((space) => space.id === targetId);
  if (flapIndex >= 0) {
    if (role !== "copilot") return invalid("Only the Co-Pilot can deploy Flaps.");
    const flap = state.switches.flaps[flapIndex];
    if (flap.deployed) return invalid("That Flaps switch is already green.");
    const firstUndeployed = state.switches.flaps.findIndex((item) => !item.deployed);
    if (flapIndex !== firstUndeployed) return invalid("Flaps must be deployed in order from top to bottom.");
    if (!flap.allowed.includes(value)) return invalid(`Flap ${flap.label} needs ${flap.label}.`);
    return valid(`Flaps ${flap.label}`);
  }

  const brakeIndex = BRAKE_SPACES.findIndex((space) => space.id === targetId);
  if (brakeIndex >= 0) {
    if (role !== "pilot") return invalid("Only the Pilot can deploy Brakes.");
    const brake = state.switches.brakes[brakeIndex];
    if (brake.deployed) return invalid("That Brake switch is already green.");
    const firstUndeployed = state.switches.brakes.findIndex((item) => !item.deployed);
    if (brakeIndex !== firstUndeployed) return invalid("Brakes must be deployed in order: 2, then 4, then 6.");
    if (!brake.allowed.includes(value)) return invalid(`Brake ${brake.label} needs a ${brake.label}.`);
    return valid(`Brakes ${brake.label}`);
  }

  const concentrationMatch = String(targetId).match(/^concentration-(\d)$/);
  if (concentrationMatch) {
    const index = Number(concentrationMatch[1]);
    if (index < 0 || index > 2) return invalid("Unknown Concentration space.");
    if (state.cockpit.concentration[index]) return invalid("That Concentration space is already filled this round.");
    return valid("Concentration");
  }

  return invalid("Unknown target space.");
}

function applyPlacement(state, role, targetId, die) {
  const placed = { role, dieId: die.id, value: die.value, originalValue: die.originalValue, coffeeDelta: die.coffeeDelta || 0, targetId };
  if (targetId === `axis-${role}`) {
    state.cockpit.axis[role] = placed;
    if (state.cockpit.axis.pilot && state.cockpit.axis.copilot) resolveAxis(state);
    return;
  }
  if (targetId === `engine-${role}`) {
    state.cockpit.engines[role] = placed;
    if (state.cockpit.engines.pilot && state.cockpit.engines.copilot) resolveEngines(state);
    return;
  }
  if (targetId === "radio-pilot") {
    state.cockpit.radio.pilot = [placed];
    resolveRadio(state, die.value);
    return;
  }
  if (targetId === "radio-copilot-a") {
    state.cockpit.radio.copilotA = [placed];
    resolveRadio(state, die.value);
    return;
  }
  if (targetId === "radio-copilot-b") {
    state.cockpit.radio.copilotB = [placed];
    resolveRadio(state, die.value);
    return;
  }
  const gearIndex = GEAR_SPACES.findIndex((space) => space.id === targetId);
  if (gearIndex >= 0) {
    state.switches.landingGear[gearIndex].deployed = true;
    state.switches.landingGear[gearIndex].die = placed;
    state.markers.blueAerodynamics += 1;
    return;
  }
  const flapIndex = FLAP_SPACES.findIndex((space) => space.id === targetId);
  if (flapIndex >= 0) {
    state.switches.flaps[flapIndex].deployed = true;
    state.switches.flaps[flapIndex].die = placed;
    state.markers.orangeAerodynamics += 1;
    return;
  }
  const brakeIndex = BRAKE_SPACES.findIndex((space) => space.id === targetId);
  if (brakeIndex >= 0) {
    state.switches.brakes[brakeIndex].deployed = true;
    state.switches.brakes[brakeIndex].die = placed;
    state.markers.brakeIndex = Math.min(3, state.markers.brakeIndex + 1);
    state.markers.brakeThreshold = BRAKE_THRESHOLDS[state.markers.brakeIndex];
    return;
  }
  const concentrationMatch = String(targetId).match(/^concentration-(\d)$/);
  if (concentrationMatch) {
    const index = Number(concentrationMatch[1]);
    state.cockpit.concentration[index] = placed;
    state.tokens.coffee = Math.min(3, state.tokens.coffee + 1);
  }
}

function resolveAxis(state) {
  const pilotValue = state.cockpit.axis.pilot.value;
  const copilotValue = state.cockpit.axis.copilot.value;
  const difference = Math.abs(pilotValue - copilotValue);
  if (difference > 0) {
    state.cockpit.axis.position += pilotValue > copilotValue ? -difference : difference;
  }
  state.cockpit.axis.resolvedThisRound = true;
  if (Math.abs(state.cockpit.axis.position) > SAFE_AXIS_LIMIT) {
    lose(state, "The plane went into a spin because the Axis reached the red X.");
  }
}

function resolveEngines(state) {
  const speed = state.cockpit.engines.pilot.value + state.cockpit.engines.copilot.value;
  state.cockpit.engines.speed = speed;
  state.cockpit.engines.resolvedThisRound = true;
  state.lastSpeed = speed;

  if (isFinalRound(state)) {
    state.lastEngineMode = "brakes";
    if (!(speed < state.markers.brakeThreshold)) {
      lose(state, `Final speed ${speed} was not less than the Brake marker ${state.markers.brakeThreshold}.`);
    }
    return;
  }

  state.lastEngineMode = "aerodynamics";
  let advance = 1;
  if (speed < state.markers.blueAerodynamics) advance = 0;
  if (speed > state.markers.orangeAerodynamics) advance = 2;
  state.approach.lastAdvance = advance;
  state.approach.pendingAdvance = advance;
}

function advanceApproach(state, advance) {
  state.approach.lastAdvance = advance;
  state.approach.pendingAdvance = 0;
  if (advance <= 0) return;
  const currentSpace = state.approach.spaces[state.approach.currentIndex];
  if (currentSpace?.kind === "airport") {
    lose(state, "The plane overshot the airport.");
    return;
  }
  if (currentSpace?.traffic > 0) {
    lose(state, "Collision! Air traffic was still in the Current Position when the plane advanced.");
    return;
  }
  // Check axis paths for every space flown through (current + intermediate if advance=2).
  const axisPos = state.cockpit.axis.position;
  for (let i = 0; i < advance; i++) {
    const spaceIdx = state.approach.currentIndex + i;
    if (spaceIdx >= state.approach.spaces.length) break;
    const space = state.approach.spaces[spaceIdx];
    if (!axisPathPassed(space.axisPaths, axisPos)) {
      const posLabel = axisPos === 0 ? "Level" : axisPos < 0 ? `Pilot ${Math.abs(axisPos)}` : `Co-Pilot ${axisPos}`;
      lose(state, `Axis violation on space ${space.label}: the ${posLabel} path is marked X. Adjust axis before advancing.`);
      return;
    }
  }
  const destinationIndex = Math.min(state.approach.currentIndex + advance, state.approach.spaces.length - 1);
  state.approach.currentIndex = destinationIndex;
}

// axisPaths is a 5-element boolean array indexed by axis position offset:
// index 0→pos -2, 1→-1, 2→0, 3→+1, 4→+2
function axisPathPassed(axisPaths, position) {
  if (!axisPaths) return true;
  const idx = position + 2; // shift -2..+2 → 0..4
  if (idx < 0 || idx >= axisPaths.length) return true;
  return axisPaths[idx] !== false;
}

function resolveRadio(state, value) {
  const targetIndex = state.approach.currentIndex + value - 1;
  const target = state.approach.spaces[targetIndex];
  if (target && target.traffic > 0) target.traffic -= 1;
}

function rerollDice(state, action, actor) {
  if (state.phase !== "placement") return addWarning(state, "Rerolls are only available during dice placement.");
  if (state.tokens.rerolls <= 0) return addWarning(state, "No Reroll tokens are available.");
  const role = action.role;
  assertRole(role);
  assertCanActAsRole(state, role, actor);
  const dieIds = Array.isArray(action.dieIds) ? action.dieIds : [];
  if (dieIds.length === 0) return addWarning(state, "Choose at least one unplaced die to reroll.");
  const roleDice = state.roles[role].dice;
  const diceToReroll = roleDice.filter((die) => dieIds.includes(die.id));
  if (diceToReroll.length !== dieIds.length) return addWarning(state, "One or more selected dice were not found.");
  if (diceToReroll.some((die) => die.placed)) return addWarning(state, "Placed dice cannot be rerolled.");
  for (const die of diceToReroll) die.value = randomDieValue();
  state.tokens.rerolls -= 1;
  state.message = `${roleLabel(role)} rerolled ${diceToReroll.length} dice.`;
  return log(state, "REROLL", state.message);
}

function spendCoffeePreview(state) {
  return addWarning(state, "Use the +/- Coffee controls on a die placement. Coffee is spent when the die is placed.");
}

function endRound(state) {
  if (state.phase !== "endRound") return addWarning(state, "You can only end the round after all dice have been placed.");
  if (!state.cockpit.axis.pilot || !state.cockpit.axis.copilot) {
    return lose(log(state, "MANDATORY_FAIL", "Missing Axis dice."), "A mandatory Axis space was empty at the end of the round.");
  }
  if (!state.cockpit.engines.pilot || !state.cockpit.engines.copilot) {
    return lose(log(state, "MANDATORY_FAIL", "Missing Engine dice."), "A mandatory Engine space was empty at the end of the round.");
  }

  if (isFinalRound(state)) return checkFinalLanding(state);

  const pendingAdvance = Number(state.approach.pendingAdvance || 0);
  advanceApproach(state, pendingAdvance);
  if (state.phase === "lost") return state;

  state.altitudeIndex += 1;
  state.currentAltitude = ALTITUDES[state.altitudeIndex] ?? 0;
  state.altitudeRerollCollected = false;
  clearRoundPlacements(state);
  for (const role of ROLES) {
    state.roles[role].dice = [];
    state.roles[role].placedThisRound = 0;
    state.roles[role].rolledThisRound = false;
  }

  if (state.currentAltitude === 0 && !isAtAirport(state)) {
    return lose(state, "The plane reached landing altitude before reaching the airport.");
  }

  state.round += 1;
  state.phase = "briefing";
  state.activeRole = STARTERS_BY_ALTITUDE_INDEX[state.altitudeIndex] || "pilot";
  state.message = isFinalRound(state)
    ? "Final round begins. You are at the airport and touching down. Engines are now checked against Brakes."
    : `Round ${state.round} briefing at ${state.currentAltitude} feet.`;
  log(state, "END_ROUND", state.message);
  rollTrafficDice(state);
  return state;
}

// Rolls the traffic die for the current space at the start of a round.
// Called automatically after startGame and endRound.
function rollTrafficDice(state) {
  const idx = state.approach.currentIndex;
  const currentSpace = state.approach.spaces[idx];
  const dieCount = currentSpace?.trafficDie || 0;
  if (dieCount === 0) return;

  const lastIdx = state.approach.spaces.length - 1;
  const rolls = [];
  for (let i = 0; i < dieCount; i++) {
    const roll = Math.floor(Math.random() * 6) + 1;
    const targetIdx = Math.min(idx + roll - 1, lastIdx);
    state.approach.spaces[targetIdx].traffic += 1;
    rolls.push(roll);
  }

  const desc = rolls.map((r, i) => {
    const tIdx = Math.min(idx + r - 1, lastIdx);
    const label = state.approach.spaces[tIdx].label;
    return `${r} → ${label}`;
  }).join(", ");
  state.message = `Traffic die rolled (${dieCount}×): ${desc}. Extra traffic added.`;
  log(state, "TRAFFIC_DIE_ROLLED", state.message);
}

function checkFinalLanding(state) {
  const failures = [];
  if (remainingTraffic(state) > 0) failures.push("air traffic remains on the Approach Track");
  if (!state.switches.flaps.every((item) => item.deployed)) failures.push("not all Flaps are deployed");
  if (!state.switches.landingGear.every((item) => item.deployed)) failures.push("not all Landing Gear is deployed");
  if (state.cockpit.axis.position !== 0) failures.push("the Axis is not horizontal");
  if (!(state.lastSpeed < state.markers.brakeThreshold)) failures.push("speed is not less than the Brake marker");

  if (failures.length > 0) return lose(state, `Landing failed: ${failures.join(", ")}.`);

  state.phase = "won";
  state.status = "won";
  state.winReason = "The passengers burst into applause. You landed smoothly.";
  state.message = "Congratulations! You landed smoothly.";
  return log(state, "WIN", state.message);
}

function clearRoundPlacements(state) {
  const axisPosition = state.cockpit?.axis?.position || 0;
  state.cockpit = createEmptyCockpit();
  state.cockpit.axis.position = axisPosition;
  state.solo = createEmptySoloState();
}

function allDicePlaced(state) {
  return ROLES.every((role) => state.roles[role].dice.length === 4 && state.roles[role].dice.every((die) => die.placed));
}

function isFinalRound(state) {
  return state.currentAltitude === 0 && isAtAirport(state);
}

function isAtAirport(state) {
  return state.approach.spaces[state.approach.currentIndex]?.kind === "airport";
}

function remainingTraffic(state) {
  return state.approach.spaces.reduce((total, space) => total + Number(space.traffic || 0), 0);
}

function rollDiceForRole(role) {
  return [0, 1, 2, 3].map((index) => createDie(role, index + 1));
}

function rollOneDieForRole(role, index) {
  return createDie(role, index);
}

function createDie(role, index) {
  return {
    id: `${role}-die-${index}`,
    role,
    value: randomDieValue(),
    placed: false,
    targetId: null,
    originalValue: null,
    coffeeDelta: 0,
  };
}

function randomDieValue() {
  return Math.floor(Math.random() * 6) + 1;
}

function lose(state, reason) {
  state.phase = "lost";
  state.status = "lost";
  state.lossReason = reason;
  state.message = reason;
  return log(state, "LOSS", reason);
}

function assertRole(role) {
  if (!ROLES.includes(role)) throw new Error("Unknown role.");
}

function assertCanActAsRole(state, role, actor) {
  if (state.mode === "solo" || state.mode === "onePlayerTest") return;
  const owner = state.roles[role]?.playerId;
  if (!owner) throw new Error(`${roleLabel(role)} has not been claimed.`);
  if (actor.playerId && owner !== actor.playerId) throw new Error(`Only the ${roleLabel(role)} can act for that role.`);
}

function otherRole(role) {
  return role === "pilot" ? "copilot" : "pilot";
}

function roleLabel(role) {
  return role === "pilot" ? "Pilot" : "Co-Pilot";
}

function valid(label) {
  return { ok: true, label };
}

function invalid(message) {
  return { ok: false, message };
}

function flattenAction(action) {
  const payload = isPlainObject(action.payload) ? action.payload : {};
  const params = isPlainObject(action.params) ? action.params : {};
  return { ...payload, ...params, ...action, type: action.type || payload.type || params.type || "" };
}

function isEnvelope(value) {
  return Boolean(value && typeof value === "object" && Object.prototype.hasOwnProperty.call(value, "state") && Object.prototype.hasOwnProperty.call(value, "action"));
}

function isPlainObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function addWarning(state, message) {
  state.message = message;
  state.commandLog = state.commandLog || [];
  state.commandLog.unshift(createLogEntry("WARNING", message));
  state.commandLog = state.commandLog.slice(0, 100);
  return state;
}

function log(state, type, message) {
  state.lastAction = { type, message, at: Date.now() };
  state.commandLog = state.commandLog || [];
  state.commandLog.unshift(createLogEntry(type, message));
  state.commandLog = state.commandLog.slice(0, 100);
  return state;
}

function createLogEntry(type, message, at = Date.now()) {
  return { id: `${at}-${Math.random().toString(16).slice(2)}`, at, type, message };
}

export const SKYTEAM_TESTING = {
  BASIC_MONTREAL_APPROACH,
  ALTITUDES,
  GEAR_SPACES,
  FLAP_SPACES,
  BRAKE_SPACES,
  BRAKE_THRESHOLDS,
  validateTarget,
  isFinalRound,
};

export default { createInitialState, submitAction };
