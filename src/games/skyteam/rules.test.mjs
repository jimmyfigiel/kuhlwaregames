// src/games/skyteam/rules.test.mjs
// Run from project root with: node src/games/skyteam/rules.test.mjs

import assert from "node:assert/strict";
import { createInitialState, submitAction } from "./rules.js";

function act(state, action, playerId = "solo") {
  return submitAction({ state, playerSlot: null, action: { ...action, playerId, playerName: playerId } });
}

function setupSolo() {
  let state = createInitialState({ mode: "onePlayerTest" });
  state = act(state, { type: "SET_MODE", mode: "onePlayerTest" });
  state = act(state, { type: "START_GAME" });
  state = act(state, { type: "START_ROUND_ROLL" });
  return state;
}

function setDice(state, pilotValues, copilotValues) {
  state.roles.pilot.dice.forEach((die, index) => {
    die.value = pilotValues[index];
  });
  state.roles.copilot.dice.forEach((die, index) => {
    die.value = copilotValues[index];
  });
  return state;
}

function place(state, role, dieIndex, targetId, coffeeDelta = 0) {
  return act(state, {
    type: "PLACE_DIE",
    role,
    dieId: `${role}-die-${dieIndex}`,
    targetId,
    coffeeDelta,
  });
}


let twoPlayer = createInitialState({ mode: "twoPlayer" });
twoPlayer = act(twoPlayer, { type: "CLAIM_ROLE", role: "pilot" }, "pilot-player");
twoPlayer = act(twoPlayer, { type: "CLAIM_ROLE", role: "copilot" }, "copilot-player");
twoPlayer = act(twoPlayer, { type: "START_GAME" }, "pilot-player");
assert.equal(twoPlayer.phase, "briefing");
twoPlayer = act(twoPlayer, { type: "ADD_BRIEFING_CHAT", text: "Clear close traffic and keep speed controlled." }, "pilot-player");
assert.equal(twoPlayer.briefingChat.length, 1);
twoPlayer = act(twoPlayer, { type: "ROLL_ROLE_DICE", role: "pilot" }, "pilot-player");
assert.equal(twoPlayer.phase, "rolling");
assert.equal(twoPlayer.roles.pilot.dice.length, 4);
assert.equal(twoPlayer.roles.copilot.dice.length, 0);
twoPlayer = act(twoPlayer, { type: "ADD_BRIEFING_CHAT", text: "This should be locked." }, "copilot-player");
assert.match(twoPlayer.message, /only open/i);
twoPlayer = act(twoPlayer, { type: "ROLL_ROLE_DICE", role: "copilot" }, "copilot-player");
assert.equal(twoPlayer.phase, "placement");
assert.equal(twoPlayer.roles.copilot.dice.length, 4);

let state = createInitialState();
assert.equal(state.phase, "setup");
state = act(state, { type: "SET_MODE", mode: "onePlayerTest" });
assert.equal(state.mode, "onePlayerTest");
state = act(state, { type: "START_GAME" });
assert.equal(state.phase, "briefing");
state = act(state, { type: "START_ROUND_ROLL" });
assert.equal(state.phase, "placement");
assert.equal(state.tokens.rerolls, 1);

state = setupSolo();
state = setDice(state, [6, 3, 3, 3], [1, 3, 3, 3]);
state = place(state, "pilot", 1, "axis-pilot");
state = place(state, "copilot", 1, "axis-copilot");
assert.equal(state.phase, "lost");
assert.match(state.lossReason, /spin/i);

state = setupSolo();
state = setDice(state, [3, 3, 3, 3], [3, 3, 3, 3]);
state = place(state, "pilot", 1, "axis-pilot");
state = place(state, "copilot", 1, "axis-copilot");
state = place(state, "pilot", 2, "engine-pilot");
state = place(state, "copilot", 2, "engine-copilot");
assert.equal(state.approach.currentIndex, 0);
assert.equal(state.approach.pendingAdvance, 1);
assert.equal(state.phase, "placement");

state.roles.pilot.dice[2].placed = true;
state.roles.pilot.placedThisRound += 1;
state.roles.copilot.dice[2].placed = true;
state.roles.copilot.placedThisRound += 1;
state.roles.pilot.dice[3].placed = true;
state.roles.pilot.placedThisRound += 1;
state.roles.copilot.dice[3].placed = true;
state.roles.copilot.placedThisRound += 1;
state.phase = "endRound";
state = act(state, { type: "END_ROUND" });
state = act(state, { type: "START_ROUND_ROLL" });
state = setDice(state, [3, 3, 3, 3], [3, 3, 3, 3]);
state = place(state, "copilot", 1, "axis-copilot");
state = place(state, "pilot", 1, "axis-pilot");
state = place(state, "copilot", 2, "engine-copilot");
state = place(state, "pilot", 2, "engine-pilot");
state.roles.pilot.dice[2].placed = true;
state.roles.pilot.placedThisRound += 1;
state.roles.copilot.dice[2].placed = true;
state.roles.copilot.placedThisRound += 1;
state.roles.pilot.dice[3].placed = true;
state.roles.pilot.placedThisRound += 1;
state.roles.copilot.dice[3].placed = true;
state.roles.copilot.placedThisRound += 1;
state.phase = "endRound";
state = act(state, { type: "END_ROUND" });
assert.equal(state.phase, "lost");
assert.match(state.lossReason, /Collision/i);

state = setupSolo();
state.approach.currentIndex = 1;
state.approach.spaces[1].traffic = 1;
state = setDice(state, [1, 3, 3, 3], [3, 3, 3, 3]);
state = place(state, "pilot", 1, "radio-pilot");
assert.equal(state.approach.spaces[1].traffic, 0);

state = setupSolo();
state = setDice(state, [4, 2, 3, 4], [1, 2, 3, 5]);
state = place(state, "pilot", 1, "gear-2");
assert.equal(state.switches.landingGear[1].deployed, true);
assert.equal(state.markers.blueAerodynamics, 5.5);
state = place(state, "copilot", 1, "flap-1");
assert.equal(state.switches.flaps[0].deployed, true);
assert.equal(state.markers.orangeAerodynamics, 9.5);
state = place(state, "pilot", 2, "brake-1");
assert.equal(state.switches.brakes[0].deployed, true);
assert.equal(state.markers.brakeThreshold, 2.5);

state = setupSolo();
state.tokens.coffee = 2;
state = setDice(state, [3, 3, 3, 3], [3, 3, 3, 3]);
state = place(state, "pilot", 1, "radio-pilot", -2);
assert.equal(state.roles.pilot.dice[0].value, 1);
assert.equal(state.tokens.coffee, 0);

state = setupSolo();
state = act(state, { type: "REROLL_DICE", role: "pilot", dieIds: ["pilot-die-1"] });
assert.equal(state.tokens.rerolls, 0);
assert.ok(state.roles.pilot.dice[0].value >= 1 && state.roles.pilot.dice[0].value <= 6);

state = setupSolo();
state.currentAltitude = 0;
state.altitudeIndex = 6;
state.round = 7;
state.approach.currentIndex = 6;
state.approach.spaces.forEach((space) => {
  space.traffic = 0;
});
state.switches.landingGear.forEach((item) => {
  item.deployed = true;
});
state.switches.flaps.forEach((item) => {
  item.deployed = true;
});
state.switches.brakes[0].deployed = true;
state.switches.brakes[1].deployed = true;
state.markers.brakeIndex = 2;
state.markers.brakeThreshold = 4.5;
state.cockpit.axis.position = 0;
state = setDice(state, [1, 1, 1, 1], [1, 1, 1, 1]);
state = place(state, "pilot", 1, "axis-pilot");
state = place(state, "copilot", 1, "axis-copilot");
state = place(state, "pilot", 2, "engine-pilot");
state = place(state, "copilot", 2, "engine-copilot");
state = place(state, "pilot", 3, "concentration-0");
state = place(state, "copilot", 3, "concentration-1");
state = place(state, "pilot", 4, "concentration-2");
state = place(state, "copilot", 4, "radio-copilot-a");
assert.equal(state.phase, "endRound");
state = act(state, { type: "END_ROUND" });
assert.equal(state.phase, "won");

let trueSolo = createInitialState({ mode: "solo" });
trueSolo = act(trueSolo, { type: "SET_MODE", mode: "solo" });
assert.equal(trueSolo.mode, "solo");
trueSolo = act(trueSolo, { type: "START_GAME" });
assert.equal(trueSolo.phase, "briefing");
trueSolo = act(trueSolo, { type: "ROLL_ROLE_DICE", role: "copilot" });
assert.match(trueSolo.message, /starts this round with Pilot/i);
trueSolo = act(trueSolo, { type: "ROLL_ROLE_DICE", role: "pilot" });
assert.equal(trueSolo.phase, "placement");
assert.equal(trueSolo.activeRole, "pilot");
assert.equal(trueSolo.roles.pilot.dice.length, 4);
assert.equal(trueSolo.roles.copilot.dice.length, 0);
trueSolo.roles.pilot.dice.forEach((die) => { die.value = 3; });
trueSolo = place(trueSolo, "pilot", 1, "axis-pilot");
assert.equal(trueSolo.activeRole, "copilot");
assert.equal(trueSolo.roles.copilot.dice.length, 1);
trueSolo.roles.copilot.dice[0].value = 3;
trueSolo = place(trueSolo, "copilot", 1, "axis-copilot");
assert.equal(trueSolo.activeRole, "pilot");
trueSolo = place(trueSolo, "pilot", 2, "engine-pilot");
assert.equal(trueSolo.roles.copilot.dice.length, 2);
trueSolo.roles.copilot.dice[1].value = 3;
trueSolo = place(trueSolo, "copilot", 2, "engine-copilot");
assert.equal(trueSolo.approach.currentIndex, 0);
assert.equal(trueSolo.approach.pendingAdvance, 1);
trueSolo = place(trueSolo, "pilot", 3, "concentration-0");
trueSolo.roles.copilot.dice[2].value = 3;
trueSolo = place(trueSolo, "copilot", 3, "concentration-1");
trueSolo = place(trueSolo, "pilot", 4, "concentration-2");
trueSolo.roles.copilot.dice[3].value = 3;
trueSolo = place(trueSolo, "copilot", 4, "radio-copilot-a");
assert.equal(trueSolo.phase, "endRound");
trueSolo = act(trueSolo, { type: "END_ROUND" });
assert.equal(trueSolo.approach.currentIndex, 1);

console.log("Sky Team rules tests passed.");
