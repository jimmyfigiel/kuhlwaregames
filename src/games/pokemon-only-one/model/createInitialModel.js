// src/games/pokemon-only-one/model/createInitialModel.js

export function createEmptyModel() {
  return {
    gameId: "pokemon-only-one",
    version: "mvc-zones-v1",
    nextLogNumber: 1,
    area: null,
    playerSides: {},
    zones: {},
    cards: {},
    settings: {
      playMode: "onePlayerTest",
      onePlayerTestMode: true,
    },
    setup: {
      phase: "setup",
      prizeCount: 6,
      currentTurnSideId: null,
      sides: {
        player: { ready: false, openingHandDrawn: false, prizesSet: false },
        opponent: { ready: false, openingHandDrawn: false, prizesSet: false },
      },
      coinFlip: null,
    },
    display: {
      screen: "BATTLE_SCREEN",
      popup: null,
      selection: null,
    },
    log: [],
    debug: {
      lastSubmittedAction: null,
      lastSubmitShape: null,
    },
  };
}
