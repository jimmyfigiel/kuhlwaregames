// src/core/command/commandRunner.js
// Runs immediate commands and drains queued automatic commands.

import { appendLog } from "./commandLog";
import { cloneState, normalizeAction, removeUndefinedDeep } from "./commandObjects";

export function enqueueCommand(state, command) {
  let next = cloneState(state);
  next.commandQueue = [...(next.commandQueue || []), command];
  next = appendLog(next, {
    eventType: "COMMAND_QUEUED",
    commandType: command.type,
    actor: command.actor,
    status: "queued",
    message: `${command.type} queued.`,
    details: command.params,
  });
  return next;
}

export function dispatchAction(state, registry, ...actionArgs) {
  const action = normalizeAction(...actionArgs);
  let next = appendLog(state, {
    eventType: "ACTION_RECEIVED",
    commandType: action.type || "UNKNOWN",
    actor: action.playerId || action.playerSlot || "System",
    status: "received",
    message: `Received ${action.type || "UNKNOWN"}.`,
    details: action,
  });

  const module = registry.get(action.type);
  if (!module?.create) {
    return appendLog(next, {
      eventType: "ACTION_ERROR",
      commandType: action.type || "UNKNOWN",
      actor: action.playerId || action.playerSlot || "System",
      status: "error",
      message: `No constructor for ${action.type || "UNKNOWN"}.`,
      details: action,
    });
  }

  const command = module.create(action);
  if (command.mode === "immediate") {
    next = runCommand(next, registry, command);
    return drainQueue(next, registry);
  }

  next = enqueueCommand(next, command);
  return drainQueue(next, registry);
}

export function drainQueue(state, registry) {
  let next = cloneState(state);
  let guard = 0;

  while ((next.commandQueue || []).length > 0 && guard < 100) {
    guard += 1;
    const command = next.commandQueue[0];

    if (command.mode === "wait") {
      return appendLog(next, {
        eventType: "COMMAND_WAITING",
        commandType: command.type,
        actor: command.actor,
        status: "waiting",
        message: `${command.type} is waiting for input.`,
        details: command.params,
      });
    }

    next.commandQueue = next.commandQueue.slice(1);
    next = runCommand(next, registry, command);
  }

  if (guard >= 100) {
    next = appendLog(next, {
      eventType: "QUEUE_GUARD_STOPPED",
      commandType: "COMMAND_QUEUE",
      actor: "System",
      status: "error",
      message: "Queue drain stopped after 100 commands.",
    });
  }

  return removeUndefinedDeep(next);
}

export function runCommand(state, registry, command) {
  const module = registry.get(command.type);
  let next = appendLog(state, {
    eventType: "COMMAND_STARTED",
    commandType: command.type,
    actor: command.actor,
    status: "running",
    message: `${command.type} started.`,
    details: command.params,
  });

  if (!module?.run) {
    return appendLog(next, {
      eventType: "COMMAND_ERROR",
      commandType: command.type,
      actor: command.actor,
      status: "error",
      message: `No command handler for ${command.type}.`,
      details: command,
    });
  }

  try {
    next = module.run(next, command, {
      enqueue: (workingState, nextCommand) => enqueueCommand(workingState, nextCommand),
      registry,
    });
    next = appendLog(next, {
      eventType: "COMMAND_COMPLETED",
      commandType: command.type,
      actor: command.actor,
      status: "ok",
      message: `${command.type} completed.`,
    });
    return removeUndefinedDeep(next);
  } catch (error) {
    return appendLog(next, {
      eventType: "COMMAND_ERROR",
      commandType: command.type,
      actor: command.actor,
      status: "error",
      message: error.message || `Error running ${command.type}.`,
      details: { error: error.message || String(error) },
    });
  }
}
