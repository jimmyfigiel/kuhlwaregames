// src/core/game/initialGameState.js
// Generic helper for room creation. Use this before writing a new room document.

export function createGameStateForRoom(gameModule, options = {}) {
  const rules = gameModule?.rules ?? gameModule?.default?.rules ?? gameModule;

  if (typeof rules?.createInitialState === "function") {
    return rules.createInitialState(options);
  }

  if (typeof gameModule?.createInitialState === "function") {
    return gameModule.createInitialState(options);
  }

  if (typeof gameModule?.default?.createInitialState === "function") {
    return gameModule.default.createInitialState(options);
  }

  console.warn("Game module does not expose createInitialState(options). Creating an empty gameState.", {
    gameModule,
    options,
  });

  return {};
}

export function normalizeRoomGameOptions(gameId, options = {}) {
  if (gameId === "pokemon") {
    return {
      controlMode: options.controlMode ?? "solo-test",
      p1DeckId: options.p1DeckId ?? "zap",
      p2DeckId: options.p2DeckId ?? "blackout",
      ...options,
    };
  }

  return options ?? {};
}
