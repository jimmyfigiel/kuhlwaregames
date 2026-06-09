// src/games/pokemon/rules.js
import { drawCards } from "../../core/card/cardEngine";
import { getCurrentCommand } from "../../core/command/commandEngine";
import { createDeckInstances } from "./pokemonDecks";
import { createInitialCommandState, submitPokemonAction, withMessage } from "./pokemonCommands";

export function createInitialState(options = {}) {
  const seed = options.seed ?? Date.now();
  const p1DeckId = options.p1DeckId ?? "zap";
  const p2DeckId = options.p2DeckId ?? "blackout";

  const p1Deck = createDeckInstances({ deckId: p1DeckId, playerId: "p1", seed });
  const p2Deck = createDeckInstances({ deckId: p2DeckId, playerId: "p2", seed });

  let state = {
    gameId: "pokemon",
    version: 1,
    options: {
      controlMode: options.controlMode ?? "solo-test",
      p1DeckId,
      p2DeckId,
    },
    players: {
      p1: {
        id: "p1",
        name: options.p1Name ?? "Player 1",
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
        name: options.p2Name ?? "Player 2",
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
      hasDrawnThisTurn: false,
      energyAttachedThisTurn: false,
      attackUsedThisTurn: false,
    },
    commands: createInitialCommandState(),
    message: "Both players drew 7 cards. Player 1 must choose a Basic Pokémon as Active.",
    messageLog: [],
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
  return submitPokemonAction(state, playerSlot, action);
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
};
