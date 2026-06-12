// src/core/command/commands/clearCommandLog.js

import { makeCommand } from "../commandObjects";
import { clearLog } from "../commandLog";

export const type = "CLEAR_COMMAND_LOG";

export function create(params = {}) {
  return makeCommand(type, {
    mode: "immediate",
    actor: params.playerId || params.playerSlot || "System",
    playerId: params.playerId || params.playerSlot || null,
    params: {},
  });
}

export function run(state, command) {
  return clearLog(state, type, command.actor);
}
