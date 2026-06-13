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
