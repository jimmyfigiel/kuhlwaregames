// src/core/command/commandEngine.js
// Generic, game-agnostic command queue helpers.

export function createCommand({ type, playerId = null, title, description = "", required = true, data = {} }) {
  return {
    id: `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    playerId,
    title,
    description,
    required,
    status: "pending",
    data,
    createdAt: new Date().toISOString(),
  };
}

export function createCommandState(initialCommands = []) {
  return {
    queue: initialCommands,
    history: [],
  };
}

export function getCurrentCommand(commandState) {
  return commandState?.queue?.[0] ?? null;
}

export function pushCommand(commandState, command) {
  return {
    ...commandState,
    queue: [...(commandState?.queue ?? []), command],
  };
}

export function pushCommands(commandState, commands) {
  return {
    ...commandState,
    queue: [...(commandState?.queue ?? []), ...commands],
  };
}

export function completeCurrentCommand(commandState, result = {}) {
  const current = getCurrentCommand(commandState);
  if (!current) return commandState;

  const completed = {
    ...current,
    status: "completed",
    completedAt: new Date().toISOString(),
    result,
  };

  return {
    queue: (commandState.queue ?? []).slice(1),
    history: [...(commandState.history ?? []), completed],
  };
}

export function replaceQueue(commandState, commands) {
  return {
    ...commandState,
    queue: commands,
  };
}

export function clearCommands(commandState) {
  return {
    ...commandState,
    queue: [],
  };
}
