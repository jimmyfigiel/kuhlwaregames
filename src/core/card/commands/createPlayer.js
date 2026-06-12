// src/core/card/commands/createPlayer.js

import { makeCommand } from "../../command/commandObjects";
import { appendLog } from "../../command/commandLog";
import { addPlayer } from "../cardState";

export const type = "CREATE_PLAYER";

export function create(params = {}) {
  return makeCommand(type, {
    mode: "auto",
    actor: params.playerId || "System",
    playerId: params.playerId || null,
    params: {
      playerId: params.playerId,
      name: params.name || params.playerId || "Player",
    },
  });
}

export function run(state, command) {
  const { playerId, name } = command.params;
  if (!playerId) throw new Error("CREATE_PLAYER requires playerId.");
  let next = addPlayer(state, { id: playerId, name });
  next = appendLog(next, {
    eventType: "OBJECT_CREATED",
    commandType: type,
    actor: playerId,
    status: "ok",
    message: `Created player ${playerId}.`,
  });
  return next;
}
