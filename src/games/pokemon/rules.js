// src/games/pokemon/rules.js
import { drawCards } from "../../core/card/cardEngine";
import { getCurrentCommand } from "../../core/command/commandEngine";
import { createDeckInstances } from "./pokemonDecks";
import { createInitialCommandState, submitPokemonAction, withMessage } from "./pokemonCommands";

const DEFAULT_OPTIONS = {
  controlMode: "solo-test",
  p1DeckId: "zap",
  p2DeckId: "blackout",
};

export function createInitialState(options = {}) {
  const mergedOptions = normalizeOptions(options);
  const seed = mergedOptions.seed ?? Date.now();
  const p1DeckId = mergedOptions.p1DeckId;
  const p2DeckId = mergedOptions.p2DeckId;

  const p1Deck = createDeckInstances({ deckId: p1DeckId, playerId: "p1", seed });
  const p2Deck = createDeckInstances({ deckId: p2DeckId, playerId: "p2", seed });

  let state = {
    gameId: "pokemon",
    version: 3,
    options: {
      controlMode: mergedOptions.controlMode,
      p1DeckId,
      p2DeckId,
    },
    players: {
      p1: {
        id: "p1",
        name: mergedOptions.p1Name ?? "Player 1",
        deckId: p1DeckId,
        deck: p1Deck.deck,
        hand: [],
        discard: [],
        prizes: [],
        active: null,
        bench: [null, null, null, null, null],
      },
      p2: {
        id: "p2",
        name: mergedOptions.p2Name ?? "Player 2",
        deckId: p2DeckId,
        deck: p2Deck.deck,
        hand: [],
        discard: [],
        prizes: [],
        active: null,
        bench: [null, null, null, null, null],
      },
    },
    cardsById: {
      ...p1Deck.cardsById,
      ...p2Deck.cardsById,
    },
    turn: {
      playerId: "p1",
      number: 0,
      phase: "SETUP",
      hasDrawnThisTurn: true,
      energyAttachedThisTurn: false,
      attackUsedThisTurn: false,
    },
    commands: createInitialCommandState(),
    message: "Both players drew 7 cards. Player 1 must choose a Basic Pokémon as Active.",
    messageLog: [],
    queueTrace: [],
    commandContext: {},
    setupErrors: [...p1Deck.errors, ...p2Deck.errors],
  };

  state = drawCards(state, "p1", 7);
  state = drawCards(state, "p2", 7);

  if (state.setupErrors.length) {
    state = withMessage(state, `Game started with ${state.setupErrors.length} deck warning(s).`);
  }

  return state;
}

export function submitAction(state, playerSlot, action) {
  const normalizedAction = normalizeIncomingAction(action ?? playerSlot);
  const normalizedPlayerSlot =
    typeof playerSlot === "string"
      ? playerSlot
      : normalizedAction.playerSlot ?? normalizedAction.playerId ?? state?.turn?.playerId ?? "p1";

  if (normalizedAction.type === "INIT_POKEMON_GAME" || normalizedAction.type === "RESET_POKEMON_GAME") {
    return createInitialState({
      ...(state?.options ?? {}),
      ...(normalizedAction.options ?? {}),
      seed: normalizedAction.seed ?? Date.now(),
    });
  }

  if (normalizedAction.type === "REPAIR_POKEMON_STATE") {
    return repairPokemonState(state, normalizedAction.options ?? {});
  }

  if (!isPokemonStatePlayable(state)) {
    return withMessage(
      createInitialState({
        ...(state?.options ?? {}),
        ...(normalizedAction.options ?? {}),
      }),
      "Pokémon state was missing, so the game was initialized.",
    );
  }

  return submitPokemonAction(state, normalizedPlayerSlot, normalizedAction);
}

export function isPokemonStatePlayable(state) {
  return Boolean(
    state &&
      state.gameId === "pokemon" &&
      state.players?.p1 &&
      state.players?.p2 &&
      state.cardsById &&
      state.turn &&
      state.commands,
  );
}

export function repairPokemonState(state, options = {}) {
  if (!state || typeof state !== "object") {
    return createInitialState(options);
  }

  if (!state.players?.p1 || !state.players?.p2 || !state.cardsById) {
    return createInitialState({
      ...(state.options ?? {}),
      ...options,
    });
  }

  const repaired = {
    ...state,
    gameId: "pokemon",
    version: state.version ?? 3,
    options: normalizeOptions({
      ...(state.options ?? {}),
      ...options,
    }),
    players: {
      p1: repairPlayer(state.players.p1, "p1"),
      p2: repairPlayer(state.players.p2, "p2"),
    },
    cardsById: state.cardsById ?? {},
    turn: {
      playerId: state.turn?.playerId === "p2" ? "p2" : "p1",
      number: state.turn?.number ?? 0,
      phase: state.turn?.phase ?? "SETUP",
      hasDrawnThisTurn: Boolean(state.turn?.hasDrawnThisTurn),
      energyAttachedThisTurn: Boolean(state.turn?.energyAttachedThisTurn),
      attackUsedThisTurn: Boolean(state.turn?.attackUsedThisTurn),
      ...(state.turn ?? {}),
    },
    commands: state.commands?.queue ? state.commands : createInitialCommandState(),
    message: state.message ?? "Pokémon state was repaired.",
    messageLog: Array.isArray(state.messageLog) ? state.messageLog : [],
    queueTrace: Array.isArray(state.queueTrace) ? state.queueTrace : [],
    commandContext: state.commandContext ?? {},
    setupErrors: Array.isArray(state.setupErrors) ? state.setupErrors : [],
  };

  return withMessage(repaired, "Pokémon state was repaired.");
}

function repairPlayer(player, playerId) {
  const bench = Array.isArray(player?.bench) ? [...player.bench] : [null, null, null, null, null];
  while (bench.length < 5) bench.push(null);

  return {
    id: playerId,
    name: player?.name ?? (playerId === "p1" ? "Player 1" : "Player 2"),
    deckId: player?.deckId ?? (playerId === "p1" ? DEFAULT_OPTIONS.p1DeckId : DEFAULT_OPTIONS.p2DeckId),
    deck: Array.isArray(player?.deck) ? player.deck : [],
    hand: Array.isArray(player?.hand) ? player.hand : [],
    discard: Array.isArray(player?.discard) ? player.discard : [],
    prizes: Array.isArray(player?.prizes) ? player.prizes : [],
    active: player?.active ?? null,
    bench: bench.slice(0, 5),
  };
}

function normalizeOptions(options = {}) {
  return {
    ...DEFAULT_OPTIONS,
    ...options,
    controlMode: options.controlMode ?? DEFAULT_OPTIONS.controlMode,
    p1DeckId: options.p1DeckId ?? DEFAULT_OPTIONS.p1DeckId,
    p2DeckId: options.p2DeckId ?? DEFAULT_OPTIONS.p2DeckId,
  };
}

function normalizeIncomingAction(action) {
  if (!action || typeof action !== "object") {
    return { type: "UNKNOWN" };
  }

  // Accept common wrapper shapes used by different room/game loaders.
  if (action.action && typeof action.action === "object") {
    return normalizeIncomingAction(action.action);
  }

  if (action.payload && typeof action.payload === "object") {
    return normalizeIncomingAction(action.payload);
  }

  if (action.data?.action && typeof action.data.action === "object") {
    return normalizeIncomingAction(action.data.action);
  }

  return action;
}

export function getCurrentPlayerId(state) {
  return state?.turn?.playerId ?? "p1";
}

export function getActiveCommand(state) {
  return getCurrentCommand(state?.commands);
}

export default {
  createInitialState,
  submitAction,
  isPokemonStatePlayable,
  repairPokemonState,
};
