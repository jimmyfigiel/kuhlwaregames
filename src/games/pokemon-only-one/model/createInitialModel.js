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
      step: "coinFlip",
      prizeCount: 6,
      firstPlayerSideId: null,
      currentTurnSideId: null,
      pokemonRevealed: false,
      sides: {
        player: {
          ready: false,
          openingHandDrawn: false,
          prizesSet: false,
          mulliganCount: 0,
          hasBasicInHand: false,
          needsMulligan: false,
          activePlaced: false,
        },
        opponent: {
          ready: false,
          openingHandDrawn: false,
          prizesSet: false,
          mulliganCount: 0,
          hasBasicInHand: false,
          needsMulligan: false,
          activePlaced: false,
        },
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
