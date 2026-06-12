// src/core/display/commands/closeCardZoom.js

import { makeCommand } from "../../command/commandObjects";
import { appendLog } from "../../command/commandLog";
import { closeCardZoom } from "../displayState";

export const type = "CLOSE_CARD_ZOOM";

export function create(params = {}) {
  return makeCommand(type, {
    mode: "immediate",
    actor: params.playerId || params.playerSlot || "System",
    playerId: params.playerId || params.playerSlot || null,
    params: {},
  });
}

export function run(state, command) {
  let next = closeCardZoom(state);
  next = appendLog(next, {
    eventType: "POPUP_CLOSED",
    commandType: type,
    actor: command.actor,
    status: "ok",
    message: "Closed card zoom.",
  });
  return next;
}
