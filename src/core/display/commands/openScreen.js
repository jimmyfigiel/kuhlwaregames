// src/core/display/commands/openScreen.js

import { makeCommand } from "../../command/commandObjects";
import { appendLog } from "../../command/commandLog";
import { setScreen } from "../displayState";

export const type = "OPEN_SCREEN";

export function create(params = {}) {
  return makeCommand(type, {
    mode: params.mode || "auto",
    actor: params.actor || "System",
    params: {
      screen: params.screen,
    },
  });
}

export function run(state, command) {
  const screen = command.params.screen;
  if (!screen?.type) throw new Error("OPEN_SCREEN requires screen.type.");
  let next = setScreen(state, screen);
  next = appendLog(next, {
    eventType: "SCREEN_CHANGED",
    commandType: type,
    actor: command.actor,
    status: "ok",
    message: `Opened ${screen.type}.`,
    details: screen,
  });
  return next;
}
