// src/core/command/commandLog.js
// One-line command log support.

import { cloneState, removeUndefinedDeep } from "./commandObjects";

export function appendLog(state, event = {}) {
  const next = cloneState(state);
  const current = Array.isArray(next.commandLog) ? next.commandLog : [];
  const sequence = current.length + 1;
  next.commandLog = [
    ...current,
    removeUndefinedDeep({
      sequence,
      time: new Date().toLocaleTimeString(),
      eventType: event.eventType || "LOG",
      commandType: event.commandType || event.type || "System",
      actor: event.actor || event.playerId || "System",
      status: event.status || "ok",
      message: event.message || "",
      details: event.details || null,
    }),
  ];
  return next;
}

export function clearLog(state, commandType = "CLEAR_COMMAND_LOG", actor = "System") {
  const next = cloneState(state);
  next.commandLog = [];
  return appendLog(next, {
    eventType: "COMMAND_LOG_CLEARED",
    commandType,
    actor,
    status: "ok",
    message: "Command log cleared.",
  });
}

export function formatLogLine(entry) {
  const details = entry.details ? ` | ${JSON.stringify(entry.details)}` : "";
  return `#${String(entry.sequence).padStart(3, "0")} ${entry.time} | ${entry.eventType} | ${entry.commandType} | ${entry.actor} | ${entry.status} | ${entry.message}${details}`;
}
