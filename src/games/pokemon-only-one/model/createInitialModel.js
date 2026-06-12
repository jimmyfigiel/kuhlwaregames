// src/games/pokemon-only-one/model/createInitialModel.js

export function createEmptyModel() {
  return {
    gameId: "pokemon-only-one",
    version: "mvc-v1",
    nextLogNumber: 1,
    area: null,
    spaces: {},
    cards: {},
    display: {
      screen: "ONE_AREA_SCREEN",
      zoomCardId: null,
    },
    log: [],
    debug: {
      lastSubmittedAction: null,
      lastSubmitShape: null,
    },
  };
}
