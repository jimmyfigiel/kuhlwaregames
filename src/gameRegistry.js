export const gameRegistry = {
  "player-portal": {
    title: "Player Portal Test Game",
    description: "Built-in test game used to confirm the room/game loader works.",
    load: () => import("./games/player-portal/PlayerPortalGame.jsx"),
  },

  /*
    Future games go here.

    Example:

    baseball: {
      title: "Baseball",
      description: "Two-player baseball game.",
      load: () => import("./games/baseball/BaseballGame.jsx"),
    },

    lorcana: {
      title: "Lorcana",
      description: "Lorcana table game module.",
      load: () => import("./games/lorcana/LorcanaGame.jsx"),
    },
  */
};

export function getGameDefinition(gameId) {
  return gameRegistry[gameId] || null;
}